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

async function runThreePeersAndTransferTest() {
  console.log('===============================================================');
  console.log(' ZeroChat End-to-End 3-Peer Squad Connection & Media Transfer');
  console.log('===============================================================\n');

  // Prepare a test file
  const testFilePath = path.join(ROOT, 'test-document.pdf');
  const dummyContent = '%PDF-1.4\n%ZeroChat RAM WebRTC Test PDF File\n' + 'X'.repeat(32768) + '\n%%EOF';
  fs.writeFileSync(testFilePath, dummyContent);

  const browser = await puppeteer.launch({
    executablePath: getBrowserPath(),
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--no-sandbox', '--disable-web-security']
  });

  try {
    const ctx1 = await browser.createBrowserContext();
    const ctx2 = await browser.createBrowserContext();
    const ctx3 = await browser.createBrowserContext();

    const host = await ctx1.newPage();
    const guest1 = await ctx2.newPage();
    const guest2 = await ctx3.newPage();

    host.setViewport({ width: 1280, height: 800 });
    guest1.setViewport({ width: 1280, height: 800 });
    guest2.setViewport({ width: 390, height: 844 }); // Mobile viewport for Guest 2!

    host.on('console', m => console.log('  [Host]', m.text()));
    guest1.on('console', m => console.log('  [Guest 1]', m.text()));
    guest2.on('console', m => console.log('  [Guest 2 (Mobile)]', m.text()));

    // 1. Host creates squad room
    console.log('[Step 1] Host creating squad room...');
    await host.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await host.waitForSelector('.home-hub-container', { timeout: 15000 });
    await host.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Launch Squad'));
      if (btn) btn.click();
    });
    await host.waitForSelector('.modal-content', { timeout: 10000 });
    await host.evaluate(() => {
      document.querySelector('.modal-content button[type="submit"]')?.click();
    });
    await host.waitForFunction(() => window.location.hash.startsWith('#squad-'), { timeout: 15000 });
    const squadId = await host.evaluate(() => window.location.hash.replace('#', ''));
    console.log('✓ Host created room:', squadId);

    // 2. Guest 1 joins
    console.log('\n[Step 2] Guest 1 joining squad room...');
    await guest1.goto(`http://localhost:5173/#${squadId}`, { waitUntil: 'networkidle2' });
    await host.waitForSelector('.btn-knock-admit', { timeout: 15000 });
    console.log('Host received knock from Guest 1. Admitting...');
    await host.evaluate(() => {
      const btn = document.querySelector('.squad-knock-alert-dock .btn-knock-admit') || document.querySelector('.btn-knock-admit');
      if (btn) btn.click();
    });
    await guest1.waitForSelector('.chat-input-bar', { timeout: 15000 });
    console.log('✓ Guest 1 connected!');

    // 3. Guest 2 joins (3rd peer on mobile viewport!)
    console.log('\n[Step 3] Guest 2 joining squad room (3rd connection)...');
    await guest2.goto(`http://localhost:5173/#${squadId}`, { waitUntil: 'networkidle2' });
    await host.waitForSelector('.btn-knock-admit', { timeout: 15000 });
    console.log('Host received knock from Guest 2. Admitting...');
    await host.evaluate(() => {
      const btn = document.querySelector('.squad-knock-alert-dock .btn-knock-admit') || document.querySelector('.btn-knock-admit');
      if (btn) btn.click();
    });
    await guest2.waitForSelector('.chat-input-bar', { timeout: 15000 });
    console.log('✓ Guest 2 connected successfully!');

    // 4. Verify member counts on all 3 peers
    console.log('\n[Step 4] Verifying 3-peer roster synchronization...');
    await host.waitForFunction(() => {
      const pill = document.querySelector('.squad-occupancy-pill .occupancy-count');
      return pill && parseInt(pill.textContent.trim(), 10) >= 3;
    }, { timeout: 10000 });
    await guest1.waitForFunction(() => {
      const pill = document.querySelector('.squad-occupancy-pill .occupancy-count');
      return pill && parseInt(pill.textContent.trim(), 10) >= 3;
    }, { timeout: 10000 });
    await guest2.waitForFunction(() => {
      const pill = document.querySelector('.squad-occupancy-pill .occupancy-count');
      return pill && parseInt(pill.textContent.trim(), 10) >= 3;
    }, { timeout: 10000 });
    console.log('✓ All 3 peers see 3 members in squad roster!');

    // 5. Chat communication between all 3 peers
    console.log('\n[Step 5] Testing 3-peer chat broadcast...');
    await guest1.type('.chat-input', 'Broadcast from Guest 1!');
    await guest1.click('.send-btn');

    // Host & Guest 2 must receive Guest 1's message
    await host.waitForFunction(() => document.body.innerText.includes('Broadcast from Guest 1!'), { timeout: 10000 });
    await guest2.waitForFunction(() => document.body.innerText.includes('Broadcast from Guest 1!'), { timeout: 10000 });
    console.log('✓ Host and Guest 2 received message from Guest 1!');

    await guest2.type('.chat-input', 'Reply from Mobile Guest 2!');
    await guest2.click('.send-btn');
    await host.waitForFunction(() => document.body.innerText.includes('Reply from Mobile Guest 2!'), { timeout: 10000 });
    await guest1.waitForFunction(() => document.body.innerText.includes('Reply from Mobile Guest 2!'), { timeout: 10000 });
    console.log('✓ Host and Guest 1 received reply from Guest 2!');

    // Verify NO empty phantom message rows exist
    const hostMessageBubbles = await host.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.message-row'));
      return rows.map(r => r.querySelector('.message-bubble')?.innerText.trim() || '');
    });
    const emptyBubbles = hostMessageBubbles.filter(t => !t);
    if (emptyBubbles.length > 0) {
      throw new Error(`Found ${emptyBubbles.length} empty phantom message bubble(s) on host!`);
    }
    console.log(`✓ Zero empty message bubbles verified (Total messages: ${hostMessageBubbles.length})`);

    // 6. Media / Document transfer from Guest 1 to Guest 2 via Host relay
    console.log('\n[Step 6] Testing Telegram/WhatsApp Media Transfer (Guest 1 -> Host Relay -> Guest 2)...');
    const fileInput = await guest1.$('input[type="file"]');
    await fileInput.uploadFile(testFilePath);
    console.log('Guest 1 selected test-document.pdf to offer.');

    // Guest 1 sees ready card
    await guest1.waitForSelector('.telegram-doc-card.ready', { timeout: 15000 });
    console.log('✓ Guest 1 created local file card!');

    // Host sees idle offer card
    await host.waitForSelector('.telegram-doc-card.idle', { timeout: 15000 });
    console.log('✓ Host received file offer card with Telegram styling!');

    // Guest 2 sees idle offer card
    await guest2.waitForSelector('.telegram-doc-card.idle', { timeout: 15000 });
    console.log('✓ Guest 2 received file offer card with Telegram styling!');

    // 7. Guest 2 clicks "Get" to request file download via Host relay
    console.log('\n[Step 7] Guest 2 requesting file download on-demand...');
    await guest2.evaluate(() => {
      const getBtn = document.querySelector('.telegram-doc-card.idle .telegram-action-btn.fetch') ||
                     document.querySelector('.telegram-doc-card.idle');
      if (getBtn) getBtn.click();
    });

    // Guest 2 must receive all chunks and transition to ready state
    console.log('Waiting for Guest 2 to receive all 16KB WebRTC binary chunks...');
    await guest2.waitForSelector('.telegram-doc-card.ready', { timeout: 20000 });
    console.log('✓ Guest 2 completed file download in volatile RAM!');

    // Verify Save button has valid blob object URL
    const guest2DownloadHref = await guest2.evaluate(() => {
      const link = document.querySelector('.telegram-doc-card.ready a.telegram-action-btn.ready');
      return link ? link.getAttribute('href') : null;
    });
    console.log('✓ Guest 2 download URL verified:', guest2DownloadHref?.slice(0, 30) + '...');
    if (!guest2DownloadHref || !guest2DownloadHref.startsWith('blob:')) {
      throw new Error('Guest 2 download URL is not a valid blob object URL');
    }

    // 8. Visual inspection & screenshot capture
    console.log('\n[Step 8] Capturing screenshots for visual layout verification...');
    await host.screenshot({ path: path.join(SHOTS_DIR, '01_host_3_peers.png') });
    await guest1.screenshot({ path: path.join(SHOTS_DIR, '02_guest1_sent_file.png') });
    await guest2.screenshot({ path: path.join(SHOTS_DIR, '03_guest2_mobile_ready.png') });
    console.log('✓ Screenshots saved to screenshots/ directory!');

    console.log('\n===============================================================');
    console.log(' 🎉 ALL 3-PEER SQUAD TESTS & MEDIA TRANSFERS PASSED PERFECTLY!');
    console.log('===============================================================\n');
  } finally {
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    await browser.close();
  }
}

runThreePeersAndTransferTest().catch((err) => {
  console.error('Fatal E2E test failure:', err);
  process.exit(1);
});
