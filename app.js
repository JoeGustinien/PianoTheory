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
// THÉORIE
// =====================

const DEGREES = [
  { num:'I',   name:'Tonique',          role:'repos',    color:'accent',   desc:'Le "chez soi". Point de départ et d\'arrivée. Toute tension finit ici.', example:'Do (C) dans Do Majeur' },
  { num:'II',  name:'Sus-tonique',      role:'tension',  color:'purple',   desc:'Peu stable. Conduit naturellement vers la dominante ou la sous-dominante.', example:'Ré (D) dans Do Majeur' },
  { num:'III', name:'Médiante',         role:'couleur',  color:'purple',   desc:'Donne la couleur majeure ou mineure à la tonalité. Accord de passage.', example:'Mi (E) dans Do Majeur' },
  { num:'IV',  name:'Sous-dominante',   role:'tension',  color:'blue',     desc:'Crée une douce tension. Souvent avant la dominante ou la tonique. Base du blues.', example:'Fa (F) dans Do Majeur' },
  { num:'V',   name:'Dominante',        role:'tension',  color:'red',      desc:'Tension maximum ! Veut absolument retourner à la tonique. Le moteur de la musique tonale.', example:'Sol (G) dans Do Majeur' },
  { num:'VI',  name:'Sus-dominante',    role:'repos',    color:'teal',     desc:'Repos relatif, teinte émotionnelle. Base des progressions mineures en pop.', example:'La (A) dans Do Majeur' },
  { num:'VII', name:'Sensible',         role:'tension',  color:'red',      desc:'Note sensible : un demi-ton sous la tonique. Tension extrême vers le I.', example:'Si (B) dans Do Majeur' },
];

const CADENCES = [
  {
    name: 'Cadence parfaite',
    chords: 'V → I',
    feel: 'Conclusion totale',
    color: 'success',
    desc: 'La cadence la plus forte. La dominante résout sur la tonique. C\'est la ponctuation finale d\'une phrase musicale — comme un point.',
    example: 'Sol7 → Do (G7 → C)',
    usage: 'Fins de morceaux, fins de couplets, résolutions dramatiques',
  },
  {
    name: 'Cadence imparfaite',
    chords: 'I → V',
    feel: 'Suspension, attente',
    color: 'warning',
    desc: 'On part de la tonique vers la dominante. Crée une attente, une question sans réponse. Parfait pour terminer un couplet avant un refrain.',
    example: 'Do → Sol (C → G)',
    usage: 'Fins de couplets, transitions, créer de la tension',
  },
  {
    name: 'Cadence plagale',
    chords: 'IV → I',
    feel: 'Amen, sérénité',
    color: 'info',
    desc: 'Appelée "cadence Amen" car très utilisée dans les hymnes religieux. Douce et conclusive, moins dramatique que la parfaite.',
    example: 'Fa → Do (F → C)',
    usage: 'Gospel, musique sacrée, fins douces en pop/folk',
  },
  {
    name: 'Cadence rompue',
    chords: 'V → VI',
    feel: 'Surprise, émotion',
    color: 'accent',
    desc: 'On attend le I mais on arrive sur le VI. Effet de surprise émotionnelle très puissant. L\'oreille est "trompée" de façon agréable.',
    example: 'Sol → Lam (G → Am)',
    usage: 'Moments émotionnels forts, éviter une conclusion trop prévisible',
  },
];

