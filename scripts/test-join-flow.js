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

async function testJoinFlow() {
  const watchdog = setTimeout(() => {
    console.error('Watchdog timeout: terminating test after 45s');
    process.exit(1);
  }, 45000);
  watchdog.unref();

  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4175'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4175';

  try {
    await waitForServer(appUrl, 15000);
    console.log('Preview server ready at ' + appUrl);

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('console', msg => console.log('  [Peer A]', msg.text()));
    pageB.on('console', msg => console.log('  [Peer B]', msg.text()));

    console.log('\n1. Loading Page A at http://localhost:4175/ ...');
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });

    // Page A enters room
    const btnA = await pageA.waitForSelector('.card-action-bar button');
    await btnA.click();
    await new Promise(r => setTimeout(r, 1000));

    const hashA = await pageA.evaluate(() => window.location.hash);
    console.log('Page A URL Hash:', hashA);
    const cleanRoom = hashA.replace('#', '');

    console.log('\n2. Loading Page B at http://localhost:4175/ (NO HASH)...');
    await pageB.goto(appUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    console.log(`\n3. Page B enters room code "${cleanRoom}" into Quick Join...`);
    await pageB.type('.quick-join-input-group input', cleanRoom);
    await pageB.click('.quick-join-input-group button');

    console.log('\n4. Waiting for P2P connection to be established...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 })
    ]);

    console.log('\n✓ SUCCESS! Both peers connected cleanly via UI Quick Join!');
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

testJoinFlow()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\nTest Join Flow FAILED:', err);
    process.exit(1);
  });
