const STATUS = { todo: "Başlamadım", learning: "Öğreniyorum", done: "Öğrendim" };
const STATUS_ORDER = { todo: 0, learning: 1, done: 2 };

const ROADMAP_VERSION = 1;
const starterTopics = NOTMONK_ROADMAP.map((topic, index) => ({ ...topic, id: crypto.randomUUID(), status: "todo", updatedAt: Date.now() - index * 1000 }));
const DEFAULT_CATEGORIES = [...NOTMONK_CATEGORIES];

const state = {
  topics: [], categories: [],
  category: "Tümü", status: "all", query: "", sort: "updatedAt-desc",
  theme: "dark", page: 1, pageSize: 10, draggedId: null,
  activeTab: "all"
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const dialog = $("#topic-dialog");
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
const save = () => storageSet({ topics: state.topics, categories: state.categories });
const savePreferences = () => storageSet({ preferences: { category: state.category, status: state.status, sort: state.sort, theme: state.theme, roadmapVersion: ROADMAP_VERSION } });

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const saved = await storageGet(["topics", "preferences", "categories"]);
  const installRoadmap = saved.preferences?.roadmapVersion !== ROADMAP_VERSION;
  state.topics = (installRoadmap ? starterTopics : (Array.isArray(saved.topics) ? saved.topics : starterTopics))
    .map(t => ({ ...t, status: ["practiced", "mastered"].includes(t.status) ? "done" : t.status }));
  state.categories = installRoadmap ? [...DEFAULT_CATEGORIES] : (Array.isArray(saved.categories) ? saved.categories : [...DEFAULT_CATEGORIES]);
  state.topics.forEach(t => { if (!state.categories.includes(t.category)) state.categories.push(t.category); });
  Object.assign(state, saved.preferences || {});
  if (installRoadmap || !saved.topics || !saved.categories) { await save(); await savePreferences(); }
  bindEvents();
  bindCategoryEvents();
  bindEnhancements();
  bindListEnhancements();
  applyTheme();
  render();
}

// ── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  $("#open-form").onclick = () => openForm();
  $("#empty-add").onclick = () => openForm();
  $("#tab-all").onclick = () => switchTab("all");
  $("#tab-today").onclick = () => switchTab("today");
  const switchToAllBtn = $("#switch-to-all-btn");
  if (switchToAllBtn) switchToAllBtn.onclick = () => switchTab("all");
  $("#topic-form").onsubmit = saveForm;
  $("#delete-topic").onclick = deleteCurrent;
  $("#notes").oninput = e => { $("#note-count").textContent = e.target.value.length; markDirty(); };
  ["#title", "#category", "#resource"].forEach(s => $(s).addEventListener("input", markDirty));
  $$('[data-sort]').forEach(b => b.onclick = () => toggleSort(b.dataset.sort));
  document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "n" && !dialog.open && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault(); openForm();
    }
  });
}

function switchTab(tab) {
  state.activeTab = tab;
  $("#tab-all").classList.toggle("active", tab === "all");
  $("#tab-today").classList.toggle("active", tab === "today");
  $("#page-section-code").textContent = tab === "today" ? "BUGÜNÜN ODAĞI" : "ÖĞRENME TABLOSU";
  $("#page-title").textContent = tab === "today" ? "Bugün Çalışılacaklar" : "Konular";
  state.page = 1;
  renderTable();
}


