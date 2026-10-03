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

async function runSquadVerification() {
  console.log('====================================================');
  console.log(' ZeroChat Squad Group Chat Live WebRTC Test');
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
    const pageGuest = await contextGuest.newPage();

    await pageHost.setViewport({ width: 1200, height: 800 });
    await pageGuest.setViewport({ width: 1200, height: 800 });

    pageHost.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('[GroupRelay]') || t.includes('ZeroChat')) console.log(`  [Host Console] ${t}`);
    });
    pageGuest.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('[GroupRelay]') || t.includes('ZeroChat')) console.log(`  [Guest Console] ${t}`);
    });

    // 1. Host loads home screen
    console.log('[Step 1] Host loading app...');
    await pageHost.goto(appUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // 2. Host clicks Launch Squad (Host)
    console.log('[Step 2] Host launching squad via modal...');
    await pageHost.waitForSelector('.home-hub-container', { timeout: 10000 });
    // Find squad launch button and click
    await pageHost.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('Launch Squad'));
      if (btn) btn.click();
    });

    // Wait for modal
    await pageHost.waitForSelector('.modal-content', { timeout: 8000 });
    console.log('  ✓ Squad modal opened');

    // Click "Create Squad Room" in modal
    await pageHost.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.modal-content button[type="submit"]'));
      if (buttons[0]) buttons[0].click();
    });

    // 3. Wait for Host to connect and squad header to mount
    console.log('[Step 3] Waiting for Host to establish Baton Star Hub...');
    await pageHost.waitForFunction(() => {
      const header = document.querySelector('.group-header-bar, .squad-main-feed');
      const hash = window.location.hash;
      return header && hash.startsWith('#squad-');
    }, { timeout: 20000 });

    const squadRoomId = await pageHost.evaluate(() => window.location.hash.replace('#', ''));
    console.log(`  ✓ Squad Room Created by Host: #${squadRoomId}`);

    await pageHost.screenshot({ path: path.join(SHOTS_DIR, 'squad_01_host_connected.png') });
    console.log('  ✓ Captured squad_01_host_connected.png');

    // 4. Guest joins squad using URL hash
    const guestJoinUrl = `${appUrl}/#${squadRoomId}`;
    console.log(`\n[Step 4] Guest opening ${guestJoinUrl}...`);
    await pageGuest.goto(guestJoinUrl, { waitUntil: 'networkidle2', timeout: 15000 });

    // 5. Verify Host sees the knock alert dock
    console.log('[Step 5] Waiting for Host to receive KNOCK alert dock...');
    await pageHost.waitForSelector('.squad-knock-alert-dock, .btn-knock-admit', { timeout: 20000 });
    console.log('  ✓ Host received KNOCK from Guest in real-time!');

    await pageHost.screenshot({ path: path.join(SHOTS_DIR, 'squad_02_host_received_knock.png') });
    console.log('  ✓ Captured squad_02_host_received_knock.png');

    // 6. Host admits guest
    console.log('[Step 6] Host clicking "Admit"...');
    await pageHost.click('.btn-knock-admit');
    console.log('  ✓ Host admitted knocker');

    // 7. Verify Guest transitions to connected state and sees ChatInputBar
    console.log('[Step 7] Waiting for Guest to be admitted into squad feed...');
    await pageGuest.waitForSelector('.chat-input-bar, .messages-list, .squad-main-feed', { timeout: 15000 });
    console.log('  ✓ Guest successfully admitted and connected to squad star relay!');

    await pageGuest.screenshot({ path: path.join(SHOTS_DIR, 'squad_03_guest_admitted.png') });
    console.log('  ✓ Captured squad_03_guest_admitted.png');

    // 8. Test chat message relay: Guest sends message to squad
    console.log('\n[Step 8] Testing live chat relay over star topology...');
    await pageGuest.type('.chat-input', 'ZeroChat Squad Baton Pass Relay test message from Guest!');
    await pageGuest.keyboard.press('Enter');

    // 9. Host receives message
    console.log('Waiting for Host to receive Guest message...');
    await pageHost.waitForFunction(() => {
      return document.body.innerText.includes('ZeroChat Squad Baton Pass Relay test message from Guest!');
    }, { timeout: 10000 });
    console.log('  ✓ Host received message relayed peer-to-peer!');

    await pageHost.screenshot({ path: path.join(SHOTS_DIR, 'squad_04_message_received.png') });
    console.log('  ✓ Captured squad_04_message_received.png');

    console.log('\n====================================================');
    console.log('🎉 SQUAD GROUP CHAT CONNECTION VERIFIED AND WORKING!');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

runSquadVerification().catch((err) => {
  console.error('Squad verification failed:', err);
  process.exit(1);
});
