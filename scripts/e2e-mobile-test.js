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

async function runMobileE2ETest() {
  console.log('===========================================================');
  console.log(' ZeroChat Mobile E2E Test: 2 Peers, AirDrop & Video Calls');
  console.log('===========================================================\n');

  const browserPath = getBrowserPath();
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4173'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4173';

  try {
    await waitForServer(appUrl, 15000);
    console.log('Preview server ready at ' + appUrl);

    const browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: 'new',
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    const contextA = await browser.createBrowserContext();
    const contextB = await browser.createBrowserContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Mobile viewports
    await pageA.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pageB.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true });

    // Step 1: Peer A opens mobile app
    console.log('[Step 1] Loading Peer A on iPhone viewport (390x844)...');
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });

    // Wait for Peer A room ID to appear in Hero card
    await pageA.waitForFunction(() => {
      const el = document.querySelector('.room-code-text');
      return el && el.textContent.trim().length > 3;
    }, { timeout: 15000 });
    const roomId = await pageA.$eval('.room-code-text', (el) => el.textContent.trim());
    console.log(`✓ Peer A Room Created: #${roomId}`);

    // Step 2: Peer A tests staging a file before Peer B connects!
    console.log('\n[Step 2] Testing file staging before peer connects...');
    // Create a dummy text file to test upload
    const testFilePath = path.resolve(ROOT, 'test-mobile-airdrop.txt');
    fs.writeFileSync(testFilePath, 'ZeroChat Mobile AirDrop test file content');

    // Click AirDrop tab on Peer A
    const airdropTabBtn = await pageA.$('.mobile-segmented-bar button:nth-child(2)');
    await airdropTabBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // Upload to file input
    const fileInputA = await pageA.$('#airdrop-file-input');
    await fileInputA.uploadFile(testFilePath);
    await new Promise((r) => setTimeout(r, 600));

    // Verify staged item appears
    const isStaged = await pageA.evaluate(() => {
      return document.body.innerText.includes('Waiting for peer...');
    });
    console.log(`✓ File staged before connection: ${isStaged ? 'SUCCESS' : 'FAILED'}`);

    // Step 3: Peer B connects via URL hash
    console.log('\n[Step 3] Loading Peer B on Android viewport (360x780)...');
    const joinUrl = `${appUrl}/#${roomId}`;
    await pageB.goto(joinUrl, { waitUntil: 'networkidle0' });

    // Wait for P2P connection handshake
    console.log('Waiting for WebRTC P2P DataChannel connection...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const tag = document.querySelector('.chat-header');
        return tag && tag.textContent.includes('Encrypted memory channel active');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const tag = document.querySelector('.chat-header');
        return tag && tag.textContent.includes('Encrypted memory channel active');
      }, { timeout: 15000 }),
    ]);
    console.log('✓ WebRTC P2P DataChannel connected on mobile viewports!');

    // Verify staged file automatically transferred to Peer B!
    console.log('\n[Step 4] Verifying auto-transfer of staged AirDrop file upon connection...');
    await pageB.waitForFunction(() => {
      return document.body.innerText.includes('test-mobile-airdrop.txt');
    }, { timeout: 10000 });
    console.log('✓ Staged file auto-transferred to Peer B successfully!');

    // Switch Peer A back to chat tab
    const chatTabBtnA = await pageA.$('.mobile-segmented-bar button:nth-child(1)');
    await chatTabBtnA.click();
    await new Promise((r) => setTimeout(r, 400));

    // Step 5: Test mobile text message
    console.log('\n[Step 5] Testing Mobile Chat message...');
    await pageA.type('.chat-input', 'Mobile P2P message from iPhone to Android');
    await pageA.keyboard.press('Enter');

    await pageB.waitForFunction(() => {
      return document.body.innerText.includes('Mobile P2P message from iPhone to Android');
    }, { timeout: 5000 });
    console.log('✓ Message received on Peer B!');

    // Step 6: Test Video Call on Mobile
    console.log('\n[Step 6] Testing Encrypted Video Call initiation from Peer A...');
    // Find video call button
    const videoCallBtn = await pageA.$('.chat-header .btn-icon:nth-child(2)');
    await videoCallBtn.click();
    console.log('Peer A initiated Video Call.');

    // Wait for Incoming Call Dialog on Peer B
    console.log('Waiting for Incoming Call Dialog on Peer B (Android 360px)...');
    await pageB.waitForSelector('.call-incoming-dialog', { timeout: 10000 });
    console.log('✓ Peer B received incoming call dialog on mobile!');

    // Verify Accept button exists and click it (Lifting call)
    console.log('\n[Step 7] Peer B answering ("lifting") the video call on mobile...');
    const acceptBtn = await pageB.waitForSelector('.btn-call-accept', { timeout: 5000 });
    await acceptBtn.click();
    console.log('Peer B clicked "Accept" on mobile.');

    // Wait for Call Overlay on both peers
    await Promise.all([
      pageA.waitForSelector('.call-overlay', { timeout: 10000 }),
      pageB.waitForSelector('.call-overlay', { timeout: 10000 }),
    ]);
    console.log('✓ Call overlay active on both mobile peers!');

    // Verify call controls dock and PIP on mobile
    await pageB.waitForSelector('.call-controls-dock', { timeout: 5000 });
    await pageB.waitForSelector('.call-local-pip', { timeout: 5000 });
    console.log('✓ Call controls dock and Picture-in-Picture rendered cleanly on mobile.');

    // Step 8: Test Zoom Controls on Mobile
    console.log('\n[Step 8] Testing Zoom in / Zoom out on mobile viewport...');
    const zoomInBtn = await pageB.waitForSelector('.zoom-btn[aria-label="Zoom In"]', { timeout: 5000 });
    await zoomInBtn.click();
    await pageB.waitForFunction(() => {
      const pill = document.querySelector('.zoom-pill');
      return pill && pill.textContent.includes('125%');
    }, { timeout: 3000 });
    console.log('✓ Mobile Zoom In succeeded (125%)');

    const zoomOutBtn = await pageB.waitForSelector('.zoom-btn[aria-label="Zoom Out"]', { timeout: 3000 });
    await zoomOutBtn.click();
    await pageB.waitForFunction(() => {
      const pill = document.querySelector('.zoom-pill');
      return pill && pill.textContent.includes('100%');
    }, { timeout: 3000 });
    console.log('✓ Mobile Zoom Out succeeded (100%)');

    // Step 9: End call on mobile
    console.log('\n[Step 9] Ending call on mobile...');
    const endCallBtn = await pageA.waitForSelector('.call-dock-btn.end-call', { timeout: 5000 });
    await endCallBtn.click();

    await Promise.all([
      pageA.waitForFunction(() => !document.querySelector('.call-overlay'), { timeout: 5000 }),
      pageB.waitForFunction(() => !document.querySelector('.call-overlay'), { timeout: 5000 }),
    ]);
    console.log('✓ Call ended and overlays cleanly dismissed on both mobile peers.');

    // Clean up test file
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

    await browser.close();
    console.log('\n===========================================================');
    console.log('🎉 ALL MOBILE END-TO-END TESTS PASSED 100% WITHOUT REGRESSION!');
    console.log('===========================================================');
  } finally {
    serverProcess.kill();
  }
}

runMobileE2ETest().catch((err) => {
  console.error('Mobile E2E Test Error:', err);
  process.exit(1);
});
