// ===== AthlētX HYROX Tracker – v5.2 (PWA + Multi-Chart + Recap) =====
(() => {
// Presets & Bibliothek
const EXERCISE_LIBRARY = [
  "Kniebeugen",
  "Kreuzheben",
  "Bankdrücken",
  "Bulgarian Split Squat (pro Bein)",
  "Beinbeuger / Glute Drive",
  "Brustfliegende (Kabel/Maschine)",
  "Rückenstrecker",
  "Russian Twists (gesamt)",
  "Latzug (neutraler Griff)",
  "Kabelrudern (enger Griff)",
  "Schulterdrücken (Maschine/KH)",
  "Seitheben (Kabel/KH)",
  "Hip Thrust",
  "Ausfallschritte",
  "Overhead Press",
  "Bicep Curls",
  "Trizepsdrücken (Seil)",
  "Rudern vorgebeugt",
  "Klimmzüge",
  "Beinpresse",
  "Leg Curl",
  "Wadenheben",
  "Face Pulls",
  "Core Rotation",
  "Farmer's Carry",
  "Sandbag Lunges",
  "Burpee Broad Jumps",
  "SkiErg 1000 m",
  "RowErg 1000 m",
  "Air Bike",
  "Schlitten Push",
  "Schlitten Pull",
  "Wall Balls",
  "Kettlebell Swings",
  "Box Jumps",
  "Hand Release Push-Ups",
  "Plank Hold",
  "Side Plank",
  "Sit-ups",
  "Mountain Climbers",
  "Lunges (Bodyweight)",
  "Jumping Lunges",
  "Sprint Intervalls",
  "Double Unders",
  "Battle Ropes",
  "Bear Crawl"
];

const EXERCISE_RENAME_MAP = {
  "Bankdrücken (schwer)": "Bankdrücken",
  "Bankdrücken (leicht/mittelschwer)": "Bankdrücken",
  "Kreuzheben (konventionell)": "Kreuzheben",
  "Kreuzheben (Volumen/Technik)": "Kreuzheben",
  "Front Squat / Hack Squat": "Kniebeugen",
  "Kniebeugen (Maschine/LH)": "Kniebeugen"
};

function normalizeExerciseName(name){
  const trimmed = (name || '').trim();
  return EXERCISE_RENAME_MAP[trimmed] || trimmed;
}

const MUSCLE_GROUP_MAP = {
  "Bankdrücken":                        "Brust",
  "Schrägbank KH Drücken":              "Brust",
  "Brustfliegende (Kabel/Maschine)":    "Brust",
  "Brustpresse Maschine":               "Brust",
  "Latzug (neutraler Griff)":           "Rücken",
  "Lat Pulldown breiter Griff":         "Rücken",
  "Lat Pulldown enger Griff":           "Rücken",
  "Kabelrudern (enger Griff)":          "Rücken",
  "Rudern Maschine":                    "Rücken",
  "Rückenstrecker":                     "Rücken",
  "Kreuzheben":                         "Rücken",
  "Reverse Pec Deck":                   "Schultern",
  "Schulterdrücken (Maschine/KH)":      "Schultern",
  "Schulterdrücken Maschine":           "Schultern",
  "Seitheben (Kabel/KH)":               "Schultern",
  "Seitheben sitzend":                  "Schultern",
  "Seitheben einarmig Kabel":           "Schultern",
  "Face Pulls Kabel sitzend":           "Schultern",
  "Bizeps Curl SZ-Stange":              "Bizeps",
  "Hammer Curl sitzend":                "Bizeps",
  "Trizeps Pushdown Kabel":             "Trizeps",
  "Kniebeugen":                         "Beine",
  "Beinstrecker Maschine":              "Beine",
  "Beinstrecker einbeinig":             "Beine",
  "Abduktoren Maschine":                "Beine",
  "Adduktoren Maschine":                "Beine",
  "Bulgarian Split Squat (pro Bein)":   "Beine",
  "Beincurl liegend Maschine":          "Hamstrings",
  "Beinbeuger / Glute Drive":           "Hamstrings",
  "Hip Thrust Maschine":                "Gesäss",
  "Glute Kickback Kabel":               "Gesäss",
  "Cable Crunch kniend":                "Bauch",
  "Russian Twists (gesamt)":            "Bauch",
};

function epley(w, r){
  if(!w || !r || r <= 1) return w || 0;
  return Math.round(w * (1 + r / 30));
}

function getAllTimePR(exerciseName){
  let best = null;
  allSessionsArray().forEach(session => {
    const row = (session.rows || []).find(r => r.name === exerciseName);
    if(!row) return;
    (row.sets || []).forEach(s => {
      const w = +s.w || 0;
      if(w > 0 && (!best || w > best.weight)){
        best = {weight: w, reps: +s.reps || 0, date: session.date};
      }
    });
  });
  return best;
}

function computeStreak(){
  const sessionDates = new Set(allSessionsArray().map(s => s.date).filter(Boolean));
  if(!sessionDates.size) return 0;
  const getWeekKey = iso => {
    const d = new Date(iso + 'T00:00:00');
    const day = (d.getDay() + 6) % 7;
    const mon = new Date(d); mon.setDate(d.getDate() - day);
    return toLocalISO(mon);
  };
  const weeks = new Set([...sessionDates].map(getWeekKey));
  const sorted = [...weeks].sort().reverse();
  const todayWeek = getWeekKey(todayISO());
  let streak = 0;
  let expected = todayWeek;
  for(const w of sorted){
    if(w === expected){
      streak++;
      const d = new Date(expected + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      expected = toLocalISO(d);
    } else { break; }
  }
  return streak;
}

function getLastSameWorkoutSession(workoutId, currentDate){
  const sessions = allSessionsArray()
    .filter(s => s.workout === workoutId && s.date && s.date !== currentDate)
    .sort((a, b) => b.date.localeCompare(a.date));
  if(!sessions.length) return null;
  const last = sessions[0];
  let volume = 0;
  (last.rows || []).forEach(row => {
    (row.sets || []).forEach(s => { volume += (+s.w || 0) * (+s.reps || 0); });
  });
  return {date: last.date, volume};
}

function checkPlateau(exerciseName, workoutId){
  const sessions = allSessionsArray()
    .filter(s => s.workout === workoutId && s.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const relevant = [];
  for(const sess of sessions){
    const row = (sess.rows || []).find(r => r.name === exerciseName);
    if(row && row.sets && row.sets.length){
      const topW = Math.max(...row.sets.map(s => +s.w || 0));
      const avgRPE = row.sets.reduce((acc, s) => acc + (+s.rpe || 0), 0) / row.sets.length;
      if(topW > 0) relevant.push({topW, avgRPE});
    }
    if(relevant.length >= 3) break;
  }
  if(relevant.length < 3) return null;
  const weights = relevant.map(r => r.topW);
  if(weights[0] === weights[1] && weights[1] === weights[2]) return 'plateau';
  if(relevant[0].avgRPE > 0 && relevant[0].avgRPE <= 6) return 'ready';
  return null;
}

function computeMuscleVolume(rangeId){
  const bounds = getRangeBounds(rangeId);
  const groups = {};
  allSessionsArray().forEach(session => {
    if(!inBounds(session.date, bounds)) return;
    (session.rows || []).forEach(row => {
      const muscle = MUSCLE_GROUP_MAP[row.name];
      if(!muscle) return;
      const sets = (row.sets || []).filter(s => (+s.w || 0) > 0 || (+s.reps || 0) > 0).length || row.sets?.length || 0;
      groups[muscle] = (groups[muscle] || 0) + sets;
    });
  });
  return groups;
}

function buildPRList(){
  const el = document.getElementById('prList');
  if(!el) return;
  const names = new Set();
  (workoutsState.order || []).forEach(id => {
    getWorkoutExercises(id).forEach(x => names.add(x.name));
  });
  const prs = [...names].map(name => {
    const pr = getAllTimePR(name);
    if(!pr) return null;
    return {name, ...pr, orm: epley(pr.weight, pr.reps)};
  }).filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, 10);
  if(!prs.length){
    el.innerHTML = '<div class="pr-empty">Noch keine Daten. Starte dein erstes Training!</div>';
    return;
  }
  const fmt = new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'2-digit'});
  el.innerHTML = `<table class="pr-table">
    <thead><tr><th>Übung</th><th>Gewicht</th><th>Wdh.</th><th>Est. 1RM</th><th>Datum</th></tr></thead>
    <tbody>${prs.map(p => `<tr>
      <td>${escapeHtml(p.name)}</td>
      <td><strong>${p.weight} kg</strong></td>
      <td>${p.reps}</td>
      <td class="orm">${p.orm} kg</td>
      <td class="pr-date">${fmt.format(new Date(p.date + 'T00:00:00'))}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function drawMuscleChart(){
  const c = document.getElementById('muscleChart');
  const sel = document.getElementById('muscleRange');
  if(!c) return;
  const ctx = c.getContext('2d');
  const rangeId = sel ? sel.value : '4w';
  const data = computeMuscleVolume(rangeId);
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  ctx.clearRect(0, 0, c.width, c.height);
  if(!entries.length){
    ctx.fillStyle = cssVar('--muted'); ctx.font = '13px system-ui';
    ctx.fillText('Noch keine Trainingsdaten.', 12, 30); return;
  }
  const pad = {l: 90, r: 16, t: 12, b: 16};
  const w = c.width - pad.l - pad.r;
  const barH = Math.min(28, (c.height - pad.t - pad.b) / entries.length - 4);
  const maxVal = entries[0][1];
  const colors = ['--c1','--c2','--c3','--c4','--c5','--c6'].map(cssVar);
  entries.forEach(([muscle, sets], i) => {
    const y = pad.t + i * (barH + 6);
    const bw = maxVal > 0 ? (sets / maxVal) * w : 0;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(pad.l, y, bw, barH, 3);
    else ctx.rect(pad.l, y, bw, barH);
    ctx.fill();
    ctx.fillStyle = cssVar('--fg');
    ctx.font = '12px system-ui'; ctx.textAlign = 'right';
    ctx.fillText(muscle, pad.l - 6, y + barH - 4);
    ctx.textAlign = 'left';
    ctx.fillStyle = cssVar('--muted');
    ctx.fillText(sets + ' Sätze', pad.l + bw + 4, y + barH - 4);
  });
}

const DEFAULT_WORKOUTS = {
  version: 1,
  order: ['A','B','HA','HB','HC'],
  map: {
    A: {
      id: 'A',
      label: 'Training A',
      name: 'Workout A',
      exercises: [
        {name:"Kniebeugen", sets:3, reps:[4,4,4], technique:"https://modusx.de/fitness-uebungen/kniebeuge/"},
        {name:"Kreuzheben", sets:3, reps:[4,4,4], technique:"https://modusx.de/fitness-uebungen/klassisches-kreuzheben/"},
        {name:"Bankdrücken", sets:3, reps:[5,5,5], technique:"https://modusx.de/fitness-uebungen/bankdruecken/"},
        {name:"Bulgarian Split Squat (pro Bein)", sets:2, reps:[8,8], technique:"https://modusx.de/fitness-uebungen/bulgarian-split-squat/"},
        {name:"Beinbeuger / Glute Drive", sets:2, reps:[10,10], technique:"https://modusx.de/fitness-uebungen/hip-thrust/"},
        {name:"Brustfliegende (Kabel/Maschine)", sets:2, reps:[10,10], technique:"https://modusx.de/fitness-uebungen/butterfly-an-maschine/"},
        {name:"Rückenstrecker", sets:2, reps:[12,12], technique:"https://modusx.de/fitness-uebungen/rueckenstrecken-am-geraet/rueckenstrecken-an-der-rueckenstrecker-maschine/"},
        {name:"Russian Twists (gesamt)", sets:2, reps:[20,20], technique:"https://modusx.de/fitness-uebungen/russian-twist/"}
      ]
    },
    B: {
      id: 'B',
      label: 'Training B',
      name: 'Workout B',
      exercises: [
        {name:"Bankdrücken", sets:3, reps:[8,8,8], technique:"https://modusx.de/fitness-uebungen/bankdruecken/"},
        {name:"Kreuzheben", sets:3, reps:[6,6,6], technique:"https://modusx.de/fitness-uebungen/klassisches-kreuzheben/"},
        {name:"Kniebeugen", sets:3, reps:[6,6,6], technique:"https://modusx.de/fitness-uebungen/kniebeuge/"},
        {name:"Latzug (neutraler Griff)", sets:3, reps:[6,6,6], technique:"https://modusx.de/fitness-uebungen/latzug/"},
        {name:"Kabelrudern (enger Griff)", sets:2, reps:[10,10], technique:"https://modusx.de/fitness-uebungen/kabelrudern/"},
        {name:"Schulterdrücken (Maschine/KH)", sets:3, reps:[6,6,6], technique:"https://modusx.de/fitness-uebungen/schulterdruecken/"},
        {name:"Seitheben (Kabel/KH)", sets:2, reps:[12,12], technique:"https://modusx.de/fitness-uebungen/seitheben/"},
        {name:"Russian Twists (gesamt)", sets:2, reps:[20,20], technique:"https://modusx.de/fitness-uebungen/russian-twist/"}
      ]
    },
    HA: {
      id: 'HA',
      label: 'Hypertrophie A – Push',
      name: 'Hypertrophie A – Push',
      exercises: [
        {name:"Bankdrücken", sets:4, reps:[8,8,8,8], technique:"https://modusx.de/fitness-uebungen/bankdruecken/"},
        {name:"Schrägbank KH Drücken", sets:3, reps:[10,10,10], technique:""},
        {name:"Schulterdrücken Maschine", sets:3, reps:[10,10,10], technique:"https://modusx.de/fitness-uebungen/schulterdruecken/"},
        {name:"Seitheben sitzend", sets:3, reps:[12,12,12], technique:"https://modusx.de/fitness-uebungen/seitheben/"},
        {name:"Trizeps Pushdown Kabel", sets:3, reps:[12,12,12], technique:""},
        {name:"Beinstrecker Maschine", sets:3, reps:[10,10,10], technique:""},
        {name:"Cable Crunch kniend", sets:3, reps:[12,12,12], technique:""}
      ]
    },
    HB: {
      id: 'HB',
      label: 'Hypertrophie B – Pull',
      name: 'Hypertrophie B – Pull',
      exercises: [
        {name:"Lat Pulldown breiter Griff", sets:4, reps:[8,8,8,8], technique:"https://modusx.de/fitness-uebungen/latzug/"},
        {name:"Rudern Maschine", sets:3, reps:[10,10,10], technique:""},
        {name:"Reverse Pec Deck", sets:3, reps:[12,12,12], technique:""},
        {name:"Face Pulls Kabel sitzend", sets:3, reps:[12,12,12], technique:""},
        {name:"Bizeps Curl SZ-Stange", sets:3, reps:[10,10,10], technique:""},
        {name:"Hammer Curl sitzend", sets:3, reps:[12,12,12], technique:""},
        {name:"Beincurl liegend Maschine", sets:3, reps:[10,10,10], technique:""},
        {name:"Cable Crunch kniend", sets:3, reps:[12,12,12], technique:""}
      ]
    },
    HC: {
      id: 'HC',
      label: 'Hypertrophie C – Glutes',
      name: 'Hypertrophie C – Glutes',
      exercises: [
        {name:"Hip Thrust Maschine", sets:4, reps:[8,8,8,8], technique:"https://modusx.de/fitness-uebungen/hip-thrust/"},
        {name:"Glute Kickback Kabel", sets:3, reps:[12,12,12], technique:""},
        {name:"Abduktoren Maschine", sets:3, reps:[12,12,12], technique:""},
        {name:"Adduktoren Maschine", sets:3, reps:[12,12,12], technique:""},
        {name:"Beinstrecker einbeinig", sets:3, reps:[10,10,10], technique:""},
        {name:"Brustpresse Maschine", sets:3, reps:[10,10,10], technique:""},
        {name:"Lat Pulldown enger Griff", sets:3, reps:[10,10,10], technique:"https://modusx.de/fitness-uebungen/latzug/"},
        {name:"Seitheben einarmig Kabel", sets:3, reps:[12,12,12], technique:"https://modusx.de/fitness-uebungen/seitheben/"}
      ]
    }
  }
};

// Helpers
const $ = s=>document.querySelector(s);
const toLocalISO = (date)=>{
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset*60000);
  return local.toISOString().slice(0,10);
};
const todayISO = ()=>toLocalISO(new Date());
const escapeHtml = (str='')=>String(str).replace(/[&<>"']/g,c=>({
  '&':'&amp;',
  '<':'&lt;',
  '>':'&gt;',
  '"':'&quot;',
  "'":'&#39;'
}[c]||c));
const cssVar = (name)=>getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#94a3b8';

