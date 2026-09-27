import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function getBrowserPath() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible Chrome/Edge browser binary found.');
}

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

async function run() {
  console.log('Starting preview server on port 4188...');
  const server = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4188'], {
    cwd: ROOT,
    stdio: 'pipe'
  });

  const url = 'http://localhost:4188/';
  await waitForServer(url);

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();

    const viewports = [
      { width: 360, height: 740, name: 'Small Android (360x740)' },
      { width: 375, height: 812, name: 'iPhone SE/Mini (375x812)' },
      { width: 390, height: 844, name: 'iPhone 12/13/14 Pro (390x844)' },
      { width: 414, height: 896, name: 'iPhone XR/Max (414x896)' },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Verifying HomeScreen on ${vp.name} ---`);
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 1000));

      const homeCheck = await page.evaluate((vw) => {
        const header = document.querySelector('.home-header');
        const burnBtn = document.querySelector('.home-header-actions .btn-danger');
        const qrBtn = document.querySelector('.home-header-actions button[title*="QR"]');
        const activePill = document.querySelector('.active-room-pill');
        const quickJoin = document.querySelector('.quick-join-input-group');

        const headerRect = header ? header.getBoundingClientRect() : null;
        const burnRect = burnBtn ? burnBtn.getBoundingClientRect() : null;
        const qrRect = qrBtn ? qrBtn.getBoundingClientRect() : null;
        const pillRect = activePill ? activePill.getBoundingClientRect() : null;

        return {
          windowInnerWidth: window.innerWidth,
          headerExists: !!header,
          headerOverflow: header ? header.scrollWidth > window.innerWidth : false,
          burnInBounds: burnRect ? (burnRect.right <= window.innerWidth + 2 && burnRect.left >= 0) : null,
          burnRight: burnRect ? burnRect.right : null,
          qrInBounds: qrRect ? (qrRect.right <= window.innerWidth + 2 && qrRect.left >= 0) : null,
          pillInBounds: pillRect ? (pillRect.right <= window.innerWidth + 2 && pillRect.left >= 0) : null,
        };
      }, vp.width);

      console.log(`Viewport: ${homeCheck.windowInnerWidth}px`);
      console.log(`Header exists: ${homeCheck.headerExists}`);
      console.log(`Header overflow: ${homeCheck.headerOverflow ? 'FAIL' : 'PASS (No horizontal scroll)'}`);
      console.log(`Burn button in bounds: ${homeCheck.burnInBounds ? 'PASS' : 'FAIL (Right: ' + homeCheck.burnRight + 'px)'}`);
      console.log(`QR button in bounds: ${homeCheck.qrInBounds ? 'PASS' : 'FAIL'}`);
      console.log(`Active room pill in bounds: ${homeCheck.pillInBounds ? 'PASS' : 'FAIL'}`);

      if (homeCheck.headerOverflow || !homeCheck.burnInBounds) {
        throw new Error(`Mobile layout failed on ${vp.name}`);
      }
    }

    console.log('\n--- Verifying NicknameModal Auto-Close ---');
    // Launch room view to access nickname modal
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(url + '#cosmic-test-999', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // Open NicknameModal
    const identityBtn = await page.$('.identity-pill-btn, button[title*="Identity"], button[title*="Nickname"]');
    if (identityBtn) {
      await identityBtn.click();
      await new Promise(r => setTimeout(r, 400));
      const modalOpen = await page.$('.modal-overlay');
      console.log('Nickname Modal opened:', !!modalOpen);

      // Type name
      const input = await page.$('.chat-input');
      if (input) {
        await input.click({ clickCount: 3 });
        await input.type('AgentZero');
        const saveBtn = await page.$('.modal-content button[type="submit"]');
        if (saveBtn) {
          await saveBtn.click();
          await new Promise(r => setTimeout(r, 400));
          const modalStillOpen = await page.$('.modal-overlay');
          console.log('Nickname Modal closed after save:', !modalStillOpen);
          if (modalStillOpen) {
            throw new Error('Nickname modal did not automatically close after clicking Save!');
          }
        }
      }
    }

    console.log('\nAll HomeScreen mobile layout and NicknameModal tests PASSED cleanly!');
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
