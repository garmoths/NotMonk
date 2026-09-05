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
  notionToken: "", notionDbId: "", notionAutoSync: false,
  notionConnected: false, notionDbTitle: ""
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const dialog = $("#topic-dialog");
const notionDialog = $("#notion-dialog");
const newCatDialog = $("#new-category-dialog");
let isEditorDirty = false;

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
  areaMapping: state.areaMapping
});
const savePreferences = () => storageSet({ preferences: { category: state.category, status: state.status, sort: state.sort, theme: state.theme, roadmapVersion: ROADMAP_VERSION } });
const saveNotionStorage = () => storageSet({ notionConfig: { token: state.notionToken, dbId: state.notionDbId, autoSync: state.notionAutoSync } });

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const saved = await storageGet(["topics", "preferences", "categories", "notionConfig", "categoryMetadata", "areaMapping"]);
  const isDefaultDemoCategory = cat => typeof NOTMONK_CATEGORIES !== "undefined" && NOTMONK_CATEGORIES.includes(cat);
  const hasNotion = Boolean(saved.notionConfig?.token || (saved.areaMapping && Object.keys(saved.areaMapping).length > 0));

  state.categoryMetadata = saved.categoryMetadata || {};
  state.areaMapping = saved.areaMapping || {};

  if (hasNotion) {
    // If Notion is configured or has areas, do NOT install the demo cybersecurity roadmap!
    state.categories = (Array.isArray(saved.categories) ? saved.categories : []).filter(c => !isDefaultDemoCategory(c));
    state.topics = (Array.isArray(saved.topics) ? saved.topics : []).filter(t => !isDefaultDemoCategory(t.category));
  } else {
    const installRoadmap = saved.preferences?.roadmapVersion !== ROADMAP_VERSION;
    state.topics = (installRoadmap ? starterTopics : (Array.isArray(saved.topics) ? saved.topics : starterTopics))
      .map(t => ({ ...t, status: ["practiced", "mastered"].includes(t.status) ? "done" : t.status }));
    state.categories = installRoadmap ? [...DEFAULT_CATEGORIES] : (Array.isArray(saved.categories) ? saved.categories : [...DEFAULT_CATEGORIES]);
  }

  state.topics.forEach(t => { if (!state.categories.includes(t.category)) state.categories.push(t.category); });
  Object.assign(state, saved.preferences || {});
  state.activeTab = "modules";
  state.selectedCategory = null;
  
  if (saved.notionConfig) {
    state.notionToken = saved.notionConfig.token || "";
    state.notionDbId = saved.notionConfig.dbId || "";
    state.notionAutoSync = Boolean(saved.notionConfig.autoSync);
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

function bindEnhancements() {
  $("#close-dialog").onclick = requestEditorClose;
  $("#cancel-dialog").onclick = requestEditorClose;
  dialog.oncancel = e => {
    e.preventDefault();
    requestEditorClose();
  };
  $("#theme-toggle").onclick = () => { state.theme = state.theme === "pink" ? "dark" : "pink"; applyTheme(); savePreferences(); };
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
    if (typeof RichEditor !== "undefined") {
      RichEditor.setHTML("");
    }
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

  if (state.notionAutoSync && state.notionToken && state.notionDbId) {
    syncTopicToNotion(topic);
  }
}

async function deleteCurrent() {
  const id = $("#edit-id").value;
  if (!id) return;
  const accepted = await askConfirmation({ title: "Konuyu sil?", message: "Bu konu ve içindeki bütün notlar kalıcı olarak silinecek.", accept: "Evet, sil", danger: true });
  if (!accepted) return;
  state.topics = state.topics.filter(t => t.id !== id);
  await save();
  isEditorDirty = false;
  dialog.close();
  render();
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
  newCatDialog.showModal();
  if (input) setTimeout(() => input.focus(), 100);
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
  input.value = "";
  await save();
  renderCategories();
  renderModules();
  renderEditorCategories();
  newCatDialog?.close();
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
    if (usage > 0) {
      btn.disabled = true;
      btn.innerHTML = "🔒";
      btn.title = "Bu alana ait konular olduğu için silinemez";
    } else {
      btn.innerHTML = "×";
      btn.title = "Alanı sil";
      btn.onclick = () => removeCategory(category);
    }
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
}

async function removeCategory(category) {
  const usage = state.topics.filter(t => t.category === category).length;
  if (usage > 0) return; // disabled buton zaten bunu engelliyor ama güvenlik için
  const accepted = await askConfirmation({
    title: "Alanı sil?",
    message: `"${category}" alanı listeden kaldırılacak.`,
    accept: "Alanı sil",
    danger: true
  });
  if (!accepted) return;
  state.categories = state.categories.filter(c => c !== category);
  await save();
  renderEditorCategories();
  renderCategories();
  renderModules();
  markDirty();
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderStats();
  renderCategories();
  syncControls();
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

  state.categories.forEach((cat, idx) => {
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
    let iconHtml = `<span class="card-index">${String(idx).padStart(2, "0")}</span>`;
    if (meta?.iconType === "emoji" && meta.icon) {
      iconHtml = `<div class="card-avatar emoji" title="${cat}"><span>${meta.icon}</span></div>`;
    } else if (meta?.iconType === "image" && meta.iconUrl) {
      iconHtml = `<div class="card-avatar img" title="${cat}"><img src="${meta.iconUrl}" alt="${cat}" loading="lazy" /></div>`;
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
            ${total === 0 ? `<button class="card-delete-btn" type="button" title="Alanı Sil" aria-label="Alanı Sil">✕</button>` : ''}
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
  if (state.notionAutoSync && state.notionToken && state.notionDbId) {
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
  return state.topics.filter(t => {
    const plainNotes = (t.notes || "").replace(/<[^>]*>/g, " ");
    const matchesQuery = !state.query || `${t.title} ${plainNotes}`.toLocaleLowerCase("tr").includes(state.query);
    const matchesStatus = state.status === "all" || t.status === state.status;
    
    if (state.activeTab === "today") {
      return t.today && matchesStatus && matchesQuery;
    }
    
    if (state.selectedCategory) {
      return t.category === state.selectedCategory && matchesStatus && matchesQuery;
    }
    
    return matchesStatus && matchesQuery;
  });
}

function toggleSort(key) {
  const [current, direction] = state.sort.split("-");
  state.sort = `${key}-${current === key && direction === "asc" ? "desc" : "asc"}`;
  $("#sort-select").value = state.sort;
  renderTable();
  savePreferences();
}

function renderTable() {
  const isTodayTab = state.activeTab === "today";
  const todayTopicsTotal = state.topics.filter(t => t.today).length;
  const currentCategoryTotal = state.selectedCategory ? state.topics.filter(t => t.category === state.selectedCategory).length : state.topics.length;
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
  if (state.notionAutoSync && state.notionToken && state.notionDbId) {
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
  await save();
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
    const discoveredAreas = await NotionAPI.searchWorkspaces(token);

    if (discoveredAreas && discoveredAreas.length > 0) {
      discoveredAreas.forEach(area => {
        if (!state.categories.includes(area.title)) {
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
        msgEl.textContent = `✓ Başarılı: "${res.databaseTitle}" bağlandı (${discoveredAreas.length} Teamspace / Alan keşfedildi).`;
      } else if (discoveredAreas.length > 0) {
        state.notionDbTitle = `${discoveredAreas.length} Teamspace / Alan`;
        msgEl.textContent = `✓ Başarılı: ${discoveredAreas.length} Notion Teamspace / Alan keşfedildi ve bağlandı.`;
      } else {
        state.notionDbTitle = "Notion Bağlantısı";
        msgEl.textContent = "✓ Bağlantı başarılı, ancak henüz NotMonk ile paylaşılmış Teamspace veya Sayfa bulunamadı. Notion'da Teamspace veya sayfanda ... > Connections > NotMonk seç.";
      }
      msgEl.className = "notion-status-msg success";
      updateNotionStatusUI();
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
      const areas = await NotionAPI.searchWorkspaces(state.notionToken);
      state.notionConnected = areas.length > 0;
      state.notionDbTitle = `${areas.length} Teamspace / Alan`;
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

async function pullAllFromNotion() {
  if (!state.notionToken) {
    alert("Önce Notion API Token girmelisin.");
    return;
  }

  const pullBtn = $("#notion-pull-all-btn");
  const progressWrap = $("#notion-sync-progress");
  const progressText = $("#notion-sync-text");
  const progressBar = $("#notion-sync-bar");

  pullBtn.disabled = true;
  progressWrap.classList.remove("hidden");
  progressBar.style.width = "15%";
  progressText.textContent = "Notion Teamspace ve Konuları taranıyor...";

  try {
    const { areas, topics, umbrellaId } = await NotionAPI.fetchAllWorkspaceData(
      state.notionToken,
      state.notionDbId,
      msg => {
        progressText.textContent = msg;
        progressBar.style.width = "60%";
      }
    );

    if (umbrellaId) {
      state.umbrellaPageId = umbrellaId;
      state.categories = state.categories.filter(c => c.toLowerCase() !== "notmonk");
      delete state.areaMapping["NotMonk"];
      delete state.categoryMetadata["NotMonk"];
    }

    const isDefaultDemoCategory = cat => typeof NOTMONK_CATEGORIES !== "undefined" && NOTMONK_CATEGORIES.includes(cat);
    state.categories = state.categories.filter(c => !isDefaultDemoCategory(c));
    state.topics = state.topics.filter(t => !isDefaultDemoCategory(t.category));

    // 1. Sync Areas / Teamspaces
    let areaCount = 0;
    if (areas && areas.length > 0) {
      areas.forEach(area => {
        if (!state.categories.includes(area.title)) {
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
    progressBar.style.width = "100%";
    progressText.textContent = `✓ Başarılı: ${areaCount} Teamspace/Alan senkronize edildi. (${addedCount} yeni konu, ${updatedCount} güncellendi)`;
    setTimeout(() => progressWrap.classList.add("hidden"), 4000);
  } catch (err) {
    progressText.textContent = `✕ Hata: ${err.message}`;
  } finally {
    pullBtn.disabled = false;
  }
}

init();
