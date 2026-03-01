// Library UI (MVP -> Obsidian-like v0.2)

const $ = (id)=>document.getElementById(id);

function esc(s){
  return String(s??'').replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function cacheBust(u){
  const sep = u.includes("?") ? "&" : "?";
  return u + sep + "_=" + Date.now();
}

async function fetchJson(u){
  const r = await fetch(cacheBust(u));
  if(!r.ok) throw new Error("fetch "+u+" "+r.status);
  return await r.json();
}

async function fetchText(u){
  const r = await fetch(cacheBust(u));
  if(!r.ok) throw new Error("fetch "+u+" "+r.status);
  return await r.text();
}

let API_BASE = ''; // '' = same origin

function getPreferredApiBase(){
  const u = new URL(location.href);
  const q = u.searchParams.get('api');
  if(q) return q;
  const saved = localStorage.getItem('library_api_base') || '';
  return saved;
}

function setPreferredApiBase(base){
  API_BASE = base || '';
  localStorage.setItem('library_api_base', API_BASE);
}

async function apiRead(rel){
  const r = await fetch(cacheBust(`${API_BASE}/api/library/read?rel=${encodeURIComponent(rel)}`));
  if(!r.ok) throw new Error('api_read_failed');
  const j = await r.json();
  if(!j.ok) throw new Error(j.error||'api_read_failed');
  return j.content;
}

async function apiWrite(rel, content){
  const r = await fetch(`${API_BASE}/api/library/write?_=${Date.now()}` ,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({rel_path: rel, content}),
  });
  if(!r.ok) throw new Error('api_write_failed');
  const j = await r.json().catch(()=>({}));
  if(j && j.ok===false) throw new Error(j.error||'api_write_failed');
  return j;
}

let API_OK = false;
async function probeApiBase(base){
  const r = await fetch(`${base}/api/library/read?rel=${encodeURIComponent('00_Inbox/__nonexistent__.md')}&_=${Date.now()}`);
  // 404 is fine; we only care that server responds with JSON
  return r.ok || r.status === 404;
}

async function detectApi(){
  // Prefer editable API on 8802 automatically (one-page UX).
  // Fallback to same-origin read-only if 8802 is not running.
  const preferred = getPreferredApiBase();
  const editable = `http://${location.hostname}:8802`;

  const candidates = [];
  // 1) explicit ?api=...
  const u = new URL(location.href);
  const q = u.searchParams.get('api');
  if(q) candidates.push(q);

  // 2) if user saved a base before, try it next
  if(preferred) candidates.push(preferred);

  // 3) auto: try 8802 first
  candidates.push(editable);

  // 4) finally, same-origin (read-only)
  candidates.push('');

  for(const base of candidates){
    try{
      await probeApiBase(base);
      setPreferredApiBase(base);
      API_OK = true;
      return;
    }catch(e){
      // continue
    }
  }

  setPreferredApiBase('');
  API_OK = false;
}

function parseFrontmatter(md){
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if(!m) return { fm:null, body: md };
  return { fm: m[1], body: md.slice(m[0].length) };
}

function getFmValue(fmText, key){
  if(!fmText) return '';
  const re = new RegExp(`^${key}:\\s*(.*)\\s*$`, 'm');
  const m = fmText.match(re);
  if(!m) return '';
  return m[1].replace(/^"|"$/g,'').replace(/^'|'$/g,'');
}

function setFmValue(fmText, key, value){
  const safe = value==='' ? '' : JSON.stringify(value);
  if(!fmText){
    if(value==='') return '';
    return `${key}: ${safe}`;
  }
  const lines = fmText.split(/\n/);
  let found=false;
  const out=lines.map(line=>{
    if(line.startsWith(key+':')){ found=true; return value==='' ? null : `${key}: ${safe}`; }
    return line;
  }).filter(x=>x!==null);
  if(!found && value!=='') out.push(`${key}: ${safe}`);
  return out.join('\n');
}

function upsertFrontmatter(md, updates){
  const {fm, body} = parseFrontmatter(md);
  let nextFm = fm || '';
  for(const [k,v] of Object.entries(updates)){
    nextFm = setFmValue(nextFm, k, v);
  }
  nextFm = nextFm.trim();
  if(!nextFm){
    return body.startsWith('\n')? body.slice(1) : body;
  }
  return `---\n${nextFm}\n---\n\n${body.replace(/^\n+/,'')}`;
}

function fmtTs(ts){
  if(!ts) return "-";
  const d = new Date(ts*1000);
  return d.toLocaleDateString("zh-TW",{month:"2-digit",day:"2-digit"})+" "+d.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit",hour12:false});
}

