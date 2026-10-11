const STATUS = {
  todo: "Yapılacak",
  in_progress: "Yapılıyor",
  done: "Yapıldı",
  review: "Tekrar",
  learning: "Yapılıyor" // geriye dönük uyumluluk
};

const STATUS_FULL = {
  todo: "Yapılacaklar",
  in_progress: "Yapılıyor Olanlar",
  done: "Yapılmış Olanlar",
  review: "Tekrar Edilmesi Gerekenler",
  learning: "Yapılıyor Olanlar"
};

const STATUS_ICONS = {
  todo: `<svg class="doodle-status-svg doodle-todo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3.5h6a1 1 0 0 1 1 1V6H8v-1.5a1 1 0 0 1 1-1Z"/><path d="M8 5H6a2 2 0 0 0-2 2v13.5A1.5 1.5 0 0 0 7.5 22h9a1.5 1.5 0 0 0 1.5-1.5V7a2 2 0 0 0-2-2h-2"/><path d="m8.5 11.5 1.5 1.5 3-3" stroke-width="2.2"/><path d="M14.5 12h2.5"/><path d="m8.5 16.5 1.5 1.5 3-3" stroke-width="2.2"/><path d="M14.5 17h2.5"/></svg>`,
  in_progress: `<svg class="doodle-status-svg doodle-progress" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2.5-8.5 11.3a.7.7 0 0 0 .6 1.2h6.1L9.8 22l9.7-11.8a.7.7 0 0 0-.6-1.2h-5.9l1.5-6.5a.6.6 0 0 0-1.5 0Z"/><path d="m19 4.5 1.5-1.5M21 9h2M3 10.5H1M4.5 5.5 3 4" stroke-width="1.6"/></svg>`,
  done: `<svg class="doodle-status-svg doodle-done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 10.8A8.8 8.8 0 1 1 17.2 5"/><path d="m7.5 12.2 3.8 3.8 9.2-9.5" stroke-width="2.4"/></svg>`,
  review: `<svg class="doodle-status-svg doodle-review" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5"/><path d="M20 4.5v4h-4"/><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5"/><path d="M4 19.5v-4h4"/></svg>`,
  learning: `<svg class="doodle-status-svg doodle-progress" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2.5-8.5 11.3a.7.7 0 0 0 .6 1.2h6.1L9.8 22l9.7-11.8a.7.7 0 0 0-.6-1.2h-5.9l1.5-6.5a.6.6 0 0 0-1.5 0Z"/><path d="m19 4.5 1.5-1.5M21 9h2M3 10.5H1M4.5 5.5 3 4" stroke-width="1.6"/></svg>`
};

const DOODLE_PRESET_SVGS = {
  shield: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  terminal: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
  cpu: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/></svg>`,
  network: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  bug: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M20 13h-4M4 13h4M10 4l1 2M14 4l-1 2"/></svg>`,
  radar: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,
  lock: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  search: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  code: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  spark: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  folder: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.5l2 2.5H19a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V6.5Z"/></svg>`,
  star: `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.5 2.9 6.2 6.6.9-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.9L12 2.5Z"/></svg>`
};

const STATUS_ORDER = {
  todo: 0,
  in_progress: 1,
  done: 2,
  review: 3,
  learning: 1
};

const STATUS_KEYS = ["todo", "in_progress", "done", "review"];

function normalizeStatus(status) {
  if (!status) return "todo";
  if (status === "learning") return "in_progress";
  if (STATUS_KEYS.includes(status)) return status;
  return "todo";
}

const isTodayTopic = t => StudyList.containsPage(t?.id) ?? Boolean(t?.today);

const ROADMAP_VERSION = 17;
const RECOVERY_SNAPSHOT_ID = "local-recovery";
const starterTopics = NOTMONK_ROADMAP.map((topic, index) => ({
  ...topic,
  id: topic.id || crypto.randomUUID(),
  status: normalizeStatus(topic.status || "todo"),
  updatedAt: Date.now() - index * 1000
}));
const starterIdsByCurriculumKey = new Map(starterTopics.filter(topic => topic.curriculumKey).map(topic => [topic.curriculumKey, topic.id]));
starterTopics.forEach(topic => {
  if (topic.parentCurriculumKey) topic.parentTopicId = starterIdsByCurriculumKey.get(topic.parentCurriculumKey) || null;
});
const DEFAULT_CATEGORIES = [...NOTMONK_CATEGORIES];

const state = {
  topics: [], categories: [], categoryMetadata: {}, areaAliases: {},
  category: "Tümü", status: "all", query: "", sort: "updatedAt-desc",
  theme: "dark", page: 1, pageSize: 10, draggedId: null,
  activeTab: "modules", selectedCategory: null,
  viewMode: "board", boardScope: "today",
  areaViewMode: "tree"
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const dialog = $("#topic-dialog");
const newCatDialog = $("#new-category-dialog");
const avatarDialog = $("#area-avatar-dialog");
// Hata 12: per-topic editor state (global boolean yerine)
const editorState = { dirty: false, topicId: null, savedAt: 0 };
let autoSaveTimer, saveHintTimer, editorRevision = 0;
let editorSaveQueue = Promise.resolve();
// Geriye dönük uyumluluk için — tüm isEditorDirty referansları editorState.dirty kullanır
Object.defineProperty(window, 'isEditorDirty', {
  get() { return editorState.dirty; },
  set(v) { editorState.dirty = v; }
});
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
const storageGet = key => new Promise((resolve, reject) => {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.get(key, result => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message));
    else if (!result || typeof result !== "object") reject(new Error("Kayıtlı veriler okunamadı."));
    else resolve(result);
  });
  const keys = Array.isArray(key) ? key : [key], result = {};
  keys.forEach(k => { const v = localStorage.getItem(k); if (v !== null) result[k] = JSON.parse(v); });
  resolve(result);
});
const storageSet = value => new Promise((resolve, reject) => {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.set(value, () => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve();
  });
  Object.entries(value).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  if (typeof ObsidianSettings !== "undefined") ObsidianSettings.changed(value);
  resolve();
});
const save = (statusChangedIds = []) => {
  const value = {
  topics: state.topics,
  categories: state.categories,
  categoryMetadata: state.categoryMetadata,
  areaAliases: state.areaAliases,
  deletedTopicKeys: state.deletedTopicKeys || [],
  deletedCategoryKeys: state.deletedCategoryKeys || []
  };
  return StudyList.isReady() ? StudyList.savePages(value, statusChangedIds) : storageSet(value);
};
const savePreferences = () => {
  const prefs = {
    category: state.category,
    status: state.status,
    sort: state.sort,
    theme: state.theme,
    roadmapVersion: ROADMAP_VERSION,
    activeTab: state.activeTab || "modules",
    selectedCategory: state.selectedCategory || null,
    viewMode: state.viewMode,
    boardScope: state.boardScope,
    areaViewMode: state.areaViewMode || "tree"
  };
  try {
    localStorage.setItem("notmonk_preferences", JSON.stringify(prefs));
  } catch (e) {}
  return storageSet({ preferences: prefs }).catch(error => {
    reportStartupWarning("Görünüm tercihi kaydedilemedi.", error);
    return false;
  });
};

function reportStartupWarning(message, error) {
  console.error(message, error);
  let notice = $("#startup-warning");
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "startup-warning";
    notice.setAttribute("role", "alert");
    $(".workspace").before(notice);
  }
  notice.textContent = /quota|QUOTA_BYTES/i.test(error?.message || "")
    ? "Tarayıcı kayıt alanı dolu. Mevcut notlar açıldı; yeni değişiklikler kaydedilemeyebilir."
    : message;
}

function showStartupFailure(error) {
  console.error("NotMonk açılışı tamamlanamadı:", error);
  const grid = $("#modules-grid");
  const notice = document.createElement("div");
  notice.setAttribute("role", "alert");
  notice.style.gridColumn = "1 / -1";
  const message = document.createElement("p");
  message.textContent = `NotMonk açılamadı: ${error?.message || "Bilinmeyen açılış hatası"}`;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Sayfayı yeniden yükle";
  retry.onclick = () => location.reload();
  notice.append(message, retry);
  grid.replaceChildren(notice);
}

function mergeCurriculumNotes(savedNotes = "", curriculumNotes = "", replaceGenerated = false) {
  if (!savedNotes.trim()) return curriculumNotes;
  if (replaceGenerated && !savedNotes.includes("notmonk:curriculum:start")) {
    const template = document.createElement("template");
    template.innerHTML = savedNotes;
    const children = [...template.content.children];
    let paragraphCount = 0;
    let consumed = 0;
    for (const child of children) {
      if (child.tagName === "P" && paragraphCount < 7) {
        paragraphCount++;
        consumed++;
        continue;
      }
      if (child.tagName === "PRE" && paragraphCount >= 4 && paragraphCount < 7) {
        consumed++;
        continue;
      }
      break;
    }
    const personal = paragraphCount >= 7 ? children.slice(consumed).map(child => child.outerHTML).join("").trim() : "";
    // Eski biçimde üretilmiş bir not ile kullanıcının düzenlediği notu güvenilir biçimde
    // ayırmak mümkün değil. Veri kaybetmek yerine eski metni olduğu gibi koru.
    return personal ? `${savedNotes}<hr><h2>Güncellenen ders notu</h2>${curriculumNotes}` : savedNotes;
  }
  if (replaceGenerated && savedNotes.includes("notmonk:curriculum:start")) {
    const personal = savedNotes.replace(/<!-- notmonk:curriculum:start -->[\s\S]*?<!-- notmonk:curriculum:end -->/g, "").trim();
    return personal ? `${curriculumNotes}<hr><h2>Kendi notlarım</h2>${personal}` : curriculumNotes;
  }
  const personal = extractPersonalNotes(savedNotes);
  const base = curriculumNotes.trimEnd();
  if (!personal || base.includes(personal)) return curriculumNotes;
  return `${base}\n${personal}\n`;
}

