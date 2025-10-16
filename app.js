// ===== AthlētX HYROX Tracker – v3 (theme toggle + theme-aware chart) =====
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
const tempoEl = $('#tempo');
const tabTracker = $('#tab-tracker');
const tabOverview = $('#tab-overview');
const themeToggle = $('#themeToggle');

// Autosave state
let dirty = false;
let autosaveTimer = null;

// Init theme
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

// ---- Bindings
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
  $('#save')?.addEventListener('click', ()=>saveDay(false)); // manual save
  $('#export')?.addEventListener('click', onExportCSV);
  $('#importJson')?.addEventListener('click', ()=>$('#fileInput').click());
  $('#fileInput')?.addEventListener('change', onImportJSON);
  $('#duplicate')?.addEventListener('click', onDuplicateNextDay);
  $('#clear')?.addEventListener('click', onClearDay);
  themeToggle?.addEventListener('click', toggleTheme);
  dateEl.addEventListener('change', ()=>{ onLoadDay(); computeKPIs(); buildOverview(); dirty=false; });
  workoutSel.addEventListener('change', ()=>{ renderTracker(); onLoadDay(); computeKPIs(); dirty=false; });
  document.addEventListener('input', e=>{ if(e.target.matches('input,select')) { dirty=true; computeKPIs(); } });
  $('#prevMonth')?.addEventListener('click', ()=>shiftMonth(-1));
  $('#nextMonth')?.addEventListener('click', ()=>shiftMonth(1));
}

// ---- Theme toggle
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('athletx:theme', next);
  updateThemeIcon();
  // neu zeichnen, damit Chart-Farben passen
  drawChart();
}
function updateThemeIcon(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  themeToggle.textContent = cur === 'dark' ? '🌙' : '☀️';
  themeToggle.title = cur === 'dark' ? 'Zu Light wechseln' : 'Zu Dark wechseln';
}

// ---- Autosave alle 3 Minuten (silent)
function setupAutosave(){
  if(autosaveTimer) clearInterval(autosaveTimer);
  autosaveTimer = setInterval(()=>{
    if(dirty){ saveDay(true); dirty=false; }
  }, 180000);
}

// ---- Tracker Rendering (mit Technik-Links)
function renderTracker(){
  const def = PRESETS[workoutSel.value];
  let html='';
  def.forEach((ex,idx)=>{
    html += `<div class="card">
      <div class="exercise-head">
        <div class="pill">${idx+1}. ${ex.n}</div>
        <div class="btnrow">
          <button class="btn ghost" data-act="suggest" data-idx="${idx}">Gewichtsvorschlag</button>
          ${ex.t ? `<a class="btn tech" href="${ex.t}" target="_blank" rel="noopener">Technik</a>`:``}
        </div>
      </div>
      <div class="setgrid" style="margin-top:8px">
        <div class="hdr">Satz</div>
        <div class="hdr">Gewicht (kg)</div>
        <div class="hdr">Wdh.</div>
        <div class="hdr">RPE</div>
        <div class="hdr">Vorschlag</div>
        <div class="hdr">Notiz</div>
      </div>`;
    for(let s=0; s<ex.sets; s++){
      const rid=`r-${idx}-${s}`;
      html += `<div class="setgrid" data-idx="${idx}" data-set="${s}">
        <div>${s+1}</div>
        <div><input type="number" step="0.5" data-k="w" placeholder="kg" id="w-${rid}"></div>
        <div><input type="number" step="1" data-k="reps" value="${ex.reps[s]||''}" id="reps-${rid}"></div>
        <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" id="rpe-${rid}"></div>
        <div><input type="text" data-k="sugg" id="sugg-${rid}" readonly></div>
        <div><input type="text" data-k="note" id="note-${rid}" class="note" placeholder=""></div>
      </div>`;
    }
    html += `</div>`;
  });
  tabTracker.innerHTML = html;
  tabTracker.querySelectorAll('[data-act="suggest"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ fillSuggestions(+btn.dataset.idx); dirty=true; });
  });
}

function storageKey(){ return `hyrox:${workoutSel.value}:${dateEl.value}`; }

