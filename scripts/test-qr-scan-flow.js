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

async function testQRScanFlow() {
  const watchdog = setTimeout(() => {
    console.error('Watchdog timeout: terminating test after 45s');
    process.exit(1);
  }, 45000);
  watchdog.unref();

  console.log('--- Testing QR Code / Direct URL Scan Flow ---');
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4178'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4178';

  try {
    await waitForServer(appUrl, 15000);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    const ctxHost = await browser.createBrowserContext();
    const ctxScanner = await browser.createBrowserContext();
    const pageHost = await ctxHost.newPage();
    const pageScanner = await ctxScanner.newPage();

    pageHost.on('console', m => console.log('  [Host]', m.text()));
    pageScanner.on('console', m => console.log('  [Scanner Phone]', m.text()));

    console.log('1. Host loads http://localhost:4178/ ...');
    await pageHost.goto(appUrl, { waitUntil: 'networkidle0' });

    // Host enters room view
    const btn = await pageHost.waitForSelector('.card-action-bar button');
    await btn.click();
    await new Promise(r => setTimeout(r, 800));

    // Read the exact invite URL generated for the QR code
    const qrInviteUrl = await pageHost.evaluate(() => {
      const input = document.querySelector('.waiting-hero-card input[readonly]');
      return input ? input.value : window.location.href;
    });
    console.log('2. QR code invite URL generated:', qrInviteUrl);

    // Simulate mobile phone scanning the QR code
    console.log('3. Scanner phone opens QR code URL:', qrInviteUrl);
    await pageScanner.goto(qrInviteUrl, { waitUntil: 'networkidle0' });

    console.log('4. Waiting for P2P connection to be established...');
    await Promise.all([
      pageHost.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
      pageScanner.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
    ]);

    console.log('\n✓ SUCCESS! Peer connected immediately upon scanning QR code URL!');
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

testQRScanFlow()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ QR Scan Flow FAILED:', err);
    process.exit(1);
  });
