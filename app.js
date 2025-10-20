// ===== AthlētX HYROX Tracker – v5.2 (PWA + Multi-Chart + Recap) =====
(() => {
// Presets
const PRESETS = {
  A:[
    {n:"Front Squat / Hack Squat", sets:3, reps:[4,4,4], t:"https://modusx.de/fitness-uebungen/front-squat/"},
    {n:"Kreuzheben (konventionell)", sets:3, reps:[4,4,4], t:"https://modusx.de/fitness-uebungen/kreuzheben/"},
    {n:"Bankdrücken (schwer)", sets:3, reps:[5,5,5], t:"https://modusx.de/fitness-uebungen/bankdruecken/"},
    {n:"Bulgarian Split Squat (pro Bein)", sets:2, reps:[8,8], t:"https://modusx.de/fitness-uebungen/bulgarian-split-squat/"},
    {n:"Beinbeuger / Glute Drive", sets:2, reps:[10,10], t:"https://modusx.de/fitness-uebungen/hip-thrust/"},
    {n:"Brustfliegende (Kabel/Maschine)", sets:2, reps:[10,10], t:"https://modusx.de/fitness-uebungen/butterfly-maschine/"},
    {n:"Rückenstrecker", sets:2, reps:[12,12], t:"https://modusx.de/fitness-uebungen/rueckenstrecker/"},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20], t:"https://modusx.de/fitness-uebungen/russian-twist/"}
  ],
  B:[
    {n:"Bankdrücken (leicht/mittelschwer)", sets:3, reps:[8,8,8], t:"https://modusx.de/fitness-uebungen/bankdruecken/"},
    {n:"Kreuzheben (Volumen/Technik)", sets:3, reps:[6,6,6], t:"https://modusx.de/fitness-uebungen/kreuzheben/"},
    {n:"Kniebeugen (Maschine/LH)", sets:3, reps:[6,6,6], t:"https://modusx.de/fitness-uebungen/kniebeuge/"},
    {n:"Latzug (neutraler Griff)", sets:3, reps:[6,6,6], t:"https://modusx.de/fitness-uebungen/latzug/"},
    {n:"Kabelrudern (enger Griff)", sets:2, reps:[10,10], t:"https://modusx.de/fitness-uebungen/kabelrudern/"},
    {n:"Schulterdrücken (Maschine/KH)", sets:3, reps:[6,6,6], t:"https://modusx.de/fitness-uebungen/schulterdruecken/"},
    {n:"Seitheben (Kabel/KH)", sets:2, reps:[12,12], t:"https://modusx.de/fitness-uebungen/seitheben/"},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20], t:"https://modusx.de/fitness-uebungen/russian-twist/"}
  ]
};

// Helpers
const $ = s=>document.querySelector(s);
const todayISO = ()=>new Date().toISOString().slice(0,10);
const cssVar = (name)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#94a3b8';

// Elements
const dateEl = $('#date');
const workoutSel = $('#workoutSel');
const tabTracker = $('#tab-tracker');
const tabOverview = $('#tab-overview');
const tabActivities = $('#tab-activities');
const calendarWeekdays = $('#calendarWeekdays');
const themeToggle = $('#themeToggle');
const timerBtn = $('#timerBtn');
const importBtn = $('#importCsv');
const importInput = $('#importCsvFile');
const syncCodeDisplay = $('#syncCodeDisplay');
const syncCopyBtn = $('#syncCopy');
const syncApplyBtn = $('#syncApply');
const syncInput = $('#syncInput');
const syncCreateBtn = $('#syncCreate');
const syncStatusEl = $('#syncStatus');
const syncRefreshBtn = $('#syncRefresh');

const STORAGE_PREFIX = 'hyrox:';
const SYNC_ID_KEY = 'athletx:sync:id';
const SYNC_CACHE_KEY = 'athletx:sync:cache';

// ===== JSONBin Konfiguration (statt npoint) =====
// 1) JSONBin.io → Dashboard → API Keys → Master-Key kopieren (Klartext, KEIN $2a$… Hash)
// 2) Unten einfügen:
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const JSONBIN_KEY  = '68f5efa3ae596e708f1eb4b0'; // <<< deinen echten Key einsetzen
const BIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_KEY,
};

let syncId = localStorage.getItem(SYNC_ID_KEY) || '';
let remoteData = loadCachedRemoteData();
let remoteSaveTimer = null;
let remoteSaving = false;
let remoteSavePending = false;

// Autosave
let dirty=false, autosaveTimer=null, saveDebounce=null;

// Timer
let timerId=null, startTs=null;

// Theme init
(function initTheme(){
  const saved = localStorage.getItem('athletx:theme');
  if(saved){ document.documentElement.setAttribute('data-theme', saved); }
  else{
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  }
  updateThemeIcon();
})();

// Init
async function boot(){
  dateEl.value = todayISO();
  bindTabs();
  bindControls();
  setupAutosave();
  setupTimerFromSession();
  try{
    await initSync();
  }catch(err){
    console.error('Initial sync failed', err);
    updateSyncStatus('Sync offline – nutze lokale Daten','warning');
  }
  onLoadDay();
  buildOverview();
  drawChart();
  renderActivities();
}
boot();

// Tabs
function bindTabs(){
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    const sections = { tracker: tabTracker, overview: tabOverview, activities: tabActivities };
    Object.entries(sections).forEach(([name, el])=>{ if(el) el.classList.toggle('hidden', name!==tab); });
    if(tab==='overview'){ buildOverview(); drawChart(); }
    if(tab==='activities'){ renderActivities(); }
  }));
}