function collect(){
  const def = PRESETS[workoutSel.value];
  const day={date:dateEl.value, workout:workoutSel.value, tempo:tempoEl.value, rows:[]};
  def.forEach((ex,idx)=>{
    const sets=[];
    for(let s=0; s<ex.sets; s++){
      const g = document.querySelector(`.setgrid[data-idx='${idx}'][data-set='${s}']`);
      const get=k=>g.querySelector(`[data-k='${k}']`)?.value||'';
      sets.push({w:+get('w')||0, reps:+get('reps')||0, rpe:+get('rpe')||0, note:get('note')||''});
    }
    day.rows.push({name:ex.n, sets});
  });
  return day;
}

// saveDay(silent): if true, no toast or re-render
function saveDay(silent=true){
  localStorage.setItem(storageKey(), JSON.stringify(collect()));
  if(!silent){ toast('Gespeichert'); }
  computeKPIs();
  updateCalendarBadgesForDate(dateEl.value);
}

function onLoadDay(){
  renderTracker();
  const raw = localStorage.getItem(storageKey()); if(!raw){ computeKPIs(); return; }
  const d = JSON.parse(raw); tempoEl.value=d.tempo||tempoEl.value;
  (d.rows||[]).forEach((row,idx)=>{
    row.sets?.forEach((s,si)=>{
      const g = document.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}']`); if(!g) return;
      g.querySelector(`[data-k='w']`).value = s.w||'';
      g.querySelector(`[data-k='reps']`).value = s.reps||'';
      g.querySelector(`[data-k='rpe']`).value = s.rpe||'';
      g.querySelector(`[data-k='note']`).value = s.note||'';
    });
  });
  computeKPIs();
}

// Duplicate & Clear
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

// KPIs inkl. grobe Effective‑Reps-Schätzung
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

// Vorschlag basierend auf Historie
function lastHistoryFor(exName){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:'));
  const hist=[];
  keys.forEach(k=>{
    try{
      const d = JSON.parse(localStorage.getItem(k));
      d?.rows?.forEach(r=>{ if(r.name===exName){
        const top = Math.max(...(r.sets||[]).map(s=>+s.w||0),0);
        const topRPE = (r.sets||[]).reduce((a,s)=> Math.max(a, +s.rpe||0), 0);
        if(top>0) hist.push({date:d.date, w:top, rpe:topRPE, workout:d.workout});
      }});
    }catch(e){}
  });
  hist.sort((a,b)=> a.date.localeCompare(b.date));
  return hist;
}
function suggestWeight(exName){
  const h = lastHistoryFor(exName);
  if(h.length===0) return 0;
  const last = h[h.length-1];
  if(last.rpe<=8) return Math.round(last.w*1.025*2)/2;
  if(last.rpe>9) return Math.round(last.w*0.975*2)/2;
  return last.w;
}
function fillSuggestions(idx){
  const exName = PRESETS[workoutSel.value][idx].n;
  const s = suggestWeight(exName);
  for(let si=0; si<PRESETS[workoutSel.value][idx].sets; si++){
    const inp = document.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}'] [data-k='sugg']`);
    inp.value = s? s+' kg' : '';
    if(si===0 && s){ const w = document.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}'] [data-k='w']`); w.value=s; }
  }
  toast('Vorschläge eingefügt');
}

