/* Local, independent diagram storage. Topic references never modify lesson notes. */
const RoadmapBoard = (() => {
  const KEY = 'roadmapBoard', WIDTH = 3200, HEIGHT = 2400, CARD_W = 220, CARD_H = 108;
  let board = { version: 3, nodes: [], edges: [], zoom: .8, fitView: false, scrollX: 0, scrollY: 0 };
  let selected = null, pending = null, gesture = null, ready = false, mode = 'areas';
  let middlePressed = false;
  let offsetX = 0, offsetY = 0, wheelFrame = 0, wheelDelta = 0, wheelAnchor = null;
  let undo = [], redo = [], writeQueue = Promise.resolve(), saveRevision = 0, viewTimer;
  let isRestoring = false;
  const el = id => document.getElementById(id);
  const copy = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const label = text => String(text || '').replace(/^\d+\.\s*/, '').replace(/\s*\(Efor:.*\)$/, '');
  function snapshot() { return copy({ nodes: board.nodes, edges: board.edges }); }
  function checkpoint() { undo.push(snapshot()); if (undo.length > 60) undo.shift(); redo = []; }
  function status(message) {
    el('rm-save-status').textContent = message;
    el('rm-save-status').dataset.status = message.startsWith('Kaydedildi') ? 'saved' : message.startsWith('Kaydediliyor') ? 'saving' : 'error';
  }
  function decorateCard(element, category) {
    const colors = ['#8da8ff', '#60cbb6', '#e8b97b', '#bc9bfa', '#e69cbe'];
    const key=String(category || '');
    const hash=[...key].reduce((sum, char)=>sum+char.charCodeAt(0),0);
    element.style.setProperty('--rm-tint', colors[hash % colors.length]);
    element.dataset.code=key.match(/^\d+/)?.[0]?.padStart(2,'0') || '◇';
  }
  function persist() {
    const revision = ++saveRevision, saved = copy(board);
    status('Kaydediliyor…');
    try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch(e) {}
    writeQueue = writeQueue.catch(() => {}).then(() => storageSet({ [KEY]: saved }));
    writeQueue.then(() => { if (revision === saveRevision) status('Kaydedildi · Bu cihazda'); }, () => {
      if (revision === saveRevision) status('Kaydedilemedi · Tekrar dene');
    });
    return writeQueue;
  }
  function commit() { render(); persist(); }
  function undoChange(backwards) {
    const from = backwards ? undo : redo, to = backwards ? redo : undo;
    if (!from.length) return;
    to.push(snapshot()); Object.assign(board, from.pop()); selected = pending = null; commit();
  }
  function sourceItems() {
    return mode === 'areas'
      ? state.categories.map(category => ({ kind: 'area', ref: category, title: label(category), subtitle: 'Alan', category }))
      : state.topics.map(topic => ({ kind: 'topic', ref: topic.id, title: topic.title, subtitle: label(topic.category), category: topic.category }));
  }
  function resolveNode(node) {
    if (node.kind === 'topic') {
      const topic = state.topics.find(t => t.id === node.ref);
      return topic ? { ...node, title: topic.title, subtitle: label(topic.category), status: STATUS[topic.status] || '' } : { ...node, subtitle: 'Kaynak konu kaldırıldı' };
    }
    return { ...node, title: state.categories.includes(node.ref) ? label(node.ref) : node.title, subtitle: 'Alan' };
  }
  function renderLibrary() {
    const query = el('rm-search').value.toLocaleLowerCase('tr').trim();
    const category = el('rm-category').value;
    const list = el('rm-library'); list.replaceChildren();
    const items = sourceItems().filter(item => (!category || item.category === category) && `${item.title} ${item.subtitle}`.toLocaleLowerCase('tr').includes(query));
    el('rm-library-count').textContent = `${items.length} ${mode === 'areas' ? 'alan' : 'konu'}`;
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'rm-source'; button.draggable = true;
      decorateCard(button,item.category);
      button.setAttribute('aria-label', `${item.title}: tuvale ekle`);
      const name = document.createElement('strong'); name.textContent = item.title;
      const sub = document.createElement('small'); sub.textContent = item.subtitle;
      const plus = document.createElement('span'); plus.className = 'rm-source-plus'; plus.textContent = '+';
      button.append(name, sub, plus);
      button.ondragstart = event => {
        event.dataTransfer.setData('application/x-notmonk-roadmap', JSON.stringify({kind:item.kind, ref:item.ref}));
        event.dataTransfer.effectAllowed = 'copy';
      };
      button.onclick = () => {
        const viewport = el('rm-viewport');
        addNode(item, (viewport.scrollLeft + viewport.clientWidth / 2) / board.zoom - CARD_W / 2,
          (viewport.scrollTop + viewport.clientHeight / 2) / board.zoom - CARD_H / 2);
      };
      list.append(button);
    }
    if (!items.length) { const p = document.createElement('p'); p.className = 'rm-no-results'; p.textContent = 'Eşleşen başlık bulunamadı.'; list.append(p); }
  }
  function addNode(item, x, y) {
    checkpoint();
    while (board.nodes.some(n => Math.abs(n.x-x) < 15 && Math.abs(n.y-y) < 15) && x < WIDTH-CARD_W-30 && y < HEIGHT-CARD_H-30) { x += 28; y += 28; }
    const node = { id: crypto.randomUUID(), kind:item.kind, ref:item.ref, title:item.title, subtitle:item.subtitle,
      x:clamp(x, 20, WIDTH-CARD_W-20), y:clamp(y, 20, HEIGHT-CARD_H-20) };
    board.nodes.push(node); selected = {type:'node', id:node.id}; commit();
  }
  function connect(from, to) {
    pending = null;
    if (from === to || board.edges.some(e => e.from === from && e.to === to)) { render(); return; }
    if (!board.nodes.some(n=>n.id===from) || !board.nodes.some(n=>n.id===to)) return;
    checkpoint();
    const edge = { id: crypto.randomUUID(), from, to }; board.edges.push(edge);
    selected = {type:'edge', id:edge.id}; commit();
  }
  function removeSelection() {
    if (!selected) return;
    checkpoint();
    if (selected.type === 'node') {
      board.nodes = board.nodes.filter(n => n.id !== selected.id);
      board.edges = board.edges.filter(e => e.from !== selected.id && e.to !== selected.id);
    } else board.edges = board.edges.filter(e => e.id !== selected.id);
    selected = pending = null; commit();
  }
  function point(event) {
    const rect = el('rm-surface').getBoundingClientRect();
    return {x:(event.clientX-rect.left)/board.zoom, y:(event.clientY-rect.top)/board.zoom};
  }
  function path(from, to) {
    const gap = to.y - from.y;
    const bend = gap >= 0 ? Math.max(8, gap * 0.45) : Math.max(80, Math.abs(gap) * 0.5);
    return `M ${from.x} ${from.y} C ${from.x} ${from.y+bend}, ${to.x} ${to.y-bend}, ${to.x} ${to.y}`;
  }
  function svgElement(tag, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,value] of Object.entries(attributes)) node.setAttribute(key,value);
    return node;
  }
  function drawEdges(cursor) {
    const svg = el('rm-edges'); svg.replaceChildren();
    const defs = svgElement('defs',{}), marker = svgElement('marker',{id:'rm-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
    marker.append(svgElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'currentColor'})); defs.append(marker); svg.append(defs);
    for (const edge of board.edges) {
      const a = board.nodes.find(n=>n.id===edge.from), b = board.nodes.find(n=>n.id===edge.to);
      if (!a || !b) continue;
      const d = path({x:a.x+CARD_W/2,y:a.y+CARD_H+5},{x:b.x+CARD_W/2,y:b.y-7});
      const line = svgElement('path',{d,class:`rm-edge${selected?.id===edge.id?' selected':''}`,'marker-end':'url(#rm-arrow)'});
      const hit = svgElement('path',{d,class:'rm-edge-hit',tabindex:0,role:'button','aria-label':`${resolveNode(a).title} → ${resolveNode(b).title}: bağlantıyı seç`});
      const select = () => { selected = {type:'edge',id:edge.id}; pending=null; render(); };
      hit.onclick = select;
      hit.onkeydown = event => { if (event.key==='Enter' || event.key===' ') { event.preventDefault(); select(); } };
      svg.append(line,hit);
    }
    if (pending && cursor) {
      const a = board.nodes.find(n=>n.id===pending);
      if (a) svg.append(svgElement('path',{d:path({x:a.x+CARD_W/2,y:a.y+CARD_H+5},cursor),class:'rm-edge preview'}));
    }
  }
  function render() {
    if (!ready) return;
    const nodes = el('rm-nodes'); nodes.replaceChildren();
    for (const node of board.nodes) {
      const data = resolveNode(node);
      const card = document.createElement('article');
      card.className = `rm-node${selected?.id===node.id?' selected':''}${pending===node.id?' connecting':''}`;
      decorateCard(card, node.kind === 'area' ? node.ref : state.topics.find(t=>t.id===node.ref)?.category);
      card.dataset.nodeId = node.id; card.style.left = `${node.x}px`; card.style.top = `${node.y}px`;
      card.tabIndex = 0; card.setAttribute('aria-label', `${data.title}. Ok tuşlarıyla taşı.`);
      const tag = document.createElement('small'); tag.textContent = node.kind==='area'?'ALAN':data.status || 'KONU';
      const title = document.createElement('strong'); title.textContent = data.title; title.title = data.title;
      const sub = document.createElement('span'); sub.textContent = node.kind==='area'?'Öğrenme alanı':data.subtitle;
      card.append(tag,title,sub);
      for (const direction of ['in','out']) {
        const port = document.createElement('button'); port.type='button'; port.className=`rm-port ${direction}`; port.dataset.port=direction;
        port.setAttribute('aria-label',`${data.title}: ${direction==='out'?'bağlantı başlat':'bağlantıyı buraya getir'}`);
        port.title=direction==='out'?'Buradan bir başka karta sürükle veya tıkla':'Bağlantının hedefi';
        port.onclick=event=> { event.stopPropagation(); if (direction==='out') {pending=node.id; selected=null;render();} else if(pending) connect(pending,node.id); };
        card.append(port);
      }
      card.onpointerdown = event => {
        if (event.button!==0) return;
        const port=event.target.closest('.rm-port');
        if (port) {
          if(port.dataset.port==='out') { pending=node.id; gesture={type:'connect',id:node.id,startX:event.clientX,startY:event.clientY,moved:false}; }
          return;
        }
        event.preventDefault();
        selected={type:'node',id:node.id};
        const p=point(event); gesture={type:'node',id:node.id,x:p.x,y:p.y,originalX:node.x,originalY:node.y,before:snapshot(),moved:false};
        render();
      };
      card.onkeydown = event => {
        if (event.target!==card) return;
        if(event.key==='Enter' || event.key===' ') {event.preventDefault();selected={type:'node',id:node.id};render();return;}
        const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
        if(!moves[event.key]) return;
        event.preventDefault(); checkpoint(); const step=event.shiftKey?40:10;
        node.x=clamp(node.x+moves[event.key][0]*step,20,WIDTH-CARD_W-20);
        node.y=clamp(node.y+moves[event.key][1]*step,20,HEIGHT-CARD_H-20); selected={type:'node',id:node.id};commit();
        [...el('rm-nodes').children].find(c=>c.dataset.nodeId===node.id)?.focus();
      };
      nodes.append(card);
    }
    drawEdges();
    el('rm-empty').classList.toggle('hidden',board.nodes.length>0);
    el('rm-delete').disabled=!selected; el('rm-undo').disabled=!undo.length; el('rm-redo').disabled=!redo.length;
    el('rm-count').textContent=`${board.nodes.length} kart · ${board.edges.length} bağlantı`;
    el('rm-hint').textContent=pending?'Hedef kartın üst noktasına tıkla. İptal: Esc.':'Kaydır: gezin · İki parmakla sıkıştır / Ctrl + tekerlek: yakınlaştır · Orta tuş + tekerlek: yakınlaştır · F: tümünü gör';
    applyZoom();
  }
  function applyZoom() {
    const v = el('rm-viewport');
    // Size the dotted area around the existing diagram instead of a vast fixed sheet.
    const canvasWidth = Math.max(1400, ...board.nodes.map(n => n.x + CARD_W + 120));
    const canvasHeight = Math.max(1000, ...board.nodes.map(n => n.y + CARD_H + 120));
    el('rm-surface').style.width = `${canvasWidth}px`;
    el('rm-surface').style.height = `${canvasHeight}px`;
    el('rm-edges').setAttribute('width', canvasWidth);
    el('rm-edges').setAttribute('height', canvasHeight);
    const centerX = board.nodes.length ? (Math.min(...board.nodes.map(n=>n.x)) + Math.max(...board.nodes.map(n=>n.x+CARD_W))) / 2 : canvasWidth / 2;
    const centerY = board.nodes.length ? (Math.min(...board.nodes.map(n=>n.y)) + Math.max(...board.nodes.map(n=>n.y+CARD_H))) / 2 : canvasHeight / 2;
    offsetX = board.fitView ? Math.max(0, v.clientWidth / 2 - centerX * board.zoom) : (board.offsetX || 0);
    offsetY = board.fitView ? Math.max(0, v.clientHeight / 2 - centerY * board.zoom) : (board.offsetY || 0);
    el('rm-surface').style.left = `${offsetX}px`;
    el('rm-surface').style.top = `${offsetY}px`;
    el('rm-surface').style.transform=`scale(${board.zoom})`;

    // Ensure rm-space is always large enough so scrollLeft/scrollTop are never clamped
    const minSpaceW = (board.scrollX || 0) + (v.clientWidth || 1000) + 800;
    const minSpaceH = (board.scrollY || 0) + (v.clientHeight || 800) + 800;
    const spaceW = Math.max(canvasWidth * board.zoom + 2 * offsetX, minSpaceW);
    const spaceH = Math.max(canvasHeight * board.zoom + 2 * offsetY, minSpaceH);
    el('rm-space').style.width = `${spaceW}px`;
    el('rm-space').style.height = `${spaceH}px`;

    updateGrid();
    el('rm-zoom-value').textContent=`${Math.round(board.zoom*100)}%`;
  }
  function zoomTo(value, anchor = null) {
    const viewport=el('rm-viewport'), old=board.zoom;
    const ax=anchor?.x ?? viewport.clientWidth/2, ay=anchor?.y ?? viewport.clientHeight/2;
    const x=(viewport.scrollLeft+ax-offsetX)/old, y=(viewport.scrollTop+ay-offsetY)/old;
    board.fitView=false;
    board.zoom=clamp(value,.05,1.6);
    // Keep the point under the cursor fixed, even beside the canvas boundary.
    board.offsetX=Math.max(offsetX, ax-x*board.zoom, 0);
    board.offsetY=Math.max(offsetY, ay-y*board.zoom, 0);
    applyZoom();
    viewport.scrollLeft=x*board.zoom+offsetX-ax;
    viewport.scrollTop=y*board.zoom+offsetY-ay;
    saveView();
  }
  function cancelWheelZoom() {
    cancelAnimationFrame(wheelFrame);wheelFrame=0;wheelDelta=0;
  }
  function updateGrid() {
    const viewport=el('rm-viewport'), spacing=clamp(24*board.zoom,16,32);
    viewport.style.backgroundSize=`${spacing}px ${spacing}px`;
    viewport.style.backgroundPosition=`${offsetX-viewport.scrollLeft}px ${offsetY-viewport.scrollTop}px`;
  }
  function readingView() {
    cancelWheelZoom();
    const node=board.nodes.find(n=>n.id===selected?.id) || [...board.nodes].sort((a,b)=>a.y-b.y||a.x-b.x)[0];
    board.fitView=false;board.zoom=.8;board.offsetX=board.offsetY=0;
    applyZoom();
    if(node) {
      const v=el('rm-viewport');
      v.scrollLeft=Math.max(0,node.x*board.zoom-80);
      v.scrollTop=Math.max(0,node.y*board.zoom-60);
    }
    saveView();
  }
  function saveView() {
    if (isRestoring) return;
    const v = el('rm-viewport');
    if (!v) return;
    updateGrid();
    board.scrollX = v.scrollLeft;
    board.scrollY = v.scrollTop;
    board.offsetX = offsetX;
    board.offsetY = offsetY;
    try { localStorage.setItem(KEY, JSON.stringify(board)); } catch(e) {}
    clearTimeout(viewTimer);
    viewTimer = setTimeout(persist, 120);
  }
  function fit() {
    cancelWheelZoom();
    if(!board.nodes.length) {zoomTo(.8);return;}
    const minX=Math.min(...board.nodes.map(n=>n.x)),minY=Math.min(...board.nodes.map(n=>n.y));
    const maxX=Math.max(...board.nodes.map(n=>n.x+CARD_W)),maxY=Math.max(...board.nodes.map(n=>n.y+CARD_H));
    const v=el('rm-viewport');
    if (!v.clientWidth || !v.clientHeight) return;
    board.fitView=true;
    // Padding is in screen pixels, including the connection ports and scrollbars.
    board.zoom=clamp(Math.min((v.clientWidth-80)/(maxX-minX),(v.clientHeight-80)/(maxY-minY),1),.05,1.6);
    applyZoom();
    v.scrollLeft=(minX+maxX)/2*board.zoom+offsetX-v.clientWidth/2;
    v.scrollTop=(minY+maxY)/2*board.zoom+offsetY-v.clientHeight/2;
    saveView();
  }
  function restoreViewPosition() {
    const v = el('rm-viewport');
    if (!v) return;
    if (board.fitView && board.nodes.length) {
      fit();
      return;
    }
    isRestoring = true;
    const targetX = Number.isFinite(board.scrollX) ? Math.max(0, board.scrollX) : 0;
    const targetY = Number.isFinite(board.scrollY) ? Math.max(0, board.scrollY) : 0;
    v.scrollLeft = targetX;
    v.scrollTop = targetY;
    updateGrid();

    requestAnimationFrame(() => {
      v.scrollLeft = targetX;
      v.scrollTop = targetY;
      updateGrid();
      setTimeout(() => {
        v.scrollLeft = targetX;
        v.scrollTop = targetY;
        updateGrid();
        isRestoring = false;
      }, 60);
    });
  }
  function show() {
    const select=el('rm-category'), previous=select.value;
    select.replaceChildren(new Option('Tüm alanlar',''),...state.categories.map(c=>new Option(label(c),c)));select.value=previous;
    renderLibrary();
    render();
    restoreViewPosition();
  }
  async function init() {
    let saved=(await storageGet([KEY]))[KEY];
    if (!saved) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) saved = JSON.parse(raw);
      } catch(e) {}
    }
    if(saved && Array.isArray(saved.nodes) && Array.isArray(saved.edges)) {
      const ids=new Set();
      board.nodes=saved.nodes.filter(n=> n && typeof n.id==='string' && !ids.has(n.id) && ids.add(n.id) && ['area','topic'].includes(n.kind) && typeof n.ref==='string' && Number.isFinite(n.x) && Number.isFinite(n.y))
        .map(n=>({...n,x:clamp(n.x,20,WIDTH-CARD_W-20),y:clamp(n.y,20,HEIGHT-CARD_H-20)}));
      const validIds=new Set(board.nodes.map(n=>n.id)), pairs=new Set();
      board.edges=saved.edges.filter(e=>e && typeof e.id==='string' && validIds.has(e.from) && validIds.has(e.to) && e.from!==e.to && !pairs.has(`${e.from}:${e.to}`) && pairs.add(`${e.from}:${e.to}`));
      board.offsetX=Number.isFinite(saved.offsetX)?Math.max(0,saved.offsetX):0;
      board.offsetY=Number.isFinite(saved.offsetY)?Math.max(0,saved.offsetY):0;
      board.fitView=saved.fitView === true;
      board.zoom=Number.isFinite(saved.zoom)?clamp(saved.zoom,.05,1.6):.8;
      board.scrollX=Number.isFinite(saved.scrollX)?Math.max(0,saved.scrollX):0;
      board.scrollY=Number.isFinite(saved.scrollY)?Math.max(0,saved.scrollY):0;
    }
    ready=true;
    el('rm-search').oninput=renderLibrary;el('rm-category').onchange=renderLibrary;
    for(const kind of ['areas','topics']) el(`rm-${kind}`).onclick=()=> {
      mode=kind;for(const k of ['areas','topics']) {el(`rm-${k}`).classList.toggle('active',k===mode);el(`rm-${k}`).setAttribute('aria-pressed',String(k===mode));}renderLibrary();
    };
    el('rm-delete').onclick=removeSelection;el('rm-undo').onclick=()=>undoChange(true);el('rm-redo').onclick=()=>undoChange(false);
    el('rm-zoom-in').onclick=()=>zoomTo(board.zoom+.1);el('rm-zoom-out').onclick=()=>zoomTo(board.zoom-.1);el('rm-fit').onclick=fit;
    el('rm-reading').onclick=readingView;
    el('rm-zoom-value').onclick=()=> {cancelWheelZoom();zoomTo(.8);};
    el('rm-save-status').onclick=()=>persist();
    const viewport=el('rm-viewport');
    viewport.addEventListener('wheel', event => {
      if (state.activeTab !== 'roadmap') return;
      event.preventDefault();
      if (gesture) return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
      if (!event.ctrlKey && !middlePressed) {
        cancelWheelZoom();
        board.offsetX=offsetX;board.offsetY=offsetY;board.fitView=false;
        viewport.scrollLeft+=(event.shiftKey ? (event.deltaX || event.deltaY) : event.deltaX)*unit;
        if (!event.shiftKey) viewport.scrollTop+=event.deltaY*unit;
        saveView();return;
      }
      const rect=viewport.getBoundingClientRect();
      wheelAnchor={x:event.clientX-rect.left,y:event.clientY-rect.top};
      wheelDelta+=clamp(event.deltaY*unit,-160,160)*(event.ctrlKey ? .006 : .002);
      if (!wheelFrame) wheelFrame=requestAnimationFrame(()=> {
        wheelFrame=0;const delta=wheelDelta;wheelDelta=0;
        zoomTo(board.zoom*Math.exp(-delta),wheelAnchor);
      });
    }, {passive:false});
    new ResizeObserver(() => {
      if (state.activeTab==='roadmap' && !gesture) {
        if (board.fitView && board.nodes.length) fit();
        else updateGrid();
      }
    }).observe(viewport);
    viewport.ondragover=e=> {if([...e.dataTransfer.types].includes('application/x-notmonk-roadmap')) {e.preventDefault();e.dataTransfer.dropEffect='copy';}};
    viewport.ondrop=e=> {
      e.preventDefault();let data;try {data=JSON.parse(e.dataTransfer.getData('application/x-notmonk-roadmap'));}catch{return;}
      const item=data.kind==='area'?state.categories.includes(data.ref)&&{kind:'area',ref:data.ref,title:label(data.ref),subtitle:'Alan'}
        :data.kind==='topic'&&state.topics.find(t=>t.id===data.ref);
      if(!item)return;
      const p=point(e);addNode(data.kind==='topic'?{kind:'topic',ref:item.id,title:item.title,subtitle:label(item.category)}:item,p.x-CARD_W/2,p.y-CARD_H/2);
    };
    viewport.onpointerdown=e=> {
      if (e.button===1) {e.preventDefault();middlePressed=true;return;}
      if(e.button!==0 || e.target.closest('.rm-node,.rm-edge-hit,button'))return;
      e.preventDefault();selected=pending=null;
      cancelWheelZoom();board.offsetX=offsetX;board.offsetY=offsetY;board.fitView=false;
      gesture={type:'pan',x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.classList.add('panning');render();
    };
    viewport.onscroll=()=> {if(state.activeTab==='roadmap' && !isRestoring)saveView();};
    document.addEventListener('pointermove',e=> {
      if(!gesture)return;
      if(gesture.type==='pan') {viewport.scrollLeft=gesture.left-(e.clientX-gesture.x);viewport.scrollTop=gesture.top-(e.clientY-gesture.y);return;}
      if(gesture.type==='connect') {gesture.moved ||= Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>5;drawEdges(point(e));return;}
      const p=point(e),n=board.nodes.find(n=>n.id===gesture.id);if(!n)return;
      const x=clamp(gesture.originalX+p.x-gesture.x,20,WIDTH-CARD_W-20),y=clamp(gesture.originalY+p.y-gesture.y,20,HEIGHT-CARD_H-20);
      gesture.moved ||= Math.abs(x-n.x)+Math.abs(y-n.y)>1;n.x=x;n.y=y;
      const card=[...el('rm-nodes').children].find(c=>c.dataset.nodeId===n.id);card.style.left=`${x}px`;card.style.top=`${y}px`;drawEdges();
    });
    window.addEventListener('blur',()=> {middlePressed=false;cancelWheelZoom();});
    viewport.addEventListener('auxclick',e=> {if(e.button===1)e.preventDefault();});
    document.addEventListener('pointerup',e=> {
      if(e.button===1)middlePressed=false;
      if(!gesture)return;const g=gesture;gesture=null;viewport.classList.remove('panning');
      if(g.type==='pan') {saveView();}
      if(g.type==='node'&&g.moved) {undo.push(g.before);if(undo.length>60)undo.shift();redo=[];commit();}
      if(g.type==='connect'&&g.moved) {
        const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.rm-node');
        if(target)connect(g.id,target.dataset.nodeId);else {pending=null;render();}
      }
    });
    document.addEventListener('pointercancel',()=> {
      middlePressed=false;
      if(gesture?.type==='node')Object.assign(board,gesture.before);
      gesture=pending=null;viewport.classList.remove('panning');render();
    });
    window.addEventListener('beforeunload',()=> {
      if(state.activeTab==='roadmap' && !isRestoring) {
        board.scrollX=viewport.scrollLeft;board.scrollY=viewport.scrollTop;board.offsetX=offsetX;board.offsetY=offsetY;
        try { localStorage.setItem(KEY, JSON.stringify(board)); } catch(e) {}
        storageSet({ [KEY]: copy(board) });
      }
    });
    document.addEventListener('visibilitychange',()=> {
      if(document.visibilityState==='hidden' && state.activeTab==='roadmap' && !isRestoring) {
        board.scrollX=viewport.scrollLeft;board.scrollY=viewport.scrollTop;board.offsetX=offsetX;board.offsetY=offsetY;
        try { localStorage.setItem(KEY, JSON.stringify(board)); } catch(e) {}
        storageSet({ [KEY]: copy(board) });
      }
    });
    document.addEventListener('keydown',e=> {
      if(state.activeTab!=='roadmap' || e.target.closest('input,textarea,select,[contenteditable="true"]') || dialog.open || notionDialog?.open)return;
      if (['+','=','-','0','f','F'].includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();cancelWheelZoom();
        if(e.key.toLowerCase()==='f')fit();
        else zoomTo(e.key === '0' ? .8 : board.zoom*(e.key==='-'?1/1.15:1.15));
      }
      if(e.key==='Escape') {pending=null;selected=null;render();}
      if(e.key==='Delete'||e.key==='Backspace') {e.preventDefault();removeSelection();}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z') {e.preventDefault();undoChange(!e.shiftKey);}
    });
    status('Kaydedildi · Bu cihazda');
  }
  return {init,show};
})();