function noteTextLength(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  return (template.content.textContent || "").replace(/\s+/g, " ").trim().length;
}

function recoverLocalNotes(snapshot = []) {
  if (!Array.isArray(snapshot) || !snapshot.length) return { restored: 0, added: 0 };
  let restored = 0;
  let added = 0;
  for (const backup of snapshot) {
    if (!backup?.title || !backup?.category || !backup?.notes) continue;
    const match = state.topics.find(topic =>
      normalizedTopicText(topic.title) === normalizedTopicText(backup.title) &&
      normalizedTopicText(topic.category) === normalizedTopicText(backup.category)
    );
    if (!match) {
      state.topics.push({
        ...backup,
        id: crypto.randomUUID(),
        parentTopicId: null,
        recoveredFromLocalBackup: RECOVERY_SNAPSHOT_ID,
        updatedAt: backup.updatedAt || Date.now()
      });
      added++;
      continue;
    }
    const currentNotes = String(match.notes || "");
    const backupNotes = String(backup.notes || "");
    if (currentNotes === backupNotes || currentNotes.includes(backupNotes)) continue;
    // A recovery snapshot is an alternative version, never additional lesson text.
    if (currentNotes.trim()) continue;
    match.notes = backupNotes;
    match.recoveredFromLocalBackup = RECOVERY_SNAPSHOT_ID;
    match.updatedAt = Math.max(match.updatedAt || 0, backup.updatedAt || 0);
    restored++;
  }
  return { restored, added };
}

function topicSnapshotFingerprint(topics = []) {
  return topics.map(topic => `${topic.id || ""}:${topic.updatedAt || 0}:${String(topic.notes || "").length}`).join("|");
}

async function archiveSafetySnapshot(saved) {
  if (!Array.isArray(saved.topics) || !saved.topics.length) return;
  const backups = Array.isArray(saved.safetyBackups) ? [...saved.safetyBackups] : [];
  const fingerprint = topicSnapshotFingerprint(saved.topics);
  if (backups[0]?.fingerprint === fingerprint) return;
  backups.unshift({
    createdAt: Date.now(),
    roadmapVersion: saved.preferences?.roadmapVersion || 0,
    fingerprint,
    topics: saved.topics
  });
  await storageSet({ safetyBackups: backups.slice(0, 3) });
}

async function archiveCurrentSafetySnapshot() {
  if (!state.topics.length) return;
  const saved = await storageGet(["safetyBackups"]);
  await archiveSafetySnapshot({
    topics: state.topics.map(topic => ({ ...topic })),
    preferences: { roadmapVersion: ROADMAP_VERSION },
    safetyBackups: saved.safetyBackups || []
  });
}

function extractPersonalNotes(notes = "") {
  const marker = "📝 KENDİ ÇALIŞMA NOTLARIM";
  if (!notes.includes(marker)) return notes.trim();
  return notes.split(marker).slice(1).join(marker).trim();
}

function normalizedTopicText(value = "") {
  return String(value).trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
}

function markTopicDeleted(topic) {
  if (!topic) return;
  if (!state.deletedTopicKeys) state.deletedTopicKeys = [];
  if (topic.id && !state.deletedTopicKeys.includes(topic.id)) {
    state.deletedTopicKeys.push(topic.id);
  }
  if (topic.title) {
    const cleanTitle = topic.title.trim().toLowerCase();
    if (!state.deletedTopicKeys.includes(cleanTitle)) {
      state.deletedTopicKeys.push(cleanTitle);
    }
  }
  if (topic.notionPageId) {
    const cleanPid = String(topic.notionPageId).replaceAll("-", "");
    if (!state.deletedTopicKeys.includes(cleanPid)) {
      state.deletedTopicKeys.push(cleanPid);
    }
  }
  storageSet({ deletedTopicKeys: state.deletedTopicKeys });
}

function isTopicDeleted(t) {
  if (!t || !state.deletedTopicKeys || state.deletedTopicKeys.length === 0) return false;
  if (t.id && state.deletedTopicKeys.includes(t.id)) return true;
  if (t.title && state.deletedTopicKeys.includes(t.title.trim().toLowerCase())) return true;
  if (t.notionPageId && state.deletedTopicKeys.includes(String(t.notionPageId).replaceAll("-", ""))) return true;
  return false;
}

function markCategoryDeleted(cat) {
  if (!cat) return;
  if (!state.deletedCategoryKeys) state.deletedCategoryKeys = [];
  const clean = cat.trim().toLowerCase();
  if (!state.deletedCategoryKeys.includes(clean)) {
    state.deletedCategoryKeys.push(clean);
  }
  storageSet({ deletedCategoryKeys: state.deletedCategoryKeys });
}

function isCategoryDeleted(cat) {
  if (!cat || !state.deletedCategoryKeys || state.deletedCategoryKeys.length === 0) return false;
  return state.deletedCategoryKeys.includes(cat.trim().toLowerCase());
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const saved = await storageGet(["topics", "preferences", "categories", "moduleOrder", "categoryMetadata", "deletedTopicKeys", "deletedCategoryKeys", "recoveryApplied", "safetyBackups", "collapsedNoteIds", "areaAliases", "curriculumSetupVersion", "curriculumSetupBackup", "roadmapBoard", "studyItems", "foundationsOutlineVersion", "foundationsOutlineBackup"]);
  // Optional startup writes must never prevent reading the existing notes.
  try { await archiveSafetySnapshot(saved); }
  catch (error) { reportStartupWarning("Açılış yedeği oluşturulamadı. Mevcut notların yüklenecek.", error); }
  state.areaAliases = saved.areaAliases || {};

  collapsedNoteIds.clear();
  if (Array.isArray(saved.collapsedNoteIds)) {
    saved.collapsedNoteIds.filter(id => typeof id === "string").forEach(id => collapsedNoteIds.add(id));
  }
  state.categoryMetadata = saved.categoryMetadata || {};
  for (const [index, category] of NOTMONK_CATEGORIES.entries()) {
    const custom = state.categoryMetadata[category];
    const meta = (typeof NOTMONK_CATEGORIES_META !== "undefined" && NOTMONK_CATEGORIES_META[category]) || {};
    // Preserve user-uploaded images; replace default/emoji placeholders with the doodle set.
    if (!(custom?.iconType === "image" && custom?.iconUrl && !custom.iconUrl.includes("assets/category-icons/"))) {
      state.categoryMetadata[category] = {
        ...meta,
        ...(custom || {}),
        icon: meta.icon || "",
        iconUrl: NOTMONK_CATEGORY_ICON_URLS[index] || meta.iconUrl || "",
        iconType: "image"
      };
    }
  }
  state.deletedTopicKeys = Array.isArray(saved.deletedTopicKeys) ? saved.deletedTopicKeys : [];
  state.deletedCategoryKeys = Array.isArray(saved.deletedCategoryKeys) ? saved.deletedCategoryKeys : [];

  // Read existing local data without changing its titles, content or area names.
  state.topics = (Array.isArray(saved.topics) ? saved.topics : []).filter(t => !isTopicDeleted(t) && !isCategoryDeleted(t.category));
  state.categories = (Array.isArray(saved.categories) ? saved.categories : []).filter(c => !isCategoryDeleted(c));

  const shouldRecover = Boolean(globalThis.chrome?.storage?.local) && saved.recoveryApplied !== RECOVERY_SNAPSHOT_ID && Array.isArray(globalThis.NOTMONK_RECOVERY_SNAPSHOT) && globalThis.NOTMONK_RECOVERY_SNAPSHOT.length > 0;
  if (shouldRecover) recoverLocalNotes(globalThis.NOTMONK_RECOVERY_SNAPSHOT);

  // Konulardan gelen geçerli kategorileri de ekle
  state.topics.forEach(t => {
    if (t.category && !isCategoryDeleted(t.category) && !state.categories.includes(t.category)) {
      state.categories.push(t.category);
    }
  });

  // Kart sırası müfredat sürümünden bağımsız tutulur. Yeni varsayılan alanlar sona
  // eklenir; kullanıcının sürükleyerek belirlediği mevcut sıra güncellemelerde ezilmez.
  const savedModuleOrder = Array.isArray(saved.moduleOrder) ? saved.moduleOrder : [];
  if (savedModuleOrder.length) {
    const ordered = savedModuleOrder.filter(category => state.categories.includes(category));
    const newlyAdded = state.categories.filter(category => !ordered.includes(category));
    state.categories = [...ordered, ...newlyAdded];
  }



  // Load saved preferences with synchronous fallback from localStorage
  let localPrefs = null;
  try {
    const raw = localStorage.getItem("notmonk_preferences");
    if (raw) localPrefs = JSON.parse(raw);
  } catch (e) {}
  const mergedPrefs = { ...(saved.preferences || {}), ...(localPrefs || {}) };
  if (mergedPrefs.selectedCategory) mergedPrefs.selectedCategory = CurriculumAreas.canonical(mergedPrefs.selectedCategory, NOTMONK_CATEGORIES, state.areaAliases);

  Object.assign(state, mergedPrefs);
  state.activeTab = mergedPrefs.activeTab || "modules";
  state.selectedCategory = (mergedPrefs.selectedCategory && state.categories.includes(mergedPrefs.selectedCategory)) ? mergedPrefs.selectedCategory : null;
  state.areaViewMode = "tree";

  // A failed normalization write leaves the persisted notes intact and the UI usable.
  try {
    await save();
    if (shouldRecover) await storageSet({ recoveryApplied: RECOVERY_SNAPSHOT_ID });
  } catch (error) {
    reportStartupWarning("Açılış değişiklikleri kaydedilemedi. Mevcut notların yüklenecek.", error);
  }
  await savePreferences();
  bindEvents();
  bindCategoryEvents();
  if (typeof ObsidianSettings !== "undefined") ObsidianSettings.init({ get: storageGet, set: storageSet, notify: showToast });
  bindEnhancements();
  bindListEnhancements();
  bindTopicPickerEvents();
  applyTheme();
  await StudyList.init({
    getPages: () => state.topics, get: storageGet, set: storageSet,
    setPageStatus: (page, status) => updateStatus(page, status),
    onChange: render, notify: showToast, openPage: openForm, areaName: displayAreaName,
    onStorageError: error => reportStartupWarning("Çalışma listesi güncellemesi kaydedilemedi.", error)
  });
  PageRecovery.init({
    get: storageGet, getPages: () => state.topics, areaName: displayAreaName, notify: showToast,
    isDeleted: p => isTopicDeleted(p) || isCategoryDeleted(p.category),
    restore: async selected => {
      if (dialog.open) await persistEditor();
      const latest = await storageGet(["topics", "categories", "deletedTopicKeys", "deletedCategoryKeys"]);
      state.deletedTopicKeys = [...new Set([...state.deletedTopicKeys, ...(latest.deletedTopicKeys || [])])];
      state.deletedCategoryKeys = [...new Set([...state.deletedCategoryKeys, ...(latest.deletedCategoryKeys || [])])];
      const recovered = PageRecoveryModel.restore(latest.topics || state.topics, selected.filter(p => !isTopicDeleted(p) && !isCategoryDeleted(p.category)).map(p => ({...p, category: normalizeCurriculumCategory(p.category)})), () => crypto.randomUUID());
      state.topics = recovered.pages;
      state.categories = [...new Set([...(latest.categories || state.categories), ...state.topics.map(p => p.category).filter(Boolean)])];
      await save(); render(); return recovered.added;
    }
  });
  if (globalThis.chrome?.storage?.onChanged) chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.topics || !Array.isArray(changes.topics.newValue)) return;
    state.topics = changes.topics.newValue;
    const active = state.topics.find(page => page.id === $("#edit-id").value);
    if (dialog.open && active && dialog.dataset.statusChanged !== "true") {
      dialog.dataset.status = normalizeStatus(active.status);
      renderEditorStatus();
    }
    render();
  });
  await RoadmapBoard.init();
  await applyPageRoute();
  window.addEventListener("hashchange", () => applyPageRoute());
  renderStats();
}

// ── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  const openFormBtn = $("#open-form");
  if (openFormBtn) openFormBtn.onclick = () => openForm();
  const emptyAdd = $("#empty-add");
  if (emptyAdd) emptyAdd.onclick = () => openForm();
  const addTopicBtn = $("#add-topic-btn");
  if (addTopicBtn) addTopicBtn.onclick = () => state.activeTab === "today" ? StudyList.itemDialog() : openForm();
  $("#add-root-note").onclick = () => createTreePage();
  $("#empty-new-note").onclick = () => createTreePage();
  // Bu sekme her zaman alanların ana sayfasına döner.
  $("#tab-modules").onclick = goBackToModules;
  $("#tab-today").onclick = () => switchTab("today");
  $("#tab-roadmap").onclick = () => switchTab("roadmap");
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
  ["#title", "#resource"].forEach(s => $(s).addEventListener("input", markDirty));
  $("#parent-topic").addEventListener("change", markDirty);
  $("#category").addEventListener("change", () => {
    renderParentTopicOptions($("#category").value, $("#parent-topic").value, $("#edit-id").value);
    markDirty();
  });
  $$('[data-sort]').forEach(b => b.onclick = () => toggleSort(b.dataset.sort));
  document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "n" && state.activeTab !== "roadmap" && !document.querySelector("dialog[open]") && !e.target.isContentEditable && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault(); state.activeTab === "today" ? StudyList.itemDialog() : openForm();
    }
  });
}

// Hash routes work on extension URLs and local files without server rewrites.
function categoryRoutes() {
  const used = new Set(["", "today", "roadmap", "areas"]);
  return new Map(state.categories.map(category => {
    let base = displayAreaName(category).toLocaleLowerCase("tr").replace(/ı/g, "i")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    base ||= "alan";
    let slug = base, suffix = 2;
    while (used.has(slug)) slug = `${base}-${suffix++}`;
    used.add(slug);
    return [category, slug];
  }));
}

function updatePageRoute() {
  const slug = state.activeTab === "roadmap" ? "roadmap" : state.activeTab === "today" ? "today"
    : state.selectedCategory ? categoryRoutes().get(state.selectedCategory) || "" : "";
  const hash = `#/${slug}`;
  if (location.hash !== hash) history.pushState(null, "", hash);
}