const CHORD_CONSTRUCTION = [
  {
    name: 'Accord majeur',
    formula: '1 – 3M – 5J',
    intervals: [0, 4, 7],
    semitones: '0 + 4 + 3',
    color: 'accent',
    feel: 'Joyeux, lumineux, stable',
    example: 'Do (C) : Do – Mi – Sol',
  },
  {
    name: 'Accord mineur',
    formula: '1 – 3m – 5J',
    intervals: [0, 3, 7],
    semitones: '0 + 3 + 4',
    color: 'purple',
    feel: 'Mélancolique, profond, sombre',
    example: 'Lam (Am) : La – Do – Mi',
  },
  {
    name: 'Accord de 7ème dominante',
    formula: '1 – 3M – 5J – 7m',
    intervals: [0, 4, 7, 10],
    semitones: '0 + 4 + 3 + 3',
    color: 'red',
    feel: 'Tension maximale, veut résoudre',
    example: 'Sol7 (G7) : Sol – Si – Ré – Fa',
  },
  {
    name: 'Accord maj7',
    formula: '1 – 3M – 5J – 7M',
    intervals: [0, 4, 7, 11],
    semitones: '0 + 4 + 3 + 4',
    color: 'teal',
    feel: 'Doux, sophistiqué, jazz/soul',
    example: 'Domaj7 (Cmaj7) : Do – Mi – Sol – Si',
  },
  {
    name: 'Accord mineur 7',
    formula: '1 – 3m – 5J – 7m',
    intervals: [0, 3, 7, 10],
    semitones: '0 + 3 + 4 + 3',
    color: 'blue',
    feel: 'Coloré, jazz, mélancolie douce',
    example: 'Rém7 (Dm7) : Ré – Fa – La – Do',
  },
  {
    name: 'Accord diminué',
    formula: '1 – 3m – 5dim',
    intervals: [0, 3, 6],
    semitones: '0 + 3 + 3',
    color: 'coral',
    feel: 'Très instable, dissonant, dramatique',
    example: 'Sidim (Bdim) : Si – Ré – Fa',
  },
];

function buildTheory() {
  const content = document.getElementById('theoryContent');

  // Section 1 : construction des accords
  content.innerHTML += `<h2 class="theory-section-title">Construction des accords</h2>
  <div class="info-box">Tout accord se construit en <strong>empilant des tierces</strong> sur une note de base (la fondamentale). La nature de ces tierces (majeure = 4 demi-tons, mineure = 3) détermine la couleur de l'accord.</div>`;

  const grid = document.createElement('div');
  grid.className = 'theory-chord-grid';
  CHORD_CONSTRUCTION.forEach(chord => {
    const card = document.createElement('div');
    card.className = `theory-chord-card color-${chord.color}`;
    card.innerHTML = `
      <div class="theory-chord-name">${chord.name}</div>
      <div class="theory-chord-formula">${chord.formula}</div>
      <div class="theory-chord-semitones">${chord.semitones} demi-tons</div>
      <div class="theory-chord-feel">${chord.feel}</div>
      <div class="theory-chord-example">${chord.example}</div>
      <button class="play-btn" onclick="playChord([${chord.intervals.map(i=>`(0+${i})%12`).join(',')}], 4, 1.2)">▶ Écouter</button>`;
    grid.appendChild(card);
  });
  content.appendChild(grid);

  // Section 2 : degrés
  content.innerHTML += `<div class="divider"></div><h2 class="theory-section-title">Les degrés de la gamme</h2>
  <div class="info-box">Dans une tonalité, chaque note porte un <strong>rôle fonctionnel</strong>. C'est ce qui explique pourquoi certains accords créent de la tension et d'autres du repos.</div>`;

  const degGrid = document.createElement('div');
  degGrid.className = 'degree-grid';
  DEGREES.forEach(deg => {
    const card = document.createElement('div');
    card.className = `degree-card role-${deg.role}`;
    card.innerHTML = `
      <div class="degree-num">${deg.num}</div>
      <div class="degree-name">${deg.name}</div>
      <div class="degree-role-badge role-${deg.role}">${deg.role}</div>
      <div class="degree-desc">${deg.desc}</div>
      <div class="degree-example">${deg.example}</div>`;
    degGrid.appendChild(card);
  });
  content.appendChild(degGrid);

  // Section 3 : tension / repos
  content.innerHTML += `<div class="divider"></div><h2 class="theory-section-title">Tension & Repos</h2>
  <div class="info-box">La musique tonale fonctionne sur un cycle permanent : <strong>repos → tension → résolution</strong>. C'est ce mouvement qui crée l'émotion.</div>
  <div class="card" style="margin-bottom:14px">
    <div class="card-title">Les pôles</div>
    <div class="tension-diagram">
      <div class="tension-pole repos"><span class="pole-label">Repos</span><span class="pole-chords">I · VI</span></div>
      <div class="tension-arrow">⟷</div>
      <div class="tension-pole tension"><span class="pole-label">Tension</span><span class="pole-chords">V · VII · II</span></div>
    </div>
    <div style="font-size:13px;color:var(--text2);line-height:1.7;margin-top:12px">
      Le <strong>I</strong> est le pôle de repos absolu. Le <strong>V</strong> est le pôle de tension maximale — il contient le triton (Si–Fa dans Sol7 en Do majeur), l'intervalle le plus instable. L'oreille "veut" toujours entendre la résolution vers le I.
    </div>
  </div>`;

  // Section 4 : cadences
  content.innerHTML += `<div class="divider"></div><h2 class="theory-section-title">Les cadences</h2>
  <div class="info-box">Une <strong>cadence</strong> est une formule harmonique qui conclut (ou suspend) une phrase musicale. C'est la "ponctuation" de la musique.</div>`;

  CADENCES.forEach(cad => {
    const card = document.createElement('div');
    card.className = `cadence-card cadence-${cad.color}`;
    card.innerHTML = `
      <div class="cadence-header">
        <div>
          <div class="cadence-name">${cad.name}</div>
          <div class="cadence-chords">${cad.chords}</div>
        </div>
        <div class="cadence-feel-badge">${cad.feel}</div>
      </div>
      <div class="cadence-desc">${cad.desc}</div>
      <div class="cadence-example">${cad.example}</div>
      <div class="cadence-usage">${cad.usage}</div>`;
    content.appendChild(card);
  });
}

