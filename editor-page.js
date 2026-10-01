// Local presentation settings belong to each note, independently of Notion content.
const PageAppearance = (() => {
  const page = document.getElementById('topic-dialog');
  const controls = { font: document.getElementById('page-font'), wide: document.getElementById('page-wide'), small: document.getElementById('page-small'), cover: document.getElementById('page-cover') };
  function get() { return { font: controls.font.value, wide: controls.wide.checked, small: controls.small.checked, cover: controls.cover.value }; }
  function apply() {
    const settings = get();
    page.dataset.font = settings.font;
    page.dataset.cover = settings.cover;
    page.classList.toggle('document-wide', settings.wide);
    page.classList.toggle('document-small', settings.small);
  }
  function load(settings = {}) {
    settings ||= {};
    controls.font.value = ['sans', 'serif', 'mono'].includes(settings.font) ? settings.font : 'sans';
    controls.cover.value = ['sand', 'sky', 'rose'].includes(settings.cover) ? settings.cover : 'none';
    controls.wide.checked = Boolean(settings.wide);
    controls.small.checked = Boolean(settings.small);
    document.querySelector('.page-appearance').open = false;
    apply();
  }
  Object.values(controls).forEach(control => control.addEventListener('change', () => {
    apply();
    document.getElementById('notes-editor').dispatchEvent(new Event('rich-change', { bubbles: true }));
  }));
  document.addEventListener('click', event => {
    const menu = document.querySelector('.page-appearance');
    if (!menu.contains(event.target)) menu.open = false;
  });
  return { get, load };
})();