async function applyPageRoute() {
  let slug;
  try { slug = decodeURIComponent(location.hash.replace(/^#\/?/, "").replace(/\/$/, "")); }
  catch { slug = ""; }
  const category = [...categoryRoutes()].find(([, value]) => value === slug)?.[0];
  if (dialog.open) {
    await persistEditor().catch(() => {});
    dialog.close();
    dialog.classList.remove("inline-document");
    document.body.append(dialog);
  }
  if (slug === "areas") {
    await goBackToModules();
  } else if (category) {
    openCategory(category);
  } else if (slug === "today") {
    switchTab("today");
  } else if (slug === "roadmap") {
    switchTab("roadmap");
  } else if (!slug) {
    if (state.selectedCategory && state.categories.includes(state.selectedCategory)) {
      openCategory(state.selectedCategory);
    } else if (state.activeTab === "today") {
      switchTab("today");
    } else if (state.activeTab === "roadmap") {
      switchTab("roadmap");
    } else {
      await goBackToModules();
    }
  } else {
    history.replaceState(null, "", "#/");
    await goBackToModules();
  }
}

function switchTab(tab) {
  if ((tab === "today" || tab === "roadmap") && dialog.classList.contains("inline-document")) {
    persistEditor().finally(() => {
      if (dialog.open) dialog.close();
      dialog.classList.remove("inline-document");
      document.body.append(dialog);
    });
  }
  state.activeTab = tab;
  if (tab === "today" || tab === "roadmap") state.selectedCategory = null;
  updatePageRoute();
  savePreferences();
  $("#tab-modules").classList.toggle("active", tab === "modules" && !state.selectedCategory);
  $("#tab-today").classList.toggle("active", tab === "today");
  setRoadmapVisibility(tab === "roadmap");
  if (tab === "roadmap") { renderRoadmapPage(); return; }

  if (tab === "today") {
    state.selectedCategory = null;
    $("#modules-view").classList.add("hidden");
    $("#topics-view").classList.remove("hidden");
    $("#back-to-modules").classList.add("hidden");
    $("#page-section-code").textContent = "ÇALIŞMA LİSTEM";
    $("#page-title").textContent = "Şu an çalıştıklarım";
    state.page = 1;
    renderTable();
  } else {
    if (state.selectedCategory) {
      $("#modules-view").classList.add("hidden");
      $("#topics-view").classList.remove("hidden");
      $("#back-to-modules").classList.remove("hidden");
      $("#page-section-code").textContent = "ALAN MODÜLÜ";
      $("#page-title").textContent = displayAreaName(state.selectedCategory);
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
    } else if (meta?.iconType === "preset" && DOODLE_PRESET_SVGS[meta.icon]) {
      titleAvatar.innerHTML = DOODLE_PRESET_SVGS[meta.icon];
    } else if (meta?.iconType === "emoji" && meta.icon) {
      titleAvatar.innerHTML = `<span>${meta.icon}</span>`;
    } else {
      titleAvatar.innerHTML = DOODLE_PRESET_SVGS.folder;
    }
  } else {
    titleAvatar.classList.add("hidden");
  }
}

function openCategory(categoryName) {
  setRoadmapVisibility(false);
  state.selectedCategory = categoryName;
  state.activeTab = "modules";
  updatePageRoute();
  state.page = 1;
  savePreferences();
  $("#tab-today").classList.remove("active");
  $("#tab-modules").classList.remove("active");
  $("#modules-view").classList.add("hidden");
  $("#topics-view").classList.remove("hidden");
  $("#back-to-modules").classList.remove("hidden");
  $("#page-section-code").textContent = "ALAN MODÜLÜ";
  $("#page-title").textContent = displayAreaName(categoryName);
  updatePageTitleAvatar();
  renderTable();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function goBackToModules() {
  if (dialog.classList.contains("inline-document")) {
    await persistEditor().catch(() => {});
    if (dialog.open) dialog.close();
    dialog.classList.remove("inline-document");
    document.body.append(dialog);
  }
  state.selectedCategory = null;
  state.activeTab = "modules";
  setRoadmapVisibility(false);
  updatePageRoute();
  savePreferences();
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

  const boardViewBtn = $("#view-mode-board");
  if (boardViewBtn) boardViewBtn.onclick = () => {
    state.viewMode = "board";
    renderTable();
    savePreferences();
  };
  const tableViewBtn = $("#view-mode-table");
  if (tableViewBtn) tableViewBtn.onclick = () => {
    state.viewMode = "table";
    renderTable();
    savePreferences();
  };
  const scopeTodayBtn = $("#board-scope-today");
  if (scopeTodayBtn) scopeTodayBtn.onclick = () => {
    state.boardScope = "today";
    state.page = 1;
    renderTable();
    savePreferences();
  };
  const scopeAllBtn = $("#board-scope-all");
  if (scopeAllBtn) scopeAllBtn.onclick = () => {
    state.boardScope = "all";
    state.page = 1;
    renderTable();
    savePreferences();
  };
  const areaBoardBtn = $("#area-switch-to-board-btn");
  if (areaBoardBtn) areaBoardBtn.onclick = () => {
    state.areaViewMode = "board";
    savePreferences();
    renderTable();
  };
  const areaTreeBtn = $("#area-switch-to-tree-btn");
  if (areaTreeBtn) areaTreeBtn.onclick = () => {
    state.areaViewMode = "tree";
    savePreferences();
    renderTable();
  };
  const areaAddBtn = $("#area-add-topic-btn");
  if (areaAddBtn) areaAddBtn.onclick = () => openForm(null, null, "todo");
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
  } else if (tempAvatarData.iconType === "preset" && DOODLE_PRESET_SVGS[tempAvatarData.icon]) {
    preview.innerHTML = `<span class="preview-doodle-icon">${DOODLE_PRESET_SVGS[tempAvatarData.icon]}</span>`;
  } else if (tempAvatarData.iconType === "emoji" && tempAvatarData.icon) {
    preview.innerHTML = `<span>${tempAvatarData.icon}</span>`;
  } else {
    preview.innerHTML = DOODLE_PRESET_SVGS.folder;
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
      const preset = btn.dataset.preset;
      if (preset && DOODLE_PRESET_SVGS[preset]) {
        tempAvatarData = { icon: preset, iconType: "preset", iconUrl: "" };
      } else {
        const emoji = btn.textContent.trim();
        tempAvatarData = { icon: emoji, iconType: "emoji", iconUrl: "" };
      }
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
          } else if (pendingNewCategoryAvatar.iconType === "preset" && DOODLE_PRESET_SVGS[pendingNewCategoryAvatar.icon]) {
            previewSpan.innerHTML = DOODLE_PRESET_SVGS[pendingNewCategoryAvatar.icon];
          } else if (pendingNewCategoryAvatar.iconType === "emoji" && pendingNewCategoryAvatar.icon) {
            previewSpan.textContent = pendingNewCategoryAvatar.icon;
          } else {
            previewSpan.innerHTML = DOODLE_PRESET_SVGS.folder;
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
function getTopicDescendantIds(topicId) {
  const found = new Set();
  const visit = id => state.topics.forEach(topic => {
    if (topic.parentTopicId === id && !found.has(topic.id)) {
      found.add(topic.id);
      visit(topic.id);
    }
  });
  visit(topicId);
  return found;
}

function orderTopicsHierarchically(topics) {
  const visibleIds = new Set(topics.map(topic => topic.id));
  const children = new Map();
  topics.forEach(topic => {
    const parentId = visibleIds.has(topic.parentTopicId) ? topic.parentTopicId : null;
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId).push(topic);
  });
  const result = [];
  const visited = new Set();
  const visit = (topic, depth) => {
    if (visited.has(topic.id)) return;
    visited.add(topic.id);
    result.push({ topic, depth });
    (children.get(topic.id) || []).forEach(child => visit(child, depth + 1));
  };
  (children.get(null) || []).forEach(topic => visit(topic, 0));
  topics.forEach(topic => visit(topic, 0)); // Bozuk/eski döngüleri güvenle köke al.
  return result;
}

function renderParentTopicOptions(category, selectedId = "", editingId = "") {
  const select = $("#parent-topic");
  if (!select) return;
  const excluded = editingId ? getTopicDescendantIds(editingId) : new Set();
  if (editingId) excluded.add(editingId);
  const candidates = state.topics.filter(topic => topic.category === category && !excluded.has(topic.id));
  const ordered = orderTopicsHierarchically(candidates);
  select.replaceChildren(new Option("Alan ana sayfası", ""));
  ordered.forEach(({ topic, depth }) => select.add(new Option(`${"  ".repeat(depth)}${depth ? "↳ " : ""}${topic.title}`, topic.id)));
  select.value = candidates.some(topic => topic.id === selectedId) ? selectedId : "";
}

function openForm(topic = null, parentTopic = null, initialStatus = "todo") {
  clearTimeout(autoSaveTimer);
  clearTimeout(saveHintTimer);
  editorRevision++;
  $("#save-hint").textContent = "";
  $("#topic-form").reset();
  dialog.dataset.statusChanged = "false";
  PageAppearance.load(topic?.appearance);
  $("#edit-id").value = topic?.id || "";
  $("#dialog-title").textContent = topic ? "Sayfayı düzenle" : "Yeni sayfa";
  $("#delete-topic").classList.toggle("hidden", !topic);

  // When inside a specific category, auto-assign it and hide the category field completely
  const isInsideCategory = Boolean(state.selectedCategory);
  const targetCategory = state.selectedCategory || topic?.category || parentTopic?.category || state.categories[0];

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

  renderParentTopicOptions(targetCategory, topic?.parentTopicId || parentTopic?.id || "", topic?.id || "");
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


  dialog.dataset.status = topic ? normalizeStatus(topic.status) : normalizeStatus(initialStatus || "todo");
  renderEditorStatus();
  const currentTextLen = typeof RichEditor !== "undefined" ? RichEditor.getPlainText().length : $("#notes").value.length;
  $("#note-count").textContent = currentTextLen;
  isEditorDirty = false;
  const inlineMode = Boolean(state.selectedCategory && state.activeTab !== "today");
  if (inlineMode) {
    if (state.areaViewMode === "board") {
      state.areaViewMode = "tree";
      savePreferences();
      $("#topics-view").classList.remove("area-board-mode");
      $("#kanban-view").classList.add("hidden");
      $("#area-workspace").classList.remove("hidden");
    }
    const host = $("#inline-editor-host");
    dialog.classList.add("inline-document");
    host.append(dialog);
    $("#note-document-empty").classList.add("hidden");
    if (!dialog.open) dialog.show();
    renderNoteTree();
  } else {
    dialog.classList.remove("inline-document");
    document.body.append(dialog);
    if (!dialog.open) dialog.showModal();
  }
  $("#title").focus();


}

function markDirty() {
  editorState.dirty = true;
  editorState.topicId = $("#edit-id").value;
  editorRevision++;
  clearTimeout(autoSaveTimer);
  clearTimeout(saveHintTimer);
  $("#save-hint").textContent = "";
  autoSaveTimer = setTimeout(() => persistEditor().catch(() => {}), 1000);
}

function persistEditor() {
  clearTimeout(autoSaveTimer);
  const run = async () => {
    if (!dialog.open || !editorState.dirty) return;
    await saveForm({ preventDefault() {} }, true);
  };
  editorSaveQueue = editorSaveQueue.catch(() => {}).then(run);
  return editorSaveQueue;
}

function renderEditorStatus() {
  const container = $("#editor-status-buttons");
  if (!container) return;
  container.replaceChildren();
  const current = normalizeStatus(dialog.dataset.status);
  STATUS_KEYS.forEach(value => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `status-button status-${value}${current === value ? " active" : ""}`;
    button.textContent = STATUS[value];
    button.setAttribute("aria-pressed", String(current === value));
    button.onclick = () => {
      dialog.dataset.status = value;
      dialog.dataset.statusChanged = "true";
      renderEditorStatus();
      markDirty();
      persistEditor().catch(() => {});
    };
    container.append(button);
  });
}

async function saveForm(e, keepOpen = false) {
  e.preventDefault();
  if (!keepOpen) {
    try { await persistEditor(); dialog.close(); } catch {}
    return;
  }
  const revision = editorRevision;
  $("#save-hint").textContent = "Kaydediliyor…";
  const id = $("#edit-id").value;
  const existing = id ? state.topics.find(t => t.id === id) : null;
  const notesContent = typeof RichEditor !== "undefined" ? RichEditor.getHTML() : $("#notes").value.trim();
  $("#notes").value = notesContent;
  const topic = {
    ...(existing || {}),
    id: id || crypto.randomUUID(),
    title: $("#title").value.trim() || "Başlıksız",
    category: $("#category").value,
    status: normalizeStatus(dialog.dataset.status || "todo"),
    notes: notesContent,
    appearance: PageAppearance.get(),
    resource: $("#resource").value.trim(),
    parentTopicId: $("#parent-topic").value || null,
    updatedAt: Date.now()
  };
  state.topics = id ? state.topics.map(t => t.id === id ? topic : t) : [topic, ...state.topics];
  $("#edit-id").value = topic.id;
  editorState.topicId = topic.id;
  try { await save(dialog.dataset.statusChanged === "true" ? [topic.id] : []); } catch (error) {
    $("#save-hint").textContent = "Kaydedilemedi. Tekrar kaydetmeyi dene.";
    throw error;
  }
  if (revision !== editorRevision || !dialog.open) return;
  // Hata 6: kayıt zamanını damgala — 8 saniyelik grace period için
  dialog.dataset.statusChanged = "false";
  editorState.dirty = false;
  editorState.topicId = topic.id;
  editorState.savedAt = Date.now();
  $("#save-hint").textContent = "Kaydedildi";
  clearTimeout(saveHintTimer);
  saveHintTimer = setTimeout(() => { $("#save-hint").textContent = ""; }, 1800);
  render();

}

async function deleteTopicById(id) {
  if (!id) return;
  const existing = state.topics.find(t => t.id === id);
  if (!existing) return;
  const descendants = getTopicDescendantIds(id);
  const accepted = await askConfirmation({
    title: "Notu sil?",
    message: descendants.size ? `"${existing.title}" notuyla birlikte içindeki ${descendants.size} alt not da silinecek.` : `"${existing.title}" notu kalıcı olarak silinecek.`,
    accept: "Evet, sil",
    danger: true
  });
  if (!accepted) return;
  clearTimeout(autoSaveTimer);
  await editorSaveQueue.catch(() => {});
  if (dialog.open && $("#edit-id").value === id) {
    editorState.dirty = false;
    editorState.topicId = null;
    dialog.close();
  }
  markTopicDeleted(existing);
  const deletedIds = new Set([id, ...descendants]);
  state.topics.forEach(topic => { if (deletedIds.has(topic.id)) markTopicDeleted(topic); });
  state.topics = state.topics.filter(t => !deletedIds.has(t.id));
  await save();
  render();

}

async function deleteCurrent() {
  const id = $("#edit-id").value;
  if (!id) return;
  await deleteTopicById(id);
}

async function requestEditorClose() {
  try {
    await persistEditor();
    dialog.close();
    if (dialog.classList.contains("inline-document")) {
      $("#note-document-empty")?.classList.remove("hidden");
      renderNoteTree();
    }
  } catch { /* Keep the note open on storage failure. */ }
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
  markCategoryDeleted(category);
  state.categories = state.categories.filter(c => c !== category);
  state.topics = state.topics.filter(t => {
    const matches = t.category === category;
    if (matches) markTopicDeleted(t);
    return !matches;
  });
  if (state.categoryMetadata) delete state.categoryMetadata[category];
  await save();
  renderEditorCategories();
  renderCategories();
  renderModules();
  markDirty();

}

// ── Render ────────────────────────────────────────────────────────────────────
function setRoadmapVisibility(visible) {
  document.body.classList.toggle("roadmap-page", visible);
  $("#roadmap-view").classList.toggle("hidden", !visible);
  $("#tab-roadmap").classList.toggle("active", visible);
}

function renderRoadmapPage() {
  setRoadmapVisibility(true);
  $("#modules-view").classList.add("hidden");
  $("#topics-view").classList.add("hidden");
  $("#back-to-modules").classList.add("hidden");
  $("#page-title-avatar").classList.add("hidden");
  $("#page-section-code").textContent = "ÖĞRENME ROTASI";
  $("#page-title").textContent = "Roadmap";
  RoadmapBoard.show();
}

function render() {
  renderStats();
  if (state.activeTab === "roadmap") { renderRoadmapPage(); return; }
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
      $("#page-section-code").textContent = "ÇALIŞMA LİSTEM";
      $("#page-title").textContent = "Şu an çalıştıklarım";
    } else {
      $("#back-to-modules").classList.remove("hidden");
      $("#page-section-code").textContent = "ALAN KONULARI";
      $("#page-title").textContent = state.selectedCategory || "Konular";
    }
    renderTable();
  }
}

function renderStats() {
  const todayCount = StudyList.count();
  const badge = $("#today-count-badge");
  if (badge) badge.textContent = todayCount;
}

let moduleDrag = null;

async function persistModuleOrder() {
  const visibleOrder = [...$("#modules-grid").querySelectorAll(".module-card")].map(card => card.dataset.category);
  const hidden = state.categories.filter(category => !visibleOrder.includes(category));
  state.categories = [...visibleOrder, ...hidden];
  state.moduleOrder = [...state.categories];
  try {
    await storageSet({ categories: state.categories, moduleOrder: state.moduleOrder });
  } catch (error) {
    console.warn("Alan sırası kaydedilemedi:", error);
    showToast("Alan sırası kaydedilemedi", "error");
  }
}

function attachModuleDrag(card) {
  let holdTimer = null;
  let startX = 0;
  let startY = 0;

  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
  };

  card.addEventListener("pointerdown", event => {
    if (event.button !== 0 || event.target.closest("button, a")) return;
    startX = event.clientX;
    startY = event.clientY;
    const removeEarlyReleaseListeners = () => {
      document.removeEventListener("pointerup", releaseBeforeHold);
      document.removeEventListener("pointercancel", releaseBeforeHold);
    };
    const releaseBeforeHold = () => {
      removeEarlyReleaseListeners();
      cancelHold();
    };
    // Normal bir tıklamada pointerup, 180 ms'lik basılı-tutma süresinden önce gelir.
    // Zamanlayıcı burada iptal edilmezse kart, yeni sayfa açıldıktan sonra body'ye taşınıp hayalet olarak kalır.
    document.addEventListener("pointerup", releaseBeforeHold, { once: true });
    document.addEventListener("pointercancel", releaseBeforeHold, { once: true });
    holdTimer = setTimeout(() => {
      removeEarlyReleaseListeners();
      const grid = $("#modules-grid");
      const gridCards = [...grid.querySelectorAll(".module-card")];
      const slots = gridCards.map(item => {
        const slot = item.getBoundingClientRect();
        return { x: slot.left + slot.width / 2 + scrollX, y: slot.top + slot.height / 2 + scrollY };
      });
      const rect = card.getBoundingClientRect();
      const placeholder = document.createElement("div");
      placeholder.className = "module-placeholder";
      placeholder.setAttribute("aria-hidden", "true");
      placeholder.style.height = `${rect.height}px`;
      card.replaceWith(placeholder);
      document.body.append(card);
      moduleDrag = {
        card,
        placeholder,
        grid,
        slots,
        currentIndex: gridCards.indexOf(card),
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        moved: false,
        ending: false
      };
      card.classList.add("dragging-module");
      Object.assign(card.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
      document.body.classList.add("module-reordering");
      document.addEventListener("pointermove", moveDrag, { passive: false });
      document.addEventListener("pointerup", finish, { once: true });
      document.addEventListener("pointercancel", finish, { once: true });
      navigator.vibrate?.(20);
    }, 180);
  });

  function moveDrag(event) {
    if (!moduleDrag) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) > 8) cancelHold();
      return;
    }
    if (moduleDrag.card !== card) return;
    event.preventDefault();
    moduleDrag.moved = true;
    card.style.left = `${event.clientX - moduleDrag.offsetX}px`;
    card.style.top = `${event.clientY - moduleDrag.offsetY}px`;

    if (event.clientY < 70) window.scrollBy({ top: -14, behavior: "auto" });
    else if (event.clientY > innerHeight - 70) window.scrollBy({ top: 14, behavior: "auto" });

    const pointerX = event.clientX + scrollX;
    const pointerY = event.clientY + scrollY;
    const distances = moduleDrag.slots.map(slot => Math.hypot(pointerX - slot.x, pointerY - slot.y));
    const targetIndex = distances.indexOf(Math.min(...distances));
    const currentDistance = distances[moduleDrag.currentIndex];
    const targetDistance = distances[targetIndex];

    // Hysteresis keeps the placeholder stable around cell boundaries.
    if (targetIndex !== moduleDrag.currentIndex && targetDistance + 28 < currentDistance) {
      const cards = [...moduleDrag.grid.querySelectorAll(".module-card")];
      const reference = cards[targetIndex] || null;
      animateModuleShift(moduleDrag.grid, () => moduleDrag.grid.insertBefore(moduleDrag.placeholder, reference));
      moduleDrag.currentIndex = targetIndex;
    }
  }

  const finish = async event => {
    cancelHold();
    if (!moduleDrag || moduleDrag.card !== card || moduleDrag.ending) return;
    moduleDrag.ending = true;
    const drag = moduleDrag;
    document.removeEventListener("pointermove", moveDrag);
    document.removeEventListener("pointerup", finish);
    document.removeEventListener("pointercancel", finish);
    const destination = drag.placeholder.getBoundingClientRect();
    const current = card.getBoundingClientRect();
    const settle = card.animate([
      { transform: "scale(1.035)", left: `${current.left}px`, top: `${current.top}px` },
      { transform: "scale(1)", left: `${destination.left}px`, top: `${destination.top}px` }
    ], { duration: 170, easing: "cubic-bezier(.2,.8,.2,1)" });
    await settle.finished.catch(() => {});
    drag.placeholder.replaceWith(card);
    card.classList.remove("dragging-module");
    for (const property of ["left", "top", "width", "height"]) card.style.removeProperty(property);
    document.body.classList.remove("module-reordering");
    moduleDrag = null;
    card.dataset.suppressClick = "true";
    setTimeout(() => delete card.dataset.suppressClick, 0);
    if (drag.moved) await persistModuleOrder();
    event?.preventDefault();
  };
}

