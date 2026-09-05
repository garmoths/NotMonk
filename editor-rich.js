// ── NotMonk Rich Text Editor ─────────────────────────────────────────────────
// Floating toolbar, code blocks, terminal blocks, headings, inline formatting

const RichEditor = (() => {
  let editorEl = null;
  let toolbarEl = null;
  let savedRange = null;
  const COLORS = ['#e9edef', '#6c8ef0', '#f472b6', '#34d399', '#fbbf24', '#f87171'];
  const LANGS = ['plain', 'python', 'javascript', 'bash', 'sql', 'c', 'go', 'html', 'css', 'json'];

  // ── Undo / Redo History Stack ─────────────────────────────────────────────
  let undoStack = [];
  let redoStack = [];
  let isUndoRedoAction = false;
  let lastSnapshot = '';
  let snapshotTimer = null;

  function pushUndoSnapshot(force = false) {
    if (isUndoRedoAction || !editorEl) return;
    const currentHTML = editorEl.innerHTML;
    if (currentHTML === lastSnapshot) return;

    if (force) {
      if (snapshotTimer) clearTimeout(snapshotTimer);
      undoStack.push(currentHTML);
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
      lastSnapshot = currentHTML;
      return;
    }

    if (snapshotTimer) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      if (currentHTML !== lastSnapshot) {
        undoStack.push(currentHTML);
        if (undoStack.length > 50) undoStack.shift();
        redoStack = [];
        lastSnapshot = currentHTML;
      }
    }, 350);
  }

  function undo() {
    if (undoStack.length <= 1) return;
    isUndoRedoAction = true;
    const current = undoStack.pop();
    redoStack.push(current);
    const prev = undoStack[undoStack.length - 1];
    setHTML(prev, false);
    lastSnapshot = prev;
    isUndoRedoAction = false;
    onInput();
  }

  function redo() {
    if (!redoStack.length) return;
    isUndoRedoAction = true;
    const next = redoStack.pop();
    undoStack.push(next);
    setHTML(next, false);
    lastSnapshot = next;
    isUndoRedoAction = false;
    onInput();
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  function init() {
    editorEl = document.getElementById('notes-editor');
    toolbarEl = document.getElementById('editor-toolbar');
    if (!editorEl || !toolbarEl) return;

    // Floating selection toolbar
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keyup', onMouseUp);

    // Toolbar button actions
    toolbarEl.addEventListener('mousedown', e => {
      e.preventDefault(); // don't lose selection
      const btn = e.target.closest('[data-cmd]');
      if (!btn) return;
      restoreRange();
      execCmd(btn.dataset.cmd, btn.dataset.val || null);
    });

    editorEl.addEventListener('keydown', onEditorKeydown);
    editorEl.addEventListener('input', onInput);
    editorEl.addEventListener('paste', onPaste);

    // Close toolbar on outside click
    document.addEventListener('mousedown', e => {
      if (!toolbarEl.contains(e.target) && !editorEl.contains(e.target)) {
        hideToolbar();
      }
    });

    // Initialize empty state
    if (!editorEl.innerHTML.trim()) {
      editorEl.innerHTML = '<p><br></p>';
    }
    undoStack = [editorEl.innerHTML];
    redoStack = [];
    lastSnapshot = editorEl.innerHTML;
    applyPrism();
    initResizerAndExpand();
  }

  // ── Selection Toolbar ─────────────────────────────────────────────────────
  function onMouseUp(e) {
    if (e.target.closest('#editor-toolbar')) return;
    setTimeout(() => {
      checkSelectionAndShowToolbar();
    }, 20);
  }

  function checkSelectionAndShowToolbar() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed && editorEl.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange();
      positionToolbar(savedRange);
    } else {
      hideToolbar();
    }
  }

  function positionToolbar(range) {
    if (!range || !toolbarEl) return;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    toolbarEl.classList.remove('hidden');
    const tbRect = toolbarEl.getBoundingClientRect();
    const parentEl = toolbarEl.offsetParent || document.body;
    const parentRect = parentEl.getBoundingClientRect();

    let top = rect.top - parentRect.top - tbRect.height - 10;
    let left = rect.left - parentRect.left + (rect.width / 2) - (tbRect.width / 2);

    // Clamp horizontally inside editor wrapper
    const maxLeft = parentRect.width - tbRect.width - 12;
    left = Math.max(12, Math.min(left, maxLeft));

    // If toolbar overflows top, place it underneath selection
    if (top < 8) {
      top = rect.bottom - parentRect.top + 8;
    }

    toolbarEl.style.top = Math.round(top) + 'px';
    toolbarEl.style.left = Math.round(left) + 'px';
  }

  function hideToolbar() {
    if (toolbarEl) {
      toolbarEl.classList.add('hidden');
      toolbarEl.style.removeProperty('top');
      toolbarEl.style.removeProperty('left');
    }
  }

  function restoreRange() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function getSelectedText() {
    if (savedRange && !savedRange.collapsed) {
      return savedRange.toString().trim();
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      return sel.getRangeAt(0).toString().trim();
    }
    return '';
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  function execCmd(cmd, val) {
    editorEl.focus();
    switch (cmd) {
      case 'bold':        document.execCommand('bold'); break;
      case 'italic':      document.execCommand('italic'); break;
      case 'strike':      document.execCommand('strikeThrough'); break;
      case 'link':        insertLink(); break;
      case 'image':       insertImage(); break;
      case 'inline-code': wrapInlineCode(); break;
      case 'h1':          wrapBlock('h1'); break;
      case 'h2':          wrapBlock('h2'); break;
      case 'h3':          wrapBlock('h3'); break;
      case 'color':       document.execCommand('foreColor', false, val); break;
      case 'code-block':  insertCodeBlock(); break;
      case 'terminal':    insertTerminalBlock(); break;
      case 'quote':       insertQuoteBlock(); break;
      case 'info':        insertInfoBlock(); break;
    }
    hideToolbar();
    pushUndoSnapshot(true);
    onInput();
  }

  function wrapInlineCode() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const text = range.toString();
    const code = document.createElement('code');
    code.className = 'inline-code';
    code.textContent = text;
    range.deleteContents();
    range.insertNode(code);
    range.selectNodeContents(code);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function wrapBlock(tag) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.anchorNode;
    while (node && node.nodeType !== 1) node = node.parentNode;
    while (node && node.parentElement !== editorEl) node = node.parentElement;
    if (!node) return;
    if (node.tagName.toLowerCase() === tag) {
      const p = document.createElement('p');
      p.innerHTML = node.innerHTML;
      node.replaceWith(p);
    } else {
      const el = document.createElement(tag);
      el.innerHTML = node.innerHTML;
      node.replaceWith(el);
    }
  }

  // ── Block Insertions & Conversions ─────────────────────────────────────────
  function insertCodeBlock(lang = 'python') {
    const initialText = getSelectedText();
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrap';
    wrapper.contentEditable = 'false';

    const header = document.createElement('div');
    header.className = 'code-block-header';

    const select = document.createElement('select');
    select.className = 'code-lang-select';
    LANGS.forEach(l => {
      const o = document.createElement('option');
      o.value = l; o.textContent = l;
      if (l === lang) o.selected = true;
      select.appendChild(o);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.type = 'button';
    copyBtn.textContent = 'kopyala';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(code.textContent);
      copyBtn.textContent = '✓ kopyalandı';
      setTimeout(() => copyBtn.textContent = 'kopyala', 1500);
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'code-del-btn';
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.onclick = () => {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      wrapper.replaceWith(p);
      placeCaretIn(p);
      onInput();
    };

    header.append(select, copyBtn, delBtn);

    const pre = document.createElement('pre');
    pre.className = 'code-block';
    const code = document.createElement('code');
    code.className = `language-${lang}`;
    code.contentEditable = 'true';
    code.spellcheck = false;
    code.textContent = initialText;
    pre.appendChild(code);

    select.onchange = () => {
      code.className = `language-${select.value}`;
      applyPrism();
    };

    code.addEventListener('input', applyPrism);
    code.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
      if (e.key === 'Escape') {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        wrapper.after(p);
        placeCaretIn(p);
      }
    });

    wrapper.append(header, pre);
    replaceSelectionWithBlock(wrapper, code);
    applyPrism();
  }

  function insertTerminalBlock() {
    const initialText = getSelectedText();
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-block-wrap';
    wrapper.contentEditable = 'false';

    const header = document.createElement('div');
    header.className = 'terminal-header';

    const dots = document.createElement('div');
    dots.className = 'terminal-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    const label = document.createElement('span');
    label.className = 'terminal-label';
    label.textContent = 'Terminal';

    const delBtn = document.createElement('button');
    delBtn.className = 'code-del-btn';
    delBtn.type = 'button';
    delBtn.textContent = '✕';
    delBtn.onclick = () => {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      wrapper.replaceWith(p);
      placeCaretIn(p);
      onInput();
    };

    header.append(dots, label, delBtn);

    const pre = document.createElement('pre');
    pre.className = 'terminal-block';
    const code = document.createElement('code');
    code.contentEditable = 'true';
    code.spellcheck = false;
    code.textContent = initialText;
    pre.appendChild(code);

    code.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      }
      if (e.key === 'Escape') {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        wrapper.after(p);
        placeCaretIn(p);
      }
    });

    wrapper.append(header, pre);
    replaceSelectionWithBlock(wrapper, code);
  }

  function insertQuoteBlock() {
    const text = getSelectedText();
    const bq = document.createElement('blockquote');
    bq.className = 'rich-quote';
    bq.textContent = text || 'Alıntı...';
    replaceSelectionWithBlock(bq, bq);
  }

  function insertInfoBlock() {
    const text = getSelectedText();
    const div = document.createElement('div');
    div.className = 'info-block';
    div.contentEditable = 'true';
    div.innerHTML = text ? `💡 ${text}` : '💡 Bilgi notu...';
    replaceSelectionWithBlock(div, div);
  }

  // ── Block Replacement Helper ──────────────────────────────────────────────
  function replaceSelectionWithBlock(el, focusEl = null) {
    const sel = window.getSelection();
    let range = savedRange || (sel && sel.rangeCount ? sel.getRangeAt(0) : null);

    if (range && !range.collapsed) {
      let node = range.startContainer;
      while (node && node.nodeType !== 1) node = node.parentNode;
      while (node && node.parentElement !== editorEl) node = node.parentElement;

      if (node && node.parentElement === editorEl) {
        node.replaceWith(el);
      } else {
        range.deleteContents();
        range.insertNode(el);
      }
    } else {
      insertBlockAtCaret(el, false);
      return;
    }

    if (!el.nextElementSibling || el.nextElementSibling.tagName === 'DIV') {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      el.after(p);
    }

    savedRange = null;
    hideToolbar();
    onInput();

    if (focusEl) {
      setTimeout(() => focusEl.focus(), 40);
    }
  }

  function insertBlockAtCaret(el, focusEl = false) {
    const sel = window.getSelection();
    let refNode = null;
    if (sel && sel.rangeCount) {
      let node = sel.anchorNode;
      while (node && node.parentElement !== editorEl) node = node.parentElement;
      refNode = node;
    }
    if (refNode) {
      refNode.after(el);
    } else {
      editorEl.appendChild(el);
    }
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    el.after(p);
    if (focusEl && el.contentEditable === 'true') {
      placeCaretIn(el);
    } else {
      placeCaretIn(p);
    }
    onInput();
  }

  function placeCaretIn(el) {
    el.focus && el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onEditorKeydown(e) {
    const isMetaOrCtrl = e.metaKey || e.ctrlKey;

    // Undo: Ctrl+Z or Cmd+Z
    if (isMetaOrCtrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }

    // Redo: Ctrl+Y or Cmd+Y
    if (isMetaOrCtrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
      return;
    }

    // Link: Ctrl+K or Cmd+K
    if (isMetaOrCtrl && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      insertLink();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const sel = window.getSelection();
      let node = sel.anchorNode;
      while (node && node.nodeType !== 1) node = node.parentNode;
      while (node && node.parentElement !== editorEl) node = node.parentElement;
      if (node && /^H[123]$/.test(node.tagName)) {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        node.after(p);
        placeCaretIn(p);
        pushUndoSnapshot(true);
      }
    }
  }

  function onPaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!text) return;

    const trimmed = text.trim();
    const isUrl = /^https?:\/\/[^\s]+$/i.test(trimmed);
    const isImageUrl = isUrl && /\.(jpeg|jpg|gif|png|webp|svg)($|\?)/i.test(trimmed);

    // If pasted an image URL directly: auto-embed image
    if (isImageUrl) {
      insertImage(trimmed);
      return;
    }

    // If pasted a URL and user has text selected: auto-link selection (Notion style)
    const sel = window.getSelection();
    if (isUrl && sel && sel.rangeCount && !sel.isCollapsed && editorEl.contains(sel.anchorNode)) {
      insertLink(trimmed);
      return;
    }

    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      }
    }
    pushUndoSnapshot(true);
    onInput();
  }

  // ── Prism highlight ───────────────────────────────────────────────────────
  function applyPrism() {
    if (typeof Prism === 'undefined') return;
    editorEl.querySelectorAll('pre.code-block code[class*="language-"]').forEach(block => {
      const sel = window.getSelection();
      const hasFocus = block === document.activeElement || block.contains(document.activeElement);
      let offset = 0;
      if (hasFocus && sel.rangeCount) {
        offset = getCaretCharOffset(block);
      }
      Prism.highlightElement(block);
      if (hasFocus) {
        setCaretCharOffset(block, offset);
      }
    });
  }

  function getCaretCharOffset(el) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return pre.toString().length;
  }

  function setCaretCharOffset(el, offset) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (remaining <= node.textContent.length) {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      remaining -= node.textContent.length;
    }
  }

  function onInput() {
    if (!editorEl.innerHTML.trim() || editorEl.innerHTML === '<br>') {
      editorEl.innerHTML = '<p><br></p>';
    }
    pushUndoSnapshot(false);
    editorEl.dispatchEvent(new Event('rich-change', { bubbles: true }));
  }

  // ── Serialize / Deserialize ───────────────────────────────────────────────
  function getHTML() {
    const clone = editorEl.cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    return clone.innerHTML;
  }

  function setHTML(html, resetHistory = true) {
    if (!html || html.trim() === '') {
      editorEl.innerHTML = '<p><br></p>';
    } else if (!/<[a-z][\s\S]*>/i.test(html)) {
      editorEl.innerHTML = html
        .split('\n\n')
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
    } else {
      editorEl.innerHTML = html;
    }
    editorEl.querySelectorAll('.code-block-wrap').forEach(wrap => rehydrateCodeBlock(wrap));
    editorEl.querySelectorAll('.terminal-block-wrap').forEach(wrap => rehydrateTerminalBlock(wrap));
    editorEl.querySelectorAll('code[class*="language-"]').forEach(code => {
      code.contentEditable = 'true';
      code.spellcheck = false;
      const select = wrap_getSelect(code);
      if (select) select.onchange = () => { code.className = `language-${select.value}`; applyPrism(); };
      code.addEventListener('input', applyPrism);
      code.addEventListener('keydown', e => {
        if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
      });
    });
    applyPrism();

    if (resetHistory) {
      undoStack = [editorEl.innerHTML];
      redoStack = [];
      lastSnapshot = editorEl.innerHTML;
    }
  }

  function wrap_getSelect(code) {
    return code.closest('.code-block-wrap')?.querySelector('.code-lang-select');
  }

  function rehydrateCodeBlock(wrap) {
    const code = wrap.querySelector('code');
    const select = wrap.querySelector('.code-lang-select');
    const copyBtn = wrap.querySelector('.code-copy-btn');
    const delBtn = wrap.querySelector('.code-del-btn');
    if (!code) return;

    wrap.contentEditable = 'false';
    code.contentEditable = 'true';
    code.spellcheck = false;

    if (select) select.onchange = () => { code.className = `language-${select.value}`; applyPrism(); };
    if (copyBtn) copyBtn.onclick = () => {
      navigator.clipboard.writeText(code.textContent);
      copyBtn.textContent = '✓ kopyalandı';
      setTimeout(() => copyBtn.textContent = 'kopyala', 1500);
    };
    if (delBtn) delBtn.onclick = () => {
      const p = document.createElement('p'); p.innerHTML = '<br>';
      wrap.replaceWith(p); placeCaretIn(p); onInput();
    };
    code.addEventListener('input', applyPrism);
    code.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
      if (e.key === 'Escape') {
        const p = document.createElement('p'); p.innerHTML = '<br>';
        wrap.after(p); placeCaretIn(p);
      }
    });
  }

  function rehydrateTerminalBlock(wrap) {
    const code = wrap.querySelector('code');
    const delBtn = wrap.querySelector('.code-del-btn');
    if (!code) return;
    wrap.contentEditable = 'false';
    code.contentEditable = 'true';
    code.spellcheck = false;
    if (delBtn) delBtn.onclick = () => {
      const p = document.createElement('p'); p.innerHTML = '<br>';
      wrap.replaceWith(p); placeCaretIn(p); onInput();
    };
    code.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
      if (e.key === 'Escape') {
        const p = document.createElement('p'); p.innerHTML = '<br>';
        wrap.after(p); placeCaretIn(p);
      }
    });
  }

  // ── Links & Images ────────────────────────────────────────────────────────
  function insertLink(customUrl) {
    editorEl.focus();
    let url = customUrl;
    if (!url) {
      url = prompt('Bağlantı URL\'si girin (örn: https://...):', 'https://');
    }
    if (!url || url.trim() === 'https://' || url.trim() === 'http://') return;
    url = url.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    restoreRange();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const text = range.toString();
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = text || url;
      range.deleteContents();
      range.insertNode(a);
      sel.removeAllRanges();
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = url;
      insertBlockAtCaret(a);
    }
    hideToolbar();
    pushUndoSnapshot(true);
    onInput();
  }

  function insertImage(customUrl, customCaption) {
    editorEl.focus();
    let url = customUrl;
    if (!url) {
      url = prompt('Görsel URL\'si girin (örn: https://.../resim.png):', 'https://');
    }
    if (!url || url.trim() === 'https://' || url.trim() === 'http://') return;
    url = url.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) url = 'https://' + url;

    const caption = customCaption !== undefined ? customCaption : (prompt('Görsel açıklaması (isteğe bağlı):') || '');

    const figure = document.createElement('figure');
    figure.className = 'editor-image-wrap';
    figure.contentEditable = 'false';

    const img = document.createElement('img');
    img.src = url;
    img.alt = caption || 'Görsel';
    img.className = 'editor-image';
    img.loading = 'lazy';
    img.onerror = () => { img.alt = 'Görsel yüklenemedi: ' + url; };

    figure.appendChild(img);
    if (caption) {
      const figcap = document.createElement('figcaption');
      figcap.className = 'editor-image-caption';
      figcap.textContent = caption;
      figure.appendChild(figcap);
    }

    insertBlockAtCaret(figure);
    hideToolbar();
    pushUndoSnapshot(true);
    onInput();
  }

  // ── Resizer & Full Width Controls ─────────────────────────────────────────
  function initResizerAndExpand() {
    const dialog = document.getElementById('topic-dialog');
    const resizer = document.getElementById('editor-resizer');
    const expandBtn = document.getElementById('toggle-editor-expand');
    const linkBtn = document.getElementById('toolbar-link-btn');
    const imgBtn = document.getElementById('toolbar-image-btn');

    if (linkBtn) linkBtn.onclick = () => insertLink();
    if (imgBtn) imgBtn.onclick = () => insertImage();

    // Full-width expand toggle
    if (expandBtn && dialog) {
      const savedExpanded = localStorage.getItem('notmonk_editor_expanded') === 'true';
      if (savedExpanded) {
        dialog.classList.add('full-width');
        expandBtn.textContent = '⤡';
      }
      expandBtn.onclick = () => {
        const isFull = dialog.classList.toggle('full-width');
        expandBtn.textContent = isFull ? '⤡' : '⤢';
        localStorage.setItem('notmonk_editor_expanded', String(isFull));
      };
    }

    // Draggable resizer between sidebar and notes
    if (resizer && dialog) {
      const savedWidth = localStorage.getItem('notmonk_editor_sidebar_w');
      if (savedWidth) {
        dialog.style.setProperty('--editor-sidebar-w', savedWidth);
      }

      let isDragging = false;
      let startX = 0;
      let startWidth = 380;

      resizer.addEventListener('mousedown', e => {
        isDragging = true;
        resizer.classList.add('is-dragging');
        startX = e.clientX;
        const currentW = getComputedStyle(dialog).getPropertyValue('--editor-sidebar-w') || '380px';
        startWidth = parseInt(currentW, 10) || 380;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const delta = e.clientX - startX;
        const newWidth = Math.max(220, Math.min(650, startWidth + delta));
        dialog.style.setProperty('--editor-sidebar-w', `${newWidth}px`);
      });

      window.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('is-dragging');
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
        const finalW = dialog.style.getPropertyValue('--editor-sidebar-w');
        if (finalW) localStorage.setItem('notmonk_editor_sidebar_w', finalW);
      });
    }
  }

  // ── Plain text export (for Notion sync) ──────────────────────────────────
  function getPlainText() {
    const clone = editorEl.cloneNode(true);
    clone.querySelectorAll('pre').forEach(pre => {
      pre.before(document.createTextNode('\n' + pre.textContent + '\n'));
      pre.remove();
    });
    clone.querySelectorAll('img').forEach(img => {
      img.replaceWith(document.createTextNode(`\n![${img.alt || 'Görsel'}](${img.src})\n`));
    });
    clone.querySelectorAll('a').forEach(a => {
      a.replaceWith(document.createTextNode(`[${a.textContent}](${a.href})`));
    });
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('h1,h2,h3').forEach(h => {
      const lvl = h.tagName === 'H1' ? '# ' : h.tagName === 'H2' ? '## ' : '### ';
      h.before(document.createTextNode('\n' + lvl));
      h.after(document.createTextNode('\n'));
    });
    return clone.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }

  return { init, getHTML, setHTML, getPlainText, insertCodeBlock, insertTerminalBlock, execCmd, applyPrism, insertLink, insertImage, initResizerAndExpand };
})();
