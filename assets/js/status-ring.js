/* Status ring on avatar/logo: shows whether editable service (8802) is reachable.
   - green breathing ring: 8802 ok
   - yellow slow blink: 8802 down (read-only)
   - red fast blink: unexpected error

   Works on all pages; no dependencies.
*/
(function(){
  "use strict";

  function injectCss(){
    if(document.getElementById('oc-status-ring-css')) return;
    const css = document.createElement('style');
    css.id = 'oc-status-ring-css';
    css.textContent = `
      .logo.oc-status-ring{position:relative}
      .logo.oc-status-ring::after{
        content:"";
        position:absolute;
        inset:-6px;
        border-radius:14px;
        pointer-events:none;
        opacity:0;
        box-shadow:0 0 0 0 rgba(120,220,160,.65);
      }
      @keyframes ocBreath{0%{opacity:.25;box-shadow:0 0 0 0 rgba(120,220,160,.55)}50%{opacity:.85;box-shadow:0 0 0 10px rgba(120,220,160,.08)}100%{opacity:.25;box-shadow:0 0 0 0 rgba(120,220,160,.55)}}
      @keyframes ocBlinkWarn{0%,50%{opacity:.15;box-shadow:0 0 0 0 rgba(255,214,102,.55)}60%,100%{opacity:.75;box-shadow:0 0 0 10px rgba(255,214,102,.08)}}
      @keyframes ocBlinkBad{0%,35%{opacity:.15;box-shadow:0 0 0 0 rgba(255,98,98,.55)}50%,100%{opacity:.9;box-shadow:0 0 0 12px rgba(255,98,98,.10)}}

      .logo.oc-status-ok::after{opacity:1;animation:ocBreath 2.2s ease-in-out infinite}
      .logo.oc-status-warn::after{opacity:1;animation:ocBlinkWarn 2.6s ease-in-out infinite}
      .logo.oc-status-bad::after{opacity:1;animation:ocBlinkBad 1.2s ease-in-out infinite}
    `;
    document.head.appendChild(css);
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
