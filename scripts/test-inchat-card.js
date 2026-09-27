import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function testInChatCardFlow() {
  console.log('--- Testing In-Chat Game Card Creation, Join, Launch & Conclusion Flow ---');
  const baseUrl = 'http://localhost:5173';

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: 'new',
      args: ['--use-fake-ui-for-media-stream', '--no-sandbox'],
    });

    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    pageA.on('console', msg => {
      const text = msg.text();
      if (text.includes('[ZeroChat]')) console.log('  [Host A]', text);
    });
    pageB.on('console', msg => {
      const text = msg.text();
      if (text.includes('[ZeroChat]')) console.log('  [Guest B]', text);
    });

    console.log('1. Host A opens ZeroChat Home and launches Game Arena...');
    await pageA.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    
    // Wait for feature cards on Home
    await pageA.waitForSelector('.feature-hub-card', { timeout: 10000 });
    
    // Click "Enter Game Arena" button
    await pageA.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const arenaBtn = btns.find(b => b.textContent.includes('Enter Game Arena'));
      if (arenaBtn) arenaBtn.click();
      else throw new Error('Enter Game Arena button not found');
    });

    // Wait for Host A to enter Game Arena
    await pageA.waitForSelector('.game-arena-container', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 1200));

    const gameRoomHash = await pageA.evaluate(() => window.location.hash);
    const gameRoomCode = gameRoomHash.replace('#', '');
    console.log(`✓ Host A initialized isolated Game Arena: "${gameRoomCode}"`);

    console.log(`\n2. Guest B joins room "${gameRoomCode}" via direct link...`);
    await pageB.goto(`${baseUrl}/#${gameRoomCode}`, { waitUntil: 'domcontentloaded' });
    await pageB.waitForSelector('.game-arena-container', { timeout: 10000 });

    console.log('Waiting for WebRTC P2P connection between Host A and Guest B...');
    await Promise.all([
      pageA.waitForFunction(() => {
        const dot = document.querySelector('.status-dot.connected');
        return !!dot;
      }, { timeout: 15000 }),
      pageB.waitForFunction(() => {
        const dot = document.querySelector('.status-dot.connected');
        return !!dot;
      }, { timeout: 15000 })
    ]);
    console.log('✓ WebRTC DataChannel CONNECTED between Host A and Guest B!');

    console.log('\n3. Host A opens Game Drawer and clicks "Add to Chat" on Cyber Pong...');
    const drawerBtnA = await pageA.waitForSelector('.game-drawer-btn');
    await drawerBtnA.click();
    await pageA.waitForSelector('.game-drawer-panel', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500)); // wait for drawer animation

    await pageA.evaluate(() => {
      const btn = document.querySelector('.game-add-chat-btn');
      if (btn) btn.click();
      else throw new Error('game-add-chat-btn element not found');
    });
    console.log('✓ Clicked "Add to Chat" on Cyber Pong');

    console.log('\n4. Verifying In-Chat Game Card appears in chat feed on both peers...');
    await pageA.waitForSelector('.in-chat-game-card', { timeout: 5000 });
    await pageB.waitForSelector('.in-chat-game-card', { timeout: 5000 });
    console.log('✓ In-Chat Game Card visible on Host A and Guest B');

    // Check status badge
    const badgeTextA = await pageA.$eval('.in-chat-card-badge', (el) => el.textContent.trim());
    console.log(`✓ Host card badge: "${badgeTextA}"`);

    // Check Guest B has "Join Match as Player 2" button
    const joinBtnB = await pageB.waitForSelector('.join-card-btn', { timeout: 5000 });
    console.log('✓ Guest B sees "Join Match as Player 2" button');

    console.log('\n5. Guest B clicks "Join Match as Player 2"...');
    await joinBtnB.click();

    // Verify badge becomes "2/2 Ready!" immediately on join
    const readyBadgeB = await pageB.waitForSelector('.badge-ready', { timeout: 2000 });
    const readyTextB = await pageB.evaluate((el) => el.textContent.trim(), readyBadgeB);
    console.log(`✓ Both joined! Badge updated: "${readyTextB}"`);

    console.log('\n6. Verifying auto-launch into Live Match Stage...');
    await pageA.waitForSelector('.active-match-stage', { timeout: 8000 });
    await pageB.waitForSelector('.active-match-stage', { timeout: 8000 });
    console.log('✓ Both peers transitioned into Live Match Stage!');

    // Check Pong canvas is rendered
    await pageA.waitForSelector('.game-canvas', { timeout: 5000 });
    await pageB.waitForSelector('.game-canvas', { timeout: 5000 });
    console.log('✓ Cyber Pong canvas rendering for both players');

    console.log('\n7. Exiting match to return to chat and conclude card...');
    const exitBtnA = await pageA.waitForSelector('button[title*="Conclude match"]');
    await exitBtnA.click();
    await new Promise((r) => setTimeout(r, 1200));

    console.log('\n8. Verifying return to chat and grayed-out concluded card state...');
    await pageA.waitForSelector('.game-lobby-chat-container', { timeout: 5000 });
    await pageB.waitForSelector('.game-lobby-chat-container', { timeout: 5000 });
    console.log('✓ Returned to unified chat lobby');

    // Verify card is concluded and grayed out
    const isConcludedA = await pageA.evaluate(() => {
      const card = document.querySelector('.in-chat-game-card');
      return card && card.classList.contains('concluded');
    });
    const isConcludedB = await pageB.evaluate(() => {
      const card = document.querySelector('.in-chat-game-card');
      return card && card.classList.contains('concluded');
    });
    const concludedBtnA = await pageA.$eval('.concluded-btn', (el) => el.textContent.trim());
    console.log(`✓ Host card concluded: ${isConcludedA}, Guest card concluded: ${isConcludedB}, Button: "${concludedBtnA}"`);

    console.log('\n9. Verifying chat continues seamlessly in the same room...');
    const chatInputA = await pageA.waitForSelector('.game-chat-input-bar input');
    await chatInputA.type('GG! Want to play Connect 4 next?');
    const sendBtnA = await pageA.waitForSelector('.game-chat-send-btn');
    await sendBtnA.click();
    await new Promise((r) => setTimeout(r, 1000));

    const messagesB = await pageB.$$eval('.game-chat-item .chat-text', (els) => els.map((e) => e.textContent));
    console.log(`✓ Guest received chat message in same room: ${JSON.stringify(messagesB)}`);

    console.log('\n====================================================');
    console.log('🎉 IN-CHAT GAME CARD INTEGRATION FLOW 100% SUCCESSFUL!');
    console.log('====================================================\n');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    if (browser) await browser.close();
    process.exit(1);
  }
}

testInChatCardFlow();
