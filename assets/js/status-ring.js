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
      /* Business subtle status ring */
      .logo.oc-status-ring{position:relative}
      .logo.oc-status-ring::after{
        content:"";
        position:absolute;
        inset:-5px;
        border-radius:14px;
        pointer-events:none;
        opacity:1;
        box-shadow:0 0 0 2px rgba(255,255,255,.10);
      }

      @keyframes ocBreathOK{0%{box-shadow:0 0 0 2px rgba(110,200,150,.25)}50%{box-shadow:0 0 0 5px rgba(110,200,150,.18)}100%{box-shadow:0 0 0 2px rgba(110,200,150,.25)}}
      @keyframes ocBreathWarn{0%{box-shadow:0 0 0 2px rgba(210,180,90,.22)}50%{box-shadow:0 0 0 5px rgba(210,180,90,.14)}100%{box-shadow:0 0 0 2px rgba(210,180,90,.22)}}
      @keyframes ocBreathBad{0%{box-shadow:0 0 0 2px rgba(220,110,110,.28)}50%{box-shadow:0 0 0 6px rgba(220,110,110,.16)}100%{box-shadow:0 0 0 2px rgba(220,110,110,.28)}}

      .logo.oc-status-ok::after{animation:ocBreathOK 2.4s ease-in-out infinite}
      .logo.oc-status-warn::after{animation:ocBreathWarn 2.6s ease-in-out infinite}
      .logo.oc-status-bad::after{animation:ocBreathBad 1.8s ease-in-out infinite}
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
