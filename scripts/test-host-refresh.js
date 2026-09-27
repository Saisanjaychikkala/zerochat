import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Timeout waiting for server at ${url}`);
}

async function testHostRefreshWhileConnected() {
  const watchdog = setTimeout(() => {
    console.error('Watchdog timeout: terminating test after 45s');
    process.exit(1);
  }, 45000);
  watchdog.unref();

  console.log('--- Test Host Refresh While Connected ---');
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4177'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4177';

  try {
    await waitForServer(appUrl, 15000);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('console', m => console.log('  [Peer A]', m.text()));
    pageB.on('console', m => console.log('  [Peer B]', m.text()));

    console.log('1. Peer A opens http://localhost:4177/ ...');
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });
    const btnA = await pageA.waitForSelector('.card-action-bar button');
    await btnA.click();
    await new Promise(r => setTimeout(r, 800));

    const roomA = (await pageA.evaluate(() => window.location.hash)).replace('#', '');
    console.log('Peer A room:', roomA);

    console.log('2. Peer B joins room #' + roomA + ' ...');
    await pageB.goto(`${appUrl}/#${roomA}`, { waitUntil: 'networkidle0' });

    console.log('3. Waiting for initial connection...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
    ]);
    console.log('✓ Initial connection established!');

    // NOW Peer A refreshes!
    console.log('\n4. Peer A (Host) refreshes the tab...');
    await pageA.reload({ waitUntil: 'networkidle0' });

    console.log('5. Waiting to see if Peer A and Peer B re-establish connection...');
    try {
      await Promise.all([
        pageA.waitForFunction(() => {
          const el = document.querySelector('.chat-header');
          return el && el.textContent.includes('Online');
        }, { timeout: 15000 }),
        pageB.waitForFunction(() => {
          const el = document.querySelector('.chat-header');
          return el && el.textContent.includes('Online');
        }, { timeout: 15000 }),
      ]);
      console.log('✓ Reconnected successfully after Host reload!');
    } catch (err) {
      console.error('❌ Reconnection FAILED after Host reload:', err.message);
    }

    await browser.close();
  } finally {
    try {
      if (serverProcess?.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
        serverProcess.kill('SIGTERM');
      }
    } catch (_) {}
  }
}

testHostRefreshWhileConnected()
  .then(() => {
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
