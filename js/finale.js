/* ================= Финальные анимации (своя для каждой мелодии) ================= */

const Finale = (() => {
  let canvas, ctx, W = 0, H = 0;
  let raf = null, anim = null, animName = null;
  let t0 = 0, last = 0, cardShown = false, onReady = null;

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x) => Math.min(Math.max(x, 0), 1);
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function hex(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, k) {
    const A = hex(a), B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * clamp(k))).join(',')})`;
  }
  // Классическая формула сердца: x ∈ [-16;16], y ∈ [-12;17] (y вниз)
  function heart(t) {
    return {
      x: 16 * Math.pow(Math.sin(t), 3),
      y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    };
  }
  // Центр композиции — выше карточки с текстом
  const cx = () => W / 2;
  const cy = () => H * 0.36;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- 1. Рассвет (Григ) ---------------- */
  function sunrise() {
    const birds = Array.from({ length: 6 }, () => ({
      x: -rand(30, 400), y: rand(0.12, 0.34), s: rand(0.7, 1.2), v: rand(45, 75), ph: rand(0, 6),
    }));
    const motes = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), r: rand(1, 2.6), v: rand(0.01, 0.03), ph: rand(0, 6),
    }));
    function hill(base, amp, f, color, ph) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) {
        ctx.lineTo(x, base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 2) * amp * 0.4);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    }
    return {
      duration: 6,
      step(t, dt) {
        const k = ease(t / 5);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix('#1b1d4d', '#7cc6ff', k));
        g.addColorStop(0.55, mix('#5a3d7a', '#ffd3a8', k));
        g.addColorStop(1, mix('#b8607a', '#fff1c4', k));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const R = Math.min(W, H) * 0.11;
        const sx = W / 2, sy = H * (0.72 - 0.38 * k);
        const gl = ctx.createRadialGradient(sx, sy, R * 0.4, sx, sy, R * 5);
        gl.addColorStop(0, `rgba(255,232,160,${0.4 + 0.5 * k})`);
        gl.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.12);
        ctx.globalAlpha = 0.22 * k;
        ctx.fillStyle = '#fff6d0';
        for (let i = 0; i < 14; i++) {
          ctx.rotate(TAU / 14);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-R * 0.28, -R * 7);
          ctx.lineTo(R * 0.28, -R * 7);
          ctx.fill();
        }
        ctx.restore();

        ctx.fillStyle = '#fff4bd';
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, TAU);
        ctx.fill();

        hill(H * 0.66, 26, 0.006, mix('#2e3159', '#9cc3b0', k), 0.5);
        hill(H * 0.74, 22, 0.009, mix('#262a4d', '#78aa92', k), 2);
        hill(H * 0.84, 16, 0.012, mix('#1d2140', '#558a74', k), 4);

        motes.forEach((m) => {
          m.y -= m.v * dt;
          if (m.y < 0) m.y = 1;
          ctx.fillStyle = `rgba(255,248,210,${0.5 * k * (0.5 + 0.5 * Math.sin(t * 2 + m.ph))})`;
          ctx.beginPath();
          ctx.arc(m.x * W + Math.sin(t + m.ph) * 10, m.y * H, m.r, 0, TAU);
          ctx.fill();
        });

        if (t > 1.2) {
          ctx.strokeStyle = 'rgba(70,55,90,.75)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          birds.forEach((b) => {
            b.x += b.v * dt;
            if (b.x > W + 40) b.x = -40;
            const y = H * b.y + Math.sin(t * 2 + b.ph) * 8;
            const f = Math.sin(t * 8 + b.ph) * 6 * b.s;
            ctx.beginPath();
            ctx.moveTo(b.x - 11 * b.s, y - f);
            ctx.quadraticCurveTo(b.x - 4 * b.s, y - 2, b.x, y);
            ctx.quadraticCurveTo(b.x + 4 * b.s, y - 2, b.x + 11 * b.s, y - f);
            ctx.stroke();
          });
        }
      },
    };
  }

  /* ---------------- 2. Салют (Ода к радости) ---------------- */
  function fireworks() {
    const rockets = [], parts = [];
    let next = 0, launched = 0, first = true;
    function explode(r) {
      const n = r.heart ? 90 : 70;
      for (let i = 0; i < n; i++) {
        let vx, vy;
        if (r.heart) {
          const p = heart((i / n) * TAU);
          const s = rand(8.5, 9.5);
          vx = p.x * s; vy = p.y * s;
        } else {
          const a = rand(0, TAU), sp = rand(50, 230);
          vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
        }
        parts.push({ x: r.x, y: r.y, vx, vy, life: 1, hue: r.heart ? rand(330, 355) : r.hue + rand(-20, 20) });
      }
    }
    return {
      duration: 6.5,
      step(t, dt) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = first ? '#0c0a23' : 'rgba(12,10,35,0.22)';
        first = false;
        ctx.fillRect(0, 0, W, H);

        next -= dt;
        if (next <= 0) {
          next = (t < 6 ? 0.42 : 1.2) * rand(0.7, 1.3);
          rockets.push({
            x: rand(W * 0.15, W * 0.85), y: H, ty: rand(H * 0.14, H * 0.42),
            vy: -rand(H * 0.9, H * 1.15), hue: rand(0, 360), heart: launched % 4 === 3,
          });
          launched++;
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = rockets.length - 1; i >= 0; i--) {
          const r = rockets[i];
          r.y += r.vy * dt;
          ctx.fillStyle = `hsl(${r.hue},100%,80%)`;
          ctx.beginPath();
          ctx.arc(r.x, r.y, 2.5, 0, TAU);
          ctx.fill();
          if (r.y <= r.ty) { explode(r); rockets.splice(i, 1); }
        }
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.vx *= 0.985; p.vy = p.vy * 0.985 + 55 * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.life -= dt * 0.55;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
          ctx.fillStyle = `hsla(${p.hue},100%,68%,${p.life})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, TAU);
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      },
    };
  }

  /* ---------------- 3. Ночь → утро (Колыбельная) ---------------- */
  function lullaby() {
    const stars = Array.from({ length: 170 }, () => ({
      x: Math.random(), y: Math.random() * 0.8, r: rand(0.5, 1.8), ph: rand(0, 6), d: rand(0, 2.5),
    }));
    const clouds = Array.from({ length: 4 }, () => ({ x: Math.random(), y: rand(0.4, 0.6), s: rand(0.8, 1.4), v: rand(0.008, 0.02) }));
    const shoot = [];
    let ns = 0.8;
    return {
      duration: 7,
      step(t, dt) {
        const dawn = ease((t - 3.8) / 3);
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix('#0a0f30', '#27306e', dawn));
        g.addColorStop(0.6, mix('#1d2160', '#6b5aa8', dawn));
        g.addColorStop(1, mix('#2b2a6a', '#ffa8bd', dawn));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        stars.forEach((s) => {
          const a = clamp(t - s.d) * (0.5 + 0.5 * Math.sin(t * 2.2 + s.ph)) * (1 - 0.6 * dawn);
          ctx.fillStyle = `rgba(255,255,240,${a})`;
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
          ctx.fill();
        });

        // Луна-полумесяц
        const mr = Math.min(W, H) * 0.085, mx = W * 0.7, my = H * 0.2;
        const ma = ease(t / 1.8);
        const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 4);
        mg.addColorStop(0, `rgba(255,240,200,${0.35 * ma})`);
        mg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.globalAlpha = ma;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TAU);
        ctx.clip();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.92, 0, TAU);
        ctx.fillStyle = '#fff3cc';
        ctx.fill('evenodd');
        ctx.restore();

        // Облака
        clouds.forEach((c) => {
          c.x += c.v * dt;
          if (c.x > 1.3) c.x = -0.3;
          const x = c.x * W, y = c.y * H, s = 40 * c.s;
          ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.12 * dawn})`;
          [[0, 0, 1], [-0.9, 0.2, 0.7], [0.9, 0.2, 0.75], [0.3, -0.4, 0.7]].forEach(([dx, dy, r]) => {
            ctx.beginPath();
            ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
            ctx.fill();
          });
        });

        // Падающие звёзды
        ns -= dt;
        if (ns <= 0) {
          ns = rand(0.6, 1.4);
          shoot.push({ x: rand(0.3, 1.1) * W, y: rand(0, 0.35) * H, vx: -rand(320, 460), vy: rand(130, 200), life: 1 });
        }
        for (let i = shoot.length - 1; i >= 0; i--) {
          const s = shoot[i];
          s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt * 1.1;
          if (s.life <= 0) { shoot.splice(i, 1); continue; }
          const lg = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
          lg.addColorStop(0, `rgba(255,255,255,${s.life})`);
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18);
          ctx.stroke();
        }
      },
    };
  }

  /* ---------------- 4. Цветы (Весна) ---------------- */
  function spring() {
    const palette = ['#ff7eb6', '#ffb3d1', '#ffd166', '#c39bff', '#ff9f7a', '#ffffff'];
    const flowers = Array.from({ length: 9 }, (_, i) => ({
      x: (i + 0.5) / 9 + rand(-0.025, 0.025), h: rand(0.16, 0.36), d: rand(0, 2.2),
      color: pick(palette), petals: 5 + (i % 3), ph: rand(0, 6), size: rand(13, 22),
    }));
    function newPetal(anywhere) {
      return { x: Math.random(), y: anywhere ? Math.random() : -0.05, v: rand(0.05, 0.12), r: rand(0, 6), vr: rand(-2, 2), s: rand(4, 8), ph: rand(0, 6) };
    }
    const petals = Array.from({ length: 34 }, () => newPetal(true));
    return {
      duration: 6,
      step(t, dt) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#bfe6ff');
        g.addColorStop(0.7, '#ffeef6');
        g.addColorStop(1, '#fff7e8');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        const sg = ctx.createRadialGradient(W * 0.2, H * 0.1, 10, W * 0.2, H * 0.1, W * 0.6);
        sg.addColorStop(0, 'rgba(255,245,200,.9)');
        sg.addColorStop(1, 'rgba(255,245,200,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, W, H);

        const ground = H * 0.62;
        flowers.forEach((f) => {
          const gr = ease((t - f.d) / 1.6);
          if (gr <= 0) return;
          const bloom = ease((t - f.d - 1.1) / 1);
          const bx = f.x * W, by = ground + 8;
          const tx = bx + Math.sin(t * 1.2 + f.ph) * 6 * gr, ty = by - f.h * H * gr;
          ctx.strokeStyle = '#4f9a5e';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.quadraticCurveTo(bx + 14, (by + ty) / 2, tx, ty);
          ctx.stroke();
          if (gr > 0.5) {
            ctx.fillStyle = '#6cbf72';
            ctx.beginPath();
            ctx.ellipse(bx + 9, by - f.h * H * 0.35 * gr, 10 * gr, 4 * gr, -0.6, 0, TAU);
            ctx.fill();
          }
          if (bloom > 0) {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(t * 0.2 + f.ph);
            ctx.fillStyle = f.color;
            for (let j = 0; j < f.petals; j++) {
              ctx.rotate(TAU / f.petals);
              ctx.beginPath();
              ctx.ellipse(0, -f.size * 0.6 * bloom, f.size * 0.36 * bloom, f.size * 0.62 * bloom, 0, 0, TAU);
              ctx.fill();
            }
            ctx.fillStyle = '#ffcc4d';
            ctx.beginPath();
            ctx.arc(0, 0, f.size * 0.3 * bloom, 0, TAU);
            ctx.fill();
            ctx.restore();
          }
        });

        // Трава
        ctx.fillStyle = '#8fd18a';
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, ground + 6 + Math.sin(x * 0.05 + t) * 3);
        ctx.lineTo(W, H);
        ctx.fill();
        ctx.fillStyle = '#76c17a';
        ctx.fillRect(0, ground + 30, W, H);

        petals.forEach((p, i) => {
          p.y += p.v * dt;
          p.r += p.vr * dt;
          if (p.y > 1.05) petals[i] = newPetal(false);
          ctx.save();
          ctx.translate(p.x * W + Math.sin(t + p.ph) * 22, p.y * H);
          ctx.rotate(p.r);
          ctx.fillStyle = 'rgba(255,170,200,.85)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        });
      },
    };
  }

  /* ---------------- 5. Созвездие-сердце (Моцарт) ---------------- */
  function constellation() {
    const N = 18;
    const bg = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.4, 1.5), ph: rand(0, 6) }));
    function sparkle(x, y, r, a) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = a;
      const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 4);
      gl.addColorStop(0, 'rgba(255,220,150,.9)');
      gl.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(0, 0, r * 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const rr = i % 2 ? r * 0.35 : r * 1.6;
        const a2 = (i / 8) * TAU;
        ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
      }
      ctx.fill();
      ctx.restore();
    }
    return {
      duration: 6.5,
      step(t) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#110b2d');
        g.addColorStop(1, '#3d1f5e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        bg.forEach((s) => {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.sin(t * 1.6 + s.ph)})`;
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
          ctx.fill();
        });

        const sc = Math.min(W * 0.78, H * 0.42) / 34;
        const pts = Array.from({ length: N }, (_, i) => {
          const p = heart((i / N) * TAU);
          return { x: cx() + p.x * sc, y: cy() + (p.y - 2.5) * sc };
        });

        // Свечение внутри сердца
        const glowA = ease((t - 4.6) / 1);
        if (glowA > 0) {
          ctx.save();
          ctx.beginPath();
          pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
          ctx.closePath();
          const hg = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), sc * 18);
          hg.addColorStop(0, `rgba(255,120,170,${0.45 * glowA * (0.85 + 0.15 * Math.sin(t * 3))})`);
          hg.addColorStop(1, 'rgba(255,120,170,0)');
          ctx.fillStyle = hg;
          ctx.fill();
          ctx.restore();
        }

        // Линии созвездия
        ctx.strokeStyle = 'rgba(255,214,170,.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < N; k++) {
          const prog = clamp((t - 0.5 - k * 0.22) / 0.22);
          if (prog <= 0) break;
          const a = pts[k], b = pts[(k + 1) % N];
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + (b.x - a.x) * prog, a.y + (b.y - a.y) * prog);
        }
        ctx.stroke();

        pts.forEach((p, i) => {
          const a = ease((t - 0.3 - i * 0.22) / 0.3);
          if (a > 0) sparkle(p.x, p.y, 3 + Math.sin(t * 4 + i) * 0.8, a);
        });

        const ta = ease((t - 5) / 1);
        if (ta > 0) {
          ctx.save();
          ctx.globalAlpha = ta;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${Math.round(sc * 5.5)}px Comfortaa, sans-serif`;
          ctx.shadowColor = 'rgba(255,150,190,.9)';
          ctx.shadowBlur = 18;
          ctx.fillStyle = '#fff3e0';
          ctx.fillText('Лена', cx(), cy() + sc);
          ctx.restore();
        }
      },
    };
  }

  /* ---------------- 6. Бабочки (Менуэт) ---------------- */
  function butterflies() {
    const pal = [['#5ec8ff', '#c08bff'], ['#ff8fab', '#ffd166'], ['#7fdcb0', '#5ec8ff'], ['#c08bff', '#ff8fab'], ['#ffb36b', '#ff6fa5']];
    const bs = Array.from({ length: 12 }, () => ({
      bx: rand(0.1, 0.9), y: rand(1.05, 1.7), vy: rand(0.12, 0.2), ph: rand(0, 6), amp: rand(0.05, 0.14),
      s: rand(0.7, 1.25), c: pick(pal),
    }));
    const bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: rand(20, 70), ph: rand(0, 6) }));
    const dust = [];
    function wing(x, y, rx, ry, rot, c1, c2) {
      const g = ctx.createLinearGradient(0, -ry, rx, ry);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
      ctx.fill();
    }
    return {
      duration: 6.5,
      step(t, dt) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#fdeeff');
        g.addColorStop(1, '#d6efff');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        bokeh.forEach((b) => {
          ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.15 * Math.sin(t + b.ph)})`;
          ctx.beginPath();
          ctx.arc(b.x * W, b.y * H + Math.sin(t * 0.5 + b.ph) * 10, b.r, 0, TAU);
          ctx.fill();
        });

        for (let i = dust.length - 1; i >= 0; i--) {
          const d = dust[i];
          d.life -= dt;
          if (d.life <= 0) { dust.splice(i, 1); continue; }
          ctx.fillStyle = `rgba(255,200,120,${d.life})`;
          ctx.beginPath();
          ctx.arc(d.x, d.y += 12 * dt, 1.6, 0, TAU);
          ctx.fill();
        }

        bs.forEach((b) => {
          b.y -= b.vy * dt;
          if (b.y < -0.12) { b.y = 1.12; b.bx = rand(0.1, 0.9); }
          const X = (b.bx + Math.sin(t * 0.9 + b.ph) * b.amp) * W;
          const Y = b.y * H;
          const tilt = Math.cos(t * 0.9 + b.ph) * 0.35;
          const flap = 0.25 + 0.75 * Math.abs(Math.sin(t * 9 + b.ph));
          if (Math.random() < 0.3) dust.push({ x: X, y: Y + 8, life: 0.8 });
          ctx.save();
          ctx.translate(X, Y);
          ctx.rotate(tilt);
          ctx.scale(b.s, b.s);
          [-1, 1].forEach((side) => {
            ctx.save();
            ctx.scale(side * flap, 1);
            wing(10, -6, 11, 8, -0.5, b.c[0], b.c[1]);
            wing(8, 7, 7, 6, 0.5, b.c[1], b.c[0]);
            ctx.restore();
          });
          ctx.fillStyle = '#3d2f4f';
          ctx.beginPath();
          ctx.ellipse(0, 0, 2, 10, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#3d2f4f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -9); ctx.quadraticCurveTo(-3, -15, -6, -16);
          ctx.moveTo(0, -9); ctx.quadraticCurveTo(3, -15, 6, -16);
          ctx.stroke();
          ctx.restore();
        });
      },
    };
  }

  /* ---------------- 7. Сердце из лепестков роз (К Элизе) ---------------- */
  function roseHeart() {
    const colors = ['#ff4d6d', '#ff758f', '#ff8fa3', '#c9184a', '#ffb3c1'];
    const parts = Array.from({ length: 260 }, (_, i) => {
      const p = heart(rand(0, TAU));
      const k = i % 5 < 3 ? 1 : Math.sqrt(Math.random()) * 0.9;
      const a = rand(0, TAU);
      return {
        tx: p.x * k, ty: (p.y - 2.5) * k, sx: 0.5 + Math.cos(a) * rand(0.7, 1.2), sy: 0.5 + Math.sin(a) * rand(0.7, 1.2),
        d: rand(0, 1.4), r: rand(0, TAU), vr: rand(-1, 1), s: rand(4, 8), c: pick(colors),
      };
    });
    const embers = Array.from({ length: 30 }, () => ({ x: Math.random(), y: Math.random(), v: rand(0.02, 0.06), ph: rand(0, 6) }));
    return {
      duration: 6.5,
      step(t, dt) {
        const g = ctx.createRadialGradient(cx(), cy(), 10, cx(), cy(), Math.max(W, H));
        g.addColorStop(0, '#6a1230');
        g.addColorStop(1, '#16040d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        embers.forEach((e) => {
          e.y -= e.v * dt;
          if (e.y < 0) e.y = 1;
          ctx.fillStyle = `rgba(255,170,190,${0.3 + 0.3 * Math.sin(t * 2 + e.ph)})`;
          ctx.beginPath();
          ctx.arc(e.x * W + Math.sin(t + e.ph) * 12, e.y * H, 1.5, 0, TAU);
          ctx.fill();
        });

        const sc = Math.min(W * 0.8, H * 0.44) / 34;
        const beat = t > 3.2 ? 1 + 0.06 * Math.pow(Math.sin((t - 3.2) * 3), 8) : 1;
        parts.forEach((p) => {
          const k = ease((t - p.d) / 2);
          p.r += p.vr * dt;
          const x = p.sx * W + (cx() + p.tx * sc * beat - p.sx * W) * k;
          const y = p.sy * H + (cy() + p.ty * sc * beat - p.sy * H) * k;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.c;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        });

        const ta = ease((t - 4) / 1);
        if (ta > 0) {
          ctx.save();
          ctx.globalAlpha = ta;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = `700 ${Math.round(sc * 3.1)}px Comfortaa, sans-serif`;
          ctx.shadowColor = 'rgba(0,0,0,.45)';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#fff';
          ctx.fillText('Я тебя люблю', cx(), cy());
          ctx.restore();
        }
      },
    };
  }

  /* ---------------- ★ Главный финал: Маленький принц и роза встречают рассвет ---------------- */
  function littlePrince() {
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(), y: Math.random() * 0.75, r: rand(0.5, 1.8), ph: rand(0, 6),
    }));
    const smoke = [];
    const hearts = [];
    const dust = Array.from({ length: 45 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.8, 2.2), v: rand(0.01, 0.03), ph: rand(0, 6) }));
    const grass = Array.from({ length: 46 }, (_, i) => ({ a: -1.25 + (i / 45) * 2.5 + rand(-0.02, 0.02), h: rand(4, 9), ph: rand(0, 6) }));
    let shoot = { x: 0.95, y: 0.06, life: 1 };
    let nh = 0;

    function heartPath(x, y, s) {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const p = heart((i / 30) * TAU);
        ctx.lineTo(x + p.x * s, y + p.y * s);
      }
      ctx.fill();
    }

    // Принц: начало координат — у ступней, вверх — минус y, u — сотая часть роста
    function prince(u, t, k) {
      const wave = (i) => Math.sin(t * 4 - i * 0.55) * (3 + i * 0.9);
      // Хвост шарфа развевается на ветру
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      const top = [], bot = [];
      for (let i = 0; i <= 8; i++) {
        const x = (-4 - i * 6) * u;
        const w = (5 - i * 0.4) * u;
        const y = (-66 + i * 1.2 + wave(i)) * u;
        top.push([x, y - w / 2]);
        bot.push([x, y + w / 2]);
      }
      top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      bot.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.fill();

      // Ноги и сапожки
      ctx.fillStyle = '#7fae6b';
      ctx.fillRect(-7 * u, -28 * u, 5 * u, 26 * u);
      ctx.fillRect(2 * u, -28 * u, 5 * u, 26 * u);
      ctx.fillStyle = '#6b4a2f';
      ctx.beginPath();
      ctx.ellipse(-5 * u, -1.5 * u, 4.5 * u, 2.4 * u, 0, 0, TAU);
      ctx.ellipse(5 * u, -1.5 * u, 4.5 * u, 2.4 * u, 0, 0, TAU);
      ctx.fill();

      // Левая рука опущена
      ctx.strokeStyle = '#3f8a5a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 6 * u;
      ctx.beginPath();
      ctx.moveTo(-10 * u, -60 * u);
      ctx.lineTo(-15 * u, -40 * u);
      ctx.stroke();

      // Длинный зелёный камзол
      const cg = ctx.createLinearGradient(-20 * u, 0, 20 * u, 0);
      cg.addColorStop(0, '#2f7a4f');
      cg.addColorStop(0.6, '#4fa86c');
      cg.addColorStop(1, mix('#3f8a5a', '#9ad38a', k));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-10 * u, -66 * u);
      ctx.lineTo(10 * u, -66 * u);
      ctx.quadraticCurveTo(14 * u, -45 * u, 20 * u, -25 * u);
      ctx.quadraticCurveTo(0, -21 * u, -20 * u, -25 * u);
      ctx.quadraticCurveTo(-14 * u, -45 * u, -10 * u, -66 * u);
      ctx.fill();
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(-13 * u, -44 * u, 26 * u, 3 * u);
      ctx.fillStyle = '#f7e08a';
      [[-8, -62], [8, -62]].forEach(([x, y]) => {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rr = (i % 2 ? 1.1 : 2.6) * u, a = (i / 10) * TAU - Math.PI / 2;
          ctx.lineTo(x * u + Math.cos(a) * rr, y * u + Math.sin(a) * rr);
        }
        ctx.fill();
      });

      // Правая рука приветствует солнце
      const ang = 1.2 - 2 * k + Math.sin(t * 5) * 0.12 * k;
      const hx = 10 * u + Math.cos(ang) * 20 * u, hy = -60 * u + Math.sin(ang) * 20 * u;
      ctx.strokeStyle = '#4fa86c';
      ctx.beginPath();
      ctx.moveTo(10 * u, -60 * u);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.fillStyle = '#ffe2c6';
      ctx.beginPath();
      ctx.arc(hx, hy, 2.8 * u, 0, TAU);
      ctx.arc(-15 * u, -39 * u, 2.8 * u, 0, TAU);
      ctx.fill();

      // Узел шарфа
      ctx.fillStyle = '#ffc61a';
      ctx.beginPath();
      ctx.ellipse(0, -66 * u, 8 * u, 3.5 * u, 0, 0, TAU);
      ctx.fill();

      // Голова
      ctx.fillStyle = '#ffe2c6';
      ctx.beginPath();
      ctx.arc(0, -78 * u, 11 * u, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,140,150,.45)';
      ctx.beginPath();
      ctx.arc(-5 * u, -74.5 * u, 2.4 * u, 0, TAU);
      ctx.arc(7 * u, -74.5 * u, 2.4 * u, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4a3a30';
      ctx.beginPath();
      ctx.arc(-1.5 * u, -79 * u, 1.3 * u, 0, TAU);
      ctx.arc(5.5 * u, -79 * u, 1.3 * u, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#b5655a';
      ctx.lineWidth = 1.2 * u;
      ctx.beginPath();
      ctx.arc(2.5 * u, -75 * u, 3 * u, 0.25, Math.PI - 0.25);
      ctx.stroke();

      // Золотые волосы-вихры
      ctx.fillStyle = mix('#e0a92a', '#ffd84d', k);
      ctx.beginPath();
      ctx.moveTo(-11.5 * u, -79 * u);
      for (let i = 0; i <= 9; i++) {
        const a = Math.PI + (i / 9) * Math.PI;
        const rr = (i % 2 ? 11 : 17 + Math.sin(t * 3 + i) * 0.8) * u;
        ctx.lineTo(Math.cos(a) * rr, -80 * u + Math.sin(a) * rr);
      }
      ctx.lineTo(11.5 * u, -79 * u);
      ctx.quadraticCurveTo(0, -86 * u, -11.5 * u, -79 * u);
      ctx.fill();
    }

    // Роза под стеклянным колпаком; lift — колпак поднимается и тает
    function rose(u, t, bloom, lift) {
      const sway = Math.sin(t * 1.5) * 2 * u;
      ctx.strokeStyle = '#3f8a4a';
      ctx.lineWidth = 3 * u;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(4 * u, -20 * u, sway, -40 * u);
      ctx.stroke();
      ctx.fillStyle = '#5bb05e';
      ctx.beginPath();
      ctx.ellipse(5 * u, -16 * u, 6 * u, 2.6 * u, -0.6, 0, TAU);
      ctx.ellipse(-4 * u, -24 * u, 6 * u, 2.6 * u, 0.6, 0, TAU);
      ctx.fill();
      // Шипы
      ctx.fillStyle = '#2f6e3a';
      [[1.6, -10], [2.8, -30]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.moveTo(x * u, y * u);
        ctx.lineTo((x + 3) * u, (y - 1.5) * u);
        ctx.lineTo(x * u, (y - 3) * u);
        ctx.fill();
      });

      const s = (0.75 + 0.25 * bloom) * u;
      ctx.save();
      ctx.translate(sway, -44 * u);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22 * s);
      glow.addColorStop(0, `rgba(255,90,120,${0.35 * bloom})`);
      glow.addColorStop(1, 'rgba(255,90,120,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b5173b';
      ctx.beginPath();
      ctx.ellipse(-5 * s, 1 * s, 6 * s, 8 * s, -0.5, 0, TAU);
      ctx.ellipse(5 * s, 1 * s, 6 * s, 8 * s, 0.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8294f';
      ctx.beginPath();
      ctx.ellipse(0, 2 * s, 7.5 * s, 7 * s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff5576';
      ctx.beginPath();
      ctx.ellipse(-2.5 * s, -3 * s, 4.5 * s, 5.5 * s, -0.3, 0, TAU);
      ctx.ellipse(3 * s, -3.5 * s, 4.5 * s, 5.5 * s, 0.4, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#a0102f';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(0, -2 * s, 2.8 * s, 0.3, TAU - 0.6);
      ctx.stroke();
      ctx.fillStyle = '#4a9a4e';
      ctx.beginPath();
      ctx.moveTo(-7 * s, 6 * s);
      ctx.lineTo(0, 11 * s);
      ctx.lineTo(7 * s, 6 * s);
      ctx.lineTo(0, 8 * s);
      ctx.fill();
      ctx.restore();

      if (lift < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - lift;
        ctx.translate(0, -lift * 70 * u);
        ctx.beginPath();
        ctx.moveTo(-17 * u, 0);
        ctx.lineTo(-17 * u, -40 * u);
        ctx.quadraticCurveTo(-17 * u, -62 * u, 0, -62 * u);
        ctx.quadraticCurveTo(17 * u, -62 * u, 17 * u, -40 * u);
        ctx.lineTo(17 * u, 0);
        ctx.fillStyle = 'rgba(210,235,255,.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(235,248,255,.65)';
        ctx.lineWidth = 1.5 * u;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 2.5 * u;
        ctx.beginPath();
        ctx.moveTo(-11 * u, -10 * u);
        ctx.lineTo(-11 * u, -40 * u);
        ctx.quadraticCurveTo(-11 * u, -53 * u, -3 * u, -56 * u);
        ctx.stroke();
        ctx.fillStyle = 'rgba(235,248,255,.8)';
        ctx.beginPath();
        ctx.arc(0, -64 * u, 3 * u, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    function volcano(u, smoking, k) {
      ctx.fillStyle = mix('#3a2f4a', '#9a6a4a', k);
      ctx.beginPath();
      ctx.moveTo(-14 * u, 2 * u);
      ctx.lineTo(-5 * u, -14 * u);
      ctx.quadraticCurveTo(0, -16 * u, 5 * u, -14 * u);
      ctx.lineTo(14 * u, 2 * u);
      ctx.fill();
      ctx.fillStyle = smoking ? mix('#5a2a2a', '#ff8a4a', k) : mix('#2a2236', '#6a4a3a', k);
      ctx.beginPath();
      ctx.ellipse(0, -14.5 * u, 5 * u, 1.6 * u, 0, 0, TAU);
      ctx.fill();
    }

    return {
      duration: 9.5,
      step(t, dt) {
        const k = ease((t - 0.8) / 5.5);  // рассвет
        const R = Math.min(W * 0.42, H * 0.25);
        const pcx = W / 2, pcy = H * 0.56 + R;

        // Небо
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix('#070a26', '#4f7fd0', k));
        g.addColorStop(0.45, mix('#161a4a', '#c9a0d8', k));
        g.addColorStop(0.75, mix('#2a2160', '#ffc3a0', k));
        g.addColorStop(1, mix('#1a1640', '#ffe6b8', k));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        stars.forEach((s) => {
          const a = (0.45 + 0.45 * Math.sin(t * 2 + s.ph)) * (1 - 0.85 * k);
          ctx.fillStyle = `rgba(255,255,240,${a})`;
          ctx.beginPath();
          ctx.arc(s.x * W, s.y * H, s.r, 0, TAU);
          ctx.fill();
        });
        if (shoot.life > 0) {
          shoot.x -= 0.32 * dt; shoot.y += 0.12 * dt; shoot.life -= dt * 0.9;
          const x = shoot.x * W, y = shoot.y * H;
          const lg = ctx.createLinearGradient(x, y, x + 90, y - 34);
          lg.addColorStop(0, `rgba(255,255,255,${shoot.life})`);
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 90, y - 34);
          ctx.stroke();
        }

        // Солнце выходит из-за края планеты
        const sr = R * 0.3;
        const sx = pcx + R * 0.62, sy = pcy - R * 0.55 - (H * 0.3 + R * 0.2) * ease((t - 0.6) / 6);
        const gl = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 7);
        gl.addColorStop(0, `rgba(255,236,170,${0.3 + 0.6 * k})`);
        gl.addColorStop(1, 'rgba(255,190,120,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, 0, W, H);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(t * 0.1);
        ctx.globalAlpha = 0.2 * k;
        ctx.fillStyle = '#fff6d0';
        for (let i = 0; i < 16; i++) {
          ctx.rotate(TAU / 16);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-sr * 0.25, -sr * 8);
          ctx.lineTo(sr * 0.25, -sr * 8);
          ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = mix('#ff9a5a', '#fff4bd', k);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, TAU);
        ctx.fill();

        // Планета (астероид Б-612)
        const pg = ctx.createRadialGradient(pcx + R * 0.45, pcy - R * 0.55, R * 0.1, pcx, pcy, R * 1.05);
        pg.addColorStop(0, mix('#4a4a78', '#ffe2a0', k));
        pg.addColorStop(0.6, mix('#2c2c55', '#e0b070', k));
        pg.addColorStop(1, mix('#1a1838', '#9a6a5a', k));
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(pcx, pcy, R, 0, TAU);
        ctx.fill();
        ctx.fillStyle = mix('#232048', '#c99060', k);
        [[-0.3, 0.35, 0.12], [0.35, 0.55, 0.09], [-0.55, 0.7, 0.07], [0.1, 0.8, 0.1]].forEach(([dx, dy, r]) => {
          ctx.beginPath();
          ctx.ellipse(pcx + dx * R, pcy + dy * R * 0.6, r * R, r * R * 0.6, 0, 0, TAU);
          ctx.fill();
        });
        ctx.strokeStyle = `rgba(255,230,170,${0.75 * k})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pcx, pcy, R - 1, -Math.PI / 2 - 0.3, 0.4);
        ctx.stroke();

        const place = (a, fn) => {
          ctx.save();
          ctx.translate(pcx + Math.sin(a) * R, pcy - Math.cos(a) * R);
          ctx.rotate(a);
          fn();
          ctx.restore();
        };

        // Трава
        ctx.strokeStyle = mix('#2a3a4a', '#6fb36a', k);
        ctx.lineWidth = 1.6;
        grass.forEach((gr) => place(gr.a, () => {
          ctx.beginPath();
          ctx.moveTo(0, 1);
          ctx.lineTo(Math.sin(t * 2 + gr.ph) * 2, -gr.h);
          ctx.stroke();
        }));

        // Вулканы и дымок
        const vu = R / 100;
        place(-1.05, () => volcano(vu, true, k));
        place(1.1, () => volcano(vu * 0.8, false, k));
        if (Math.random() < dt * 3) smoke.push({ a: -1.05, h: 16, life: 1, dx: 0 });
        for (let i = smoke.length - 1; i >= 0; i--) {
          const p = smoke[i];
          p.h += 14 * dt; p.dx -= 6 * dt; p.life -= dt * 0.45;
          if (p.life <= 0) { smoke.splice(i, 1); continue; }
          place(p.a, () => {
            ctx.fillStyle = `rgba(230,220,230,${0.35 * p.life})`;
            ctx.beginPath();
            ctx.arc(p.dx * vu, -p.h * vu, (3 + (1 - p.life) * 6) * vu, 0, TAU);
            ctx.fill();
          });
        }

        // Роза и Маленький принц
        const lift = ease((t - 2.6) / 1.8);
        const bloom = ease((t - 3.2) / 2);
        place(0.34, () => rose(R * 0.4 / 50, t, bloom, lift));
        place(-0.28, () => prince(R * 0.8 / 100, t, ease((t - 3.8) / 1.5)));

        // Золотые пылинки в лучах
        dust.forEach((d) => {
          d.y -= d.v * dt;
          if (d.y < 0) d.y = 1;
          ctx.fillStyle = `rgba(255,240,190,${0.6 * k * (0.5 + 0.5 * Math.sin(t * 2 + d.ph))})`;
          ctx.beginPath();
          ctx.arc(d.x * W + Math.sin(t + d.ph) * 10, d.y * H, d.r, 0, TAU);
          ctx.fill();
        });

        // Сердечки между ними
        if (t > 5.2) {
          nh -= dt;
          if (nh <= 0) {
            nh = rand(0.45, 0.8);
            hearts.push({ x: pcx + R * rand(-0.05, 0.12), y: pcy - R * 1.35, vx: rand(-12, 12), life: 1, s: rand(0.35, 0.6) });
          }
        }
        for (let i = hearts.length - 1; i >= 0; i--) {
          const h = hearts[i];
          h.y -= 38 * dt; h.x += Math.sin(t * 2 + i) * 14 * dt + h.vx * dt; h.life -= dt * 0.35;
          if (h.life <= 0) { hearts.splice(i, 1); continue; }
          ctx.fillStyle = `rgba(255,110,150,${h.life * 0.9})`;
          heartPath(h.x, h.y, h.s * (R / 100) * (1.3 - 0.3 * h.life));
        }

        // Цитата
        const ta = ease((t - 6.2) / 1.4);
        if (ta > 0) {
          ctx.save();
          ctx.globalAlpha = ta;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = 'rgba(120,60,90,.55)';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#fffaf0';
          let fs = Math.round(Math.min(W * 0.065, 34));
          ctx.font = `700 ${fs}px Comfortaa, sans-serif`;
          const tw = ctx.measureText('Зорко одно лишь сердце').width;
          if (tw > W - 32) {
            fs = Math.floor(fs * (W - 32) / tw);
            ctx.font = `700 ${fs}px Comfortaa, sans-serif`;
          }
          ctx.fillText('Зорко одно лишь сердце', W / 2, H * 0.1);
          ctx.font = `500 ${Math.round(fs * 0.55)}px Comfortaa, sans-serif`;
          ctx.fillText('самого главного глазами не увидишь', W / 2, H * 0.1 + fs * 1.15);
          ctx.restore();
        }
      },
    };
  }

  const ANIMS = { sunrise, fireworks, lullaby, spring, constellation, butterflies, roseHeart, littlePrince };

  function loop(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    anim.step(t, dt);
    if (!cardShown && t >= anim.duration) {
      cardShown = true;
      onReady && onReady();
    }
    raf = requestAnimationFrame(loop);
  }

  function restart() {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
    anim = ANIMS[animName]();
    cardShown = false;
    t0 = last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function play(name, ready) {
    if (!canvas) {
      canvas = document.getElementById('finale-canvas');
      ctx = canvas.getContext('2d');
      window.addEventListener('resize', resize);
    }
    resize();
    animName = name;
    onReady = ready;
    restart();
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = null;
  }

  return { play, restart, stop };
})();
