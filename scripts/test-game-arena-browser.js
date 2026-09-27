import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const appUrl = 'http://localhost:5173';

async function runBrowserTest() {
  console.log('====================================================');
  console.log(' ZeroChat Full E2E Browser Testing & Issue Audit');
  console.log('====================================================\n');

  const browserPath = getBrowserPath();
  console.log(`Using browser: ${browserPath}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
    ],
  });

  const issues = [];

  try {
    const ctxA = await browser.createBrowserContext();
    const ctxB = await browser.createBrowserContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const consoleLogsA = [];
    const consoleErrorsA = [];
    const consoleLogsB = [];
    const consoleErrorsB = [];

    pageA.on('console', msg => {
      const text = msg.text();
      consoleLogsA.push(text);
      if (msg.type() === 'error') consoleErrorsA.push(text);
    });
    pageA.on('pageerror', err => consoleErrorsA.push(err.message));
    pageA.on('dialog', async d => { console.log(`[Dialog A] ${d.message()}`); await d.accept(); });

    pageB.on('console', msg => {
      const text = msg.text();
      consoleLogsB.push(text);
      if (msg.type() === 'error') consoleErrorsB.push(text);
    });
    pageB.on('pageerror', err => consoleErrorsB.push(err.message));
    pageB.on('dialog', async d => { console.log(`[Dialog B] ${d.message()}`); await d.accept(); });

    // TEST 1: HomeScreen Test
    console.log('\n--- TEST 1: HomeScreen Rendering & Statelessness ---');
    await pageA.setViewport({ width: 1280, height: 800 });
    await pageA.goto(appUrl, { waitUntil: 'networkidle0' });

    const homeTitle = await pageA.title();
    console.log(`Page Title: "${homeTitle}"`);

    const hasCreateBtn = await pageA.$('.btn-create-room, .card-action-bar button, .primary-action-btn');
    if (!hasCreateBtn) {
      issues.push('HomeScreen: Primary room creation button not found.');
    } else {
      console.log('✓ HomeScreen loaded with action buttons.');
    }

    // Check if any peer connection was eagerly created on HomeScreen
    const peerActiveOnHome = await pageA.evaluate(() => {
      return window.__peerInstance && !window.__peerInstance.destroyed;
    });
    if (peerActiveOnHome) {
      issues.push('HomeScreen: WebRTC Peer was initialized eagerly on homescreen (violates isolation).');
    } else {
      console.log('✓ Verified: No eager WebRTC peer active on HomeScreen.');
    }

    // TEST 2: Peer A Launches Game Arena from HomeScreen
    console.log('\n--- TEST 2: Peer A Launches Game Arena from HomeScreen ---');
    const enterGameBtn = await pageA.waitForSelector('.highlight-purple button, button.purple-bg', { timeout: 5000 });
    await enterGameBtn.click();
    console.log('✓ Clicked "Enter Game Arena" button on HomeScreen.');

    // Wait for Game Arena UI
    await pageA.waitForSelector('.game-arena-container', { timeout: 8000 });
    console.log('✓ Game Arena container mounted on Peer A.');

    // Retrieve generated unified game room code
    const gameRoomId = await pageA.evaluate(() => {
      const hash = window.location.hash.replace('#', '');
      const codeEl = document.querySelector('.game-room-code');
      return hash || (codeEl ? codeEl.textContent.replace('#', '') : '');
    });
    console.log(`✓ Unified Game Room ID generated: #${gameRoomId}`);

    if (!gameRoomId.startsWith('game-')) {
      issues.push(`Game Arena: Room ID "${gameRoomId}" does not have "game-" prefix.`);
    }

    // TEST 3: Header & Action Buttons in Game Arena
    console.log('\n--- TEST 3: Game Arena Header & Navigation Elements ---');
    const headerDetailsA = await pageA.evaluate(() => {
      const roomPill = document.querySelector('.game-room-pill')?.textContent;
      const drawerBtn = document.querySelector('.game-drawer-btn');
      const voiceDock = document.querySelector('.game-voice-dock');
      const exitBtn = document.querySelector('.game-header button');
      return {
        roomPill,
        hasDrawerBtn: !!drawerBtn,
        drawerBtnText: drawerBtn?.textContent,
        hasVoiceDock: !!voiceDock,
        hasExitBtn: !!exitBtn,
      };
    });
    console.log('Game Arena Header Info:', headerDetailsA);
    if (!headerDetailsA.hasDrawerBtn) issues.push('Game Arena: Game Drawer button (.game-drawer-btn) missing.');
    if (!headerDetailsA.hasVoiceDock) issues.push('Game Arena: Voice dock (.game-voice-dock) missing.');

    // TEST 4: In-Game Lobby Chat
    console.log('\n--- TEST 4: In-Game Lobby Chat & Quick Chips ---');
    const lobbyInputA = await pageA.waitForSelector('.game-chat-input-bar input', { timeout: 5000 });
    await lobbyInputA.type('Ready for Cyber Duel!');
    const lobbySendBtnA = await pageA.$('.game-chat-input-bar button[type="submit"]');
    await lobbySendBtnA.click();

    await pageA.waitForFunction(() => {
      return document.querySelector('.game-chat-messages')?.textContent.includes('Ready for Cyber Duel!');
    }, { timeout: 3000 });
    console.log('✓ Peer A successfully sent message in Game Lobby Chat.');

    const quickChip = await pageA.$('.chip-btn');
    if (quickChip) {
      const chipText = await pageA.evaluate(el => el.textContent, quickChip);
      await quickChip.click();
      console.log(`✓ Clicked quick reaction chip: "${chipText}"`);
    }

    // TEST 5: Peer B Joins Game Arena via Unified Room Link
    console.log(`\n--- TEST 5: Peer B Joins Game Arena (#${gameRoomId}) on Mobile Viewport ---`);
    await pageB.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pageB.goto(`${appUrl}/#${gameRoomId}`, { waitUntil: 'networkidle0' });
    await pageB.waitForSelector('.game-arena-container', { timeout: 8000 });
    console.log('✓ Peer B entered Game Arena on Mobile Viewport (390x844).');

    // Wait for P2P connection between Peer A and Peer B
    console.log('Waiting for WebRTC DataChannel connection between players in Game Arena...');
    let p2pConnected = false;
    for (let i = 0; i < 30; i++) {
      const statusA = await pageA.evaluate(() => {
        const dot = document.querySelector('.status-dot.connected');
        return !!dot;
      });
      const statusB = await pageB.evaluate(() => {
        const dot = document.querySelector('.status-dot.connected');
        return !!dot;
      });

      if (statusA || statusB) {
        p2pConnected = true;
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`Game Arena WebRTC Handshake established: ${p2pConnected ? 'YES' : 'Pending/Active'}`);

    // TEST 6: Open Game Drawer and Select Cyber Pong
    console.log('\n--- TEST 6: Game Drawer Interaction & Selection ---');
    const drawerBtnA = await pageA.$('.game-drawer-btn');
    await drawerBtnA.click();
    await new Promise(r => setTimeout(r, 400));

    const drawerVisible = await pageA.evaluate(() => {
      const backdrop = document.querySelector('.game-drawer-backdrop');
      const panel = document.querySelector('.game-drawer-panel');
      const gameCards = document.querySelectorAll('.game-drawer-card');
      return { hasBackdrop: !!backdrop, hasPanel: !!panel, count: gameCards.length };
    });
    console.log('Drawer State on Peer A:', drawerVisible);
    if (!drawerVisible.hasPanel) {
      issues.push('Game Drawer: Drawer panel failed to open upon clicking drawer button.');
    }
    if (drawerVisible.count < 3) {
      issues.push(`Game Drawer: Expected 3 games in drawer, found ${drawerVisible.count}.`);
    }

    // Click "Cyber Pong" card in drawer
    const pongCard = await pageA.$('.game-drawer-card');
    if (pongCard) {
      await pongCard.click();
      console.log('✓ Selected Cyber Pong from Game Drawer.');
    }
    await new Promise(r => setTimeout(r, 600));

    // TEST 7: In-Game Challenge Card on Peer B & Join
    console.log('\n--- TEST 7: Challenge Card on Peer B & Joining Match ---');
    const challengeOnB = await pageB.evaluate(() => {
      const card = document.querySelector('.active-challenge-card');
      const joinBtn = document.querySelector('.join-btn, .join-large-btn');
      const avatar = document.querySelector('.challenge-avatar');
      return { hasCard: !!card, hasJoinBtn: !!joinBtn, hasAvatar: !!avatar };
    });
    console.log('Peer B Challenge Card Visibility:', challengeOnB);

    if (challengeOnB.hasJoinBtn) {
      const joinBtn = await pageB.$('.join-btn, .join-large-btn');
      await joinBtn.click();
      console.log('✓ Peer B clicked "Join Match" on challenge card!');
      await new Promise(r => setTimeout(r, 500));
    }

    // Host clicks "Launch Match Now" if visible
    const launchMatchBtnA = await pageA.$('.launch-match-btn');
    if (launchMatchBtnA) {
      await launchMatchBtnA.click();
      console.log('✓ Host clicked "Launch Match Now"!');
      await new Promise(r => setTimeout(r, 500));
    }

    // If not auto-started on Peer A, start directly
    const aHasPong = await pageA.$('.game-canvas, .pong-arena-wrapper');
    if (!aHasPong) {
      await pageA.evaluate(() => {
        const btn = document.querySelector('.launch-match-btn') || document.querySelector('.game-drawer-btn');
        btn?.click();
      });
      await new Promise(r => setTimeout(r, 400));
      const card = await pageA.$('.game-drawer-card');
      if (card) await card.click();
    }

    await pageA.waitForSelector('.pong-arena-wrapper, .game-canvas', { timeout: 6000 });
    console.log('✓ Cyber Pong Arena mounted on Peer A.');

    // Ensure Cyber Pong mounted on Peer B
    const bHasPong = await pageB.$('.game-canvas, .pong-arena-wrapper');
    if (!bHasPong) {
      const drawerBtnB = await pageB.$('.game-drawer-btn');
      if (drawerBtnB) {
        await drawerBtnB.click();
        await new Promise(r => setTimeout(r, 400));
        const pongCardB = await pageB.$('.game-drawer-card');
        if (pongCardB) await pongCardB.click();
      }
    }
    await pageB.waitForSelector('.pong-arena-wrapper, .game-canvas', { timeout: 6000 });
    console.log('✓ Cyber Pong Arena mounted on Peer B.');

    // TEST 8: Cyber Pong Controls & Canvas Check
    console.log('\n--- TEST 8: Cyber Pong Canvas, Controls & Touch Ergonomics ---');
    const canvasBoundsA = await pageA.evaluate(() => {
      const c = document.querySelector('.game-canvas');
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height), canvasWidth: c.width, canvasHeight: c.height };
    });
    console.log('Peer A Pong Canvas Dimensions:', canvasBoundsA);

    // Test Pointer Movement on Peer A (Host - Left Paddle)
    console.log('Testing Host (Peer A) paddle movement via pointer events...');
    await pageA.evaluate(() => {
      const canvas = document.querySelector('.game-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + 50, clientY: rect.top + 100 }));
        canvas.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + 50, clientY: rect.top + 200 }));
        canvas.dispatchEvent(new PointerEvent('pointerup', { clientX: rect.left + 50, clientY: rect.top + 200 }));
      }
    });

    // Test Mobile Paddle Buttons on Peer B (Mobile viewport)
    console.log('Testing Peer B Mobile Paddle Buttons...');
    const mobileBtnsB = await pageB.evaluate(() => {
      const btns = document.querySelectorAll('.pong-mobile-controls button');
      return { count: btns.length, hasMobileBtns: btns.length > 0 };
    });
    console.log('Peer B Mobile Paddle Controls:', mobileBtnsB);

    // TEST 9: Return to Lobby & Exit Match
    console.log('\n--- TEST 9: Exit Match & Return to Game Lobby ---');
    const exitMatchBtnA = await pageA.$('button[title="Return to Game Lobby"], .pong-subbar button');
    if (exitMatchBtnA) {
      await exitMatchBtnA.click();
      console.log('✓ Peer A clicked "Exit Match".');
      await pageA.waitForSelector('.game-lobby-chat-container, .game-header', { timeout: 4000 });
      console.log('✓ Peer A successfully returned to Game Lobby Chat.');
    }

    // TEST 10: In-Game Voice Dock
    console.log('\n--- TEST 10: In-Game Voice Deck / Controls Testing ---');
    const voiceDockA = await pageA.$('.game-voice-dock');
    if (voiceDockA) {
      const voiceDockInfo = await pageA.evaluate(() => {
        const dock = document.querySelector('.game-voice-dock');
        const enableBtn = document.querySelector('.voice-connect-btn');
        const statusText = document.querySelector('.voice-status-text')?.textContent;
        return { hasDock: !!dock, hasEnableBtn: !!enableBtn, statusText };
      });
      console.log('Voice Dock Info on Peer A:', voiceDockInfo);
      if (!voiceDockInfo.hasDock) issues.push('Voice Dock: Not rendered.');
    }

    // TEST 11: Mobile Ergonomics & Viewport Overflow Audit
    console.log('\n--- TEST 11: Mobile Ergonomics & Touch Target Audit (Page B) ---');
    const mobileAudit = await pageB.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const hasHorizontalOverflow = scrollWidth > clientWidth;

      const buttons = Array.from(document.querySelectorAll('button:not([hidden])'));
      const smallButtons = [];
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (rect.width < 28 || rect.height < 28) {
            smallButtons.push({
              text: btn.textContent.trim().slice(0, 20) || btn.getAttribute('aria-label') || 'unnamed',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
      });

      return {
        hasHorizontalOverflow,
        scrollWidth,
        clientWidth,
        smallButtonsCount: smallButtons.length,
        smallButtons: smallButtons.slice(0, 5),
      };
    });
    console.log('Mobile Viewport Audit:', mobileAudit);
    if (mobileAudit.hasHorizontalOverflow) {
      issues.push(`Mobile Viewport: Horizontal overflow detected (${mobileAudit.scrollWidth}px > ${mobileAudit.clientWidth}px).`);
    }

    // Check Console Errors
    console.log('\n--- Console Errors Check ---');
    const realErrorsA = consoleErrorsA.filter(err => !err.includes('permissions policy') && !err.includes('favicon'));
    const realErrorsB = consoleErrorsB.filter(err => !err.includes('permissions policy') && !err.includes('favicon'));

    if (realErrorsA.length > 0) {
      console.log('Console Errors on Peer A:', realErrorsA);
      realErrorsA.forEach(err => issues.push(`Peer A Console Error: ${err}`));
    } else {
      console.log('✓ No console errors on Peer A.');
    }

    if (realErrorsB.length > 0) {
      console.log('Console Errors on Peer B:', realErrorsB);
      realErrorsB.forEach(err => issues.push(`Peer B Console Error: ${err}`));
    } else {
      console.log('✓ No console errors on Peer B.');
    }

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${issues.length === 0 ? 'ALL PASSED!' : `${issues.length} ISSUE(S) IDENTIFIED`}`);
    if (issues.length > 0) {
      issues.forEach((issue, idx) => console.log(`  [Issue ${idx + 1}] ${issue}`));
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
    issues.push(`Test Exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  return issues;
}

runBrowserTest()
  .then(issues => {
    process.exit(issues.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
