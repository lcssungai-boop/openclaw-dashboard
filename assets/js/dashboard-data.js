(function(){
  'use strict';

  const DONE_SET = new Set(['done','已完成','completed','cancelled','已取消']);
  const INVALID_CUSTOMER_RE = /^(內部|流程|OpenClaw|NotebookLM|BNI簡報與key單準備提醒|才多多財務分析月報更新)$/i;
  const OPERATIONAL_CASE_RE = /看護工|成大人力|送工|申請作業|返越/;

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function todayYmd(){ return new Date().toISOString().slice(0,10); }
  function safeDate(v){ return /^\d{4}-\d{2}-\d{2}/.test(String(v||'')) ? String(v).slice(0,10) : ''; }
  function normalizeCustomerName(v){ return String(v||'').replace(/（.*?）/g, '').replace(/—.*$/g, '').trim(); }
  function priorityZh(raw){ const v=String(raw||'').toLowerCase(); if(['high','important','a','高'].includes(v)) return '高'; if(['medium','normal','b','中'].includes(v)) return '中'; return '低'; }
  function fetchJson(url, fallback={}){ return fetch(url,{cache:'no-store'}).then(r=>r.ok?r.json():fallback).catch(()=>fallback); }
  function fetchText(url, fallback=''){ return fetch(url,{cache:'no-store'}).then(r=>r.ok?r.text():fallback).catch(()=>fallback); }
  function doneStatus(v){ const s=String(v||''); return DONE_SET.has(s) || DONE_SET.has(s.toLowerCase()); }
  function normalizeProjectStatus(raw){
    const v = String(raw || '').toLowerCase();
    if (['active','進行中','待處理','doing','in-progress','追蹤中'].includes(v)) return { status: 'active', status_zh: '進行中' };
    if (['planning','規劃中','pending'].includes(v)) return { status: 'planning', status_zh: '規劃中' };
    if (['done','已完成','completed'].includes(v)) return { status: 'done', status_zh: '完成' };
    return { status: 'planning', status_zh: raw || '規劃中' };
  }
  function parseMarkdownTable(md){
    const lines = String(md || '').split('\n').map(s => s.trim());
    const table = lines.filter(line => /^\|.*\|$/.test(line));
    if (table.length < 3) return [];
    const headers = table[0].split('|').slice(1, -1).map(s => s.trim());
    return table.slice(2).map(line => {
      const cols = line.split('|').slice(1, -1).map(s => s.trim());
      return headers.reduce((acc, key, idx) => { acc[key] = cols[idx] || ''; return acc; }, {});
    }).filter(row => Object.values(row).some(Boolean));
  }
  function uniqueBy(list, keyFn){
    const seen = new Map();
    list.forEach(item=>{ const key = keyFn(item); if(key && !seen.has(key)) seen.set(key,item); });
    return Array.from(seen.values());
  }
  function isRealCustomerRecord(record = {}){
    const name = normalizeCustomerName(record.name || record.customer_name);
    const text = `${name} ${record.category || ''} ${record.role || ''} ${record.detail || ''} ${record.source || ''}`;
    if (!name || INVALID_CUSTOMER_RE.test(name)) return false;
    return !/非客戶|不追蹤（非客戶）|內部|OpenClaw 任務池/i.test(text);
  }
  function isOperationalCaseTask(task = {}){
    const text = `${task.title || ''} ${(task.tags || []).join(' ')} ${task.note || ''}`;
    return OPERATIONAL_CASE_RE.test(text);
  }
  function parseLegacyWhen(raw){
    const s=String(raw||'').trim();
    if(!s) return {date:'', time:'', sort: 999999999};
    const y = new Date().getFullYear();
    const md = s.match(/(\d{1,2})\/(\d{1,2})/);
    let month, day;
    if(md){ month=+md[1]; day=+md[2]; }
    else {
      const dOnly = s.match(/^(\d{1,2})(?![:\d])/);
      if(dOnly){ month = new Date().getMonth()+1; day = +dOnly[1]; }
    }
    const ap = s.match(/\b(am|pm)\s*(\d{1,2})(?::(\d{2}))?/i);
    const hm = s.match(/\b(\d{1,2}):(\d{2})\b/);
    let hh=23, mm=59;
    if(ap){ hh=(+ap[2])%12; if(ap[1].toLowerCase()==='pm') hh+=12; mm=+(ap[3]||0); }
    else if(hm){ hh=+hm[1]; mm=+hm[2]; }
    const date = (month && day) ? `${y}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
    const time = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    const sort = date ? Date.parse(`${date}T${time}:00`) : (hm||ap ? hh*60+mm : 999999999);
    return {date,time,sort};
  }
  function to24hLabel(raw){
    const s = String(raw || '').trim();
    return s.replace(/\b(am|pm)\s*(\d{1,2})(?::(\d{2}))?/ig, (_, ap, hh, mm) => {
      let h = parseInt(hh,10) % 12; if(String(ap).toLowerCase()==='pm') h += 12;
      return `${String(h).padStart(2,'0')}:${String(mm || '00').padStart(2,'0')}`;
    });
  }

  async function load(basePath='.'){
    const ts = Date.now();
    const base = basePath.replace(/\/$/,'');
    const p = rel => `${base}/${rel}`.replace(/^\.\//,'./');
    const [publicState, recentCustomers, caitodo, mgmt, it, fin, customerIndexMd, projectIndexMd, knowledgeIndexMd, financeTasks] = await Promise.all([
      fetchJson(p('data/openclaw_public_state.json?_='+ts), {}),
      fetchJson(p('data/customers/recent.json?_='+ts), {items:[]}),
      fetchJson(p('data/caitodo/tasks.json?_='+ts), {tasks:[]}),
      fetchJson(p('data/dept/管理部.json?_='+ts), {}),
      fetchJson(p('data/dept/資訊部.json?_='+ts), {}),
      fetchJson(p('data/dept/財務部.json?_='+ts), {}),
      fetchText(p('data/index/customer_index.md?_='+ts), ''),
      fetchText(p('data/index/project_index.md?_='+ts), ''),
      fetchText(p('data/index/knowledge_index.md?_='+ts), ''),
      fetchJson(p('data/finance/tasks.json?_='+ts), {tasks:[]})
    ]);

    const customerIndexRows = parseMarkdownTable(customerIndexMd);
    const projectIndexRows = parseMarkdownTable(projectIndexMd);
    const knowledgeIndexRows = parseMarkdownTable(knowledgeIndexMd);
    const caseTasks = (Array.isArray(caitodo.tasks) ? caitodo.tasks : []).filter(t => !doneStatus(t.status));
    const financeTaskRows = (Array.isArray(financeTasks.tasks) ? financeTasks.tasks : []).filter(t => !doneStatus(t.status));

    const customers = uniqueBy([
      ...(recentCustomers.items||[]).map(c=>({
        name: normalizeCustomerName(c.customer_name),
        customer_id: c.customer_id || '',
        category: `Priority ${c.priority || '-'}`,
        role: c.followup_next || c.recent_event || '—',
        last_contact: safeDate(c.last_activity),
        source: 'recent.json',
        projects: c.projects || [],
        priority: c.priority || ''
      })),
      ...customerIndexRows.map(row=>({
        name: normalizeCustomerName(row.customer_name),
        customer_id: row.customer_id || '',
        category: row.lead_source || 'customer_index',
        role: row.followup_next || row.notes || '—',
        last_contact: safeDate(row.last_activity),
        source: 'customer_index.md',
        projects: [],
        priority: row.priority || ''
      })),
      ...caseTasks.filter(isOperationalCaseTask).map(t=>{
        const m = String(t.title||'').match(/聯絡(.+?)（/);
        return {
          name: normalizeCustomerName(m ? m[1] : ''),
          customer_id: '',
          category: '看護工案件',
          role: t.next_step || t.note || '—',
          last_contact: safeDate(t.updated_at) || safeDate(t.due),
          source: 'caitodo/tasks.json',
          projects: [],
          priority: t.priority || ''
        };
      })
    ].filter(isRealCustomerRecord), c=>c.name).sort((a,b)=>(b.last_contact||'').localeCompare(a.last_contact||'') || a.name.localeCompare(b.name,'zh-Hant'));

    const customerNameById = Object.fromEntries(customerIndexRows.map(r => [r.customer_id, normalizeCustomerName(r.customer_name)]));
    const projects = uniqueBy([
      ...(projectIndexRows||[]).map(row=>({
        name: row.project_name,
        client: customerNameById[row.customer_id] || row.customer_id || '—',
        priority_zh: priorityZh(row.priority),
        ...normalizeProjectStatus(row.stage),
        deadline: safeDate(row.due_date),
        updated_at: '',
        source: 'project_index.md'
      })),
      ...((publicState.schedules||[]).filter(s => /專案/.test(`${s.type||''} ${s.sub||''}`)).map(s=>({
        name: s.title,
        client: s.type || 'public_state',
        priority_zh: /過期|復盤/.test(`${s.sub||''}`) ? '中' : '高',
        ...normalizeProjectStatus(/過期|復盤/.test(`${s.sub||''}`) ? 'planning' : 'active'),
        deadline: parseLegacyWhen(`${s.date||''} ${s.time||''}`).date,
        updated_at: '',
        source: 'openclaw_public_state.json'
      }))),
      ...caseTasks.filter(isOperationalCaseTask).map(t=>{
        const m = String(t.title||'').match(/聯絡(.+?)（/);
        const client = normalizeCustomerName(m ? m[1] : '成大人力');
        return {
          name: `${client}看護工案`,
          client,
          priority_zh: priorityZh(t.priority),
          ...normalizeProjectStatus(t.status),
          deadline: safeDate(t.due),
          updated_at: safeDate(t.updated_at),
          source: 'caitodo/tasks.json'
        };
      })
    ], p=>p.name).sort((a,b)=>{
      const order={'高':0,'中':1,'低':2};
      return (order[a.priority_zh]??9)-(order[b.priority_zh]??9) || (a.deadline||'9999-99-99').localeCompare(b.deadline||'9999-99-99') || a.name.localeCompare(b.name,'zh-Hant');
    });

    const schedules = (publicState.schedules||[]).map(s=>{
      const when = parseLegacyWhen(`${s.date||''} ${s.time||''}`);
      return {
        ...s,
        dateYmd: when.date,
        time24: to24hLabel(s.time || when.time || ''),
        sort: when.sort,
        isReview: /復盤|過期/.test(`${s.sub||''} ${s.title||''} ${s.detail||''}`),
        isInternal: /內部|OpenClaw 任務池|NotebookLM|BNI簡報與key單準備提醒|才多多財務分析月報更新/.test(`${s.title||''} ${s.detail||''}`)
      };
    }).filter(s=>!s.isInternal).sort((a,b)=>a.sort-b.sort);

    const taskBoard = [
      ...caseTasks.map(t=>({
        title: t.title,
        detail: t.next_step || t.note || '',
        category: 'Tasks',
        source: 'caitodo/tasks.json',
        status: t.status || '待處理',
        due: safeDate(t.due),
        time24: t.time && t.time !== '-' ? t.time : '',
        sort: t.due && t.due !== '-' ? Date.parse(`${safeDate(t.due)}T${(t.time && t.time !== '-' ? t.time : '23:59')}:00`) : 999999999,
        stale: false
      })),
      ...financeTaskRows.map(t=>({
        title: t.title,
        detail: t.next_step || t.note || '',
        category: 'Finance',
        source: 'finance/tasks.json',
        status: t.status || '待處理',
        due: safeDate(t.due),
        time24: t.time && t.time !== '-' ? t.time : '',
        sort: t.due && t.due !== '-' ? Date.parse(`${safeDate(t.due)}T${(t.time && t.time !== '-' ? t.time : '23:59')}:00`) : 999999999,
        stale: false
      })),
      ...schedules.filter(s=>!s.isReview).map(s=>({
        title: s.title,
        detail: s.detail || s.sub || '',
        category: s.type || 'Schedule',
        source: 'openclaw_public_state.json',
        status: s.sub || '',
        due: s.dateYmd,
        time24: s.time24,
        sort: s.sort,
        stale: s.dateYmd && s.dateYmd < todayYmd()
      }))
    ].filter(item => item.title && !/內部/.test(item.title)).sort((a,b)=>a.sort-b.sort || a.title.localeCompare(b.title,'zh-Hant'));

    const overdue = taskBoard.filter(t => t.due && t.due < todayYmd() && !/完成|已完成/.test(t.status||''));
    const todaySchedules = schedules.filter(s => s.dateYmd === todayYmd() || (!s.dateYmd && /^\d{2}:\d{2}$/.test(s.time24||'')));
    const futureTasks = taskBoard.filter(t => !t.due || t.due >= todayYmd()).slice(0,12);
    const exchange = { mgmt, it, fin };
    const control = [
      { title:'管理部 JSON', meta:(mgmt.updated_at||'—'), detail:`projects ${Array.isArray(mgmt.projects)?mgmt.projects.length:0} / recent_clients ${Array.isArray(mgmt.recent_clients)?mgmt.recent_clients.length:0}`, status: Array.isArray(mgmt.projects)&&mgmt.projects.length ? '可用' : '待補資料' },
      { title:'資訊部 JSON', meta:(it.updated_at||'—'), detail:`system_status ${Object.keys(it.system_status||{}).length} / notes ${(it.notes||[]).length}`, status: Object.keys(it.system_status||{}).length ? '可用' : '待補資料' },
      { title:'財務部 JSON', meta:(fin.updated_at||'—'), detail:`pending_invoices ${Array.isArray(fin.pending_invoices)?fin.pending_invoices.length:0}`, status: Array.isArray(fin.pending_invoices)&&fin.pending_invoices.length ? '可用' : '待補資料' },
      { title:'公開狀態', meta:'openclaw_public_state', detail:`focuses ${(publicState.focuses||[]).length} / schedules ${(publicState.schedules||[]).length}`, status:(publicState.schedules||[]).length ? '可用' : '待補資料' },
      { title:'Customer Index', meta:'index markdown', detail:`rows ${customerIndexRows.length}`, status: customerIndexRows.length ? 'SSOT' : '空' },
      { title:'Project Index', meta:'index markdown', detail:`rows ${projectIndexRows.length}`, status: projectIndexRows.length ? 'SSOT' : '空' }
    ];
    const intel = knowledgeIndexRows.slice(0,8).map(r=>({ title:r.title || r.knowledge_id || '未命名', meta:r.category || r.type || 'knowledge', detail:r.summary || r.notes || r.source_path || '' }));
    const finance = [
      ...(fin.pending_invoices||[]).map(i=>({ title:i.project, meta:i.amount || '—', detail:`${i.client || '—'} · ${i.status || '—'} · ${i.deadline || '—'}` })),
      ...financeTaskRows.slice(0,6).map(t=>({ title:t.title, meta:t.due || '—', detail:t.status || '' }))
    ];
    const sourceMap = {
      today: 'openclaw_public_state.json（主卡/時序） + caitodo/tasks.json（案件待辦）',
      customers: 'customer_index.md（SSOT） + recent.json（手機清單快取） + caitodo/tasks.json（案件補充）',
      tasks: 'caitodo/tasks.json（主） + finance/tasks.json（財務待辦） + openclaw_public_state.json（行程）',
      exchange: 'dept/*.json',
      control: 'dept/*.json + openclaw_public_state.json + index markdown',
      intel: 'knowledge_index.md（索引）',
      finance: '財務部.json（摘要） + finance/tasks.json（待辦）',
      desktop: '與手機相同資料層；桌面僅做展開視圖'
    };

    return { publicState, recentCustomers, caitodo, mgmt, it, fin, customers, projects, schedules, todaySchedules, futureTasks, overdue, exchange, control, intel, finance, sourceMap, today: todayYmd(), sourceStamp: [mgmt.updated_at, it.updated_at, fin.updated_at, recentCustomers.updated_at, caitodo.updated_at].filter(Boolean).sort().slice(-1)[0] || '—' };
  }

  window.DashboardData = { load, esc, priorityZh, normalizeProjectStatus, safeDate, to24hLabel, todayYmd };
})();
