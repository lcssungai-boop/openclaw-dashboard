/* Shared data layer for Open Claw dashboards (desktop + mobile). */
(function(){
  "use strict";

  const AREA_DEFS = [
    { key: "caitodo",  name: "才多多",    role: "移工・僑外生・派遣", data: "data/caitodo/tasks.json",  path: "caitodo/" },
    { key: "zhaojing", name: "兆鯨顧問",  role: "顧問・物業・電商",   data: "data/zhaojing/tasks.json", path: "zhaojing/" },
    { key: "finance",  name: "理財分析師", role: "股票・帳務・KDJ",    data: "data/finance/tasks.json",  path: "finance/" },
    { key: "personal", name: "個人財務",  role: "大總管",             data: "data/personal/tasks.json", path: "personal/" },
    { key: "openclaw", name: "OpenClaw",  role: "開發優化師",         data: "data/openclaw/tasks.json", path: "openclaw/" }
  ];

  function normalizeBase(basePath){
    if(!basePath || basePath === ".") return "";
    return String(basePath).replace(/\/+$/, "");
  }

  function withBase(basePath, relPath){
    const b = normalizeBase(basePath);
    return b ? (b + "/" + relPath) : relPath;
  }

  function cacheBust(url){
    const sep = url.includes("?") ? "&" : "?";
    return url + sep + "_=" + Date.now();
  }

  async function fetchJson(url){
    try{
      const r = await fetch(cacheBust(url));
      if(!r.ok) return null;
      return await r.json();
    }catch(_e){
      return null;
    }
  }

  function normalizeTask(task){
    const t = task || {};
    return {
      title: t.title || "-",
      status: t.status || "待處理",
      next_step: t.next_step || "-",
      owner_role: t.owner_role || t.owner || "-",
      blocked_reason: t.blocked_reason || "-",
      priority: t.priority || "normal",
      type: t.type || "task",
      due: t.due || "-",
      time: t.time || "-",
      freq: t.freq || "-",
      updated_at: t.updated_at || null,
      source: t.source || "-"
    };
  }

  function normalizeTasksDoc(doc){
    const src = doc || {};
    const tasks = Array.isArray(src.tasks) ? src.tasks.map(normalizeTask) : [];
    return { updated_at: src.updated_at || null, tasks: tasks };
  }

  function buildContext(opts){
    const options = opts || {};
    const basePath = options.basePath || ".";
    const areas = AREA_DEFS.map(a => ({
      key: a.key,
      name: a.name,
      role: a.role,
      path: a.path,
      data: withBase(basePath, a.data)
    }));

    const data = { crm: null, propertyOps: null };
    areas.forEach(a => { data[a.key] = { updated_at: null, tasks: [] }; });

    async function loadAreas(){
      const docs = await Promise.all(areas.map(a => fetchJson(a.data)));
      docs.forEach((doc, i) => { data[areas[i].key] = normalizeTasksDoc(doc); });
    }

    async function loadCRM(){
      // 優先讀 crm.json（完整 CRM），fallback 至舊版 client_projects.json
      let d = await fetchJson(withBase(basePath, "data/caitodo/crm.json"));
      if(!d) d = await fetchJson(withBase(basePath, "data/openclaw/client_projects.json"));
      data.crm = d;
    }

    async function loadPropertyOps(){
      data.propertyOps = await fetchJson(withBase(basePath, "data/zhaojing/property_ops.json"));
    }

    async function loadJobs(){
      data.jobs = await fetchJson(withBase(basePath, "data/openclaw/jobs.json"));
    }

    async function loadAll(flags){
      const f = flags || {};
      const jobs = [loadAreas()];
      if(f.crm) jobs.push(loadCRM());
      if(f.propertyOps) jobs.push(loadPropertyOps());
      if(f.jobs) jobs.push(loadJobs());
      await Promise.all(jobs);
      return data;
    }

    return { areas: areas, data: data, loadAll: loadAll };
  }

  window.OpenClawCore = { buildContext: buildContext };
})();
