// dom.js — a ~30-line element builder so the views read cleanly without a
// framework. h('button.btn', { onclick }, 'Save') → a real element.
// No virtual DOM, no magic: views re-render the parts of the page they own.

export function h(tag, attrs = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v);
    } else if (k === 'dataset') {
      Object.assign(el.dataset, v);
    } else if (k === 'value' || k === 'checked' || k === 'selected') {
      // form state must be a PROPERTY — setAttribute('value') on a textarea
      // is silently ignored, and on inputs it only sets the default
      el[k] = v;
    } else if (k in el && k !== 'list' && typeof v !== 'string') {
      el[k] = v;
    } else {
      el.setAttribute(k, v === true ? '' : v);
    }
  }
  return add(el, ...children);
}

/**
 * Put children into an element that already exists, dropping the ones that are
 * not there.
 *
 * `h()` has always dropped null children. The DOM's own `append()` does not —
 * it renders the word "null" at a person — and every screen that builds a root
 * first and fills it in later reaches for `append`. That is not hypothetical:
 * the session runner shipped with a bare "null" under the name of every item
 * with no `tier`, which on the deployed app was the first card of the day arc,
 * and the guard test that exists for exactly this only ever drew Today.
 *
 * So: anywhere a conditional child meets an existing element, this rather than
 * `append`.
 */
export function add(el, ...children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}
