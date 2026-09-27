import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

async function testDisconnectRejoin() {
  const watchdog = setTimeout(() => {
    console.error('Watchdog timeout: terminating test after 45s');
    process.exit(1);
  }, 45000);
  watchdog.unref();

  console.log('--- Testing Room Disconnect & Rejoin Flow ---');
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4177'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4177';

  try {
    await waitForServer(appUrl, 15000);
    console.log('Preview server ready at ' + appUrl);

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[ZeroChat]')) console.log('  [Host A]', txt);
    });
    pageB.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('[ZeroChat]')) console.log('  [Guest B]', txt);
    });

    console.log('\n1. Host A opens app and creates a room...');
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });
    const btnLaunchA = await pageA.waitForSelector('.card-action-bar button');
    await btnLaunchA.click();
    await new Promise(r => setTimeout(r, 1200));

    const roomA = (await pageA.evaluate(() => window.location.hash)).replace('#', '');
    console.log(`Host A created room "${roomA}"`);

    console.log(`\n2. Guest B joins room "${roomA}" via quick join...`);
    await pageB.goto(appUrl, { waitUntil: 'networkidle0' });
    await pageB.waitForSelector('.quick-join-input-group input');
    await pageB.type('.quick-join-input-group input', roomA);
    await pageB.click('.quick-join-input-group button');

    console.log('Waiting for initial connection between Host A and Guest B...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 })
    ]);
    console.log('✓ Initial connection SUCCESS: Both peers online!');

    console.log('\n3. Guest B disconnects and returns to Home screen...');
    // Guest B clicks disconnect / leave room
    await pageB.evaluate(() => {
      const leaveBtn = document.querySelector('button[title*="Disconnect"]') || document.querySelector('button[title*="Homescreen Hub"]');
      if (leaveBtn) leaveBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Guest B is on Home screen
    const isGuestOnHome = await pageB.evaluate(() => {
      return !!document.querySelector('.home-hero-section');
    });
    console.log(`Guest B on Home screen: ${isGuestOnHome}`);

    console.log('\n4. Host A should still be waiting in the room...');
    const hostAState = await pageA.evaluate(() => {
      const header = document.querySelector('.chat-header');
      return header ? header.textContent : '';
    });
    console.log('Host A header state:', hostAState.replace(/\s+/g, ' ').trim());

    console.log(`\n5. Guest B re-enters room code "${roomA}" from Home screen...`);
    await pageB.waitForSelector('.quick-join-input-group input');
    await pageB.type('.quick-join-input-group input', roomA);
    await pageB.click('.quick-join-input-group button');

    console.log('Waiting for Host A and Guest B to RECONNECT...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const el = document.querySelector('.chat-header');
        return el && el.textContent.includes('Online');
      }, { timeout: 15000 })
    ]);
    console.log('✓ RECONNECTION SUCCESS! Both peers reconnected cleanly without room_occupied error!');

    console.log('\n6. Testing Game Arena and Game Shelf on Host A...');
    await pageA.evaluate(() => {
      window.location.hash = '#game-' + window.location.hash.replace('#', '');
    });
    await new Promise(r => setTimeout(r, 1500));

    const gameArenaElements = await pageA.evaluate(() => {
      const shelf = document.querySelector('.game-shelf-container');
      const cards = document.querySelectorAll('.game-select-card');
      const qrBtn = document.querySelector('.game-room-pill button[title*="QR"]');
      const voiceDock = document.querySelector('.game-voice-dock');
      return {
        hasShelf: !!shelf,
        cardCount: cards.length,
        hasQrBtn: !!qrBtn,
        hasVoiceDock: !!voiceDock
      };
    });
    console.log('Game Arena DOM inspection:', gameArenaElements);

    if (!gameArenaElements.hasShelf || gameArenaElements.cardCount !== 3) {
      throw new Error(`Game Shelf failed verification: ${JSON.stringify(gameArenaElements)}`);
    }

    console.log('✓ Game Shelf successfully verified with 3 playable games!');
    await browser.close();
    console.log('\n✓ ALL AUTOMATED CHECKS PASSED PERFECTLY!');
  } finally {
    try {
      if (serverProcess?.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
        serverProcess.kill('SIGTERM');
      }
    } catch (_) {}
  }
}

testDisconnectRejoin()
  .then(() => {
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Disconnect-Rejoin Test FAILED:', err);
    process.exit(1);
  });
