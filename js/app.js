/* ================= Приложение: экраны, меню, финал ================= */

const App = (() => {
  const STORE = 'lena-morning-piano-v1';
  const $ = (id) => document.getElementById(id);
  let best = {};
  let current = null;
  let grandPending = false;  // все мелодии только что пройдены — после финала ждёт главный сюрприз
  let grandMode = false;

  try { best = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { best = {}; }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(best)); } catch (e) { /* приватный режим */ }
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  }

  /* ---------- Летающие ноты на фоне ---------- */
  function floatingNotes() {
    const box = $('floating-notes');
    const symbols = ['♪', '♫', '♩', '♬', '❤', '✦'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.textContent = symbols[i % symbols.length];
      s.style.left = `${Math.random() * 100}%`;
      s.style.setProperty('--s', `${14 + Math.random() * 18}px`);
      s.style.setProperty('--t', `${10 + Math.random() * 10}s`);
      s.style.setProperty('--delay', `${-Math.random() * 18}s`);
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
      box.appendChild(s);
    }
  }

  function starsText(n) {
    return '★'.repeat(n) + '☆'.repeat(3 - n);
  }

  /* ---------- Меню ---------- */
  function renderMenu() {
    const list = $('song-list');
    list.innerHTML = '';
    SONGS.forEach((s, i) => {
      const st = best[s.id] || 0;
      const card = document.createElement('button');
      card.className = 'song-card';
      card.style.animationDelay = `${i * 60}ms`;
      card.style.setProperty('--c1', s.c1);
      card.style.setProperty('--c2', s.c2);
      card.innerHTML = `
        <div class="song-icon">${s.emoji}</div>
        <div class="song-info">
          <h3>${s.title}</h3>
          <p>${s.composer}</p>
          <div class="chips"><span class="chip">${s.level}</span><span class="chip">${s.mood}</span><span class="chip">${s.notes.length} нот</span></div>
        </div>
        <div class="song-stars ${st ? '' : 'empty'}">${starsText(st)}</div>`;
      card.addEventListener('click', () => {
        Piano.init();
        current = s;
        Game.start(s);
        show('screen-game');
      });
      list.appendChild(card);
    });
    const done = SONGS.filter((s) => best[s.id]).length;
    $('menu-progress').textContent = `Сыграно ${done} из ${SONGS.length}`;
    $('all-done').classList.toggle('hidden', done < SONGS.length);
  }

  const allDone = () => SONGS.every((s) => best[s.id]);

  /* ---------- Главный финал: Маленький принц и роза ---------- */
  function playMorningTheme() {
    const morning = SONGS.find((s) => s.id === 'morning');
    Piano.playSequence(morning.notes, 72, { vel: 0.45, delay: 1.2 });
  }

  function grandFinale() {
    grandMode = true;
    grandPending = false;
    const total = SONGS.reduce((n, s) => n + (best[s.id] || 0), 0);
    $('fin-emoji').textContent = '🌹';
    $('fin-title').textContent = 'Ты сыграла все мелодии!';
    $('fin-stars').textContent = `★ ${total} из ${SONGS.length * 3}`;
    $('fin-wish').textContent = 'Маленький принц каждое утро встречал рассвет со своей розой. '
      + 'А я хочу встречать каждый рассвет с тобой. Ты — моя единственная роза во всей Вселенной 🌹';
    $('fin-score').textContent = '«Ты в ответе за тех, кого приручил» — А. де Сент-Экзюпери';
    $('fin-menu').textContent = 'К мелодиям ♪';

    const fin = $('finale');
    const card = $('finale-card');
    card.classList.remove('show');
    fin.classList.remove('card-ready');
    fin.classList.remove('hidden');

    Piano.init();
    Piano.chime();
    playMorningTheme();
    Finale.play('littlePrince', () => {
      card.classList.add('show');
      fin.classList.add('card-ready');
    });
  }

  /* ---------- Финал ---------- */
  function finish(song, mistakes) {
    const stars = mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1;
    const wasAllDone = allDone();
    best[song.id] = Math.max(best[song.id] || 0, stars);
    save();
    grandMode = false;
    grandPending = !wasAllDone && allDone();
    $('fin-menu').textContent = grandPending ? 'Главный сюрприз 🌅' : 'К мелодиям ♪';

    $('fin-emoji').textContent = song.emoji;
    $('fin-title').textContent = song.finTitle;
    $('fin-stars').textContent = starsText(stars);
    $('fin-wish').textContent = song.wish;
    $('fin-score').textContent = mistakes === 0
      ? 'Без единой ошибки — идеально!'
      : `Ошибок: ${mistakes} · нот сыграно: ${song.notes.length}`;

    const fin = $('finale');
    const card = $('finale-card');
    card.classList.remove('show');
    fin.classList.remove('card-ready');
    fin.classList.remove('hidden');

    Piano.chime();
    Piano.playSequence(song.notes, song.bpm, { vel: 0.45, delay: 0.9 });
    Finale.play(song.anim, () => {
      card.classList.add('show');
      fin.classList.add('card-ready');
    });
  }

  function closeFinale() {
    Finale.stop();
    Piano.stopSequence();
    $('finale').classList.add('hidden');
  }

  function bind() {
    $('btn-start').addEventListener('click', () => {
      Piano.init();
      Piano.chime();
      renderMenu();
      show('screen-menu');
    });
    $('btn-grand').addEventListener('click', grandFinale);
    $('btn-to-intro').addEventListener('click', () => show('screen-intro'));
    $('btn-back').addEventListener('click', () => {
      Game.stop();
      renderMenu();
      show('screen-menu');
    });
    $('fin-replay').addEventListener('click', () => {
      closeFinale();
      if (grandMode) { grandFinale(); return; }
      Game.start(current);
    });
    $('fin-menu').addEventListener('click', () => {
      closeFinale();
      if (grandPending) { grandFinale(); return; }
      renderMenu();
      show('screen-menu');
    });
    $('finale-canvas').addEventListener('click', () => {
      $('finale-card').classList.remove('show');
      $('finale').classList.remove('card-ready');
      Piano.chime();
      Finale.restart();
      if (grandMode) playMorningTheme();
    });
  }

  function init() {
    floatingNotes();
    const day = Math.floor(Date.now() / 86400000);
    $('daily-wish').textContent = DAILY_WISHES[day % DAILY_WISHES.length];
    Game.init(finish);
    bind();
    renderMenu();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);
