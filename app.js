// =====================
// DATA
// =====================
const NOTES_EN = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FR_SHORT = ['Do','Do#','Ré','Ré#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const NOTES_FR = NOTES_FR_SHORT.map((fr, i) => `${fr} (${NOTES_EN[i]})`);
const NOTE_IS_BLACK = [false,true,false,true,false,false,true,false,true,false,true,false];

const SCALE_FORMULAS = {
  major:          [2,2,1,2,2,2,1],
  natural_minor:  [2,1,2,2,1,2,2],
  harmonic_minor: [2,1,2,2,1,3,1],
};
const SCALE_NAMES = {
  major:'Majeure', natural_minor:'Mineure naturelle', harmonic_minor:'Mineure harmonique'
};

function buildScale(rootIdx, formula) {
  let notes = [rootIdx];
  let cur = rootIdx;
  formula.forEach(step => { cur = (cur + step) % 12; notes.push(cur); });
  return notes.slice(0, 7);
}

function getRelativeMinor(majorRootIdx) {
  return buildScale(majorRootIdx, SCALE_FORMULAS.major)[5];
}
function getRelativeMajor(minorRootIdx) {
  return buildScale(minorRootIdx, SCALE_FORMULAS.natural_minor)[2];
}

const INTERVALS = [
  { name:'Unisson',      semitones:0,  symbol:'P1', example:'Do–Do',   desc:'Même note' },
  { name:'2nde mineure', semitones:1,  symbol:'m2', example:'Do–Do#',  desc:'Demi-ton' },
  { name:'2nde majeure', semitones:2,  symbol:'M2', example:'Do–Ré',   desc:'Ton entier' },
  { name:'3ce mineure',  semitones:3,  symbol:'m3', example:'Do–Mi♭',  desc:'Son triste' },
  { name:'3ce majeure',  semitones:4,  symbol:'M3', example:'Do–Mi',   desc:'Son joyeux' },
  { name:'4te juste',    semitones:5,  symbol:'P4', example:'Do–Fa',   desc:'Stable' },
  { name:'Triton',       semitones:6,  symbol:'TT', example:'Do–Fa#',  desc:'Dissonant' },
  { name:'5te juste',    semitones:7,  symbol:'P5', example:'Do–Sol',  desc:'Puissant' },
  { name:'6te mineure',  semitones:8,  symbol:'m6', example:'Do–La♭',  desc:'Doux mélancolique' },
  { name:'6te majeure',  semitones:9,  symbol:'M6', example:'Do–La',   desc:'Ouvert' },
  { name:'7me mineure',  semitones:10, symbol:'m7', example:'Do–Si♭',  desc:'Blues/jazz' },
  { name:'7me majeure',  semitones:11, symbol:'M7', example:'Do–Si',   desc:'Tension douce' },
  { name:'Octave',       semitones:12, symbol:'P8', example:'Do–Do\'', desc:'Retour au début' },
];

const CHORD_DATA = {
  'Pop / Rock': [
    { name:'La progression I–V–vi–IV',         chords:['C','G','Am','F'],      roman:'I – V – vi – IV',       examples:'"Let It Be" · "No Woman No Cry" · des centaines de chansons pop' },
    { name:'La progression I–IV–V',             chords:['C','F','G'],           roman:'I – IV – V',            examples:'"La Bamba" · "Twist and Shout" · rock\'n\'roll classique' },
    { name:'vi–IV–I–V (mineure pop)',           chords:['Am','F','C','G'],      roman:'vi – IV – I – V',       examples:'"Someone Like You" · "Grenade" · pop émotionnelle' },
    { name:'I–V–vi–iii–IV (pop cinématique)',   chords:['C','G','Am','Em','F'], roman:'I – V – vi – iii – IV', examples:'"Canon" de Pachelbel · nombreuses ballades pop-rock' },
  ],
  'Jazz': [
    { name:'ii–V–I (progression reine)',    chords:['Dm7','G7','Cmaj7'],        roman:'ii7 – V7 – Imaj7',         examples:'Base de 90% des standards jazz · omniprésent' },
    { name:'I–vi–ii–V (turnaround)',        chords:['Cmaj7','Am7','Dm7','G7'],  roman:'Imaj7 – vi7 – ii7 – V7',   examples:'"Autumn Leaves" · fins de chorus jazz' },
    { name:'Blues jazz (12 bars)',          chords:['C7','F7','C7','G7','F7','C7'], roman:'I7–IV7–I7–V7–IV7–I7', examples:'"All Blues" (Miles Davis) · "Straight No Chaser"' },
    { name:'Anatole (rythm changes)',       chords:['Bb','G7','Cm7','F7'],      roman:'I – VI7 – ii7 – V7',        examples:'"I Got Rhythm" (Gershwin) · "Oleo" (Rollins)' },
  ],
  'Hip-hop & R&B': [
    { name:'Loop mineur (lo-fi / trap)',         chords:['Am','G','F','E'],          roman:'i – VII – VI – V',   examples:'Production lo-fi · trap soul · ambiance sombre' },
    { name:'Neo-soul i–IV',                      chords:['Am7','Dmaj7'],             roman:'i7 – IVmaj7',        examples:'Frank Ocean · H.E.R. · Sade · 2 accords en boucle' },
    { name:'R&B classique I–IV–vi–V',            chords:['Eb','Ab','Cm','Bb'],       roman:'I – IV – vi – V',    examples:'Marvin Gaye · Stevie Wonder · old school R&B' },
    { name:'Progression modale (jazz-hop)',       chords:['Dm7','Dm7/C','Bm7b5','Bbmaj7'], roman:'Dorien · mouvement de basse', examples:'J Dilla · Erykah Badu · Robert Glasper' },
  ],
};

// =====================
// AUDIO ENGINE
// =====================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function noteToFreq(noteIdx, octave) {
  const semitonesFromA4 = (octave - 4) * 12 + (noteIdx - 9);
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}