function renderMarkdownBasic(md){
  // small renderer: headings + links + code fences (enough for internal notes)
  let out = esc(md);
  out = out.replace(/```([\s\S]*?)```/g, (m,code)=>`<pre><code>${code}</code></pre>`);
  out = out.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  out = out.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  out = out.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  out = out.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  out = out.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  out = out.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m,t,href)=>{
    // internal md links: let us intercept later (we keep href as-is)
    return `<a href="${esc(href)}">${esc(t)}</a>`;
  });
  out = out.replace(/\n/g,'<br/>');
  return out;
}

let INDEX=null;
let DOCS=[];
let ID2DOC={};
let REL2ID={};

function docItem(d){
  return `<div class="item" data-id="${d.id}">
    <div class="t">${esc(d.title||d.rel_path)}</div>
    <div class="p">${esc(d.rel_path)} · ${fmtTs(d.mtime)}</div>
  </div>`;
}

function mountList(el, docs){
  el.innerHTML = docs.map(docItem).join("") || '<div class="p">— 無結果 —</div>';
}

function buildTree(docs){
  // multi-level tree (folder-only nodes) up to N levels, simple HTML
  const root = { name: '(root)', path: '', children: {}, count: 0 };
  docs.forEach(d=>{
    const parts = d.rel_path.split('/');
    let node = root;
    node.count++;
    for(let i=0;i<parts.length-1;i++){
      const part = parts[i];
      node.children[part] ||= { name: part, path: (node.path?node.path+'/':'')+part, children: {}, count: 0 };
      node = node.children[part];
      node.count++;
    }
  });

  function renderNode(node, depth){
    const kids = Object.values(node.children).sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
    if(node.path===''){
      return kids.map(k=>renderNode(k,0)).join('');
    }
    const id = 'f_'+btoa(unescape(encodeURIComponent(node.path))).replace(/=+$/,'');
    const inner = kids.length ? `<div class="kids" data-kids="${esc(node.path)}">${kids.map(k=>renderNode(k,depth+1)).join('')}</div>` : '';
    return `
      <div class="folder" style="padding-left:${8+depth*12}px">
        <button class="twisty" data-toggle="${esc(node.path)}" aria-label="toggle">▸</button>
        <div class="fitem" data-folder="${esc(node.path)}">
          <div class="t">${esc(node.name)}</div>
          <div class="p">${node.count} docs</div>
        </div>
      </div>
      <div class="sub" id="${id}" data-sub="${esc(node.path)}" style="display:none">${inner}</div>
    `;
  }

  return renderNode(root,0);
}

