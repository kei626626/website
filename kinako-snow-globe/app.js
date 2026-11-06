(() => {
  'use strict';
  const canvas = document.querySelector('#snowCanvas');
  const globe = document.querySelector('#globe');
  const tutorial = document.querySelector('#tutorial');
  const permissionSheet = document.querySelector('#permissionSheet');
  const nextBtn = document.querySelector('#nextBtn');
  const skipBtn = document.querySelector('#skipBtn');
  const infoBtn = document.querySelector('#infoBtn');
  const shakeBtn = document.querySelector('#shakeBtn');
  const allowMotionBtn = document.querySelector('#allowMotionBtn');
  const touchOnlyBtn = document.querySelector('#touchOnlyBtn');
  const title = document.querySelector('#tutorialTitle');
  const text = document.querySelector('#tutorialText');
  const count = document.querySelector('#stepCount');
  const hint = document.querySelector('#hint');
  const ctx = canvas.getContext('2d', { alpha: true });

  const steps = [
    ['傾けてみよう', 'スマホを左右に傾けると、雪と金色の光が重力に合わせて動きます。'],
    ['振って雪を舞わせよう', '端末を軽く振ると、底に積もった雪がふわっと舞い上がります。'],
    ['指でも遊べます', '画面をなぞって粒子を動かせます。ボタンを押せば、いつでも雪が舞います。']
  ];
  let step = 0;
  let width = 0, height = 0, dpr = 1, radius = 0;
  let gx = 0, gy = 0.105;
  let pointer = null;
  let lastMotion = 0;
  const particles = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onboardingVersion = 'image-assets-v2';

  // Reset stale onboarding choices when the experience changes. Without this,
  // an older "touch only" choice can silently suppress both the tutorial and
  // the iOS motion-permission button after an update.
  if (localStorage.getItem('kinako-onboarding-version') !== onboardingVersion) {
    localStorage.removeItem('kinako-tutorial');
    localStorage.removeItem('kinako-motion');
    localStorage.setItem('kinako-onboarding-version', onboardingVersion);
  }

  function resize() {
    const box = globe.getBoundingClientRect();
    width = box.width; height = box.height; radius = width * .475;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    const total = reducedMotion ? 140 : 320;
    for (let i = 0; i < total; i++) {
      const type = i % 13 === 0 ? 'star' : i % 7 === 0 ? 'glow' : 'snow';
      const restX = width * (.18 + Math.random() * .64);
      const size = type === 'star' ? 2.2 + Math.random() * 1.8 :
        type === 'glow' ? 1.2 + Math.random() * 1.5 : .7 + Math.random() * 1.45;
      const inset = type === 'star' ? Math.random() * 10 :
        type === 'glow' ? Math.random() * 13 : Math.pow(Math.random(), .72) * 20;
      const p = {
        x: restX, y: 0, vx: 0, vy: 0, r: size,
        bound: type === 'star' ? size * 2.35 : type === 'glow' ? size * 4.2 : size,
        restX, inset, type,
        a: .5 + Math.random() * .5, twinkle: Math.random() * Math.PI * 2
      };
      const dx = p.x - width / 2;
      const limit = radius - p.bound - 2 - p.inset;
      p.y = height / 2 + Math.sqrt(Math.max(0, limit * limit - dx * dx)) - Math.random() * 4;
      particles.push(p);
    }
  }

  function drawStar(x, y, r, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.35); ctx.lineTo(r * .34, -r * .34);
    ctx.lineTo(r * 2.35, 0); ctx.lineTo(r * .34, r * .34);
    ctx.lineTo(0, r * 2.35); ctx.lineTo(-r * .34, r * .34);
    ctx.lineTo(-r * 2.35, 0); ctx.lineTo(-r * .34, -r * .34);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,195,36,${alpha})`;
    ctx.shadowBlur = 9; ctx.shadowColor = '#ffd34e'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, Math.max(.55, r * .22), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${Math.min(1, alpha + .2)})`; ctx.fill();
    ctx.restore();
  }

  function burst(strength = 1) {
    navigator.vibrate?.(20);
    for (const p of particles) {
      p.vx += (Math.random() - .5) * 3.8 * strength;
      p.vy -= (1.4 + Math.random() * 4.2) * strength;
    }
    hint.style.opacity = '0';
  }

  function update() {
    const cx = width / 2, cy = height / 2;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.vx += gx; p.vy += gy;
      // A quiet phone should create a soft snow bed, not pull every flake into
      // one point at the very bottom of the circular boundary.
      const nearBottom = p.y > cy + radius * .56;
      if (nearBottom && Math.abs(gx) < .012 && Math.abs(p.vx) < .45) {
        p.vx += (p.restX - p.x) * .0018;
      } else if (Math.abs(gx) >= .012) {
        // Prevent settled flakes from feeling glued down when the phone tilts.
        p.vx += (Math.random() - .5) * .016;
        p.vy -= Math.random() * .003;
      }
      if (pointer) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 6800 && dist2 > 4) {
          const force = (1 - Math.sqrt(dist2) / 83) * 1.1;
          p.vx += (dx / Math.sqrt(dist2)) * force;
          p.vy += (dy / Math.sqrt(dist2)) * force;
        }
      }
      p.vx *= .994; p.vy *= .995; p.x += p.vx; p.y += p.vy;
      const dx = p.x - cx, dy = p.y - cy;
      const dist = Math.hypot(dx, dy), limit = radius - p.bound - 2 - p.inset;
      if (dist > limit) {
        const nx = dx / dist, ny = dy / dist;
        p.x = cx + nx * limit; p.y = cy + ny * limit;
        const dot = p.vx * nx + p.vy * ny;
        if (dot > 0) { p.vx -= 1.3 * dot * nx; p.vy -= 1.3 * dot * ny; }
        p.vx *= .91; p.vy *= .91;
      }
      p.twinkle += .035;
      if (p.type === 'star') {
        drawStar(p.x, p.y, p.r, p.a * (.78 + Math.sin(p.twinkle) * .18));
      } else if (p.type === 'glow') {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.2);
        glow.addColorStop(0, `rgba(255,244,174,${p.a})`);
        glow.addColorStop(.28, `rgba(247,190,50,${p.a * .75})`);
        glow.addColorStop(1, 'rgba(235,166,28,0)');
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,252,${p.a})`;
        ctx.shadowBlur = p.r > 1.5 ? 2 : 0; ctx.shadowColor = '#fff';
        ctx.fill(); ctx.shadowBlur = 0;
      }
    }
    requestAnimationFrame(update);
  }

  function setStep(next) {
    step = next; tutorial.dataset.step = String(step);
    title.textContent = steps[step][0]; text.textContent = steps[step][1];
    count.textContent = `0${step + 1} / 03`;
    tutorial.querySelectorAll('.dots i').forEach((dot, i) => dot.classList.toggle('active', i === step));
    nextBtn.innerHTML = step === 2 ? 'はじめる <span>✦</span>' : '次へ <span>→</span>';
  }

  function needsMotionPermission() {
    return typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
  }
  async function enableMotion() {
    try {
      if (needsMotionPermission()) {
        const [motion, orientation] = await Promise.all([
          DeviceMotionEvent.requestPermission(),
          typeof DeviceOrientationEvent?.requestPermission === 'function' ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted')
        ]);
        if (motion !== 'granted' || orientation !== 'granted') throw new Error('denied');
      }
      window.addEventListener('deviceorientation', onOrientation, true);
      window.addEventListener('devicemotion', onMotion, true);
      localStorage.setItem('kinako-motion', 'enabled');
    } catch (_) {
      localStorage.setItem('kinako-motion', 'touch');
    }
    permissionSheet.hidden = true;
  }
  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    const angle = screen.orientation?.angle || window.orientation || 0;
    let x = e.gamma / 34, y = (e.beta - 45) / 42;
    if (angle === 90) [x, y] = [y, -x];
    if (angle === -90 || angle === 270) [x, y] = [-y, x];
    const targetX = Math.max(-1.25, Math.min(1.25, x)) * .055;
    const targetY = Math.max(.035, Math.min(.16, .105 + y * .065));
    gx += (targetX - gx) * .3;
    gy += (targetY - gy) * .24;
  }
  function onMotion(e) {
    const a = e.acceleration || e.accelerationIncludingGravity;
    if (!a) return;
    const magnitude = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    const now = performance.now();
    const threshold = e.acceleration ? 7.5 : 14.5;
    if (magnitude > threshold && now - lastMotion > 520) {
      lastMotion = now;
      burst(Math.min(1.65, magnitude / threshold));
    }
  }
  function finishTutorial() {
    tutorial.classList.remove('is-open'); localStorage.setItem('kinako-tutorial', 'done');
    // iOS requires requestPermission() to run directly from a button tap.
    // Always offer that button after the tutorial, including when the visitor
    // previously selected touch-only mode and later reopens the guide.
    if (needsMotionPermission()) permissionSheet.hidden = false;
    else enableMotion();
  }

  nextBtn.addEventListener('click', () => step < 2 ? setStep(step + 1) : finishTutorial());
  skipBtn.addEventListener('click', finishTutorial);
  infoBtn.addEventListener('click', () => { setStep(0); tutorial.classList.add('is-open'); });
  shakeBtn.addEventListener('click', () => burst(1.05));
  allowMotionBtn.addEventListener('click', enableMotion);
  touchOnlyBtn.addEventListener('click', () => { localStorage.setItem('kinako-motion', 'touch'); permissionSheet.hidden = true; });
  globe.addEventListener('pointerdown', e => { globe.setPointerCapture(e.pointerId); pointer = { x: e.offsetX, y: e.offsetY }; burst(.25); });
  globe.addEventListener('pointermove', e => { if (pointer) pointer = { x: e.offsetX, y: e.offsetY }; });
  globe.addEventListener('pointerup', () => pointer = null);
  globe.addEventListener('pointercancel', () => pointer = null);
  window.addEventListener('resize', () => { resize(); seed(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && localStorage.getItem('kinako-motion') === 'enabled' && !needsMotionPermission()) enableMotion();
  });

  resize(); seed(); setStep(0); update();
  if (localStorage.getItem('kinako-tutorial') === 'done') {
    tutorial.classList.remove('is-open');
    if (needsMotionPermission() && localStorage.getItem('kinako-motion') === 'enabled') {
      allowMotionBtn.textContent = 'センサーを再開';
      permissionSheet.hidden = false;
    } else if (localStorage.getItem('kinako-motion') === 'enabled') {
      enableMotion();
    }
  }
})();
