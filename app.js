const STATUS = { todo: "Başlamadım", learning: "Öğreniyorum", done: "Öğrendim" };
const STATUS_ORDER = { todo: 0, learning: 1, done: 2 };

const ROADMAP_VERSION = 3;
const starterTopics = NOTMONK_ROADMAP.map((topic, index) => ({ ...topic, id: crypto.randomUUID(), status: "todo", updatedAt: Date.now() - index * 1000 }));
const DEFAULT_CATEGORIES = [...NOTMONK_CATEGORIES];

const state = {
  topics: [], categories: [], categoryMetadata: {}, areaMapping: {},
  category: "Tümü", status: "all", query: "", sort: "updatedAt-desc",
  theme: "dark", page: 1, pageSize: 10, draggedId: null,
  activeTab: "modules", selectedCategory: null,
  notionToken: "", notionDbId: "", notionAutoSync: true,
  notionConnected: false, notionDbTitle: "",
  umbrellaPageId: ""
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const dialog = $("#topic-dialog");
const notionDialog = $("#notion-dialog");
const newCatDialog = $("#new-category-dialog");
const avatarDialog = $("#area-avatar-dialog");
let isEditorDirty = false;
let isSyncingNotion = false;

let currentAvatarTarget = null;
let tempAvatarData = { icon: "📁", iconType: "emoji", iconUrl: "" };
let pendingNewCategoryAvatar = { icon: "📁", iconType: "emoji", iconUrl: "" };

function optimizeAvatarImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Storage ──────────────────────────────────────────────────────────────────
const storageGet = key => new Promise(resolve => {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.get(key, resolve);
  const keys = Array.isArray(key) ? key : [key], result = {};
  keys.forEach(k => { const v = localStorage.getItem(k); if (v !== null) result[k] = JSON.parse(v); });
  resolve(result);
});
const storageSet = value => new Promise(resolve => {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.set(value, resolve);
  Object.entries(value).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  resolve();
});
const save = () => storageSet({
  topics: state.topics,
  categories: state.categories,
  categoryMetadata: state.categoryMetadata,
  areaMapping: state.areaMapping,
  umbrellaPageId: state.umbrellaPageId
});
const savePreferences = () => storageSet({ preferences: { category: state.category, status: state.status, sort: state.sort, theme: state.theme, roadmapVersion: ROADMAP_VERSION } });
const saveNotionStorage = () => storageSet({ notionConfig: { token: state.notionToken, dbId: state.notionDbId, autoSync: state.notionAutoSync, umbrellaPageId: state.umbrellaPageId } });

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const saved = await storageGet(["topics", "preferences", "categories", "notionConfig", "categoryMetadata", "areaMapping", "umbrellaPageId"]);
  const isDefaultDemoCategory = cat => typeof NOTMONK_CATEGORIES !== "undefined" && NOTMONK_CATEGORIES.includes(cat);
  const hasNotion = Boolean(saved.notionConfig?.token || (saved.areaMapping && Object.keys(saved.areaMapping).length > 0));

  state.categoryMetadata = saved.categoryMetadata || {};
  state.areaMapping = saved.areaMapping || {};
  state.umbrellaPageId = saved.notionConfig?.umbrellaPageId || saved.umbrellaPageId || "";

  if (hasNotion) {
    // If Notion is configured or has areas, do NOT install the demo cybersecurity roadmap!
    state.categories = (Array.isArray(saved.categories) ? saved.categories : [])
      .filter(c => !isDefaultDemoCategory(c) && !(c || "").toLocaleLowerCase("tr").includes("notmonk"));
    state.topics = (Array.isArray(saved.topics) ? saved.topics : [])
      .filter(t => !isDefaultDemoCategory(t.category) && !(t.category || "").toLocaleLowerCase("tr").includes("notmonk"));
  } else {
    const installRoadmap = saved.preferences?.roadmapVersion !== ROADMAP_VERSION;
    state.topics = (installRoadmap ? starterTopics : (Array.isArray(saved.topics) ? saved.topics : starterTopics))
      .map(t => ({ ...t, status: ["practiced", "mastered"].includes(t.status) ? "done" : t.status }));
    state.categories = installRoadmap ? [...DEFAULT_CATEGORIES] : (Array.isArray(saved.categories) ? saved.categories : [...DEFAULT_CATEGORIES]);
  }

  state.topics.forEach(t => {
    if (t.category && !(t.category).toLocaleLowerCase("tr").includes("notmonk") && !state.categories.includes(t.category)) {
      state.categories.push(t.category);
    }
  });
  Object.assign(state, saved.preferences || {});
  state.activeTab = "modules";
  state.selectedCategory = null;
  
  if (saved.notionConfig) {
    state.notionToken = saved.notionConfig.token || "";
    state.notionDbId = saved.notionConfig.dbId || "";
    state.notionAutoSync = saved.notionConfig.autoSync !== undefined ? Boolean(saved.notionConfig.autoSync) : true;
    if (!state.umbrellaPageId) {
      state.umbrellaPageId = saved.notionConfig.umbrellaPageId || "";
    }
  }

  if (hasNotion || !saved.topics || !saved.categories) { await save(); await savePreferences(); }
  bindEvents();
  bindCategoryEvents();
  bindNotionEvents();
  bindEnhancements();
  bindListEnhancements();
  applyTheme();
  switchTab("modules");
  renderStats();
  checkNotionStatusBackground();
  syncUnmappedCategoriesToNotion();

  // ── Canlı Gerçek Zamanlı Senkronizasyon (Anlık İki Yönlü) ──
  if (state.notionToken) {
    autoSyncFromNotion({ fastOnly: true });
  }

  window.addEventListener("focus", () => {
    if (state.notionToken && !isEditorDirty && !isSyncingNotion) {
      autoSyncFromNotion({ fastOnly: true });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.notionToken && !isEditorDirty && !isSyncingNotion) {
      autoSyncFromNotion({ fastOnly: true });
    }
  });

  // Arka plan otomatik heartbeat: Sekme etkinken her 4 saniyede bir sessizce Notion'ı yoklar
  setInterval(() => {
    if (state.notionToken && !isEditorDirty && !isSyncingNotion) {
      const isVisible = document.visibilityState === "visible";
      if (isVisible) {
        autoSyncFromNotion({ fastOnly: true });
      }
    }
  }, 4000);
}

// ── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  const openFormBtn = $("#open-form");
  if (openFormBtn) openFormBtn.onclick = () => openForm();
  const emptyAdd = $("#empty-add");
  if (emptyAdd) emptyAdd.onclick = () => openForm();
  const addTopicBtn = $("#add-topic-btn");
  if (addTopicBtn) addTopicBtn.onclick = () => openForm();
  $("#tab-modules").onclick = () => switchTab("modules");
  $("#tab-today").onclick = () => switchTab("today");
  const backBtn = $("#back-to-modules");
  if (backBtn) backBtn.onclick = () => goBackToModules();
  const switchToAllBtn = $("#switch-to-all-btn");
  if (switchToAllBtn) switchToAllBtn.onclick = () => goBackToModules();
  $("#topic-form").onsubmit = saveForm;
  $("#delete-topic").onclick = deleteCurrent;
  
  // Rich Editor Integration
  if (typeof RichEditor !== "undefined") {
    RichEditor.init();
  }

  const notesEditor = $("#notes-editor");
  if (notesEditor) {
    notesEditor.addEventListener("rich-change", () => {
      const text = typeof RichEditor !== "undefined" ? RichEditor.getPlainText() : "";
      $("#notes").value = typeof RichEditor !== "undefined" ? RichEditor.getHTML() : "";
      $("#note-count").textContent = text.length;
      markDirty();
    });
  }

  $("#notes").oninput = e => { $("#note-count").textContent = e.target.value.length; markDirty(); };
  ["#title", "#category", "#resource"].forEach(s => $(s).addEventListener("input", markDirty));
  $$('[data-sort]').forEach(b => b.onclick = () => toggleSort(b.dataset.sort));
  document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "n" && !dialog.open && !notionDialog?.open && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault(); openForm();
    }
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  $("#tab-modules").classList.toggle("active", tab === "modules");
  $("#tab-today").classList.toggle("active", tab === "today");

  if (tab === "today") {
    state.selectedCategory = null;
    $("#modules-view").classList.add("hidden");
    $("#topics-view").classList.remove("hidden");
    $("#back-to-modules").classList.add("hidden");
    $("#page-section-code").textContent = "GÜNLÜK ODAK";
    $("#page-title").textContent = "Bugün Çalışılacaklar";
    state.page = 1;
    renderTable();
  } else {
    if (state.selectedCategory) {
      $("#modules-view").classList.add("hidden");
      $("#topics-view").classList.remove("hidden");
      $("#back-to-modules").classList.remove("hidden");
      $("#page-section-code").textContent = "ALAN MODÜLÜ";
      $("#page-title").textContent = state.selectedCategory;
      renderTable();
    } else {
      $("#modules-view").classList.remove("hidden");
      $("#topics-view").classList.add("hidden");
      $("#back-to-modules").classList.add("hidden");
      $("#page-section-code").textContent = "MÜFREDAT & ALANLAR";
      $("#page-title").textContent = "Çalışma Alanları";
      renderModules();
    }
  }
}