function bindControls(){
  $('#save')?.addEventListener('click', ()=>saveDay(false));
  $('#export')?.addEventListener('click', onExportCSV);
  importBtn?.addEventListener('click', ()=>importInput?.click());
  importInput?.addEventListener('change', handleImportCSV);
  syncCopyBtn?.addEventListener('click', ()=>copySyncCode());
  syncApplyBtn?.addEventListener('click', async ()=>{ await connectToSyncCode(syncInput?.value); });
  syncCreateBtn?.addEventListener('click', async ()=>{ await createNewSyncCode(); });
  syncRefreshBtn?.addEventListener('click', async ()=>{ await refreshRemoteSnapshot(false); });
  syncInput?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      syncApplyBtn?.click();
    }
  });
  themeToggle?.addEventListener('click', toggleTheme);
  timerBtn?.addEventListener('click', restartTimer);
  dateEl.addEventListener('change', ()=>{ onLoadDay(); buildOverview(); dirty=false; });
  workoutSel.addEventListener('change', ()=>{ renderTracker(); onLoadDay(); dirty=false; });
  document.addEventListener('input', e=>{ if(e.target.matches('input')) { markDirty(); } });
  window.addEventListener('beforeunload', ()=>{ if(dirty){ saveDay(true); } });
}

// Autosave
function setupAutosave(){ if(autosaveTimer) clearInterval(autosaveTimer); autosaveTimer=setInterval(()=>{ if(dirty){ saveDay(true); } },180000); }
function markDirty(){ dirty=true; scheduleSave(); }
function scheduleSave(){ if(saveDebounce) clearTimeout(saveDebounce); saveDebounce=setTimeout(()=>{ if(dirty){ saveDay(true); } }, 1200); }

// Theme
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('athletx:theme', next);
  updateThemeIcon(); drawChart();
}
function updateThemeIcon(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  themeToggle.textContent = cur==='dark'?'🌙':'☀️';
  themeToggle.title = cur==='dark'?'Zu Light wechseln':'Zu Dark wechseln';
}

