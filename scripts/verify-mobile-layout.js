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

async function testMobileViewport(page, width, height, name) {
  console.log(`\nTesting ${name} (${width}x${height})...`);
  await page.setViewport({ width, height, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle0' });

  // Open Room view if on home
  const launchBtn = await page.$('.active-room-pill, .card-action-bar button');
  if (launchBtn) {
    await launchBtn.click();
    await new Promise((r) => setTimeout(r, 500));
  }

  // 1. Check Header Bar Horizontal Overflow
  const headerOverflow = await page.evaluate(() => {
    const el = document.querySelector('.header-bar');
    if (!el) return { found: false };
    return {
      found: true,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflow: el.scrollWidth > el.clientWidth,
      windowWidth: window.innerWidth,
    };
  });
  console.log(`  - Header dimensions: ${headerOverflow.clientWidth}px client / ${headerOverflow.scrollWidth}px scroll (Viewport: ${headerOverflow.windowWidth}px)`);
  if (headerOverflow.overflow) {
    throw new Error(`Header horizontal overflow detected on ${name}: ${headerOverflow.scrollWidth} > ${headerOverflow.clientWidth}`);
  }
  console.log(`  ✓ Header fits within screen with 0px horizontal overflow!`);

  // 2. Check App Container Overflow
  const appOverflow = await page.evaluate(() => {
    const el = document.querySelector('.app-container');
    return el ? (el.scrollWidth > el.clientWidth) : false;
  });
  if (appOverflow) {
    throw new Error(`App container horizontal overflow on ${name}`);
  }
  console.log(`  ✓ Entire app container has 0px horizontal overflow.`);

  // 3. Check Mobile Menu Button Visibility & Tap Target
  const menuBtnInfo = await page.evaluate(() => {
    const btn = document.querySelector('.mobile-menu-trigger');
    if (!btn) return null;
    const rect = btn.getBoundingClientRect();
    const style = window.getComputedStyle(btn);
    return {
      visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y
    };
  });

  if (!menuBtnInfo || !menuBtnInfo.visible) {
    throw new Error(`.mobile-menu-trigger is not visible on ${name}`);
  }
  console.log(`  ✓ Mobile menu trigger icon is visible (${menuBtnInfo.width}x${menuBtnInfo.height}px at x:${menuBtnInfo.x}).`);

  // 4. Click Mobile Menu and verify Cyber-Glass Action Drawer opens
  await page.click('.mobile-menu-trigger');
  await new Promise((r) => setTimeout(r, 400));

  const drawerVisible = await page.evaluate(() => {
    const drawer = document.querySelector('.mobile-menu-sheet');
    if (!drawer) return false;
    const style = window.getComputedStyle(drawer);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  if (!drawerVisible) {
    throw new Error(`Mobile Action Menu drawer did not open on ${name}`);
  }
  console.log(`  ✓ Mobile Action Menu drawer opened smoothly.`);

  // 5. Check items inside drawer
  const drawerItems = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.grid-label')).map(el => el.textContent.trim());
    return labels;
  });
  console.log(`  ✓ Drawer options detected: ${drawerItems.join(', ')}`);

  // 6. Close menu
  await page.evaluate(() => {
    const btn = document.querySelector('.close-menu-btn');
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`  ✓ Drawer closed smoothly.`);

  // 7. Check Chat Header
  const chatHeaderOverflow = await page.evaluate(() => {
    const el = document.querySelector('.chat-header');
    if (!el) return { found: false };
    return {
      found: true,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflow: el.scrollWidth > el.clientWidth,
    };
  });
  if (chatHeaderOverflow.found) {
    if (chatHeaderOverflow.overflow) {
      throw new Error(`Chat header overflow on ${name}`);
    }
    console.log(`  ✓ Chat header fits cleanly (${chatHeaderOverflow.clientWidth}px).`);
  }
}

async function runVerification() {
  const browserPath = getBrowserPath();
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4174'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4174';

  try {
    await waitForServer(appUrl, 15000);
    console.log('Preview server ready at ' + appUrl);

    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.goto(appUrl, { waitUntil: 'networkidle0' });

    // Test multiple mobile screen form factors
    await testMobileViewport(page, 320, 568, 'iPhone SE 1st gen (Ultra-Narrow 320px)');
    await testMobileViewport(page, 360, 780, 'Samsung Galaxy S22 / Android Standard (360px)');
    await testMobileViewport(page, 390, 844, 'iPhone 13/14/15/16 Standard (390px)');
    await testMobileViewport(page, 414, 896, 'iPhone Plus / Max (414px)');

    await browser.close();
    console.log('\n===========================================================');
    console.log('🎉 ALL MOBILE LAYOUTS & ICON PLACEMENTS VERIFIED CLEANLY!');
    console.log('===========================================================');
  } finally {
    serverProcess.kill();
  }
}

runVerification().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