function updatePageTitleAvatar() {
  const titleAvatar = $("#page-title-avatar");
  if (!titleAvatar) return;
  if (state.selectedCategory) {
    titleAvatar.classList.remove("hidden");
    const meta = state.categoryMetadata?.[state.selectedCategory];
    if (meta?.iconType === "image" && meta.iconUrl) {
      titleAvatar.innerHTML = `<img src="${meta.iconUrl}" alt="${state.selectedCategory}">`;
    } else if (meta?.iconType === "emoji" && meta.icon) {
      titleAvatar.innerHTML = `<span>${meta.icon}</span>`;
    } else {
      titleAvatar.innerHTML = `<span>📁</span>`;
    }
  } else {
    titleAvatar.classList.add("hidden");
  }
}

function openCategory(categoryName) {
  state.selectedCategory = categoryName;
  state.activeTab = "modules";
  state.page = 1;
  $("#tab-today").classList.remove("active");
  $("#tab-modules").classList.add("active");
  $("#modules-view").classList.add("hidden");
  $("#topics-view").classList.remove("hidden");
  $("#back-to-modules").classList.remove("hidden");
  $("#page-section-code").textContent = "ALAN MODÜLÜ";
  $("#page-title").textContent = categoryName;
  updatePageTitleAvatar();
  renderTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBackToModules() {
  state.selectedCategory = null;
  state.activeTab = "modules";
  $("#tab-today").classList.remove("active");
  $("#tab-modules").classList.add("active");
  $("#modules-view").classList.remove("hidden");
  $("#topics-view").classList.add("hidden");
  $("#back-to-modules").classList.add("hidden");
  $("#page-section-code").textContent = "MÜFREDAT & ALANLAR";
  $("#page-title").textContent = "Çalışma Alanları";
  updatePageTitleAvatar();
  renderModules();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindListEnhancements() {
  const catSel = $("#category-select");
  if (catSel) catSel.onchange = e => { state.category = e.target.value; state.page = 1; renderTable(); savePreferences(); };
  const statFil = $("#status-filter");
  if (statFil) statFil.onchange = e => { state.status = e.target.value; state.page = 1; renderTable(); savePreferences(); };
  const sortSel = $("#sort-select");
  if (sortSel) sortSel.onchange = e => { state.sort = e.target.value; renderTable(); savePreferences(); };
  $("#search").oninput = e => { state.query = e.target.value.trim().toLocaleLowerCase("tr"); state.page = 1; renderTable(); };
  $("#clear-filters").onclick = () => {
    state.query = "";
    state.status = "all";
    $("#search").value = "";
    $("#status-filter").value = "all";
    renderTable();
    savePreferences();
  };
}

function openAvatarDialog(categoryName) {
  currentAvatarTarget = categoryName;
  const isNew = categoryName === "__new__";
  const titleEl = $("#avatar-dialog-title");
  const subEl = $("#avatar-dialog-sub");
  if (titleEl) titleEl.textContent = isNew ? "Yeni Alan Profili" : `${categoryName} Profili`;
  if (subEl) subEl.textContent = isNew ? "Oluşturulacak alan için profil fotoğrafı veya simge seç." : "Bu alan için profil fotoğrafı veya simge belirle.";

  const currentMeta = isNew ? pendingNewCategoryAvatar : (state.categoryMetadata?.[categoryName] || { icon: "📁", iconType: "emoji", iconUrl: "" });
  tempAvatarData = { ...currentMeta };

  renderAvatarPreview();
  if (avatarDialog && typeof avatarDialog.showModal === "function") avatarDialog.showModal();
}

function renderAvatarPreview() {
  const preview = $("#avatar-big-preview");
  if (!preview) return;
  if (tempAvatarData.iconType === "image" && tempAvatarData.iconUrl) {
    preview.innerHTML = `<img src="${tempAvatarData.iconUrl}" alt="Avatar">`;
  } else if (tempAvatarData.iconType === "emoji" && tempAvatarData.icon) {
    preview.innerHTML = `<span>${tempAvatarData.icon}</span>`;
  } else {
    preview.innerHTML = `<span>📁</span>`;
  }
}

function bindAvatarEvents() {
  const closeBtn = $("#close-avatar-dialog");
  const cancelBtn = $("#cancel-avatar-dialog");
  const saveBtn = $("#save-avatar-btn");
  const fileInput = $("#avatar-file-input");
  const uploadBtn = $("#avatar-upload-btn");
  const removeBtn = $("#avatar-remove-btn");
  const urlInput = $("#avatar-url-input");
  const applyUrlBtn = $("#avatar-apply-url-btn");

  if (closeBtn) closeBtn.onclick = () => avatarDialog?.close();
  if (cancelBtn) cancelBtn.onclick = () => avatarDialog?.close();
  if (avatarDialog) {
    avatarDialog.oncancel = (e) => {
      e.preventDefault();
      avatarDialog.close();
    };
  }

  if (uploadBtn && fileInput) {
    uploadBtn.onclick = () => fileInput.click();
  }

  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await optimizeAvatarImage(file);
        tempAvatarData = { icon: "", iconType: "image", iconUrl: dataUrl };
        renderAvatarPreview();
      } catch (err) {
        alert("Görsel yüklenirken bir hata oluştu.");
      }
      fileInput.value = "";
    };
  }

  if (applyUrlBtn && urlInput) {
    applyUrlBtn.onclick = () => {
      const val = urlInput.value.trim();
      if (!val) return;
      tempAvatarData = { icon: "", iconType: "image", iconUrl: val };
      renderAvatarPreview();
      urlInput.value = "";
    };
  }

  if (removeBtn) {
    removeBtn.onclick = () => {
      tempAvatarData = { icon: "", iconType: "", iconUrl: "" };
      renderAvatarPreview();
    };
  }

  document.querySelectorAll(".avatar-emoji-btn").forEach(btn => {
    btn.onclick = () => {
      const emoji = btn.textContent.trim();
      tempAvatarData = { icon: emoji, iconType: "emoji", iconUrl: "" };
      renderAvatarPreview();
    };
  });

  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!currentAvatarTarget) return;

      if (currentAvatarTarget === "__new__") {
        pendingNewCategoryAvatar = { ...tempAvatarData };
        const previewSpan = $("#new-category-avatar-preview");
        if (previewSpan) {
          if (pendingNewCategoryAvatar.iconType === "image" && pendingNewCategoryAvatar.iconUrl) {
            previewSpan.innerHTML = `<img src="${pendingNewCategoryAvatar.iconUrl}" alt="Avatar">`;
          } else if (pendingNewCategoryAvatar.iconType === "emoji" && pendingNewCategoryAvatar.icon) {
            previewSpan.textContent = pendingNewCategoryAvatar.icon;
          } else {
            previewSpan.textContent = "📁";
          }
        }
        avatarDialog?.close();
        return;
      }

      const cat = currentAvatarTarget;
      if (!state.categoryMetadata) state.categoryMetadata = {};
      state.categoryMetadata[cat] = {
        ...(state.categoryMetadata[cat] || {}),
        icon: tempAvatarData.icon || "",
        iconType: tempAvatarData.iconType || "",
        iconUrl: tempAvatarData.iconUrl || ""
      };

      await save();
      renderModules();
      updatePageTitleAvatar();

      // Sync to Notion if connected and mapped
      if (state.notionToken && state.areaMapping?.[cat]?.id) {
        NotionAPI.updatePageIcon(state.notionToken, state.areaMapping[cat].id, tempAvatarData);
      }

      avatarDialog?.close();
    };
  }

  const newCatAvatarBtn = $("#new-category-avatar-btn");
  if (newCatAvatarBtn) {
    newCatAvatarBtn.onclick = () => openAvatarDialog("__new__");
  }

  const titleAvatar = $("#page-title-avatar");
  if (titleAvatar) {
    titleAvatar.onclick = () => {
      if (state.selectedCategory) openAvatarDialog(state.selectedCategory);
    };
  }
}

