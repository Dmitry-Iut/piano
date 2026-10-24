/* ================= Игра: клавиатура, подсказки, прогресс ================= */

const Game = (() => {
  const RU = ['До', 'До♯', 'Ре', 'Ре♯', 'Ми', 'Фа', 'Фа♯', 'Соль', 'Соль♯', 'Ля', 'Ля♯', 'Си'];
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
  const $ = (id) => document.getElementById(id);

  const CHEERS = [
    [0.25, 'Как красиво звучит! 🎶'],
    [0.5, 'Половина пути — ты умничка 💛'],
    [0.75, 'Ещё чуть-чуть, почти готово ✨'],
  ];

  let song, pos, mistakes, finished, onFinish;
  let keyMap = {}, centers = {}, bubbles = new Map();
  let demoOn = false, idleTimer = null;
  let keysEl, laneEl, screenEl;

  function beatSec() {
    return 60 / song.bpm;
  }

  /* ---------- Клавиатура под диапазон мелодии ---------- */
  function buildKeyboard() {
    const midis = song.notes.map((n) => n.midi);
    let lo = Math.min(...midis), hi = Math.max(...midis);
    if (isBlack(lo)) lo--;
    if (isBlack(hi)) hi++;
    const whitesIn = (a, b) => { let c = 0; for (let m = a; m <= b; m++) if (!isBlack(m)) c++; return c; };
    let up = true;
    while (whitesIn(lo, hi) < 9) {
      if (up) { hi++; if (isBlack(hi)) hi++; } else { lo--; if (isBlack(lo)) lo--; }
      up = !up;
    }

    keysEl.innerHTML = '';
    keyMap = {};
    centers = {};
    const whites = [];
    for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
    const w = 100 / whites.length;

    whites.forEach((m, i) => {
      const el = document.createElement('div');
      el.className = 'key white';
      el.style.left = `calc(${i * w}% + 1px)`;
      el.style.width = `calc(${w}% - 2px)`;
      el.textContent = RU[m % 12];
      el.dataset.midi = m;
      keysEl.appendChild(el);
      keyMap[m] = el;
      centers[m] = (i + 0.5) * w;
    });
    for (let m = lo; m <= hi; m++) {
      if (!isBlack(m)) continue;
      const i = whites.indexOf(m - 1);
      const bw = w * 0.62;
      const el = document.createElement('div');
      el.className = 'key black';
      el.style.left = `${(i + 1) * w - bw / 2}%`;
      el.style.width = `${bw}%`;
      el.dataset.midi = m;
      keysEl.appendChild(el);
      keyMap[m] = el;
      centers[m] = (i + 1) * w;
    }
  }

  /* ---------- Пузырьки с нотами над клавишами ---------- */
  function renderBubbles() {
    const SHOW = 6;
    // убрать сыгранные
    for (const [idx, el] of bubbles) {
      if (idx < pos) {
        el.classList.remove('current');
        el.classList.add('pop');
        setTimeout(() => el.remove(), 400);
        bubbles.delete(idx);
      }
    }
    for (let i = 0; i < SHOW; i++) {
      const idx = pos + i;
      if (idx >= song.notes.length) break;
      const n = song.notes[idx];
      let el = bubbles.get(idx);
      if (!el) {
        el = document.createElement('div');
        el.className = 'bubble' + (isBlack(n.midi) ? ' sharp' : '');
        el.textContent = RU[n.midi % 12];
        el.style.left = `clamp(28px, ${centers[n.midi]}%, calc(100% - 28px))`;
        el.style.bottom = '100%';
        el.style.opacity = '0';
        laneEl.appendChild(el);
        el.getBoundingClientRect(); // применить стартовую позицию до перехода
        bubbles.set(idx, el);
      }
      el.classList.toggle('current', i === 0);
      el.style.bottom = `${8 + i * 15}%`;
      el.style.opacity = String(1 - i * 0.15);
    }
  }

  function clearBubbles() {
    bubbles.forEach((el) => el.remove());
    bubbles.clear();
    laneEl.innerHTML = '';
  }

  function highlightTarget() {
    Object.values(keyMap).forEach((k) => k.classList.remove('target'));
    if (!finished && pos < song.notes.length) keyMap[song.notes[pos].midi].classList.add('target');
  }

  function updateProgress() {
    const total = song.notes.length;
    $('progress-bar').style.width = `${(pos / total) * 100}%`;
    $('progress-text').textContent = `${pos}/${total}`;
  }

  function setHint(text) {
    $('game-hint').textContent = text;
  }

  function sparks(midi) {
    const x = centers[midi];
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = ['✦', '♪', '✧', '♫'][i % 4];
      s.style.left = x + '%';
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 90}px`);
      s.style.setProperty('--dy', `${-40 - Math.random() * 60}px`);
      laneEl.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  // Если долго не нажимает — тихо подсказать звуком нужную ноту
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (!finished && !demoOn && pos < song.notes.length) {
        Piano.play(song.notes[pos].midi, 0.4, 0.25);
        setHint('Подсказка: нажми светящуюся клавишу ✨');
      }
    }, 6000);
  }

  /* ---------- Нажатие ---------- */
  function press(midi) {
    if (finished) return;
    if (demoOn) stopDemo();
    const target = song.notes[pos];
    const key = keyMap[midi];

    if (midi === target.midi) {
      Piano.play(midi, target.dur * beatSec(), 0.85);
      sparks(midi);
      pos++;
      const ratio = pos / song.notes.length;
      const cheer = CHEERS.find(([r]) => Math.abs(ratio - r) < 0.5 / song.notes.length + 0.001);
      if (cheer) setHint(cheer[1]);
      updateProgress();
      renderBubbles();
      highlightTarget();
      armIdle();
      if (pos >= song.notes.length) {
        finished = true;
        clearTimeout(idleTimer);
        setHint('Браво! 🎉');
        setTimeout(() => onFinish(song, mistakes), 900);
      }
    } else {
      Piano.play(midi, 0.35, 0.4);
      mistakes++;
      key.classList.add('wrong');
      setTimeout(() => key.classList.remove('wrong'), 260);
      const cur = bubbles.get(pos);
      if (cur) {
        cur.classList.remove('shake');
        void cur.offsetWidth;
        cur.classList.add('shake');
      }
      setHint('Почти! Ищи светящуюся клавишу ✨');
    }
  }

  function bindKeys() {
    keysEl.addEventListener('pointerdown', (e) => {
      const key = e.target.closest('.key');
      if (!key) return;
      e.preventDefault();
      Piano.init();
      key.classList.add('pressed');
      press(Number(key.dataset.midi));
    });
    const release = () => document.querySelectorAll('.key.pressed').forEach((k) => k.classList.remove('pressed'));
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  }

  /* ---------- «Послушать» ---------- */
  function startDemo() {
    Piano.init();
    demoOn = true;
    $('btn-listen').textContent = '⏹ Стоп';
    setHint('Слушай мелодию 🎧');
    Piano.playSequence(song.notes, song.bpm, {
      vel: 0.7,
      onNote: (i, n, secs) => {
        const k = keyMap[n.midi];
        k.classList.add('demo');
        setTimeout(() => k.classList.remove('demo'), Math.max(secs * 900, 150));
      },
      onEnd: () => stopDemo(true),
    });
  }

  function stopDemo(natural) {
    Piano.stopSequence();
    demoOn = false;
    document.querySelectorAll('.key.demo').forEach((k) => k.classList.remove('demo'));
    $('btn-listen').textContent = '🎧 Послушать';
    if (natural) setHint('А теперь сыграй сама 🎹');
  }

  /* ---------- Публичное ---------- */
  function init(finishCb) {
    keysEl = $('keys');
    laneEl = $('lane-inner');
    screenEl = $('screen-game');
    onFinish = finishCb;
    bindKeys();
    $('btn-listen').addEventListener('click', () => (demoOn ? stopDemo() : startDemo()));
    $('btn-restart').addEventListener('click', () => start(song));
  }

  function start(s) {
    stop();
    song = s;
    pos = 0;
    mistakes = 0;
    finished = false;
    screenEl.style.setProperty('--accent', song.c1);
    screenEl.style.setProperty('--accent2', song.c2);
    $('game-title').textContent = `${song.emoji} ${song.title}`;
    $('game-composer').textContent = song.composer;
    setHint('Нажимай светящуюся клавишу ✨');
    buildKeyboard();
    clearBubbles();
    updateProgress();
    renderBubbles();
    highlightTarget();
    armIdle();
  }

  function stop() {
    if (demoOn) stopDemo();
    clearTimeout(idleTimer);
  }

  return { init, start, stop };
})();
