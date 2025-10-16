// ===== AthlētX HYROX Tracker – v4 (mobile snap, set add/remove, last-session defaults, no JSON import & no tempo) =====
(() => {
// Presets (mit Technik-Links)
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

// Shortcuts & theme helpers
const $ = s=>document.querySelector(s);
const todayISO = ()=>new Date().toISOString().slice(0,10);
const cssVar = (name)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#94a3b8';

// Elements
const dateEl = $('#date');
const workoutSel = $('#workoutSel');
const tabTracker = $('#tab-tracker');
const tabOverview = $('#tab-overview');
const themeToggle = $('#themeToggle');

// Autosave
let dirty = false; let autosaveTimer = null;

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

// Init app
dateEl.value = todayISO();
renderTracker(); onLoadDay(); computeKPIs(); buildOverview(); drawChart();
bindTabs(); bindControls(); setupAutosave();

// Bindings
function bindTabs(){
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    tabTracker.classList.toggle('hidden', tab!=='tracker');
    tabOverview.classList.toggle('hidden', tab!=='overview');
    if(tab==='overview'){ buildOverview(); drawChart(); }
  }));
}

function bindControls(){
  $('#save')?.addEventListener('click', ()=>saveDay(false));
  $('#export')?.addEventListener('click', onExportCSV);
  $('#duplicate')?.addEventListener('click', onDuplicateNextDay);
  $('#clear')?.addEventListener('click', onClearDay);
  themeToggle?.addEventListener('click', toggleTheme);
  dateEl.addEventListener('change', ()=>{ onLoadDay(); computeKPIs(); buildOverview(); dirty=false; });
  workoutSel.addEventListener('change', ()=>{ renderTracker(); onLoadDay(); computeKPIs(); dirty=false; });
  document.addEventListener('input', e=>{ if(e.target.matches('input,select')) { dirty=true; computeKPIs(); } });
  $('#prevMonth')?.addEventListener('click', ()=>shiftMonth(-1));
  $('#nextMonth')?.addEventListener('click', ()=>shiftMonth(1));
}

// Autosave alle 3 Min (silent)
function setupAutosave(){ if(autosaveTimer) clearInterval(autosaveTimer); autosaveTimer = setInterval(()=>{ if(dirty){ saveDay(true); dirty=false; } }, 180000); }

// Theme toggle
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('athletx:theme', next);
  updateThemeIcon(); drawChart();
}
function updateThemeIcon(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  themeToggle.textContent = cur === 'dark' ? '🌙' : '☀️';
  themeToggle.title = cur === 'dark' ? 'Zu Light wechseln' : 'Zu Dark wechseln';
}

// Storage
function storageKey(){ return `hyrox:${workoutSel.value}:${dateEl.value}`; }

// Historie: komplette Sätze vom letzten Eintrag der gleichen Übung (exakte Satz-Indizes)
function lastSetsFor(exName){
  // finde neuesten Eintrag vor/heute für alle Workouts (A/B), gleiche Übung
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort(); // ISO sort
  let latest = null; let latestDate = '';
  keys.forEach(k=>{
    try{
      const d = JSON.parse(localStorage.getItem(k)||'{}');
      const row = (d.rows||[]).find(r=>r.name===exName);
      if(row){
        if(!latest || (d.date && d.date > latestDate)){ latest = row.sets||[]; latestDate = d.date; }
      }
    }catch(e){}
  });
  return latest; // array of sets or null
}

// Vorschlag fallback
function lastTopSet(exName){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:'));
  const hist=[];
  keys.forEach(k=>{
    try{
      const d = JSON.parse(localStorage.getItem(k));
      d?.rows?.forEach(r=>{ if(r.name===exName){
        const top = Math.max(...(r.sets||[]).map(s=>+s.w||0),0);
        const topRPE = (r.sets||[]).reduce((a,s)=> Math.max(a, +s.rpe||0), 0);
        if(top>0) hist.push({date:d.date, w:top, rpe:topRPE});
      }});
    }catch(e){}
  });
  hist.sort((a,b)=> a.date.localeCompare(b.date));
  const last = hist[hist.length-1];
  if(!last) return 0;
  if(last.rpe<=8) return Math.round(last.w*1.025*2)/2;
  if(last.rpe>9) return Math.round(last.w*0.975*2)/2;
  return last.w;
}