function bindEnhancements() {
  $("#close-dialog").onclick = requestEditorClose;
  $("#cancel-dialog").onclick = requestEditorClose;
  dialog.oncancel = e => {
    e.preventDefault();
    requestEditorClose();
  };
  $("#theme-toggle").onclick = () => { state.theme = state.theme === "pink" ? "dark" : "pink"; applyTheme(); savePreferences(); };
  bindAvatarEvents();
  const expandBtn = $("#expand-tab");
  if (expandBtn) {
    const isPopup = window.outerWidth < 800 && window.outerHeight < 700;
    if (!isPopup) {
      expandBtn.classList.add("hidden");
    } else {
      expandBtn.onclick = () => {
        if (globalThis.chrome?.tabs) chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
        else window.open(chrome.runtime.getURL("index.html"), "_blank");
      };
    }
  }
}

// ── Editor ───────────────────────────────────────────────────────────────────
function openForm(topic = null) {
  $("#topic-form").reset();
  $("#edit-id").value = topic?.id || "";
  $("#dialog-title").textContent = topic ? "Konuyu düzenle" : "Yeni konu";
  $("#delete-topic").classList.toggle("hidden", !topic);

  // When inside a specific category, auto-assign it and hide the category field completely
  const isInsideCategory = Boolean(state.selectedCategory);
  const targetCategory = state.selectedCategory || topic?.category || state.categories[0];

  const categoryField = $(".category-field");
  const toggleCatManager = $("#toggle-category-manager");
  const categoryManager = $("#category-manager");

  if (isInsideCategory) {
    if (categoryField) categoryField.classList.add("hidden");
    const catSelect = $("#category");
    if (catSelect) {
      if (![...catSelect.options].some(o => o.value === targetCategory)) {
        catSelect.add(new Option(targetCategory, targetCategory));
      }
      catSelect.value = targetCategory;
    }
  } else {
    if (categoryField) categoryField.classList.remove("hidden");
    if (categoryManager) categoryManager.classList.remove("open");
    if (toggleCatManager) toggleCatManager.setAttribute("aria-expanded", "false");
    renderEditorCategories(targetCategory);
  }

  if (topic) {
    $("#title").value = topic.title;
    const initialNotes = topic.notes || "";
    $("#notes").value = initialNotes;
    if (typeof RichEditor !== "undefined") {
      RichEditor.setHTML(initialNotes);
    }
    $("#resource").value = topic.resource || "";
  } else {
    $("#notes").value = "";
    if (typeof RichEditor !== "undefined") {
      RichEditor.setHTML("");
    }
  }

  const notionLinkEl = $("#editor-notion-link");
  if (notionLinkEl) {
    if (topic?.notionUrl) {
      notionLinkEl.href = topic.notionUrl;
      notionLinkEl.classList.remove("hidden");
    } else {
      notionLinkEl.classList.add("hidden");
    }
  }

  dialog.dataset.status = topic?.status || "todo";
  renderEditorStatus();
  const currentTextLen = typeof RichEditor !== "undefined" ? RichEditor.getPlainText().length : $("#notes").value.length;
  $("#note-count").textContent = currentTextLen;
  isEditorDirty = false;
  dialog.showModal();
  $("#title").focus();

  // Arka planda Notion'daki en güncel blokları sessizce kontrol et
  if (topic?.notionPageId && state.notionToken) {
    NotionAPI.fetchPageBlocksHTML(state.notionToken, topic.notionPageId).then(freshHtml => {
      if (freshHtml && !isEditorDirty && dialog.open && $("#edit-id").value === topic.id) {
        if (freshHtml !== topic.notes) {
          topic.notes = freshHtml;
          if (typeof RichEditor !== "undefined") {
            RichEditor.setHTML(freshHtml);
          }
          $("#notes").value = freshHtml;
          $("#note-count").textContent = typeof RichEditor !== "undefined"
            ? RichEditor.getPlainText().length
            : freshHtml.length;
          save();
        }
      }
    }).catch(e => console.warn("[NotMonk] Canlı blok kontrolü:", e));
  }
}

function markDirty() { isEditorDirty = true; $("#save-hint").textContent = "Kaydedilmemiş değişiklikler"; }

function renderEditorStatus() {
  const container = $("#editor-status-buttons");
  container.replaceChildren();
  Object.entries(STATUS).forEach(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `status-button status-${value}${dialog.dataset.status === value ? " active" : ""}`;
    button.textContent = label;
    button.onclick = () => { dialog.dataset.status = value; renderEditorStatus(); markDirty(); };
    container.append(button);
  });
}

async function saveForm(e) {
  e.preventDefault();
  const id = $("#edit-id").value;
  const existing = id ? state.topics.find(t => t.id === id) : null;
  const notesContent = typeof RichEditor !== "undefined" ? RichEditor.getHTML() : $("#notes").value.trim();
  $("#notes").value = notesContent;
  const topic = {
    id: id || crypto.randomUUID(),
    title: $("#title").value.trim(),
    category: $("#category").value,
    status: dialog.dataset.status || "todo",
    notes: notesContent,
    resource: $("#resource").value.trim(),
    today: existing ? existing.today : false,
    notionPageId: existing?.notionPageId || null,
    notionUrl: existing?.notionUrl || null,
    updatedAt: Date.now()
  };
  state.topics = id ? state.topics.map(t => t.id === id ? topic : t) : [topic, ...state.topics];
  await save();
  isEditorDirty = false;
  $("#save-hint").textContent = "Kaydedildi";
  dialog.close();
  render();

  if (state.notionAutoSync && state.notionToken) {
    syncTopicToNotion(topic);
  }
}

async function deleteCurrent() {
  const id = $("#edit-id").value;
  if (!id) return;
  const accepted = await askConfirmation({ title: "Konuyu sil?", message: "Bu konu ve içindeki bütün notlar kalıcı olarak silinecek.", accept: "Evet, sil", danger: true });
  if (!accepted) return;
  const existing = state.topics.find(t => t.id === id);
  state.topics = state.topics.filter(t => t.id !== id);
  await save();
  isEditorDirty = false;
  dialog.close();
  render();

  if (state.notionToken && existing?.notionPageId) {
    NotionAPI.archivePage(state.notionToken, existing.notionPageId);
  }
}

async function requestEditorClose() {
  if (!isEditorDirty) { dialog.close(); return; }
  const accepted = await askConfirmation({ title: "Değişikliklerden vazgeç?", message: "Kaydetmediğin düzenlemeler silinecek.", accept: "Vazgeç", danger: false });
  if (accepted) { isEditorDirty = false; dialog.close(); }
}

// ── Categories ────────────────────────────────────────────────────────────────
function bindCategoryEvents() {
  const toggleBtn = $("#toggle-category-manager");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const manager = $("#category-manager"), open = manager.classList.toggle("open");
      toggleBtn.setAttribute("aria-expanded", String(open));
      if (open) setTimeout(() => $("#new-category").focus(), 180);
    };
  }
  const addCatBtn = $("#add-category");
  if (addCatBtn) addCatBtn.onclick = addCategory;
  const newCatInput = $("#new-category");
  if (newCatInput) {
    newCatInput.oninput = e => e.target.setCustomValidity("");
    newCatInput.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } };
  }

  // Dedicated Mini Modal for New Module/Category
  const closeNewCatBtn = $("#close-new-category-dialog");
  if (closeNewCatBtn) closeNewCatBtn.onclick = () => newCatDialog?.close();
  const cancelNewCatBtn = $("#cancel-new-category");
  if (cancelNewCatBtn) cancelNewCatBtn.onclick = () => newCatDialog?.close();
  const submitNewCatBtn = $("#submit-new-category");
  if (submitNewCatBtn) submitNewCatBtn.onclick = submitNewCategory;
  const modalCatInput = $("#modal-category-input");
  if (modalCatInput) {
    modalCatInput.oninput = e => e.target.setCustomValidity("");
    modalCatInput.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); submitNewCategory(); } };
  }
}