// Timer
function restartTimer(){
  if(timerId) clearInterval(timerId);
  startTs = Date.now();
  sessionStorage.setItem('athletx:timer:start', String(startTs));
  tickTimer();
  timerId = setInterval(tickTimer, 250);
  if('vibrate' in navigator){ try{ navigator.vibrate(15); }catch(e){} }
}
function tickTimer(){
  if(!startTs){ timerBtn.textContent = '⏱ 00:00'; return; }
  const elapsed = Date.now() - startTs;
  const totalSec = Math.floor(elapsed/1000);
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  const hh = h>0 ? String(h).padStart(2,'0') + ':' : '';
  timerBtn.textContent = `⏱ ${hh}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function setupTimerFromSession(){
  const saved = sessionStorage.getItem('athletx:timer:start');
  if(saved){
    startTs = parseInt(saved,10);
    if(!isNaN(startTs)){
      timerId = setInterval(tickTimer, 250);
      tickTimer();
    }else{
      startTs = null;
    }
  }
}

// Sync storage helpers
function loadCachedRemoteData(){
  try{
    const cached = localStorage.getItem(SYNC_CACHE_KEY);
    if(cached){
      const parsed = JSON.parse(cached);
      if(parsed && typeof parsed==='object') return parsed;
    }
  }catch(e){}
  return localSessionSnapshot();
}

function persistRemoteCache(){
  try{
    localStorage.setItem(SYNC_CACHE_KEY, JSON.stringify(remoteData||{}));
  }catch(e){}
}

function localSessionSnapshot(){
  const snap={};
  for(let i=0;i<localStorage.length;i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith(STORAGE_PREFIX)) continue;
    try{
      const data = JSON.parse(localStorage.getItem(key)||'{}');
      if(data && typeof data==='object'){
        snap[key]=data;
      }
    }catch(e){}
  }
  return snap;
}

function applyLocalSnapshot(snapshot){
  const keepKeys=new Set();
  Object.entries(snapshot||{}).forEach(([key, record])=>{
    if(record && record.deletedAt){
      localStorage.removeItem(key);
      return;
    }
    if(record && typeof record==='object'){
      keepKeys.add(key);
      localStorage.setItem(key, JSON.stringify(record));
    }
  });
  for(let i=localStorage.length-1;i>=0;i--){
    const key=localStorage.key(i);
    if(key && key.startsWith(STORAGE_PREFIX) && !keepKeys.has(key)){
      localStorage.removeItem(key);
    }
  }
  persistRemoteCache();
}

function sessionKeys(){
  return Object.keys(remoteData||{}).filter(key=>{
    const rec=remoteData[key];
    return rec && typeof rec==='object' && !rec.deletedAt;
  });
}

function getSession(key){
  const rec = remoteData?.[key];
  if(rec && !rec.deletedAt) return rec;
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(parsed && !parsed.deletedAt) return parsed;
  }catch(e){}
  return null;
}

function sessionEntries(){
  return sessionKeys().map(key=>({ key, data: remoteData[key] }));
}

function allSessionsArray(){
  return sessionEntries().map(entry=>entry.data);
}

function cloneRecord(rec){
  return rec ? JSON.parse(JSON.stringify(rec)) : rec;
}

function mergeSnapshots(base, incoming){
  const merged = {...(base||{})};
  Object.entries(incoming||{}).forEach(([key, record])=>{
    const current = merged[key];
    merged[key] = chooseRecord(current, record);
  });
  return merged;
}

function chooseRecord(a,b){
  if(!a) return cloneRecord(b);
  if(!b) return cloneRecord(a);
  const aStamp = Math.max(a.updatedAt||0, a.deletedAt||0);
  const bStamp = Math.max(b.updatedAt||0, b.deletedAt||0);
  if(bStamp>aStamp) return cloneRecord(b);
  return cloneRecord(a);
}

function sanitizeSnapshot(data){
  return JSON.parse(JSON.stringify(data||{}));
}

function snapshotFingerprint(data){
  const sortedKeys = Object.keys(data||{}).sort();
  const normalized={};
  sortedKeys.forEach(key=>{
    const record = data[key];
    if(record && typeof record==='object' && !Array.isArray(record)){
      const recKeys = Object.keys(record).sort();
      const normalizedRec={};
      recKeys.forEach(k=>{ normalizedRec[k]=record[k]; });
      normalized[key]=normalizedRec;
    }else{
      normalized[key]=record;
    }
  });
  return JSON.stringify(normalized);
}

async function initSync(){
  updateSyncCodeDisplay();
  updateSyncStatus('Initialisiere Sync …','pending');
  try{
    remoteData = mergeSnapshots(remoteData, localSessionSnapshot());
    persistRemoteCache();
    applyLocalSnapshot(remoteData);
    if(syncId){
      await refreshRemoteSnapshot(true);
    }else{
      await ensureRemoteCodeExists();
    }
  }catch(err){
    console.error('Sync init failed', err);
    updateSyncStatus('Offline – nutze lokale Daten','error');
  }
  updateSyncCodeDisplay();
}

async function ensureRemoteCodeExists(){
  try{
    const snapshot = sanitizeSnapshot(remoteData);
    const created = await createRemoteSnapshot(snapshot);
    syncId = created;
    if(syncId){
      localStorage.setItem(SYNC_ID_KEY, syncId);
      updateSyncStatus('Sync aktiviert','success');
    }
  }catch(err){
    console.warn('Could not create remote dataset', err);
    updateSyncStatus('Sync offline – speichere lokal','warning');
  }
}

async function refreshRemoteSnapshot(silent){
  if(!syncId){
    if(!silent) updateSyncStatus('Kein Sync-Code vorhanden','warning');
    return;
  }
  if(!silent) updateSyncStatus('Aktualisiere aus der Cloud …','pending');
  try{
    const remoteSnap = await fetchRemoteSnapshot(syncId);
    const incoming = sanitizeSnapshot(remoteSnap);
    const merged = mergeSnapshots(remoteSnap, remoteData);
    const mergedSnap = sanitizeSnapshot(merged);
    const needsUpload = snapshotFingerprint(mergedSnap) !== snapshotFingerprint(incoming);
    remoteData = merged;
    persistRemoteCache();
    applyLocalSnapshot(remoteData);
    updateSyncStatus('Synchronisiert','success');
    if(!silent){
      renderTracker();
      onLoadDay();
      buildOverview();
      renderActivities();
      drawChart();
    }
    if(needsUpload){
      scheduleRemoteSave();
    }
  }catch(err){
    console.warn('Remote refresh failed', err);
    updateSyncStatus('Sync nicht erreichbar – arbeite lokal', silent?'warning':'error');
    if(!silent) toast('Cloud Sync nicht erreichbar');
  }
}

async function connectToSyncCode(code){
  const trimmed = (code||'').trim();
  if(!trimmed){
    updateSyncStatus('Bitte gültigen Sync-Code eingeben','warning');
    return;
  }
  updateSyncStatus('Verbinde …','pending');
  try{
    const remoteSnap = await fetchRemoteSnapshot(trimmed);
    syncId = trimmed;
    localStorage.setItem(SYNC_ID_KEY, syncId);
    const incoming = sanitizeSnapshot(remoteSnap);
    const merged = mergeSnapshots(remoteSnap, remoteData);
    const mergedSnap = sanitizeSnapshot(merged);
    const needsUpload = snapshotFingerprint(mergedSnap) !== snapshotFingerprint(incoming);
    remoteData = merged;
    persistRemoteCache();
    applyLocalSnapshot(remoteData);
    updateSyncCodeDisplay();
    updateSyncStatus('Sync verbunden','success');
    syncInput && (syncInput.value='');
    renderTracker();
    onLoadDay();
    buildOverview();
    renderActivities();
    drawChart();
    if(needsUpload){
      scheduleRemoteSave();
    }
  }catch(err){
    console.error('Connect to sync code failed', err);
    updateSyncStatus('Sync-Code nicht gefunden oder Netzwerkproblem','error');
  }
}

async function createNewSyncCode(){
  updateSyncStatus('Erstelle neuen Sync-Code …','pending');
  try{
    const snapshot = sanitizeSnapshot(remoteData);
    const created = await createRemoteSnapshot(snapshot);
    if(created){
      syncId = created;
      localStorage.setItem(SYNC_ID_KEY, syncId);
      updateSyncCodeDisplay();
      updateSyncStatus('Neuer Sync-Code aktiv','success');
    }else{
      updateSyncStatus('Neuer Sync-Code konnte nicht erstellt werden','error');
    }
  }catch(err){
    console.error('Create new sync code failed', err);
    updateSyncStatus('Neuer Sync-Code konnte nicht erstellt werden','error');
  }
}

// ===== JSONBin Remote-Funktionen =====
// Legt ein neues Bin an und speichert { sessions: snapshot }
async function createRemoteSnapshot(snapshot){
  const body = { sessions: snapshot };
  const res = await fetch(`${JSONBIN_BASE}/b`, {
    method: 'POST',
    headers: BIN_HEADERS,
    body: JSON.stringify(body),
  });
  if(!res.ok){
    throw new Error('createRemoteSnapshot failed: ' + res.status);
  }
  const json = await res.json();
  const binId = json?.metadata?.id;
  if(!binId){
    throw new Error('createRemoteSnapshot: no bin id returned');
  }
  return binId; // => syncId
}

// Holt die letzte Version des Bins
async function fetchRemoteSnapshot(id){
  const res = await fetch(`${JSONBIN_BASE}/b/${encodeURIComponent(id)}/latest`, {
    headers: BIN_HEADERS,
    cache: 'no-store'
  });
  if(!res.ok){
    throw new Error('fetchRemoteSnapshot failed: ' + res.status);
  }
  const json = await res.json();
  return json?.record?.sessions || {};
}

// Überschreibt das Bin mit der aktuellen Snapshot-Struktur
async function updateRemoteSnapshot(id, snapshot){
  const body = { sessions: snapshot };
  const res = await fetch(`${JSONBIN_BASE}/b/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: BIN_HEADERS,
    body: JSON.stringify(body),
  });
  if(!res.ok){
    throw new Error('updateRemoteSnapshot failed: ' + res.status);
  }
  return true;
}

