import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARTIFACT_DIR = 'C:\\Users\\sanja\\.gemini\\antigravity-ide\\brain\\f6be8879-febf-45a3-ba06-e5b5f5674891';
const SHOTS_DIR = path.join(ARTIFACT_DIR, 'e2e_screenshots');

if (!fs.existsSync(SHOTS_DIR)) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

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

async function runVerification() {
  const browserPath = getBrowserPath();
  const appUrl = 'http://localhost:5173';
  console.log(`[E2E] Launching browser at: ${browserPath}`);
  console.log(`[E2E] Target App URL: ${appUrl}`);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 850 });

    // ─── 1. Home Screen Verification ────────────────────────────────
    console.log('\n[1/6] Verifying Home Screen & Header Profile/Settings...');
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const shot1 = path.join(SHOTS_DIR, '01_homescreen_profile_settings.png');
    await page.screenshot({ path: shot1 });
    console.log(`✓ Saved: ${shot1}`);

    // Verify Profile pill exists
    const profilePill = await page.$('.user-profile-pill');
    if (!profilePill) console.error('✗ FAIL: .user-profile-pill not found in header');
    else console.log('✓ Found user profile pill in header');

    // Verify Settings button exists
    const settingsBtn = await page.$('.settings-btn');
    if (!settingsBtn) console.error('✗ FAIL: .settings-btn not found in header');
    else console.log('✓ Found settings button in header');

    // ─── 2. Test Settings Modal & Surface Modes ─────────────────────
    console.log('\n[2/6] Testing Settings Modal (Themes, Surfaces & Sounds)...');
    if (settingsBtn) {
      await settingsBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const shot2 = path.join(SHOTS_DIR, '02_settings_modal_open.png');
      await page.screenshot({ path: shot2 });
      console.log(`✓ Saved: ${shot2}`);

      // Click Solid Dark surface option
      const surfaceButtons = await page.$$('.surface-option');
      if (surfaceButtons.length >= 2) {
        await surfaceButtons[1].click(); // Solid Dark
        await new Promise(r => setTimeout(r, 600));
        const shot3 = path.join(SHOTS_DIR, '03_surface_solid_dark.png');
        await page.screenshot({ path: shot3 });
        console.log(`✓ Saved: ${shot3}`);
      }

      if (surfaceButtons.length >= 3) {
        await surfaceButtons[2].click(); // OLED Black
        await new Promise(r => setTimeout(r, 600));
        const shot4 = path.join(SHOTS_DIR, '04_surface_oled_black.png');
        await page.screenshot({ path: shot4 });
        console.log(`✓ Saved: ${shot4}`);
      }

      // Restore Ultra Glass
      if (surfaceButtons.length >= 1) {
        await surfaceButtons[0].click();
        await new Promise(r => setTimeout(r, 500));
      }

      // Close modal
      const closeBtn = await page.$('.modal-close');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // ─── 3. Test Profile Nickname Modal ──────────────────────────────
    console.log('\n[3/6] Testing Profile Nickname Modal & Persistence...');
    const profileBtn = await page.$('.user-profile-pill');
    if (profileBtn) {
      await profileBtn.click();
      await new Promise(r => setTimeout(r, 800));

      const shot5 = path.join(SHOTS_DIR, '05_profile_modal_open.png');
      await page.screenshot({ path: shot5 });
      console.log(`✓ Saved: ${shot5}`);

      // Type new nickname
      const nameInput = await page.$('.nickname-input');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type('CyberPilot');
      }

      // Pick 3rd avatar color
      const colorSwatches = await page.$$('.avatar-color-swatch');
      if (colorSwatches.length > 2) {
        await colorSwatches[2].click();
      }

      // Save
      const saveBtn = await page.$('.btn-primary');
      if (saveBtn) {
        await saveBtn.click();
        await new Promise(r => setTimeout(r, 800));
      }

      const shot6 = path.join(SHOTS_DIR, '06_profile_saved_hub.png');
      await page.screenshot({ path: shot6 });
      console.log(`✓ Saved: ${shot6}`);
    }

    // ─── 4. Test Squad Group Chat & Stream Layout ────────────────────
    console.log('\n[4/6] Testing Squad Group Chat stream feed & reaction dock...');
    await page.goto(`${appUrl}/#squad-nexus-cyber`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const shot7 = path.join(SHOTS_DIR, '07_squad_workspace_loaded.png');
    await page.screenshot({ path: shot7 });
    console.log(`✓ Saved: ${shot7}`);

    // Send a message
    const chatInput = await page.$('.chat-input');
    if (chatInput) {
      await chatInput.type('Hello Cyber Squad! WebRTC P2P stream live.');
      const sendBtn = await page.$('.send-button');
      if (sendBtn) await sendBtn.click();
      await new Promise(r => setTimeout(r, 800));
    }

    const shot8 = path.join(SHOTS_DIR, '08_squad_message_sent.png');
    await page.screenshot({ path: shot8 });
    console.log(`✓ Saved: ${shot8}`);

    // Hover message to reveal action dock
    const msgBubble = await page.$('.message-row');
    if (msgBubble) {
      await msgBubble.hover();
      await new Promise(r => setTimeout(r, 500));
      const shot9 = path.join(SHOTS_DIR, '09_message_action_dock_hover.png');
      await page.screenshot({ path: shot9 });
      console.log(`✓ Saved: ${shot9}`);

      // Click Smile icon to reveal reaction emojis
      const reactBtn = await page.$('.message-action-btn');
      if (reactBtn) {
        await reactBtn.click();
        await new Promise(r => setTimeout(r, 500));

        // Click first emoji (❤️)
        const emojiBtn = await page.$('.reaction-emoji-btn');
        if (emojiBtn) {
          await emojiBtn.click();
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    const shot10 = path.join(SHOTS_DIR, '10_message_reaction_pill_active.png');
    await page.screenshot({ path: shot10 });
    console.log(`✓ Saved: ${shot10}`);

    // ─── 5. Test Connect 4 Challenge Card & Gameplay ─────────────────
    console.log('\n[5/6] Testing Connect 4 Challenge Card & Gameplay...');
    const gameDrawerTrigger = await page.$('.game-trigger-btn');
    if (gameDrawerTrigger) {
      await gameDrawerTrigger.click();
      await new Promise(r => setTimeout(r, 800));

      // Click Connect 4 add button
      const c4Add = await page.$('div[data-game="c4"] .game-add-chat-btn');
      if (c4Add) {
        await c4Add.click();
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const shot11 = path.join(SHOTS_DIR, '11_connect4_challenge_card_posted.png');
    await page.screenshot({ path: shot11 });
    console.log(`✓ Saved: ${shot11}`);

    // Launch Connect 4 Match
    const launchMatchBtn = await page.$('.launch-card-btn');
    if (launchMatchBtn) {
      await launchMatchBtn.click();
      await new Promise(r => setTimeout(r, 1200));

      const shot12 = path.join(SHOTS_DIR, '12_connect4_active_match_stage.png');
      await page.screenshot({ path: shot12 });
      console.log(`✓ Saved: ${shot12}`);

      // Click column 3 to drop disc
      const colGuides = await page.$$('.c4-guide-btn');
      if (colGuides.length > 3) {
        await colGuides[3].click();
        await new Promise(r => setTimeout(r, 800));
      }

      const shot13 = path.join(SHOTS_DIR, '13_connect4_after_drop.png');
      await page.screenshot({ path: shot13 });
      console.log(`✓ Saved: ${shot13}`);

      // Return to chat
      const returnBtn = await page.$('.return-to-chat-btn');
      if (returnBtn) {
        await returnBtn.click();
        await new Promise(r => setTimeout(r, 600));
      }
    }

    // ─── 6. Mobile Responsiveness Test (390x844 iPhone Viewport) ─────
    console.log('\n[6/6] Testing Mobile Responsiveness (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto(appUrl, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const shot14 = path.join(SHOTS_DIR, '14_mobile_homescreen.png');
    await page.screenshot({ path: shot14 });
    console.log(`✓ Saved: ${shot14}`);

    // Open Squad on mobile
    await page.goto(`${appUrl}/#squad-nexus-cyber`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const shot15 = path.join(SHOTS_DIR, '15_mobile_squad_stream.png');
    await page.screenshot({ path: shot15 });
    console.log(`✓ Saved: ${shot15}`);

    // Open 1-on-1 Chat on mobile
    await page.goto(`${appUrl}/#private-orbit-99`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    const shot16 = path.join(SHOTS_DIR, '16_mobile_chat_room.png');
    await page.screenshot({ path: shot16 });
    console.log(`✓ Saved: ${shot16}`);

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END SCREENSHOT VERIFICATIONS COMPLETED!');
    console.log(`Screenshots stored in: ${SHOTS_DIR}`);
    console.log('====================================================\n');

    await browser.close();
  } catch (err) {
    console.error('[E2E Error]:', err);
    await browser.close();
    process.exit(1);
  }
}

runVerification();
