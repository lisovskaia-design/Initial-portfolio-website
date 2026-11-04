(() => {
  'use strict';

  const scene = document.getElementById('cloud');
  const canvas = document.getElementById('cloud-canvas');
  const glowCanvas = document.getElementById('page-glow');
  if (!scene || !canvas || !glowCanvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  const glowCtx = glowCanvas.getContext('2d', { alpha: true });
  if (!ctx || !glowCtx) return;

  // Approved hero-animation-lab.html settings. Keep these independent of card effects.
  const config = Object.freeze({
    count: 80,
    spread: 66,
    particleOpacity: 72,
    connections: 100,
    drift: 22,
    shape: 'pixels',
    glow: 16,
    radius: 700,
    follow: 59,
    reactivity: 100,
    tone: 'cool',
    protect: true,
    reduce: false
  });
  const palette = { cool: [184, 200, 255] };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileLayout = matchMedia('(max-width: 767px)');
  const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)');
  const globalFollow = () => !mobileLayout.matches && hoverPointer.matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rest = { x: 0.18, y: 0.56 };
  const restX = () => rest.x + (mobileLayout.matches ? 0.35 : 0);
  const particles = [];
  let w = 1;
  let h = 1;
  let aimX = restX();
  let aimY = rest.y;
  let prevX = restX();
  let prevY = rest.y;
  let phase = 0;
  let lastFrame = 0;
  let frame = null;
  let inView = false;
  let pageActive = true;
  let pointerPosition = null;
  let glowPointer = null;
  let glowX = 0;
  let glowY = 0;
  let glowAimX = 0;
  let glowAimY = 0;
  let glowReady = false;
  let scrollY = window.scrollY;

  // Stable distribution: resizing and changing motion preferences never reshuffle it.
  let seed = 721;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  }
  function normalRandom() {
    return Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
  }
  for (let i = 0; i < config.count; i++) {
    particles.push({
      z: random(), phase: random() * Math.PI * 2, size: random(), kind: random(),
      x: clamp(0.13 + normalRandom() * 0.095, 0.008, 0.53),
      y: clamp(0.56 + normalRandom() * 0.235, -0.08, 1.08)
    });
  }

  function currentReduced() {
    return config.reduce || reducedMotion.matches;
  }
  function visible() {
    return pageActive && (inView || glowSettling()) && !document.hidden;
  }
  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
  }
  function schedule() {
    if (visible() && (!currentReduced() || pointerSettling()) && frame === null) {
      frame = requestAnimationFrame(tick);
    }
  }
  function pointerSettling() {
    return Math.hypot((aimX - prevX) * w, (aimY - prevY) * h) > 0.1 || glowSettling();
  }
  function glowSettling() {
    return globalFollow() && Math.hypot(glowAimX - glowX, glowAimY - glowY) > 0.1;
  }
  function tick(now) {
    frame = null;
    const reduced = currentReduced();
    if (!visible() || (reduced && !pointerSettling())) return;
    // Match the lab's ~30 fps, without a background animation loop when paused.
    if (!lastFrame || now - lastFrame >= 1000 / 30) {
      const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 1 / 30;
      lastFrame = now;
      if (!reduced && inView) phase += dt * (0.15 + config.drift * 0.025);
      const easing = 1 - Math.pow(1 - (0.02 + config.follow * 0.00135) * 2, dt * 30);
      prevX += (aimX - prevX) * easing;
      prevY += (aimY - prevY) * easing;
      glowX += (glowAimX - glowX) * easing;
      glowY += (glowAimY - glowY) * easing;
      if (inView) draw(reduced);
      drawGlow();
    }
    schedule();
  }
  function sync() {
    stop();
    drawGlow();
    if (!visible()) return;
    const reduced = currentReduced();
    if (reduced) {
      phase = 0;
    }
    draw(reduced);
    schedule();
  }
  function resize() {
    // ResizeObserver also catches font loads and changes in the frame's height.
    w = Math.max(1, canvas.clientWidth);
    h = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    glowCanvas.width = Math.round(glowCanvas.clientWidth * dpr);
    glowCanvas.height = Math.round(glowCanvas.clientHeight * dpr);
    glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateGlowAim();
    if (!glowReady || !globalFollow()) {
      glowX = glowAimX;
      glowY = glowAimY;
      glowReady = true;
    }
    if (pointerPosition) {
      if (!updateAim(pointerPosition)) resetPointer();
    } else {
      aimX = restX();
      aimY = rest.y;
    }
    sync();
  }
  function resetPointer() {
    pointerPosition = null;
    aimX = restX();
    aimY = rest.y;
    schedule();
  }
  function updateAim(point) {
    const box = scene.getBoundingClientRect();
    if (!box.width || !box.height || point.clientX < box.left || point.clientX > box.right ||
        point.clientY < box.top || point.clientY > box.bottom) return false;
    aimX = clamp((point.clientX - box.left) / box.width, 0, 1);
    aimY = clamp((point.clientY - box.top) / box.height, 0, 1);
    return true;
  }
  function followPoint(point) {
    if (!updateAim(point)) {
      resetPointer();
      return;
    }
    pointerPosition = { clientX: point.clientX, clientY: point.clientY };
    schedule();
  }
  function followPointer(event) {
    if (event.pointerType === 'touch' || !globalFollow()) return;
    glowPointer = { clientX: event.clientX, clientY: event.clientY };
    updateGlowAim();
    followPoint(event);
  }
  window.addEventListener('pointermove', followPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', cancelInteraction, { passive: true });
  window.addEventListener('pointercancel', event => {
    if (event.pointerType !== 'touch') cancelInteraction();
  }, { passive: true });
  function updateGlowAim() {
    const box = scene.getBoundingClientRect();
    glowAimX = glowPointer ? glowPointer.clientX : box.left + restX() * w;
    glowAimY = glowPointer ? glowPointer.clientY : box.top + rest.y * h;
  }
  function cancelInteraction() {
    glowPointer = null;
    updateGlowAim();
    resetPointer();
  }
  window.addEventListener('blur', cancelInteraction);
  document.addEventListener('visibilitychange', () => {
    cancelInteraction();
    sync();
  });
  reducedMotion.addEventListener('change', sync);
  function changeInput() {
    cancelInteraction();
    aimX = prevX = restX();
    aimY = prevY = rest.y;
    glowReady = false;
    resize();
  }
  mobileLayout.addEventListener('change', changeInput);
  hoverPointer.addEventListener('change', changeInput);
  window.addEventListener('pagehide', () => { pageActive = false; stop(); });
  window.addEventListener('pageshow', () => { pageActive = true; resize(); });

  const observer = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    sync();
  });
  observer.observe(scene);
  new ResizeObserver(resize).observe(scene);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', () => {
    if (!glowPointer) glowY -= window.scrollY - scrollY;
    scrollY = window.scrollY;
    updateGlowAim();
    if (pointerPosition) {
      if (!updateAim(pointerPosition)) resetPointer();
      schedule();
    }
    drawGlow();
  }, { passive: true });
  resize();

  // Rendering equations below are ported from the approved local HTML lab.
  function draw(reduced) {
    ctx.clearRect(0, 0, w, h);
    const color = palette[config.tone];
    const rgb = color.join(',');
    const softGlow = config.glow / 100;
    const px = prevX * w;
    const py = prevY * h;

    const mobileOffset = mobileLayout.matches ? 0.35 : 0;
    radial(w * (0.14 + mobileOffset), h * 0.53, Math.min(w * 0.31, 390), softGlow * 0.27);
    if (!globalFollow()) drawFollowingGlow(ctx, px, py);

    const spread = config.spread / 65;
    const positions = particles.map(p => {
      const depth = 0.4 + p.z * 0.8;
      const dx = reduced ? 0 : Math.sin(phase * 0.24 + p.phase) * 0.0045 * depth;
      const dy = reduced ? 0 : Math.cos(phase * 0.19 + p.phase) * 0.007 * depth;
      const parallaxX = reduced ? 0 : (prevX - restX()) * (0.005 + 0.008 * p.z);
      const parallaxY = reduced ? 0 : (prevY - 0.56) * (0.005 + 0.007 * p.z);
      const nx = 0.145 + (p.x - 0.145) * spread + dx + parallaxX;
      const ny = 0.55 + (p.y - 0.55) * Math.min(1.35, 0.73 + spread * 0.28) + dy + parallaxY;
      let x = nx * w;
      let y = ny * h;
      const distance = Math.hypot(x - px, y - py);
      const repulsion = (reduced ? 0 : config.reactivity / 100)
        * Math.exp(-(distance ** 2) / (2 * 95 ** 2)) * 21;
      if (distance > 0.01) {
        x += (x - px) / distance * repulsion;
        y += (y - py) / distance * repulsion * 0.7;
      }
      const illumination = Math.exp(-(distance ** 2) / (2 * (config.radius * 0.55) ** 2));
      const edgeFade = clamp((0.53 - nx) / 0.17, 0, 1);
      // Same soft falloff over the text column as in the approved lab.
      const textMask = config.protect && nx > 0.255 ? clamp(1 - (nx - 0.255) * 2.5, 0.08, 1) : 1;
      const alpha = clamp((0.12 + p.z * 0.30) * (config.particleOpacity / 42)
        * (0.5 + illumination * 1.25) * (1 + 0.06 * Math.sin(phase + p.phase * 3))
        * edgeFade * textMask, 0, 0.83);
      const size = clamp((0.7 + p.size * 2.3) * (0.6 + p.z * 0.75) * Math.min(1.45, w / 900), 0.5, 4.2);
      return { x, y, alpha, size, kind: p.kind, bright: illumination };
    });

    if (config.connections > 0) {
      const threshold = Math.min(52, 24 + w * 0.028);
      ctx.lineWidth = 0.6;
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        if (p.alpha < 0.025) continue;
        let drawn = 0;
        for (let j = i + 1; j < Math.min(positions.length, i + 75); j++) {
          const q = positions[j];
          if (q.alpha < 0.025) continue;
          const distance = Math.hypot(q.x - p.x, q.y - p.y);
          if (distance > threshold) continue;
          const alpha = Math.min(0.11, Math.min(p.alpha, q.alpha) * 0.18)
            * (config.connections / 100) * (1 - distance / threshold);
          if (alpha <= 0.0015) continue;
          ctx.strokeStyle = `rgba(${rgb},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
          if (++drawn === 3) break;
        }
      }
    }
    positions.forEach((p, i) => {
      if (p.alpha < 0.008) return;
      if (p.bright > 0.52 && p.alpha > 0.2 && i % 4 === 0) {
        radial(p.x, p.y, p.size * 6, p.alpha * 0.085);
      }
      ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
      const square = config.shape === 'pixels' || (config.shape === 'mix' && p.kind > 0.54);
      if (square) {
        const size = Math.max(1, p.size);
        ctx.fillRect(p.x - size * 0.5, p.y - size * 0.5, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Reuse the original gradients, radius and opacity for the page-wide light.
  function radial(x, y, radius, opacity, context = ctx) {
    if (opacity <= 0.001) return;
    const rgb = palette[config.tone].join(',');
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${rgb},${opacity})`);
    gradient.addColorStop(0.22, `rgba(${rgb},${opacity * 0.54})`);
    gradient.addColorStop(0.55, `rgba(${rgb},${opacity * 0.16})`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  function drawFollowingGlow(context, x, y) {
    const softGlow = config.glow / 100;
    radial(x, y, config.radius * (w / 1070) ** 0.25, softGlow * 0.57, context);
    radial(x + config.radius * 0.16, y + config.radius * 0.12,
      config.radius * 0.68 * (w / 1070) ** 0.25, softGlow * 0.12, context);
  }
  function drawGlow() {
    glowCtx.clearRect(0, 0, glowCanvas.clientWidth, glowCanvas.clientHeight);
    if (globalFollow()) drawFollowingGlow(glowCtx, glowX, glowY);
  }
})();