// Overview + Calendar
function buildOverview(){
  const cal = document.getElementById('calendar'); const label = document.getElementById('monthLabel');
  if(!cal) return;
  cal.innerHTML='';
  const base = new Date(dateEl.value||todayISO());
  let y = base.getFullYear(), m = base.getMonth();
  renderCalendar(y,m);
  // Übungsliste
  const exSel = document.getElementById('exSelect');
  if(exSel){
    const names = new Set(); Object.values(PRESETS).flat().forEach(x=>names.add(x.n));
    exSel.innerHTML = [...names].map(n=>`<option>${n}</option>`).join('');
    exSel.onchange = drawChart;
  }
  // month controls
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
function updateCalendarBadgesForDate(iso){
  if(!tabOverview.classList.contains('hidden')) buildOverview();
}
function dayCell(txt, badge){
  const d=document.createElement('div'); d.className='day'; d.textContent=txt;
  if(badge){ const b=document.createElement('span'); b.className='badge-ab'; b.textContent=badge; d.appendChild(b); d.classList.add('has'); }
  return d;
}

// Theme-aware Chart
function drawChart(){
  const exSel = document.getElementById('exSelect'); const ex = exSel?.value;
  const c = document.getElementById('chart'); if(!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const colMuted = cssVar('--muted') || '#94a3b8';
  const colBorder = cssVar('--border') || '#1f2937';
  const colPrimary = cssVar('--primary') || '#7a5cff';
  const colAccent = cssVar('--accent') || '#0dd3b8';

  if(!ex){ ctx.fillStyle=colMuted; ctx.fillText('Keine Daten.', 20, 20); return; }
  const hist = lastHistoryFor(ex);
  const xs = hist.map(h=>h.date); const ys = hist.map(h=>h.w);
  const sugg = hist.map(h=> (h.rpe<=8? Math.round(h.w*1.025*2)/2 : (h.rpe>9? Math.round(h.w*0.975*2)/2 : h.w)) );
  const pad={l:42,r:10,t:10,b:28}, w=c.width-pad.l-pad.r, h=c.height-pad.t-pad.b;
  ctx.fillStyle = colMuted; ctx.font='12px system-ui';
  if(ys.length===0){ ctx.fillText('Keine Daten vorhanden.', pad.l, pad.t+20); return; }
  const ymin = Math.min(...ys)*0.9, ymax = Math.max(...ys, ...(sugg.length? [Math.max(...sugg)] : [0]))*1.1;
  const xstep = w/Math.max(1, ys.length-1);
  const toX = i=> pad.l + i*xstep;
  const toY = v=> pad.t + h - ((v - ymin)/(ymax - ymin))*h;
  // axes
  ctx.strokeStyle=colBorder; ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+h); ctx.lineTo(pad.l+w,pad.t+h); ctx.stroke();
  // y ticks
  ctx.textAlign='right';
  for(let i=0;i<=4;i++){ const v=ymin + i*(ymax-ymin)/4; const y=toY(v); ctx.fillText(v.toFixed(0), pad.l-6, y+4); ctx.strokeStyle=colBorder; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.stroke(); }
  // primary line
  ctx.strokeStyle=colPrimary; ctx.lineWidth=2; ctx.beginPath();
  ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  ctx.fillStyle=colAccent; ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
  // suggestion line
  if(sugg.length){ ctx.strokeStyle=colAccent; ctx.setLineDash([4,4]); ctx.beginPath(); sugg.forEach((v,i)=>{ const x=toX(i), y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); ctx.setLineDash([]); }
  // x labels
  ctx.textAlign='center'; ctx.fillStyle=colMuted; xs.forEach((d,i)=>{ const x=toX(i); ctx.fillText(d.slice(5), x, pad.t+h+16); });
}

// CSV export
function onExportCSV(){
  const keys = Object.keys(localStorage).filter(k=>k.startsWith('hyrox:')).sort();
  const rows = ["Datum;Workout;Tempo;Übung;Satz;Gewicht;Wdh.;RPE;Notiz"];
  keys.forEach(k=>{
    const d = JSON.parse(localStorage.getItem(k)||'{}');
    (d.rows||[]).forEach(r=>{
      (r.sets||[]).forEach((s,si)=>{
        rows.push([d.date,d.workout,d.tempo,r.name,si+1,s.w||'',s.reps||'',s.rpe||'', (s.note||'').replaceAll(';',',')].join(';'));
      });
    });
  });
  const blob = new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='hyrox_training_export.csv'; a.click(); URL.revokeObjectURL(a.href);
}

// JSON import
async function onImportJSON(e){
  const file = e.target.files?.[0]; if(!file) return;
  try{
    const txt = await file.text();
    const data = JSON.parse(txt);
    let count = 0;
    Object.keys(data).forEach(k=>{
      if(k.startsWith('hyrox:')){ localStorage.setItem(k, JSON.stringify(data[k])); count++; }
    });
    toast(`Import OK (${count} Einträge)`);
    buildOverview(); drawChart(); onLoadDay(); computeKPIs();
  }catch(err){
    alert('Import fehlgeschlagen: ' + err.message);
  }finally{
    e.target.value = "";
  }
}

// Helpers
function toast(msg){
  const f=document.createElement('div'); f.className='flash'; f.textContent=msg; document.body.appendChild(f);
  setTimeout(()=>f.remove(), 1400);
}

})(); // end IIFE
