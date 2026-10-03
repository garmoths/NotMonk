const STATUS = { todo: "Başlamadım", learning: "Öğreniyorum", done: "Öğrendim" };
const STATUS_ORDER = { todo: 0, learning: 1, done: 2 };

const ROADMAP_VERSION = 15;
const RECOVERY_SNAPSHOT_ID = "brave-2026-09-18-1850";
const starterTopics = NOTMONK_ROADMAP.map((topic, index) => ({ ...topic, id: crypto.randomUUID(), status: "todo", updatedAt: Date.now() - index * 1000 }));
const starterIdsByCurriculumKey = new Map(starterTopics.filter(topic => topic.curriculumKey).map(topic => [topic.curriculumKey, topic.id]));
starterTopics.forEach(topic => {
  if (topic.parentCurriculumKey) topic.parentTopicId = starterIdsByCurriculumKey.get(topic.parentCurriculumKey) || null;
});
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
// Hata 12: per-topic editor state (global boolean yerine)
const editorState = { dirty: false, topicId: null, savedAt: 0 };
let autoSaveTimer, saveHintTimer, editorRevision = 0;
let editorSaveQueue = Promise.resolve();
// Geriye dönük uyumluluk için — tüm isEditorDirty referansları editorState.dirty kullanır
Object.defineProperty(window, 'isEditorDirty', {
  get() { return editorState.dirty; },
  set(v) { editorState.dirty = v; }
});
let isSyncingNotion = false;

// Hata 5: per-topic debounce için timer map
const _notionSyncTimers = {};

// Hata 5: debounced sync fonksiyonu — status/today değişimlerinde kullanılır
function debouncedSyncTopicToNotion(topic, delay = 1500) {
  clearTimeout(_notionSyncTimers[topic.id]);
  _notionSyncTimers[topic.id] = setTimeout(() => {
    delete _notionSyncTimers[topic.id];
    syncTopicToNotion(topic);
  }, delay);
}

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
const storageSet = value => new Promise((resolve, reject) => {
  if (globalThis.chrome?.storage?.local) return chrome.storage.local.set(value, () => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve();
  });
  Object.entries(value).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  resolve();
});
const save = () => storageSet({
  topics: state.topics,
  categories: state.categories,
  categoryMetadata: state.categoryMetadata,
  areaMapping: state.areaMapping,
  umbrellaPageId: state.umbrellaPageId,
  deletedTopicKeys: state.deletedTopicKeys || [],
  deletedCategoryKeys: state.deletedCategoryKeys || []
});
const savePreferences = () => storageSet({ preferences: { category: state.category, status: state.status, sort: state.sort, theme: state.theme, roadmapVersion: ROADMAP_VERSION, activeTab: state.activeTab } });
const saveNotionStorage = () => storageSet({ notionConfig: { token: state.notionToken, dbId: state.notionDbId, autoSync: state.notionAutoSync, umbrellaPageId: state.umbrellaPageId } });

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
        notionPageId: null,
        notionUrl: null,
        notionParentPageId: null,
        recoveredFromLocalBackup: RECOVERY_SNAPSHOT_ID,
        updatedAt: backup.updatedAt || Date.now()
      });
      added++;
      continue;
    }
    const currentNotes = String(match.notes || "");
    const backupNotes = String(backup.notes || "");
    if (currentNotes === backupNotes || currentNotes.includes(backupNotes)) continue;
    if (!currentNotes.trim()) {
      match.notes = backupNotes;
    } else if (noteTextLength(backupNotes) > noteTextLength(currentNotes)) {
      match.notes = `${backupNotes}<hr><h2>Kurtarma öncesindeki güncel sürüm</h2>${currentNotes}`;
    } else {
      match.notes = `${currentNotes}<hr><h2>Kurtarılan önceki notlar</h2>${backupNotes}`;
    }
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
  const backups = Array.isArray(saved.safetyBackups) ? saved.safetyBackups : [];
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

function mergeNotionNotesLosslessly(localNotes = "", remoteNotes = "") {
  const local = String(localNotes || "").trim();
  const remote = String(remoteNotes || "").trim();
  if (!remote) return local;
  if (!local) return remote;
  if (local === remote || local.includes(remote)) return local;
  if (remote.includes(local)) return remote;
  return `${local}<hr><h2>Notion'dan gelen notlar</h2>${remote}`;
}

function findMatchingLocalTopic(remote) {
  const remoteId = remote.notionPageId ? NotionAPI.cleanDatabaseId(remote.notionPageId) : "";
  if (remoteId) {
    const exact = state.topics.find(topic => topic.notionPageId && NotionAPI.cleanDatabaseId(topic.notionPageId) === remoteId);
    if (exact) return exact;
  }
  const remoteParentId = remote.notionParentPageId ? NotionAPI.cleanDatabaseId(remote.notionParentPageId) : "";
  const mappedAreaId = state.areaMapping?.[remote.category]?.id || state.areaMapping?.[remote.category] || "";
  const remoteIsRoot = !remoteParentId || (mappedAreaId && NotionAPI.cleanDatabaseId(mappedAreaId) === remoteParentId);
  return state.topics.find(topic => {
    if (normalizedTopicText(topic.category) !== normalizedTopicText(remote.category)) return false;
    if (normalizedTopicText(topic.title) !== normalizedTopicText(remote.title)) return false;
    const localParent = topic.parentTopicId ? state.topics.find(candidate => candidate.id === topic.parentTopicId) : null;
    if (remoteIsRoot) return !localParent;
    return Boolean(localParent?.notionPageId && NotionAPI.cleanDatabaseId(localParent.notionPageId) === remoteParentId);
  });
}

