// Headless Microsoft Edge over the DevTools protocol, for the landing-page screenshots and videos. No extra packages:
// Node's global WebSocket talks to Edge's debugging port. Extensions are off, because a browser extension (an AI
// helper's "Ask AI anything" popup, for one) otherwise draws itself into the capture.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launchEdge(port = 9333) {
  const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
    '--disable-component-extensions-with-background-pages', '--disable-features=msUndersideButton,msEdgeSidebarV2,msCopilotComposeEnabled,msShoppingExp',
    `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'qc-edge-'))}`, 'about:blank'], { stdio: 'ignore' });

  let url = null;
  for (let i = 0; i < 50 && !url; i += 1) {
    try { url = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch { /* starting */ }
    if (!url) await sleep(200);
  }
  if (!url) { edge.kill(); throw new Error('Edge did not open a debugging port'); }

  const ws = new WebSocket(url);
  await new Promise((r) => { ws.onopen = r; });
  let seq = 0;
  const waiting = new Map();
  const handlers = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    else if (msg.method) for (const h of handlers.get(msg.method) ?? []) h(msg.params);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = (seq += 1);
    waiting.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
  const on = (method, handler) => {
    handlers.set(method, [...(handlers.get(method) ?? []), handler]);
    return () => handlers.set(method, (handlers.get(method) ?? []).filter((h) => h !== handler));
  };
  const once = (method) => new Promise((resolve) => { const off = on(method, (p) => { off(); resolve(p); }); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.value;

  /** Opens a page at a viewport and waits until fonts and images are in, and anything not the page's own is gone. */
  async function open(href, width, height, scale) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 500 });
    const loaded = once('Page.loadEventFired');
    await send('Page.navigate', { url: href });
    await loaded;
    return evaluate(`(async () => {
      await document.fonts.ready;
      // Lazy images off screen are never fetched (and never fire load), so load them all now, and give up after 10 s.
      await Promise.race([
        Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }); })),
        new Promise((r) => setTimeout(r, 10000)),
      ]);
      await new Promise((r) => setTimeout(r, 1500));
      // Extensions inject custom elements (a hyphen in the tag) under <html> or <body>; the page never does, bar Next's announcer.
      for (const n of [...document.documentElement.children, ...document.body.children]) {
        if (n.tagName.includes('-') && n.tagName !== 'NEXT-ROUTE-ANNOUNCER') n.remove();
      }
      const main = document.querySelector('main[data-showcase]');
      return main ? Math.ceil(main.getBoundingClientRect().height) : 0;
    })()`);
  }

  await send('Page.enable');
  await send('Runtime.enable');
  return { send, on, once, evaluate, open, close: () => { ws.close(); edge.kill(); } };
}
