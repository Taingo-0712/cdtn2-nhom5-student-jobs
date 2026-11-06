import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';

const run = promisify(execFile);
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let available = true;
try { await access(chrome); } catch { available = false; }

test('K01 browser: pagination, detail, back, error/retry, stale responses and mobile layout', { skip: !available && 'Set CHROME_PATH to a Chrome/Chromium executable' }, async (t) => {
  const server = await createServer({
    logLevel: 'error',
    server: { port: 0, strictPort: false, open: false },
    plugins: [{
      name: 'k01-test-only-html',
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url.startsWith('/employer/')) return next();
          const html = await vite.transformIndexHtml(req.url, '<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><output id="result">RUNNING</output><script type="module" src="/tests/fixtures/applicants-browser.jsx"></script></body></html>');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(html);
        });
      },
    }],
  });
  await server.listen();
  t.after(() => server.close());
  const profile = await mkdtemp(join(process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Temp', 'opencode') : tmpdir(), 'k01-chrome-'));
  const url = `http://localhost:${server.httpServer.address().port}/employer/jobs/301/applications?page=1`;
  const { stdout } = await run(chrome, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, '--window-size=390,844', '--virtual-time-budget=12000',
    '--dump-dom', url,
  ], { timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  assert.match(stdout, /K01_BROWSER_PASS/, stdout.slice(-4000));
});