function setSessionRecord(key, session){
  const record = {...session, updatedAt: Date.now()};
  remoteData[key] = record;
  localStorage.setItem(key, JSON.stringify(record));
  persistRemoteCache();
  scheduleRemoteSave();
}

function removeSessionRecord(key){
  localStorage.removeItem(key);
  remoteData[key] = { deletedAt: Date.now() };
  persistRemoteCache();
  scheduleRemoteSave();
}

function scheduleRemoteSave(){
  if(remoteSaveTimer) clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(()=>{ flushRemoteSave(); }, 1200);
  updateSyncStatus('Änderungen werden synchronisiert …','pending');
}

async function flushRemoteSave(){
  if(remoteSaving){
    remoteSavePending = true;
    return;
  }
  if(remoteSaveTimer){
    clearTimeout(remoteSaveTimer);
    remoteSaveTimer=null;
  }
  if(!syncId){
    await ensureRemoteCodeExists();
    updateSyncCodeDisplay();
    if(!syncId) return;
  }
  remoteSaving = true;
  try{
    const snapshot = sanitizeSnapshot(remoteData);
    await updateRemoteSnapshot(syncId, snapshot);
    updateSyncStatus('Synchronisiert','success');
  }catch(err){
    console.error('Remote save failed', err);
    updateSyncStatus('Sync fehlgeschlagen – Daten lokal gespeichert','error');
  }finally{
    remoteSaving=false;
    if(remoteSavePending){
      remoteSavePending=false;
      scheduleRemoteSave();
    }
  }
}

function updateSyncCodeDisplay(){
  if(syncCodeDisplay){
    syncCodeDisplay.value = syncId || '';
    syncCodeDisplay.placeholder = syncId? '' : 'Noch kein Code';
  }
}

function updateSyncStatus(message, state){
  if(!syncStatusEl) return;
  syncStatusEl.textContent = message;
  syncStatusEl.dataset.state = state || 'info';
}

async function copySyncCode(){
  if(!syncId){
    updateSyncStatus('Kein Sync-Code vorhanden','warning');
    return;
  }
  try{
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(syncId);
    }else{
      throw new Error('clipboard API unavailable');
    }
    toast('Sync-Code kopiert');
  }catch(err){
    try{
      if(syncCodeDisplay){
        syncCodeDisplay.removeAttribute('readonly');
        syncCodeDisplay.select();
        document.execCommand && document.execCommand('copy');
        syncCodeDisplay.setAttribute('readonly','');
        syncCodeDisplay.blur();
        toast('Sync-Code kopiert');
        return;
      }
    }catch(_){}
    updateSyncStatus('Konnte nicht kopieren – bitte Code markieren','warning');
  }
}

// Storage
function storageKey(){ return `${STORAGE_PREFIX}${workoutSel.value}:${dateEl.value}`; }

// Historie
function lastSetsFor(exName){
  let latest=null, latestDate='', latestStamp=0;
  sessionEntries().forEach(({data})=>{
    const row=(data.rows||[]).find(r=>r.name===exName);
    if(!row || !data.date) return;
    const stamp = Math.max(data.updatedAt||0, new Date(data.date+'T00:00:00').getTime()||0);
    if(data.date>latestDate || (data.date===latestDate && stamp>latestStamp)){
      latest=row.sets||[];
      latestDate=data.date;
      latestStamp=stamp;
    }
  });
  return latest;
}
function lastTopSet(exName){
  const hist=[];
  sessionEntries().forEach(({data})=>{
    (data.rows||[]).forEach(r=>{
      if(r.name!==exName) return;
      const top = Math.max(...(r.sets||[]).map(s=>+s.w||0),0);
      const topRPE = (r.sets||[]).reduce((a,s)=> Math.max(a, +s.rpe||0), 0);
      if(top>0){ hist.push({date:data.date, w:top, rpe:topRPE}); }
    });
  });
  hist.sort((a,b)=> a.date.localeCompare(b.date));
  const last = hist[hist.length-1]; if(!last) return 0;
  if(last.rpe<=8) return Math.round(last.w*1.025*2)/2;
  if(last.rpe>9) return Math.round(last.w*0.975*2)/2;
  return last.w;
}

