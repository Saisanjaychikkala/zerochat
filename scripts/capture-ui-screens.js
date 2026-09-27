import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARTIFACT_DIR = 'C:\\Users\\sanja\\.gemini\\antigravity-ide\\brain\\6ff5c741-171c-4d59-a00a-b49f9e7eb3db';
const SHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');

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
  throw new Error('No Chrome/Edge browser binary found.');
}

async function waitForServer(url, timeout = 20000) {
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

async function captureScreens() {
  console.log('Capturing ZeroChat UI screenshots across mobile & desktop viewports...');
  if (!fs.existsSync(SHOTS_DIR)) {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  }

  const browserPath = getBrowserPath();
  const testPort = 4196;
  const appUrl = `http://localhost:${testPort}`;

  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', String(testPort)], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  try {
    await waitForServer(appUrl, 15000);
    console.log(`Server ready at ${appUrl}`);

    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });

    // -------------------------------------------------------------
    // Screen 1: Mobile (iPhone 14 / 390x844) - Home Hub Screen
    // -------------------------------------------------------------
    console.log('[1/6] Capturing Mobile Home Hub...');
    const pageMobile = await browser.newPage();
    await pageMobile.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pageMobile.goto(appUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await pageMobile.screenshot({
      path: path.join(SHOTS_DIR, '01_mobile_home_hub.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Screen 2: Mobile 1-on-1 Chat Room (Peer 1 creates room)
    // -------------------------------------------------------------
    console.log('[2/6] Capturing Mobile 1-on-1 Chat Room...');
    const launchBtn = await pageMobile.waitForSelector('.card-action-bar .btn-primary', { timeout: 5000 });
    await launchBtn.click();
    await new Promise((r) => setTimeout(r, 1200));
    await pageMobile.screenshot({
      path: path.join(SHOTS_DIR, '02_mobile_chat_room.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Screen 3: Mobile Game Arena with In-Chat Game Card & Feed
    // -------------------------------------------------------------
    console.log('[3/6] Navigating to Game Arena & Posting Game Card...');
    await pageMobile.goto(`${appUrl}/#game-pulse-nova-770`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // Open drawer and click "Add to Chat" for Cyber Grid
    const openDrawerBtn = await pageMobile.waitForSelector('.game-add-card-btn, .game-drawer-btn', { timeout: 5000 });
    await openDrawerBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    // -------------------------------------------------------------
    // Screen 4: Mobile Slide-Up Game Drawer Bottom Sheet
    // -------------------------------------------------------------
    console.log('[4/6] Capturing Mobile Slide-up Game Drawer Bottom Sheet...');
    await pageMobile.screenshot({
      path: path.join(SHOTS_DIR, '03_mobile_game_drawer_sheet.png'),
      fullPage: false,
    });

    // Click "Add to Chat" on Cyber Grid
    const addGridBtn = await pageMobile.waitForSelector('.game-drawer-card[data-game="grid"] .game-add-chat-btn, .game-drawer-card[data-game="grid"]', { timeout: 5000 });
    await addGridBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    // Send a chat message too
    const chatInput = await pageMobile.waitForSelector('.game-chat-input-bar input', { timeout: 5000 });
    await chatInput.type('Ready for a quick 3x3 duel!');
    const sendBtn = await pageMobile.waitForSelector('.game-chat-send-btn', { timeout: 5000 });
    await sendBtn.click();
    await new Promise((r) => setTimeout(r, 600));

    console.log('[5/6] Capturing Mobile In-Chat Game Card with Message Feed...');
    await pageMobile.screenshot({
      path: path.join(SHOTS_DIR, '04_mobile_in_chat_card.png'),
      fullPage: false,
    });

    // Launch Match
    const launchMatchBtn = await pageMobile.waitForSelector('.launch-card-btn, .btn-primary.purple-bg', { timeout: 5000 });
    await launchMatchBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    // Click square 0 on Cyber Grid
    const cell0 = await pageMobile.waitForSelector('.cyber-cell:nth-child(5)', { timeout: 5000 });
    if (cell0) await cell0.click();
    await new Promise((r) => setTimeout(r, 500));

    console.log('[6/6] Capturing Active Cyber Grid 3x3 Match Stage...');
    await pageMobile.screenshot({
      path: path.join(SHOTS_DIR, '05_mobile_active_match_stage.png'),
      fullPage: false,
    });

    // Desktop Viewport
    console.log('[Bonus] Capturing Desktop Viewport (1280x800)...');
    const pageDesktop = await browser.newPage();
    await pageDesktop.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await pageDesktop.goto(appUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    await pageDesktop.screenshot({
      path: path.join(SHOTS_DIR, '06_desktop_home_view.png'),
      fullPage: false,
    });

    await browser.close();
    console.log('✓ All screenshots successfully captured to:', SHOTS_DIR);
  } finally {
    try { serverProcess.kill(); } catch (_) {}
  }
}

captureScreens().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
