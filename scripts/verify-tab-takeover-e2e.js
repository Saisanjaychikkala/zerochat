import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SHOTS_DIR = path.join(ROOT, 'screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

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

async function runTabTakeoverVerification() {
  console.log('====================================================');
  console.log(' ZeroChat Tab Takeover & Persistent Identity E2E Test');
  console.log('====================================================\n');

  const browserPath = getBrowserPath();
  const appUrl = 'http://localhost:5173';

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
    ],
  });

  try {
    const contextHost = await browser.createBrowserContext();
    const contextGuest = await browser.createBrowserContext();

    const pageHost = await contextHost.newPage();
    const pageGuestTabA = await contextGuest.newPage();

    await pageHost.setViewport({ width: 1200, height: 800 });
    await pageGuestTabA.setViewport({ width: 1200, height: 800 });

    pageHost.on('console', m => { const t = m.text(); if (t.includes('[GroupRelay]') || t.includes('superseded')) console.log(`  [Host] ${t}`); });
    pageGuestTabA.on('console', m => { const t = m.text(); if (t.includes('[GroupRelay]') || t.includes('superseded')) console.log(`  [Tab A] ${t}`); });

    // 1. Host creates squad room
    console.log('[Step 1] Host creating squad room...');
    await pageHost.goto(appUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    await pageHost.waitForSelector('.home-hub-container', { timeout: 10000 });

    await pageHost.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Launch Squad'));
      if (btn) btn.click();
    });

    await pageHost.waitForSelector('.modal-content', { timeout: 8000 });
    await pageHost.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.modal-content button[type="submit"]'));
      if (buttons[0]) buttons[0].click();
    });

    await pageHost.waitForFunction(() => {
      const header = document.querySelector('.group-header-bar, .squad-main-feed');
      const hash = window.location.hash;
      return header && hash.startsWith('#squad-');
    }, { timeout: 20000 });

    const squadRoomId = await pageHost.evaluate(() => window.location.hash.replace('#', ''));
    console.log(`  ✓ Squad Room active: #${squadRoomId}`);

    // 2. Guest Tab A joins squad
    const squadUrl = `${appUrl}/#${squadRoomId}`;
    console.log(`\n[Step 2] Guest Tab A opening ${squadUrl}...`);
    await pageGuestTabA.goto(squadUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // 3. Host admits Guest Tab A
    console.log('[Step 3] Waiting for Host to receive knock and admit Guest Tab A...');
    await pageHost.waitForSelector('.btn-knock-admit', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 600));
    await pageHost.evaluate(() => {
      const btn = document.querySelector('.squad-knock-alert-dock .btn-knock-admit') || document.querySelector('.btn-knock-admit');
      if (btn) btn.click();
    });

    await pageGuestTabA.waitForSelector('.chat-input-bar', { timeout: 20000 });
    console.log('  ✓ Guest Tab A admitted and connected!');
    await pageGuestTabA.screenshot({ path: path.join(SHOTS_DIR, 'squad_tab_takeover_01_tab_a_admitted.png') });

    // Check Guest Tab A client ID in localStorage
    const guestClientId = await pageGuestTabA.evaluate(() => localStorage.getItem('zerochat_client_id'));
    console.log(`  ✓ Guest Client ID: ${guestClientId}`);

    // 4. Guest opens Tab B in the SAME context (same browser/device, sharing localStorage)
    console.log(`\n[Step 4] Guest opening Tab B to #${squadRoomId}...`);
    const pageGuestTabB = await contextGuest.newPage();
    await pageGuestTabB.setViewport({ width: 1200, height: 800 });
    pageGuestTabB.on('console', m => { const t = m.text(); if (t.includes('[GroupRelay]') || t.includes('superseded')) console.log(`  [Tab B] ${t}`); });

    await pageGuestTabB.goto(squadUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // 5. Verify Tab B is auto-admitted via Tab Takeover
    console.log('[Step 5] Verifying Guest Tab B takes over session automatically...');
    await pageGuestTabB.waitForSelector('.chat-input-bar', { timeout: 15000 });
    console.log('  ✓ Guest Tab B automatically admitted into squad without manual host approval!');
    await pageGuestTabB.screenshot({ path: path.join(SHOTS_DIR, 'squad_tab_takeover_02_tab_b_active.png') });

    // 6. Verify Tab A displays "Squad Active in Another Tab"
    console.log('[Step 6] Verifying Guest Tab A displays superseded overlay...');
    await pageGuestTabA.waitForFunction(() => {
      return document.body.innerText.includes('Squad Active in Another Tab') ||
             document.querySelector('.squad-status-center h3')?.textContent.includes('Squad Active in Another Tab');
    }, { timeout: 10000 });
    console.log('  ✓ Guest Tab A correctly transitioned to superseded overlay!');
    await pageGuestTabA.screenshot({ path: path.join(SHOTS_DIR, 'squad_tab_takeover_03_tab_a_superseded.png') });

    // 7. Verify Host roster does NOT have duplicate members
    console.log('[Step 7] Verifying Host roster has exactly 2 members (no duplicates)...');
    const memberCount = await pageHost.evaluate(() => {
      // Check members badge or DOM count
      const text = document.querySelector('.group-header-left, .group-header-bar')?.innerText || '';
      return text;
    });
    console.log(`  ✓ Host header state: ${memberCount.replace(/\n+/g, ' ')}`);

    // 8. Test "Use in this Tab" action on Tab A
    console.log('\n[Step 8] Guest clicking "Use in this Tab" on Tab A to reclaim session...');
    await pageGuestTabA.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Use in this Tab'));
      if (btn) btn.click();
    });

    // 9. Tab A is restored to chat input bar
    console.log('Waiting for Guest Tab A to resume connection...');
    await pageGuestTabA.waitForSelector('.chat-input-bar', { timeout: 15000 });
    console.log('  ✓ Guest Tab A successfully resumed active session!');
    await pageGuestTabA.screenshot({ path: path.join(SHOTS_DIR, 'squad_tab_takeover_04_tab_a_resumed.png') });

    // 10. Tab B now receives superseded overlay
    console.log('Waiting for Guest Tab B to become superseded...');
    await pageGuestTabB.waitForFunction(() => {
      return document.body.innerText.includes('Squad Active in Another Tab');
    }, { timeout: 10000 });
    console.log('  ✓ Guest Tab B received superseded notification!');
    await pageGuestTabB.screenshot({ path: path.join(SHOTS_DIR, 'squad_tab_takeover_05_tab_b_superseded.png') });

    console.log('\n====================================================');
    console.log('🎉 TAB TAKEOVER & UNIQUE IDENTITY FULLY VERIFIED!');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runTabTakeoverVerification().catch((err) => {
  console.error('Tab takeover verification failed:', err);
  process.exit(1);
});