function toggleFolder(path){
  const id = 'f_'+btoa(unescape(encodeURIComponent(path))).replace(/=+$/,'');
  const el = document.getElementById(id);
  if(!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
}

async function openDoc(id){
  const d = ID2DOC[id];
  if(!d) return;
  $('doc').innerHTML = '<div class="p">載入中…</div>';
  const editorEl = $('editor');
  if(editorEl){ editorEl.style.display='none'; editorEl.innerHTML=''; }
  const actionEl = $('action');
  if(actionEl){ actionEl.style.display='none'; actionEl.innerHTML=''; } // legacy (unused)

  // render links panel first
  const outRels = (INDEX.links?.outbound?.[id]||[]);
  const inIds = (INDEX.links?.inbound?.[id]||[]);

  const out = outRels.map(r=>{
    const tid = REL2ID[r];
    return tid
      ? `<a href="#" data-open="${tid}">${esc(r)}</a>`
      : `<div style="color:var(--muted)">${esc(r)}</div>`;
  });
  const inn = inIds.map(srcId=>{
    const sd = ID2DOC[srcId];
    return sd ? `<a href="#" data-open="${sd.id}">${esc(sd.title||sd.rel_path)}</a>` : '';
  });
  $('links').innerHTML = `
    <div class="lbl">Outbound</div>
    ${out.join('')||'<div style="color:var(--muted)">—</div>'}
    <div class="lbl">Inbound</div>
    ${inn.join('')||'<div style="color:var(--muted)">—</div>'}
  `;

  try{
    let md;
    if(API_OK){
      try{
        md = await apiRead(d.rel_path);
      }catch(e){
        // fallback to static
        md = await fetchText(d.doc_url || ('../data/library/docs/'+d.rel_path));
      }
    }else{
      md = await fetchText(d.doc_url || ('../data/library/docs/'+d.rel_path));
    }

    $('doc').innerHTML = `
      <div class="p" style="color:var(--muted);font-family:var(--mono);font-size:11px">${esc(d.rel_path)} · ${fmtTs(d.mtime)}</div>
      <div class="md">${renderMarkdownBasic(md)}</div>
    `;

    // editor panel (raw markdown)
    if(editorEl){
      editorEl.style.display='block';

      const {fm} = parseFrontmatter(md);
      const act = getFmValue(fm,'assistant_action');
      const target = getFmValue(fm,'assistant_target');
      const note = getFmValue(fm,'assistant_note');

      editorEl.innerHTML = `
        <div class="row">
          <div class="seg" role="tablist" aria-label="view">
            <button id="ed_tab_edit" type="button">編輯</button>
            <button id="ed_tab_preview" class="on" type="button">預覽</button>
          </div>
          <button class="btn btn-sm" id="ed_save">儲存內容</button>

          <div class="aa row" style="margin-left:auto">
            <label>處理</label>
            <select id="aa_action">
              <option value="">（無）</option>
              <option value="keep">保留</option>
              <option value="delete">刪除</option>
              <option value="move">移到…</option>
              <option value="merge">合併到…</option>
            </select>
            <input id="aa_target" placeholder="move/merge 目標" style="min-width:200px" />
            <button class="btn btn-sm" id="aa_save">儲存指令</button>
            <button class="btn btn-sm" id="aa_fill_keep">一鍵保留</button>
            <button class="btn btn-sm" id="aa_fill_delete">一鍵刪除</button>
            <span id="aa_status" class="aa-status"></span>
          </div>
        </div>

        <div id="ed_wrap" style="margin-top:10px">
          <textarea id="ed_text"></textarea>
        </div>

        <div class="aa" style="margin-top:10px">
          <textarea id="aa_note" placeholder="備註（可留空）"></textarea>
        </div>
      `;

      const tabEdit = $('ed_tab_edit');
      const tabPrev = $('ed_tab_preview');
      const save = $('ed_save');
      const wrap = $('ed_wrap');
      const ta = $('ed_text');

      const sel = $('aa_action');
      const tgt = $('aa_target');
      const noteEl = $('aa_note');
      const saveActBtn = $('aa_save');
      const oneKeep = $('aa_fill_keep');
      const oneDel = $('aa_fill_delete');
      const statusEl = $('aa_status');

      if(ta) ta.value = md;
      if(sel) sel.value = act || '';
      if(tgt) tgt.value = target || '';
      if(noteEl) noteEl.value = note || '';
      if(statusEl) statusEl.textContent = '';

      function setMode(mode){
        if(mode==='preview'){
          if(tabPrev) tabPrev.classList.add('on');
          if(tabEdit) tabEdit.classList.remove('on');
          if(wrap) wrap.style.display='none';
        }else{
          if(tabEdit) tabEdit.classList.add('on');
          if(tabPrev) tabPrev.classList.remove('on');
          if(wrap) wrap.style.display='block';
        }
      }
      setMode('preview');
      if(tabEdit) tabEdit.onclick = ()=>setMode('edit');
      if(tabPrev) tabPrev.onclick = ()=>setMode('preview');

      async function saveActionOnly(){
        if(!API_OK){
          if(statusEl) statusEl.textContent = '無法寫入（8802 未連上）';
          alert('目前無法寫入（8802 未連上）。');
          return;
        }
        try{
          if(statusEl) statusEl.textContent = '存檔中…';
          if(saveActBtn) saveActBtn.disabled = true;
          if(oneKeep) oneKeep.disabled = true;
          if(oneDel) oneDel.disabled = true;

          const base = (ta?.value ?? md);
          const updated = upsertFrontmatter(base, {
            assistant_action: (sel?.value||'').trim(),
            assistant_target: (tgt?.value||'').trim(),
            assistant_note: (noteEl?.value||'').trim(),
          });
          await apiWrite(d.rel_path, updated);
          md = updated;
          if(ta) ta.value = md;
          const mdEl = $('doc').querySelector('.md');
          if(mdEl) mdEl.innerHTML = renderMarkdownBasic(md);
          if(statusEl) statusEl.textContent = '已存';
        }catch(e){
          if(statusEl) statusEl.textContent = '儲存失敗';
          alert('儲存失敗：'+(e?.message||e));
        }finally{
          if(saveActBtn) saveActBtn.disabled = false;
          if(oneKeep) oneKeep.disabled = false;
          if(oneDel) oneDel.disabled = false;
        }
      }

      if(saveActBtn) saveActBtn.onclick = saveActionOnly;
      if(oneKeep) oneKeep.onclick = async ()=>{ if(sel) sel.value='keep'; await saveActionOnly(); };
      if(oneDel) oneDel.onclick = async ()=>{ if(sel) sel.value='delete'; await saveActionOnly(); };

      if(save) save.onclick = async ()=>{
        if(!API_OK){
          alert('目前無法寫入（8802 未連上）。');
          return;
        }
        try{
          const next = (ta?.value ?? '');
          await apiWrite(d.rel_path, next);
          md = next;
          const mdEl = $('doc').querySelector('.md');
          if(mdEl) mdEl.innerHTML = renderMarkdownBasic(md);
          alert('已儲存');
        }catch(e){
          alert('儲存失敗：'+(e?.message||e));
        }
      };
    }

  }catch(e){
    $('doc').innerHTML = `<div class="p">無法載入全文（${esc(d.rel_path)}）</div>`;
  }
}

function setLeftMode(mode, folderPath=''){
  // mode: 'tree' | 'list'
  const back = $('btn-back');
  const crumb = $('crumb');
  if(mode==='list'){
    if(back) back.style.display = 'inline-flex';
    if(crumb){ crumb.style.display='block'; crumb.textContent = folderPath || ''; }
    $('tree').style.display = 'none';
    $('results').style.display = 'block';
    $('results').scrollTop = 0;
  }else{
    if(back) back.style.display = 'none';
    if(crumb) crumb.style.display = 'none';
    $('tree').style.display = 'block';
    $('results').style.display = 'none';
    $('results').innerHTML = '';
  }
}

function wireClicks(){
  document.body.addEventListener('click', (ev)=>{
    const it = ev.target.closest('.item[data-id]');
    if(it){
      ev.preventDefault();
      openDoc(it.dataset.id);
      return;
    }
    const f = ev.target.closest('.fitem[data-folder]');
    if(f){
      const folder = f.dataset.folder;
      const subset = DOCS.filter(d=>d.rel_path.startsWith(folder+'/'));
      setLeftMode('list', folder);
      mountList($('results'), subset.slice(0,500));
      return;
    }
    const l = ev.target.closest('a[data-open]');
    if(l){
      ev.preventDefault();
      openDoc(l.dataset.open);
      return;
    }
    const tgl = ev.target.closest('button[data-toggle]');
    if(tgl){
      ev.preventDefault();
      toggleFolder(tgl.dataset.toggle);
      return;
    }

    // intercept internal md links
    const a = ev.target.closest('.md a[href]');
    if(a){
      const href = a.getAttribute('href')||'';
      if(href.toLowerCase().endsWith('.md')){
        ev.preventDefault();
        const clean = href.split('#')[0].split('?')[0].replace(/^\//,'');
        const id = REL2ID[clean];
        if(id) openDoc(id);
        return;
      }
      // external
      if(href.startsWith('http://')||href.startsWith('https://')){
        a.setAttribute('target','_blank');
        a.setAttribute('rel','noopener');
        return;
      }
    }
  });
}

function wireSearch(){
  $('q').addEventListener('input', ()=>{
    const q = $('q').value.trim();
    if(!q){
      // return to tree mode
      setLeftMode('tree');
      return;
    }
    const qq = q.toLowerCase();
    const hits = DOCS.filter(d=>{
      return (d.title||'').toLowerCase().includes(qq)
        || (d.rel_path||'').toLowerCase().includes(qq)
        || (d.excerpt||'').toLowerCase().includes(qq);
    }).slice(0,200);
    setLeftMode('list', `搜尋：${q}`);
    mountList($('results'), hits);
  });
}

async function init(){
  wireClicks();
  wireSearch();

  const back = $('btn-back');
  if(back){
    back.addEventListener('click', (ev)=>{
      ev.preventDefault();
      setLeftMode('tree');
    });
  }

  await detectApi();

  const idx = await fetchJson('../data/library/index.json');
  INDEX = idx;
  DOCS = idx.docs||[];
  ID2DOC = Object.fromEntries(DOCS.map(d=>[d.id,d]));
  REL2ID = Object.fromEntries(DOCS.map(d=>[d.rel_path,d.id]));
  $('lib-meta').textContent = `docs=${idx.doc_count||DOCS.length} · gen=${idx.generated_at||'-'}`;
  $('tree').innerHTML = buildTree(DOCS);
  setLeftMode('tree');
}

init().catch(err=>{
  $('doc').innerHTML = '<div class="p">無法載入 Library 索引（請先執行 scripts/library/build.sh）</div>';
});
