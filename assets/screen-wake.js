/**
 * Screen Wake Lock helpers.
 */
(function () {
  const SEL = '[data-kuschi-wake]';
  let sentinel = null;
  let desired = false;

  function supported() {
    return typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
  }
  function labelFor(el, on) {
    if (el.classList && el.classList.contains('modal-wake-pill')) return on ? 'On' : 'Stay awake';
    return on ? 'Screen on' : 'Keep screen on';
  }
  function sync() {
    const nodes = Array.from(document.querySelectorAll(SEL));
    if (!supported()) {
      nodes.forEach((el) => (el.hidden = true));
      return;
    }
    const on = Boolean(sentinel);
    nodes.forEach((el) => {
      el.hidden = false;
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      const text = labelFor(el, on);
      const label = el.querySelector('[data-kuschi-wake-label]');
      if (label) label.textContent = text;
      else if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') el.textContent = text;
    });
  }
  async function release() {
    const s = sentinel;
    if (!s) return;
    try { await s.release(); } catch (_) {}
    if (sentinel === s) sentinel = null;
  }
  async function acquire() {
    if (!supported() || !desired || document.visibilityState !== 'visible' || sentinel) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        sync();
        if (desired && document.visibilityState === 'visible') acquire().catch(() => { desired = false; sync(); });
      });
    } catch (_) { desired = false; }
    sync();
  }
  async function toggle() {
    if (!supported()) return;
    if (sentinel) { desired = false; await release(); }
    else { desired = true; await acquire(); }
    sync();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest(SEL);
    if (!t || t.hidden || t.disabled) return;
    e.preventDefault();
    toggle();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && desired) acquire().catch(() => {}); });
  window.addEventListener('pageshow', () => { if (document.visibilityState === 'visible' && desired) acquire().catch(() => {}); });
  window.KuschiScreenWake = { sync, supported };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