function reconcileTopicDuplicates() {
  let removed = 0;
  let merged = true;
  while (merged) {
    merged = false;
    const groups = new Map();
    for (const topic of state.topics) {
      const parent = topic.parentTopicId ? state.topics.find(candidate => candidate.id === topic.parentTopicId) : null;
      const parentKey = parent ? (parent.notionPageId ? `n:${NotionAPI.cleanDatabaseId(parent.notionPageId)}` : `t:${normalizedTopicText(parent.title)}`) : "root";
      const key = `${normalizedTopicText(topic.category)}|${parentKey}|${normalizedTopicText(topic.title)}`;
      const other = groups.get(key);
      if (!other) { groups.set(key, topic); continue; }
      const sameRemote = topic.notionPageId && other.notionPageId && NotionAPI.cleanDatabaseId(topic.notionPageId) === NotionAPI.cleanDatabaseId(other.notionPageId);
      const oneIsUnlinked = !topic.notionPageId || !other.notionPageId;
      if (!sameRemote && !oneIsUnlinked) continue;

      const primary = !other.notionPageId ? other : (!topic.notionPageId ? topic : other);
      const duplicate = primary === other ? topic : other;
      if (!primary.notionPageId && duplicate.notionPageId) {
        primary.notionPageId = duplicate.notionPageId;
        primary.notionUrl = duplicate.notionUrl;
        primary.notionLastEditedTime = duplicate.notionLastEditedTime;
        primary.notionParentPageId = duplicate.notionParentPageId || primary.notionParentPageId || null;
      }
      primary.notes = mergeNotionNotesLosslessly(primary.notes, duplicate.notes);
      primary.updatedAt = Math.max(primary.updatedAt || 0, duplicate.updatedAt || 0);
      state.topics.forEach(child => { if (child.parentTopicId === duplicate.id) child.parentTopicId = primary.id; });
      state.topics = state.topics.filter(candidate => candidate.id !== duplicate.id);
      if ($("#edit-id")?.value === duplicate.id) $("#edit-id").value = primary.id;
      removed++;
      merged = true;
      break;
    }
  }
  return removed;
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
    const cleanPid = NotionAPI.cleanDatabaseId(topic.notionPageId);
    if (!state.deletedTopicKeys.includes(cleanPid)) {
      state.deletedTopicKeys.push(cleanPid);
    }
  }
  storageSet({ deletedTopicKeys: state.deletedTopicKeys });
}

// Eski C müfredatı Notion'da metadata olmadan yalnız başlıkla dönebilir.
function isRetiredCLesson(topic) {
  if (!topic) return false;
  const title = String(topic.title || "").trim();
  const isCCategory = /^15\.\s*C Programlama(?:\s|$)/i.test(topic.category || "");
  const isCTitle = /^15\.\d/.test(title);
  if (!isCCategory && !isCTitle) return false;
  if (topic.curriculumKey?.startsWith("c-") && !topic.curriculumKey.startsWith("c-guide-")) return true;
  if (isCTitle && /\((?:N|K|N\+K)\)(?:\s*— Kişisel Notlar)?$/.test(title)) return true;
  return ["15.1 C Temelleri & Derleme", "15.2 Pointer, Bellek & Veri Yapıları",
    "15.3 Sistem Programlama & Debug", "15.4 C Bitirme Projesi"].includes(title);
}

