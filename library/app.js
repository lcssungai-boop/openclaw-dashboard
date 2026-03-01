// Minimal Library UI (MVP)

const $ = (id)=>document.getElementById(id);

function esc(s){
  return String(s).replace(/[&<>\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
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
  // very small renderer: headings + links + code fences
  let out = esc(md);
  // code fences
  out = out.replace(/```([\s\S]*?)```/g, (m,code)=>`<pre><code>${code}</code></pre>`);
  // headings
  out = out.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  out = out.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  out = out.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m,t,href)=>{
    return `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(t)}</a>`;
  });
  // newlines
  out = out.replace(/\n/g,'<br/>');
  return out;
}

let INDEX=null;
let DOCS=[];
let ID2DOC={};

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
  // simple folder summary (top-level)
  const buckets = {};
  docs.forEach(d=>{
    const top = (d.rel_path.split('/')[0]||'').trim() || '(root)';
    (buckets[top] ||= []).push(d);
  });
  const keys = Object.keys(buckets).sort();
  return keys.map(k=>{
    return `<div class="item" data-folder="${esc(k)}"><div class="t">${esc(k)}</div><div class="p">${buckets[k].length} docs</div></div>`;
  }).join('');
}

async function openDoc(id){
  const d = ID2DOC[id];
  if(!d) return;
  $('doc').innerHTML = '<div class="p">載入中…</div>';
  try{
    // NOTE: we serve dashboard repo, not the iCloud root; so we show content from index excerpt only.
    // Future: add a local file proxy or copy docs into repo.
    const html = `<h1>${esc(d.title)}</h1>
      <div class="p" style="color:var(--muted);font-family:var(--mono);font-size:11px">${esc(d.rel_path)} · ${fmtTs(d.mtime)}</div>
      <div style="margin-top:12px">${esc(d.excerpt||'')}</div>
      <div class="p" style="margin-top:10px;color:var(--muted)">（MVP：目前僅顯示摘錄；下一版可支援直接預覽原始 MD。）</div>`;
    $('doc').innerHTML = html;

    const out = (INDEX.links?.outbound?.[id]||[]).map(r=>{
      const tid = (Object.values(ID2DOC).find(x=>x.rel_path===r)||{}).id;
      return tid ? `<a href="#" data-open="${tid}">${esc(r)}</a>` : `<div style="color:var(--muted)">${esc(r)}</div>`;
    });
    const inn = (INDEX.links?.inbound?.[id]||[]).map(srcId=>{
      const sd = ID2DOC[srcId];
      return sd ? `<a href="#" data-open="${sd.id}">${esc(sd.title||sd.rel_path)}</a>` : '';
    });
    $('links').innerHTML = `
      <div class="lbl">Outbound</div>
      ${out.join('')||'<div style="color:var(--muted)">—</div>'}
      <div class="lbl">Inbound</div>
      ${inn.join('')||'<div style="color:var(--muted)">—</div>'}
    `;
  }catch(e){
    $('doc').innerHTML = '<div class="p">載入失敗</div>';
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
    const f = ev.target.closest('.item[data-folder]');
    if(f){
      const folder = f.dataset.folder;
      const subset = DOCS.filter(d=>(d.rel_path.split('/')[0]||'(root)')===folder);
      mountList($('results'), subset);
      return;
    }
    const l = ev.target.closest('a[data-open]');
    if(l){
      ev.preventDefault();
      openDoc(l.dataset.open);
    }
  });
}

function wireSearch(){
  $('q').addEventListener('input', ()=>{
    const q = $('q').value.trim();
    if(!q){
      $('results').innerHTML = '';
      return;
    }
    const qq = q.toLowerCase();
    const hits = DOCS.filter(d=>{
      return (d.title||'').toLowerCase().includes(qq)
        || (d.rel_path||'').toLowerCase().includes(qq)
        || (d.excerpt||'').toLowerCase().includes(qq);
    }).slice(0,50);
    mountList($('results'), hits);
  });
}

async function init(){
  wireClicks();
  wireSearch();
  const idx = await fetchJson('../data/library/index.json');
  INDEX = idx;
  DOCS = idx.docs||[];
  ID2DOC = Object.fromEntries(DOCS.map(d=>[d.id,d]));
  $('lib-meta').textContent = `docs=${idx.doc_count||DOCS.length} · gen=${idx.generated_at||'-'}`;
  $('tree').innerHTML = buildTree(DOCS);
}

init().catch(err=>{
  $('doc').innerHTML = '<div class="p">無法載入 Library 索引（請先執行 scripts/library/build.sh）</div>';
});