function openNewCategoryDialog() {
  if (!newCatDialog) return;
  const input = $("#modal-category-input");
  if (input) {
    input.value = "";
    input.setCustomValidity("");
  }
  pendingNewCategoryAvatar = { icon: "📁", iconType: "emoji", iconUrl: "" };
  const previewSpan = $("#new-category-avatar-preview");
  if (previewSpan) previewSpan.textContent = "📁";
  newCatDialog.showModal();
  if (input) setTimeout(() => input.focus(), 100);
}

function showToast(msg, type = "info") {
  let toast = $("#notmonk-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "notmonk-toast";
    toast.className = "notmonk-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `notmonk-toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = "notmonk-toast";
  }, 4500);
}

async function ensureNotionArea(name, iconData = null) {
  if (!state.notionToken || !name) return null;
  if (state.areaMapping[name]?.id) return state.areaMapping[name];

  try {
    let parentForArea = state.umbrellaPageId;
    if (!parentForArea) {
      parentForArea = await NotionAPI.getOrFindUmbrellaPageId(state.notionToken);
      if (parentForArea) {
        state.umbrellaPageId = parentForArea;
        await save();
        await saveNotionStorage();
      }
    }
    if (!parentForArea && state.notionDbId) {
      parentForArea = state.notionDbId;
    }
    if (!parentForArea) {
      console.warn("[NotMonk] NotMonk çatı sayfası ID'si bulunamadı.");
      showToast("Notion 'NotMonk' ana sayfası bulunamadı. Lütfen Notion bağlantını kontrol et.", "error");
      return null;
    }

    const icon = iconData?.icon || "📁";
    showToast(`"${name}" alanı Notion'a aktarılıyor...`);
    const newArea = await NotionAPI.createAreaPage(state.notionToken, parentForArea, name, icon);
    if (newArea) {
      state.areaMapping[name] = { id: newArea.id, type: "page" };
      if (iconData?.iconType === "image" && iconData?.iconUrl) {
        await NotionAPI.updatePageIcon(state.notionToken, newArea.id, iconData);
      }
      await save();
      showToast(`✓ "${name}" alanı Notion'da oluşturuldu!`, "success");
      return newArea;
    }
  } catch (err) {
    console.error("[NotMonk] Notion alan sayfası oluşturulamadı:", err);
    showToast(`✕ Notion'a aktarılamadı: ${err.message || "Bilinmeyen hata"}`, "error");
  }
  return null;
}

async function syncUnmappedCategoriesToNotion() {
  if (!state.notionToken) return;
  let umbrellaId = state.umbrellaPageId;
  if (!umbrellaId) {
    umbrellaId = await NotionAPI.getOrFindUmbrellaPageId(state.notionToken);
    if (umbrellaId) {
      state.umbrellaPageId = umbrellaId;
      await save();
      await saveNotionStorage();
    }
  }
  if (!umbrellaId && state.notionDbId) {
    umbrellaId = state.notionDbId;
  }
  if (!umbrellaId) return;

  for (const cat of state.categories) {
    if (cat.toLowerCase().includes("notmonk") || cat.toLowerCase() === "test") continue;
    if (!state.areaMapping[cat] || !state.areaMapping[cat].id) {
      const meta = state.categoryMetadata?.[cat] || {};
      await ensureNotionArea(cat, meta);
    }
  }
}

async function submitNewCategory() {
  const input = $("#modal-category-input");
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    input.setCustomValidity("Lütfen bir alan adı girin.");
    input.reportValidity();
    return;
  }
  if (state.categories.some(c => c.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) {
    input.setCustomValidity("Bu çalışma alanı zaten mevcut.");
    input.reportValidity();
    return;
  }
  input.setCustomValidity("");
  state.categories.push(name);
  if (!state.categoryMetadata) state.categoryMetadata = {};
  state.categoryMetadata[name] = { ...pendingNewCategoryAvatar };

  input.value = "";
  await save();
  renderCategories();
  renderModules();
  renderEditorCategories();
  newCatDialog?.close();

  // If Notion is connected, auto-create Area page in Notion inside NotMonk
  if (state.notionToken) {
    await ensureNotionArea(name, pendingNewCategoryAvatar);
  }
}

function renderEditorCategories(selected) {
  const select = $("#category");
  select.replaceChildren(...state.categories.map(c => new Option(c, c)));
  if (selected && state.categories.includes(selected)) select.value = selected;
  renderCategoryManager();
}

function renderCategoryManager() {
  const list = $("#category-list");
  $("#category-count").textContent = `${state.categories.length} alan`;
  list.replaceChildren(...state.categories.map(category => {
    const row = document.createElement("div");
    row.className = "category-item";
    const usage = state.topics.filter(t => t.category === category).length;
    row.innerHTML = `<div class="category-info"><i class="category-color"></i><span class="category-name"></span><span class="category-usage"></span></div><button type="button" aria-label="${category} alanını sil"></button>`;
    row.querySelector(".category-name").textContent = category;
    row.querySelector(".category-usage").textContent = usage ? `${usage} konu` : "boş";
    const btn = row.querySelector("button");
    btn.innerHTML = "×";
    btn.title = usage > 0 ? `${category} alanını ve konularını sil` : "Alanı sil";
    btn.onclick = () => removeCategory(category);
    return row;
  }));
}