// Collect & Save
function collect(){
  const day={date:dateEl.value, workout:workoutSel.value, rows:[]};
  PRESETS[workoutSel.value].forEach((ex,idx)=>{
    const rows = document.querySelectorAll(`.setgrid[data-idx='${idx}']`);
    const sets=[];
    rows.forEach(g=>{
      const get=k=>g.querySelector(`[data-k='${k}']`)?.value||'';
      sets.push({w:+get('w')||0, reps:+get('reps')||0, rpe:+get('rpe')||0, note:get('note')||''});
    });
    day.rows.push({name:ex.n, sets});
  });
  return day;
}
function saveDay(silent=true){
  localStorage.setItem(storageKey(), JSON.stringify(collect()));
  if(!silent) toast('Gespeichert');
  computeKPIs(); if(!tabOverview.classList.contains('hidden')) buildOverview();
}

// Render Tracker with per-exercise card; defaults from last session by set index
function renderTracker(){
  const def = PRESETS[workoutSel.value];
  let html='';
  def.forEach((ex,idx)=>{
    const last = lastSetsFor(ex.n);
    const setCount = Math.max(ex.sets, last? last.length : ex.sets);
    // Header mit Technik & Set-Buttons
    html += `<div class="card" id="card-${idx}">
      <div class="exercise-head">
        <div class="pill">${idx+1}. ${ex.n}</div>
        <div class="btnrow">
          <button class="btn ghost" data-act="suggest" data-idx="${idx}">Vorschlag in 1. Satz</button>
          ${ex.t ? `<a class="btn tech" href="${ex.t}" target="_blank" rel="noopener">Technik</a>`:``}
          <button class="btn ghost" data-act="addset" data-idx="${idx}">+ Satz</button>
        </div>
      </div>
      <div class="setgrid hdr">
        <div class="hdr">Satz</div>
        <div class="hdr">Gewicht (kg)</div>
        <div class="hdr">Wdh.</div>
        <div class="hdr">RPE</div>
        <div class="hdr">Vorschlag</div>
        <div class="hdr">Notiz</div>
        <div class="hdr">Del</div>
      </div>`;
    for(let s=0; s<setCount; s++){
      const rid=`${idx}-${s}`;
      const lastW = last?.[s]?.w ?? 0;
      const lastR = last?.[s]?.reps ?? (ex.reps[s]||0);
      const lastRPE = last?.[s]?.rpe ?? 0;
      const sugg = last ? lastW : lastTopSet(ex.n);
      html += `<div class="setgrid" data-idx="${idx}" data-set="${s}">
        <div>${s+1}</div>
        <div><input type="number" step="0.5" data-k="w" placeholder="kg" value="${lastW|| (s===0? sugg: 0)}"></div>
        <div><input type="number" step="1" data-k="reps" value="${lastR||0}"></div>
        <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${lastRPE||''}"></div>
        <div><input type="text" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
        <div><input type="text" data-k="note" class="note" placeholder=""></div>
        <div><button class="rowbtn" title="Satz löschen" data-act="delset" data-idx="${idx}" data-si="${s}">🗑</button></div>
      </div>`;
    }
    html += `</div>`;
  });
  tabTracker.innerHTML = html;

  // Delegated actions
  tabTracker.querySelectorAll('[data-act="suggest"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.idx;
      const exName = PRESETS[workoutSel.value][idx].n;
      const s = lastTopSet(exName);
      const firstRow = tabTracker.querySelector(`.setgrid[data-idx='${idx}'][data-set='0']`);
      if(firstRow){
        firstRow.querySelector(`[data-k='w']`).value = s || '';
        firstRow.querySelector(`[data-k='sugg']`).value = s? (s+' kg') : '';
      }
      dirty = true;
      toast('Vorschlag gesetzt');
    });
  });
  tabTracker.querySelectorAll('[data-act="addset"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.idx;
      addSetRow(idx);
      dirty = true;
    });
  });
  tabTracker.querySelectorAll('[data-act="delset"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.idx; const si = +btn.dataset.si;
      deleteSetRow(idx, si);
      dirty = true;
    });
  });
}

