/**
 * Hide parent full-screen overlays while a child modal (order list, prep board) is open.
 */
(function () {
  'use strict';

  var stack = [];

  function hideEl(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('overlay-stack-hidden');
    el.setAttribute('aria-hidden', 'true');
  }

  function showEl(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('overlay-stack-hidden');
    el.removeAttribute('aria-hidden');
  }

  function push(hideIds) {
    var ids = (hideIds || []).filter(Boolean);
    if (!ids.length) return;
    ids.forEach(hideEl);
    stack.push(ids);
  }

  function pop() {
    var ids = stack.pop();
    if (!ids) return;
    ids.forEach(showEl);
  }

  function clear() {
    while (stack.length) pop();
  }

  function depth() {
    return stack.length;
  }

  window.KuschiOverlayStack = {
    push: push,
    pop: pop,
    clear: clear,
    depth: depth,
  };
})();
