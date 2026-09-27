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

async function run() {
  const browserPath = getBrowserPath();
  const testPort = 4199;
  const appUrl = `http://localhost:${testPort}`;

  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', String(testPort)], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  try {
    await waitForServer(appUrl);
    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Open room
    await page.goto(`${appUrl}/#c4-room-test`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Open Game Drawer via .game-trigger-btn
    await page.waitForSelector('.game-trigger-btn', { timeout: 5000 });
    await page.click('.game-trigger-btn');
    await new Promise(r => setTimeout(r, 800));

    // Post Connect 4
    await page.waitForSelector('div[data-game="c4"] .game-add-chat-btn', { timeout: 5000 });
    await page.click('div[data-game="c4"] .game-add-chat-btn');
    await new Promise(r => setTimeout(r, 1000));

    // Launch Connect 4
    const launchBtn = await page.$('.launch-card-btn');
    if (launchBtn) await launchBtn.click();
    await new Promise(r => setTimeout(r, 1200));

    const c4Path = path.join(SHOTS_DIR, '11_connect4_illuminated_matrix.png');
    await page.screenshot({ path: c4Path });
    console.log('✓ Captured Connect 4 matrix:', c4Path);

    // Click column 3 to drop a disc
    const colGuides = await page.$$('.c4-guide-btn');
    if (colGuides.length > 3) {
      await colGuides[3].click();
      await new Promise(r => setTimeout(r, 800));
    }
    const c4DropPath = path.join(SHOTS_DIR, '12_connect4_after_drop.png');
    await page.screenshot({ path: c4DropPath });
    console.log('✓ Captured Connect 4 after drop:', c4DropPath);

    // Return to chat
    const returnBtn = await page.$('.return-to-chat-btn');
    if (returnBtn) await returnBtn.click();
    await new Promise(r => setTimeout(r, 600));

    const resumedPath = path.join(SHOTS_DIR, '13_returned_to_chat_dock_visible.png');
    await page.screenshot({ path: resumedPath });
    console.log('✓ Captured chat with active match dock:', resumedPath);

    await browser.close();
  } finally {
    try {
      serverProcess.kill('SIGTERM');
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } catch (e) {}
  }
}

run().catch(console.error);
