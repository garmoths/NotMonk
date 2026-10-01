// ── Notion API Client for NotMonk ─────────────────────────────────────────────
const NOTION_API_VERSION = "2022-06-28";
const NOTION_BASE_URL = "https://api.notion.com/v1";

const NotionAPI = {
  async request(url, options = {}) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(30000) });
      if (res.status !== 429 || attempt >= 4) return res;
      const seconds = Number(res.headers.get("Retry-After")) || 1;
      await new Promise(resolve => setTimeout(resolve, Math.max(1, seconds) * 1000));
    }
  },

  async checked(url, options) {
    const res = await this.request(url, options);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `Notion API hatası: ${res.status}`);
    }
    return res.json();
  },

  async listBlocks(token, pageId) {
    const blocks = [];
    let cursor;
    do {
      const data = await this.checked(`${NOTION_BASE_URL}/blocks/${this.cleanDatabaseId(pageId)}/children?page_size=100${cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''}`, { headers: this.getHeaders(token) });
      blocks.push(...(data.results || []));
      cursor = data.has_more ? data.next_cursor : null;
      if (data.has_more && !cursor) throw new Error("Notion sayfalama yanıtı eksik.");
    } while (cursor);
    return blocks;
  },

  textSpans(value) {
    const text = String(value || "");
    return Array.from({ length: Math.max(1, Math.ceil(text.length / 2000)) }, (_, i) => ({ type: "text", text: { content: text.slice(i * 2000, (i + 1) * 2000) } }));
  },

  metadataBlock(topic) {
    return { object: "block", type: "callout", callout: { icon: { type: "emoji", emoji: "📌" }, rich_text: this.textSpans(`Durum: ${{todo: "Başlamadım", learning: "Öğreniyorum", done: "Öğrendim"}[topic.status] || "Başlamadım"}  |  Alan: ${topic.category || "Genel"}\nBugün: ${topic.today ? "Evet" : "Hayır"}\nKaynak: ${topic.resource || ""}`) } };
  },

  async readMetadata(token, pageId) {
    const blocks = await this.listBlocks(token, pageId);
    const text = blocks.filter(b => b.type === "callout").map(b => (b.callout.rich_text || []).map(t => t.plain_text || t.text?.content || "").join("")).find(t => t.startsWith("Durum:") && t.includes("Alan:"));
    if (!text) return {};
    return { status: text.includes("Öğrendim") ? "done" : text.includes("Öğreniyorum") ? "learning" : "todo", today: text.includes("Bugün: Evet"), resource: text.match(/Kaynak: ([^\n]*)/)?.[1] || "" };
  },

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

  formatUuid(id) {
    if (!id) return "";
    const clean = id.replace(/-/g, "").trim();
    if (clean.length !== 32) return id;
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  },

  async resolveDatabaseId(token, rawId) {
    let id = this.cleanDatabaseId(rawId);
    if (!token || !id) return id;

    // 1. First test if it's already a database
    const dbRes = await this.request(`${NOTION_BASE_URL}/databases/${id}`, {
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
    const pageRes = await this.request(`${NOTION_BASE_URL}/pages/${id}`, {
      method: "GET",
      headers: this.getHeaders(token)
    });

    if (pageRes.ok) {
      // Look for an existing child database inside this page
      const blocksRes = await this.request(`${NOTION_BASE_URL}/blocks/${id}/children?page_size=50`, {
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
      const userRes = await this.request(`${NOTION_BASE_URL}/users/me`, {
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
      isPage: Boolean(res.isPage),
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

    for (const key of Object.keys(props)) {
      if (!schemaProperties[key] || schemaProperties[key].type !== Object.keys(props[key])[0]) delete props[key];
    }
    for (const [key, prop] of Object.entries(schemaProperties)) {
      if (prop.type === "url" && /^(kaynak|resource|link)$/i.test(key) && !topic.resource) props[key] = { url: null };
      if (prop.type === "select" && /^(kategori|category|alan)$/i.test(key) && !topic.category) props[key] = { select: null };
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
          for (const chunk of this.textSpans(text)) spans.push({
            type: "text",
            text: {
              content: chunk.text.content,
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
    return spans.length > 0 ? spans : this.textSpans((container.textContent || ""));
  },

  buildChildrenBlocks(notes) {
    if (!notes || !notes.trim()) return [];

    // Plain text / Markdown fallback parser: generates native Notion to_do, callout and heading blocks
    if (!/<[a-z][\s\S]*>/i.test(notes)) {
      const lines = notes.split("\n");
      const blocks = [];
      let currentParagraph = [];

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const text = currentParagraph.join("\n").trim();
          if (text) {
            blocks.push({
              object: "block",
              type: "paragraph",
              paragraph: { rich_text: this.textSpans(text) }
            });
          }
          currentParagraph = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          flushParagraph();
          continue;
        }

        // To-Do checklist item: [ ] or [x]
        const todoMatch = trimmed.match(/^\[([ xX])\]\s*(.+)$/);
        if (todoMatch) {
          flushParagraph();
          blocks.push({
            object: "block",
            type: "to_do",
            to_do: {
              rich_text: this.textSpans(todoMatch[2]),
              checked: todoMatch[1].toLowerCase() === "x"
            }
          });
          continue;
        }

        // Bullet point: • or -
        const bulletMatch = trimmed.match(/^[•\-]\s*(.+)$/);
        if (bulletMatch) {
          flushParagraph();
          blocks.push({
            object: "block",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: this.textSpans(bulletMatch[1])
            }
          });
          continue;
        }

        // Callout sections: 🎯 HEDEF, 🏁 ÇIKIŞ KRİTERİ, 💼 KARİYER EŞİĞİ
        if (trimmed.startsWith("🎯 HEDEF") || trimmed.startsWith("🏁 ÇIKIŞ KRİTERİ") || trimmed.startsWith("💼 KARİYER")) {
          flushParagraph();
          const emoji = trimmed.startsWith("🎯") ? "🎯" : (trimmed.startsWith("🏁") ? "🏁" : "💼");
          let content = trimmed;
          if (i + 1 < lines.length && lines[i + 1].trim()) {
            content += "\n" + lines[i + 1].trim();
            i++;
          }
          blocks.push({
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji },
              rich_text: this.textSpans(content)
            }
          });
          continue;
        }

        // Headings: 📚 ALT KONULAR, 📝 KENDİ ÇALIŞMA NOTLARIM, or ###
        if (trimmed.startsWith("📚") || trimmed.startsWith("📝") || trimmed.startsWith("###")) {
          flushParagraph();
          blocks.push({
            object: "block",
            type: "heading_3",
            heading_3: {
              rich_text: this.textSpans(trimmed.replace(/^###\s*/, ""))
            }
          });
          continue;
        }

        currentParagraph.push(line);
      }

      flushParagraph();
      return blocks;
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
            paragraph: { rich_text: this.textSpans(text) }
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
              rich_text: this.textSpans(codeText),
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
              rich_text: this.textSpans(codeText),
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

    return blocks;
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

  escapeAttribute(value) {
    return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
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
      if (href && /^(https?:|mailto:)/i.test(href)) {
        content = `<a href="${this.escapeAttribute(href)}" target="_blank" rel="noopener">${content}</a>`;
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
        const plain = block.callout?.rich_text?.map(t => t.plain_text || t.text?.content || "").join("") || "";
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
          htmlParts.push(`<figure class="editor-image-wrap" contenteditable="false" data-size="100%"><img src="${this.escapeAttribute(imgUrl)}" class="editor-image" loading="lazy"><figcaption class="editor-image-caption" contenteditable="true" data-placeholder="Açıklama ekle...">${caption}</figcaption></figure>`);
        }
      } else if (type === "divider") {
        htmlParts.push("<hr>");
      } else if (type === "bulleted_list_item") {
        htmlParts.push(`<li>${this.richTextToHTML(block.bulleted_list_item?.rich_text)}</li>`);
      } else if (type === "to_do") {
        htmlParts.push(`<p>[${block.to_do.checked ? "x" : " "}] ${this.richTextToHTML(block.to_do.rich_text)}</p>`);
      } else if (type === "numbered_list_item") {
        htmlParts.push(`<li>${this.richTextToHTML(block.numbered_list_item?.rich_text)}</li>`);
      }
      if (block.childrenHTML) htmlParts.push(block.childrenHTML);
    }

    return htmlParts.join("");
  },

  async fetchPageBlocksHTML(token, pageId) {
    if (!token || !pageId) throw new Error("Token veya sayfa ID eksik.");
    const blocks = await this.listBlocks(token, pageId);
    for (const block of blocks) {
      if (block.has_children && !["child_page", "child_database"].includes(block.type)) {
        block.childrenHTML = await this.fetchPageBlocksHTML(token, block.id);
      }
    }
    return this.blocksToHTML(blocks);
  },

  async getOrFindUmbrellaPageId(token, explicitId = null) {
    if (!token) return null;
    if (explicitId) {
      return this.cleanDatabaseId(explicitId);
    }
    try {
      // 1. Search all accessible items first without query filter
      const res = await this.request(`${NOTION_BASE_URL}/search`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          page_size: 100
        })
      });
      if (res.ok) {
        const data = await res.json();
        for (const item of (data.results || [])) {
          const title = (this.extractTitle(item) || "").trim().toLowerCase();
          if (title.includes("notmonk")) {
            return item.id.replace(/-/g, "");
          }
        }
      }

      // 2. Fallback: targeted search query
      const queryRes = await this.request(`${NOTION_BASE_URL}/search`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          query: "notmonk",
          page_size: 50
        })
      });
      if (queryRes.ok) {
        const data = await queryRes.json();
        for (const item of (data.results || [])) {
          const title = (this.extractTitle(item) || "").trim().toLowerCase();
          if (title.includes("notmonk")) {
            return item.id.replace(/-/g, "");
          }
        }
      }
    } catch (e) {
      console.warn("Umbrella page arama hatası:", e);
    }
    return null;
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

      const res = await this.request(`${NOTION_BASE_URL}/search`, {
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

    const { areas, umbrellaId } = this.classifyWorkspaceHierarchy(allResults);
    return { areas, umbrellaId };
  },

  classifyWorkspaceHierarchy(allResults, explicitParentId = null) {
    const allIds = new Set(allResults.map(r => r.id.replace(/-/g, "")));
    const allItemsMap = new Map(allResults.map(r => [r.id.replace(/-/g, ""), r]));

    let umbrellaId = explicitParentId ? this.cleanDatabaseId(explicitParentId) : null;
    let umbrellaItem = umbrellaId ? allItemsMap.get(umbrellaId) : null;

    if (!umbrellaId) {
      // 1. Detect Umbrella Container Page
      // Look for a page or database whose title contains "notmonk" (case-insensitive)
      for (const item of allResults) {
        const title = (this.extractTitle(item) || "").trim().toLowerCase();
        if (title.includes("notmonk")) {
          umbrellaItem = item;
          umbrellaId = item.id.replace(/-/g, "");
          break;
        }
      }
    }
    const areas = [];
    const areasMap = new Map();
    const candidateTopics = [];

    // 2. Classify Areas
    for (const item of allResults) {
      const cleanId = item.id.replace(/-/g, "");
      const title = this.extractTitle(item);
      if (!title || !title.trim()) continue;

      const cleanTitle = title.trim().toLowerCase();
      if ((umbrellaId && cleanId === umbrellaId) || cleanTitle.includes("notmonk")) {
        // The umbrella container itself must NEVER be an area card!
        if (!umbrellaId) umbrellaId = cleanId;
        continue;
      }

      const { icon, iconType, iconUrl } = this.extractIcon(item);
      const isDatabase = item.object === "database";
      const isWorkspaceParent = item.parent?.type === "workspace" || item.parent?.type === "teamspace";
      const parentPageId = item.parent?.page_id ? item.parent.page_id.replace(/-/g, "") : null;
      const isRootPage = item.object === "page" && (!parentPageId || !allIds.has(parentPageId));
      const isDirectUmbrellaChild = Boolean(umbrellaId && parentPageId === umbrellaId);

      // An item is an Area (Alan) if:
      // A. An umbrella page (NotMonk) exists: ONLY direct children of NotMonk are Areas.
      // B. NO umbrella page exists: root pages / workspace items / databases are Areas (legacy fallback).
      const isArea = umbrellaId
        ? Boolean(isDirectUmbrellaChild)
        : Boolean(isDatabase || isWorkspaceParent || isRootPage);

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
        const category = this.extractCategory(item, areasMap, allItemsMap);

        // NotMonk alanına ait olmayan sayfaları atla
        if (!category || category === "Genel") {
          continue;
        }

        const finalCategory = category;
        const status = this.extractStatus(item);
        const today = this.extractToday(item);
        const resource = this.extractResource(item);

        topics.push({
          id: crypto.randomUUID(),
          notionPageId: item.id,
          notionParentPageId: item.parent?.page_id || null,
          notionUrl: item.url,
          title: title || "İsimsiz Konu",
          category: finalCategory,
          status,
          today,
          resource,
          notes: "",
          updatedAt: new Date(item.last_edited_time || Date.now()).getTime()
        });
      }
    }

    const topicIdByNotionId = new Map(topics.map(topic => [this.cleanDatabaseId(topic.notionPageId), topic.id]));
    topics.forEach(topic => {
      topic.parentTopicId = topic.notionParentPageId
        ? (topicIdByNotionId.get(this.cleanDatabaseId(topic.notionParentPageId)) || null)
        : null;
    });

    return { areas, topics, areasMap, umbrellaId };
  },

  async isPageInTrash(token, pageId) {
    if (!token || !pageId) return false;
    try {
      const cleanId = this.cleanDatabaseId(pageId);
      const res = await this.request(`${NOTION_BASE_URL}/pages/${cleanId}`, {
        method: "GET",
        headers: this.getHeaders(token)
      });
      if (res.status === 404 || res.status === 400) {
        return false; // Erişim kaybı silinme kanıtı değildir.
      }
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.in_trash || data.archived);
    } catch (e) {
      console.warn("[NotMonk] isPageInTrash kontrol hatası:", e);
      return false;
    }
  },

  async fetchRecentWorkspaceChanges(token, explicitDbId = null, existingTopics = [], knownAreaMapping = {}) {
    if (!token) return null;

    try {
      const res = await this.request(`${NOTION_BASE_URL}/search`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          sort: {
            direction: "descending",
            timestamp: "last_edited_time"
          },
          page_size: 100
        })
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      const results = data.results || [];
      let cursor = data.has_more ? data.next_cursor : null;
      while (cursor) {
        const next = await this.checked(`${NOTION_BASE_URL}/search`, { method: "POST", headers: this.getHeaders(token), body: JSON.stringify({ page_size: 100, start_cursor: cursor, sort: { direction: "descending", timestamp: "last_edited_time" } }) });
        results.push(...(next.results || []));
        cursor = next.has_more ? next.next_cursor : null;
      }

      // Build area reverse lookup: notionId -> areaTitle
      const areaIdToTitle = new Map();
      Object.entries(knownAreaMapping || {}).forEach(([catTitle, meta]) => {
        if (meta?.id) {
          areaIdToTitle.set(this.cleanDatabaseId(meta.id), catTitle);
        }
      });

      const existingMap = new Map();
      existingTopics.forEach(t => {
        if (t.notionPageId) {
          existingMap.set(this.cleanDatabaseId(t.notionPageId), t);
        }
      });
      const resultItemsMap = new Map(results.map(item => [this.cleanDatabaseId(item.id), item]));

      const resolveAreaFromAncestors = item => {
        let parentId = this.cleanDatabaseId(item.parent?.page_id || item.parent?.database_id || "");
        const visited = new Set();
        while (parentId && !visited.has(parentId)) {
          visited.add(parentId);
          if (areaIdToTitle.has(parentId)) return areaIdToTitle.get(parentId);
          const parentItem = resultItemsMap.get(parentId);
          if (!parentItem) break;
          parentId = this.cleanDatabaseId(parentItem.parent?.page_id || parentItem.parent?.database_id || "");
        }
        return "";
      };

      const updatedTopics = [];
      const newTopics = [];
      const archivedPageIds = [];
      const archivedAreaTitles = [];

      // Aktif sonuçlardaki sayfa ID'leri
      const activeResultIds = new Set(results.map(r => this.cleanDatabaseId(r.id)));

      // Notion'da silinmiş (çöpe atılmış) sayfaları tespit et:
      // Mevcut konulardan arama sonuçlarında çıkmayanları isPageInTrash ile kontrol et
      for (const [cleanPid, localTopic] of existingMap.entries()) {
        if (!activeResultIds.has(cleanPid)) {
          const inTrash = await this.isPageInTrash(token, localTopic.notionPageId);
          if (inTrash) {
            archivedPageIds.push(cleanPid);
          }
        }
      }

      // Notion'da silinmiş (çöpe atılmış) ALANLARI / KLASÖRLERİ tespit et:
      for (const [catTitle, meta] of Object.entries(knownAreaMapping || {})) {
        if (!meta?.id) continue;
        const cleanAreaId = this.cleanDatabaseId(meta.id);
        if (!activeResultIds.has(cleanAreaId)) {
          const inTrash = await this.isPageInTrash(token, meta.id);
          if (inTrash) {
            archivedAreaTitles.push(catTitle);
          }
        }
      }

      for (const item of results) {
        const cleanId = item.id.replace(/-/g, "");

        // 1. Check if archived/deleted in Notion
        if (item.archived) {
          archivedPageIds.push(cleanId);
          continue;
        }

        // 2. Ignore umbrella or area pages from being treated as topics
        const title = this.extractTitle(item) || "";
        const cleanTitle = title.trim().toLowerCase();
        if (cleanTitle.includes("notmonk")) continue;
        if (areaIdToTitle.has(cleanId)) continue;

        if (item.object !== "page") continue;

        const parentId = (item.parent?.page_id || item.parent?.database_id || "").replace(/-/g, "");
        const local = existingMap.get(cleanId);

        // Determine category
        let category = "";
        if (areaIdToTitle.has(parentId)) {
          category = areaIdToTitle.get(parentId);
        } else if (resolveAreaFromAncestors(item)) {
          category = resolveAreaFromAncestors(item);
        } else if (local?.category) {
          category = local.category;
        } else {
          category = this.extractCategory(item, null, null) || "";
        }

        // NotMonk alanına ait olmayan ve lokalde kayıtlı olmayan sayfaları atla (kullanıcının kişisel Notion sayfaları)
        if (!local && (!category || category === "Genel")) {
          continue;
        }

        const remoteEditedMs = new Date(item.last_edited_time || 0).getTime();
        const localEditedMs = local?.notionLastEditedTime || local?.updatedAt || 0;

        const isNewer = !local || remoteEditedMs > localEditedMs;

        if (isNewer) {
          const native = item.parent?.type === "page_id";
          const status = native ? (local?.status || "todo") : this.extractStatus(item);
          const today = native ? (local?.today || false) : this.extractToday(item);
          const resource = native ? (local?.resource || "") : this.extractResource(item);

          let freshNotes = local?.notes || "";
          try {
            const fetchedHTML = await this.fetchPageBlocksHTML(token, item.id);
            if (fetchedHTML !== null && fetchedHTML !== undefined) {
              freshNotes = fetchedHTML;
            }
          } catch (e) {
            throw e;
          }

          const metadata = item.parent?.type === "page_id" ? await this.readMetadata(token, item.id) : {};
          const topicData = {
            id: local?.id || crypto.randomUUID(),
            notionPageId: item.id,
            notionParentPageId: item.parent?.page_id || null,
            notionUrl: item.url,
            title: title.trim() || "İsimsiz Konu",
            category,
            status,
            today: today !== undefined ? today : (local?.today || false),
            resource,
            notes: freshNotes,
            notionLastEditedTime: remoteEditedMs,
            updatedAt: Date.now(),
            ...metadata,
            parentTopicId: local?.parentTopicId || null
          };

          if (local) {
            updatedTopics.push(topicData);
          } else {
            newTopics.push(topicData);
          }
        }
      }

      return {
        updatedTopics,
        newTopics,
        archivedPageIds,
        archivedAreaTitles
      };
    } catch (e) {
      console.warn("[NotMonk] fetchRecentWorkspaceChanges genel hata:", e);
      return null;
    }
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

      const res = await this.request(`${NOTION_BASE_URL}/search`, {
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

    const { areas, topics, areasMap, umbrellaId } = this.classifyWorkspaceHierarchy(allResults, explicitDbId);

    // Query explicit database if configured
    if (explicitDbId) {
      try {
        const dbTopics = await this.queryDatabase(token, explicitDbId);
        for (const remote of dbTopics) {
          // Hata 14: Önce notionPageId ile eşleştir (kesin), sonra title ile (belirsiz)
          let idx = topics.findIndex(t => t.notionPageId && this.cleanDatabaseId(t.notionPageId) === this.cleanDatabaseId(remote.notionPageId));
          if (idx !== -1) {
            // Hata 14: Mevcut local id'yi koru — her sync'te yeni UUID üretme
            const existingLocalId = topics[idx].id;
            topics[idx] = { ...topics[idx], ...remote, id: existingLocalId };
          } else {
            topics.push(remote);
          }
        }
      } catch (e) {
        throw e;
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
      Object.assign(topic, await this.readMetadata(token, topic.notionPageId));
      count++;
      if (onProgress && count % 2 === 0) {
        onProgress(`Notlar çekiliyor (${count}/${topics.length})...`);
      }
    }

    return { areas, topics, umbrellaId };
  },

  async createPage(token, rawParentId, topic, isDatabase = true, schemaProperties = {}) {
    const parentId = this.cleanDatabaseId(rawParentId);
    const formattedId = this.formatUuid(parentId);
    const children = this.buildChildrenBlocks(topic.notes);

    let body = {};
    if (isDatabase) {
      const properties = this.buildProperties(topic, schemaProperties);
      body = {
        parent: { type: "database_id", database_id: formattedId },
        properties,
        children: children.length > 0 ? children.slice(0, 98) : undefined
      };
    } else {
      // Create as native Notion Page (Document File) inside a Teamspace / Parent Page
      const statusMap = { todo: "Başlamadım ⏳", learning: "Öğreniyorum 📖", done: "Öğrendim ✅" };
      const statusText = statusMap[topic.status] || "Başlamadım";
      
      const metaBlocks = [this.metadataBlock(topic)];

      body = {
        parent: { type: "page_id", page_id: formattedId },
        properties: {
          title: { title: this.textSpans(topic.title || "İsimsiz Konu") }
        },
        icon: { type: "emoji", emoji: topic.status === "done" ? "✅" : "📄" },
        children: [...metaBlocks, ...children.slice(0, 98)]
      };
    }

    const res = await this.request(`${NOTION_BASE_URL}/pages`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Sayfa oluşturulamadı: ${res.status}`);
    }

    const data = await res.json();
    for (let i = 98; i < children.length; i += 100) {
      await this.checked(`${NOTION_BASE_URL}/blocks/${data.id}/children`, { method: "PATCH", headers: this.getHeaders(token), body: JSON.stringify({ children: children.slice(i, i + 100) }) });
    }
    return {
      notionPageId: data.id,
      notionUrl: data.url
    };
  },

  async updatePageBlocks(token, pageId, notes, metadata = null) {
    const oldBlocks = await this.listBlocks(token, pageId);
    const oldContentBlocks = oldBlocks.filter(block => {
      if (["child_page", "child_database"].includes(block.type)) return false;
      if (block.type !== "callout") return true;
      const text = (block.callout?.rich_text || []).map(part => part.plain_text || part.text?.content || "").join("");
      return !text.startsWith("Durum:");
    });
    const remoteNotes = this.blocksToHTML(oldContentBlocks).trim();
    const localNotes = String(notes || "").trim();
    let mergedNotes = localNotes;
    if (!localNotes) mergedNotes = remoteNotes;
    else if (!remoteNotes || localNotes.includes(remoteNotes)) mergedNotes = localNotes;
    else if (remoteNotes.includes(localNotes)) mergedNotes = remoteNotes;
    else mergedNotes = `${remoteNotes}<hr><h2>NotMonk'tan gelen notlar</h2>${localNotes}`;

    // Boş bir aktarım, Notion'daki dolu sayfayı hiçbir zaman temizlemez.
    if (!metadata && !localNotes && remoteNotes) return;

    const newBlocks = [...(metadata ? [metadata] : []), ...this.buildChildrenBlocks(mergedNotes)];
    // Append first: a failed upload must not erase the existing document.
    for (let i = 0; i < newBlocks.length; i += 100) {
      await this.checked(`${NOTION_BASE_URL}/blocks/${pageId}/children`, {
        method: "PATCH", headers: this.getHeaders(token),
        body: JSON.stringify({ children: newBlocks.slice(i, i + 100) })
      });
    }
    for (const block of oldBlocks) {
      if (["child_page", "child_database"].includes(block.type)) continue;
      await this.checked(`${NOTION_BASE_URL}/blocks/${block.id}`, { method: "DELETE", headers: this.getHeaders(token) });
    }
  },

  // Hata 11: contentChanged=true ise blokları güncelle, false ise sadece metadata güncelle
  async updatePage(token, pageId, topic, isDatabase = true, schemaProperties = {}, contentChanged = true) {
    if (!pageId) throw new Error("Sayfa ID'si belirtilmemiş.");
    let properties = {};
    if (isDatabase) {
      properties = this.buildProperties(topic, schemaProperties);
    } else {
      properties = {
        title: { title: this.textSpans(topic.title || "İsimsiz Konu") }
      };
    }

    const res = await this.request(`${NOTION_BASE_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      body: JSON.stringify({ properties })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Sayfa güncellenemedi: ${res.status}`);
    }

    // Hata 11: Sadece içerik değiştiyse blokları güncelle — gereksiz API çağrılarını ve echo'yu önler
    if (contentChanged) {
      await this.updatePageBlocks(token, pageId, topic.notes, isDatabase ? null : this.metadataBlock(topic));
    }

    await res.json();
    if (!isDatabase && !contentChanged) {
      const blocks = await this.listBlocks(token, pageId);
      const old = blocks.find(b => b.type === "callout" && (b.callout.rich_text || []).map(t => t.plain_text || t.text?.content || "").join("").startsWith("Durum:"));
      const block = this.metadataBlock(topic);
      await this.checked(`${NOTION_BASE_URL}/blocks/${old ? old.id : pageId + '/children'}`, { method: "PATCH", headers: this.getHeaders(token), body: JSON.stringify(old ? { callout: block.callout } : { children: [block] }) });
    }
    const data = await this.checked(`${NOTION_BASE_URL}/pages/${pageId}`, { headers: this.getHeaders(token) });
    return {
      notionPageId: data.id,
      notionUrl: data.url,
      notionLastEditedTime: Date.parse(data.last_edited_time) || 0
    };
  },

  async createAreaPage(token, parentPageId, title, icon = "📁") {
    if (!token || !parentPageId || !title) {
      throw new Error("Token, üst sayfa ID'si veya başlık eksik.");
    }
    const cleanParentId = this.cleanDatabaseId(parentPageId);
    const formattedId = this.formatUuid(cleanParentId);

    let iconPayload = null;
    if (typeof icon === "string" && icon.startsWith("http")) {
      iconPayload = { type: "external", external: { url: icon } };
    } else if (typeof icon === "object" && icon?.iconUrl && icon?.iconUrl.startsWith("http")) {
      iconPayload = { type: "external", external: { url: icon.iconUrl } };
    } else {
      const emojiChar = (typeof icon === "object" ? icon?.icon : icon) || "📁";
      iconPayload = { type: "emoji", emoji: emojiChar };
    }

    const pagePayload = {
      parent: { type: "page_id", page_id: formattedId },
      properties: {
        title: { title: this.textSpans(title) }
      },
      icon: iconPayload
    };

    console.log("[NotMonk] Notion createAreaPage isteği gönderiliyor:", {
      parent: pagePayload.parent,
      title
    });

    try {
      let res = await this.request(`${NOTION_BASE_URL}/pages`, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify(pagePayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.warn("[NotMonk] createAreaPage ilk deneme hatası:", res.status, errJson);

        // Fallback: check if parent was actually a database
        if (errJson.message && (errJson.message.includes("database") || errJson.message.includes("parent"))) {
          pagePayload.parent = { type: "database_id", database_id: formattedId };
          res = await this.request(`${NOTION_BASE_URL}/pages`, {
            method: "POST",
            headers: this.getHeaders(token),
            body: JSON.stringify(pagePayload)
          });
          if (!res.ok) {
            const dbErr = await res.json().catch(() => ({}));
            console.error("[NotMonk] createAreaPage database_id denemesi de başarısız:", res.status, dbErr);
            throw new Error(dbErr.message || `Notion sayfası oluşturulamadı (${res.status})`);
          }
        } else {
          throw new Error(errJson.message || `Notion sayfası oluşturulamadı (${res.status})`);
        }
      }

      const data = await res.json();
      console.log("[NotMonk] createAreaPage başarılı:", data.id, data.url);
      return {
        id: data.id.replace(/-/g, ""),
        rawId: data.id,
        title,
        url: data.url
      };
    } catch (e) {
      console.warn("createAreaPage hatası:", e);
      throw e;
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
      await this.request(`${NOTION_BASE_URL}/pages/${cleanId}`, {
        method: "PATCH",
        headers: this.getHeaders(token),
        body: JSON.stringify({ icon: iconPayload })
      });
    } catch (e) {
      console.warn("Notion sayfa ikonu güncellenemedi:", e);
    }
  },

  async archivePage(token, pageId) {
    if (!token || !pageId) return;
    const cleanId = this.cleanDatabaseId(pageId);
    try {
      await this.request(`${NOTION_BASE_URL}/pages/${cleanId}`, {
        method: "PATCH",
        headers: this.getHeaders(token),
        body: JSON.stringify({ archived: true })
      });
    } catch (e) {
      console.warn("[NotMonk] Sayfa arşivlenirken hata:", e);
    }
  },

  async movePage(token, pageId, parentId, parentType = "page") {
    if (!pageId || !parentId) return null;
    const type = parentType === "database" ? "data_source_id" : "page_id";
    const headers = { ...this.getHeaders(token), "Notion-Version": "2025-09-03" };
    return this.checked(`${NOTION_BASE_URL}/pages/${this.cleanDatabaseId(pageId)}/move`, {
      method: "POST",
      headers,
      body: JSON.stringify({ parent: { type, [type]: this.cleanDatabaseId(parentId) } })
    });
  },

  // Hata 11: contentChanged parametresi — sadece içerik değiştiyse blok güncellemesi yapılır
  async syncTopic(token, defaultParentId, topic, schemaProperties = {}, areaMapping = {}, umbrellaParentId = null, contentChanged = true, parentPageId = null, desiredParentType = "page") {
    if (!token) return null;

    // Determine target parent (check if area is mapped to a specific Teamspace / Parent Page or Database)
    let targetParentId = defaultParentId;
    let isDatabase = true;

    if (topic.notionPageId) {
      const page = await this.checked(`${NOTION_BASE_URL}/pages/${topic.notionPageId}`, { headers: this.getHeaders(token) });
      isDatabase = page.parent?.type === "database_id";
      targetParentId = page.parent?.database_id || page.parent?.page_id;
      if (parentPageId && this.cleanDatabaseId(parentPageId) !== this.cleanDatabaseId(targetParentId)) {
        await this.movePage(token, topic.notionPageId, parentPageId, desiredParentType);
        targetParentId = parentPageId;
        isDatabase = desiredParentType === "database";
      }
    } else if (parentPageId) {
      targetParentId = this.cleanDatabaseId(parentPageId);
      isDatabase = false;
    } else if (defaultParentId) {
      const resolved = await this.resolveDatabaseId(token, defaultParentId);
      targetParentId = resolved.databaseId;
      isDatabase = !resolved.isPage;
      schemaProperties = resolved.properties;
    } else if (topic.category && areaMapping[topic.category]) {
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

    if (!targetParentId) throw new Error("Notion hedef sayfası bulunamadı.");

    if (isDatabase) {
      const db = await this.resolveDatabaseId(token, targetParentId);
      schemaProperties = db.properties;
    }
    try {
      if (topic.notionPageId) {
        // Hata 11: contentChanged'i updatePage'e ilet
        return await this.updatePage(token, topic.notionPageId, topic, isDatabase, schemaProperties, contentChanged);
      } else {
        return await this.createPage(token, targetParentId, topic, isDatabase, schemaProperties);
      }
    } catch (e) {
      console.warn("Notion senkronizasyon hatası:", e);
      throw e;
    }
  },

  async queryDatabase(token, rawDatabaseId) {
    const databaseId = this.cleanDatabaseId(rawDatabaseId);
    let allPages = [];
    let hasMore = true;
    let nextCursor = undefined;

    while (hasMore) {
      const res = await this.request(`${NOTION_BASE_URL}/databases/${databaseId}/query`, {
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
