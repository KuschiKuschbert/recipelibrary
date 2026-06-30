/**
 * app-nav.js — Shared navigation shell for Kuschi Kitchen Library
 *
 * Responsibilities:
 *  1. Inject the persistent <nav> (sidebar rail ≥900px landscape, bottom tab bar otherwise)
 *  2. Mark the active tab based on current page path
 *  3. "More" sheet: Flavor, Aroma, Matrix, Pantry, Guides, QR, Install
 *  4. "Books" sheet: Riviera + custom kitchen books from localStorage
 *  5. PWA install affordance: Android (beforeinstallprompt) + iOS tip
 *  6. SW registration (consolidated here so pages don't each need it)
 */
'use strict';

(function () {
  // ─── PWA: service worker registration ──────────────────────────────────────
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register(_navBase() + 'sw.js').catch(() => {});
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function _navBase() {
    const { origin, pathname: p } = window.location;
    if (/\.html?$/i.test(p)) {
      const dir = p.slice(0, p.lastIndexOf('/'));
      return (dir ? origin + dir : origin) + '/';
    }
    const stripped = p.replace(/\/$/, '') || '';
    return (stripped ? origin + stripped : origin) + '/';
  }

  /** Resolve a page-relative href from the base (e.g. "riviera.html") */
  function _href(rel) {
    const base = _navBase();
    return base + rel;
  }

  /** Which page are we on? Returns a simple key. */
  function _activePage() {
    const p = window.location.pathname;
    if (/riviera\.html/i.test(p))           return 'riviera';
    if (/kitchen-book\.html/i.test(p))      return 'books';
    if (/pantry\.html/i.test(p))            return 'pantry';
    if (/flavor\.html/i.test(p))            return 'more';
    if (/aroma\.html/i.test(p))             return 'more';
    if (/pairing-atlas\.html/i.test(p))     return 'more';
    if (/notebooklm-gallery\.html/i.test(p))return 'more';
    return 'library'; // index.html or root
  }

  /** Load custom book list from localStorage (same key as user-recipes.js) */
  function _loadBooks() {
    try {
      return JSON.parse(localStorage.getItem('kuschi_custom_kitchen_books_v1') || '[]');
    } catch { return []; }
  }

  // ─── Install prompt state ───────────────────────────────────────────────────
  let _deferredPrompt = null;
  const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const _isStandalone = window.navigator.standalone === true ||
                        window.matchMedia('(display-mode: standalone)').matches;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _updateInstallButtons(true);
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _updateInstallButtons(false);
  });

  function _updateInstallButtons(visible) {
    document.querySelectorAll('[data-nav-install]').forEach((el) => {
      el.hidden = !visible;
    });
  }

  function triggerInstall() {
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      _deferredPrompt.userChoice.then(() => { _deferredPrompt = null; _updateInstallButtons(false); });
      return;
    }
    if (_isIOS && !_isStandalone) {
      _showIosTip();
    }
  }
  window.kuschiInstall = triggerInstall;

  function _showIosTip() {
    const existing = document.getElementById('kuschi-ios-tip');
    if (existing) { existing.remove(); return; }
    const tip = document.createElement('div');
    tip.id = 'kuschi-ios-tip';
    tip.setAttribute('role', 'dialog');
    tip.setAttribute('aria-label', 'Add to Home Screen');
    tip.innerHTML = `
      <div class="ios-tip-inner">
        <button class="ios-tip-close" aria-label="Dismiss" onclick="document.getElementById('kuschi-ios-tip').remove()">✕</button>
        <p>To install: tap <strong>Share</strong> <span aria-hidden="true">⬆</span> then <strong>Add to Home Screen</strong>.</p>
      </div>`;
    document.body.appendChild(tip);
  }

  // ─── Nav markup ─────────────────────────────────────────────────────────────
  const ACTIVE = _activePage();

  function _navItem({ key, href, label, icon, badge }) {
    const isActive = key === ACTIVE;
    const ariaCurrent = isActive ? ' aria-current="page"' : '';
    const activeCls   = isActive ? ' nav-item--active' : '';
    return `<a href="${href}" class="nav-item${activeCls}"${ariaCurrent} data-nav-key="${key}">
  <span class="nav-item__icon" aria-hidden="true">${icon}</span>
  <span class="nav-item__label">${label}</span>
  ${badge ? `<span class="nav-item__badge" aria-hidden="true"></span>` : ''}
</a>`;
  }

  // SVG icons (stroke-based, 22×22 viewport, stroke-width 1.8)
  const ICONS = {
    library: `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="12" y="3" width="7" height="5" rx="1.5"/><rect x="12" y="11" width="7" height="8" rx="1.5"/><rect x="3" y="15" width="7" height="4" rx="1.5"/></svg>`,
    riviera: `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3L4 8v10h5v-5h4v5h5V8z"/></svg>`,
    books:   `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5a2 2 0 012-2h10a2 2 0 012 2v14"/><path d="M4 19h14"/><path d="M9 3v7l2-1.5L13 10V3"/></svg>`,
    pantry:  `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="16" height="15" rx="2"/><path d="M3 9h16"/><circle cx="8" cy="13.5" r="1.3"/><circle cx="14" cy="13.5" r="1.3"/></svg>`,
    more:    `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6" cy="11" r="1.3" fill="currentColor" stroke="none"/><circle cx="11" cy="11" r="1.3" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1.3" fill="currentColor" stroke="none"/></svg>`,
    // More-sheet icons
    flavor:  `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3c-3.8 0-7 2.7-7 6.5C4 13.5 7 16 7 19h10c0-3-3-5.5-3-9.5C14 5.7 14.8 3 11 3z"/><path d="M8 19h6"/></svg>`,
    aroma:   `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2c0 3-4 5-4 8a4 4 0 008 0c0-3-4-5-4-8z"/><path d="M7.5 14.5C6 16 4.5 17 4 19h14c-.5-2-2-3-3.5-4.5"/></svg>`,
    matrix:  `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="4" height="4" rx="1"/><rect x="9" y="3" width="4" height="4" rx="1"/><rect x="15" y="3" width="4" height="4" rx="1"/><rect x="3" y="9" width="4" height="4" rx="1"/><rect x="9" y="9" width="4" height="4" rx="1"/><rect x="15" y="9" width="4" height="4" rx="1"/><rect x="3" y="15" width="4" height="4" rx="1"/><rect x="9" y="15" width="4" height="4" rx="1"/><rect x="15" y="15" width="4" height="4" rx="1"/></svg>`,
    guides:  `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h14v11H4z"/><path d="M8 19l3-4 3 4"/><path d="M7 8h8M7 11h5"/></svg>`,
    qr:      `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="13" y="3" width="6" height="6" rx="1"/><rect x="3" y="13" width="6" height="6" rx="1"/><rect x="5" y="5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="15" y="5" width="2" height="2" fill="currentColor" stroke="none"/><rect x="5" y="15" width="2" height="2" fill="currentColor" stroke="none"/><path d="M13 13h2v2h-2zM17 13v2M13 17h2M17 17v2M17 19h2"/></svg>`,
    install: `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3v10M7 9l4 4 4-4"/><path d="M4 17v1a1 1 0 001 1h12a1 1 0 001-1v-1"/></svg>`,
    toolkit: `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 4.5L19 6l-9 9-2 1 1-2z"/><path d="M3 19l3-1"/><circle cx="5.5" cy="16.5" r="1" fill="currentColor" stroke="none"/></svg>`,
  };

  // ─── Brand wordmark (sidebar only) ─────────────────────────────────────────
  const BRAND_HTML = `<a href="${_href('index.html')}" class="nav-brand" aria-label="Kuschi Kitchen Library home">
  <span class="nav-brand__mark">K</span>
  <span class="nav-brand__name">Kitchen</span>
</a>`;

  // ─── Build nav HTML ─────────────────────────────────────────────────────────
  function _buildNav() {
    const items = [
      { key: 'library', href: _href('index.html'),         label: 'Library',  icon: ICONS.library },
      { key: 'riviera', href: _href('riviera.html'),        label: 'Riviera',  icon: ICONS.riviera },
      { key: 'books',   href: '#books-sheet',               label: 'Books',    icon: ICONS.books   },
      { key: 'pantry',  href: _href('pantry.html'),         label: 'Pantry',   icon: ICONS.pantry  },
      { key: 'more',    href: '#more-sheet',                label: 'More',     icon: ICONS.more    },
    ];

    const itemsHTML = items.map((it) => {
      if (it.key === 'books' || it.key === 'more') {
        const sheetId = it.key === 'books' ? 'booksSheet' : 'moreSheet';
        const isActive = it.key === ACTIVE;
        const activeCls = isActive ? ' nav-item--active' : '';
        return `<button type="button" class="nav-item${activeCls}" data-nav-key="${it.key}" aria-haspopup="dialog" aria-controls="${sheetId}" aria-expanded="false" onclick="kuschiNavSheet('${sheetId}')">
  <span class="nav-item__icon" aria-hidden="true">${it.icon}</span>
  <span class="nav-item__label">${it.label}</span>
</button>`;
      }
      return _navItem(it);
    });

    return `
<nav id="appNav" class="app-nav" aria-label="App navigation">
  <div class="nav-brand-wrap">${BRAND_HTML}</div>
  <div class="nav-items">${itemsHTML.join('')}</div>
</nav>

<!-- More sheet ─────────────────────────────────────────────────────────── -->
<div id="moreSheet" class="nav-sheet" role="dialog" aria-modal="true" aria-label="More tools" hidden>
  <div class="nav-sheet__backdrop" onclick="kuschiNavSheet(null)"></div>
  <div class="nav-sheet__panel">
    <div class="nav-sheet__header">
      <span class="nav-sheet__title">More tools</span>
      <button class="nav-sheet__close" aria-label="Close" onclick="kuschiNavSheet(null)">✕</button>
    </div>
    <div class="nav-sheet__grid">
      <a href="${_href('flavor.html')}" class="sheet-item">
        <span class="sheet-item__icon">${ICONS.flavor}</span>
        <span class="sheet-item__label">Flavor</span>
      </a>
      <a href="${_href('flavor.html')}?toolkit=1" class="sheet-item">
        <span class="sheet-item__icon">${ICONS.toolkit}</span>
        <span class="sheet-item__label">Toolkit</span>
      </a>
      <a href="${_href('aroma.html')}" class="sheet-item">
        <span class="sheet-item__icon">${ICONS.aroma}</span>
        <span class="sheet-item__label">Aroma</span>
      </a>
      <a href="${_href('pairing-atlas.html')}" class="sheet-item">
        <span class="sheet-item__icon">${ICONS.matrix}</span>
        <span class="sheet-item__label">Matrix</span>
      </a>
      <a href="${_href('notebooklm-gallery.html')}" class="sheet-item">
        <span class="sheet-item__icon">${ICONS.guides}</span>
        <span class="sheet-item__label">Guides</span>
      </a>
      <button type="button" class="sheet-item" id="navQrBtn" onclick="kuschiNavQR();kuschiNavSheet(null)">
        <span class="sheet-item__icon">${ICONS.qr}</span>
        <span class="sheet-item__label">QR code</span>
      </button>
      <button type="button" class="sheet-item" id="navInstallBtn" data-nav-install onclick="kuschiInstall();kuschiNavSheet(null)" hidden>
        <span class="sheet-item__icon">${ICONS.install}</span>
        <span class="sheet-item__label">Install app</span>
      </button>
    </div>
  </div>
</div>

<!-- Books sheet ────────────────────────────────────────────────────────── -->
<div id="booksSheet" class="nav-sheet" role="dialog" aria-modal="true" aria-label="Kitchen books" hidden>
  <div class="nav-sheet__backdrop" onclick="kuschiNavSheet(null)"></div>
  <div class="nav-sheet__panel">
    <div class="nav-sheet__header">
      <span class="nav-sheet__title">Kitchen books</span>
      <button class="nav-sheet__close" aria-label="Close" onclick="kuschiNavSheet(null)">✕</button>
    </div>
    <div id="navBooksContent" class="nav-sheet__books"></div>
  </div>
</div>

<!-- iOS install tip ────────────────────────────────────────────────────── -->`;
  }

  // ─── Mount nav ──────────────────────────────────────────────────────────────
  function _mount() {
    if (document.getElementById('appNav')) return; // already mounted
    const wrap = document.createElement('div');
    wrap.id = 'appNavWrap';
    wrap.innerHTML = _buildNav();
    // Inject before body's first child
    document.body.insertBefore(wrap, document.body.firstChild);
    _populateBooksSheet();
    _maybeShowIosTip();
  }

  // ─── Populate books sheet ───────────────────────────────────────────────────
  function _populateBooksSheet() {
    const el = document.getElementById('navBooksContent');
    if (!el) return;
    const books = _loadBooks();
    const base = _href('kitchen-book.html');

    let html = `<a href="${_href('riviera.html')}" class="sheet-book-item">
  <span class="sheet-book-item__icon">${ICONS.riviera}</span>
  <span class="sheet-book-item__name">Riviera</span>
  <span class="sheet-book-item__sub">Prep chef set</span>
</a>`;

    if (books.length) {
      html += books.map((b) => `<a href="${base}?b=${encodeURIComponent(b.id)}" class="sheet-book-item">
  <span class="sheet-book-item__icon">${ICONS.books}</span>
  <span class="sheet-book-item__name">${_esc(b.name || 'Kitchen book')}</span>
  <span class="sheet-book-item__sub">Custom book</span>
</a>`).join('');
    }

    html += `<button type="button" class="sheet-book-item sheet-book-item--new" id="navNewBookBtn" onclick="kuschiCreateKitchenBook()">
  <span class="sheet-book-item__icon" aria-hidden="true">+</span>
  <span class="sheet-book-item__name">New kitchen book</span>
</button>`;

    el.innerHTML = html;
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─── Sheet open/close ───────────────────────────────────────────────────────
  let _activeSheet = null;
  function _syncSheetTriggers() {
    document.querySelectorAll('.nav-item[aria-controls]').forEach((btn) => {
      btn.setAttribute('aria-expanded', btn.getAttribute('aria-controls') === _activeSheet ? 'true' : 'false');
    });
  }

  window.kuschiNavSheet = function (id) {
    if (_activeSheet) {
      const prev = document.getElementById(_activeSheet);
      if (prev) { prev.hidden = true; prev.removeAttribute('aria-modal'); }
    }
    _activeSheet = id;
    if (id) {
      if (id === 'booksSheet') _populateBooksSheet(); // refresh on open
      const el = document.getElementById(id);
      if (el) { el.hidden = false; el.setAttribute('aria-modal', 'true'); }
    }
    _syncSheetTriggers();
  };

  // Close sheet on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _activeSheet) window.kuschiNavSheet(null);
  });

  // ─── QR nav delegate ───────────────────────────────────────────────────────
  window.kuschiNavQR = function () {
    if (typeof openPageQrModal === 'function') openPageQrModal();
  };

  window.kuschiCreateKitchenBook = function () {
    window.kuschiNavSheet(null);
    if (typeof window.openAddKitchenBookModal === 'function') {
      window.openAddKitchenBookModal();
      return;
    }
    window.location.href = _href('index.html') + '#new-kitchen-book';
  };

  // ─── iOS tip (show once, 4 seconds after load) ─────────────────────────────
  function _maybeShowIosTip() {
    if (!_isIOS || _isStandalone) return;
    const key = 'kuschi_ios_tip_shown_v1';
    if (localStorage.getItem(key)) return;
    setTimeout(() => {
      if (!_deferredPrompt && !_isStandalone) {
        localStorage.setItem(key, '1');
        _showIosTip();
      }
    }, 4000);
  }

  // ─── Run after DOM is ready ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _mount);
  } else {
    _mount();
  }

  // ─── Tap-to-check steps (global delegation on all pages) ─────────────────────
  // Tapping a method step marks it done (strike + dim). Tap again to undo.
  // Works on any .modal-steps li regardless of which page renders it.
  document.addEventListener('click', (e) => {
    const li = e.target.closest('.modal-steps li');
    if (!li) return;
    li.classList.toggle('step-done');
  });

  // Clear step-done state whenever a modal closes (overlay click or X)
  document.addEventListener('click', (e) => {
    if (
      e.target.matches('.modal-close, [onclick*="closeModal"]') ||
      (e.target.classList.contains('modal-overlay') && !e.target.closest('.modal'))
    ) {
      document.querySelectorAll('.modal-steps li.step-done').forEach((li) => {
        li.classList.remove('step-done');
      });
    }
  });
})();
