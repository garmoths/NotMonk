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

  async testConnection(token, rawDatabaseId) {
    const databaseId = this.cleanDatabaseId(rawDatabaseId);
    if (!token) throw new Error("Notion API anahtarı (Token) eksik.");
    if (!databaseId) throw new Error("Notion Veritabanı ID'si eksik.");

    const res = await fetch(`${NOTION_BASE_URL}/databases/${databaseId}`, {
      method: "GET",
      headers: this.getHeaders(token)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Geçersiz Notion API anahtarı (Unauthorized).");
      if (res.status === 404) throw new Error("Veritabanı bulunamadı. Lütfen Database ID'sini ve entegrasyonun veritabanına eklendiğini (Connections -> NotMonk) kontrol et.");
      throw new Error(err.message || `Notion API Hatası: ${res.status}`);
    }

    const data = await res.json();
    const titleObj = data.title?.[0]?.plain_text || data.title?.[0]?.text?.content || "İsimsiz Veritabanı";
    return {
      success: true,
      databaseId,
      databaseTitle: titleObj,
      properties: data.properties || {}
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

  buildChildrenBlocks(notes) {
    if (!notes || !notes.trim()) return [];
    const paragraphs = notes.split(/\n\n+/);
    return paragraphs.map(p => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{
          type: "text",
          text: { content: p.slice(0, 2000) } // Notion block char limit is 2000
        }]
      }
    }));
  },

  async createPage(token, rawDatabaseId, topic, schemaProperties = {}) {
    const databaseId = this.cleanDatabaseId(rawDatabaseId);
    const properties = this.buildProperties(topic, schemaProperties);
    const children = this.buildChildrenBlocks(topic.notes);

    const body = {
      parent: { database_id: databaseId },
      properties,
      children: children.length > 0 ? children : undefined
    };

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

  async updatePage(token, pageId, topic, schemaProperties = {}) {
    if (!pageId) throw new Error("Sayfa ID'si belirtilmemiş.");
    const properties = this.buildProperties(topic, schemaProperties);

    const res = await fetch(`${NOTION_BASE_URL}/pages/${pageId}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      body: JSON.stringify({ properties })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Sayfa güncellenemedi: ${res.status}`);
    }

    const data = await res.json();
    return {
      notionPageId: data.id,
      notionUrl: data.url
    };
  },

  async syncTopic(token, databaseId, topic, schemaProperties = {}) {
    if (!token || !databaseId) return null;
    try {
      if (topic.notionPageId) {
        return await this.updatePage(token, topic.notionPageId, topic, schemaProperties);
      } else {
        return await this.createPage(token, databaseId, topic, schemaProperties);
      }
    } catch (e) {
      console.warn("Notion senkronizasyon hatası:", e);
      // If page was deleted in Notion (404), recreate it
      if (e.message && (e.message.includes("Could not find page") || e.message.includes("404"))) {
        topic.notionPageId = null;
        topic.notionUrl = null;
        return await this.createPage(token, databaseId, topic, schemaProperties);
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
