// ===== AthlētX HYROX Tracker – Mobile‑first =====

// Presets
const PRESETS = {
  A:[
    {n:"Front Squat / Hack Squat", sets:3, reps:[4,4,4]},
    {n:"Kreuzheben (konventionell)", sets:3, reps:[4,4,4]},
    {n:"Bankdrücken (schwer)", sets:3, reps:[5,5,5]},
    {n:"Bulgarian Split Squat (pro Bein)", sets:2, reps:[8,8]},
    {n:"Beinbeuger / Glute Drive", sets:2, reps:[10,10]},
    {n:"Brustfliegende (Kabel/Maschine)", sets:2, reps:[10,10]},
    {n:"Rückenstrecker", sets:2, reps:[12,12]},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20]}
  ],
  B:[
    {n:"Bankdrücken (leicht/mittelschwer)", sets:3, reps:[8,8,8]},
    {n:"Kreuzheben (Volumen/Technik)", sets:3, reps:[6,6,6]},
    {n:"Kniebeugen (Maschine/LH)", sets:3, reps:[6,6,6]},
    {n:"Latzug (neutraler Griff)", sets:3, reps:[6,6,6]},
    {n:"Kabelrudern (enger Griff)", sets:2, reps:[10,10]},
    {n:"Schulterdrücken (Maschine/KH)", sets:3, reps:[6,6,6]},
    {n:"Seitheben (Kabel/KH)", sets:2, reps:[12,12]},
    {n:"Russian Twists (gesamt)", sets:2, reps:[20,20]}
  ]
};

// Shortcuts
const $ = s=>document.querySelector(s);
const todayISO = ()=>new Date().toISOString().slice(0,10);

// Elements
const dateEl = $('#date');
const workoutSel = $('#workoutSel');
const tempoEl = $('#tempo');
const tabTracker = $('#tab-tracker');
const tabOverview = $('#tab-overview');
const monthLabel = $('#monthLabel');

// Init
dateEl.value = todayISO();
renderTracker(); loadDay(); computeKPIs(); buildOverview(); drawChart();
bindTabs(); bindControls();

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
  $('#save').onclick = save;
  $('#export').onclick = exportCSV;
  $('#duplicate').onclick = duplicateNextDay;
  $('#clear').onclick = clearDay;
  dateEl.addEventListener('change', ()=>{ loadDay(); computeKPIs(); buildOverview(); });
  workoutSel.addEventListener('change', ()=>{ renderTracker(); loadDay(); computeKPIs(); });
  document.addEventListener('input', e=>{ if(e.target.matches('input,select')) computeKPIs(); });
  $('#prevMonth').onclick = ()=>shiftMonth(-1);
  $('#nextMonth').onclick = ()=>shiftMonth(1);
}

