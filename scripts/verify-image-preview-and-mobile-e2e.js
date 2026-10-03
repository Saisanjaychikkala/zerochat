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

// 1x1 transparent PNG expanded to test image
function createTestImage(filePath) {
  // Simple valid PNG 8x8 pixels base64
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVChTY2AYBfg/34Gf4f//f0gwDMzff4Bh6D/DPwZ8GIZ/DP8Z8GEQjAz84eD/j/8ZAC9aG32FjC64AAAAAElFTkSuQmCC';
  const buffer = Buffer.from(pngBase64, 'base64');
  fs.writeFileSync(filePath, buffer);
}

async function runImageAndMobileVerification() {
  console.log('================================================================');
  console.log(' ZeroChat Image WhatsApp Preview & Mobile Touch Actions E2E');
  console.log('================================================================\n');

  const testImagePath = path.join(ROOT, 'test-photo.png');
  createTestImage(testImagePath);

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--no-sandbox', '--disable-web-security']
  });

  try {
    const ctxSender = await browser.createBrowserContext();
    const ctxReceiver = await browser.createBrowserContext();

    const senderPage = await ctxSender.newPage();
    const receiverPage = await ctxReceiver.newPage();

    senderPage.setViewport({ width: 1280, height: 800 });
    receiverPage.setViewport({ width: 390, height: 844 }); // Mobile phone viewport!

    // [Step 1] Sender opens home page and launches room
    console.log('[Step 1] Sender launching room...');
    await senderPage.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await senderPage.waitForSelector('.home-hub-container', { timeout: 15000 });
    await senderPage.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Start Private Chat') || b.textContent.includes('Return to Chat'));
      if (btn) btn.click();
    });

    await senderPage.waitForSelector('.chat-container', { timeout: 15000 });
    const roomId = await senderPage.evaluate(() => {
      return window.__peerService?.currentRoomId || window.__peerService?.myPeerId;
    });
    const roomUrl = `http://localhost:5173/#${roomId}`;
    console.log('  Sender Room ID:', roomId, 'URL:', roomUrl);

    // [Step 2] Receiver (Mobile) joins the room
    console.log('[Step 2] Receiver (Mobile) connecting to room...');
    await receiverPage.goto(roomUrl, { waitUntil: 'networkidle2' });
    await receiverPage.waitForSelector('.chat-container', { timeout: 15000 });

    // Wait for connection to establish
    await Promise.all([
      senderPage.waitForFunction(() => {
        const header = document.querySelector('.chat-header');
        return header && !header.textContent.includes('Waiting');
      }, { timeout: 15000 }),
      receiverPage.waitForFunction(() => {
        const header = document.querySelector('.chat-header');
        return header && !header.textContent.includes('Waiting');
      }, { timeout: 15000 }),
    ]);
    console.log('  Both peers successfully connected over WebRTC DataChannel!');

    // [Step 3] Sender sends image file
    console.log('[Step 3] Sender offering image file test-photo.png...');
    const fileInput = await senderPage.waitForSelector('#airdrop-file-input', { timeout: 5000 });
    await fileInput.uploadFile(testImagePath);

    // Verify Sender sees the ready card with image
    await senderPage.waitForSelector('.wa-media-card.ready', { timeout: 10000 });
    console.log('  Sender sees wa-media-card in ready state.');

    // [Step 4] Receiver verifies WhatsApp-style media preview card
    console.log('[Step 4] Verifying Recipient (Mobile) media preview card dimensions and elements...');
    await receiverPage.waitForSelector('.wa-media-card.idle', { timeout: 10000 });

    // CRITICAL BUG CHECK: Verify width is NOT collapsed (must be >= 250px!)
    const cardDims = await receiverPage.evaluate(() => {
      const card = document.querySelector('.wa-media-card');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      const style = window.getComputedStyle(card);
      return {
        width: rect.width,
        height: rect.height,
        minWidth: style.minWidth,
        hasDownloadBtn: !!card.querySelector('.wa-center-download-btn'),
        hasDownloadPill: !!card.querySelector('.wa-download-pill'),
        pillText: card.querySelector('.wa-download-pill')?.textContent || '',
      };
    });

    console.log('  Recipient Card Dimensions:', cardDims);
    if (!cardDims || cardDims.width < 250) {
      throw new Error(`CRITICAL FAILURE: wa-media-card collapsed! Width is ${cardDims?.width}px (must be >= 250px)`);
    }
    if (!cardDims.hasDownloadBtn) {
      throw new Error('CRITICAL FAILURE: wa-center-download-btn not found in wa-media-card!');
    }

    console.log(`  ✓ wa-media-card computed width: ${cardDims.width}px (NOT collapsed!)`);
    console.log(`  ✓ wa-media-card height: ${cardDims.height}px`);
    console.log(`  ✓ Download button present: ${cardDims.hasDownloadBtn}`);
    console.log(`  ✓ Download pill: "${cardDims.pillText}"`);

    await receiverPage.screenshot({ path: path.join(SHOTS_DIR, '01_recipient_wa_media_idle.png') });
    console.log('  Saved screenshot: 01_recipient_wa_media_idle.png');

    // [Step 5] Recipient clicks download button to stream full image
    console.log('[Step 5] Recipient clicking download to load full image...');
    await receiverPage.click('.wa-center-download-btn');

    // Wait for card to transition to ready state on recipient
    await receiverPage.waitForSelector('.wa-media-card.ready', { timeout: 12000 });
    const readyDims = await receiverPage.evaluate(() => {
      const card = document.querySelector('.wa-media-card.ready');
      const img = card?.querySelector('.wa-media-img');
      const saveBtn = card?.querySelector('.wa-media-save-btn');
      return {
        cardWidth: card?.getBoundingClientRect().width,
        imgVisible: !!img,
        hasSaveBtn: !!saveBtn,
        saveBtnText: saveBtn?.textContent || ''
      };
    });

    console.log('  Recipient Ready Card:', readyDims);
    if (!readyDims.imgVisible || !readyDims.hasSaveBtn) {
      throw new Error('CRITICAL FAILURE: wa-media-card.ready missing image or save button!');
    }
    console.log('  ✓ Recipient successfully loaded full high-res photo with Save button!');
    await receiverPage.screenshot({ path: path.join(SHOTS_DIR, '02_recipient_wa_media_ready.png') });
    console.log('  Saved screenshot: 02_recipient_wa_media_ready.png');

    // [Step 6] Mobile Touch Actions Verification
    console.log('[Step 6] Testing mobile touch interactions (tap to reveal emoji/reply dock)...');
    // Sender sends a text message
    await senderPage.type('.chat-input', 'Testing mobile actions and reactions!');
    await senderPage.keyboard.press('Enter');

    // Receiver waits for the text message
    await receiverPage.waitForFunction(() => {
      const bubbles = Array.from(document.querySelectorAll('.message-bubble'));
      return bubbles.some(b => b.textContent.includes('Testing mobile actions'));
    }, { timeout: 8000 });

    // Tap on the message bubble on mobile
    const textBubble = await receiverPage.evaluateHandle(() => {
      const bubbles = Array.from(document.querySelectorAll('.message-bubble'));
      return bubbles.find(b => b.textContent.includes('Testing mobile actions'));
    });

    await textBubble.click();
    await new Promise(r => setTimeout(r, 300));

    // Verify .message-bubble-wrapper has mobile-active class
    const isMobileActive = await receiverPage.evaluate(() => {
      const wrapper = document.querySelector('.message-bubble-wrapper.mobile-active');
      return !!wrapper;
    });

    console.log('  Message bubble tap toggled mobile-active:', isMobileActive);
    if (!isMobileActive) {
      throw new Error('CRITICAL FAILURE: Tapping message bubble did not toggle mobile-active class!');
    }

    // Verify .message-action-dock is visible
    const dockVisible = await receiverPage.evaluate(() => {
      const dock = document.querySelector('.message-bubble-wrapper.mobile-active .message-action-dock');
      if (!dock) return false;
      const style = window.getComputedStyle(dock);
      return style.opacity === '1' && style.pointerEvents === 'auto';
    });
    console.log('  Mobile action dock is visible:', dockVisible);
    if (!dockVisible) {
      throw new Error('CRITICAL FAILURE: message-action-dock not visible when mobile-active!');
    }

    // Tap reaction button to open emoji picker
    console.log('  Tapping reaction trigger button in mobile dock...');
    await receiverPage.click('.message-bubble-wrapper.mobile-active .message-action-btn[title="Add Reaction"]');
    await receiverPage.waitForSelector('.reaction-picker-flyout', { timeout: 4000 });
    console.log('  ✓ Reaction picker flyout opened!');

    // Tap 🔥 emoji
    console.log('  Tapping 🔥 emoji reaction...');
    const fireBtn = await receiverPage.waitForSelector('.reaction-emoji-btn[title*="🔥"]', { timeout: 4000 });
    await fireBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // Verify reaction pill appears on both receiver and sender
    await receiverPage.waitForSelector('.reaction-pill', { timeout: 6000 });
    await senderPage.waitForSelector('.reaction-pill', { timeout: 6000 });
    console.log('  ✓ Emoji reaction pill displayed on both mobile receiver and desktop sender!');

    // Test Reply action on mobile
    console.log('  Testing mobile reply action...');
    await textBubble.click(); // Re-open dock
    await new Promise(r => setTimeout(r, 300));
    await receiverPage.click('.message-bubble-wrapper.mobile-active .message-action-btn[title="Reply to message"]');

    await receiverPage.waitForSelector('.reply-preview-dock', { timeout: 5000 });
    console.log('  ✓ Reply Preview Dock opened on mobile!');

    await receiverPage.screenshot({ path: path.join(SHOTS_DIR, '03_recipient_mobile_actions_complete.png') });
    console.log('  Saved screenshot: 03_recipient_mobile_actions_complete.png');

    console.log('\n================================================================');
    console.log(' 🎉 ALL IMAGE PREVIEW & MOBILE TOUCH E2E TESTS PASSED PERFECTLY!');
    console.log('================================================================\n');

  } finally {
    await browser.close();
    try { fs.unlinkSync(testImagePath); } catch (e) {}
  }
}

runImageAndMobileVerification().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