function bindListEnhancements() {
  const reset = () => { state.page = 1; renderTable(); };
  $("#search").oninput = e => { state.query = e.target.value.toLocaleLowerCase("tr"); reset(); };
  $("#category-select").onchange = e => { state.category = e.target.value; reset(); savePreferences(); };
  $("#status-filter").onchange = e => { state.status = e.target.value; reset(); savePreferences(); };
  $("#sort-select").onchange = e => { state.sort = e.target.value; renderTable(); savePreferences(); };
  $("#clear-filters").onclick = () => {
    state.category = "Tümü"; state.status = "all"; state.query = ""; state.page = 1;
    $("#search").value = ""; syncControls(); renderTable(); savePreferences();
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
  $("#category-manager").classList.remove("hidden", "open");
  $("#toggle-category-manager").setAttribute("aria-expanded", "false");
  renderEditorCategories(topic?.category);
  if (topic) { $("#title").value = topic.title; $("#notes").value = topic.notes || ""; $("#resource").value = topic.resource || ""; }
  dialog.dataset.status = topic?.status || "todo";
  renderEditorStatus();
  $("#notes").placeholder = "Notlarını buraya yaz…\n\n• Konuyu kendi cümlelerinle açıkla.\n• Önemli noktaları ve örnekleri ekle.\n• Anlamadığın yerleri not al.\n• Bir sonraki adımını belirle.";
  $("#note-count").textContent = $("#notes").value.length;
  $("#save-hint").textContent = topic ? "Düzenlemeye hazır" : "";
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
  const topic = {
    id: id || crypto.randomUUID(),
    title: $("#title").value.trim(),
    category: $("#category").value,
    status: dialog.dataset.status || "todo",
    notes: $("#notes").value.trim(),
    resource: $("#resource").value.trim(),
    updatedAt: Date.now()
  };
  state.topics = id ? state.topics.map(t => t.id === id ? topic : t) : [topic, ...state.topics];
  await save();
  isEditorDirty = false;
  $("#save-hint").textContent = "Kaydedildi";
  dialog.close();
  render();
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
  $("#toggle-category-manager").onclick = () => {
    const manager = $("#category-manager"), open = manager.classList.toggle("open");
    $("#toggle-category-manager").setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => $("#new-category").focus(), 180);
  };
  $("#add-category").onclick = addCategory;
  $("#new-category").oninput = e => e.target.setCustomValidity("");
  $("#new-category").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } };
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
  markDirty();
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  renderStats();
  renderCategories();
  syncControls();
  renderTable();
}

function renderStats() {
  const todayCount = state.topics.filter(t => t.today).length;
  const badge = $("#today-count-badge");
  if (badge) badge.textContent = todayCount;
}

async function toggleToday(topic) {
  topic.today = !topic.today;
  await save();
  render();
}

function renderCategories() {
  const select = $("#category-select"), current = state.category;
  const cats = ["Tümü", ...state.categories];
  select.replaceChildren(...cats.map(c => new Option(c, c)));
  select.value = cats.includes(current) ? current : "Tümü";
  if (!cats.includes(current)) state.category = "Tümü";
}

function syncControls() {
  $("#category-select").value = state.category;
  $("#status-filter").value = state.status;
  $("#sort-select").value = state.sort;
}

function getVisible() {
  return state.topics.filter(t =>
    (state.activeTab !== "today" || t.today) &&
    (state.category === "Tümü" || t.category === state.category) &&
    (state.status === "all" || t.status === state.status) &&
    `${t.title} ${t.notes}`.toLocaleLowerCase("tr").includes(state.query)
  );
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
  const visible = getVisible();
  const totalPages = Math.max(1, Math.ceil(visible.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const pageTopics = visible.slice(start, start + state.pageSize);

  const isGlobalEmpty = !isTodayTab && state.topics.length === 0;
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
  await save(); render();
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
  tr.children[2].replaceChildren(titleWrap);

  tr.querySelector(".category-pill").textContent = topic.category;
  tr.children[4].append(statusButtons(topic));

  const cleanNotes = (topic.notes || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  const notesCell = tr.querySelector(".table-notes");
  notesCell.textContent = cleanNotes || "—";
  if (cleanNotes) notesCell.title = topic.notes;

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
  const button = $("#theme-toggle");
  button.querySelector("b").textContent = state.theme === "pink" ? "Koyu tema" : "Pembe tema";
  button.classList.toggle("active", state.theme === "pink");
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

init();
