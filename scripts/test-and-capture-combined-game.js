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

async function testCombinedGameChat() {
  console.log('Testing Combined Game + Chat with Return to Chat button in Puppeteer...');
  if (!fs.existsSync(SHOTS_DIR)) {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  }

  const browserPath = getBrowserPath();
  const testPort = 4198;
  const appUrl = `http://localhost:${testPort}`;

  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', String(testPort)], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  try {
    await waitForServer(appUrl, 15000);
    console.log(`Server responsive at ${appUrl}`);

    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    // Test on Mobile viewport (iPhone 14)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Step 1: Open chat room
    console.log('1. Navigating to room #cosmic-radar-780...');
    await page.goto(`${appUrl}#cosmic-radar-780`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1200));

    // Verify game trigger button exists
    const gameTrigger = await page.$('.game-trigger-btn');
    if (!gameTrigger) throw new Error('Game trigger button (.game-trigger-btn) not found in ChatInputBar');
    console.log('✓ Found Game trigger button in ChatInputBar');

    // Step 2: Open Game Drawer
    console.log('2. Clicking Game trigger button to open slide-up drawer...');
    await page.click('.game-trigger-btn');
    await new Promise((r) => setTimeout(r, 800));

    const shotDrawerPath = path.join(SHOTS_DIR, '07_in_chat_game_drawer.png');
    await page.screenshot({ path: shotDrawerPath, fullPage: false });
    console.log(`✓ Saved ${shotDrawerPath}`);

    // Step 3: Add Cyber Grid to Chat
    console.log('3. Clicking Add to Chat on Cyber Grid...');
    await page.waitForSelector('div[data-game="grid"]', { timeout: 5000 });
    await page.click('div[data-game="grid"] .game-add-chat-btn');
    await new Promise((r) => setTimeout(r, 1000));

    const shotCardPath = path.join(SHOTS_DIR, '08_in_chat_game_card_posted.png');
    await page.screenshot({ path: shotCardPath, fullPage: false });
    console.log(`✓ Saved ${shotCardPath}`);

    // Step 4: Click Launch Game Now!
    console.log('4. Launching match stage...');
    const launchBtn = await page.$('.launch-card-btn');
    if (!launchBtn) throw new Error('Launch card button not found');
    await launchBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Verify ActiveMatchStage with Return to Chat button is visible
    const returnBtn = await page.$('.return-to-chat-btn');
    if (!returnBtn) throw new Error('Return to Chat button (.return-to-chat-btn) not found on active match stage');
    console.log('✓ Found Return to Chat button with ArrowLeft icon on ActiveMatchStage');

    const shotStagePath = path.join(SHOTS_DIR, '09_active_game_with_return_to_chat.png');
    await page.screenshot({ path: shotStagePath, fullPage: false });
    console.log(`✓ Saved ${shotStagePath}`);

    // Step 5: Click Return to Chat button
    console.log('5. Clicking Return to Chat button...');
    await returnBtn.click();
    await new Promise((r) => setTimeout(r, 800));

    // Verify floating active match dock is visible in chat
    const floatingDock = await page.$('.active-match-floating-dock');
    if (!floatingDock) throw new Error('Floating dock (.active-match-floating-dock) not found after returning to chat');
    console.log('✓ Found Floating Active Match banner in chat');

    const shotReturnedPath = path.join(SHOTS_DIR, '10_returned_to_chat_with_dock.png');
    await page.screenshot({ path: shotReturnedPath, fullPage: false });
    console.log(`✓ Saved ${shotReturnedPath}`);

    await browser.close();
    console.log('\n🎉 ALL COMBINED GAME + CHAT CAPTURES & TESTS PASSED PERFECTLY!\n');
  } finally {
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {}
  }
}

testCombinedGameChat().catch((err) => {
  console.error('Error in testCombinedGameChat:', err);
  process.exit(1);
});
