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
  let gx = 0, gy = 0.055;
  let tiltSignal = 0;
  let pointer = null;
  let lastMotion = 0;
  const particles = [];
  const highlights = [];
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

  function makeGlowSprite() {
    const sprite = document.createElement('canvas');
    sprite.width = 64; sprite.height = 64;
    const sctx = sprite.getContext('2d');
    const glow = sctx.createRadialGradient(32, 32, 0, 32, 32, 31);
    glow.addColorStop(0, 'rgba(255,255,225,1)');
    glow.addColorStop(.18, 'rgba(255,222,105,.95)');
    glow.addColorStop(.48, 'rgba(244,178,39,.48)');
    glow.addColorStop(1, 'rgba(235,166,28,0)');
    sctx.fillStyle = glow; sctx.fillRect(0, 0, 64, 64);
    return sprite;
  }

  function makeStarSprite() {
    const sprite = document.createElement('canvas');
    sprite.width = 64; sprite.height = 64;
    const sctx = sprite.getContext('2d');
    sctx.translate(32, 32); sctx.beginPath();
    sctx.moveTo(0, -27); sctx.lineTo(4, -4);
    sctx.lineTo(27, 0); sctx.lineTo(4, 4);
    sctx.lineTo(0, 27); sctx.lineTo(-4, 4);
    sctx.lineTo(-27, 0); sctx.lineTo(-4, -4); sctx.closePath();
    sctx.fillStyle = '#ffc62f'; sctx.shadowBlur = 9; sctx.shadowColor = '#ffd858'; sctx.fill();
    sctx.beginPath(); sctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    sctx.fillStyle = '#fffbd8'; sctx.fill();
    return sprite;
  }

  const glowSprite = makeGlowSprite();
  const starSprite = makeStarSprite();

  function resize() {
    const box = globe.getBoundingClientRect();
    width = box.width; height = box.height; radius = width * .475;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    highlights.length = 0;
    const total = reducedMotion ? 220 : 520;
    for (let i = 0; i < total; i++) {
      const type = i % 24 === 0 ? 'star' : i % 15 === 0 ? 'glow' : 'snow';
      const restX = width * (.06 + Math.random() * .88);
      const size = type === 'star' ? 2.3 + Math.random() * 1.9 :
        type === 'glow' ? 1.15 + Math.random() * 1.35 : .8 + Math.random() * 1.65;
      const inset = type === 'star' ? Math.random() * 4 :
        type === 'glow' ? Math.random() * 5 : Math.pow(Math.random(), .82) * 9;
      const p = {
        x: restX, y: 0, vx: 0, vy: 0, r: size,
        bound: type === 'star' ? size * 2.35 : type === 'glow' ? size * 3.2 : size,
        restX, inset, type,
        a: type === 'glow' ? .35 + Math.random() * .4 : .5 + Math.random() * .5,
        twinkle: Math.random() * Math.PI * 2
      };
      const dx = p.x - width / 2;
      const limit = radius - p.bound - 2 - p.inset;
      p.y = height / 2 + Math.sqrt(Math.max(0, limit * limit - dx * dx)) - Math.random() * 4;
      particles.push(p);
      if (type !== 'snow') highlights.push(p);
    }
  }

  function burst(strength = 1) {
    navigator.vibrate?.(20);
    for (const p of particles) {
      p.vx += (Math.random() - .5) * 4.8 * strength;
      p.vy -= (1.8 + Math.random() * 4.8) * strength;
    }
    hint.style.opacity = '0';
  }

  function containParticle(p, cx, cy) {
    const dx = p.x - cx, dy = p.y - cy;
    const dist = Math.hypot(dx, dy), limit = radius - p.bound - 2 - p.inset;
    if (dist > limit) {
      const nx = dx / dist, ny = dy / dist;
      p.x = cx + nx * limit; p.y = cy + ny * limit;
      const dot = p.vx * nx + p.vy * ny;
      if (dot > 0) { p.vx -= 1.36 * dot * nx; p.vy -= 1.36 * dot * ny; }
      p.vx *= .93; p.vy *= .93;
    }
  }

  function separateHighlights() {
    for (let i = 0; i < highlights.length; i++) {
      const a = highlights[i];
      for (let j = i + 1; j < highlights.length; j++) {
        const b = highlights[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const min = Math.max(6, (a.bound + b.bound) * .55);
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= min * min) continue;
        const dist = Math.max(.01, Math.sqrt(dist2));
        const nx = dx / dist, ny = dy / dist;
        const push = (min - dist) * .22;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        a.vx -= nx * .025; b.vx += nx * .025;
      }
    }
  }

  function update() {
    const cx = width / 2, cy = height / 2;
    ctx.clearRect(0, 0, width, height);

    for (const p of particles) {
      p.vx += gx;
      p.vy += gy * (p.type === 'snow' ? .45 : .85);
      const nearBottom = p.y > cy + radius * .55;
      if (nearBottom && Math.abs(tiltSignal) < .018 && Math.abs(p.vx) < .5) {
        p.vx += (p.restX - p.x) * .0015;
      } else if (Math.abs(tiltSignal) >= .018) {
        p.vx += (Math.random() - .5) * .024;
        p.vy -= Math.random() * .007;
      }
      if (p.type === 'snow' && p.y < cy + radius * .45) {
        p.vx += Math.sin(p.twinkle * .73) * .004;
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
      p.vx = Math.max(-5.2, Math.min(5.2, p.vx * .99));
      const verticalDrag = p.type === 'snow' ? .986 : .99;
      p.vy = Math.max(-5.2, Math.min(5.2, p.vy * verticalDrag));
      p.x += p.vx; p.y += p.vy;
      containParticle(p, cx, cy);
    }

    separateHighlights();
    for (const p of highlights) containParticle(p, cx, cy);

    for (const p of particles) {
      p.twinkle += .035;
      if (p.type === 'star') {
        const size = p.bound * 2;
        ctx.globalAlpha = p.a * (.78 + Math.sin(p.twinkle) * .18);
        ctx.drawImage(starSprite, p.x - size / 2, p.y - size / 2, size, size);
      } else if (p.type === 'glow') {
        const size = p.bound * 2;
        ctx.globalAlpha = p.a * (.82 + Math.sin(p.twinkle) * .12);
        ctx.drawImage(glowSprite, p.x - size / 2, p.y - size / 2, size, size);
      } else {
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,252,${p.a})`; ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
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
    const rawTilt = Math.max(-1.2, Math.min(1.2, x));
    const deadZone = .035;
    const activeTilt = Math.abs(rawTilt) <= deadZone ? 0 :
      Math.sign(rawTilt) * (Math.abs(rawTilt) - deadZone) / (1 - deadZone);
    const tiltChange = activeTilt - tiltSignal;
    tiltSignal = activeTilt;

    // A direction change should immediately release a settled pile instead of
    // waiting for gravity to overcome the resting spring.
    if (Math.abs(tiltChange) > .018) {
      for (const p of particles) {
        p.vx += tiltChange * 4.2;
        p.vy -= Math.abs(tiltChange) * (.32 + Math.random() * .35);
      }
    }

    const targetX = activeTilt * .09;
    const targetY = Math.max(.025, Math.min(.09, .055 + y * .035));
    gx += (targetX - gx) * .46;
    gy += (targetY - gy) * .32;
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