// Elements
const dateEl = $('#date');
const workoutSel = $('#workoutSel');
const tabTracker = $('#tab-tracker');
const tabOverview = $('#tab-overview');
const tabActivities = $('#tab-activities');
const tabWorkouts = $('#tab-workouts');
const calendarWeekdays = $('#calendarWeekdays');
const themeToggle = $('#themeToggle');
const timerBtn = $('#timerBtn');
const totalTimerBtn = $('#totalTimerBtn');
const importBtn = $('#importCsv');
const importInput = $('#importCsvFile');
const statRangeSel = $('#statRange');
const addWorkoutBtn = $('#addWorkout');
const workoutManager = $('#workoutManager');
const exerciseLibraryEl = $('#exerciseLibrary');
const activityDetail = $('#activityDetail');
const activityDetailBody = $('#activityDetailBody');
const syncCodeDisplay = $('#syncCodeDisplay');
const syncCopyBtn = $('#syncCopy');
const syncApplyBtn = $('#syncApply');
const syncInput = $('#syncInput');
const syncCreateBtn = $('#syncCreate');
const syncStatusEl = $('#syncStatus');
const syncRefreshBtn = $('#syncRefresh');

const STORAGE_PREFIX = 'hyrox:';
const WORKOUTS_CONFIG_KEY = `${STORAGE_PREFIX}cfg:workouts`;
const SYNC_ID_KEY = 'athletx:sync:id';
const SYNC_CACHE_KEY = 'athletx:sync:cache';
const SESSION_TIMER_KEY = 'athletx:timer:start';
const TOTAL_TIMER_KEY = 'athletx:timer:total';