async function addCategory() {
  const input = $("#new-category"), name = input.value.trim();
  if (!name) return;
  if (state.categories.some(c => c.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) {
    input.setCustomValidity("Bu alan zaten var."); input.reportValidity(); return;
  }
  input.setCustomValidity("");
  state.categories.push(name);
  input.value = "";
  await save();
  renderEditorCategories(name);
  renderCategories();
  renderModules();
  markDirty();

  if (state.notionToken) {
    await ensureNotionArea(name);
  }
}

async function removeCategory(category) {
  const usage = state.topics.filter(t => t.category === category).length;
  const confirmMsg = usage > 0
    ? `"${category}" alanı ve içindeki ${usage} konu NotMonk'tan silinecek. Emin misiniz?`
    : `"${category}" alanı kaldırılacak.`;
  const accepted = await askConfirmation({
    title: "Alanı sil?",
    message: confirmMsg,
    accept: "Alanı sil",
    danger: true
  });
  if (!accepted) return;
  const notionAreaId = state.areaMapping?.[category]?.id;
  state.categories = state.categories.filter(c => c !== category);
  state.topics = state.topics.filter(t => t.category !== category);
  if (state.categoryMetadata) delete state.categoryMetadata[category];
  if (state.areaMapping) delete state.areaMapping[category];
  await save();
  renderEditorCategories();
  renderCategories();
  renderModules();
  markDirty();

  if (state.notionToken && notionAreaId) {
    NotionAPI.archivePage(state.notionToken, notionAreaId);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderStats();
  renderCategories();
  syncControls();
  updatePageTitleAvatar();
  if (state.activeTab === "modules" && !state.selectedCategory) {
    $("#modules-view").classList.remove("hidden");
    $("#topics-view").classList.add("hidden");
    $("#back-to-modules").classList.add("hidden");
    $("#page-section-code").textContent = "MÜFREDAT & ALANLAR";
    $("#page-title").textContent = "Çalışma Alanları";
    renderModules();
  } else {
    $("#modules-view").classList.add("hidden");
    $("#topics-view").classList.remove("hidden");
    if (state.activeTab === "today") {
      $("#back-to-modules").classList.add("hidden");
      $("#page-section-code").textContent = "GÜNLÜK ODAK";
      $("#page-title").textContent = "Bugün Çalışılacaklar";
    } else {
      $("#back-to-modules").classList.remove("hidden");
      $("#page-section-code").textContent = "ALAN KONULARI";
      $("#page-title").textContent = state.selectedCategory || "Konular";
    }
    renderTable();
  }
}

function renderStats() {
  const todayCount = state.topics.filter(t => t.today).length;
  const badge = $("#today-count-badge");
  if (badge) badge.textContent = todayCount;
}

function renderModules() {
  const container = $("#modules-grid");
  if (!container) return;
  container.replaceChildren();

  // Filter out any notmonk entry
  const activeCategories = state.categories.filter(c => !c.toLowerCase().includes("notmonk"));

  if (activeCategories.length === 0) {
    const emptyNotice = document.createElement("div");
    emptyNotice.className = "empty-modules-notice";
    emptyNotice.innerHTML = `
      <div class="empty-notice-icon">📂</div>
      <h3>Henüz bir çalışma alanı açılmadı</h3>
      <p>Notion'daki <b>NotMonk</b> sayfana girip istediğin alanları (örn: <b>/page Siber Güvenlik</b>) alt sayfa olarak ekle ve ardından <b>"Notion'dan Konuları Çek"</b>e tıkla! Veya doğrudan aşağıdaki butondan yeni bir alan oluşturabilirsin.</p>
    `;
    container.append(emptyNotice);
  }

  activeCategories.forEach((cat, idx) => {
    const catTopics = state.topics.filter(t => t.category === cat);
    const total = catTopics.length;
    const done = catTopics.filter(t => t.status === "done").length;
    const todayCount = catTopics.filter(t => t.today).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    let statusText = "Başlanmadı";
    let statusClass = "status-todo";
    if (done === total && total > 0) {
      statusText = "Tamamlandı";
      statusClass = "status-done";
    } else if (done > 0) {
      statusText = `%${percent}`;
      statusClass = "status-learning";
    }

    const meta = state.categoryMetadata?.[cat];
    let iconHtml = `<button class="card-avatar-btn default" type="button" title="Profil Fotoğrafını Değiştir"><span class="card-index">${String(idx).padStart(2, "0")}</span><span class="avatar-hover-cam">📷</span></button>`;
    if (meta?.iconType === "emoji" && meta.icon) {
      iconHtml = `<button class="card-avatar-btn emoji" type="button" title="Profil Fotoğrafını Değiştir"><span>${meta.icon}</span><span class="avatar-hover-cam">📷</span></button>`;
    } else if (meta?.iconType === "image" && meta.iconUrl) {
      iconHtml = `<button class="card-avatar-btn img" type="button" title="Profil Fotoğrafını Değiştir"><img src="${meta.iconUrl}" alt="${cat}" loading="lazy" /><span class="avatar-hover-cam">📷</span></button>`;
    }

    const card = document.createElement("div");
    card.className = "module-card";
    card.style.setProperty("--i", idx);
    card.onclick = () => openCategory(cat);

    card.innerHTML = `
      <div class="card-top">
        <div class="card-head">
          <div class="card-head-left">
            ${iconHtml}
          </div>
          <div class="card-head-right">
            <span class="card-status-badge ${statusClass}">${statusText}</span>
            <button class="card-delete-btn" type="button" title="Alanı Sil" aria-label="Alanı Sil">✕</button>
          </div>
        </div>
        <h2 class="card-title"></h2>
      </div>
      <div class="card-bottom">
        <div class="card-progress-bar">
          <div class="card-progress-fill ${percent === 100 ? "done" : ""}" style="width: ${percent}%"></div>
        </div>
        <div class="card-footer">
          <span class="card-count">${done}/${total} konu</span>
          ${todayCount > 0 ? `<span class="card-today-badge">★ ${todayCount} bugün</span>` : `<span class="card-arrow">→</span>`}
        </div>
      </div>
    `;

    card.querySelector(".card-title").textContent = cat;
    const avatarBtn = card.querySelector(".card-avatar-btn");
    if (avatarBtn) {
      avatarBtn.onclick = (e) => {
        e.stopPropagation();
        openAvatarDialog(cat);
      };
    }
    const delBtn = card.querySelector(".card-delete-btn");
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        removeCategory(cat);
      };
    }
    container.append(card);
  });

  // Append Add Module Card
  const addCard = document.createElement("div");
  addCard.className = "add-module-card";
  addCard.innerHTML = `
    <span class="add-module-circle">＋</span>
    <span>Yeni Alan Ekle</span>
  `;
  addCard.onclick = () => openNewCategoryDialog();
  container.append(addCard);
}

async function toggleToday(topic) {
  topic.today = !topic.today;
  await save();
  render();
  if (state.notionAutoSync && state.notionToken) {
    syncTopicToNotion(topic);
  }
}

function renderCategories() {
  const select = $("#category-select"), current = state.category;
  if (!select) return;
  const cats = ["Tümü", ...state.categories];
  select.replaceChildren(...cats.map(c => new Option(c, c)));
  select.value = cats.includes(current) ? current : "Tümü";
  if (!cats.includes(current)) state.category = "Tümü";
}

function syncControls() {
  const catSel = $("#category-select");
  if (catSel) catSel.value = state.category;
  const statusFil = $("#status-filter");
  if (statusFil) statusFil.value = state.status;
  const sortSel = $("#sort-select");
  if (sortSel) sortSel.value = state.sort;
}

function getVisible() {
  const filtered = state.topics.filter(t => {
    const plainNotes = (t.notes || "").replace(/<[^>]*>/g, " ");
    const matchesQuery = !state.query || `${t.title} ${plainNotes}`.toLocaleLowerCase("tr").includes(state.query);
    const matchesStatus = state.status === "all" || t.status === state.status;
    
    if (state.activeTab === "today") {
      return t.today && matchesStatus && matchesQuery;
    }
    
    if (state.selectedCategory) {
      return (t.category || "").trim().toLocaleLowerCase("tr") === state.selectedCategory.trim().toLocaleLowerCase("tr") && matchesStatus && matchesQuery;
    }
    
    return matchesStatus && matchesQuery;
  });

  if (!state.sort || state.sort === "manual") return filtered;
  const [key, direction] = state.sort.split("-");
  const mult = direction === "desc" ? -1 : 1;

  return filtered.slice().sort((a, b) => {
    let valA = a[key];
    let valB = b[key];

    if (key === "updatedAt" || key === "createdAt") {
      const timeA = valA ? new Date(valA).getTime() : 0;
      const timeB = valB ? new Date(valB).getTime() : 0;
      return (timeA - timeB) * mult;
    }

    if (key === "status") {
      const rankA = STATUS_ORDER[valA] ?? 99;
      const rankB = STATUS_ORDER[valB] ?? 99;
      return (rankA - rankB) * mult;
    }

    if (typeof valA === "string" || typeof valB === "string") {
      return (valA || "").localeCompare(valB || "", "tr") * mult;
    }

    if (valA < valB) return -1 * mult;
    if (valA > valB) return 1 * mult;
    return 0;
  });
}

function updateSortHeaders() {
  const [currentKey, direction] = (state.sort || "").split("-");
  $$("th[data-sort]").forEach(th => {
    const key = th.dataset.sort;
    const icon = th.querySelector(".sort-icon");
    if (key === currentKey && state.sort !== "manual") {
      th.classList.add("active-sort");
      if (icon) icon.textContent = direction === "asc" ? "▲" : "▼";
    } else {
      th.classList.remove("active-sort");
      if (icon) icon.textContent = "↕";
    }
  });
}

function toggleSort(key) {
  const [current, direction] = (state.sort || "").split("-");
  state.sort = `${key}-${current === key && direction === "asc" ? "desc" : "asc"}`;
  const sortSel = $("#sort-select");
  if (sortSel) sortSel.value = state.sort;
  renderTable();
  savePreferences();
}