function animateModuleShift(grid, mutate) {
  const cards = [...grid.querySelectorAll(".module-card")];
  cards.forEach(item => item.getAnimations().forEach(animation => animation.cancel()));
  const before = new Map(cards.map(item => [item, item.getBoundingClientRect()]));
  mutate();
  for (const item of cards) {
    const previous = before.get(item);
    const next = item.getBoundingClientRect();
    const dx = previous.left - next.left;
    const dy = previous.top - next.top;
    if (dx || dy) item.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  }
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
      <p>Aşağıdaki düğmeyle bir çalışma alanı oluştur. Kaydettiğin sayfalar bağlı Obsidian kasana otomatik aktarılır.</p>
    `;
    container.append(emptyNotice);
  }

  activeCategories.forEach((cat, idx) => {
    const catTopics = state.topics.filter(t => t.category === cat);
    const total = catTopics.length;
    const done = catTopics.filter(t => normalizeStatus(t.status) === "done").length;
    const inProgress = catTopics.filter(t => normalizeStatus(t.status) === "in_progress").length;
    const review = catTopics.filter(t => normalizeStatus(t.status) === "review").length;
    const todayCount = catTopics.filter(t => isTodayTopic(t)).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    let statusText = "Başlanmadı";
    let statusClass = "status-todo";
    if (done === total && total > 0) {
      statusText = "Tamamlandı";
      statusClass = "status-done";
    } else if (done > 0 || inProgress > 0) {
      statusText = `%${percent}`;
      statusClass = "status-in_progress";
    }

    const meta = state.categoryMetadata?.[cat];
    let iconContent = DOODLE_PRESET_SVGS.folder;
    let iconClass = "doodle";

    if (meta?.iconType === "image" && meta.iconUrl) {
      iconContent = `<img src="${meta.iconUrl}" alt="${cat}" loading="lazy" />`;
      iconClass = "img";
    } else if (meta?.iconType === "preset" && DOODLE_PRESET_SVGS[meta.icon]) {
      iconContent = DOODLE_PRESET_SVGS[meta.icon];
      iconClass = "preset";
    } else if (meta?.iconType === "emoji" && meta.icon) {
      iconContent = `<span>${meta.icon}</span>`;
      iconClass = "emoji";
    }

    const iconHtml = `<button class="card-avatar-btn ${iconClass}" type="button" title="Profil Fotoğrafını Değiştir">${iconContent}</button>`;

    const card = document.createElement("div");
    card.className = "module-card";
    card.dataset.category = cat;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${displayAreaName(cat)} alanını aç. Sıralamak için basılı tutup sürükle.`);
    card.style.setProperty("--i", idx);
    card.onclick = () => { if (!card.dataset.suppressClick) openCategory(cat); };
    card.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCategory(cat); }
      if (event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const sibling = event.key === "ArrowLeft" ? card.previousElementSibling : card.nextElementSibling;
        if (sibling?.classList.contains("module-card")) {
          card.parentElement.insertBefore(card, event.key === "ArrowLeft" ? sibling : sibling.nextSibling);
          persistModuleOrder();
          card.focus();
        }
      }
    };
    attachModuleDrag(card);

    card.innerHTML = `
      <div class="card-top">
        <div class="card-head">
          <div class="card-head-left">
            ${iconHtml}
          </div>
          <div class="card-head-right">

            <button class="card-delete-btn" type="button" title="Alanı Sil" aria-label="Alanı Sil"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
        <h2 class="card-title"></h2>
      </div>
      <div class="card-bottom">
        <div class="card-progress-bar">
          <div class="card-progress-fill ${percent === 100 ? "done" : ""}" style="width: ${percent}%"></div>
        </div>
        <div class="card-footer">
          <span class="card-count">${total} konu${done ? ` · ${done} yapıldı` : ""}${inProgress ? ` · ${inProgress} yapılıyor` : ""}${review ? ` · ${review} tekrar` : ""}</span>
          ${todayCount > 0 ? `<span class="card-today-badge"> ${todayCount} listemde</span>` : `<span class="card-arrow">→</span>`}
        </div>
      </div>
    `;

    card.querySelector(".card-title").textContent = displayAreaName(cat);
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
  await StudyList.togglePage(topic);
  render();
}