let exerciseLibraryOptions = [];
let statSelectedExercises = new Set();
let exercisePickerEl = null;
let exercisePickerVisible = false;
let exercisePickerActiveInput = null;
let exercisePickerFiltered = [];
let exercisePickerHighlight = -1;
let exercisePickerCloseTimer = null;

// ===== JSONBin Konfiguration (statt npoint) =====
// 1) JSONBin.io → Dashboard → API Keys → Master-Key kopieren (Klartext, KEIN $2a$… Hash)
// 2) Unten einfügen:
const JSONBIN_BASE = 'https://api.jsonbin.io/v3';
const JSONBIN_KEY  = '$2a$10$zd7toqqB2tT/1fHOPkM8eOKakeLywuyIyz3ME7usDeOYBeIjXba6a'; // <<< deinen echten Key einsetzen
const BIN_HEADERS = {
  'Content-Type': 'application/json',
  'X-Master-Key': JSONBIN_KEY,
};

let syncId = localStorage.getItem(SYNC_ID_KEY) || '';
let remoteData = loadCachedRemoteData();
let remoteSaveTimer = null;
let remoteSaving = false;
let remoteSavePending = false;

migrateCachedSessions();

let workoutsState = normalizeWorkouts(loadWorkoutsConfig());
let activeDetailKey = null;
let activeDetailState = null;

function loadWorkoutsConfig(){
  const stored = getConfigRecord(WORKOUTS_CONFIG_KEY);
  if(stored && stored.map){ return stored; }
  return DEFAULT_WORKOUTS;
}

function normalizeWorkouts(raw){
  const base = raw && typeof raw==='object' ? raw : {};
  const resultOrder = [];
  const resultMap = {};
  const seen = new Set();
  const sourceOrder = Array.isArray(base.order) && base.order.length ? base.order.slice() : DEFAULT_WORKOUTS.order.slice();
  const appendWorkout = (id, data)=>{
    if(!data) return;
    const normalized = {
      id: data.id || id,
      label: (data.label || data.name || `Workout ${id}`).trim() || `Workout ${id}`,
      name: (data.name || data.label || `Workout ${id}`).trim() || `Workout ${id}`,
      exercises: normalizeExercises(data.exercises)
    };
    const key = normalized.id;
    if(seen.has(key)) return;
    seen.add(key);
    resultMap[key] = normalized;
    resultOrder.push(key);
  };
  sourceOrder.forEach(id=>{ appendWorkout(id, base.map?.[id] || DEFAULT_WORKOUTS.map[id]); });
  Object.keys(base.map||{}).forEach(id=>{ appendWorkout(id, base.map[id]); });
  DEFAULT_WORKOUTS.order.forEach(id=>{ if(!seen.has(id)){ appendWorkout(id, DEFAULT_WORKOUTS.map[id]); } });
  return { version:1, order: resultOrder, map: resultMap };
}

function normalizeExercises(arr){
  const list = Array.isArray(arr)? arr : [];
  return list.map(ex=>{
    const repsArray = toRepArray(ex?.reps);
    return {
      name: normalizeExerciseName(ex?.name || ex?.n || ''),
      sets: normalizeSets(ex?.sets, repsArray.length),
      reps: repsArray,
      technique: (ex?.technique || ex?.t || '').trim()
    };
  });
}

function normalizeSessionData(session){
  if(!session || typeof session!=="object") return session;
  const base = {...session};
  const rows = Array.isArray(session.rows)? session.rows : [];
  const merged = [];
  const seen = new Map();
  rows.forEach(row=>{
    if(!row) return;
    const name = normalizeExerciseName(row.name || '');
    if(!name) return;
    const sets = Array.isArray(row.sets)? row.sets.map(set=>{
      const w = Number(set?.w);
      const reps = Number(set?.reps);
      const rpe = Number(set?.rpe);
      return {
        w: Number.isFinite(w)? w : 0,
        reps: Number.isFinite(reps)? reps : 0,
        rpe: Number.isFinite(rpe)? rpe : 0
      };
    }) : [];
    if(!seen.has(name)){
      const copy = { name, sets: sets.slice() };
      merged.push(copy);
      seen.set(name, copy);
    }else{
      seen.get(name).sets.push(...sets);
    }
  });
  base.rows = merged;
  return base;
}

function rowsSignature(rows){
  return JSON.stringify((rows||[]).map(row=>({
    name: normalizeExerciseName(row?.name || ''),
    sets: (row?.sets||[]).map(set=>({
      w: Number.isFinite(Number(set?.w))? Number(set?.w) : 0,
      reps: Number.isFinite(Number(set?.reps))? Number(set?.reps) : 0,
      rpe: Number.isFinite(Number(set?.rpe))? Number(set?.rpe) : 0
    }))
  })));
}

function migrateCachedSessions(){
  let changed = false;
  Object.entries(remoteData||{}).forEach(([key, record])=>{
    if(!isTrainingKey(key) || !record || record.deletedAt) return;
    const normalized = normalizeSessionData(record);
    if(rowsSignature(record.rows) !== rowsSignature(normalized.rows)){
      const preserved = {...normalized};
      if(record.updatedAt) preserved.updatedAt = record.updatedAt;
      if(record.createdAt) preserved.createdAt = record.createdAt;
      if(record.deletedAt) preserved.deletedAt = record.deletedAt;
      remoteData[key] = preserved;
      try{ localStorage.setItem(key, JSON.stringify(preserved)); }catch(e){}
      changed = true;
    }
  });
  if(changed){
    persistRemoteCache();
    scheduleRemoteSave();
  }
}

function toRepArray(value){
  if(Array.isArray(value)){ return value.map(v=>parseInt(v,10)).filter(v=>!isNaN(v)); }
  if(typeof value==='number'){ return [Math.round(value)]; }
  if(typeof value==='string'){ return value.split(/[,;\s]+/).map(v=>parseInt(v.trim(),10)).filter(v=>!isNaN(v)); }
  return [];
}

function normalizeSets(sets, repsLen){
  const parsed = parseInt(sets,10);
  if(!isNaN(parsed) && parsed>0){ return parsed; }
  if(repsLen>0){ return repsLen; }
  return 3;
}

function serializeWorkouts(state){
  const payload={ version:1, order:[], map:{} };
  (state?.order||[]).forEach(id=>{
    const workout = state?.map?.[id];
    if(!workout) return;
    payload.order.push(id);
    payload.map[id] = {
      id: workout.id,
      label: workout.label,
      name: workout.name,
      exercises: (workout.exercises||[]).map(ex=>({
        name: normalizeExerciseName(ex.name),
        sets: ex.sets,
        reps: Array.isArray(ex.reps)? ex.reps.slice() : [],
        technique: ex.technique||''
      }))
    };
  });
  return payload;
}

function getWorkout(id){
  if(!id) return null;
  return workoutsState.map?.[id] || null;
}