// Collect/Save
function collect(){
  const day={date:dateEl.value, workout:workoutSel.value, rows:[]};
  PRESETS[workoutSel.value].forEach((ex,idx)=>{
    const rows=document.querySelectorAll(`.setgrid[data-idx='${idx}']`);
    const sets=[];
    rows.forEach(g=>{
      const get=k=>g.querySelector(`[data-k='${k}']`)?.value||'';
      sets.push({w:+get('w')||0, reps:+get('reps')||0, rpe:+get('rpe')||0});
    });
    day.rows.push({name:ex.n, sets});
  });
  return day;
}
function saveDay(silent=true){
  setSessionRecord(storageKey(), collect());
  localStorage.setItem(storageKey(), JSON.stringify(collect()));
  dirty=false;
  if(saveDebounce){ clearTimeout(saveDebounce); saveDebounce=null; }
  if(!silent) toast('Gespeichert');
  buildOverview();
  renderActivities();
}

// Render tracker
function renderTracker(){
  const def = PRESETS[workoutSel.value];
  let html='';
  def.forEach((ex,idx)=>{
    const last = lastSetsFor(ex.n);
    const setCount = Math.max(ex.sets, last? last.length : ex.sets);
    html += `<div class="card" id="card-${idx}">
      <div class="exercise-head">
        <div class="pill">${idx+1}. ${ex.n}</div>
        <div class="btnrow">
          <button class="btn ghost" data-act="suggest" data-idx="${idx}">Vorschlag → Satz 1</button>
          ${ex.t ? `<a class="btn ghost" href="${ex.t}" target="_blank" rel="noopener">Technik</a>`:``}
          <button class="btn" data-act="addset" data-idx="${idx}">+ Satz</button>
          <button class="btn ghost" data-act="removeset" data-idx="${idx}">− Satz</button>
        </div>
      </div>
      <div class="setgrid hdr">
        <div class="hdr">Satz</div>
        <div class="hdr">Gewicht</div>
        <div class="hdr">Vorschlag</div>
        <div class="hdr">Wdh.</div>
        <div class="hdr">RPE</div>
      </div>`;
    for(let s=0;s<setCount;s++){
      const lastW = last?.[s]?.w ?? 0;
      const lastR = last?.[s]?.reps ?? (ex.reps[s]||0);
      const lastRPE = last?.[s]?.rpe ?? 0;
      const sugg = last ? lastW : lastTopSet(ex.n);
      html += `<div class="setgrid" data-idx="${idx}" data-set="${s}">
        <div>${s+1}</div>
        <div><input type="number" step="0.5" data-k="w" value="${lastW || (s===0? sugg: 0)}"></div>
        <div><input type="text" class="suggestion" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
        <div><input type="number" step="1" data-k="reps" value="${lastR||0}"></div>
        <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${lastRPE||''}"></div>
      </div>`;
    }
    html += `</div>`;
  });
  tabTracker.innerHTML = html;

  tabTracker.querySelectorAll('[data-act="suggest"]').forEach(btn=>btn.addEventListener('click', ()=>{
    const idx=+btn.dataset.idx;
    const exName = PRESETS[workoutSel.value][idx].n;
    const s = lastTopSet(exName);
    const row = tabTracker.querySelector(`.setgrid[data-idx='${idx}'][data-set='0']`);
    if(row){ row.querySelector(`[data-k='w']`).value = s||''; row.querySelector(`[data-k='sugg']`).value = s? (s+' kg'): ''; }
    markDirty(); toast('Vorschlag gesetzt');
  }));
  tabTracker.querySelectorAll('[data-act="addset"]').forEach(btn=>btn.addEventListener('click', ()=>{ addSetRow(+btn.dataset.idx); markDirty(); }));
  tabTracker.querySelectorAll('[data-act="removeset"]').forEach(btn=>btn.addEventListener('click', ()=>{ removeLastSet(+btn.dataset.idx); markDirty(); }));
}
function addSetRow(idx){
  const card = document.getElementById(`card-${idx}`);
  const ex = PRESETS[workoutSel.value][idx];
  const rows = card.querySelectorAll(`.setgrid[data-idx='${idx}']`);
  const s = rows.length;
  const last = lastSetsFor(ex.n);
  const lastW = last?.[s]?.w ?? 0;
  const lastR = last?.[s]?.reps ?? (ex.reps[s]||0);
  const lastRPE = last?.[s]?.rpe ?? 0;
  const sugg = last ? lastW : lastTopSet(ex.n);
  const row = document.createElement('div');
  row.className='setgrid'; row.dataset.idx=idx; row.dataset.set=s;
  row.innerHTML = `<div>${s+1}</div>
    <div><input type="number" step="0.5" data-k="w" value="${lastW || (s===0? sugg: 0)}"></div>
    <div><input type="text" class="suggestion" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
    <div><input type="number" step="1" data-k="reps" value="${lastR||0}"></div>
    <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${lastRPE||''}"></div>`;
  card.appendChild(row);
}
function removeLastSet(idx){
  const rows = document.querySelectorAll(`.setgrid[data-idx='${idx}']`);
  if(rows.length<=1) return;
  rows[rows.length-1].remove();
}

// Load
function onLoadDay(){
  renderTracker();
  const d = getSession(storageKey()); if(!d){ return; }
  (d.rows||[]).forEach((row,idx)=>{
    const card=document.getElementById(`card-${idx}`); if(!card) return;
    const needed=row.sets?.length||0;
    const current=card.querySelectorAll(`.setgrid[data-idx='${idx}']`).length;
    for(let i=current;i<needed;i++){ addSetRow(idx); }
    row.sets?.forEach((s,si)=>{
      const g=card.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}']`); if(!g) return;
      g.querySelector(`[data-k='w']`).value=s.w||''; g.querySelector(`[data-k='reps']`).value=s.reps||''; g.querySelector(`[data-k='rpe']`).value=s.rpe||'';
      const sugg = lastTopSet(row.name); g.querySelector(`[data-k='sugg']`).value = sugg? (sugg+' kg'): '';
    });
  });
}

