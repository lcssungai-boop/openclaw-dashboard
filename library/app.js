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
    const md = await fetchText(d.doc_url || ('../data/library/docs/'+d.rel_path));
    $('doc').innerHTML = `
      <div class="p" style="color:var(--muted);font-family:var(--mono);font-size:11px">${esc(d.rel_path)} · ${fmtTs(d.mtime)}</div>
      <div class="md">${renderMarkdownBasic(md)}</div>
    `;
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
