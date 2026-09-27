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

async function testRealConnections() {
  console.log('--- Testing Real WebRTC Scenarios ---');
  const serverProcess = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'preview', '--', '--port', '4176'], {
    cwd: ROOT,
    stdio: 'pipe',
  });

  const appUrl = 'http://localhost:4176';

  try {
    await waitForServer(appUrl, 15000);
    console.log('Preview server ready at ' + appUrl);

    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    // SCENARIO 1: Hash change in existing tab
    console.log('\n--- SCENARIO 1: User navigates/pastes new hash into existing tab ---');
    const ctx1 = await browser.createBrowserContext();
    const p1 = await ctx1.newPage();
    p1.on('console', m => {
      if (m.text().includes('[ZeroChat]')) console.log('  [P1]', m.text());
    });
    await p1.goto(appUrl, { waitUntil: 'networkidle0' });
    const initialHash1 = await p1.evaluate(() => window.location.hash);
    console.log('P1 initial hash:', initialHash1);

    // Simulate user changing hash in address bar
    console.log('Changing P1 hash to #cosmic-test-999...');
    await p1.evaluate(() => {
      window.location.hash = '#cosmic-test-999';
    });
    await new Promise(r => setTimeout(r, 1000));

    const p1DisplayedRoom = await p1.evaluate(() => {
      const activePill = document.querySelector('.active-room-pill');
      const heroCode = document.querySelector('.room-code-text');
      return {
        hash: window.location.hash,
        activePillText: activePill ? activePill.textContent : null,
        heroCodeText: heroCode ? heroCode.textContent : null
      };
    });
    console.log('P1 DOM state after hash change:', p1DisplayedRoom);

    // SCENARIO 2: Host refreshes the page and Joiner connects
    console.log('\n--- SCENARIO 2: Host refreshes page, then Joiner connects ---');
    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('console', m => {
      if (m.text().includes('[ZeroChat]')) console.log('  [Host A]', m.text());
    });
    pageB.on('console', m => {
      if (m.text().includes('[ZeroChat]')) console.log('  [Joiner B]', m.text());
    });

    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });
    const btnA = await pageA.waitForSelector('.card-action-bar button');
    await btnA.click();
    await new Promise(r => setTimeout(r, 800));

    const roomA = (await pageA.evaluate(() => window.location.hash)).replace('#', '');
    console.log('Host A room created:', roomA);

    // Host A refreshes the page!
    console.log('Host A refreshes the page at:', `${appUrl}/#${roomA}`);
    await pageA.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    const stateAAfterReload = await pageA.evaluate(() => {
      const hero = document.querySelector('.waiting-hero-card h3');
      const code = document.querySelector('.room-code-text');
      return {
        heading: hero ? hero.textContent : null,
        roomCode: code ? code.textContent : null
      };
    });
    console.log('Host A UI after reload:', stateAAfterReload);

    // Now Joiner B joins!
    console.log(`Joiner B opens direct link ${appUrl}/#${roomA}...`);
    await pageB.goto(`${appUrl}/#${roomA}`, { waitUntil: 'networkidle0' });

    console.log('Waiting for both peers to connect...');
    let connected = false;
    try {
      await Promise.all([
        pageA.waitForFunction(() => {
          const el = document.querySelector('.chat-header');
          return el && el.textContent.includes('Online');
        }, { timeout: 10000 }),
        pageB.waitForFunction(() => {
          const el = document.querySelector('.chat-header');
          return el && el.textContent.includes('Online');
        }, { timeout: 10000 }),
      ]);
      connected = true;
      console.log('✓ Successfully connected after Host reload!');
    } catch (err) {
      console.error('❌ Connection FAILED after Host reload:', err.message);
    }

    await browser.close();
  } finally {
    serverProcess.kill();
  }
}

testRealConnections().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