// Overview + Calendar + Recap + Multi-Chart
function buildOverview(){
  const cal = document.getElementById('calendar'); const label = document.getElementById('monthLabel');
  if(!cal) return;
  cal.innerHTML='';
  if(calendarWeekdays){
    const weekdays=['Mo','Di','Mi','Do','Fr','Sa','So'];
    calendarWeekdays.innerHTML = weekdays.map(d=>`<div>${d}</div>`).join('');
  }
  const base = new Date(dateEl.value||todayISO());
  let y = base.getFullYear(), m = base.getMonth();
  renderCalendar(y,m);

  // Multi select list
  const exSel = document.getElementById('exSelect');
  if(exSel){
    const names = new Set(); Object.values(PRESETS).flat().forEach(x=>names.add(x.n));
    const arr=[...names];
    exSel.innerHTML = arr.map(n=>`<option value="${n}">${n}</option>`).join('');
    exSel.onchange = ()=>{ drawChart(); };
  }

  // Recaps
  computeRecaps(base);

  const prevBtn=document.getElementById('prevMonth');
  const nextBtn=document.getElementById('nextMonth');
  if(prevBtn){ prevBtn.onclick=()=>{ m--; while(m<0){m+=12;y--;} renderCalendar(y,m); }; }
  if(nextBtn){ nextBtn.onclick=()=>{ m++; while(m>11){m-=12;y++;} renderCalendar(y,m); }; }

  function renderCalendar(Y,M){
    cal.innerHTML='';
    const monthNames=['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    if(label) label.textContent=monthNames[M]+' '+Y;
    const first=new Date(Y,M,1); const startW=(first.getDay()+6)%7;
    const days=new Date(Y,M+1,0).getDate();
    for(let i=0;i<startW;i++) cal.appendChild(dayCell('',null));
    for(let d=1; d<=days; d++){
      const iso=new Date(Y,M,d).toISOString().slice(0,10);
      const badge=dayWorkoutBadge(iso);
      const el=dayCell(d,badge);
      if(iso===dateEl.value) el.classList.add('active');
      el.onclick=()=>{ dateEl.value=iso; onLoadDay(); computeRecaps(new Date(iso)); document.querySelectorAll('.day').forEach(x=>x.classList.remove('active')); el.classList.add('active'); };
      cal.appendChild(el);
    }
  }
}

// Activities view
function renderActivities(){
  const list=document.getElementById('activitiesList');
  if(!list) return;
  const entries=sessionEntries().map(({key,data})=>{
    if(!data || !data.date) return null;
    const summary=(data.rows||[]).reduce((acc,row)=>{
      const sets=row.sets||[];
      acc.exercises+=1;
      acc.sets+=sets.length;
      sets.forEach(s=>{ acc.volume+=(+s.w||0)*(+s.reps||0); });
      return acc;
    }, {exercises:0, sets:0, volume:0});
    return {key, date:data.date, workout:data.workout||'', summary};
  }).filter(Boolean).sort((a,b)=>{
    if(a.date===b.date){ return a.workout.localeCompare(b.workout); }
    return b.date.localeCompare(a.date);
  });
  if(!entries.length){
    list.innerHTML='<div class="activities-empty">Noch keine Trainings gespeichert.</div>';
    return;
  }
  const fmt=new Intl.DateTimeFormat('de-DE',{weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'});
  list.innerHTML=entries.map(e=>{
    const date=new Date(e.date+'T00:00:00');
    const dateTxt=isNaN(date.getTime())? e.date : fmt.format(date);
    const workoutTxt=e.workout? `Training ${e.workout}` : 'Training';
    const vol=Math.round(e.summary.volume);
    const meta=`${e.summary.exercises} Übungen · ${e.summary.sets} Sätze`;
    const volumeTxt=vol>0? `${vol} kg Volumen` : 'Kein Volumen erfasst';
    return `<div class="activity-item" data-key="${e.key}">
      <div class="activity-row">
        <div class="activity-main">
          <div><strong>${dateTxt}</strong> · ${workoutTxt}</div>
          <div class="activity-meta">${meta}</div>
        </div>
        <div class="activity-volume">${volumeTxt}</div>
        <div class="activity-actions">
          <button class="btn danger" data-act="delete" data-key="${e.key}">Löschen</button>
        </div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-act="delete"]').forEach(btn=>{
    btn.addEventListener('click', ()=>deleteActivity(btn.dataset.key));
  });
}
function deleteActivity(key){
  if(!key) return;
  removeSessionRecord(key);
  toast('Training gelöscht');
  renderActivities();
  buildOverview();
  onLoadDay();
}
function dayWorkoutBadge(iso){
  const a=getSession(`${STORAGE_PREFIX}A:${iso}`); const b=getSession(`${STORAGE_PREFIX}B:${iso}`);
  if(a&&b) return 'AB'; if(a) return 'A'; if(b) return 'B'; return null;
}
function dayCell(txt,badge){
  const d=document.createElement('div'); d.className='day'; d.textContent=txt;
  if(badge){ const b=document.createElement('span'); b.className='badge-ab'; b.textContent=badge; d.appendChild(b); d.classList.add('has'); }
  return d;
}

// Recaps
function computeRecaps(refDate){
  const {weekStats, prevWeekStats, monthStats, prevMonthStats} = summarize(refDate);
  // Week
  $('#wkWorkouts').textContent = weekStats.sessions;
  $('#wkVolume').textContent = Math.round(weekStats.volume);
  $('#wkAvgRPE').textContent = weekStats.avgRPE.toFixed(1);
  $('#wkDelta').textContent = deltaStr(weekStats.volume, prevWeekStats.volume, 'Volumen');
  // Month
  $('#moWorkouts').textContent = monthStats.sessions;
  $('#moVolume').textContent = Math.round(monthStats.volume);
  $('#moAvgRPE').textContent = monthStats.avgRPE.toFixed(1);
  $('#moDelta').textContent = deltaStr(monthStats.volume, prevMonthStats.volume, 'Volumen');
}
function summarize(refDate){
  const days = allSessionsArray().filter(Boolean);
  const d0 = new Date(refDate);
  const weekStart = new Date(d0); weekStart.setDate(d0.getDate()-((d0.getDay()+6)%7)); // Mon
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+7);
  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate()-7);
  const prevWeekEnd = new Date(weekStart);

  const monthStart = new Date(d0.getFullYear(), d0.getMonth(), 1);
  const monthEnd = new Date(d0.getFullYear(), d0.getMonth()+1, 1);
  const prevMonthStart = new Date(d0.getFullYear(), d0.getMonth()-1, 1);
  const prevMonthEnd = new Date(d0.getFullYear(), d0.getMonth(), 1);

  const filt = (from,to)=> days.filter(x=> x.date && (new Date(x.date)>=from) && (new Date(x.date)<to));
  const mk = (arr)=>{
    let volume=0, sets=0, rpeSum=0, rpeN=0, sessions=new Set();
    arr.forEach(d=>{
      sessions.add(d.date);
      (d.rows||[]).forEach(r=> r.sets?.forEach(s=>{
        volume += (s.w||0)*(s.reps||0);
        sets += 1;
        if(s.rpe){ rpeSum += s.rpe; rpeN++; }
      }));
    });
    return {volume, sets, avgRPE: rpeN? rpeSum/rpeN : 0, sessions: sessions.size};
  };
  return {
    weekStats: mk(filt(weekStart, weekEnd)),
    prevWeekStats: mk(filt(prevWeekStart, prevWeekEnd)),
    monthStats: mk(filt(monthStart, monthEnd)),
    prevMonthStats: mk(filt(prevMonthStart, prevMonthEnd))
  };
}
function deltaStr(cur, prev, label){
  if(prev===0 && cur===0) return `${label}: —`;
  if(prev===0) return `${label}: ▲ +100% ggü. Vormonat/Woche`;
  const pct = ((cur - prev)/prev)*100;
  const arrow = pct>0 ? '▲' : (pct<0 ? '▼' : '•');
  return `${label}: ${arrow} ${pct>=0?'+':''}${pct.toFixed(0)}%`;
}

// Multi-Exercise Chart + Aggregate Score
function drawChart(){
  const c=document.getElementById('chart'); const exSel=document.getElementById('exSelect'); const legend = document.getElementById('legend');
  if(!c || !exSel) return;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  legend.innerHTML='';

  const selected=[...exSel.selectedOptions].map(o=>o.value);
  if(selected.length===0){ ctx.fillStyle=cssVar('--muted'); ctx.fillText('Wähle eine oder mehrere Übungen.',20,24); document.getElementById('aggScore').textContent='–'; return; }

  const colors = ['--c1','--c2','--c3','--c4','--c5','--c6'].map(cssVar);
  const pad={l:42,r:6,t:10,b:28}, w=c.width-pad.l-pad.r, h=c.height-pad.t-pad.b;

  // Build datasets
  const series=[]; let globalDates=new Set();
  const sessions = sessionEntries().map(entry=>entry.data);
  selected.forEach((ex,i)=>{
    const hist=[];
    sessions.forEach(data=>{
      const row=data.rows?.find(r=>r.name===ex);
      if(!row) return;
      const top = Math.max(...(row.sets||[]).map(s=>+s.w||0),0);
      if(top>0){
        hist.push({date:data.date,w:top});
        if(data.date) globalDates.add(data.date);
      }
    });
    hist.sort((a,b)=>a.date.localeCompare(b.date));
    series.push({name:ex, color:colors[i%colors.length], data:hist});
  });
  const dates=[...globalDates].sort();
  // y-range
  const ys = series.flatMap(s=>s.data.map(p=>p.w));
  if(ys.length===0){ ctx.fillStyle=cssVar('--muted'); ctx.fillText('Keine Daten vorhanden.',20,24); document.getElementById('aggScore').textContent='–'; return; }
  const ymin=Math.min(...ys)*0.9, ymax=Math.max(...ys)*1.1;
  const toX=(i)=> pad.l + (dates.length<=1? 0 : (i*(w/(dates.length-1))));
  const toY=v=> pad.t + h - ((v - ymin)/(ymax - ymin))*h;

  // axes
  ctx.strokeStyle=cssVar('--border'); ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+h); ctx.lineTo(pad.l+w,pad.t+h); ctx.stroke();
  ctx.fillStyle=cssVar('--muted'); ctx.textAlign='right'; ctx.font='12px system-ui';
  for(let i=0;i<=4;i++){ const v=ymin+i*(ymax-ymin)/4; const y=toY(v); ctx.fillText(v.toFixed(0),pad.l-6,y+4); ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.strokeStyle=cssVar('--border'); ctx.stroke(); }
  ctx.textAlign='center'; dates.forEach((d,i)=>{ ctx.fillText(d.slice(5), toX(i), pad.t+h+18); });

  // lines
  series.forEach((s)=>{
    // Legend
    const ent=document.createElement('div'); ent.className='entry'; ent.innerHTML=`<span class="dot" style="background:${s.color}"></span>${s.name}`; legend.appendChild(ent);
    const map = new Map(s.data.map(p=>[p.date,p.w]));
    ctx.strokeStyle=s.color; ctx.lineWidth=2; ctx.beginPath();
    dates.forEach((d,i)=>{
      const v=map.has(d)? map.get(d) : null;
      if(v==null) return;
      const x=toX(i), y=toY(v);
      if(i===0 || !map.has(dates[i-1])) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });

  // Aggregate progress score
  const score = aggregateProgress(series);
  document.getElementById('aggScore').textContent = (score>0?'+':'') + score.toFixed(1) + ' %/6W';
}
function aggregateProgress(series){
  function trendPct(data){
    if(data.length<2) return 0;
    const tail = data.slice(-8);
    const xs = tail.map((_,i)=>i);
    const ys = tail.map(p=>p.w);
    const n=xs.length;
    const sumX=xs.reduce((a,b)=>a+b,0), sumY=ys.reduce((a,b)=>a+b,0);
    const sumXY=xs.reduce((a,b,i)=>a+b*ys[i],0);
    const sumXX=xs.reduce((a,b)=>a+b*b,0);
    const slope = (n*sumXY - sumX*sumY) / Math.max(1,(n*sumXX - sumX*sumX));
    const base = ys[0]||1;
    return (slope/base)*100 * (6/ (n/2));
  }
  const pcts = series.map(s=> trendPct(s.data)).filter(x=>!isNaN(x));
  if(!pcts.length) return 0;
  return pcts.reduce((a,b)=>a+b,0)/pcts.length;
}

// Export CSV
function onExportCSV(){
  const rows=["Datum;Workout;Übung;Satz;Gewicht;Wdh.;RPE"];
  sessionEntries().sort((a,b)=>a.key.localeCompare(b.key)).forEach(({data})=>{
    (data.rows||[]).forEach(r=>{
      (r.sets||[]).forEach((s,si)=>{
        rows.push([data.date,data.workout,r.name,si+1,s.w||'',s.reps||'',s.rpe||''].join(';'));
      });
    });
  });
  const blob=new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='hyrox_training_export.csv'; a.click(); URL.revokeObjectURL(a.href);
}

function handleImportCSV(evt){
  const file = evt.target?.files?.[0];
  if(!file){ evt.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const text = String(reader.result||'');
      const sessions = parseImportCSV(text);
      const imported = applyImportedSessions(sessions);
      if(imported>0){ toast(`${imported} Training${imported===1?'':'s'} importiert`); }
      else{ toast('Keine Trainings importiert'); }
      renderActivities();
      buildOverview();
      onLoadDay();
    }catch(err){
      console.error('Import CSV failed', err);
      toast('Import fehlgeschlagen');
    }finally{
      evt.target.value='';
    }
  };
  reader.onerror = ()=>{
    toast('Import fehlgeschlagen');
    evt.target.value='';
  };
  reader.readAsText(file,'utf-8');
}

function parseImportCSV(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if(!lines.length) return [];
  const headerRe=/^datum\s*;\s*workout/i;
  if(headerRe.test(lines[0])){ lines.shift(); }
  const sessionsMap=new Map();
  lines.forEach(line=>{
    const parts=line.split(';');
    if(parts.length<3) return;
    const [date, workout, exercise, setIdx, weight, reps, rpe]=parts.map(p=>p.trim());
    if(!date || !workout || !exercise) return;
    const key=`hyrox:${workout}:${date}`;
    if(!sessionsMap.has(key)){
      sessionsMap.set(key,{date, workout, rows:new Map()});
    }
    const session=sessionsMap.get(key);
    if(!session.rows.has(exercise)){
      session.rows.set(exercise,{name:exercise, sets:[]});
    }
    const row=session.rows.get(exercise);
    const idx=Math.max(0,(parseInt(setIdx,10)||row.sets.length+1)-1);
    row.sets[idx]={
      w: parseNumber(weight),
      reps: parseIntSafe(reps),
      rpe: parseNumber(rpe)
    };
  });
  return [...sessionsMap.values()].map(session=>({
    date: session.date,
    workout: session.workout,
    rows: [...session.rows.values()].map(row=>({
      name: row.name,
      sets: row.sets.filter(Boolean).map(set=>({
        w: set?.w||0,
        reps: set?.reps||0,
        rpe: set?.rpe||0
      }))
    }))
  })).filter(session=>session.rows.length>0);
}

function applyImportedSessions(sessions){
  let count=0;
  sessions.forEach(session=>{
    if(!session?.date || !session?.workout) return;
    const key=`${STORAGE_PREFIX}${session.workout}:${session.date}`;
    setSessionRecord(key, {
      date: session.date,
      workout: session.workout,
      rows: session.rows
    });
    count++;
  });
  return count;
}

function parseNumber(val){
  if(val===undefined || val===null || val==='') return 0;
  const n=Number(String(val).replace(',', '.'));
  return Number.isFinite(n)? n : 0;
}

function parseIntSafe(val){
  if(val===undefined || val===null || val==='') return 0;
  const n=parseInt(String(val).replace(',', '.'),10);
  return Number.isFinite(n)? n : 0;
}

// Toast
function toast(msg){ const f=document.createElement('div'); f.className='flash'; f.textContent=msg; document.body.appendChild(f); setTimeout(()=>f.remove(), 1200); }

})(); // end IIFE
