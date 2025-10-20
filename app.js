// ===== AthlētX HYROX Tracker – v5.2 (PWA + Multi-Chart + Recap) =====
(() => {
// Presets
const PRESETS = {
  A:[
    {n:"Front Squat / Hack Squat", sets:3, reps:[4,4,4], t:"https://www.youtube.com/watch?v=v-mQm_droHg"},
    {n:"Kreuzheben (konventionell)", sets:3, reps:[4,4,4], t:"https://www.youtube.com/watch?v=MBbyAqvTNkU"},
    {n:"Bankdrücken (schwer)", sets:3, reps:[5,5,5], t:"https://www.youtube.com/watch?v=vcBig73ojpE"},
    {n:"Bulgarian Split Squat (pro Bein)", sets:2, reps:[8,8], t:"https://www.youtube.com/watch?v=6GYxDJ9ee7I"},
    {n:"Beinbeuger / Glute Drive", sets:2, reps:[10,10], t:"https://www.youtube.com/watch?v=LM8XHLYJoYs"},
    {n:"Brustfliegende (Kabel/Maschine)", sets:2, reps:[10,10], t:"https://www.youtube.com/playlist?list=PLacPhVACI3MPUu-vCblBkHiGwYYYEQZnI"},
    {n:"Rückenstrecker", sets:2, reps:[12,12], t:"https://www.youtube.com/watch?v=ph3pddpKzzw"},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20], t:"https://www.youtube.com/watch?v=mGiKe6CYWss"}
  ],
  B:[
    {n:"Bankdrücken (leicht/mittelschwer)", sets:3, reps:[8,8,8], t:"https://www.youtube.com/watch?v=vcBig73ojpE"},
    {n:"Kreuzheben (Volumen/Technik)", sets:3, reps:[6,6,6], t:"https://www.youtube.com/watch?v=MBbyAqvTNkU"},
    {n:"Kniebeugen (Maschine/LH)", sets:3, reps:[6,6,6], t:"https://www.youtube.com/watch?v=bEv6CCg2BC8"},
    {n:"Latzug (neutraler Griff)", sets:3, reps:[6,6,6], t:"https://www.youtube.com/watch?v=VXKfH6ciEBI"},
    {n:"Kabelrudern (enger Griff)", sets:2, reps:[10,10], t:"https://www.youtube.com/watch?v=7o2oolbmzeI"},
    {n:"Schulterdrücken (Maschine/KH)", sets:3, reps:[6,6,6], t:"https://www.youtube.com/watch?v=_RlRDWO2jfg"},
    {n:"Seitheben (Kabel/KH)", sets:2, reps:[12,12], t:"https://www.youtube.com/watch?v=SgyUoY0IZ7A"},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20], t:"https://www.youtube.com/watch?v=mGiKe6CYWss"}
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
const themeToggle = $('#themeToggle');
const timerBtn = $('#timerBtn');
const importBtn = $('#importCsv');
const importInput = $('#importCsvFile');

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
dateEl.value = todayISO();
renderTracker(); onLoadDay(); buildOverview(); drawChart(); renderActivities();
bindTabs(); bindControls(); setupAutosave(); setupTimerFromSession();

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

// Storage
function storageKey(){ return `hyrox:${workoutSel.value}:${dateEl.value}`; }

// Historie
function lastSetsFor(exName){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
  let latest=null, latestDate='';
  keys.forEach(k=>{
    try{
      const d=JSON.parse(localStorage.getItem(k)||'{}');
      const row=(d.rows||[]).find(r=>r.name===exName);
      if(row && d.date && d.date>latestDate){ latest=row.sets||[]; latestDate=d.date; }
    }catch(e){}
  });
  return latest;
}
function lastTopSet(exName){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:'));
  const hist=[];
  keys.forEach(k=>{
    try{
      const d=JSON.parse(localStorage.getItem(k)||'{}');
      d?.rows?.forEach(r=>{ if(r.name===exName){
        const top = Math.max(...(r.sets||[]).map(s=>+s.w||0),0);
        const topRPE = (r.sets||[]).reduce((a,s)=> Math.max(a, +s.rpe||0), 0);
        if(top>0) hist.push({date:d.date, w:top, rpe:topRPE});
      }});
    }catch(e){}
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
  const raw=localStorage.getItem(storageKey()); if(!raw){ return; }
  const d=JSON.parse(raw);
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

// Overview + Calendar + Recap + Multi‑Chart
function buildOverview(){
  const cal = document.getElementById('calendar'); const label = document.getElementById('monthLabel');
  if(!cal) return;
  cal.innerHTML='';
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
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('hyrox:'));
  const entries=keys.map(k=>{
    try{
      const data=JSON.parse(localStorage.getItem(k)||'{}');
      if(!data || !data.date) return null;
      const summary=(data.rows||[]).reduce((acc,row)=>{
        const sets=row.sets||[];
        acc.exercises+=1;
        acc.sets+=sets.length;
        sets.forEach(s=>{ acc.volume+=(+s.w||0)*(+s.reps||0); });
        return acc;
      }, {exercises:0, sets:0, volume:0});
      return {key:k, date:data.date, workout:data.workout||'', summary};
    }catch(e){ return null; }
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
  localStorage.removeItem(key);
  toast('Training gelöscht');
  renderActivities();
  buildOverview();
  onLoadDay();
}
function dayWorkoutBadge(iso){
  const a=localStorage.getItem(`hyrox:A:${iso}`); const b=localStorage.getItem(`hyrox:B:${iso}`);
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
  const allKeys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:'));
  const days = allKeys.map(k=>{ try{ const d=JSON.parse(localStorage.getItem(k)||'{}'); return d; }catch(e){return null;} }).filter(Boolean);
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

// Multi‑Exercise Chart + Aggregate Score
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
  selected.forEach((ex,i)=>{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
    const hist=[]; keys.forEach(k=>{ try{ const d=JSON.parse(localStorage.getItem(k)||'{}'); const row=d.rows?.find(r=>r.name===ex); if(row){ const top=Math.max(...row.sets.map(s=>+s.w||0),0); if(top>0){ hist.push({date:d.date,w:top}); globalDates.add(d.date);} } }catch(e){} });
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
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
  const rows=["Datum;Workout;Übung;Satz;Gewicht;Wdh.;RPE"];
  keys.forEach(k=>{
    const d=JSON.parse(localStorage.getItem(k)||'{}');
    (d.rows||[]).forEach(r=>{
      (r.sets||[]).forEach((s,si)=>{
        rows.push([d.date,d.workout,r.name,si+1,s.w||'',s.reps||'',s.rpe||''].join(';'));
      });
    });
  });
  const blob=new Blob([rows.join('\\n')],{type:'text/csv;charset=utf-8'});
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
    const key=`hyrox:${session.workout}:${session.date}`;
    localStorage.setItem(key, JSON.stringify({
      date: session.date,
      workout: session.workout,
      rows: session.rows
    }));
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
