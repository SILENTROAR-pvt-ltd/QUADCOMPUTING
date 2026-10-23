// A clock for frame-exact screen recordings, installed in the page before its own scripts run. While the page loads it
// runs live; after `__clock.manual()` the page's time only moves when the recorder calls `__clock.step(ms)`: timers,
// animation frames (React, framer-motion and the recording script all use them), CSS animations and transitions and
// Web Animations are advanced by exactly that much, however long the screenshot in between takes. So a recording is
// smooth at its full frame rate even when headless Edge renders slowly.
export const FRAME_CLOCK = `(() => {
  if (window.__clock) return;
  const realNow = performance.now.bind(performance);
  const real = {
    st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window), si: window.setInterval.bind(window),
    ci: window.clearInterval.bind(window), raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
  };
  let manual = false, now = 0, seq = 1e7, frames = new Map();
  const dateNow = Date.now.bind(Date), timers = new Map(), seen = new WeakMap();
  let dateBase = 0;
  performance.now = () => (manual ? now : realNow());
  Date.now = () => (manual ? Math.round(dateBase + now) : dateNow());
  const queue = (fn, ms, every, a) => { const id = ++seq; timers.set(id, { at: now + ms, every, fn, a }); return id; };
  window.setTimeout = (fn, ms, ...a) => (manual ? queue(fn, Math.max(0, Number(ms) || 0), 0, a) : real.st(fn, ms, ...a));
  window.setInterval = (fn, ms, ...a) => { const every = Math.max(4, Number(ms) || 0); return manual ? queue(fn, every, every, a) : real.si(fn, ms, ...a); };
  window.clearTimeout = (id) => { if (!timers.delete(id)) real.ct(id); };
  window.clearInterval = (id) => { if (!timers.delete(id)) real.ci(id); };
  window.requestAnimationFrame = (fn) => { if (!manual) return real.raf(fn); const id = ++seq; frames.set(id, fn); return id; };
  window.cancelAnimationFrame = (id) => { if (!frames.delete(id)) real.caf(id); };
  // The browser's own smooth scrolling runs on real time, so while manual it is replayed on this clock instead.
  const glide = (el, left, top) => {
    const x0 = el.scrollLeft, y0 = el.scrollTop, t0 = now, ease = (t) => 1 - Math.pow(1 - t, 3);
    const f = () => { const t = Math.min(1, (now - t0) / 450); el.scrollLeft = x0 + (left - x0) * ease(t); el.scrollTop = y0 + (top - y0) * ease(t); if (t < 1) window.requestAnimationFrame(f); };
    window.requestAnimationFrame(f);
  };
  const elScrollTo = Element.prototype.scrollTo, winScrollTo = window.scrollTo.bind(window);
  // (apply with the original arguments: scrollTo({ top }) and scrollTo(x, y) are different overloads.)
  Element.prototype.scrollTo = function (a) {
    if (manual && a && typeof a === 'object' && a.behavior === 'smooth') return glide(this, a.left ?? this.scrollLeft, a.top ?? this.scrollTop);
    return elScrollTo.apply(this, arguments);
  };
  window.scrollTo = function (a) {
    const el = document.scrollingElement;
    if (manual && a && typeof a === 'object' && a.behavior === 'smooth') return glide(el, a.left ?? el.scrollLeft, a.top ?? el.scrollTop);
    return winScrollTo.apply(window, arguments);
  };
  // One trip through the task queue, so React commits what a callback changed before the next one runs.
  const settle = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  const drive = () => {
    for (const an of document.getAnimations()) {
      if (an.timeline !== document.timeline) continue;
      let start = seen.get(an);
      if (start === undefined) {
        if (an.playState === 'finished' || an.playState === 'idle') { seen.set(an, null); continue; }
        start = now - (Number(an.currentTime) || 0);
        seen.set(an, start);
      }
      if (start === null) continue;
      const t = (now - start) * (an.playbackRate || 1);
      const end = an.effect ? an.effect.getComputedTiming().endTime : Infinity;
      if (Number.isFinite(end) && t >= end) { an.finish(); seen.set(an, null); } else { an.pause(); an.currentTime = t; }
    }
  };
  window.__clock = {
    manual() { now = realNow(); dateBase = dateNow() - now; manual = true; drive(); },
    async step(ms) {
      const end = now + ms;
      for (;;) {
        let next = null;
        for (const entry of timers) if (entry[1].at <= end && (!next || entry[1].at < next[1].at)) next = entry;
        if (!next) break;
        const [id, t] = next;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every; else timers.delete(id);
        try { if (typeof t.fn === 'function') t.fn(...t.a); } catch (e) { console.error(e); }
        await settle();
      }
      now = end;
      const due = frames;
      frames = new Map();
      for (const fn of due.values()) { try { fn(now); } catch (e) { console.error(e); } }
      await settle();
      await settle();
      drive();
      return window.__recDone === true;
    },
  };
})();`;
