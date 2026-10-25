/* ================= Звук: мягкое пианино на Web Audio ================= */

const Piano = (() => {
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  let ctx = null;
  let master, dry, reverb;
  let timers = [];

  function midi(name) {
    const m = name.match(/^([A-G]#?)(\d)$/);
    return (parseInt(m[2], 10) + 1) * 12 + NAMES.indexOf(m[1]);
  }
  function nameOf(m) {
    return NAMES[m % 12] + (Math.floor(m / 12) - 1);
  }
  function freq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  // Тихий WAV-цикл: пока играет <audio>, iOS считает страницу «медиа»
  // и не глушит Web Audio беззвучным режимом (переключатель сбоку)
  function silentWav() {
    const n = 4410;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  let keepAlive = null;
  function unlockMediaChannel() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback'; // iOS 17+
    } catch (e) {}
    if (!keepAlive) {
      keepAlive = document.createElement('audio');
      keepAlive.setAttribute('playsinline', '');
      keepAlive.loop = true;
      keepAlive.src = silentWav();
    }
    if (keepAlive.paused) {
      const p = keepAlive.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // на iOS бывает не только 'suspended', но и 'interrupted' (после блокировки/звонка)
  function resume() {
    if (ctx && ctx.state !== 'running') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  }

  // Вызывается по нажатию — нужно для iPhone (Safari не даёт звук без касания)
  function init() {
    unlockMediaChannel();
    if (ctx) {
      resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    resume();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);

    dry = ctx.createGain();
    dry.gain.value = 0.85;
    dry.connect(master);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    reverb.connect(wet);
    wet.connect(master);

    // «Разблокировка» звука на iOS
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  }

  // Одна нота. note — 'C4' или номер midi, dur — секунды, vel — громкость 0..1
  function play(note, dur = 0.6, vel = 0.8, when = 0) {
    if (!ctx) init();
    else resume();
    const m = typeof note === 'number' ? note : midi(note);
    const f = freq(m);
    const t = ctx.currentTime + when + 0.005;
    const hold = Math.max(dur, 0.4);
    // высокие ноты чуть тише, низкие — чуть громче
    const v = vel * (1.15 - Math.min(Math.max((m - 60) / 30, 0), 1) * 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(f * 9, 14000), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(f * 2.2, 500), t + 1.4);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(v * 0.34, t + 0.008);
    out.gain.exponentialRampToValueAtTime(v * 0.13, t + 0.35);
    out.gain.exponentialRampToValueAtTime(v * 0.07, t + hold);
    out.gain.exponentialRampToValueAtTime(0.0001, t + hold + 1.1);

    filter.connect(out);
    out.connect(dry);
    out.connect(reverb);

    const partials = [
      [1, 1, 'triangle'],
      [2, 0.34, 'sine'],
      [3, 0.1, 'sine'],
      [4, 0.05, 'sine'],
    ];
    partials.forEach(([mult, amp, type]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 5;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g);
      g.connect(filter);
      o.start(t);
      o.stop(t + hold + 1.2);
    });
  }

  // Волшебный перелив (старт и финал)
  function chime() {
    ['C5', 'E5', 'G5', 'B5', 'C6', 'E6'].forEach((n, i) => play(n, 0.9, 0.45, i * 0.07));
  }

  // Проиграть мелодию. onNote(i, note, seconds) — для подсветки клавиш
  function playSequence(notes, bpm, opts = {}) {
    stopSequence();
    const beat = 60 / bpm;
    const vel = opts.vel ?? 0.7;
    let time = opts.delay ?? 0;
    notes.forEach((n, i) => {
      const secs = n.dur * beat;
      const at = time;
      timers.push(setTimeout(() => {
        play(n.midi, secs * 0.95, vel);
        if (opts.onNote) opts.onNote(i, n, secs);
      }, at * 1000));
      time += secs;
    });
    timers.push(setTimeout(() => opts.onEnd && opts.onEnd(), (time + 0.2) * 1000));
  }

  function stopSequence() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  // Любое касание страницы «будит» звук; после возврата во вкладку — тоже
  ['touchend', 'pointerdown', 'click', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, init, { capture: true, passive: true })
  );
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !ctx) return;
    resume();
    if (keepAlive && keepAlive.paused) keepAlive.play().catch(() => {});
  });

  return { init, play, chime, playSequence, stopSequence, midi, nameOf };
})();
