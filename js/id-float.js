/* ============================================
   DARE DOLLZ — Floating ID card
   Drifts slowly across the screen; user can grab & move it.
============================================ */
(function () {
  const id = document.querySelector('.id-vibe');
  if (!id) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = 0.6;          // px per frame — drift
  const SPIN = 0.18;          // deg per frame — lazy spin

  let x, y;                   // top-left position (px)
  let rot = -14;              // current rotation (spins over time)
  let vx = SPEED, vy = SPEED * 0.7;
  let dragging = false;
  let grabDX = 0, grabDY = 0;

  function dims() { return { w: id.offsetWidth, h: id.offsetHeight }; }

  // Seed position from wherever CSS placed it
  const start = id.getBoundingClientRect();
  x = start.left;
  y = start.top;

  function clampAndBounce() {
    const { w, h } = dims();
    const minX = -w * 0.45, maxX = window.innerWidth  - w * 0.55;
    const minY = -h * 0.45, maxY = window.innerHeight - h * 0.55;
    if (x < minX) { x = minX; vx =  Math.abs(vx); }
    if (x > maxX) { x = maxX; vx = -Math.abs(vx); }
    if (y < minY) { y = minY; vy =  Math.abs(vy); }
    if (y > maxY) { y = maxY; vy = -Math.abs(vy); }
  }

  function render() {
    id.style.left = x + 'px';
    id.style.top = y + 'px';
    id.style.right = 'auto';
    id.style.bottom = 'auto';
    id.style.transform = 'rotate(' + rot + 'deg)';
  }
  render();

  function loop() {
    if (!reduceMotion) {
      if (!dragging) { x += vx; y += vy; clampAndBounce(); }
      rot += SPIN;
      render();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ── Drag to move ──
  id.addEventListener('pointerdown', (e) => {
    dragging = true;
    id.setPointerCapture(e.pointerId);
    const r = id.getBoundingClientRect();
    grabDX = e.clientX - r.left;
    grabDY = e.clientY - r.top;
    id.style.cursor = 'grabbing';
    e.preventDefault();
  });

  id.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    x = e.clientX - grabDX;
    y = e.clientY - grabDY;
    render();
  });

  function release() {
    if (!dragging) return;
    dragging = false;
    id.style.cursor = 'grab';
    // resume drifting in a fresh random-ish direction
    vx = (Math.random() < 0.5 ? -1 : 1) * SPEED;
    vy = (Math.random() < 0.5 ? -1 : 1) * SPEED * 0.7;
  }
  id.addEventListener('pointerup', release);
  id.addEventListener('pointercancel', release);

  window.addEventListener('resize', () => { clampAndBounce(); render(); });
})();
