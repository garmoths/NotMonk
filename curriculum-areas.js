// Preserve user-defined areas; public builds never remap or seed personal data.
(function(root) {
  'use strict';
  const VERSION = 1;
  const nameKey = value => String(value || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ');
  function canonical(name, categories, aliases = {}) {
    if (Object.prototype.hasOwnProperty.call(aliases, name) && categories.includes(aliases[name])) return aliases[name];
    return name;
  }
  function migrate() { return null; }
  const api = { VERSION, nameKey, canonical, migrate };
  root.CurriculumAreas = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