function renderTable() {
  const isTodayTab = state.activeTab === "today";
  const todayTopicsTotal = state.topics.filter(t => t.today).length;
  const currentCategoryTotal = state.selectedCategory
    ? state.topics.filter(t => (t.category || "").trim().toLocaleLowerCase("tr") === state.selectedCategory.trim().toLocaleLowerCase("tr")).length
    : state.topics.length;
  const visible = getVisible();
  const totalPages = Math.max(1, Math.ceil(visible.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const pageTopics = visible.slice(start, start + state.pageSize);

  const isGlobalEmpty = !isTodayTab && currentCategoryTotal === 0;
  const isTodayEmpty = isTodayTab && todayTopicsTotal === 0;
  const isNoResults = !isGlobalEmpty && !isTodayEmpty && visible.length === 0;

  $("#result-count").textContent = visible.length;
  $("#empty-state").classList.toggle("hidden", !isGlobalEmpty);
  const todayEmptyEl = $("#today-empty");
  if (todayEmptyEl) todayEmptyEl.classList.toggle("hidden", !isTodayEmpty);
  $("#no-results").classList.toggle("hidden", !isNoResults);
  $("#table-view").classList.toggle("hidden", isGlobalEmpty || isTodayEmpty || isNoResults);
  $("#topic-table-body").replaceChildren(...pageTopics.map((topic, index) => createRow(topic, start + index)));
  renderPagination(visible.length, totalPages);
  updateSortHeaders();
}

function statusButtons(topic) {
  const group = document.createElement("div");
  group.className = "status-buttons";
  Object.entries(STATUS).forEach(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `status-button status-${value}${topic.status === value ? " active" : ""}`;
    button.textContent = label;
    button.onclick = e => { e.stopPropagation(); updateStatus(topic, value); };
    group.append(button);
  });
  return group;
}

async function updateStatus(topic, status) {
  topic.status = status;
  await save();
  render();
  if (state.notionAutoSync && state.notionToken) {
    syncTopicToNotion(topic);
  }
}

function createRow(topic, index) {
  const tr = document.createElement("tr");
  tr.dataset.id = topic.id;
  tr.draggable = true;
  tr.innerHTML = `<td class="drag-cell"><button class="drag-handle" type="button" aria-label="${topic.title} konusunu taşı">⠿</button></td><td class="row-number"></td><td class="table-title"></td><td><span class="category-pill"></span></td><td></td><td class="table-notes"></td><td class="table-date"></td><td><button class="row-action">Düzenle</button></td>`;
  tr.children[1].textContent = String(index + 1).padStart(2, "0");

  const titleWrap = document.createElement("div");
  titleWrap.className = "title-wrap";

  const starBtn = document.createElement("button");
  starBtn.type = "button";
  starBtn.className = "star-btn" + (topic.today ? " active" : "");
  starBtn.title = topic.today ? "Bugünün odağından çıkar" : "Bugünün odağına ekle";
  starBtn.textContent = topic.today ? "★" : "☆";
  starBtn.onclick = e => {
    e.stopPropagation();
    toggleToday(topic);
  };
  titleWrap.append(starBtn);

  const titleSpan = document.createElement("span");
  titleSpan.textContent = topic.title;
  titleWrap.append(titleSpan);

  if (topic.resource) {
    const link = document.createElement("a");
    link.href = topic.resource;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "resource-icon-link";
    link.title = `Kaynağı aç: ${topic.resource}`;
    link.textContent = "🔗";
    link.onclick = e => e.stopPropagation();
    titleWrap.append(link);
  }

  if (topic.notionUrl) {
    const notionLink = document.createElement("a");
    notionLink.href = topic.notionUrl;
    notionLink.target = "_blank";
    notionLink.rel = "noopener noreferrer";
    notionLink.className = "notion-row-link";
    notionLink.title = "Notion sayfasını aç";
    notionLink.textContent = "N";
    notionLink.onclick = e => e.stopPropagation();
    titleWrap.append(notionLink);
  }

  tr.children[2].replaceChildren(titleWrap);

  tr.querySelector(".category-pill").textContent = topic.category;
  tr.children[4].append(statusButtons(topic));

  const plainNotes = (topic.notes || "").replace(/<[^>]*>/g, " ").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  const notesCell = tr.querySelector(".table-notes");
  notesCell.textContent = plainNotes || "—";
  if (plainNotes) notesCell.title = plainNotes;

  tr.querySelector(".table-date").textContent = new Date(topic.updatedAt).toLocaleDateString("tr-TR");
  tr.onclick = () => openForm(topic);
  tr.querySelector(".row-action").onclick = e => { e.stopPropagation(); openForm(topic); };
  tr.querySelector(".drag-handle").onclick = e => e.stopPropagation();
  tr.ondragstart = e => { state.draggedId = topic.id; tr.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; };
  tr.ondragend = () => { state.draggedId = null; tr.classList.remove("dragging"); $$("tr.drag-over").forEach(r => r.classList.remove("drag-over")); };
  tr.ondragover = e => { e.preventDefault(); if (state.draggedId !== topic.id) tr.classList.add("drag-over"); };
  tr.ondragleave = () => tr.classList.remove("drag-over");
  tr.ondrop = e => { e.preventDefault(); e.stopPropagation(); tr.classList.remove("drag-over"); moveTopic(state.draggedId, topic.id); };
  return tr;
}



async function moveTopic(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const sourceIndex = state.topics.findIndex(t => t.id === sourceId);
  const targetIndex = state.topics.findIndex(t => t.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = state.topics.splice(sourceIndex, 1);
  const adjustedTarget = state.topics.findIndex(t => t.id === targetId);
  state.topics.splice(adjustedTarget, 0, moved);
  state.sort = "manual";
  const sortSel = $("#sort-select");
  if (sortSel) sortSel.value = "manual";
  await save();
  await savePreferences();
  renderTable();
}

function renderPagination(total, totalPages) {
  const nav = $("#pagination");
  nav.classList.toggle("hidden", total <= state.pageSize);
  if (total <= state.pageSize) { nav.replaceChildren(); return; }
  const buttons = [];
  const previous = document.createElement("button");
  previous.textContent = "← Önceki"; previous.disabled = state.page === 1;
  previous.onclick = () => changePage(state.page - 1);
  buttons.push(previous);
  for (let page = 1; page <= totalPages; page++) {
    const button = document.createElement("button");
    button.textContent = page;
    button.className = page === state.page ? "active" : "";
    button.setAttribute("aria-label", `${page}. sayfa`);
    button.onclick = () => changePage(page);
    buttons.push(button);
  }
  const next = document.createElement("button");
  next.textContent = "Sonraki →"; next.disabled = state.page === totalPages;
  next.onclick = () => changePage(state.page + 1);
  buttons.push(next);
  nav.replaceChildren(...buttons);
}

function changePage(page) {
  state.page = page; renderTable();
  $("#table-view").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
function applyTheme() {
  document.body.dataset.theme = state.theme;
  const isPink = state.theme === "pink";
  const labelEl = $("#theme-label");
  if (labelEl) labelEl.textContent = isPink ? "Koyu tema" : "Pembe tema";
  $("#theme-toggle").classList.toggle("active", isPink);
}

function askConfirmation({ title, message, accept, danger }) {
  return new Promise(resolve => {
    const modal = $("#confirm-dialog"), acceptButton = $("#confirm-accept");
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    acceptButton.textContent = accept;
    acceptButton.className = danger ? "confirm-danger" : "confirm-primary";
    const finish = value => { modal.close(); resolve(value); };
    $("#confirm-cancel").onclick = () => finish(false);
    acceptButton.onclick = () => finish(true);
    modal.oncancel = e => { e.preventDefault(); finish(false); };
    modal.showModal();
  });
}

// ── Notion Integration ────────────────────────────────────────────────────────
function bindNotionEvents() {
  const toggleBtn = $("#notion-toggle-btn");
  if (toggleBtn) toggleBtn.onclick = openNotionDialog;
  const closeBtn = $("#close-notion-dialog");
  if (closeBtn) closeBtn.onclick = () => notionDialog?.close();
  const testBtn = $("#notion-test-btn");
  if (testBtn) testBtn.onclick = testNotionConnection;
  const saveBtn = $("#save-notion-config");
  if (saveBtn) saveBtn.onclick = saveNotionConfig;
  const pushBtn = $("#notion-push-all-btn");
  if (pushBtn) pushBtn.onclick = pushAllToNotion;
  const pullBtn = $("#notion-pull-all-btn");
  if (pullBtn) pullBtn.onclick = pullAllFromNotion;
  const quickSyncBtn = $("#quick-sync-btn");
  if (quickSyncBtn) {
    quickSyncBtn.onclick = async () => {
      quickSyncBtn.classList.add("spinning");
      await autoSyncFromNotion();
      setTimeout(() => quickSyncBtn.classList.remove("spinning"), 600);
      showToast("✓ Notion ile eşitlendi", "success");
    };
  }
  const purgeBtn = $("#purge-demo-btn");
  if (purgeBtn) {
    purgeBtn.onclick = async () => {
      const isDefaultDemoCategory = cat => typeof NOTMONK_CATEGORIES !== "undefined" && NOTMONK_CATEGORIES.includes(cat);
      state.categories = state.categories.filter(c => !isDefaultDemoCategory(c));
      state.topics = state.topics.filter(t => !isDefaultDemoCategory(t.category));
      await save();
      render();
      alert("Örnek şablon temizlendi. Artık yalnızca senin Notion alanların ve konuların görünüyor.");
    };
  }
}

function openNotionDialog() {
  $("#notion-token").value = state.notionToken || "";
  $("#notion-db-id").value = state.notionDbId || "";
  $("#notion-auto-sync").checked = Boolean(state.notionAutoSync);
  const msgEl = $("#notion-status-msg");
  if (msgEl) {
    msgEl.textContent = state.notionConnected ? `✓ Bağlı: ${state.notionDbTitle || "Veritabanı"}` : "";
    msgEl.className = `notion-status-msg ${state.notionConnected ? "success" : ""}`;
  }
  $("#notion-sync-progress").classList.add("hidden");
  notionDialog.showModal();
}

async function testNotionConnection() {
  const token = $("#notion-token").value.trim();
  const dbId = $("#notion-db-id").value.trim();
  const msgEl = $("#notion-status-msg");
  const testBtn = $("#notion-test-btn");

  if (!token) {
    msgEl.textContent = "Lütfen Notion API Token (secret) girin.";
    msgEl.className = "notion-status-msg error";
    return;
  }

  testBtn.disabled = true;
  msgEl.textContent = "Bağlantı ve Teamspace'ler taranıyor...";
  msgEl.className = "notion-status-msg";

  try {
    // 1. Search accessible workspaces, pages and teamspaces
    const { areas: discoveredAreas, umbrellaId } = await NotionAPI.searchWorkspaces(token);
    if (umbrellaId) {
      state.umbrellaPageId = umbrellaId;
    }

    if (discoveredAreas && discoveredAreas.length > 0) {
      discoveredAreas.forEach(area => {
        if (!area.title.toLowerCase().includes("notmonk") && !state.categories.includes(area.title)) {
          state.categories.push(area.title);
        }
        state.areaMapping[area.title] = { id: area.id, type: area.type };
        if (area.icon || area.iconUrl) {
          state.categoryMetadata[area.title] = {
            icon: area.icon,
            iconType: area.iconType,
            iconUrl: area.iconUrl,
            notionId: area.id
          };
        }
      });
      state.categories = state.categories.filter(c => !c.toLowerCase().includes("notmonk"));
      await save();
      renderModules();
    }

    // 2. Test connection
    const res = await NotionAPI.testConnection(token, dbId);
    if (res.success) {
      state.notionConnected = true;
      if (res.databaseId) {
        state.notionDbTitle = res.databaseTitle;
        state.notionDbId = res.databaseId;
        $("#notion-db-id").value = res.databaseId;
        msgEl.textContent = `✓ Başarılı: "${res.databaseTitle}" bağlandı (${discoveredAreas.length} Alan keşfedildi).`;
      } else if (umbrellaId) {
        state.notionDbTitle = "NotMonk";
        msgEl.textContent = `✓ Başarılı: "NotMonk" ana sayfası bağlandı (${discoveredAreas.length} Alan bulundu).`;
      } else if (discoveredAreas.length > 0) {
        state.notionDbTitle = `${discoveredAreas.length} Alan`;
        msgEl.textContent = `✓ Başarılı: ${discoveredAreas.length} Notion Alanı keşfedildi ve bağlandı.`;
      } else {
        state.notionDbTitle = "Notion Bağlantısı";
        msgEl.textContent = "✓ Bağlantı başarılı, ancak henüz NotMonk ile paylaşılmış sayfa bulunamadı. Notion'da NotMonk sayfasında ... > Connections > NotMonk seçildiğinden emin olun.";
      }
      msgEl.className = "notion-status-msg success";
      updateNotionStatusUI();
      syncUnmappedCategoriesToNotion();
    }
  } catch (err) {
    state.notionConnected = false;
    msgEl.textContent = `✕ Hata: ${err.message}`;
    msgEl.className = "notion-status-msg error";
    updateNotionStatusUI();
  } finally {
    testBtn.disabled = false;
  }
}

async function saveNotionConfig() {
  state.notionToken = $("#notion-token").value.trim();
  state.notionDbId = $("#notion-db-id").value.trim();
  state.notionAutoSync = $("#notion-auto-sync").checked;
  await saveNotionStorage();
  
  if (state.notionToken) {
    checkNotionStatusBackground();
  } else {
    state.notionConnected = false;
    updateNotionStatusUI();
  }
  
  notionDialog.close();
}

async function checkNotionStatusBackground() {
  if (!state.notionToken) {
    state.notionConnected = false;
    updateNotionStatusUI();
    return;
  }
  try {
    if (state.notionDbId) {
      const res = await NotionAPI.testConnection(state.notionToken, state.notionDbId);
      state.notionConnected = true;
      state.notionDbTitle = res.databaseTitle;
    } else {
      const { areas, umbrellaId } = await NotionAPI.searchWorkspaces(state.notionToken);
      if (umbrellaId) state.umbrellaPageId = umbrellaId;
      state.notionConnected = Boolean(umbrellaId || (areas && areas.length > 0));
      state.notionDbTitle = umbrellaId ? "NotMonk" : `${areas.length} Alan`;
    }
  } catch (e) {
    state.notionConnected = false;
  }
  updateNotionStatusUI();
}

function updateNotionStatusUI() {
  const dot = $("#notion-status-dot");
  if (!dot) return;
  dot.classList.toggle("connected", Boolean(state.notionConnected));
  dot.title = state.notionConnected
    ? `Notion Bağlı: ${state.notionDbTitle || "Veritabanı"}`
    : "Notion Bağlantısı Yapılandırılmadı / Hata";
}

async function syncTopicToNotion(topic) {
  if (!state.notionToken) return;
  try {
    if (!state.umbrellaPageId && !state.notionDbId) {
      state.umbrellaPageId = await NotionAPI.getOrFindUmbrellaPageId(state.notionToken);
      if (state.umbrellaPageId) await save();
    }
    const res = await NotionAPI.syncTopic(
      state.notionToken,
      state.notionDbId,
      topic,
      {},
      state.areaMapping,
      state.umbrellaPageId || state.notionDbId
    );
    if (res) {
      topic.notionPageId = res.notionPageId;
      topic.notionUrl = res.notionUrl;
      topic.notionLastEditedTime = Date.now();
      await save();
    }
  } catch (e) {
    console.warn(`Notion senkronizasyon hatası (${topic.title}):`, e);
  }
}

async function pushAllToNotion() {
  if (!state.notionToken) {
    alert("Önce Notion API Token girmelisin.");
    return;
  }

  const pushBtn = $("#notion-push-all-btn");
  const progressWrap = $("#notion-sync-progress");
  const progressBar = $("#notion-sync-bar");
  const progressText = $("#notion-sync-text");

  pushBtn.disabled = true;
  progressWrap.classList.remove("hidden");
  progressBar.style.width = "0%";

  const total = state.topics.length;
  let completed = 0;
  let errors = 0;

  for (const topic of state.topics) {
    progressText.textContent = `Aktarılıyor (${completed + 1}/${total}): ${topic.title}...`;
    try {
      const res = await NotionAPI.syncTopic(
        state.notionToken,
        state.notionDbId,
        topic,
        {},
        state.areaMapping,
        state.umbrellaPageId || state.notionDbId
      );
      if (res) {
        topic.notionPageId = res.notionPageId;
        topic.notionUrl = res.notionUrl;
      }
    } catch (e) {
      errors++;
      console.error("Toplu aktarım hatası:", topic.title, e);
    }
    completed++;
    const percent = Math.round((completed / total) * 100);
    progressBar.style.width = `${percent}%`;
    await new Promise(r => setTimeout(r, 250));
  }

  await save();
  renderTable();
  pushBtn.disabled = false;
  progressText.textContent = `✓ Tamamlandı! ${total - errors}/${total} konu Notion'a dosya olarak aktarıldı.`;
  setTimeout(() => progressWrap.classList.add("hidden"), 4000);
}

async function syncFromNotionInternal({ silent = false, fastOnly = false } = {}) {
  if (!state.notionToken) {
    if (!silent) alert("Önce Notion API Token girmelisin.");
    return;
  }
  if (isSyncingNotion) return;
  isSyncingNotion = true;

  const pullBtn = $("#notion-pull-all-btn");
  const quickSyncBtn = $("#quick-sync-btn");
  const statusDot = $("#notion-status-dot");
  const progressWrap = $("#notion-sync-progress");
  const progressText = $("#notion-sync-text");
  const progressBar = $("#notion-sync-bar");

  if (!silent) {
    if (pullBtn) pullBtn.disabled = true;
    if (progressWrap) progressWrap.classList.remove("hidden");
    if (progressBar) progressBar.style.width = "15%";
    if (progressText) progressText.textContent = "Notion Teamspace ve Konuları taranıyor...";
  } else {
    if (statusDot) statusDot.classList.add("syncing");
    if (quickSyncBtn) quickSyncBtn.classList.add("spinning");
  }

  try {
    // ── Hızlı Canlı Senkronizasyon (Son Değişiklikler) ──
    if (fastOnly && state.topics.length > 0) {
      const changes = await NotionAPI.fetchRecentWorkspaceChanges(
        state.notionToken,
        state.notionDbId,
        state.topics,
        state.areaMapping
      );

      if (changes) {
        let hasChanges = false;

        // 1. Silinen / Arşivlenen sayfaları NotMonk'tan da kaldır
        if (changes.archivedPageIds && changes.archivedPageIds.length > 0) {
          const initialLen = state.topics.length;
          state.topics = state.topics.filter(t => {
            const cleanId = NotionAPI.cleanDatabaseId(t.notionPageId);
            return !changes.archivedPageIds.includes(cleanId);
          });
          if (state.topics.length !== initialLen) hasChanges = true;
        }

        // 2. Güncellenen konuları NotMonk'a aktar
        if (changes.updatedTopics && changes.updatedTopics.length > 0) {
          for (const remote of changes.updatedTopics) {
            const existing = state.topics.find(t =>
              NotionAPI.cleanDatabaseId(t.notionPageId) === NotionAPI.cleanDatabaseId(remote.notionPageId)
            );
            if (existing) {
              existing.title = remote.title;
              existing.status = remote.status;
              existing.notes = remote.notes;
              existing.resource = remote.resource;
              existing.notionLastEditedTime = remote.notionLastEditedTime;
              existing.updatedAt = remote.updatedAt;
              hasChanges = true;

              // Eğer konu şu an düzenleme modalında açıksa ve kullanıcı henüz yazmıyorsa canlı güncelle!
              if (dialog.open && $("#edit-id").value === existing.id && !isEditorDirty) {
                $("#title").value = existing.title;
                dialog.dataset.status = existing.status;
                renderEditorStatus();
                if (typeof RichEditor !== "undefined") {
                  RichEditor.setHTML(existing.notes);
                }
                $("#notes").value = existing.notes;
                $("#note-count").textContent = typeof RichEditor !== "undefined"
                  ? RichEditor.getPlainText().length
                  : existing.notes.length;
              }
            }
          }
        }

        // 3. Notion'da yeni açılan konuları ekle
        if (changes.newTopics && changes.newTopics.length > 0) {
          for (const newTopic of changes.newTopics) {
            const exists = state.topics.some(t =>
              (t.id && t.id === newTopic.id) ||
              (t.notionPageId && NotionAPI.cleanDatabaseId(t.notionPageId) === NotionAPI.cleanDatabaseId(newTopic.notionPageId))
            );
            if (!exists) {
              state.topics.push(newTopic);
              if (newTopic.category && !state.categories.includes(newTopic.category)) {
                state.categories.push(newTopic.category);
              }
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          await save();
          render();
          showToast("✓ Notion'daki değişiklikler anında aktarıldı", "info");
        }
      }
      return;
    }

    // ── Tam Senkronizasyon (Full Workspace Crawl) ──
    await syncUnmappedCategoriesToNotion();
    const { areas, topics, umbrellaId } = await NotionAPI.fetchAllWorkspaceData(
      state.notionToken,
      state.notionDbId,
      msg => {
        if (!silent && progressText) {
          progressText.textContent = msg;
          if (progressBar) progressBar.style.width = "60%";
        }
      }
    );

    if (umbrellaId) {
      state.umbrellaPageId = umbrellaId;
      const validAreaTitles = new Set((areas || []).map(a => a.title.toLowerCase()));
      // Purge any orphan/phantom categories (e.g. from root) that don't exist under NotMonk umbrella and have 0 topics
      state.categories = state.categories.filter(cat => {
        const hasTopics = state.topics.some(t => t.category === cat);
        const existsInNotion = validAreaTitles.has(cat.toLowerCase());
        return hasTopics || existsInNotion;
      });
      // Purge orphan area mappings
      Object.keys(state.areaMapping).forEach(cat => {
        if (!validAreaTitles.has(cat.toLowerCase()) && !state.topics.some(t => t.category === cat)) {
          delete state.areaMapping[cat];
          delete state.categoryMetadata[cat];
        }
      });
    }
    // Always purge any notmonk entry
    state.categories = state.categories.filter(c => !c.toLowerCase().includes("notmonk"));
    state.topics = state.topics.filter(t => !t.category.toLowerCase().includes("notmonk"));
    delete state.areaMapping["NotMonk"];
    delete state.areaMapping["Notmonk"];
    delete state.categoryMetadata["NotMonk"];
    delete state.categoryMetadata["Notmonk"];

    const isDefaultDemoCategory = cat => typeof NOTMONK_CATEGORIES !== "undefined" && NOTMONK_CATEGORIES.includes(cat);
    state.categories = state.categories.filter(c => !isDefaultDemoCategory(c));
    state.topics = state.topics.filter(t => !isDefaultDemoCategory(t.category));

    // 1. Sync Areas / Teamspaces
    let areaCount = 0;
    if (areas && areas.length > 0) {
      areas.forEach(area => {
        if (!area.title.toLowerCase().includes("notmonk") && !state.categories.includes(area.title)) {
          state.categories.push(area.title);
        }
        state.areaMapping[area.title] = { id: area.id, type: area.type };
        if (area.icon || area.iconUrl) {
          state.categoryMetadata[area.title] = {
            icon: area.icon,
            iconType: area.iconType,
            iconUrl: area.iconUrl,
            notionId: area.id
          };
        }
        areaCount++;
      });
    }

    // 2. Sync Topics / Konular
    let addedCount = 0;
    let updatedCount = 0;

    if (topics && topics.length > 0) {
      topics.forEach(remote => {
        const existing = state.topics.find(t =>
          (t.notionPageId && t.notionPageId === remote.notionPageId) ||
          t.title.toLowerCase() === remote.title.toLowerCase()
        );

        if (existing) {
          existing.notionPageId = remote.notionPageId;
          existing.notionUrl = remote.notionUrl;
          if (remote.status) existing.status = remote.status;
          if (remote.category && remote.category !== "Genel") existing.category = remote.category;
          if (remote.today !== undefined) existing.today = remote.today;
          if (remote.resource) existing.resource = remote.resource;
          if (remote.notes && remote.notes.trim()) existing.notes = remote.notes;
          updatedCount++;
        } else {
          state.topics.push(remote);
          if (remote.category && !state.categories.includes(remote.category)) {
            state.categories.push(remote.category);
          }
          addedCount++;
        }
      });
    }

    await save();
    render();
    if (!silent) {
      if (progressBar) progressBar.style.width = "100%";
      if (progressText) progressText.textContent = `✓ Başarılı: ${areaCount} Teamspace/Alan senkronize edildi. (${addedCount} yeni konu, ${updatedCount} güncellendi)`;
      setTimeout(() => progressWrap?.classList.add("hidden"), 4000);
    }
  } catch (err) {
    console.warn("[NotMonk] Sync hatası:", err);
    if (!silent && progressText) {
      progressText.textContent = `✕ Hata: ${err.message}`;
    }
  } finally {
    isSyncingNotion = false;
    if (pullBtn) pullBtn.disabled = false;
    if (statusDot) statusDot.classList.remove("syncing");
    if (quickSyncBtn) quickSyncBtn.classList.remove("spinning");
  }
}

async function pullAllFromNotion() {
  return syncFromNotionInternal({ silent: false, fastOnly: false });
}

async function autoSyncFromNotion({ fastOnly = true } = {}) {
  return syncFromNotionInternal({ silent: true, fastOnly });
}

init();