function getWorkoutExercises(id){
  return getWorkout(id)?.exercises || [];
}

function ensureWorkoutSelection(){
  if(!workoutSel) return;
  if(!getWorkout(workoutSel.value)){
    workoutSel.value = workoutsState.order[0] || '';
  }
}

function renderWorkoutSelector(){
  if(!workoutSel) return;
  const prev = workoutSel.value;
  workoutSel.innerHTML = (workoutsState.order||[]).map(id=>{
    const workout = workoutsState.map?.[id];
    const label = workout?.label || `Workout ${id}`;
    return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
  }).join('');
  if(prev && getWorkout(prev)){ workoutSel.value = prev; }
  else{ ensureWorkoutSelection(); }
}

function renderExerciseLibrary(){
  if(!exerciseLibraryEl) return;
  const names = new Set();
  const addName = name=>{
    const normalized = normalizeExerciseName(name);
    if(normalized) names.add(normalized);
  };
  EXERCISE_LIBRARY.forEach(addName);
  (workoutsState.order||[]).forEach(id=>{
    getWorkoutExercises(id).forEach(ex=>{ if(ex.name) addName(ex.name); });
  });
  sessionEntries().forEach(({data})=>{
    (data?.rows||[]).forEach(row=>{ if(row?.name) addName(row.name); });
  });
  const sorted=[...names].filter(Boolean).sort((a,b)=>a.localeCompare(b,'de',{sensitivity:'base'}));
  exerciseLibraryEl.innerHTML = sorted.map(name=>`<option value="${escapeHtml(name)}"></option>`).join('');
}

function saveWorkoutsState(){
  const serialized = serializeWorkouts(workoutsState);
  setConfigRecord(WORKOUTS_CONFIG_KEY, serialized);
  renderWorkoutSelector();
  renderExerciseLibrary();
  renderWorkoutManager();
  ensureWorkoutSelection();
  renderTracker();
  onLoadDay();
  buildOverview();
  drawChart();
}

function reloadWorkoutsFromStorage(){
  workoutsState = normalizeWorkouts(loadWorkoutsConfig());
  renderWorkoutSelector();
  renderExerciseLibrary();
  renderWorkoutManager();
  ensureWorkoutSelection();
}

function renderWorkoutManager(){
  if(!workoutManager) return;
  if(!workoutsState.order?.length){
    workoutManager.innerHTML = '<div class="activities-empty">Noch keine Workouts angelegt.</div>';
    return;
  }
  workoutManager.innerHTML = workoutsState.order.map((id, idx)=>{
    const workout = getWorkout(id);
    if(!workout) return '';
    const exercisesHtml = (workout.exercises||[]).map((ex, exIdx)=>{
      const repsStr = Array.isArray(ex.reps)? ex.reps.join(',') : '';
      return `<div class="workout-exercise" data-workout="${escapeHtml(id)}" data-idx="${exIdx}">
        <input type="text" list="exerciseLibrary" data-field="exercise-name" value="${escapeHtml(ex.name||'')}" placeholder="Übung auswählen" />
        <input type="number" min="1" data-field="exercise-sets" value="${ex.sets||1}" />
        <input type="text" data-field="exercise-reps" value="${escapeHtml(repsStr)}" placeholder="Wdh. z.B. 8,8,8" />
        <input type="text" data-field="exercise-technique" value="${escapeHtml(ex.technique||'')}" placeholder="Technik-Link" />
        <div class="btnrow">
          <button class="btn ghost" data-action="move-ex-up" title="Übung nach oben">▲</button>
          <button class="btn ghost" data-action="move-ex-down" title="Übung nach unten">▼</button>
          <button class="btn ghost danger" data-action="remove-ex" title="Übung entfernen">✕</button>
        </div>
      </div>`;
    }).join('');
    const body = exercisesHtml || '<div class="detail-empty">Noch keine Übungen – füge über "+ Übung" hinzu.</div>';
    const upDisabled = idx===0 ? 'disabled' : '';
    const downDisabled = idx===workoutsState.order.length-1 ? 'disabled' : '';
    const deleteBtn = (id==='A' || id==='B') ? '' : '<button class="btn ghost danger" data-action="delete-workout">Löschen</button>';
    return `<div class="workout-card" data-workout="${escapeHtml(id)}">
      <div class="workout-header">
        <div class="title">
          <label class="hint" for="workout-${escapeHtml(id)}">Bezeichnung</label>
          <input id="workout-${escapeHtml(id)}" type="text" data-field="label" value="${escapeHtml(workout.label||'')}" placeholder="Workout-Name" />
        </div>
        <div class="workout-meta">
          <button class="btn ghost" data-action="move-workout-up" ${upDisabled} title="Workout nach oben">▲</button>
          <button class="btn ghost" data-action="move-workout-down" ${downDisabled} title="Workout nach unten">▼</button>
          <button class="btn ghost" data-action="add-exercise">+ Übung</button>
          ${deleteBtn}
        </div>
      </div>
      <div class="workout-exercises">${body}</div>
    </div>`;
  }).join('');
}

function setupWorkoutManagerEvents(){
  if(!workoutManager || workoutManager.dataset.bound) return;
  workoutManager.dataset.bound='1';
  workoutManager.addEventListener('change', onWorkoutManagerChange);
  workoutManager.addEventListener('click', onWorkoutManagerClick);
}

function onWorkoutManagerChange(evt){
  const target = evt.target;
  const card = target.closest('.workout-card');
  if(!card) return;
  const workoutId = card.dataset.workout;
  const workout = getWorkout(workoutId);
  if(!workout) return;
  const exEl = target.closest('.workout-exercise');
  const field = target.dataset.field;
  if(field==='label'){
    const nextLabel = target.value.trim();
    workout.label = nextLabel || workout.label || `Workout ${workout.id}`;
    saveWorkoutsState();
    return;
  }
  if(!exEl) return;
  const idx = parseInt(exEl.dataset.idx,10);
  if(isNaN(idx) || !workout.exercises[idx]) return;
  if(field==='exercise-name'){ workout.exercises[idx].name = normalizeExerciseName(target.value.trim()); }
  if(field==='exercise-sets'){ workout.exercises[idx].sets = Math.max(1, parseInt(target.value,10)||1); }
  if(field==='exercise-reps'){ workout.exercises[idx].reps = toRepArray(target.value); }
  if(field==='exercise-technique'){ workout.exercises[idx].technique = target.value.trim(); }
  saveWorkoutsState();
}

function onWorkoutManagerClick(evt){
  const action = evt.target?.dataset?.action;
  if(!action) return;
  evt.preventDefault();
  const card = evt.target.closest('.workout-card');
  if(!card) return;
  const workoutId = card.dataset.workout;
  const workout = getWorkout(workoutId);
  if(!workout) return;
  if(action==='add-exercise'){
    workout.exercises.push({ name:'', sets:3, reps:[], technique:'' });
    saveWorkoutsState();
    return;
  }
  if(action==='delete-workout'){
    if(workoutId==='A' || workoutId==='B') return;
    workoutsState.order = workoutsState.order.filter(id=>id!==workoutId);
    delete workoutsState.map[workoutId];
    saveWorkoutsState();
    return;
  }
  if(action==='move-workout-up' || action==='move-workout-down'){
    const idx = workoutsState.order.indexOf(workoutId);
    if(idx<0) return;
    const dir = action==='move-workout-up' ? -1 : 1;
    const swapIdx = idx + dir;
    if(swapIdx<0 || swapIdx>=workoutsState.order.length) return;
    const tmp = workoutsState.order[idx];
    workoutsState.order[idx] = workoutsState.order[swapIdx];
    workoutsState.order[swapIdx] = tmp;
    saveWorkoutsState();
    return;
  }
  const exEl = evt.target.closest('.workout-exercise');
  if(!exEl) return;
  const idx = parseInt(exEl.dataset.idx,10);
  if(isNaN(idx) || !workout.exercises[idx]) return;
  if(action==='remove-ex'){
    workout.exercises.splice(idx,1);
    saveWorkoutsState();
    return;
  }
  if(action==='move-ex-up' || action==='move-ex-down'){
    const dir = action==='move-ex-up' ? -1 : 1;
    const swapIdx = idx + dir;
    if(swapIdx<0 || swapIdx>=workout.exercises.length) return;
    const tmp = workout.exercises[idx];
    workout.exercises[idx] = workout.exercises[swapIdx];
    workout.exercises[swapIdx] = tmp;
    saveWorkoutsState();
  }
}