// =====================
// OREILLE
// =====================

let earLevel = 1; // 1=note, 2=intervalle, 3=accord
let earActive = false;
let earCorrect = 0, earTotal = 0, earStreak = 0;
let earAnswer = null;

function setEarLevel(lvl) {
  earLevel = lvl;
  [1,2,3].forEach(l => {
    const btn = document.getElementById(`el-${l}`);
    btn.classList.toggle('active', l === lvl);
    btn.classList.toggle('sel-btn', true);
  });
  resetEarRound();
  nextEarQuestion();
}

function resetEarRound() {
  earActive = false;
  earAnswer = null;
  document.getElementById('earResult').textContent = '';
  document.getElementById('earResult').className = 'quiz-result';
  document.getElementById('earOptions').innerHTML = '';
  document.getElementById('earPlayBtn').style.display = 'block';
  document.getElementById('earNextBtn').style.display = 'none';
  document.getElementById('earQuestion').textContent = levelPrompt();
  document.getElementById('earSub').textContent = levelSub();
}

function levelPrompt() {
  if (earLevel === 1) return 'Écoute et identifie la note';
  if (earLevel === 2) return 'Écoute et identifie l\'intervalle';
  return 'Écoute et identifie l\'accord';
}
function levelSub() {
  if (earLevel === 1) return 'Appuie sur ▶ pour entendre la note';
  if (earLevel === 2) return 'Deux notes jouent simultanément';
  return 'Un accord de 3 notes joue simultanément';
}

let currentEarData = null;

function nextEarQuestion() {
  earActive = false;
  document.getElementById('earResult').textContent = '';
  document.getElementById('earResult').className = 'quiz-result';
  document.getElementById('earNextBtn').style.display = 'none';
  document.getElementById('earOptions').innerHTML = '';

  if (earLevel === 1) {
    const noteIdx = Math.floor(Math.random() * 12);
    currentEarData = { type: 'note', noteIdx };
    document.getElementById('earQuestion').textContent = 'Quelle est cette note ?';
    document.getElementById('earSub').textContent = 'Appuie sur ▶ pour écouter';
    document.getElementById('earPlayBtn').style.display = 'block';

  } else if (earLevel === 2) {
    const root = Math.floor(Math.random() * 12);
    const iv = INTERVALS.filter(i => i.semitones > 0 && i.semitones <= 12)[Math.floor(Math.random() * 12)];
    currentEarData = { type: 'interval', root, interval: iv };
    document.getElementById('earQuestion').textContent = 'Quel est cet intervalle ?';
    document.getElementById('earSub').textContent = 'Deux notes jouent en même temps';
    document.getElementById('earPlayBtn').style.display = 'block';

  } else {
    const root = Math.floor(Math.random() * 12);
    const type = Math.random() < 0.5 ? 'major' : 'minor';
    currentEarData = { type: 'chord', root, chordType: type };
    document.getElementById('earQuestion').textContent = 'Majeur ou mineur ?';
    document.getElementById('earSub').textContent = 'Un accord de 3 notes joue';
    document.getElementById('earPlayBtn').style.display = 'block';
  }
}

