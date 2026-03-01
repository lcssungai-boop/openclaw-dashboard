/* Status ring on avatar/logo: shows whether editable service (8802) is reachable.
   - green breathing ring: 8802 ok
   - yellow slow blink: 8802 down (read-only)
   - red fast blink: unexpected error

   Works on all pages; no dependencies.
*/
(function(){
  "use strict";

  function injectCss(){
    // Load shared CSS file (preferred). This avoids duplicating CSS across pages.
    if(document.getElementById('oc-status-ring-css-link')) return;
    const link = document.createElement('link');
    link.id = 'oc-status-ring-css-link';
    link.rel = 'stylesheet';
    // Absolute path so it works from nested pages like /zhaojing/
    link.href = '/assets/css/logo-status-ring.css';
    document.head.appendChild(link);
  }

  function withTimeout(promise, ms){
    let t;
    const timeout = new Promise((_, rej)=>{ t = setTimeout(()=>rej(new Error('timeout')), ms); });
    return Promise.race([promise, timeout]).finally(()=>clearTimeout(t));
  }

  async function probeEditable(){
    const host = location.hostname;
    const url = `http://${host}:8802/api/library/read?rel=00_Inbox/__nonexistent__.md&_=${Date.now()}`;
    const r = await withTimeout(fetch(url, { mode: 'cors' }), 1200);
    // 404 is fine (means server answered)
    return r.ok || r.status === 404;
  }

  function setStatus(logo, kind, text){
    logo.classList.add('oc-status-ring');
    logo.classList.remove('oc-status-ok','oc-status-warn','oc-status-bad');
    logo.classList.add(kind);
    logo.title = text;
  }

  async function main(){
    injectCss();
    const logo = document.querySelector('.logo');
    if(!logo) return;

    // default: warn until proven ok
    setStatus(logo, 'oc-status-warn', '可編輯服務（8802）未確認');

    try{
      const ok = await probeEditable();
      if(ok) setStatus(logo, 'oc-status-ok', '狀態正常：可編輯服務（8802）可用');
      else setStatus(logo, 'oc-status-warn', '唯讀模式：可編輯服務（8802）不可用');
    }catch(_e){
      setStatus(logo, 'oc-status-warn', '唯讀模式：可編輯服務（8802）不可用');
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})();