// Add set row (defaults: same index from last session or fallback suggestion)
function addSetRow(idx){
  const card = document.getElementById(`card-${idx}`);
  const ex = PRESETS[workoutSel.value][idx];
  const list = card.querySelectorAll(`.setgrid[data-idx='${idx}']`);
  const s = list.length; // next set index
  const last = lastSetsFor(ex.n);
  const lastW = last?.[s]?.w ?? 0;
  const lastR = last?.[s]?.reps ?? (ex.reps[s]||0);
  const lastRPE = last?.[s]?.rpe ?? 0;
  const sugg = last ? lastW : lastTopSet(ex.n);
  const row = document.createElement('div');
  row.className = 'setgrid'; row.dataset.idx = idx; row.dataset.set = s;
  row.innerHTML = `<div>${s+1}</div>
    <div><input type="number" step="0.5" data-k="w" placeholder="kg" value="${lastW|| (s===0? sugg: 0)}"></div>
    <div><input type="number" step="1" data-k="reps" value="${lastR||0}"></div>
    <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${lastRPE||''}"></div>
    <div><input type="text" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
    <div><input type="text" data-k="note" class="note" placeholder=""></div>
    <div><button class="rowbtn" title="Satz löschen" data-act="delset" data-idx="${idx}" data-si="${s}">🗑</button></div>`;
  card.appendChild(row);
  // bind delete button
  row.querySelector('[data-act="delset"]').addEventListener('click', ()=>{ deleteSetRow(idx, s); dirty=true; });
}

// Delete set row (re-index following rows)
function deleteSetRow(idx, si){
  const rows = Array.from(document.querySelectorAll(`.setgrid[data-idx='${idx}']`));
  const row = rows.find(r=> +r.dataset.set === si);
  if(!row) return;
  row.remove();
  // re-index
  const rem = Array.from(document.querySelectorAll(`.setgrid[data-idx='${idx}']`));
  rem.forEach((r,i)=>{
    r.dataset.set = i;
    r.querySelector('div:first-child').textContent = i+1;
    const del = r.querySelector('[data-act="delset"]'); if(del) del.dataset.si = i;
  });
}

// Load (keine Tempo/Import mehr)
function onLoadDay(){
  renderTracker();
  const raw = localStorage.getItem(storageKey()); if(!raw){ computeKPIs(); return; }
  const d = JSON.parse(raw);
  // fill values
  (d.rows||[]).forEach((row,idx)=>{
    const card = document.getElementById(`card-${idx}`);
    // ensure enough rows
    const needed = row.sets?.length || 0;
    const current = card.querySelectorAll(`.setgrid[data-idx='${idx}']`).length;
    for(let i=current;i<needed;i++){ addSetRow(idx); }
    row.sets?.forEach((s,si)=>{
      const g = card.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}']`); if(!g) return;
      g.querySelector(`[data-k='w']`).value = s.w||'';
      g.querySelector(`[data-k='reps']`).value = s.reps||'';
      g.querySelector(`[data-k='rpe']`).value = s.rpe||'';
      g.querySelector(`[data-k='note']`).value = s.note||'';
      const sugg = lastTopSet(row.name); g.querySelector(`[data-k='sugg']`).value = sugg? (sugg+' kg'): '';
    });
  });
  computeKPIs();
}