function playNote(noteIdx, octave, duration) {
  const ctx = getAudioCtx();
  const freq = noteToFreq(noteIdx, octave || 4);
  const dur = duration || 1.0;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + dur);
}

function playChord(noteIndices, octave, duration) {
  noteIndices.forEach((n, i) => {
    setTimeout(() => playNote(n, octave || 4, duration || 1.5), i * 40);
  });
}

function playScale(noteIndices) {
  noteIndices.forEach((n, i) => {
    setTimeout(() => playNote(n, 4, 0.6), i * 280);
  });
}

// =====================
// PIANO
// =====================
const WHITE_NOTES = [0,2,4,5,7,9,11, 0,2,4,5,7,9,11];
const BLACK_POSITIONS = [
  {note:1,cls:'bk-1'},{note:3,cls:'bk-2'},{note:6,cls:'bk-3'},{note:8,cls:'bk-4'},{note:10,cls:'bk-5'},
  {note:13,cls:'bk-6'},{note:15,cls:'bk-7'},{note:18,cls:'bk-8'},{note:20,cls:'bk-9'},{note:22,cls:'bk-10'},
];

function buildPiano() {
  const piano = document.getElementById('piano');
  WHITE_NOTES.forEach((noteIdx, i) => {
    const key = document.createElement('div');
    key.className = 'white-key';
    key.dataset.note = noteIdx;
    const label = document.createElement('span');
    label.className = 'note-label';
    label.textContent = NOTES_FR_SHORT[noteIdx];
    key.appendChild(label);
    key.addEventListener('click', () => pressKey(noteIdx, i < 7 ? 4 : 5));
    piano.appendChild(key);
  });
  BLACK_POSITIONS.forEach(({note, cls}) => {
    const key = document.createElement('div');
    key.className = `black-key ${cls}`;
    key.dataset.note = note % 12;
    key.addEventListener('click', e => { e.stopPropagation(); pressKey(note % 12, note < 12 ? 4 : 5); });
    piano.appendChild(key);
  });
}

function pressKey(noteIdx, octave) {
  document.querySelectorAll('.white-key.active, .black-key.active').forEach(k => k.classList.remove('active'));
  document.querySelectorAll(`[data-note="${noteIdx}"]`).forEach(k => k.classList.add('active'));
  document.getElementById('noteDisplay').textContent = `${NOTES_FR_SHORT[noteIdx]} (${NOTES_EN[noteIdx]})`;
  const hints = [
    'Do — tonique de référence universel',
    'Do# / Ré♭ — touche noire',
    'Ré — 2ème degré majeur',
    'Ré# / Mi♭ — touche noire',
    'Mi — 3ème degré, détermine majeur/mineur',
    'Fa — 4ème degré, sous-dominante',
    'Fa# / Sol♭ — touche noire',
    'Sol — 5ème degré, dominante',
    'Sol# / La♭ — touche noire',
    'La — base du La mineur naturel',
    'La# / Si♭ — touche noire',
    'Si — 7ème degré, note sensible',
  ];
  document.getElementById('noteHint').textContent = hints[noteIdx];
  playNote(noteIdx, octave || 4);
  setTimeout(() => document.querySelectorAll('.white-key.active, .black-key.active').forEach(k => k.classList.remove('active')), 600);
}