function createNewWorkout(){
  const idBase = `W${Date.now().toString(36)}`;
  let id = idBase;
  let counter = 1;
  while(workoutsState.map[id]){ id = `${idBase}-${counter++}`; }
  const label = `Workout ${workoutsState.order.length+1}`;
  workoutsState.order.push(id);
  workoutsState.map[id] = { id, label, name: label, exercises: [] };
  saveWorkoutsState();
  workoutSel.value = id;
  renderTracker();
  onLoadDay();
}

// Autosave
let dirty=false, autosaveTimer=null, saveDebounce=null;

// Timer
let timerId=null, startTs=null;
let totalTimerId=null, totalStartTs=null;

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
  const today = todayISO();
  if(dateEl){
    dateEl.value = today;
    dateEl.min = today;
    dateEl.max = today;
  }
  renderWorkoutSelector();
  renderExerciseLibrary();
  renderWorkoutManager();
  setupWorkoutManagerEvents();
  ensureWorkoutSelection();
  bindTabs();
  bindControls();
  setupAutosave();
  setupTotalTimerFromSession();
  setupTimerFromSession();
  try{
    await initSync();
  }catch(err){
    console.error('Initial sync failed', err);
    updateSyncStatus('Sync offline – nutze lokale Daten','warning');
  }
  reloadWorkoutsFromStorage();
  ensureWorkoutSelection();
  renderTracker();
  onLoadDay();
  buildOverview();
  renderActivities();
}
boot();

