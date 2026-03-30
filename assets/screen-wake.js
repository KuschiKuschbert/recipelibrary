/**
 * Screen Wake Lock toggle for kitchen / recipe views (GitHub Pages, HTTPS).
 * Binds to elements with [data-kuschi-wake]; hides them and .footer-wake when unsupported.
 */
(function () {
  const SEL = '[data-kuschi-wake]';
  const LABEL_ON = 'Screen on';
  const LABEL_OFF = 'Keep screen on';

  let sentinel = null;
  let desired = false;

  function supported() {
    return typeof navigator !== 'undefined' && navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
  }

  function sync() {
    const nodes = Array.from(document.querySelectorAll(SEL));
    const footers = Array.from(document.querySelectorAll('.footer-wake'));
    if (!supported()) {
      nodes.forEach((el) => {
        el.hidden = true;
      });
      footers.forEach((w) => {
        w.hidden = true;
      });
      return;
    }
    footers.forEach((w) => {
      w.hidden = false;
    });
    const on = Boolean(sentinel);
    nodes.forEach((el) => {
      el.hidden = false;
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      const text = on ? LABEL_ON : LABEL_OFF;
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        el.textContent = text;
      }
    });
  }

  async function release() {
    if (!sentinel) return;
    try {
      await sentinel.release();
    } catch (_) {
      /* ignore */
    }
    sentinel = null;
  }

  async function acquire() {
    if (!supported() || !desired || document.visibilityState !== 'visible') return;
    if (sentinel) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        sentinel = null;
        sync();
        if (desired && document.visibilityState === 'visible') {
          acquire().catch(() => {
            desired = false;
            sync();
          });
        }
      });
    } catch (_) {
      desired = false;
    }
    sync();
  }

  async function toggle() {
    if (!supported()) return;
    if (sentinel) {
      desired = false;
      await release();
    } else {
      desired = true;
      await acquire();
    }
    sync();
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && desired) {
      acquire().catch(() => {});
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest(SEL);
    if (!t || t.hidden || t.disabled) return;
    e.preventDefault();
    toggle();
  });

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onVisibility);

  window.KuschiScreenWake = {
    sync,
    supported,
  };

  function boot() {
    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