// =====================
// INTERVALLES
// =====================
function buildIntervals() {
  const grid = document.getElementById('intervalGrid');
  const featured = INTERVALS.filter(i => [3,4,7,10,11].includes(i.semitones));
  featured.forEach(iv => {
    const card = document.createElement('div');
    card.className = 'interval-card';
    card.innerHTML = `
      <div class="interval-name">${iv.name}</div>
      <div class="interval-semitones">${iv.semitones} demi-ton${iv.semitones>1?'s':''} · ${iv.symbol}</div>
      <div class="interval-example">${iv.example}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">${iv.desc}</div>
      <button class="play-btn" onclick="playNote(0,4,1); setTimeout(()=>playNote(${iv.semitones%12},4,1),80)">▶ Écouter</button>`;
    grid.appendChild(card);
  });
}

// =====================
// GAMMES
// =====================
let currentRoot = 0;
let currentScaleType = 'major';

function buildRootSelector() {
  const sel = document.getElementById('rootSelector');
  NOTES_EN.forEach((note, i) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = `${NOTES_FR_SHORT[i]}<span style="font-size:10px;opacity:0.6;display:block">(${note})</span>`;
    btn.id = `root-${i}`;
    btn.onclick = () => setRoot(i);
    sel.appendChild(btn);
  });
}

function setRoot(idx) {
  currentRoot = idx;
  document.querySelectorAll('#rootSelector .sel-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`root-${idx}`).classList.add('active');
  renderScale();
}

function setScaleType(type) {
  currentScaleType = type;
  document.querySelectorAll('[id^="st-"]').forEach(b => b.classList.remove('active'));
  document.getElementById(`st-${type}`).classList.add('active');
  renderScale();
}

function renderScale() {
  const formula = SCALE_FORMULAS[currentScaleType];
  const scale = buildScale(currentRoot, formula);
  const rootName = NOTES_EN[currentRoot];
  document.getElementById('scaleName').textContent = `${NOTES_FR_SHORT[currentRoot]} (${rootName}) ${SCALE_NAMES[currentScaleType]}`;

  const container = document.getElementById('scaleKeys');
  container.innerHTML = '';
  scale.forEach((noteIdx, deg) => {
    const key = document.createElement('div');
    const isBlack = NOTE_IS_BLACK[noteIdx];
    key.className = `scale-key ${deg === 0 ? 'root' : 'highlight'} ${isBlack ? 'black' : 'white'}`;
    if (deg === 0) key.className = 'scale-key root';
    key.innerHTML = `<span style="font-size:10px">${NOTES_FR_SHORT[noteIdx]}</span><span style="font-size:9px;opacity:0.6">(${NOTES_EN[noteIdx]})</span>`;
    key.onclick = () => playNote(noteIdx, 4);
    container.appendChild(key);
  });

  const formulaRow = document.getElementById('scaleFormula');
  formulaRow.innerHTML = '';
  const labels = formula.map(s => s===2?'T':'S');
  labels.forEach((l, i) => {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.style.cssText = 'color:var(--text3);font-size:12px';
      arrow.textContent = '→';
      formulaRow.appendChild(arrow);
    }
    const span = document.createElement('span');
    span.className = `formula-step ${l}`;
    span.textContent = l;
    formulaRow.appendChild(span);
  });

  const relDiv = document.getElementById('relativeInfo');
  if (currentScaleType === 'major') {
    const relIdx = getRelativeMinor(currentRoot);
    relDiv.innerHTML = `<span class="relative-badge">Relative mineure : ${NOTES_FR_SHORT[relIdx]}m (${NOTES_EN[relIdx]}m)</span>`;
  } else if (currentScaleType === 'natural_minor') {
    const relIdx = getRelativeMajor(currentRoot);
    relDiv.innerHTML = `<span class="relative-badge">Relative majeure : ${NOTES_FR_SHORT[relIdx]} (${NOTES_EN[relIdx]})</span>`;
  } else {
    relDiv.innerHTML = '';
  }
}

function playCurrentScale() {
  const scale = buildScale(currentRoot, SCALE_FORMULAS[currentScaleType]);
  playScale(scale);
}

// =====================
// ACCORDS
// =====================
const CHORD_ROOT_MAP = {
  'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,
  'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
};

