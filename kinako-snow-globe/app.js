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
  let gx = 0, gy = 0.095;
  let pointer = null;
  let lastMotion = 0;
  const particles = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const box = globe.getBoundingClientRect();
    width = box.width; height = box.height; radius = width * .475;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    const total = reducedMotion ? 80 : 170;
    for (let i = 0; i < total; i++) {
      const gold = i % 7 === 0;
      particles.push({
        x: width * (.15 + Math.random() * .7), y: height * (.1 + Math.random() * .72),
        vx: (Math.random() - .5) * .4, vy: Math.random() * .3,
        r: gold ? 1.4 + Math.random() * 1.5 : .8 + Math.random() * 1.7,
        gold, a: .5 + Math.random() * .5
      });
    }
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
      p.vx += gx * .12; p.vy += gy;
      if (pointer) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 6800 && dist2 > 4) {
          const force = (1 - Math.sqrt(dist2) / 83) * 1.1;
          p.vx += (dx / Math.sqrt(dist2)) * force;
          p.vy += (dy / Math.sqrt(dist2)) * force;
        }
      }
      p.vx *= .992; p.vy *= .994; p.x += p.vx; p.y += p.vy;
      const dx = p.x - cx, dy = p.y - cy;
      const dist = Math.hypot(dx, dy), limit = radius - p.r - 2;
      if (dist > limit) {
        const nx = dx / dist, ny = dy / dist;
        p.x = cx + nx * limit; p.y = cy + ny * limit;
        const dot = p.vx * nx + p.vy * ny;
        if (dot > 0) { p.vx -= 1.3 * dot * nx; p.vy -= 1.3 * dot * ny; }
        p.vx *= .86; p.vy *= .86;
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold ? `rgba(240,195,91,${p.a})` : `rgba(255,255,248,${p.a})`;
      if (p.gold) { ctx.shadowBlur = 7; ctx.shadowColor = '#eac35d'; }
      ctx.fill(); ctx.shadowBlur = 0;
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
    let x = e.gamma / 45, y = (e.beta - 45) / 45;
    if (angle === 90) [x, y] = [y, -x];
    if (angle === -90 || angle === 270) [x, y] = [-y, x];
    gx += (Math.max(-1.2, Math.min(1.2, x)) * .12 - gx) * .12;
    gy += (Math.max(-.6, Math.min(1.2, .08 + y * .06)) - gy) * .1;
  }
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const magnitude = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    const now = performance.now();
    if (magnitude > 17 && now - lastMotion > 650) { lastMotion = now; burst(Math.min(1.6, magnitude / 18)); }
  }
  function finishTutorial() {
    tutorial.classList.remove('is-open'); localStorage.setItem('kinako-tutorial', 'done');
    if (needsMotionPermission() && localStorage.getItem('kinako-motion') !== 'touch') permissionSheet.hidden = false;
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
  document.addEventListener('visibilitychange', () => { if (!document.hidden && localStorage.getItem('kinako-motion') === 'enabled') enableMotion(); });

  resize(); seed(); setStep(0); update();
  if (localStorage.getItem('kinako-tutorial') === 'done') {
    tutorial.classList.remove('is-open');
    if (localStorage.getItem('kinako-motion') === 'enabled' && !needsMotionPermission()) enableMotion();
  }
})();