// KPIs
function computeKPIs(){
  const d = collect(); let vol=0, sets=0, eff=0, rpeSum=0, rpeN=0;
  d.rows.forEach(r=>{
    r.sets.forEach(s=>{
      vol += (s.w||0)*(s.reps||0); sets += 1;
      if(s.rpe){ rpeSum+=s.rpe; rpeN++; }
      const effSet = Math.max(0, Math.min(6, (s.reps||0) - Math.max(0, 10 - (s.rpe||0)*0.8)) );
      eff += effSet;
    });
  });
  $('#volTotal').textContent = Math.round(vol);
  $('#setsTotal').textContent = sets;
  $('#effReps').textContent = Math.round(eff);
  $('#rpeAvg').textContent = rpeN? (rpeSum/rpeN).toFixed(1) : '0.0';
}

// Duplicate/Clear
function onDuplicateNextDay(){
  const d = new Date(dateEl.value||todayISO()); d.setDate(d.getDate()+1);
  const next = d.toISOString().slice(0,10);
  const currentData = collect(); currentData.date = next;
  localStorage.setItem(`hyrox:${workoutSel.value}:${next}`, JSON.stringify(currentData));
  dateEl.value = next; onLoadDay(); toast('Auf nächsten Tag dupliziert');
}
function onClearDay(){
  localStorage.removeItem(storageKey());
  renderTracker(); computeKPIs(); toast('Eintrag gelöscht'); buildOverview();
}

// Overview + Calendar + Chart (farben je Theme)
function buildOverview(){
  const cal = document.getElementById('calendar'); const label = document.getElementById('monthLabel');
  if(!cal) return;
  cal.innerHTML='';
  const base = new Date(dateEl.value||todayISO());
  let y = base.getFullYear(), m = base.getMonth();
  renderCalendar(y,m);
  const exSel = document.getElementById('exSelect');
  if(exSel){
    const names = new Set(); Object.values(PRESETS).flat().forEach(x=>names.add(x.n));
    exSel.innerHTML = [...names].map(n=>`<option>${n}</option>`).join('');
    exSel.onchange = drawChart;
  }
  document.getElementById('prevMonth')?.addEventListener('click', ()=>{ m--; while(m<0){m+=12;y--;} renderCalendar(y,m); drawChart(); });
  document.getElementById('nextMonth')?.addEventListener('click', ()=>{ m++; while(m>11){m-=12;y++;} renderCalendar(y,m); drawChart(); });
  function renderCalendar(Y,M){
    cal.innerHTML='';
    const monthNames = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    if(label) label.textContent = monthNames[M]+' '+Y;
    const first = new Date(Y,M,1); const startW=(first.getDay()+6)%7;
    const days = new Date(Y,M+1,0).getDate();
    for(let i=0;i<startW;i++) cal.appendChild(dayCell('',null));
    for(let d=1; d<=days; d++){
      const iso = new Date(Y,M,d).toISOString().slice(0,10);
      const badge = dayWorkoutBadge(iso);
      const el = dayCell(d,badge);
      if(iso===dateEl.value) el.classList.add('active');
      el.onclick = ()=>{ dateEl.value = iso; onLoadDay(); computeKPIs(); drawChart(); document.querySelectorAll('.day').forEach(x=>x.classList.remove('active')); el.classList.add('active'); };
      cal.appendChild(el);
    }
  }
}
function dayWorkoutBadge(iso){
  const a = localStorage.getItem(`hyrox:A:${iso}`);
  const b = localStorage.getItem(`hyrox:B:${iso}`);
  if(a && b) return 'AB';
  if(a) return 'A';
  if(b) return 'B';
  return null;
}
function dayCell(txt, badge){
  const d=document.createElement('div'); d.className='day'; d.textContent=txt;
  if(badge){ const b=document.createElement('span'); b.className='badge-ab'; b.textContent=badge; d.appendChild(b); d.classList.add('has'); }
  return d;
}