function playEarSound() {
  if (!currentEarData) return;
  const d = currentEarData;

  if (d.type === 'note') {
    playNote(d.noteIdx, 4, 1.2);
  } else if (d.type === 'interval') {
    playNote(d.root, 4, 1.0);
    setTimeout(() => playNote((d.root + d.interval.semitones) % 12, 4, 1.0), 50);
  } else {
    const intervals = d.chordType === 'major' ? [0,4,7] : [0,3,7];
    intervals.forEach((st, i) => setTimeout(() => playNote((d.root + st) % 12, 4, 1.2), i * 30));
  }

  // Show options after first play
  if (document.getElementById('earOptions').innerHTML === '') {
    showEarOptions();
  }
}

function showEarOptions() {
  const optDiv = document.getElementById('earOptions');
  optDiv.innerHTML = '';
  let options = [];
  let correct = '';

  if (currentEarData.type === 'note') {
    correct = `${NOTES_FR_SHORT[currentEarData.noteIdx]} (${NOTES_EN[currentEarData.noteIdx]})`;
    const all = NOTES_EN.map((en,i) => `${NOTES_FR_SHORT[i]} (${en})`);
    options = shuffle([correct, ...pick(all.filter(o => o !== correct), 3)]);
  } else if (currentEarData.type === 'interval') {
    correct = currentEarData.interval.name;
    const allNames = INTERVALS.filter(i => i.semitones > 0 && i.semitones <= 12).map(i => i.name);
    options = shuffle([correct, ...pick(allNames.filter(n => n !== correct), 3)]);
  } else {
    correct = currentEarData.chordType === 'major' ? 'Majeur' : 'Mineur';
    options = ['Majeur', 'Mineur'];
  }

  earAnswer = correct;
  earActive = true;

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.onclick = () => answerEar(opt, btn, optDiv);
    optDiv.appendChild(btn);
  });
}

function answerEar(answer, btn, optDiv) {
  if (!earActive) return;
  earActive = false;
  earTotal++;
  document.getElementById('earTotal').textContent = earTotal;

  if (answer === earAnswer) {
    btn.classList.add('correct');
    earCorrect++;
    earStreak++;
    document.getElementById('earResult').textContent = '✓ Bonne oreille !';
    document.getElementById('earResult').className = 'quiz-result correct-msg';
  } else {
    btn.classList.add('wrong');
    earStreak = 0;
    optDiv.querySelectorAll('.quiz-opt').forEach(b => {
      if (b.textContent === earAnswer) b.classList.add('correct');
    });
    document.getElementById('earResult').textContent = `✗ C'était : ${earAnswer}`;
    document.getElementById('earResult').className = 'quiz-result wrong-msg';
  }
  document.getElementById('earCorrect').textContent = earCorrect;
  document.getElementById('earStreak').textContent = earStreak;
  document.getElementById('earNextBtn').style.display = 'block';
  document.getElementById('earPlayBtn').style.display = 'block';
}

function resetEarScore() {
  earCorrect = 0; earTotal = 0; earStreak = 0;
  document.getElementById('earCorrect').textContent = '0';
  document.getElementById('earTotal').textContent = '0';
  document.getElementById('earStreak').textContent = '0';
  nextEarQuestion();
}
const SECTION_LABELS = {
  keys:'Clavier', intervals:'Intervalles', scales:'Gammes', chords:'Accords', theory:'Théorie', ear:'Oreille', quiz:'Quiz'
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
  buildTheory();
  nextEarQuestion();
});
