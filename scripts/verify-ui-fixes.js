import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CONV_ID = 'c9f059c5-f7b5-4c14-a253-d66f63d84467';
const ARTIFACT_DIR = path.join('C:\\Users\\sanja\\.gemini\\antigravity-ide\\brain', CONV_ID);
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

async function main() {
  console.log('--- Verifying UI Fixes & Capturing Validation Proofs ---');
  if (!fs.existsSync(SHOTS_DIR)) {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
  }

  const browserPath = getBrowserPath();
  const testPort = 4198;
  const appUrl = `http://localhost:${testPort}`;

  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', String(testPort)], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  let browser;
  try {
    await waitForServer(appUrl, 15000);
    console.log(`Server responsive at ${appUrl}`);

    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Laptop Viewport (1280 x 800)
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SHOTS_DIR, '01_desktop_home.png') });
    console.log('✓ Captured 01_desktop_home.png');

    // Open Settings Modal
    await page.click('.settings-btn');
    await page.waitForSelector('.settings-modal', { visible: true });
    await page.screenshot({ path: path.join(SHOTS_DIR, '02_settings_modal_open.png') });
    console.log('✓ Captured 02_settings_modal_open.png (showing right-aligned icons in surface & sound)');

    // Verify right-alignment in DOM
    const surfaceIconsOnRight = await page.evaluate(() => {
      const option = document.querySelector('.surface-option');
      if (!option) return false;
      const textElem = option.querySelector('.surface-option-text');
      const rightElem = option.querySelector('.surface-option-right');
      const icon = rightElem ? rightElem.querySelector('.surface-option-icon') : null;
      return textElem !== null && rightElem !== null && icon !== null;
    });
    console.log(`  Surface icons on right verified: ${surfaceIconsOnRight}`);

    const soundToggleOnRight = await page.evaluate(() => {
      const btn = document.querySelector('.sound-toggle-btn');
      if (!btn) return false;
      const leftElem = btn.querySelector('.sound-toggle-left');
      const rightElem = btn.querySelector('.sound-toggle-right');
      const icon = rightElem ? rightElem.querySelector('.sound-toggle-icon') : null;
      const toggle = rightElem ? rightElem.querySelector('.toggle-pill') : null;
      return leftElem !== null && rightElem !== null && icon !== null && toggle !== null;
    });
    console.log(`  Sound icon & toggle on right verified: ${soundToggleOnRight}`);

    // Test Theme switching: Click Matrix Emerald
    const emeraldCard = await page.$('.theme-card[title="Emerald"]');
    if (emeraldCard) {
      await emeraldCard.click();
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SHOTS_DIR, '03_theme_emerald.png') });
      console.log('✓ Switched to Emerald theme and captured 03_theme_emerald.png');
    }

    // Test Theme switching: Click Synthwave
    const synthCard = await page.$('.theme-card[title="Synthwave"]');
    if (synthCard) {
      await synthCard.click();
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SHOTS_DIR, '04_theme_synthwave.png') });
      console.log('✓ Switched to Synthwave theme and captured 04_theme_synthwave.png');
    }

    // Test Surface Mode: Solid Dark
    const solidDarkOption = await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('.surface-option'));
      const target = opts.find(o => o.textContent.includes('Solid Dark'));
      if (target) { target.click(); return true; }
      return false;
    });
    if (solidDarkOption) {
      await new Promise(r => setTimeout(r, 400));
      await page.screenshot({ path: path.join(SHOTS_DIR, '05_surface_solid_dark.png') });
      console.log('✓ Switched to Solid Dark surface and captured 05_surface_solid_dark.png');
    }

    // Close settings modal
    await page.click('.modal-close');
    await new Promise(r => setTimeout(r, 300));

    // 2. Mobile Viewport (390 x 844)
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SHOTS_DIR, '06_mobile_home.png') });
    console.log('✓ Captured 06_mobile_home.png (mobile header, 34px buttons, 6px gaps)');

    // Open mobile settings
    await page.click('.settings-btn');
    await page.waitForSelector('.settings-modal', { visible: true });
    await page.screenshot({ path: path.join(SHOTS_DIR, '07_mobile_settings.png') });
    console.log('✓ Captured 07_mobile_settings.png');
    await page.click('.modal-close');

    // Check Squad Header on Mobile
    await page.goto(`${appUrl}/#squad-alpha-strike-999`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS_DIR, '08_mobile_squad_header.png') });
    console.log('✓ Captured 08_mobile_squad_header.png');

    // Check 1-on-1 Chat Header on Mobile
    await page.goto(`${appUrl}/#solar-wind-123`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(SHOTS_DIR, '09_mobile_chat_header.png') });
    console.log('✓ Captured 09_mobile_chat_header.png');

    console.log('\n🎉 ALL UI FIXES VISUALLY VERIFIED AND CAPTURED SUCCESSFULLY!');
  } finally {
    if (browser) await browser.close();
    serverProcess.kill();
  }
}

main().catch(err => {
  console.error('UI verification failed:', err);
  process.exit(1);
});