// Tabs
function bindTabs(){
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const tab = t.dataset.tab;
    const sections = { tracker: tabTracker, overview: tabOverview, activities: tabActivities, workouts: tabWorkouts };
    Object.entries(sections).forEach(([name, el])=>{ if(el) el.classList.toggle('hidden', name!==tab); });
    if(tab==='overview'){ buildOverview(); }
    if(tab==='activities'){ renderActivities(); }
    if(tab==='workouts'){ renderWorkoutManager(); }
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
  totalTimerBtn?.addEventListener('click', ()=>restartTotalTimer(true));
  timerBtn?.addEventListener('click', restartTimer);
  if(dateEl){
    dateEl.addEventListener('change', ()=>{
      const today = todayISO();
      if(dateEl.value !== today){ dateEl.value = today; }
      onLoadDay();
      buildOverview();
      dirty=false;
    });
    dateEl.addEventListener('keydown', e=>{ e.preventDefault(); });
    dateEl.addEventListener('input', ()=>{
      const today = todayISO();
      if(dateEl.value !== today){ dateEl.value = today; }
    });
  }
  workoutSel.addEventListener('change', ()=>{ ensureWorkoutSelection(); renderTracker(); onLoadDay(); dirty=false; });
  statRangeSel?.addEventListener('change', ()=>{ drawChart(); });
  addWorkoutBtn?.addEventListener('click', ()=>{ createNewWorkout(); });
  document.querySelectorAll('[data-close="activityDetail"]').forEach(btn=>{
    btn.addEventListener('click', closeActivityDetail);
  });
  activityDetail?.addEventListener('click', evt=>{
    if(evt.target?.dataset?.close==='activityDetail'){ closeActivityDetail(); }
  });
  window.addEventListener('keydown', evt=>{
    if(evt.key==='Escape'){ closeActivityDetail(); }
  });
  document.addEventListener('input', e=>{
    if(e.target.matches('input') && e.target.closest('#tab-tracker')) {
      markDirty();
    }
  });
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
  sessionStorage.setItem(SESSION_TIMER_KEY, String(startTs));
  tickTimer();
  timerId = setInterval(tickTimer, 250);
  if(!totalStartTs){ restartTotalTimer(false); }
  if('vibrate' in navigator){ try{ navigator.vibrate(15); }catch(e){} }
}
function restartTotalTimer(manual=false){
  if(totalTimerId) clearInterval(totalTimerId);
  totalStartTs = Date.now();
  sessionStorage.setItem(TOTAL_TIMER_KEY, String(totalStartTs));
  tickTotalTimer();
  totalTimerId = setInterval(tickTotalTimer, 1000);
  if(manual && 'vibrate' in navigator){ try{ navigator.vibrate(15); }catch(e){} }
}
function tickTimer(){
  if(!timerBtn) return;
  if(!startTs){ timerBtn.textContent = '⏱ 00:00'; return; }
  const elapsed = Date.now() - startTs;
  const totalSec = Math.floor(elapsed/1000);
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  const hh = h>0 ? String(h).padStart(2,'0') + ':' : '';
  timerBtn.textContent = `⏱ ${hh}${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function tickTotalTimer(){
  if(!totalTimerBtn) return;
  if(!totalStartTs){
    totalTimerBtn.textContent = '🕒 00:00:00';
    return;
  }
  const elapsed = Date.now() - totalStartTs;
  const totalSec = Math.max(0, Math.floor(elapsed/1000));
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  const hh = String(h).padStart(2,'0');
  totalTimerBtn.textContent = `🕒 ${hh}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function setupTimerFromSession(){
  if(!timerBtn) return;
  const saved = sessionStorage.getItem(SESSION_TIMER_KEY);
  if(saved){
    const parsed = parseInt(saved,10);
    if(Number.isFinite(parsed)){
      startTs = parsed;
      tickTimer();
      timerId = setInterval(tickTimer, 250);
      return;
    }
  }
  startTs = null;
  tickTimer();
}
function setupTotalTimerFromSession(){
  if(!totalTimerBtn) return;
  const saved = sessionStorage.getItem(TOTAL_TIMER_KEY);
  if(saved){
    const parsed = parseInt(saved,10);
    if(Number.isFinite(parsed)){
      totalStartTs = parsed;
      tickTotalTimer();
      totalTimerId = setInterval(tickTotalTimer, 1000);
      return;
    }
  }
  totalStartTs = null;
  tickTotalTimer();
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
        snap[key]=normalizeSessionData(data);
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
      const normalized = normalizeSessionData(record);
      localStorage.setItem(key, JSON.stringify(normalized));
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

function isTrainingKey(key){
  if(!key || !key.startsWith(STORAGE_PREFIX)) return false;
  const rest = key.slice(STORAGE_PREFIX.length);
  const parts = rest.split(':');
  if(parts.length!==2) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(parts[1]);
}

function sessionKeys(){
  return Object.keys(remoteData||{}).filter(key=>{
    if(!isTrainingKey(key)) return false;
    const rec=remoteData[key];
    return rec && typeof rec==='object' && !rec.deletedAt;
  });
}

function getSession(key){
  if(!isTrainingKey(key)) return null;
  const rec = remoteData?.[key];
  if(rec && !rec.deletedAt) return normalizeSessionData(rec);
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(parsed && !parsed.deletedAt) return normalizeSessionData(parsed);
  }catch(e){}
  return null;
}

function getConfigRecord(key){
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
  return sessionKeys().map(key=>({ key, data: normalizeSessionData(remoteData[key]) }));
}

function allSessionsArray(){
  return sessionEntries().map(entry=>entry.data);
}

function cloneRecord(rec){
  return rec ? JSON.parse(JSON.stringify(rec)) : rec;
}

function mergeSnapshots(base, incoming){
  const merged = {};
  Object.entries(base||{}).forEach(([key, record])=>{
    if(isTrainingKey(key) && record && typeof record==='object' && !record.deletedAt){
      merged[key] = normalizeSessionData(record);
    }else{
      merged[key] = cloneRecord(record);
    }
  });
  Object.entries(incoming||{}).forEach(([key, record])=>{
    const current = merged[key];
    let candidate = chooseRecord(current, record);
    if(isTrainingKey(key) && candidate && typeof candidate==='object' && !candidate.deletedAt){
      candidate = normalizeSessionData(candidate);
    }
    merged[key] = candidate;
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
      reloadWorkoutsFromStorage();
      ensureWorkoutSelection();
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
    reloadWorkoutsFromStorage();
    ensureWorkoutSelection();
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

function writeRecord(key, payload){
  const record = {...payload, updatedAt: Date.now()};
  remoteData[key] = record;
  localStorage.setItem(key, JSON.stringify(record));
  persistRemoteCache();
  scheduleRemoteSave();
  return record;
}

function setSessionRecord(key, session){
  writeRecord(key, normalizeSessionData(session));
}

function setConfigRecord(key, value){
  writeRecord(key, value);
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
  const target = normalizeExerciseName(exName);
  let latest=null, latestDate='', latestStamp=0;
  sessionEntries().forEach(({data})=>{
    const row=(data.rows||[]).find(r=>r.name===target);
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
  const target = normalizeExerciseName(exName);
  const hist=[];
  sessionEntries().forEach(({data})=>{
    (data.rows||[]).forEach(r=>{
      if(r.name!==target) return;
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
  getWorkoutExercises(workoutSel.value).forEach((ex,idx)=>{
    const rows=document.querySelectorAll(`.setgrid[data-idx='${idx}']`);
    const sets=[];
    rows.forEach(g=>{
      const get=k=>g.querySelector(`[data-k='${k}']`)?.value||'';
      sets.push({w:+get('w')||0, reps:+get('reps')||0, rpe:+get('rpe')||0});
    });
    day.rows.push({name:normalizeExerciseName(ex.name), sets});
  });
  return day;
}
function saveDay(silent=true){
  const data = collect();
  const key = storageKey();
  setSessionRecord(key, data);
  removeOtherSessionsForDate(data.date, key);
  dirty=false;
  if(saveDebounce){ clearTimeout(saveDebounce); saveDebounce=null; }
  if(!silent) toast('Gespeichert');
  buildOverview();
  renderActivities();
}

// Render tracker
function renderTracker(){
  const exercises = getWorkoutExercises(workoutSel.value);
  if(!exercises.length){
    tabTracker.innerHTML = '<div class="activities-empty">Bitte füge diesem Workout zuerst Übungen hinzu.</div>';
    return;
  }

  // Session-Vergleich Banner
  const lastSess = getLastSameWorkoutSession(workoutSel.value, dateEl.value);
  let compareHtml = '';
  if(lastSess && lastSess.volume > 0){
    const fmt2 = new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit'});
    const lastDateFmt = fmt2.format(new Date(lastSess.date + 'T00:00:00'));
    compareHtml = `<div class="session-compare" id="sessionCompare" data-last-vol="${lastSess.volume}">
      Letztes ${workoutsState.map[workoutSel.value]?.label||'Training'}: ${lastDateFmt} · <span id="compareDelta">–</span>
    </div>`;
  } else {
    compareHtml = `<div class="session-compare session-compare--new" id="sessionCompare">Erste Session für dieses Workout – leg los!</div>`;
  }

  let html = compareHtml;
  exercises.forEach((ex,idx)=>{
    const last = lastSetsFor(ex.name);
    const setCount = Math.max(ex.sets||1, last? last.length : (ex.sets||1));

    // Plateau check
    const plateauState = checkPlateau(ex.name, workoutSel.value);
    let plateauBadge = '';
    if(plateauState === 'plateau') plateauBadge = `<span class="badge-plateau">⚠ Plateau</span>`;
    else if(plateauState === 'ready') plateauBadge = `<span class="badge-ready">↑ Steigern?</span>`;

    // PR for this exercise
    const pr = getAllTimePR(ex.name);
    const prWeight = pr ? pr.weight : 0;

    html += `<div class="card" id="card-${idx}" data-pr="${prWeight}">
      <div class="exercise-head">
        <div class="pill-wrap">
          <div class="pill">${idx+1}. ${escapeHtml(ex.name||'')}</div>
          ${plateauBadge}
        </div>
        <div class="exercise-meta">
          <span class="orm-display" id="orm-${idx}"></span>
        </div>
        <div class="btnrow">
          <button class="btn ghost" data-act="suggest" data-idx="${idx}">Vorschläge aktualisieren</button>
          ${ex.technique ? `<a class="btn ghost" href="${escapeHtml(ex.technique)}" target="_blank" rel="noopener">Technik</a>`:``}
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
        <div class="hdr"></div>
      </div>`;
    for(let s=0;s<setCount;s++){
      const recentSets = last || [];
      const histSet = recentSets[s] ?? null;
      const fallbackSet = recentSets[recentSets.length-1] ?? null;
      const baseReps = Array.isArray(ex.reps) ? (ex.reps[s] ?? ex.reps[ex.reps.length-1] ?? '') : '';
      const sugg = histSet?.w ?? lastTopSet(ex.name);
      const weightVal = histSet?.w ?? (sugg ?? '');
      const repsVal = histSet?.reps ?? fallbackSet?.reps ?? baseReps;
      const rpeVal = histSet?.rpe ?? '';
      const isPR = prWeight > 0 && weightVal > prWeight;
      html += `<div class="setgrid" data-idx="${idx}" data-set="${s}">
        <div>${s+1}</div>
        <div><input type="number" step="0.5" data-k="w" value="${weightVal ?? ''}" ${isPR ? 'class="pr-input"' : ''}></div>
        <div><input type="text" class="suggestion" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
        <div><input type="number" step="1" data-k="reps" value="${repsVal ?? ''}"></div>
        <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${rpeVal ?? ''}"></div>
        <div class="pr-flag">${isPR ? '<span class="pr-badge">PR!</span>' : ''}</div>
      </div>`;
    }
    html += `</div>`;
  });
  tabTracker.innerHTML = html;

  // Live PR + 1RM + session-compare updates
  function updateLiveStats(){
    exercises.forEach((ex, idx) => {
      const card = document.getElementById(`card-${idx}`);
      if(!card) return;
      const prWeight = +card.dataset.pr || 0;
      let bestOrm = 0;
      card.querySelectorAll('.setgrid[data-idx]').forEach(row => {
        const w = +row.querySelector('[data-k="w"]')?.value || 0;
        const r = +row.querySelector('[data-k="reps"]')?.value || 0;
        const orm = epley(w, r);
        if(orm > bestOrm) bestOrm = orm;
        const wInput = row.querySelector('[data-k="w"]');
        const prFlag = row.querySelector('.pr-flag');
        if(wInput && prFlag){
          const isNewPR = prWeight > 0 && +wInput.value > prWeight;
          wInput.classList.toggle('pr-input', isNewPR);
          prFlag.innerHTML = isNewPR ? '<span class="pr-badge">PR!</span>' : '';
        }
      });
      const ormEl = document.getElementById(`orm-${idx}`);
      if(ormEl) ormEl.textContent = bestOrm > 0 ? `Est. 1RM: ${bestOrm} kg` : '';
    });

    // Session-compare delta
    const compareEl = document.getElementById('sessionCompare');
    const deltaEl = document.getElementById('compareDelta');
    if(compareEl && deltaEl){
      const lastVol = +compareEl.dataset.lastVol || 0;
      if(lastVol > 0){
        let curVol = 0;
        exercises.forEach((ex, idx) => {
          const card = document.getElementById(`card-${idx}`);
          if(!card) return;
          card.querySelectorAll('.setgrid[data-idx]').forEach(row => {
            const w = +row.querySelector('[data-k="w"]')?.value || 0;
            const r = +row.querySelector('[data-k="reps"]')?.value || 0;
            curVol += w * r;
          });
        });
        if(curVol > 0){
          const pct = ((curVol - lastVol) / lastVol * 100);
          const sign = pct >= 0 ? '+' : '';
          deltaEl.textContent = sign + pct.toFixed(0) + '% Volumen';
          deltaEl.className = pct >= 0 ? 'compare-up' : 'compare-down';
        } else {
          deltaEl.textContent = '–';
        }
      }
    }
  }

  // Run once and on every input
  updateLiveStats();
  tabTracker.addEventListener('input', updateLiveStats);

  tabTracker.querySelectorAll('[data-act="suggest"]').forEach(btn=>btn.addEventListener('click', ()=>{
    const idx=+btn.dataset.idx;
    const ex = getWorkoutExercises(workoutSel.value)[idx];
    if(!ex) return;
    const last = lastSetsFor(ex.name) || [];
    const top = lastTopSet(ex.name);
    tabTracker.querySelectorAll(`.setgrid[data-idx='${idx}']`).forEach((row, setIdx)=>{
      const histSet = last[setIdx] ?? null;
      const sugg = histSet?.w ?? top;
      row.querySelector(`[data-k='w']`).value = sugg ?? '';
      row.querySelector(`[data-k='sugg']`).value = sugg ? (sugg+' kg') : '';
    });
    updateLiveStats();
    markDirty(); toast('Vorschlag aktualisiert');
  }));
  tabTracker.querySelectorAll('[data-act="addset"]').forEach(btn=>btn.addEventListener('click', ()=>{ addSetRow(+btn.dataset.idx); markDirty(); }));
  tabTracker.querySelectorAll('[data-act="removeset"]').forEach(btn=>btn.addEventListener('click', ()=>{ removeLastSet(+btn.dataset.idx); markDirty(); }));
}
function addSetRow(idx){
  const card = document.getElementById(`card-${idx}`);
  const ex = getWorkoutExercises(workoutSel.value)[idx];
  if(!card || !ex) return;
  const rows = card.querySelectorAll(`.setgrid[data-idx='${idx}']`);
  const s = rows.length;
  const last = lastSetsFor(ex.name);
  const recentSets = last || [];
  const histSet = recentSets[s] ?? null;
  const fallbackSet = recentSets[recentSets.length-1] ?? null;
  const baseReps = Array.isArray(ex.reps) ? (ex.reps[s] ?? ex.reps[ex.reps.length-1] ?? '') : '';
  const sugg = histSet?.w ?? lastTopSet(ex.name);
  const weightVal = histSet?.w ?? (sugg ?? '');
  const repsVal = histSet?.reps ?? fallbackSet?.reps ?? baseReps;
  const rpeVal = histSet?.rpe ?? '';
  const row = document.createElement('div');
  row.className='setgrid'; row.dataset.idx=idx; row.dataset.set=s;
  row.innerHTML = `<div>${s+1}</div>
    <div><input type="number" step="0.5" data-k="w" value="${weightVal ?? ''}"></div>
    <div><input type="text" class="suggestion" data-k="sugg" value="${sugg? (sugg+' kg'): ''}" readonly></div>
    <div><input type="number" step="1" data-k="reps" value="${repsVal ?? ''}"></div>
    <div><input type="number" step="0.5" data-k="rpe" placeholder="8–9" value="${rpeVal ?? ''}"></div>`;
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
    const history = lastSetsFor(row.name) || [];
    const top = lastTopSet(row.name);
    row.sets?.forEach((s,si)=>{
      const g=card.querySelector(`.setgrid[data-idx='${idx}'][data-set='${si}']`); if(!g) return;
      g.querySelector(`[data-k='w']`).value=s.w||''; g.querySelector(`[data-k='reps']`).value=s.reps||''; g.querySelector(`[data-k='rpe']`).value=s.rpe||'';
      const histSet = history[si] ?? null;
      const sugg = histSet?.w ?? top;
      g.querySelector(`[data-k='sugg']`).value = sugg ? (sugg+' kg'): '';
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
    const names = new Set();
    (workoutsState.order||[]).forEach(id=>{
      getWorkoutExercises(id).forEach(x=>names.add(x.name));
    });
    const arr=[...names];
    exSel.innerHTML = arr.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
    exSel.onchange = ()=>{ drawChart(); };
  }

  // Recaps
  computeRecaps(base);

  // PR List
  buildPRList();

  // Muscle chart
  drawMuscleChart();
  const muscleRangeSel = document.getElementById('muscleRange');
  if(muscleRangeSel) muscleRangeSel.onchange = () => drawMuscleChart();

  // Chart mode toggle (weight vs e1RM)
  const chartModeBtn = document.getElementById('chartMode');
  if(chartModeBtn){
    chartModeBtn.onclick = () => {
      const cur = chartModeBtn.dataset.mode;
      chartModeBtn.dataset.mode = cur === 'weight' ? 'orm' : 'weight';
      chartModeBtn.textContent = cur === 'weight' ? 'Gewicht-Ansicht' : 'Est. 1RM-Ansicht';
      drawChart();
    };
  }

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
      const iso=toLocalISO(new Date(Y,M,d));
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
          <button class="btn ghost" data-act="detail" data-key="${e.key}">Details</button>
          <button class="btn danger" data-act="delete" data-key="${e.key}">Löschen</button>
        </div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-act="delete"]').forEach(btn=>{
    btn.addEventListener('click', ()=>deleteActivity(btn.dataset.key));
  });
  list.querySelectorAll('[data-act="detail"]').forEach(btn=>{
    btn.addEventListener('click', ()=>openActivityDetail(btn.dataset.key));
  });
}
function deleteActivity(key){
  if(!key) return;
  removeSessionRecord(key);
  toast('Training gelöscht');
  if(activeDetailKey===key){ closeActivityDetail(); }
  renderActivities();
  buildOverview();
  onLoadDay();
}

function removeOtherSessionsForDate(date, keepKey){
  sessionEntries().forEach(({key,data})=>{
    if(key===keepKey) return;
    if(data?.date===date){
      removeSessionRecord(key);
    }
  });
}

function normalizeDetailState(session){
  const fallbackWorkout = getWorkout(session?.workout) ? session.workout : (workoutsState.order[0]||'');
  return {
    date: session?.date || todayISO(),
    workout: fallbackWorkout,
    rows: (session?.rows||[]).map(row=>({
      name: normalizeExerciseName(row?.name || ''),
      sets: (row?.sets||[]).map(set=>({
        w: +set?.w || 0,
        reps: +set?.reps || 0,
        rpe: +set?.rpe || 0
      }))
    }))
  };
}

function openActivityDetail(key){
  if(!activityDetail || !activityDetailBody) return;
  const session = getSession(key);
  if(!session){ toast('Training nicht gefunden'); return; }
  activeDetailKey = key;
  activeDetailState = normalizeDetailState(session);
  renderExerciseLibrary();
  renderActivityDetail();
  setupActivityDetailEvents();
  activityDetail.classList.remove('hidden');
}

function closeActivityDetail(){
  if(!activityDetail) return;
  activityDetail.classList.add('hidden');
  activeDetailKey = null;
  activeDetailState = null;
}

function renderActivityDetail(){
  if(!activityDetailBody) return;
  if(!activeDetailState){
    activityDetailBody.innerHTML = '<div class="detail-empty">Kein Training ausgewählt.</div>';
    return;
  }
  const workoutOptions = (workoutsState.order||[]).map(id=>{
    const workout = getWorkout(id);
    const label = workout?.label || id;
    const selected = id===activeDetailState.workout ? 'selected' : '';
    return `<option value="${escapeHtml(id)}" ${selected}>${escapeHtml(label)}</option>`;
  }).join('');
  const rowsHtml = (activeDetailState.rows||[]).map((row, idx)=>{
    const setsHtml = (row.sets||[]).map((set,si)=>{
      return `<div class="detail-setgrid" data-row="${idx}" data-set="${si}">
        <div>${si+1}</div>
        <input type="number" step="0.5" data-field="w" value="${set.w||''}" />
        <input type="number" step="1" data-field="reps" value="${set.reps||''}" />
        <input type="number" step="0.5" data-field="rpe" value="${set.rpe||''}" />
        <button class="btn ghost" data-detail="remove-set">−</button>
      </div>`;
    }).join('');
    const setsBody = setsHtml || '<div class="detail-empty">Noch keine Sätze – füge unten einen Satz hinzu.</div>';
    return `<div class="detail-card" data-row="${idx}">
      <h4><input type="text" list="exerciseLibrary" data-field="name" value="${escapeHtml(row.name||'')}" placeholder="Übungsname" /></h4>
      <div class="detail-sets">${setsBody}</div>
      <div class="btnrow">
        <button class="btn ghost" data-detail="add-set">+ Satz</button>
        <button class="btn ghost danger" data-detail="remove-row">Übung entfernen</button>
      </div>
    </div>`;
  }).join('');
  const rowsBody = rowsHtml || '<div class="detail-empty">Noch keine Übungen – füge eine Übung hinzu.</div>';
  activityDetailBody.innerHTML = `<div class="detail-body">
    <div class="detail-head">
      <label class="chip">Datum
        <input type="date" data-field="date" value="${activeDetailState.date}" />
      </label>
      <label class="chip">Workout
        <select data-field="workout">${workoutOptions}</select>
      </label>
      <button class="btn ghost" data-detail="add-row">+ Übung</button>
    </div>
    <div class="detail-sets">${rowsBody}</div>
    <div class="detail-actions">
      <button class="btn ghost" data-detail="cancel">Abbrechen</button>
      <button class="btn" data-detail="save">Speichern</button>
    </div>
  </div>`;
}

function setupActivityDetailEvents(){
  if(!activityDetailBody || activityDetailBody.dataset.bound) return;
  activityDetailBody.dataset.bound='1';
  activityDetailBody.addEventListener('change', onActivityDetailChange);
  activityDetailBody.addEventListener('click', onActivityDetailClick);
}

function onActivityDetailChange(evt){
  if(!activeDetailState) return;
  const target = evt.target;
  const field = target.dataset.field;
  if(field==='date'){
    activeDetailState.date = target.value || todayISO();
    return;
  }
  if(field==='workout'){
    activeDetailState.workout = target.value;
    return;
  }
  const card = target.closest('.detail-card');
  if(!card) return;
  const rowIdx = parseInt(card.dataset.row,10);
  if(isNaN(rowIdx) || !activeDetailState.rows[rowIdx]) return;
  if(field==='name'){
    activeDetailState.rows[rowIdx].name = target.value.trim();
    return;
  }
  const setEl = target.closest('.detail-setgrid');
  if(!setEl) return;
  const setIdx = parseInt(setEl.dataset.set,10);
  if(isNaN(setIdx) || !activeDetailState.rows[rowIdx].sets[setIdx]) return;
  if(field==='w'){ activeDetailState.rows[rowIdx].sets[setIdx].w = parseFloat(target.value)||0; }
  if(field==='reps'){ activeDetailState.rows[rowIdx].sets[setIdx].reps = parseInt(target.value,10)||0; }
  if(field==='rpe'){ activeDetailState.rows[rowIdx].sets[setIdx].rpe = parseFloat(target.value)||0; }
}

function onActivityDetailClick(evt){
  if(!activeDetailState) return;
  const action = evt.target?.dataset?.detail;
  if(!action) return;
  evt.preventDefault();
  if(action==='cancel'){ closeActivityDetail(); return; }
  if(action==='save'){ saveActivityDetail(); return; }
  if(action==='add-row'){
    activeDetailState.rows.push({ name:'', sets:[{w:0,reps:0,rpe:0}] });
    renderActivityDetail();
    return;
  }
  const card = evt.target.closest('.detail-card');
  if(!card) return;
  const rowIdx = parseInt(card.dataset.row,10);
  if(isNaN(rowIdx) || !activeDetailState.rows[rowIdx]) return;
  if(action==='remove-row'){
    activeDetailState.rows.splice(rowIdx,1);
    renderActivityDetail();
    return;
  }
  if(action==='add-set'){
    activeDetailState.rows[rowIdx].sets.push({w:0,reps:0,rpe:0});
    renderActivityDetail();
    return;
  }
  if(action==='remove-set'){
    const setEl = evt.target.closest('.detail-setgrid');
    if(!setEl) return;
    const setIdx = parseInt(setEl.dataset.set,10);
    if(isNaN(setIdx)) return;
    activeDetailState.rows[rowIdx].sets.splice(setIdx,1);
    if(activeDetailState.rows[rowIdx].sets.length===0){
      activeDetailState.rows[rowIdx].sets.push({w:0,reps:0,rpe:0});
    }
    renderActivityDetail();
  }
}

function saveActivityDetail(){
  if(!activeDetailState) return;
  const date = activeDetailState.date || todayISO();
  const workoutId = getWorkout(activeDetailState.workout) ? activeDetailState.workout : (workoutsState.order[0]||'');
  const rows = (activeDetailState.rows||[]).map(row=>({
    name: normalizeExerciseName(row.name),
    sets: (row.sets||[]).filter(set=> (set.w||0)!==0 || (set.reps||0)!==0 || (set.rpe||0)!==0)
  })).filter(row=>row.name && row.sets.length>0);
  if(!rows.length){ toast('Bitte erfasse mindestens einen Satz.'); return; }
  const payload={ date, workout: workoutId, rows };
  const newKey = `${STORAGE_PREFIX}${workoutId}:${date}`;
  setSessionRecord(newKey, payload);
  if(newKey!==activeDetailKey){ removeSessionRecord(activeDetailKey); }
  removeOtherSessionsForDate(date, newKey);
  toast('Training aktualisiert');
  closeActivityDetail();
  renderActivities();
  renderExerciseLibrary();
  buildOverview();
  drawChart();
  if(date===dateEl.value){
    if(workoutSel.value!==workoutId){
      workoutSel.value = workoutId;
      renderTracker();
    }
    onLoadDay();
  }
}
function dayWorkoutBadge(iso){
  const ids = workoutsState.order || [];
  const found = ids.filter(id => getSession(`${STORAGE_PREFIX}${id}:${iso}`));
  if(!found.length) return null;
  if(found.length === 1) return found[0];
  return found.map(id => id.replace('Hypertrophie ','')).join('/');
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
  if($('#wkSets')) $('#wkSets').textContent = weekStats.sets;
  $('#wkAvgRPE').textContent = weekStats.avgRPE.toFixed(1);
  const wkDeltaEl = $('#wkDelta');
  if(wkDeltaEl){
    const wkPct = prevWeekStats.volume > 0 ? ((weekStats.volume - prevWeekStats.volume) / prevWeekStats.volume * 100) : null;
    wkDeltaEl.textContent = wkPct !== null ? (wkPct >= 0 ? '▲' : '▼') + ' ' + (wkPct >= 0 ? '+' : '') + wkPct.toFixed(0) + '% Volumen ggü. Vorwoche' : '–';
    wkDeltaEl.className = 'delta' + (wkPct !== null ? (wkPct >= 0 ? ' delta-up' : ' delta-down') : '');
  }
  // Month
  $('#moWorkouts').textContent = monthStats.sessions;
  $('#moVolume').textContent = Math.round(monthStats.volume);
  if($('#moSets')) $('#moSets').textContent = monthStats.sets;
  $('#moAvgRPE').textContent = monthStats.avgRPE.toFixed(1);
  const moDeltaEl = $('#moDelta');
  if(moDeltaEl){
    const moPct = prevMonthStats.volume > 0 ? ((monthStats.volume - prevMonthStats.volume) / prevMonthStats.volume * 100) : null;
    moDeltaEl.textContent = moPct !== null ? (moPct >= 0 ? '▲' : '▼') + ' ' + (moPct >= 0 ? '+' : '') + moPct.toFixed(0) + '% Volumen ggü. Vormonat' : '–';
    moDeltaEl.className = 'delta' + (moPct !== null ? (moPct >= 0 ? ' delta-up' : ' delta-down') : '');
  }
  // Streak
  const streakEl = $('#streakCount');
  if(streakEl) streakEl.textContent = computeStreak();
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
      (d.rows||[]).forEach(r=> (r.sets||[]).forEach(s=>{
        const w = +s.w||0, reps = +s.reps||0;
        if(w > 0 || reps > 0){
          volume += w * reps;
          sets += 1;
        }
        if(s.rpe){ rpeSum += +s.rpe; rpeN++; }
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

function getRangeBounds(rangeId){
  const end = new Date();
  end.setHours(0,0,0,0);
  if(rangeId==='all') return {start:null, end};
  const daysMap={ '4w':28, '12w':84, '26w':182, '52w':365 };
  const span = daysMap[rangeId] || 28;
  const start = new Date(end);
  start.setDate(start.getDate()-(span-1));
  return {start, end};
}

function inBounds(dateStr, bounds){
  if(!dateStr) return false;
  const date = new Date(dateStr+'T00:00:00');
  if(isNaN(date)) return false;
  if(!bounds.start) return date <= bounds.end;
  return date >= bounds.start && date <= bounds.end;
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
  const rangeId = statRangeSel?.value || '4w';
  const bounds = getRangeBounds(rangeId);

  // Build datasets
  const useOrm = document.getElementById('chartMode')?.dataset.mode === 'orm';
  const series=[]; let globalDates=new Set();
  const sessions = sessionEntries().map(entry=>entry.data);
  selected.forEach((ex,i)=>{
    const hist=[];
    sessions.forEach(data=>{
      if(!inBounds(data.date, bounds)) return;
      const row=data.rows?.find(r=>r.name===ex);
      if(!row) return;
      let best = 0, bestReps = 0;
      (row.sets||[]).forEach(s=>{ const w=+s.w||0; if(w>best){best=w;bestReps=+s.reps||0;} });
      const val = useOrm ? epley(best, bestReps) : best;
      if(val>0){
        hist.push({date:data.date,w:val});
        if(data.date) globalDates.add(data.date);
      }
    });
    hist.sort((a,b)=>a.date.localeCompare(b.date));
    series.push({name:ex, color:colors[i%colors.length], data:hist});
  });
  const dates=[...globalDates].sort();
  // y-range
  const ys = series.flatMap(s=>s.data.map(p=>p.w));
  if(ys.length===0){ ctx.fillStyle=cssVar('--muted'); ctx.fillText('Keine Daten im gewählten Zeitraum.',20,24); document.getElementById('aggScore').textContent='–'; return; }
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
      renderExerciseLibrary();
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