// Tracker Rendering (per‑Satz Eingaben + Vorschläge)
function renderTracker(){
  const def = PRESETS[workoutSel.value];
  let html='';
  def.forEach((ex,idx)=>{
    html += `<div class="card">
      <div class="exercise-head">
        <div class="pill">${idx+1}. ${ex.n}</div>
        <button class="btn ghost" onclick="fillSuggestions(${idx})">Gewichtsvorschlag</button>
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

function save(){ localStorage.setItem(storageKey(), JSON.stringify(collect())); computeKPIs(); toast('Gespeichert'); buildOverview(); }
function loadDay(){
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

function duplicateNextDay(){
  const d = new Date(dateEl.value||todayISO()); d.setDate(d.getDate()+1);
  const next = d.toISOString().slice(0,10);
  const currentData = collect(); currentData.date = next;
  localStorage.setItem(`hyrox:${workoutSel.value}:${next}`, JSON.stringify(currentData));
  dateEl.value = next; loadDay(); toast('Auf nächsten Tag dupliziert');
}

function clearDay(){ localStorage.removeItem(storageKey()); renderTracker(); computeKPIs(); toast('Eintrag gelöscht'); buildOverview(); }

// KPIs inkl. grobe Effective‑Reps‑Schätzung
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
        if(top>0) hist.push({date:d.date, w:top, rpe:topRPE});
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

// Übersicht
let calYear, calMonth;
function buildOverview(){
  const ref = new Date(dateEl.value||todayISO());
  calYear = ref.getFullYear(); calMonth = ref.getMonth();
  renderCalendar(calYear, calMonth);
  buildExerciseOptions();
}
function shiftMonth(delta){
  calMonth += delta;
  while(calMonth<0){calMonth+=12; calYear--;}
  while(calMonth>11){calMonth-=12; calYear++;}
  renderCalendar(calYear, calMonth);
  drawChart();
}
function renderCalendar(y,m){
  const cal = $('#calendar'); cal.innerHTML='';
  const monthNames = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  monthLabel.textContent = monthNames[m]+' '+y;
  const first = new Date(y,m,1); const startW=(first.getDay()+6)%7; // Mo=0
  const days = new Date(y,m+1,0).getDate();
  for(let i=0;i<startW;i++){ const p=document.createElement('div'); p.className='day'; p.style.opacity=.35; cal.appendChild(p); }
  for(let d=1; d<=days; d++){
    const iso = new Date(y,m,d).toISOString().slice(0,10);
    const has = Object.keys(localStorage).some(k=>k.includes(':'+iso));
    const el = document.createElement('div'); el.className='day'+(has?' has':''); el.textContent=d;
    if(iso===dateEl.value) el.classList.add('active');
    el.onclick = ()=>{ dateEl.value=iso; loadDay(); computeKPIs(); drawChart(); document.querySelectorAll('.day').forEach(x=>x.classList.remove('active')); el.classList.add('active'); };
    cal.appendChild(el);
  }
}
function buildExerciseOptions(){
  const exSel = $('#exSelect'); const names=new Set();
  Object.values(PRESETS).flat().forEach(x=>names.add(x.n));
  exSel.innerHTML = [...names].map(n=>`<option>${n}</option>`).join('');
  exSel.onchange = drawChart;
}
function drawChart(){
  const ex = $('#exSelect').value;
  const c = $('#chart'); const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const hist = lastHistoryFor(ex);
  const xs = hist.map(h=>h.date); const ys = hist.map(h=>h.w);
  // Generate suggestions line from history (+2.5% if last RPE<=8 else hold / -2.5% if >9)
  const sugg = hist.map(h=>{
    if(h.rpe<=8) return Math.round(h.w*1.025*2)/2;
    if(h.rpe>9) return Math.round(h.w*0.975*2)/2;
    return h.w;
  });
  const pad={l:42,r:10,t:10,b:28}, w=c.width-pad.l-pad.r, h=c.height-pad.t-pad.b;
  ctx.fillStyle='#94a3b8'; ctx.font='12px system-ui';
  if(ys.length===0){ ctx.fillText('Keine Daten vorhanden.', pad.l, pad.t+20); return; }
  const ymin = Math.min(...ys)*0.9, ymax = Math.max(...ys, ...(sugg.length? [Math.max(...sugg)] : [0]))*1.1;
  const xstep = w/Math.max(1, ys.length-1);
  const toX = i=> pad.l + i*xstep;
  const toY = v=> pad.t + h - ((v - ymin)/(ymax - ymin))*h;
  // axes
  ctx.strokeStyle='#1f2937'; ctx.beginPath(); ctx.moveTo(pad.l,pad.t); ctx.lineTo(pad.l,pad.t+h); ctx.lineTo(pad.l+w,pad.t+h); ctx.stroke();
  // y ticks
  ctx.textAlign='right';
  for(let i=0;i<=4;i++){ const v=ymin + i*(ymax-ymin)/4; const y=toY(v); ctx.fillText(v.toFixed(0), pad.l-6, y+4); ctx.strokeStyle='#1f2937'; ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(pad.l+w,y); ctx.stroke(); }
  // primary line
  ctx.strokeStyle='#7a5cff'; ctx.lineWidth=2; ctx.beginPath();
  ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  ctx.fillStyle='#0dd3b8'; ys.forEach((v,i)=>{ const x=toX(i), y=toY(v); ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); });
  // suggestion line
  if(sugg.length){ ctx.strokeStyle='#0dd3b8'; ctx.setLineDash([4,4]); ctx.beginPath(); sugg.forEach((v,i)=>{ const x=toX(i), y=toY(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke(); ctx.setLineDash([]); }
  // x labels
  ctx.textAlign='center'; ctx.fillStyle='#94a3b8'; xs.forEach((d,i)=>{ const x=toX(i); ctx.fillText(d.slice(5), x, pad.t+h+16); });
}

// CSV export
function exportCSV(){
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

// Helpers
function toast(msg){
  const f=document.createElement('div'); f.className='flash'; f.textContent=msg; document.body.appendChild(f);
  setTimeout(()=>f.remove(), 1400);
}