function renderCategories() {
  const select = $("#category-select"), current = state.category;
  if (select) {
    const cats = ["Tümü", ...state.categories];
    select.replaceChildren(...cats.map(c => new Option(c, c)));
    select.value = cats.includes(current) ? current : "Tümü";
    if (!cats.includes(current)) state.category = "Tümü";
  }
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
    const norm = normalizeStatus(t.status);
    const filterStatus = normalizeStatus(state.status);
    const matchesStatus = state.status === "all" || norm === filterStatus;

    if (state.activeTab === "today") {
      if (state.boardScope === "all") {
        return matchesStatus && matchesQuery;
      }
      return isTodayTopic(t) && matchesStatus && matchesQuery;
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

function displayAreaName(name) {
  return String(name || "").replace(/^\d+\.\s*/, "").replace(/\s*\((?:Efor:.*|Kritik Efor.*)\)?$/i, "").trim();
}

function renderTodayList(topics) {
  const list = $("#today-list");
  if (!list) return;
  list.replaceChildren();
  const selected = state.topics.filter(t => isTodayTopic(t));
  const done = selected.filter(t => normalizeStatus(t.status) === "done").length;
  const inProgress = selected.filter(t => normalizeStatus(t.status) === "in_progress").length;
  const review = selected.filter(t => normalizeStatus(t.status) === "review").length;
  const todo = selected.filter(t => normalizeStatus(t.status) === "todo").length;

  const isScopeAll = state.boardScope === "all";
  if (isScopeAll) {
    const scopedTopics = state.topics;
    const aDone = scopedTopics.filter(t => normalizeStatus(t.status) === "done").length;
    const aProg = scopedTopics.filter(t => normalizeStatus(t.status) === "in_progress").length;
    const aRev = scopedTopics.filter(t => normalizeStatus(t.status) === "review").length;
    const aTodo = scopedTopics.filter(t => normalizeStatus(t.status) === "todo").length;
    $("#today-summary").textContent = `Tüm Müfredat (${scopedTopics.length}): ${aTodo} yapılacak · ${aProg} yapılıyor · ${aDone} yapıldı · ${aRev} tekrar`;
  } else {
    $("#today-summary").textContent = selected.length ? `${selected.length} odak seçili · ${done} yapıldı · ${inProgress} yapılıyor · ${review} tekrar` : "";
  }

  for (const topic of topics) {
    const item = document.createElement("article");
    item.className = "today-item";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "today-open";
    const category = document.createElement("span");
    category.textContent = displayAreaName(topic.category);
    const title = document.createElement("strong");
    title.textContent = topic.title;
    open.append(category, title);
    open.onclick = () => openForm(topic);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "today-remove";
    remove.textContent = "×";
    remove.title = "Bugünün listesinden çıkar";
    remove.setAttribute("aria-label", `${topic.title}: bugünün listesinden çıkar`);
    remove.onclick = () => toggleToday(topic);
    item.append(open, statusButtons(topic), remove);
    list.append(item);
  }
}

const collapsedNoteIds = new Set();
const saveNoteTreeState = () => storageSet({ collapsedNoteIds: [...collapsedNoteIds] });

async function createTreePage(parentTopic = null) {
  if (!state.selectedCategory) return openForm(null, parentTopic);
  if (dialog.open) await persistEditor().catch(() => {});
  const topic = {
    id: crypto.randomUUID(),
    title: "Başlıksız",
    category: parentTopic?.category || state.selectedCategory,
    parentTopicId: parentTopic?.id || null,
    status: "todo",
    notes: "",
    resource: "",
    today: false,
    updatedAt: Date.now()
  };
  if (parentTopic && collapsedNoteIds.delete(parentTopic.id)) await saveNoteTreeState();
  const parentIndex = parentTopic ? state.topics.findIndex(item => item.id === parentTopic.id) : -1;
  state.topics.splice(parentIndex >= 0 ? parentIndex + 1 : 0, 0, topic);
  await save();
  renderAreaWorkspace();
  openForm(topic, parentTopic);
  $("#title").select();
}

async function openTreeTopic(topic, parentTopic = null) {
  const currentId = $("#edit-id").value;
  if (dialog.open && currentId && currentId !== topic?.id) await persistEditor().catch(() => {});
  openForm(topic, parentTopic);
}

function renderNoteTree() {
  const list = $("#note-tree-list");
  if (!list || !state.selectedCategory) return;
  const topics = state.topics.filter(topic => topic.category === state.selectedCategory);
  const topicIds = new Set(topics.map(topic => topic.id));
  const childrenByParent = new Map();
  topics.forEach(topic => {
    const parentId = topicIds.has(topic.parentTopicId) ? topic.parentTopicId : null;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(topic);
  });
  const activeId = $("#edit-id").value;
  const visited = new Set();
  const markHiddenDescendants = topicId => {
    (childrenByParent.get(topicId) || []).forEach(child => {
      if (visited.has(child.id)) return;
      visited.add(child.id);
      markHiddenDescendants(child.id);
    });
  };

  const makeBranch = (topic, depth = 0) => {
    if (visited.has(topic.id)) return null;
    visited.add(topic.id);
    const children = childrenByParent.get(topic.id) || [];
    const branch = document.createElement("div");
    branch.className = "note-tree-branch";
    const row = document.createElement("div");
    row.className = `note-tree-row${activeId === topic.id && dialog.open ? " active" : ""}`;
    row.style.setProperty("--tree-depth", depth);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = `note-tree-toggle${children.length ? "" : " empty"}`;
    toggle.textContent = children.length ? (collapsedNoteIds.has(topic.id) ? "›" : "⌄") : "";
    toggle.setAttribute("aria-label", children.length ? "Alt sayfaları aç veya kapat" : "");
    if (children.length) toggle.setAttribute("aria-expanded", String(!collapsedNoteIds.has(topic.id)));
    toggle.onclick = event => {
      event.stopPropagation();
      if (!children.length) return;
      if (collapsedNoteIds.has(topic.id)) collapsedNoteIds.delete(topic.id);
      else collapsedNoteIds.add(topic.id);
      saveNoteTreeState().catch(error => {
        console.error("Alt sayfa görünümü kaydedilemedi:", error);
        showToast("Alt sayfa görünümü kaydedilemedi", "error");
      });
      renderNoteTree();
    };

    const open = document.createElement("button");
    open.type = "button";
    open.className = "note-tree-open";
    open.innerHTML = "<span></span>";
    open.querySelector("span").textContent = topic.title;
    open.onclick = () => openTreeTopic(topic);

    const currentStatus = normalizeStatus(topic.status);
    row.className = `note-tree-row status-${currentStatus}${activeId === topic.id && dialog.open ? " active" : ""}`;

    const add = document.createElement("button");
    add.type = "button";
    add.className = "note-tree-add-child";
    add.textContent = "+";
    add.title = "Alt sayfa ekle";
    add.setAttribute("aria-label", `${topic.title} içine alt sayfa ekle`);
    add.onclick = event => { event.stopPropagation(); createTreePage(topic); };
    row.append(toggle, open, add);
    branch.append(row);

    if (children.length && !collapsedNoteIds.has(topic.id)) {
      const group = document.createElement("div");
      group.className = "note-tree-children";
      children.forEach(child => {
        const childBranch = makeBranch(child, depth + 1);
        if (childBranch) group.append(childBranch);
      });
      branch.append(group);
    } else if (children.length) {
      markHiddenDescendants(topic.id);
    }
    return branch;
  };

  const fragment = document.createDocumentFragment();
  (childrenByParent.get(null) || []).forEach(topic => fragment.append(makeBranch(topic, 0)));
  topics.forEach(topic => {
    if (!visited.has(topic.id)) fragment.append(makeBranch(topic, 0));
  });
  list.replaceChildren(fragment);
}

function renderAreaWorkspace() {
  const topics = state.topics.filter(topic => topic.category === state.selectedCategory);
  const done = topics.filter(t => normalizeStatus(t.status) === "done").length;
  const inProgress = topics.filter(t => normalizeStatus(t.status) === "in_progress").length;
  const review = topics.filter(t => normalizeStatus(t.status) === "review").length;
  $("#note-tree-title").textContent = displayAreaName(state.selectedCategory);
  $("#note-tree-count").textContent = `${topics.length} konu · ${done} yapıldı${inProgress ? ` · ${inProgress} yapılıyor` : ""}${review ? ` · ${review} tekrar` : ""}`;
  renderNoteTree();

  const current = state.topics.find(topic => topic.id === $("#edit-id").value);
  const editorMatchesArea = dialog.open && dialog.classList.contains("inline-document") && current?.category === state.selectedCategory;
  $("#note-document-empty").classList.toggle("hidden", editorMatchesArea);
  if (!editorMatchesArea && topics.length) queueMicrotask(() => openTreeTopic(topics[0]));
}

function createKanbanCard(topic) {
  const card = document.createElement("article");
  card.className = "kanban-card";
  card.dataset.id = topic.id;
  card.draggable = true;
  const currentStatus = normalizeStatus(topic.status);
  card.dataset.status = currentStatus;

  // Sürükle ve bırak
  card.ondragstart = e => {
    state.draggedId = topic.id;
    card.classList.add("dragging");
    e.dataTransfer.setData("text/plain", topic.id);
    e.dataTransfer.effectAllowed = "move";
  };
  card.ondragend = () => {
    state.draggedId = null;
    card.classList.remove("dragging");
    $$(".kanban-cards.drag-over").forEach(el => el.classList.remove("drag-over"));
  };

  // Kart başlık şeridi: Alan rozeti + Yıldız
  const top = document.createElement("div");
  top.className = "kanban-card-top";

  const areaBadge = document.createElement("span");
  areaBadge.className = "kanban-card-area";
  areaBadge.textContent = displayAreaName(topic.category);
  areaBadge.title = topic.category;

  top.append(areaBadge);

  // Başlık
  const title = document.createElement("h4");
  title.className = "kanban-card-title";
  title.textContent = topic.title;

  // Not önizlemesi
  const plainNotes = (topic.notes || "").replace(/<[^>]*>/g, " ").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  let previewEl = null;
  if (plainNotes) {
    previewEl = document.createElement("p");
    previewEl.className = "kanban-card-preview";
    previewEl.textContent = plainNotes;
  }

  // Kaynak bağlantısı
  const meta = document.createElement("div");
  meta.className = "kanban-card-meta";
  if (topic.resource) {
    const link = document.createElement("a");
    link.href = topic.resource;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "resource-icon-link";
    link.title = `Kaynağı aç: ${topic.resource}`;
    link.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
    link.onclick = e => e.stopPropagation();
    meta.append(link);
  }
  const dateSpan = document.createElement("span");
  dateSpan.className = "kanban-card-date";
  dateSpan.textContent = new Date(topic.updatedAt).toLocaleDateString("tr-TR");
  meta.append(dateSpan);

  // Alt bilgi: 4 duruma 1 tıkla geçiş (stepper) + silme
  const footer = document.createElement("div");
  footer.className = "kanban-card-footer";

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "kanban-card-del";
  delBtn.title = "Konuyu Sil";
  delBtn.setAttribute("aria-label", `${topic.title} konusunu sil`);
  delBtn.innerHTML = "✕";
  delBtn.onclick = e => {
    e.stopPropagation();
    deleteTopicById(topic.id);
  };

  footer.append(delBtn);

  card.append(top, title);
  if (previewEl) card.append(previewEl);
  card.append(meta, footer);

  card.onclick = () => openForm(topic);

  return card;
}

function renderKanbanBoard(container, topics) {
  if (!container) return;
  container.replaceChildren();

  if (topics.length === 0 && state.activeTab === "today") {
    const banner = document.createElement("div");
    banner.className = "kanban-empty-banner";
    banner.innerHTML = `
      <div class="kanban-empty-illustration">
        <svg class="doodle-star-big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2.5 2.9 6.2 6.6.9-4.9 4.6 1.3 6.6-5.9-3.3-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.9L12 2.5Z"/></svg>
      </div>
      <h3>Panon hazır, şimdi çalışacağın konuları seç!</h3>
      <p>Müfredattaki 12 aşamadan dilediğin konuları panona ekleyerek çalışmaya başla.</p>
      <button class="primary board-add-btn" type="button">⭐ Müfredattan Konu Seç</button>
    `;
    const btn = banner.querySelector("button");
    if (btn) btn.onclick = () => openTopicPicker();
    container.append(banner);
  }

  const grouped = {
    todo: [],
    in_progress: [],
    done: [],
    review: []
  };

  topics.forEach(topic => {
    const norm = normalizeStatus(topic.status);
    if (grouped[norm]) grouped[norm].push(topic);
    else grouped.todo.push(topic);
  });

  STATUS_KEYS.forEach(statusKey => {
    const col = document.createElement("div");
    col.className = "kanban-column";
    col.dataset.status = statusKey;

    const colHeader = document.createElement("div");
    colHeader.className = "kanban-column-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "kanban-column-title-wrap";

    const icon = document.createElement("span");
    icon.className = "kanban-column-icon";
    icon.innerHTML = STATUS_ICONS[statusKey];

    const title = document.createElement("h3");
    title.className = "kanban-column-title";
    title.textContent = STATUS_FULL[statusKey];

    const count = document.createElement("span");
    count.className = "kanban-column-count";
    count.textContent = grouped[statusKey].length;

    titleWrap.append(icon, title, count);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "kanban-column-add";
    addBtn.title = `${STATUS_FULL[statusKey]} içine yeni konu ekle`;
    addBtn.setAttribute("aria-label", addBtn.title);
    addBtn.textContent = "+";
    addBtn.onclick = () => openForm(null, null, statusKey);

    if (statusKey === "todo" && grouped.todo.length > 0) {
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "kanban-column-clear";
      clearBtn.title = "Yapılacakları temizle";
      clearBtn.setAttribute("aria-label", "Yapılacakları temizle");
      clearBtn.innerHTML = `<svg class="doodle-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      clearBtn.onclick = async () => {
        if (confirm(`${grouped.todo.length} adet yapılacak konuyu temizlemek istediğinize emin misiniz?`)) {
          await window.clearTodoTopics();
        }
      };
      colHeader.append(titleWrap, clearBtn, addBtn);
    } else {
      colHeader.append(titleWrap, addBtn);
    }

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "kanban-cards";
    cardsContainer.dataset.status = statusKey;

    cardsContainer.ondragover = e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      cardsContainer.classList.add("drag-over");
    };
    cardsContainer.ondragleave = e => {
      if (!cardsContainer.contains(e.relatedTarget)) {
        cardsContainer.classList.remove("drag-over");
      }
    };
    cardsContainer.ondrop = async e => {
      e.preventDefault();
      cardsContainer.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain") || state.draggedId;
      if (!id) return;
      const movedTopic = state.topics.find(t => t.id === id);
      if (movedTopic && normalizeStatus(movedTopic.status) !== statusKey) {
        await updateStatus(movedTopic, statusKey);
      }
    };

    if (grouped[statusKey].length === 0) {
      const empty = document.createElement("div");
      empty.className = "kanban-empty";
      empty.textContent = "Bu durumda konu yok";
      cardsContainer.append(empty);
    } else {
      grouped[statusKey].forEach(t => {
        cardsContainer.append(createKanbanCard(t));
      });
    }

    col.append(colHeader, cardsContainer);
    container.append(col);
  });
}

function renderAreaBoard() {
  const kanbanView = $("#kanban-view");
  const kanbanBoard = $("#kanban-view-board");
  if (!kanbanView || !kanbanBoard) return;

  const topics = state.topics.filter(t => t.category === state.selectedCategory);
  const done = topics.filter(t => normalizeStatus(t.status) === "done").length;
  const inProgress = topics.filter(t => normalizeStatus(t.status) === "in_progress").length;
  const review = topics.filter(t => normalizeStatus(t.status) === "review").length;
  const todo = topics.filter(t => normalizeStatus(t.status) === "todo").length;

  const summaryEl = $("#area-board-summary");
  if (summaryEl) {
    summaryEl.textContent = `${displayAreaName(state.selectedCategory)} (${topics.length}): ${todo} yapılacak · ${inProgress} yapılıyor · ${done} yapıldı · ${review} tekrar`;
  }

  renderKanbanBoard(kanbanBoard, topics);
}

function renderTable() {
  const isStudyView = state.activeTab === "today";
  $("#topics-view").classList.toggle("study-mode", isStudyView);
  $("#study-list").classList.toggle("hidden", !isStudyView);
  if (isStudyView) { StudyList.render(); return; }
  const isAreaWorkspace = Boolean(state.selectedCategory && state.activeTab !== "today");
  const isAreaBoardMode = false;
  $("#topics-view").classList.toggle("area-mode", isAreaWorkspace);
  $("#topics-view").classList.toggle("area-board-mode", isAreaBoardMode);
  $("#area-workspace").classList.toggle("hidden", !isAreaWorkspace || isAreaBoardMode);
  const kanbanView = $("#kanban-view");
  if (kanbanView) kanbanView.classList.toggle("hidden", !isAreaBoardMode);

  if (isAreaWorkspace) {
    if (isAreaBoardMode) {
      renderAreaBoard();
    } else {
      renderAreaWorkspace();
    }
    return;
  }
  $("#table-view").classList.toggle("within-area", Boolean(state.selectedCategory));
  const isTodayTab = state.activeTab === "today";
  $("#today-focus").classList.toggle("hidden", !isTodayTab);

  // Görünüm modu butonları
  const isBoardView = state.viewMode !== "table";
  const boardBtn = $("#view-mode-board");
  const tableBtn = $("#view-mode-table");
  if (boardBtn) boardBtn.classList.toggle("active", isBoardView);
  if (tableBtn) tableBtn.classList.toggle("active", !isBoardView);

  // Pano kapsam butonları
  const scopeTodayBtn = $("#board-scope-today");
  const scopeAllBtn = $("#board-scope-all");
  const isScopeAll = state.boardScope === "all";
  if (scopeTodayBtn) scopeTodayBtn.classList.toggle("active", !isScopeAll);
  if (scopeAllBtn) scopeAllBtn.classList.toggle("active", isScopeAll);

  const todayTopicsTotal = state.topics.filter(t => isTodayTopic(t)).length;
  const currentCategoryTotal = state.selectedCategory ? state.topics.filter(t => t.category === state.selectedCategory).length : state.topics.length;
  const visible = getVisible();
  const orderedVisible = state.selectedCategory ? orderTopicsHierarchically(visible) : visible.map(topic => ({ topic, depth: 0 }));
  const totalPages = Math.max(1, Math.ceil(orderedVisible.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const pageTopics = orderedVisible.slice(start, start + state.pageSize);

  const isGlobalEmpty = !isTodayTab && currentCategoryTotal === 0;
  const isTodayEmpty = isTodayTab && !isScopeAll && todayTopicsTotal === 0;
  const isNoResults = !isGlobalEmpty && !isTodayEmpty && visible.length === 0;

  $("#result-count").textContent = visible.length;
  $("#empty-state").classList.toggle("hidden", !isGlobalEmpty);
  const todayEmptyEl = $("#today-empty");
  if (todayEmptyEl) todayEmptyEl.classList.add("hidden");
  $("#no-results").classList.toggle("hidden", !isNoResults);

  if (isTodayTab) {
    const kanbanEl = $("#kanban-board");
    const todayListEl = $("#today-list");
    if (kanbanEl) {
      kanbanEl.classList.toggle("hidden", !isBoardView);
      if (isBoardView) {
        renderKanbanBoard(kanbanEl, visible);
      }
    }
    if (todayListEl) {
      todayListEl.classList.toggle("hidden", isBoardView);
    }
    // Testlerin ve erişilebilirliğin bozulmaması için today-list her zaman doldurulur
    renderTodayList(visible);
    $("#table-view").classList.add("hidden");
    const kanbanView = $("#kanban-view");
    if (kanbanView) kanbanView.classList.add("hidden");
  } else {
    // Alan içi veya genel tablo
    const kanbanView = $("#kanban-view");
    const kanbanBoard = $("#kanban-view-board");
    if (isBoardView) {
      if (kanbanView) kanbanView.classList.toggle("hidden", isGlobalEmpty || isNoResults);
      if (kanbanBoard && !isGlobalEmpty && !isNoResults) {
        renderKanbanBoard(kanbanBoard, visible);
      }
      $("#table-view").classList.add("hidden");
    } else {
      if (kanbanView) kanbanView.classList.add("hidden");
      $("#table-view").classList.toggle("hidden", isGlobalEmpty || isNoResults);
      $("#topic-table-body").replaceChildren(...pageTopics.map(({ topic, depth }, index) => createRow(topic, start + index, depth)));
    }
  }

  renderPagination(visible.length, totalPages);
  if (isBoardView && isTodayTab) {
    $("#pagination").classList.add("hidden");
  }
}

function statusButtons(topic) {
  const label = document.createElement("span");
  label.className = `status-label status-${normalizeStatus(topic.status)}`;
  label.textContent = STATUS[normalizeStatus(topic.status)];
  return label;
}

async function updateStatus(topic, status) {
  // Finish any pending body save before a picker changes this page's status.
  await persistEditor();
  const current = state.topics.find(page => page.id === topic.id);
  if (!current) throw new Error("Sayfa bulunamadı.");
  current.status = normalizeStatus(status);
  current.updatedAt = Date.now();
  if (dialog.open && $("#edit-id").value === current.id) {
    dialog.dataset.status = current.status;
    renderEditorStatus();
  }
  await save([current.id]);
  render();
}

function createRow(topic, index, depth = 0) {
  const tr = document.createElement("tr");
  tr.dataset.id = topic.id;
  tr.draggable = true;
  tr.innerHTML = `<td class="drag-cell"><button class="drag-handle" type="button" aria-label="${topic.title} konusunu taşı">⠿</button></td><td class="row-number"></td><td class="table-title"></td><td class="area-column"><span class="category-pill"></span></td><td></td><td class="table-notes"></td><td class="table-date"></td><td><button class="row-action">Düzenle</button></td>`;
  tr.children[1].textContent = String(index + 1).padStart(2, "0");

  const titleWrap = document.createElement("div");
  titleWrap.className = "title-wrap";
  titleWrap.style.setProperty("--topic-depth", depth);

  if (depth) {
    const connector = document.createElement("span");
    connector.className = "child-note-connector";
    connector.textContent = "↳";
    connector.setAttribute("aria-hidden", "true");
    titleWrap.append(connector);
  }

  const titleSpan = document.createElement("span");
  titleSpan.textContent = topic.title;
  titleWrap.append(titleSpan);
  const childButton = document.createElement("button");
  childButton.type = "button";
  childButton.className = "add-child-note";
  childButton.title = "Bu notun içine alt not ekle";
  childButton.setAttribute("aria-label", `${topic.title} içine alt not ekle`);
  childButton.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  childButton.onclick = event => { event.stopPropagation(); openForm(null, topic); };
  titleWrap.append(childButton);
  if (topic.resource) {
    const link = document.createElement("a");
    link.href = topic.resource;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "resource-icon-link";
    link.title = `Kaynağı aç: ${topic.resource}`;
    link.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1-6 0"/></svg>';
    link.setAttribute("aria-label", link.title);
    link.onclick = e => e.stopPropagation();
    titleWrap.append(link);
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
  $("#theme-toggle").title = isPink ? "Koyu temaya geç" : "Pembe temaya geç";
  $("#theme-toggle").setAttribute("aria-label", $("#theme-toggle").title);
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

function normalizeCurriculumCategory(name) {
  return CurriculumAreas.canonical(name, NOTMONK_CATEGORIES, state.areaAliases);
}

function bindTopicPickerEvents() {
  const button = $("#open-topic-picker-btn");
  if (button) button.onclick = () => StudyList.pagePicker();
}

window.clearTodoTopics = async function() {
  const remaining = state.topics.filter(t => normalizeStatus(t.status) !== "todo");
  const count = state.topics.length - remaining.length;
  state.topics = remaining;
  const curPrefs = (await storageGet(["preferences"])).preferences || {};
  curPrefs.clearedInitialTodo = true;
  await storageSet({ topics: state.topics, preferences: curPrefs });
  renderTable();
  console.log(`[NotMonk] ${count} adet "Yapılacak" konu başarıyla temizlendi.`);
  return count;
};

init().catch(showStartupFailure);