function chordNameToNotes(chordStr) {
  let root = chordStr.match(/^[A-G][#b]?/)?.[0] || 'C';
  const rootIdx = CHORD_ROOT_MAP[root] ?? 0;
  const suffix = chordStr.slice(root.length).replace('/','').replace(/[A-G][#b]?$/,'');
  let intervals = [0,4,7];
  if (suffix.includes('m7b5'))                                   intervals = [0,3,6,10];
  else if (suffix.includes('maj7'))                              intervals = [0,4,7,11];
  else if (suffix.includes('m7') || (suffix.startsWith('m') && suffix.includes('7'))) intervals = [0,3,7,10];
  else if (suffix.match(/^7/))                                   intervals = [0,4,7,10];
  else if (suffix.startsWith('m'))                               intervals = [0,3,7];
  else if (suffix.includes('dim'))                               intervals = [0,3,6];
  else if (suffix.includes('aug'))                               intervals = [0,4,8];
  return intervals.map(i => (rootIdx + i) % 12);
}

const EN_TO_FR_ROOT = {
  'C':'Do','C#':'Do#','Db':'Ré♭','D':'Ré','D#':'Ré#','Eb':'Mi♭',
  'E':'Mi','F':'Fa','F#':'Fa#','Gb':'Sol♭','G':'Sol','G#':'Sol#',
  'Ab':'La♭','A':'La','A#':'La#','Bb':'Si♭','B':'Si'
};

function chordToFR(chordStr) {
  const slashIdx = chordStr.lastIndexOf('/');
  let main = chordStr, bass = '';
  if (slashIdx > 0) { main = chordStr.slice(0, slashIdx); bass = chordStr.slice(slashIdx+1); }
  const rootMatch = main.match(/^([A-G][#b]?)(.*)/);
  if (!rootMatch) return chordStr;
  const frRoot = EN_TO_FR_ROOT[rootMatch[1]] || rootMatch[1];
  const suffix = rootMatch[2];
  const bassStr = bass ? '/' + (EN_TO_FR_ROOT[bass] || bass) : '';
  return `${frRoot}${suffix}${bassStr} <span style="font-size:10px;opacity:0.55">(${chordStr})</span>`;
}

function buildChords() {
  const content = document.getElementById('chordsContent');
  Object.entries(CHORD_DATA).forEach(([style, progressions]) => {
    const cat = document.createElement('div');
    cat.className = 'chord-category';
    cat.innerHTML = `<div class="category-label">${style}</div>`;
    progressions.forEach(prog => {
      const card = document.createElement('div');
      card.className = 'progression-card';
      const chordsHtml = prog.chords.map((c,i) =>
        `<span class="prog-chord ${i===0?'root-chord':''}">${chordToFR(c)}</span>`
      ).join('');
      card.innerHTML = `
        <div class="prog-name">${prog.name}</div>
        <div class="roman-nums">${prog.roman}</div>
        <div class="prog-chords">${chordsHtml}</div>
        <div class="prog-examples">${prog.examples}</div>
        <button class="play-btn" onclick='playProgression(${JSON.stringify(prog.chords)})'>▶ Écouter</button>`;
      cat.appendChild(card);
    });
    content.appendChild(cat);
  });
}

function playProgression(chords) {
  chords.forEach((chord, i) => {
    setTimeout(() => playChord(chordNameToNotes(chord), 4, 1.2), i * 900);
  });
}

// =====================
// QUIZ
// =====================
let quizType = 'notes';
let quizCorrect = 0, quizTotal = 0, quizStreak = 0;
let quizActive = false;
let correctAnswer = '';

function setQuizType(type) {
  quizType = type;
  document.querySelectorAll('[id^="qt-"]').forEach(b => b.classList.remove('active'));
  document.getElementById(`qt-${type}`).classList.add('active');
  nextQuestion();
}

function shuffle(arr) { return [...arr].sort(() => Math.random()-0.5); }
function pick(arr, n)  { return shuffle(arr).slice(0, n); }

function generateQuestion() {
  if (quizType === 'notes') {
    const i = Math.floor(Math.random()*12);
    const correct = `${NOTES_FR_SHORT[i]} (${NOTES_EN[i]})`;
    const allOpts = NOTES_EN.map((en,j) => `${NOTES_FR_SHORT[j]} (${en})`);
    return {
      question: `Note anglaise : "${NOTES_EN[i]}"`,
      sub: 'Quel est le nom de cette note ?',
      correct,
      options: shuffle([correct, ...pick(allOpts.filter(o => o !== correct), 3)]),
    };
  }
  if (quizType === 'intervals') {
    const iv = INTERVALS[Math.floor(Math.random()*INTERVALS.length)];
    return {
      question: `Distance : ${iv.semitones} demi-ton${iv.semitones>1?'s':''}`,
      sub: 'Quel est cet intervalle ?',
      correct: iv.name,
      options: shuffle([iv.name, ...pick(INTERVALS.filter(i => i.name !== iv.name).map(i => i.name), 3)]),
    };
  }
  if (quizType === 'scales') {
    const noteIdx = Math.floor(Math.random()*12);
    const type = pick(['major','natural_minor'], 1)[0];
    const scale = buildScale(noteIdx, SCALE_FORMULAS[type]);
    const correct = scale.map(n => `${NOTES_FR_SHORT[n]}(${NOTES_EN[n]})`).join(' – ');
    const wrongs = [];
    while (wrongs.length < 3) {
      const wr = Math.floor(Math.random()*12);
      const wt = pick(['major','natural_minor'], 1)[0];
      const ws = buildScale(wr, SCALE_FORMULAS[wt]).map(n => `${NOTES_FR_SHORT[n]}(${NOTES_EN[n]})`).join(' – ');
      if (ws !== correct && !wrongs.includes(ws)) wrongs.push(ws);
    }
    return {
      question: `Gamme ${NOTES_FR_SHORT[noteIdx]} (${NOTES_EN[noteIdx]}) ${type==='major'?'Majeure':'Mineure naturelle'}`,
      sub: 'Quelles sont les bonnes notes ?',
      correct,
      options: shuffle([correct, ...wrongs]),
    };
  }
  if (quizType === 'chords') {
    const allProgs = Object.values(CHORD_DATA).flat();
    const prog = allProgs[Math.floor(Math.random()*allProgs.length)];
    const correct = prog.chords.map(c => chordToFR(c).replace(/<[^>]+>/g,'')).join(' – ');
    const others = pick(
      allProgs.filter(p => p.name !== prog.name)
              .map(p => p.chords.map(c => chordToFR(c).replace(/<[^>]+>/g,'')).join(' – ')),
      3
    );
    return {
      question: prog.name,
      sub: 'Quelle est cette progression ?',
      correct,
      options: shuffle([correct, ...others]),
    };
  }
}

function nextQuestion() {
  if (!quizType) return;
  const q = generateQuestion();
  correctAnswer = q.correct;
  quizActive = true;

  document.getElementById('quizQuestion').textContent = q.question;
  document.getElementById('quizSub').textContent = q.sub;
  document.getElementById('quizResult').textContent = '';
  document.getElementById('quizResult').className = 'quiz-result';
  document.getElementById('quizNextBtn').style.display = 'none';

  const optDiv = document.getElementById('quizOptions');
  optDiv.style.display = 'grid';
  optDiv.innerHTML = '';
  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.onclick = () => answerQuestion(opt, btn, optDiv);
    optDiv.appendChild(btn);
  });
}

function answerQuestion(answer, btn, optDiv) {
  if (!quizActive) return;
  quizActive = false;
  quizTotal++;
  document.getElementById('scoreTotal').textContent = quizTotal;

  if (answer === correctAnswer) {
    btn.classList.add('correct');
    quizCorrect++;
    quizStreak++;
    document.getElementById('quizResult').textContent = '✓ Bonne réponse !';
    document.getElementById('quizResult').className = 'quiz-result correct-msg';
  } else {
    btn.classList.add('wrong');
    quizStreak = 0;
    optDiv.querySelectorAll('.quiz-opt').forEach(b => {
      if (b.textContent === correctAnswer) b.classList.add('correct');
    });
    document.getElementById('quizResult').textContent = `✗ La bonne réponse était : ${correctAnswer}`;
    document.getElementById('quizResult').className = 'quiz-result wrong-msg';
  }
  document.getElementById('scoreCorrect').textContent = quizCorrect;
  document.getElementById('scoreStreak').textContent = quizStreak;
  document.getElementById('quizNextBtn').style.display = 'block';
}

function resetQuiz() {
  quizCorrect = 0; quizTotal = 0; quizStreak = 0;
  document.getElementById('scoreCorrect').textContent = '0';
  document.getElementById('scoreTotal').textContent = '0';
  document.getElementById('scoreStreak').textContent = '0';
  document.getElementById('quizOptions').style.display = 'none';
  document.getElementById('quizNextBtn').style.display = 'none';
  document.getElementById('quizResult').textContent = '';
  document.getElementById('quizQuestion').textContent = 'Score réinitialisé !';
  document.getElementById('quizSub').textContent = 'Choisis un type de quiz pour continuer';
}

// =====================
// NAVIGATION
// =====================
const SECTION_LABELS = {
  keys:'Clavier', intervals:'Intervalles', scales:'Gammes', chords:'Accords', quiz:'Quiz'
};

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`btn-${name}`).classList.add('active');
  document.getElementById('modLabel').textContent = SECTION_LABELS[name];
}

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  buildPiano();
  buildIntervals();
  buildRootSelector();
  renderScale();
  buildChords();
});
