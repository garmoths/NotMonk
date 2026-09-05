// ── Notion API Client for NotMonk ─────────────────────────────────────────────
const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

const NotionAPI = {
  getHeaders(token) {
    return {
      "Authorization": `Bearer ${token.trim()}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json"
    };
  },

  cleanDatabaseId(id) {
    if (!id) return "";
    let cleaned = id.trim();
    // If a full URL is passed, extract the 32-char hex ID
    const match = cleaned.match(/([a-f0-9]{32})/i) || cleaned.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) return match[1].replace(/-/g, "");
    return cleaned.replace(/-/g, "");
  },

  async resolveDatabaseId(token, rawId) {
    let id = this.cleanDatabaseId(rawId);
    if (!token || !id) return id;

    // 1. First test if it's already a database
    const dbRes = await fetch(`${NOTION_BASE_URL}/databases/${id}`, {
      method: "GET",
      headers: this.getHeaders(token)
    });

    if (dbRes.ok) {
      const data = await dbRes.json();
      return {
        databaseId: id,
        databaseTitle: data.title?.[0]?.plain_text || data.title?.[0]?.text?.content || "NotMonk Veritabanı",
        properties: data.properties || {}
      };
    }

    // 2. If it's not a database, check if it's a page
    const pageRes = await fetch(`${NOTION_BASE_URL}/pages/${id}`, {
      method: "GET",
      headers: this.getHeaders(token)
    });

    if (pageRes.ok) {
      // Look for an existing child database inside this page
      const blocksRes = await fetch(`${NOTION_BASE_URL}/blocks/${id}/children?page_size=50`, {
        method: "GET",
        headers: this.getHeaders(token)
      });

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        const childDb = blocksData.results?.find(b => b.type === "child_database");
        if (childDb) {
          return await this.resolveDatabaseId(token, childDb.id);
        }
      }

      // If no child database found, treat this page itself as the parent container page
      const pageData = await pageRes.json().catch(() => ({}));
      const pageTitle = this.extractTitle(pageData) || "Notion Sayfası";
      return {
        databaseId: id,
        databaseTitle: pageTitle,
        isPage: true,
        properties: {}
      };
    }

    const err = await dbRes.json().catch(() => ({}));
    if (dbRes.status === 401 || pageRes.status === 401) throw new Error("Geçersiz Notion API anahtarı (Unauthorized).");
    if (dbRes.status === 404 && pageRes.status === 404) throw new Error("Veritabanı veya Sayfa bulunamadı. Lütfen bağlantının (Connections -> NotMonk) eklendiğinden emin ol.");
    throw new Error(err.message || `Notion API Hatası: ${dbRes.status}`);
  },

  async testConnection(token, rawDatabaseId) {
    if (!token) throw new Error("Notion API anahtarı (Token) eksik.");
    if (!rawDatabaseId) {
      // User is syncing Teamspaces directly without a single database ID
      const userRes = await fetch(`${NOTION_BASE_URL}/users/me`, {
        method: "GET",
        headers: this.getHeaders(token)
      });
      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}));
        if (userRes.status === 401) throw new Error("Geçersiz Notion API anahtarı (Unauthorized).");
        throw new Error(err.message || `Notion API Hatası: ${userRes.status}`);
      }
      const botData = await userRes.json();
      return {
        success: true,
        isWorkspaceOnly: true,
        botName: botData.name || "NotMonk Bot",
        databaseTitle: "Notion Teamspaces"
      };
    }

    const res = await this.resolveDatabaseId(token, rawDatabaseId);
    return {
      success: true,
      databaseId: res.databaseId,
      databaseTitle: res.databaseTitle,
      properties: res.properties || {}
    };
  },

  buildProperties(topic, schemaProperties = {}) {
    // Title is required
    const props = {
      "Name": {
        title: [{ text: { content: topic.title || "İsimsiz Konu" } }]
      }
    };

    // If database uses a different title key (like "Konu" or "Title")
    const titleKey = Object.keys(schemaProperties).find(k => schemaProperties[k]?.type === "title") || "Name";
    if (titleKey !== "Name") {
      delete props["Name"];
      props[titleKey] = {
        title: [{ text: { content: topic.title || "İsimsiz Konu" } }]
      };
    }

    // Category
    if (topic.category) {
      const catKey = Object.keys(schemaProperties).find(k => k.toLowerCase() === "kategori" || k.toLowerCase() === "category" || k.toLowerCase() === "alan") || "Kategori";
      props[catKey] = {
        select: { name: topic.category.replace(/,/g, " ") }
      };
    }

    // Status
    const statusMap = { todo: "Başlamadım", learning: "Öğreniyorum", done: "Öğrendim" };
    const statusLabel = statusMap[topic.status] || "Başlamadım";
    const statusKey = Object.keys(schemaProperties).find(k => k.toLowerCase() === "durum" || k.toLowerCase() === "status") || "Durum";
    
    // Check if property is 'status' or 'select' in Notion schema
    if (schemaProperties[statusKey]?.type === "status") {
      props[statusKey] = { status: { name: statusLabel } };
    } else {
      props[statusKey] = { select: { name: statusLabel } };
    }

    // Today (Checkbox)
    const todayKey = Object.keys(schemaProperties).find(k => k.toLowerCase() === "bugün" || k.toLowerCase() === "today" || k.toLowerCase() === "odak") || "Bugün";
    props[todayKey] = {
      checkbox: Boolean(topic.today)
    };

    // Resource (URL)
    if (topic.resource) {
      const resKey = Object.keys(schemaProperties).find(k => k.toLowerCase() === "kaynak" || k.toLowerCase() === "resource" || k.toLowerCase() === "link") || "Kaynak";
      props[resKey] = {
        url: topic.resource.startsWith("http") ? topic.resource : `https://${topic.resource}`
      };
    }

    return props;
  },

  // Helper to parse inline styles (bold, italic, strike, code, links) into Notion rich_text
  parseRichTextSpans(container) {
    const spans = [];
    const walk = (node, annotations = {}) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          spans.push({
            type: "text",
            text: {
              content: text.slice(0, 2000),
              link: annotations.link ? { url: annotations.link } : null
            },
            annotations: {
              bold: Boolean(annotations.bold),
              italic: Boolean(annotations.italic),
              strikethrough: Boolean(annotations.strike),
              code: Boolean(annotations.code)
            }
          });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      const currentAnn = { ...annotations };
      if (tag === "b" || tag === "strong") currentAnn.bold = true;
      if (tag === "i" || tag === "em") currentAnn.italic = true;
      if (tag === "s" || tag === "strike" || tag === "del") currentAnn.strike = true;
      if (tag === "code" && !node.classList.contains("language-")) currentAnn.code = true;
      if (tag === "a" && node.href) {
        currentAnn.link = node.href;
      }

      node.childNodes.forEach(child => walk(child, currentAnn));
    };

    walk(container);
    return spans.length > 0 ? spans.slice(0, 50) : [{ type: "text", text: { content: (container.textContent || "").slice(0, 2000) } }];
  },

  buildChildrenBlocks(notes) {
    if (!notes || !notes.trim()) return [];

    // Plain text fallback
    if (!/<[a-z][\s\S]*>/i.test(notes)) {
      const paragraphs = notes.split(/\n\n+/).filter(Boolean);
      return paragraphs.map(p => ({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{
            type: "text",
            text: { content: p.slice(0, 2000) }
          }]
        }
      }));
    }

    // Rich HTML parser: generates native Notion blocks
    const blocks = [];
    const div = document.createElement("div");
    div.innerHTML = notes;

    div.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          blocks.push({
            object: "block",
            type: "paragraph",
            paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 2000) } }] }
          });
        }
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();

      // Image block (Figure or Img tag)
      if (tag === "figure" || tag === "img" || node.classList.contains("editor-image-wrap") || node.querySelector("img")) {
        const img = tag === "img" ? node : node.querySelector("img");
        if (img && img.src && /^https?:\/\//i.test(img.src)) {
          blocks.push({
            object: "block",
            type: "image",
            image: {
              type: "external",
              external: { url: img.src }
            }
          });
          return;
        }
      }

      // Code block
      if (node.classList.contains("code-block-wrap") || node.querySelector("pre.code-block")) {
        const pre = node.querySelector("pre") || node;
        const code = pre.querySelector("code") || pre;
        const langSelect = node.querySelector(".code-lang-select");
        const lang = langSelect ? langSelect.value : (code.className.match(/language-(\w+)/)?.[1] || "plain text");
        const codeText = code.textContent || "";
        if (codeText.trim()) {
          const supported = ["javascript","python","bash","sql","c","go","html","css","json"];
          const cleanLang = supported.includes(lang.toLowerCase()) ? lang.toLowerCase() : "plain text";
          blocks.push({
            object: "block",
            type: "code",
            code: {
              rich_text: [{ type: "text", text: { content: codeText.slice(0, 2000) } }],
              language: cleanLang
            }
          });
        }
        return;
      }

      // Terminal block
      if (node.classList.contains("terminal-block-wrap") || node.querySelector("pre.terminal-block")) {
        const pre = node.querySelector("pre") || node;
        const code = pre.querySelector("code") || pre;
        const codeText = code.textContent || "";
        if (codeText.trim()) {
          blocks.push({
            object: "block",
            type: "code",
            code: {
              rich_text: [{ type: "text", text: { content: codeText.slice(0, 2000) } }],
              language: "bash"
            }
          });
        }
        return;
      }

      // Headings (with link & formatting support)
      if (tag === "h1") {
        blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: this.parseRichTextSpans(node) } });
        return;
      }
      if (tag === "h2") {
        blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: this.parseRichTextSpans(node) } });
        return;
      }
      if (tag === "h3") {
        blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: this.parseRichTextSpans(node) } });
        return;
      }

      // Quotes
      if (tag === "blockquote" || node.classList.contains("rich-quote")) {
        blocks.push({ object: "block", type: "quote", quote: { rich_text: this.parseRichTextSpans(node) } });
        return;
      }

      // Callouts / Tips
      if (node.classList.contains("info-block")) {
        blocks.push({ object: "block", type: "callout", callout: { icon: { emoji: "💡" }, rich_text: this.parseRichTextSpans(node) } });
        return;
      }

      // General paragraph (with link, bold, italic, code support)
      const text = node.textContent.trim();
      if (text) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: this.parseRichTextSpans(node) }
        });
      }
    });

    return blocks.slice(0, 95);
  },

  extractTitle(item) {
    if (!item) return "İsimsiz";
    if (item.object === "database") {
      return item.title?.map(t => t.plain_text).join("").trim() || "İsimsiz Veritabanı";
    }
    if (item.object === "page") {
      for (const prop of Object.values(item.properties || {})) {
        if (prop.type === "title") {
          return prop.title?.map(t => t.plain_text).join("").trim() || "İsimsiz Konu";
        }
      }
    }
    return "İsimsiz";
  },

  extractIcon(item) {
    let icon = null;
    let iconType = null;
    let iconUrl = null;

    if (item && item.icon) {
      if (item.icon.type === "emoji") {
        icon = item.icon.emoji;
        iconType = "emoji";
      } else if (item.icon.type === "external" && item.icon.external?.url) {
        iconType = "image";
        iconUrl = item.icon.external.url;
      } else if (item.icon.type === "file" && item.icon.file?.url) {
        iconType = "image";
        iconUrl = item.icon.file.url;
      }
    }
    return { icon, iconType, iconUrl };
  },

  extractStatus(item) {
    if (!item || !item.properties) return "todo";
    for (const key of Object.keys(item.properties)) {
      const prop = item.properties[key];
      if (prop.type === "status" || (prop.type === "select" && (key.toLowerCase().includes("durum") || key.toLowerCase().includes("status")))) {
        const val = (prop.status?.name || prop.select?.name || "").toLowerCase();
        if (val.includes("öğrendim") || val.includes("done") || val.includes("tamamlandı")) return "done";
        if (val.includes("öğreniyorum") || val.includes("learning") || val.includes("devam")) return "learning";
        return "todo";
      }
    }
    return "todo";
  },

  extractCategory(item, areasMap, allItemsMap = null) {
    if (item && item.properties) {
      for (const key of Object.keys(item.properties)) {
        const prop = item.properties[key];
        if (prop.type === "select" && (key.toLowerCase().includes("kategori") || key.toLowerCase().includes("category") || key.toLowerCase().includes("alan"))) {
          if (prop.select?.name) return prop.select.name;
        }
      }
    }
    let currentParentId = (item?.parent?.page_id || item?.parent?.database_id || "").replace(/-/g, "");
    let depth = 0;
    while (currentParentId && depth < 6) {
      if (areasMap && areasMap.has(currentParentId)) {
        return areasMap.get(currentParentId).title;
      }
      if (allItemsMap && allItemsMap.has(currentParentId)) {
        const parentItem = allItemsMap.get(currentParentId);
        currentParentId = (parentItem?.parent?.page_id || parentItem?.parent?.database_id || "").replace(/-/g, "");
        depth++;
      } else {
        break;
      }
    }
    return "";
  },

  extractResource(item) {
    if (!item || !item.properties) return "";
    for (const key of Object.keys(item.properties)) {
      const prop = item.properties[key];
      if (prop.type === "url" && prop.url) return prop.url;
    }
    return "";
  },

  extractToday(item) {
    if (!item || !item.properties) return false;
    for (const key of Object.keys(item.properties)) {
      const prop = item.properties[key];
      if (prop.type === "checkbox") return Boolean(prop.checkbox);
    }
    return false;
  },

  richTextToHTML(richText = []) {
    if (!richText || !richText.length) return "";
    return richText.map(t => {
      let content = (t.plain_text || t.text?.content || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const ann = t.annotations || {};
      if (ann.code) content = `<code class="inline-code">${content}</code>`;
      if (ann.bold) content = `<b>${content}</b>`;
      if (ann.italic) content = `<i>${content}</i>`;
      if (ann.strikethrough) content = `<s>${content}</s>`;

      const href = t.text?.link?.url || t.href;
      if (href) {
        content = `<a href="${href}" target="_blank" rel="noopener">${content}</a>`;
      }
      return content;
    }).join("");
  },

  blocksToHTML(blocks = []) {
    if (!blocks || !blocks.length) return "";
    const htmlParts = [];

    for (const block of blocks) {
      const type = block.type;
      if (type === "paragraph") {
        const text = this.richTextToHTML(block.paragraph?.rich_text);
        htmlParts.push(text ? `<p>${text}</p>` : "<p><br></p>");
      } else if (type === "heading_1") {
        htmlParts.push(`<h1>${this.richTextToHTML(block.heading_1?.rich_text)}</h1>`);
      } else if (type === "heading_2") {
        htmlParts.push(`<h2>${this.richTextToHTML(block.heading_2?.rich_text)}</h2>`);
      } else if (type === "heading_3") {
        htmlParts.push(`<h3>${this.richTextToHTML(block.heading_3?.rich_text)}</h3>`);
      } else if (type === "quote") {
        htmlParts.push(`<blockquote class="rich-quote">${this.richTextToHTML(block.quote?.rich_text)}</blockquote>`);
      } else if (type === "callout") {
        const plain = block.callout?.rich_text?.map(t => t.plain_text).join("") || "";
        if (plain.includes("Durum:") && plain.includes("Alan:")) {
          continue;
        }
        const emoji = block.callout?.icon?.emoji || "💡";
        htmlParts.push(`<div class="info-block">${emoji} ${this.richTextToHTML(block.callout?.rich_text)}</div>`);
      } else if (type === "code") {
        const lang = block.code?.language || "plain text";
        const codeText = block.code?.rich_text?.map(t => t.plain_text).join("") || "";
        const escaped = codeText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        htmlParts.push(`<div class="code-block-wrap" contenteditable="false"><div class="code-block-header"><select class="code-lang-select"><option value="${lang}" selected>${lang}</option></select><button type="button" class="code-copy-btn">kopyala</button><button type="button" class="code-del-btn">✕</button></div><pre class="code-block"><code class="language-${lang}" contenteditable="true">${escaped}</code></pre></div>`);
      } else if (type === "image") {
        const imgUrl = block.image?.type === "external" ? block.image?.external?.url : block.image?.file?.url;
        if (imgUrl) {
          const caption = this.richTextToHTML(block.image?.caption || []);
          htmlParts.push(`<figure class="editor-image-wrap" contenteditable="false" data-size="100%"><img src="${imgUrl}" class="editor-image" loading="lazy"><figcaption class="editor-image-caption" contenteditable="true" data-placeholder="Açıklama ekle...">${caption}</figcaption></figure>`);
        }
      } else if (type === "divider") {
        htmlParts.push("<hr>");
      } else if (type === "bulleted_list_item") {
        htmlParts.push(`<li>${this.richTextToHTML(block.bulleted_list_item?.rich_text)}</li>`);
      } else if (type === "numbered_list_item") {
        htmlParts.push(`<li>${this.richTextToHTML(block.numbered_list_item?.rich_text)}</li>`);
      }
    }

    return htmlParts.join("");
  },

  async fetchPageBlocksHTML(token, pageId) {
    if (!token || !pageId) return "";
    const cleanId = this.cleanDatabaseId(pageId);
    try {
      const res = await fetch(`${NOTION_BASE_URL}/blocks/${cleanId}/children?page_size=100`, {
        method: "GET",
        headers: this.getHeaders(token)
      });
      if (!res.ok) return "";
      const data = await res.json();
      return this.blocksToHTML(data.results || []);
    } catch (e) {
      console.warn("Sayfa blokları çekilemedi:", pageId, e);
      return "";
    }
  },

  // Search workspace for shared Teamspaces, parent pages and databases with pagination
  async searchWorkspaces(token) {
    if (!token) throw new Error("Notion API Token eksik.");
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const bodyPayload = { page_size: 100 };
      if (nextCursor) bodyPayload.start_cursor = nextCursor;

      const res = await fetch(`${NOTION_BASE_URL}/search`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Notion araması başarısız: ${res.status}`);
      }

      const data = await res.json();
      allResults.push(...(data.results || []));
      hasMore = Boolean(data.has_more);
      nextCursor = data.next_cursor;
    }

    const { areas } = this.classifyWorkspaceHierarchy(allResults);
    return areas;
  },

  classifyWorkspaceHierarchy(allResults) {
    const allIds = new Set(allResults.map(r => r.id.replace(/-/g, "")));
    const allItemsMap = new Map(allResults.map(r => [r.id.replace(/-/g, ""), r]));

    // 1. Detect Umbrella Container Page
    // Look for a page whose title is "NotMonk" or contains "NotMonk" (case-insensitive)
    let umbrellaItem = null;
    for (const item of allResults) {
      if (item.object === "page") {
        const title = (this.extractTitle(item) || "").trim().toLowerCase();
        const parentPageId = item.parent?.page_id ? item.parent.page_id.replace(/-/g, "") : null;
        const isRoot = !parentPageId || !allIds.has(parentPageId);
        if (isRoot && (title === "notmonk" || title.startsWith("notmonk ") || title.endsWith(" notmonk") || title.includes("notmonk workspace"))) {
          umbrellaItem = item;
          break;
        }
      }
    }

    const umbrellaId = umbrellaItem ? umbrellaItem.id.replace(/-/g, "") : null;
    const areas = [];
    const areasMap = new Map();
    const candidateTopics = [];

    // 2. Classify Areas
    for (const item of allResults) {
      const cleanId = item.id.replace(/-/g, "");
      if (umbrellaId && cleanId === umbrellaId) {
        // The umbrella container itself is not an area card
        continue;
      }

      const title = this.extractTitle(item);
      if (!title || !title.trim()) continue;

      const { icon, iconType, iconUrl } = this.extractIcon(item);
      const isDatabase = item.object === "database";
      const isWorkspaceParent = item.parent?.type === "workspace" || item.parent?.type === "teamspace";
      const parentPageId = item.parent?.page_id ? item.parent.page_id.replace(/-/g, "") : null;
      const isRootPage = item.object === "page" && (!parentPageId || !allIds.has(parentPageId));
      const isDirectUmbrellaChild = Boolean(umbrellaId && parentPageId === umbrellaId);

      // An item is an Area (Alan) if:
      // A. It is a direct child of the NotMonk umbrella page, OR
      // B. There is no umbrella page, and it is a root page / workspace item / database, OR
      // C. There is an umbrella page, but this is a separate standalone root page / database
      const isArea = isDirectUmbrellaChild ||
        (!umbrellaId && (isDatabase || isWorkspaceParent || isRootPage)) ||
        (umbrellaId && isRootPage && cleanId !== umbrellaId);

      if (isArea) {
        const areaObj = {
          id: cleanId,
          rawId: item.id,
          title: title.trim(),
          type: item.object,
          icon,
          iconType,
          iconUrl,
          url: item.url,
          parent: item.parent
        };
        areas.push(areaObj);
        areasMap.set(cleanId, areaObj);
      } else {
        candidateTopics.push(item);
      }
    }

    // 3. Classify Topics
    const topics = [];
    for (const item of candidateTopics) {
      if (item.object === "page") {
        const title = this.extractTitle(item);
        const category = this.extractCategory(item, areasMap, allItemsMap) || "Genel";
        const status = this.extractStatus(item);
        const today = this.extractToday(item);
        const resource = this.extractResource(item);

        topics.push({
          id: crypto.randomUUID(),
          notionPageId: item.id,
          notionUrl: item.url,
          title: title || "İsimsiz Konu",
          category,
          status,
          today,
          resource,
          notes: "",
          updatedAt: new Date(item.last_edited_time || Date.now()).getTime()
        });
      }
    }

    return { areas, topics, areasMap, umbrellaId };
  },

  async fetchAllWorkspaceData(token, explicitDbId = null, onProgress = null) {
    if (!token) throw new Error("Notion API Token eksik.");
    if (onProgress) onProgress("Notion Teamspace ve sayfaları taranıyor...");

    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const bodyPayload = { page_size: 100 };
      if (nextCursor) bodyPayload.start_cursor = nextCursor;

      const res = await fetch(`${NOTION_BASE_URL}/search`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(bodyPayload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Notion araması başarısız: ${res.status}`);
      }

      const data = await res.json();
      allResults.push(...(data.results || []));
      hasMore = Boolean(data.has_more);
      nextCursor = data.next_cursor;
    }

    const { areas, topics, areasMap, umbrellaId } = this.classifyWorkspaceHierarchy(allResults);

    // Query explicit database if configured
    if (explicitDbId) {
      try {
        const dbTopics = await this.queryDatabase(token, explicitDbId);
        for (const remote of dbTopics) {
          const idx = topics.findIndex(t => t.notionPageId === remote.notionPageId || t.title.toLowerCase() === remote.title.toLowerCase());
          if (idx !== -1) {
            topics[idx] = { ...topics[idx], ...remote };
          } else {
            topics.push(remote);
          }
        }
      } catch (e) {
        console.warn("Veritabanı sorgulanamadı:", e);
      }
    }

    // Fetch rich notes blocks for topics
    if (topics.length > 0 && onProgress) {
      onProgress(`Notlar çekiliyor (0/${topics.length})...`);
    }

    let count = 0;
    for (const topic of topics) {
      if (topic.notionPageId && !topic.notes) {
        const blocksHTML = await this.fetchPageBlocksHTML(token, topic.notionPageId);
        if (blocksHTML) {
          topic.notes = blocksHTML;
        }
      }
      count++;
      if (onProgress && count % 2 === 0) {
        onProgress(`Notlar çekiliyor (${count}/${topics.length})...`);
      }
    }

    return { areas, topics, umbrellaId };
  },

  async createPage(token, rawParentId, topic, isDatabase = true, schemaProperties = {}) {
    const parentId = this.cleanDatabaseId(rawParentId);
    const children = this.buildChildrenBlocks(topic.notes);

    let body = {};
    if (isDatabase) {
      const properties = this.buildProperties(topic, schemaProperties);
      body = {
        parent: { database_id: parentId },
        properties,
        children: children.length > 0 ? children : undefined
      };
    } else {
      // Create as native Notion Page (Document File) inside a Teamspace / Parent Page
      const statusMap = { todo: "Başlamadım ⏳", learning: "Öğreniyorum 📖", done: "Öğrendim ✅" };
      const statusText = statusMap[topic.status] || "Başlamadım";
      
      const metaBlocks = [
        {
          object: "block",
          type: "callout",
          callout: {
            icon: { emoji: topic.status === "done" ? "✅" : (topic.status === "learning" ? "⚡" : "📌") },
            rich_text: [{
              type: "text",
              text: { content: `Durum: ${statusText}  |  Alan: ${topic.category || "Genel"}${topic.resource ? `\nKaynak: ${topic.resource}` : ""}` }
            }]
          }
        },
        {
          object: "block",
          type: "divider",
          divider: {}
        }
      ];

      body = {
        parent: { page_id: parentId },
        properties: {
          title: [{ type: "text", text: { content: topic.title || "İsimsiz Konu" } }]
        },
        icon: { emoji: topic.status === "done" ? "✅" : "📄" },
        children: [...metaBlocks, ...children].slice(0, 95)
      };
    }

    const res = await fetch(`${NOTION_BASE_URL}/pages`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Sayfa oluşturulamadı: ${res.status}`);
    }

    const data = await res.json();
    return {
      notionPageId: data.id,
      notionUrl: data.url
    };
  },

  async updatePageBlocks(token, pageId, notes) {
    if (!token || !pageId) return;
    const cleanId = this.cleanDatabaseId(pageId);
    const newBlocks = this.buildChildrenBlocks(notes);
    if (!newBlocks.length) return;

    try {
      const existingRes = await fetch(`${NOTION_BASE_URL}/blocks/${cleanId}/children?page_size=40`, {
        method: "GET",
        headers: this.getHeaders(token)
      });
      if (existingRes.ok) {
        const existingData = await existingRes.json();
        // Delete up to 15 old blocks (skip top callout if desired)
        for (const block of (existingData.results || []).slice(0, 15)) {
          await fetch(`${NOTION_BASE_URL}/blocks/${block.id}`, {
            method: "DELETE",
            headers: this.getHeaders(token)
          }).catch(() => {});
        }
      }

      await fetch(`${NOTION_BASE_URL}/blocks/${cleanId}/children`, {
        method: "PATCH",
        headers: this.getHeaders(token),
        body: JSON.stringify({ children: newBlocks.slice(0, 95) })
      });
    } catch (e) {
      console.warn("Sayfa blokları güncellenirken hata oluştu:", e);
    }
  },

  async updatePage(token, pageId, topic, isDatabase = true, schemaProperties = {}) {
    if (!pageId) throw new Error("Sayfa ID'si belirtilmemiş.");
    let properties = {};
    if (isDatabase) {
      properties = this.buildProperties(topic, schemaProperties);
    } else {
      properties = {
        title: [{ type: "text", text: { content: topic.title || "İsimsiz Konu" } }]
      };
    }

    const res = await fetch(`${NOTION_BASE_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      body: JSON.stringify({ properties })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Sayfa güncellenemedi: ${res.status}`);
    }

    // Also update notes blocks
    if (topic.notes) {
      await this.updatePageBlocks(token, pageId, topic.notes);
    }

    const data = await res.json();
    return {
      notionPageId: data.id,
      notionUrl: data.url
    };
  },

  async createAreaPage(token, parentPageId, title, icon = "📁") {
    if (!token || !parentPageId || !title) return null;
    const cleanParentId = this.cleanDatabaseId(parentPageId);
    try {
      const res = await fetch(`${NOTION_BASE_URL}/pages`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          parent: { page_id: cleanParentId },
          properties: {
            title: [{ type: "text", text: { content: title } }]
          },
          icon: { emoji: icon }
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("Alan sayfası oluşturulamadı:", err);
        return null;
      }
      const data = await res.json();
      return {
        id: data.id.replace(/-/g, ""),
        rawId: data.id,
        title,
        url: data.url
      };
    } catch (e) {
      console.warn("createAreaPage hatası:", e);
      return null;
    }
  },

  async updatePageIcon(token, pageId, iconData) {
    if (!token || !pageId || !iconData) return;
    const cleanId = this.cleanDatabaseId(pageId);
    let iconPayload = null;
    if (iconData.iconType === "emoji" && iconData.icon) {
      iconPayload = { type: "emoji", emoji: iconData.icon };
    } else if (iconData.iconType === "image" && iconData.iconUrl && iconData.iconUrl.startsWith("http")) {
      iconPayload = { type: "external", external: { url: iconData.iconUrl } };
    }
    if (!iconPayload) return;

    try {
      await fetch(`${NOTION_BASE_URL}/pages/${cleanId}`, {
        method: "PATCH",
        headers: this.getHeaders(token),
        body: JSON.stringify({ icon: iconPayload })
      });
    } catch (e) {
      console.warn("Notion sayfa ikonu güncellenemedi:", e);
    }
  },

  async syncTopic(token, defaultParentId, topic, schemaProperties = {}, areaMapping = {}, umbrellaParentId = null) {
    if (!token) return null;

    // Determine target parent (check if area is mapped to a specific Teamspace / Parent Page or Database)
    let targetParentId = defaultParentId;
    let isDatabase = true;

    if (topic.category && areaMapping[topic.category]) {
      const mapped = areaMapping[topic.category];
      targetParentId = mapped.id || mapped;
      isDatabase = mapped.type ? mapped.type === "database" : false;
    } else if (topic.category && (umbrellaParentId || defaultParentId)) {
      // Auto-create Area page under the umbrella parent!
      try {
        const parentForArea = umbrellaParentId || defaultParentId;
        const newArea = await this.createAreaPage(token, parentForArea, topic.category);
        if (newArea) {
          areaMapping[topic.category] = { id: newArea.id, type: "page" };
          targetParentId = newArea.id;
          isDatabase = false;
        }
      } catch (e) {
        console.warn("Otomatik Alan sayfası oluşturulamadı:", e);
      }
    }

    if (!targetParentId) return null;

    try {
      if (topic.notionPageId) {
        return await this.updatePage(token, topic.notionPageId, topic, isDatabase, schemaProperties);
      } else {
        return await this.createPage(token, targetParentId, topic, isDatabase, schemaProperties);
      }
    } catch (e) {
      console.warn("Notion senkronizasyon hatası:", e);
      if (e.message && (e.message.includes("Could not find page") || e.message.includes("404"))) {
        topic.notionPageId = null;
        topic.notionUrl = null;
        return await this.createPage(token, targetParentId, topic, isDatabase, schemaProperties);
      }
      throw e;
    }
  },

  async queryDatabase(token, rawDatabaseId) {
    const databaseId = this.cleanDatabaseId(rawDatabaseId);
    let allPages = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const res = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          start_cursor: nextCursor,
          page_size: 100
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Notion verileri çekilemedi: ${res.status}`);
      }

      const data = await res.json();
      allPages.push(...data.results);
      hasMore = data.has_more;
      nextCursor = data.next_cursor;
    }

    // Convert Notion pages to NotMonk topic objects
    return allPages.map(page => {
      const props = page.properties || {};
      
      // Extract title
      let title = "İsimsiz Konu";
      for (const key of Object.keys(props)) {
        if (props[key].type === "title") {
          title = props[key].title?.map(t => t.plain_text).join("") || "İsimsiz Konu";
          break;
        }
      }

      // Extract category
      let category = "Genel";
      for (const key of Object.keys(props)) {
        if (props[key].type === "select" && (key.toLowerCase().includes("kategori") || key.toLowerCase().includes("category") || key.toLowerCase().includes("alan"))) {
          category = props[key].select?.name || "Genel";
          break;
        }
      }

      // Extract status
      let status = "todo";
      for (const key of Object.keys(props)) {
        if (props[key].type === "status" || (props[key].type === "select" && (key.toLowerCase().includes("durum") || key.toLowerCase().includes("status")))) {
          const val = props[key].status?.name || props[key].select?.name || "";
          if (val === "Öğrendim" || val.toLowerCase() === "done") status = "done";
          else if (val === "Öğreniyorum" || val.toLowerCase() === "learning") status = "learning";
          else status = "todo";
          break;
        }
      }

      // Extract today
      let today = false;
      for (const key of Object.keys(props)) {
        if (props[key].type === "checkbox") {
          today = Boolean(props[key].checkbox);
          break;
        }
      }

      // Extract resource
      let resource = "";
      for (const key of Object.keys(props)) {
        if (props[key].type === "url" && props[key].url) {
          resource = props[key].url;
          break;
        }
      }

      return {
        id: crypto.randomUUID(),
        notionPageId: page.id,
        notionUrl: page.url,
        title,
        category,
        status,
        today,
        resource,
        notes: "",
        updatedAt: new Date(page.last_edited_time || Date.now()).getTime()
      };
    });
  }
};

globalThis.NotionAPI = NotionAPI;