function isTopicDeleted(t) {
  if (starterTopics.length && isRetiredCLesson(t)) return true;
  if (!t || !state.deletedTopicKeys || state.deletedTopicKeys.length === 0) return false;
  if (t.id && state.deletedTopicKeys.includes(t.id)) return true;
  if (t.title && state.deletedTopicKeys.includes(t.title.trim().toLowerCase())) return true;
  if (t.notionPageId && state.deletedTopicKeys.includes(NotionAPI.cleanDatabaseId(t.notionPageId))) return true;
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
  const saved = await storageGet(["topics", "preferences", "categories", "moduleOrder", "notionConfig", "categoryMetadata", "areaMapping", "umbrellaPageId", "deletedTopicKeys", "deletedCategoryKeys", "recoveryApplied", "safetyBackups", "collapsedNoteIds"]);
  await archiveSafetySnapshot(saved);

  collapsedNoteIds.clear();
  if (Array.isArray(saved.collapsedNoteIds)) {
    saved.collapsedNoteIds.filter(id => typeof id === "string").forEach(id => collapsedNoteIds.add(id));
  }
  state.categoryMetadata = saved.categoryMetadata || {};
  for (const [index, category] of NOTMONK_CATEGORIES.entries()) {
    const custom = state.categoryMetadata[category];
    // Preserve user-uploaded images; replace default/emoji placeholders with the doodle set.
    if (!(custom?.iconType === "image" && custom?.iconUrl && !custom.iconUrl.includes("assets/category-icons/"))) {
      state.categoryMetadata[category] = {
        ...(custom || {}),
        icon: "",
        iconUrl: NOTMONK_CATEGORY_ICON_URLS[index],
        iconType: "image"
      };
    }
  }
  state.areaMapping = saved.areaMapping || {};
  state.umbrellaPageId = saved.notionConfig?.umbrellaPageId || saved.umbrellaPageId || "";
  state.deletedTopicKeys = Array.isArray(saved.deletedTopicKeys) ? saved.deletedTopicKeys : [];
  state.deletedCategoryKeys = Array.isArray(saved.deletedCategoryKeys) ? saved.deletedCategoryKeys : [];

  // ── Eski Seviyesiz Kategorileri ve Klon Konuları Temizleme ──
  const oldCategoryNames = [
    "0. Profesyonel Temel",
    "1. Programlama & CS",
    "2. Ağ & Web Temeli",
    "3. Backend & Database",
    "4. Application Security",
    "5. DevSecOps & Cloud",
    "6. Pentest & Red Team",
    "7. LLM & AI Engineering",
    "8. AI AppSec",
    "9. AI Red Teaming",
    "10. MLSecOps",
    "11. Detection & IR",
    "12. Portfolyo & İş Bulma",
    "13. Zaman Planı & Rota"
  ];

  const categoryMigrationMap = {
    "0. Profesyonel Temel": "0. GitHub & Açık Kaynak (Efor: 8/10)",
    "0. Profesyonel Temel (Efor: 7/10)": "0. GitHub & Açık Kaynak (Efor: 8/10)",
    "1. Programlama & CS": "1. CI/CD & Yazılım Teslimatı (Efor: 9/10)",
    "1. Programlama & CS (Efor: 9/10)": "1. CI/CD & Yazılım Teslimatı (Efor: 9/10)",
    "2. Ağ & Web Temeli": "2. Ağ & Web Temeli (Efor: 6/10)",
    "3. Backend & Database": "3. Backend & Database (Efor: 9/10)",
    "4. Application Security": "4. Application Security (Efor: 8/10)",
    "5. DevSecOps & Cloud": "5. DevSecOps & Cloud (Efor: 5/10)",
    "6. Pentest & Red Team": "6. Pentest & Red Team (Efor: 5/10)",
    "7. LLM & AI Engineering": "7. LLM & AI Engineering (Efor: 6/10)",
    "8. AI AppSec": "8. AI AppSec (Efor: 7/10)",
    "9. AI Red Teaming": "9. AI Red Teaming (Efor: 4/10)",
    "10. MLSecOps": "10. MLSecOps (Efor: 2/10)",
    "11. Detection & IR": "11. Detection & IR (Efor: 2/10)",
    "12. Portfolyo & İş Bulma": "12. Linux & Otomasyon (Efor: 8/10)",
    "12. Portfolyo & İş Bulma (Efor: 9/10)": "12. Linux & Otomasyon (Efor: 8/10)",
    "13. Zaman Planı & Rota": "13. Üretim Projesi & Operasyon (Efor: 9/10)",
    "13. Zaman Planı & Rota (Kritik Efor)": "13. Üretim Projesi & Operasyon (Efor: 9/10)"
  };

  // Eski C notlarını kullanıcının istediği başlangıç sırasıyla bir kez değiştir.
  const replaceOldCNotes = starterTopics.length > 0 && (saved.preferences?.roadmapVersion || 0) < 14;
  const isOldCNote = topic => /^15\. C Programlama(?:\s|$)/.test(topic.category || "");
  // Silinen notların kimliklerini de sakla: uzakta yeniden adlandırılsa bile dönmesin.
  for (const topic of (Array.isArray(saved.topics) ? saved.topics : [])) {
    if ((replaceOldCNotes && isOldCNote(topic)) || (starterTopics.length && isRetiredCLesson(topic))) {
      markTopicDeleted(topic);
    }
  }
  const rawSavedTopics = Array.isArray(saved.topics)
    ? saved.topics.filter(topic => !replaceOldCNotes || !isOldCNote(topic))
    : starterTopics;
  const rawSavedCategories = Array.isArray(saved.categories) ? saved.categories : [...DEFAULT_CATEGORIES];

  const hasSavedTopics = Array.isArray(saved.topics) && saved.topics.length > 0;
  const isMigrated = saved.preferences?.roadmapVersion === ROADMAP_VERSION;

  if (hasSavedTopics && (isMigrated || starterTopics.length === 0)) {
    // F5 veya sayfa yenilenmesi: Kaydedilmiş konuları kullan, silinmiş olanları ASLA geri yükleme!
    state.topics = saved.topics.filter(t => !isTopicDeleted(t));
  } else {
    // 1. Konulardaki eski seviyesiz kategori isimlerini yeni seviyeli isimlere güncelle
    rawSavedTopics.forEach(t => {
      if (t.category && categoryMigrationMap[t.category.trim()]) {
        t.category = categoryMigrationMap[t.category.trim()];
      }
    });

    // 2. Mükerrer (duplicate) konuları temizle
    const topicMap = new Map();
    rawSavedTopics.forEach(t => {
      if (t.title) topicMap.set(t.title.trim().toLowerCase(), t);
    });

    state.topics = [];
    starterTopics.forEach(starter => {
      if (isTopicDeleted(starter)) return; // Silinmişse diriltme!
      const match = topicMap.get(starter.title.trim().toLowerCase());
      if (match) {
        if (!isTopicDeleted(match)) {
          state.topics.push({
            ...starter,
            id: match.id || starter.id,
            status: match.status || starter.status,
            today: Boolean(match.today),
            notionPageId: match.notionPageId || null,
            notionUrl: match.notionUrl || null,
            notionLastEditedTime: match.notionLastEditedTime || null,
            parentTopicId: match.parentTopicId || null,
            notionParentPageId: match.notionParentPageId || null,
            _lastPushedToNotion: match._lastPushedToNotion || null,
            notes: mergeCurriculumNotes(match.notes, starter.notes, Boolean(match.curriculumKey && starter.curriculumKey)),
            resource: match.resource || starter.resource
          });
        }
      } else {
        state.topics.push(starter);
      }
    });

    // Kullanıcının kendisinin eklediği özel konuları da koru (default konular dışında)
    rawSavedTopics.forEach(t => {
      if (isTopicDeleted(t)) return;
      const isDefault = starterTopics.some(s => s.title.trim().toLowerCase() === (t.title || "").trim().toLowerCase());
      const isRetiredCurriculum = RETIRED_CURRICULUM_TITLES.includes((t.title || "").trim().toLocaleLowerCase("tr"));
      if (isRetiredCurriculum) {
        const personalNotes = extractPersonalNotes(t.notes || "");
        if (personalNotes) {
          const archivedTitle = `${t.title} — Kişisel Notlar`;
          if (!state.topics.some(topic => topic.title === archivedTitle)) {
            state.topics.push({ ...t, title: archivedTitle, notes: personalNotes, summary: "Eski müfredattan korunan kişisel notlar." });
          }
        }
        return;
      }
      if (!isDefault && !isRetiredCurriculum && t.title && !t.category?.toLowerCase().includes("notmonk")) {
        const alreadyIn = state.topics.some(x => x.title.trim().toLowerCase() === t.title.trim().toLowerCase());
        if (!alreadyIn) {
          state.topics.push(t);
        }
      }
    });
  }

  const curriculumIds = new Map(state.topics.filter(topic => topic.curriculumKey).map(topic => [topic.curriculumKey, topic.id]));
  state.topics.forEach(topic => {
    if (topic.parentCurriculumKey && curriculumIds.has(topic.parentCurriculumKey)) {
      topic.parentTopicId = curriculumIds.get(topic.parentCurriculumKey);
    }
  });

  // 3. Kategorileri temizle: Eski seviyesiz isimleri, silinmiş alanları ve sahte "Genel" alanını KESİNLİKLE SİL
  state.categories = [];
  rawSavedCategories.forEach(c => {
    const trimmed = (c || "").trim();
    const migrated = categoryMigrationMap[trimmed] || trimmed;
    const isOldLegacy = oldCategoryNames.includes(trimmed);
    const isNotMonk = trimmed.toLowerCase().includes("notmonk");
    const isGenel = trimmed.toLowerCase() === "genel";
    const isDeleted = isCategoryDeleted(trimmed);
    if (!isNotMonk && !isGenel && !isDeleted && !state.categories.includes(migrated)) {
      state.categories.push(migrated);
    }
  });
  DEFAULT_CATEGORIES.forEach(category => {
    if (!isCategoryDeleted(category) && !state.categories.includes(category)) state.categories.push(category);
  });

  // "Genel" kategorisindeki sahte konuları ve metadata'yı temizle
  state.topics = state.topics.filter(t => (t.category || "").trim().toLowerCase() !== "genel" && !isCategoryDeleted(t.category));
  state.categories = state.categories.filter(c => (c || "").trim().toLowerCase() !== "genel" && !isCategoryDeleted(c));
  if (state.areaMapping) {
    delete state.areaMapping["Genel"];
    delete state.areaMapping["genel"];
    state.deletedCategoryKeys.forEach(delCat => {
      delete state.areaMapping[delCat];
      const matchKey = Object.keys(state.areaMapping).find(k => k.trim().toLowerCase() === delCat.trim().toLowerCase());
      if (matchKey) delete state.areaMapping[matchKey];
    });
  }
  if (state.categoryMetadata) {
    delete state.categoryMetadata["Genel"];
    delete state.categoryMetadata["genel"];
    state.deletedCategoryKeys.forEach(delCat => {
      delete state.categoryMetadata[delCat];
      const matchKey = Object.keys(state.categoryMetadata).find(k => k.trim().toLowerCase() === delCat.trim().toLowerCase());
      if (matchKey) delete state.categoryMetadata[matchKey];
    });
  }

  const shouldRecover = Boolean(globalThis.chrome?.storage?.local) && saved.recoveryApplied !== RECOVERY_SNAPSHOT_ID && Array.isArray(globalThis.NOTMONK_RECOVERY_SNAPSHOT);
  if (shouldRecover) recoverLocalNotes(globalThis.NOTMONK_RECOVERY_SNAPSHOT.filter(topic => !isOldCNote(topic)));

  // Konulardan gelen geçerli kategorileri de ekle
  state.topics.forEach(t => {
    if (t.category && !oldCategoryNames.includes(t.category.trim()) && !t.category.toLowerCase().includes("notmonk") && t.category.toLowerCase() !== "genel" && !isCategoryDeleted(t.category) && !state.categories.includes(t.category)) {
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

  // Eski ID tabanlı eşitlemenin ürettiği yerel/Notion çiftlerini tek sayfada birleştir.
  reconcileTopicDuplicates();

  Object.assign(state, saved.preferences || {});
  state.activeTab = saved.preferences?.activeTab || "modules";
  state.selectedCategory = null;
  
  if (saved.notionConfig) {
    state.notionToken = saved.notionConfig.token || "";
    state.notionDbId = saved.notionConfig.dbId || "";
    state.notionAutoSync = saved.notionConfig.autoSync !== undefined ? Boolean(saved.notionConfig.autoSync) : true;
    if (!state.umbrellaPageId) {
      state.umbrellaPageId = saved.notionConfig.umbrellaPageId || "";
    }
  }

  // Değişiklikleri kalıcı kaydet
  await save();
  if (shouldRecover) await storageSet({ recoveryApplied: RECOVERY_SNAPSHOT_ID });
  await savePreferences();
  bindEvents();
  bindCategoryEvents();
  bindNotionEvents();
  bindEnhancements();
  bindListEnhancements();
  applyTheme();
  await RoadmapBoard.init();
  await applyPageRoute();
  window.addEventListener("hashchange", () => applyPageRoute());
  renderStats();
  checkNotionStatusBackground();
  syncUnmappedCategoriesToNotion();

  // ── Canlı Gerçek Zamanlı Senkronizasyon (Anlık İki Yönlü) ──
  if (state.notionToken) {
    // Hata 15: topics boşsa fastOnly değil full sync çalıştır
    autoSyncFromNotion({ fastOnly: state.topics.length > 0 }).then(syncPendingTopicsToNotion);
  }

  window.addEventListener("focus", () => {
    if (state.notionAutoSync && state.notionToken && !editorState.dirty && !isSyncingNotion) {
      autoSyncFromNotion({ fastOnly: true });
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.notionToken && !editorState.dirty && !isSyncingNotion) {
      autoSyncFromNotion({ fastOnly: true });
    }
  });

  // Hata 2: Arka plan heartbeat sonuçlarını yakala (background.js chrome.alarms ile gönderir)
  if (globalThis.chrome?.storage?.local) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      // background.js'den gelen heartbeat sync sinyali
      if (changes._notionHeartbeatAt && state.notionToken && !editorState.dirty && !isSyncingNotion) {
        autoSyncFromNotion({ fastOnly: true });
      }
    });
  }

  // Hata 2: Arka plan otomatik heartbeat: Sekme etkinken her 2 saniyede bir sessizce Notion'ı yoklar (4000→2000)
  setInterval(() => {
    if (state.notionAutoSync && state.notionToken && !editorState.dirty && !isSyncingNotion) {
      const isVisible = document.visibilityState === "visible";
      if (isVisible) {
        autoSyncFromNotion({ fastOnly: true });
      }
    }
  }, 30000);
}

// ── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  const openFormBtn = $("#open-form");
  if (openFormBtn) openFormBtn.onclick = () => openForm();
  const emptyAdd = $("#empty-add");
  if (emptyAdd) emptyAdd.onclick = () => openForm();
  const addTopicBtn = $("#add-topic-btn");
  if (addTopicBtn) addTopicBtn.onclick = () => openForm();
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
    if (e.key.toLowerCase() === "n" && state.activeTab !== "roadmap" && !dialog.open && !notionDialog?.open && !/input|textarea|select/i.test(e.target.tagName)) {
      e.preventDefault(); openForm();
    }
  });
}

// Hash routes work on extension URLs and local files without server rewrites.
function categoryRoutes() {
  const used = new Set(["", "today", "roadmap"]);
  return new Map(state.categories.map(category => {
    let base = category === "15. C Programlama (Efor: 8/10)" ? "c"
      : category === "14. Java (Efor: 8/10)" ? "java"
      : displayAreaName(category).toLocaleLowerCase("tr").replace(/ı/g, "i")
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
  if (category) openCategory(category);
  else if (slug === "today" || slug === "roadmap") switchTab(slug);
  else if (!slug && (state.activeTab === "roadmap" || state.activeTab === "today")) switchTab(state.activeTab);
  else {
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
  setRoadmapVisibility(false);
  state.selectedCategory = categoryName;
  state.activeTab = "modules";
  updatePageRoute();
  state.page = 1;
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

function openForm(topic = null, parentTopic = null) {
  clearTimeout(autoSaveTimer);
  clearTimeout(saveHintTimer);
  editorRevision++;
  $("#save-hint").textContent = "";
  $("#topic-form").reset();
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

  updateEditorNotionActions(topic);

  dialog.dataset.status = topic?.status || "todo";
  renderEditorStatus();
  const currentTextLen = typeof RichEditor !== "undefined" ? RichEditor.getPlainText().length : $("#notes").value.length;
  $("#note-count").textContent = currentTextLen;
  isEditorDirty = false;
  const inlineMode = Boolean(state.selectedCategory && state.activeTab !== "today");
  if (inlineMode) {
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

function updateEditorNotionActions(topic) {
  const link = $("#editor-notion-link");
  const syncButton = $("#editor-notion-sync");
  if (link) {
    link.classList.toggle("hidden", !topic?.notionUrl);
    if (topic?.notionUrl) link.href = topic.notionUrl;
    else link.removeAttribute("href");
  }
  if (!syncButton) return;
  const label = syncButton.querySelector("span");
  if (label) label.textContent = !state.notionToken ? "Notion’a bağla" : topic?.notionPageId ? "Notion’u güncelle" : "Notion’a aktar";
  syncButton.classList.toggle("is-linked", Boolean(topic?.notionPageId));
  syncButton.title = !state.notionToken
    ? "Önce Notion bağlantısını kur"
    : topic?.notionPageId ? "Bu nottaki değişiklikleri Notion’a gönder" : "Bu notu Notion’da alt sayfa olarak oluştur";
}

async function syncCurrentEditorNote() {
  const button = $("#editor-notion-sync");
  if (!state.notionToken) {
    openNotionDialog();
    return;
  }
  await persistEditor();
  const topic = state.topics.find(candidate => candidate.id === $("#edit-id").value);
  if (!topic) return;
  button.disabled = true;
  button.classList.add("is-working");
  const label = button.querySelector("span");
  if (label) label.textContent = "Eşitleniyor…";
  try {
    await syncTopicToNotion(topic, true);
    const current = state.topics.find(candidate => candidate.id === topic.id) || topic;
    updateEditorNotionActions(current);
    showToast("Not Notion ile eşitlendi", "success");
  } catch (error) {
    updateEditorNotionActions(topic);
  } finally {
    button.disabled = false;
    button.classList.remove("is-working");
  }
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
    id: id || crypto.randomUUID(),
    title: $("#title").value.trim() || "Başlıksız",
    category: $("#category").value,
    status: dialog.dataset.status || "todo",
    notes: notesContent,
    appearance: PageAppearance.get(),
    resource: $("#resource").value.trim(),
    parentTopicId: $("#parent-topic").value || null,
    notionParentPageId: existing?.notionParentPageId || null,
    today: existing ? existing.today : false,
    notionPageId: existing?.notionPageId || null,
    notionUrl: existing?.notionUrl || null,
    notionLastEditedTime: existing?.notionLastEditedTime || null,
    _lastPushedToNotion: existing?._lastPushedToNotion || null,
    _lastSyncedNotes: existing?._lastSyncedNotes,
    _syncPending: true,
    updatedAt: Date.now()
  };
  state.topics = id ? state.topics.map(t => t.id === id ? topic : t) : [topic, ...state.topics];
  $("#edit-id").value = topic.id;
  editorState.topicId = topic.id;
  try { await save(); } catch (error) {
    $("#save-hint").textContent = "Kaydedilemedi. Tekrar kaydetmeyi dene.";
    throw error;
  }
  if (revision !== editorRevision || !dialog.open) return;
  // Hata 6: kayıt zamanını damgala — 8 saniyelik grace period için
  editorState.dirty = false;
  editorState.topicId = topic.id;
  editorState.savedAt = Date.now();
  $("#save-hint").textContent = "Kaydedildi";
  clearTimeout(saveHintTimer);
  saveHintTimer = setTimeout(() => { $("#save-hint").textContent = ""; }, 1800);
  render();

  if (state.notionAutoSync && state.notionToken) {
    syncTopicToNotion(topic);
  }
}

async function deleteCurrent() {
  const id = $("#edit-id").value;
  if (!id) return;
  const descendants = getTopicDescendantIds(id);
  const accepted = await askConfirmation({ title: "Notu sil?", message: descendants.size ? `Bu notla birlikte içindeki ${descendants.size} alt not da silinecek.` : "Bu not kalıcı olarak silinecek.", accept: "Evet, sil", danger: true });
  if (!accepted) return;
  clearTimeout(autoSaveTimer);
  await editorSaveQueue.catch(() => {});
  const existing = state.topics.find(t => t.id === id);
  if (existing) {
    markTopicDeleted(existing);
  }
  const deletedIds = new Set([id, ...descendants]);
  state.topics.forEach(topic => { if (deletedIds.has(topic.id)) markTopicDeleted(topic); });
  state.topics = state.topics.filter(t => !deletedIds.has(t.id));
  await save();
  editorState.dirty = false;
  editorState.topicId = null;
  dialog.close();
  render();

  // Notion bir üst sayfa arşivlendiğinde alt sayfaları da birlikte taşır.
  if (state.notionToken && existing?.notionPageId) NotionAPI.archivePage(state.notionToken, existing.notionPageId);
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
  markCategoryDeleted(category);
  state.categories = state.categories.filter(c => c !== category);
  state.topics = state.topics.filter(t => {
    const matches = t.category === category;
    if (matches) markTopicDeleted(t);
    return !matches;
  });
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
    let iconContent = `<span>📁</span>`;
    let iconClass = "emoji";

    if (meta?.iconType === "image" && meta.iconUrl) {
      iconContent = `<img src="${meta.iconUrl}" alt="${cat}" loading="lazy" />`;
      iconClass = "img";
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
          <span class="card-count">${total} konu${done ? ` · ${done} tamamlandı` : ""}</span>
          ${todayCount > 0 ? `<span class="card-today-badge">★ ${todayCount} bugün</span>` : `<span class="card-arrow">→</span>`}
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
  topic.today = !topic.today;
  await save();
  render();
  if (state.notionAutoSync && state.notionToken) {
    // Hata 5: debounce ile API spam önle
    debouncedSyncTopicToNotion(topic);
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

function displayAreaName(name) {
  return String(name || "").replace(/^\d+\.\s*/, "").replace(/\s*\((?:Efor:.*|Kritik Efor.*)\)?$/i, "").trim();
}

function renderTodayList(topics) {
  const list = $("#today-list");
  list.replaceChildren();
  const selected = state.topics.filter(t => t.today);
  const done = selected.filter(t => t.status === "done").length;
  $("#today-summary").textContent = selected.length ? `${selected.length} konu seçili · ${done} tamamlandı` : "";
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
    notionPageId: null,
    notionUrl: null,
    notionParentPageId: parentTopic?.notionPageId || null,
    _syncPending: true,
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
    open.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5"/></svg><span></span>';
    open.querySelector("span").textContent = topic.title;
    open.onclick = () => openTreeTopic(topic);

    const add = document.createElement("button");
    add.type = "button";
    add.className = "note-tree-add-child";
    add.textContent = "+";
    add.title = "Alt sayfa ekle";
    add.setAttribute("aria-label", `${topic.title} içine alt sayfa ekle`);
    add.onclick = event => { event.stopPropagation(); createTreePage(topic); };
    const today = document.createElement("button");
    today.type = "button";
    today.className = `note-tree-today${topic.today ? " active" : ""}`;
    today.textContent = topic.today ? "★" : "☆";
    today.title = topic.today ? "Bugün çalışılacaklardan çıkar" : "Bugün çalışılacaklara ekle";
    today.setAttribute("aria-label", `${topic.title}: ${today.title}`);
    today.setAttribute("aria-pressed", String(Boolean(topic.today)));
    today.onclick = async event => {
      event.stopPropagation();
      today.disabled = true;
      try { await toggleToday(topic); }
      catch (error) { today.disabled = false; showToast("Bugün seçimi kaydedilemedi", "error"); }
    };
    row.append(toggle, open, today, add);
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
  $("#note-tree-title").textContent = displayAreaName(state.selectedCategory);
  $("#note-tree-count").textContent = `${topics.length} sayfa`;
  renderNoteTree();

  const current = state.topics.find(topic => topic.id === $("#edit-id").value);
  const editorMatchesArea = dialog.open && dialog.classList.contains("inline-document") && current?.category === state.selectedCategory;
  $("#note-document-empty").classList.toggle("hidden", editorMatchesArea);
  if (!editorMatchesArea && topics.length) queueMicrotask(() => openTreeTopic(topics[0]));
}

function renderTable() {
  const isAreaWorkspace = Boolean(state.selectedCategory && state.activeTab !== "today");
  $("#topics-view").classList.toggle("area-mode", isAreaWorkspace);
  $("#area-workspace").classList.toggle("hidden", !isAreaWorkspace);
  if (isAreaWorkspace) {
    renderAreaWorkspace();
    return;
  }
  $("#table-view").classList.toggle("within-area", Boolean(state.selectedCategory));
  const isTodayTab = state.activeTab === "today";
  $("#today-focus").classList.toggle("hidden", !isTodayTab);
  const todayTopicsTotal = state.topics.filter(t => t.today).length;
  const currentCategoryTotal = state.selectedCategory ? state.topics.filter(t => t.category === state.selectedCategory).length : state.topics.length;
  const visible = getVisible();
  const orderedVisible = state.selectedCategory ? orderTopicsHierarchically(visible) : visible.map(topic => ({ topic, depth: 0 }));
  const totalPages = Math.max(1, Math.ceil(orderedVisible.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * state.pageSize;
  const pageTopics = orderedVisible.slice(start, start + state.pageSize);

  const isGlobalEmpty = !isTodayTab && currentCategoryTotal === 0;
  const isTodayEmpty = isTodayTab && todayTopicsTotal === 0;
  const isNoResults = !isGlobalEmpty && !isTodayEmpty && visible.length === 0;

  $("#result-count").textContent = visible.length;
  $("#empty-state").classList.toggle("hidden", !isGlobalEmpty);
  const todayEmptyEl = $("#today-empty");
  if (todayEmptyEl) todayEmptyEl.classList.toggle("hidden", !isTodayEmpty);
  $("#no-results").classList.toggle("hidden", !isNoResults);
  $("#table-view").classList.toggle("hidden", isTodayTab || isGlobalEmpty || isTodayEmpty || isNoResults);
  $("#topic-table-body").replaceChildren(...pageTopics.map(({ topic, depth }, index) => createRow(topic, start + index, depth)));
  if (isTodayTab) renderTodayList(pageTopics.map(item => item.topic));
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
  if (state.notionAutoSync && state.notionToken) {
    // Hata 5: debounce ile API spam önle (metadata değişimi, içerik değil)
    debouncedSyncTopicToNotion(topic);
  }
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

  const starBtn = document.createElement("button");
  starBtn.type = "button";
  starBtn.className = "star-btn" + (topic.today ? " active" : "");
  starBtn.title = topic.today ? "Bugünün odağından çıkar" : "Bugünün odağına ekle";
  starBtn.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>';
  starBtn.setAttribute("aria-label", starBtn.title);
  starBtn.setAttribute("aria-pressed", String(Boolean(topic.today)));
  starBtn.onclick = e => {
    e.stopPropagation();
    toggleToday(topic);
  };
  titleWrap.append(starBtn);

  const titleSpan = document.createElement("span");
  titleSpan.textContent = topic.title;
  titleWrap.append(titleSpan);

  const childButton = document.createElement("button");
  childButton.type = "button";
  childButton.className = "add-child-note";
  childButton.title = "Bu notun içine alt not ekle";
  childButton.setAttribute("aria-label", `${topic.title} içine alt not ekle`);
  childButton.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  childButton.onclick = event => { event.stopPropagation(); openForm(null, topic); };
  titleWrap.append(childButton);

  if (topic.resource) {
    const link = document.createElement("a");
    link.href = topic.resource;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "resource-icon-link";
    link.title = `Kaynağı aç: ${topic.resource}`;
    link.innerHTML = '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/></svg>';
    link.setAttribute("aria-label", link.title);
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
      const pushed = await syncMissingTopicsToNotion();
      setTimeout(() => quickSyncBtn.classList.remove("spinning"), 600);
      showToast(pushed ? `✓ Notion ile eşitlendi · ${pushed} eksik sayfa aktarıldı` : "✓ Notion ile eşitlendi", "success");
    };
  }
  const editorSyncBtn = $("#editor-notion-sync");
  if (editorSyncBtn) editorSyncBtn.onclick = syncCurrentEditorNote;
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

async function syncTopicToNotion(topic, propagateError = false) {
  topic = state.topics.find(t => t.id === topic.id);
  if (!topic) return;
  topic._syncPending = true;
  if (!state.notionToken) return;
  const parentTopic = topic.parentTopicId ? state.topics.find(candidate => candidate.id === topic.parentTopicId) : null;
  if (parentTopic && !parentTopic.notionPageId) {
    await syncTopicToNotion(parentTopic, true);
    topic = state.topics.find(candidate => candidate.id === topic.id);
    if (!topic) return;
  }
  // Hata 3: import devam ederken yazma; retry ile kuyrukla
  if (isSyncingNotion) {
    await new Promise(resolve => setTimeout(resolve, 600));
    return syncTopicToNotion(topic, propagateError);
  }
  isSyncingNotion = true;
  const snapshot = { ...topic };
  try {
    if (!state.umbrellaPageId && !state.notionDbId) {
      state.umbrellaPageId = await NotionAPI.getOrFindUmbrellaPageId(state.notionToken);
      if (state.umbrellaPageId) await save();
    }
    // Hata 11: içerik değişip değişmediğini takip et — sadece değiştiyse blokları yeniden yaz
    const lastSyncedNotes = topic._lastSyncedNotes;
    const contentChanged = (topic.notes || "") !== (lastSyncedNotes || "");

    const mappedArea = state.areaMapping?.[topic.category];
    const desiredParentId = parentTopic?.notionPageId || mappedArea?.id || (typeof mappedArea === "string" ? mappedArea : null) || state.notionDbId || null;
    const desiredParentType = parentTopic ? "page" : (mappedArea?.type === "database" || (!mappedArea && state.notionDbId) ? "database" : "page");
    const res = await NotionAPI.syncTopic(
      state.notionToken,
      state.notionDbId,
      snapshot,
      {},
      state.areaMapping,
      state.umbrellaPageId || state.notionDbId,
      contentChanged,
      desiredParentId,
      desiredParentType
    );
    if (res) {
      topic.notionPageId = res.notionPageId;
      topic.notionUrl = res.notionUrl;
      // Hata 1: echo loop önleme — hem yerel saat hem de "son push" damgası kaydet
      const current = state.topics.find(t => t.id === topic.id);
      if (!current) return;
      Object.assign(current, { notionPageId: res.notionPageId, notionUrl: res.notionUrl });
      current.notionParentPageId = desiredParentType === "page" ? desiredParentId : null;
      topic = current;
      topic._syncPending = topic.updatedAt !== snapshot.updatedAt;
      topic.notionLastEditedTime = res.notionLastEditedTime || 0;
      // Hata 1+10: _lastPushedToNotion ile heartbeat bu değişikliği skip eder
      topic._lastPushedToNotion = Date.now();
      // Hata 11: içerik hash — bir sonraki push'ta karşılaştırılır
      if (contentChanged) topic._lastSyncedNotes = snapshot.notes || "";
      await save();
    }
  } catch (e) {
    console.warn(`Notion senkronizasyon hatası (${topic.title}):`, e);
    showToast(`Notion eşitlenemedi: ${e.message}`, "error");
    if (propagateError) throw e;
  } finally {
    isSyncingNotion = false;
    await save();
  }
}

async function syncPendingTopicsToNotion() {
  if (!state.notionToken || isSyncingNotion) return;
  const pending = orderTopicsHierarchically(state.topics)
    .map(item => item.topic)
    .filter(topic => topic._syncPending);
  for (const topic of pending) {
    try { await syncTopicToNotion(topic, true); }
    catch (error) { console.warn(`Bekleyen Notion sayfası eşitlenemedi (${topic.title}):`, error); }
  }
}

async function syncMissingTopicsToNotion() {
  if (!state.notionToken || isSyncingNotion) return 0;
  const missing = orderTopicsHierarchically(state.topics)
    .map(item => item.topic)
    .filter(topic => !topic.notionPageId);
  let pushed = 0;
  for (const topic of missing) {
    try {
      await syncTopicToNotion(topic, true);
      if (state.topics.find(candidate => candidate.id === topic.id)?.notionPageId) pushed++;
    } catch (error) {
      console.warn(`Eksik Notion sayfası aktarılamadı (${topic.title}):`, error);
    }
  }
  return pushed;
}

async function pushAllToNotion() {
  if (!state.notionToken) {
    alert("Önce Notion API Token girmelisin.");
    return;
  }

  await archiveCurrentSafetySnapshot();

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

  const topicsInHierarchyOrder = orderTopicsHierarchically(state.topics).map(item => item.topic);
  for (const topic of topicsInHierarchyOrder) {
    progressText.textContent = `Aktarılıyor (${completed + 1}/${total}): ${topic.title}...`;
    try {
      await syncTopicToNotion(topic, true);
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
  await archiveCurrentSafetySnapshot();
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

        // Notion'daki arşiv/silme bilgisi çekim sırasında yerel veriyi silemez.
        // Silme yalnızca kullanıcının NotMonk içindeki açık "Sil" işlemiyle yapılır.

        // Güncellenen konuları NotMonk'a kayıpsız biçimde aktar
        if (changes.updatedTopics && changes.updatedTopics.length > 0) {
          for (const remote of changes.updatedTopics) {
            if (isTopicDeleted(remote)) continue;
            const existing = state.topics.find(t =>
              NotionAPI.cleanDatabaseId(t.notionPageId) === NotionAPI.cleanDatabaseId(remote.notionPageId)
            );
            if (existing) {
              if (existing._syncPending || _notionSyncTimers[existing.id] || (editorState.dirty && editorState.topicId === existing.id)) continue;
              existing.category = remote.category;
              existing.today = remote.today;
              const mergedNotes = mergeNotionNotesLosslessly(existing.notes, remote.notes);
              existing._lastSyncedNotes = remote.notes || "";
              existing.title = remote.title;
              existing.status = remote.status;
              existing.notes = mergedNotes;
              existing._syncPending = mergedNotes !== String(remote.notes || "").trim();
              existing.resource = remote.resource;
              existing.notionParentPageId = remote.notionParentPageId || null;
              existing.notionLastEditedTime = remote.notionLastEditedTime;
              existing.updatedAt = remote.updatedAt;
              hasChanges = true;

              // Hata 6: Kayıt sonrası 8 saniyelik grace period — editör içeriğini zaman damgasını kontrol ederek güncelle
              const msSinceSave = Date.now() - editorState.savedAt;
              const safeSinceSave = msSinceSave > 8000;
              // Eğer konu şu an düzenleme modalında açıksa ve kullanıcı henüz yazmıyorsa canlı güncelle!
              if (dialog.open && $("#edit-id").value === existing.id && !editorState.dirty && safeSinceSave) {
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

        // Notion'da yeni açılan konuları ekle
        if (changes.newTopics && changes.newTopics.length > 0) {
          for (const newTopic of changes.newTopics) {
            const cat = (newTopic.category || "").trim();
            if (isTopicDeleted(newTopic) || !cat || cat.toLowerCase() === "genel") {
              continue;
            }
            const matching = findMatchingLocalTopic(newTopic);
            if (matching) {
              const mergedNotes = mergeNotionNotesLosslessly(matching.notes, newTopic.notes);
              Object.assign(matching, newTopic, {
                id: matching.id,
                notes: mergedNotes,
                _lastSyncedNotes: newTopic.notes || "",
                _syncPending: mergedNotes !== String(newTopic.notes || "").trim(),
                parentTopicId: matching.parentTopicId || newTopic.parentTopicId || null
              });
            } else {
              state.topics.push(newTopic);
            }
            if (!state.categories.includes(newTopic.category)) {
              state.categories.push(newTopic.category);
            }
            hasChanges = true;
          }
        }

        const localIdByNotionId = new Map(state.topics.filter(topic => topic.notionPageId).map(topic => [NotionAPI.cleanDatabaseId(topic.notionPageId), topic.id]));
        state.topics.forEach(topic => {
          if (topic.notionParentPageId) topic.parentTopicId = localIdByNotionId.get(NotionAPI.cleanDatabaseId(topic.notionParentPageId)) || null;
        });
        reconcileTopicDuplicates();

        if (hasChanges) {
          await save();
          render();
          showToast("✓ Notion'daki değişiklikler anında aktarıldı", "info");
        }
      }
      return;
    }

    // ── Tam Senkronizasyon (Full Workspace Crawl) ──
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
    }

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
        if (isTopicDeleted(remote)) return;
        const existing = findMatchingLocalTopic(remote);
        if (existing) {
          if (existing._syncPending || _notionSyncTimers[existing.id] || (editorState.dirty && editorState.topicId === existing.id)) return;
          const mergedNotes = mergeNotionNotesLosslessly(existing.notes, remote.notes);
          Object.assign(existing, remote, {
            id: existing.id,
            notes: mergedNotes,
            _lastSyncedNotes: remote.notes || "",
            _syncPending: mergedNotes !== String(remote.notes || "").trim(),
            notionLastEditedTime: remote.notionLastEditedTime || remote.updatedAt
          });
          updatedCount++;
        } else {
          state.topics.push(remote);
          if (remote.category && !state.categories.includes(remote.category)) {
            state.categories.push(remote.category);
          }
          addedCount++;
        }
      });
      const localIdByNotionId = new Map(state.topics.filter(topic => topic.notionPageId).map(topic => [NotionAPI.cleanDatabaseId(topic.notionPageId), topic.id]));
      state.topics.forEach(topic => {
        if (topic.notionParentPageId) topic.parentTopicId = localIdByNotionId.get(NotionAPI.cleanDatabaseId(topic.notionParentPageId)) || null;
      });
      reconcileTopicDuplicates();
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
  if (!state.notionAutoSync) return;
  return syncFromNotionInternal({ silent: true, fastOnly });
}

init();