function drawChart(){
  const exSel = document.getElementById('exSelect'); const ex = exSel?.value;
  const c = document.getElementById('chart'); if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const colMuted = cssVar('--muted'); const colBorder = cssVar('--border'); const colPrimary = cssVar('--primary'); const colAccent = cssVar('--accent');
  if(!ex){ ctx.fillStyle=colMuted; ctx.fillText('Keine Daten.', 20, 20); return; }
  // collect hist
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
  const hist=[]; keys.forEach(k=>{ try{ const d = JSON.parse(localStorage.getItem(k)||'{}'); const row = d.rows?.find(r=>r.name===ex); if(row){ const top = Math.max(...row.sets.map(s=>+s.w||0),0); if(top>0) hist.push({date:d.date, w:top}); } }catch(e){} });
  hist.sort((a,b)=> a.date.localeCompare(b.date));
  const xs = hist.map(h=>h.date); const ys = hist.map(h=>h.w);
  if(ys.length===0){ ctx.fillStyle=colMuted; ctx.fillText('Keine Daten vorhanden.', 20, 24); return; }
  const pad={l:42,r:10,t:10,b:28}, w=c.width-pad.l-pad.r, h=c.height-pad.t-pad.b;
  const ymin = Math.min(...ys)*0.9, ymax = Math.max(...ys)*1.1;
  const xstep = w/Math.max(1, ys.length-1);
  const toX = i=> pad.l + i*xstep; const toY = v=> pad.t + h - ((v - ymin)/(ymax - ymin))*h;
  ctx.strokeStyle=colBorder; ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+h); ctx.lineTo(pad.l+w,pad.t+h); ctx.stroke();
  ctx.fillStyle=colMuted; ctx.textAlign='right'; ctx.font='12px system-ui';
  for(let i=0;i<=4;i++){ const v=ymin + i*(ymax-ymin)/4; const y=toY(v); ctx.fillText(v.toFixed(0), pad.l-6, y+4); ctx.strokeStyle=colBorder; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.stroke(); }
  ctx.strokeStyle=colPrimary; ctx.lineWidth=2; ctx.beginPath();
  ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  ctx.fillStyle=colAccent; ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
}

// Export CSV
function onExportCSV(){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
  const rows = ["Datum;Workout;Übung;Satz;Gewicht;Wdh.;RPE;Notiz"];
  keys.forEach(k=>{
    const d = JSON.parse(localStorage.getItem(k)||'{}');
    (d.rows||[]).forEach(r=>{
      (r.sets||[]).forEach((s,si)=>{
        rows.push([d.date,d.workout,r.name,si+1,s.w||'',s.reps||'',s.rpe||'', (s.note||'').replaceAll(';',',')].join(';'));
      });
    });
  });
  const blob = new Blob([rows.join('\\n')],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='hyrox_training_export.csv'; a.click(); URL.revokeObjectURL(a.href);
}

// Duplicate & Clear
function shiftMonth(delta){ /* no-op stub to satisfy listeners if any */ }
function onDuplicateNextDay(){
  const d = new Date(dateEl.value||todayISO()); d.setDate(d.getDate()+1);
  const next = d.toISOString().slice(0,10);
  const currentData = collect(); currentData.date = next;
  localStorage.setItem(`hyrox:${workoutSel.value}:${next}`, JSON.stringify(currentData));
  dateEl.value = next; onLoadDay(); toast('Auf nächsten Tag dupliziert');
}
function onClearDay(){ localStorage.removeItem(storageKey()); renderTracker(); computeKPIs(); toast('Eintrag gelöscht'); buildOverview(); }

// Helpers
function toast(msg){ const f=document.createElement('div'); f.className='flash'; f.textContent=msg; document.body.appendChild(f); setTimeout(()=>f.remove(), 1400); }

})(); // end IIFE
