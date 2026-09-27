import puppeteer from 'puppeteer-core';

async function testVideoLifecycle() {
  console.log('--- Starting Video Call Lifecycle Test ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--no-sandbox']
  });

  const ctxA = await browser.createBrowserContext();
  const ctxB = await browser.createBrowserContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await pageA.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  const launchBtn = await pageA.waitForSelector('.card-action-bar button');
  await launchBtn.click();
  await pageA.waitForFunction(() => document.querySelector('.room-code-text')?.textContent.trim().length > 3);
  const roomId = await pageA.$eval('.room-code-text', el => el.textContent.trim());

  await pageB.goto('http://localhost:5173/#' + roomId, { waitUntil: 'networkidle0' });
  await pageA.waitForFunction(() => document.body.innerText.includes('Encrypted memory channel active'));

  console.log('Connected in room:', roomId);

  // 1. Peer A calls Peer B
  const videoCallBtn = await pageA.waitForSelector('.btn-call-video');
  await videoCallBtn.click();

  const acceptBtn = await pageB.waitForSelector('.btn-call-accept');
  await acceptBtn.click();

  await pageA.waitForSelector('.call-overlay');
  await pageB.waitForSelector('.call-overlay');

  await new Promise(r => setTimeout(r, 2500));

  const checkVideo = async (page, name) => {
    return await page.evaluate(name => {
      const v = document.querySelector('.call-remote-video');
      if (!v) return { name, exists: false };
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 10;
      canvas.height = v.videoHeight || 10;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(v, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 15 || data[i+1] > 15 || data[i+2] > 15) nonBlack++;
      }
      return {
        name,
        exists: true,
        paused: v.paused,
        width: v.videoWidth,
        height: v.videoHeight,
        nonBlack,
        isBlack: nonBlack === 0,
      };
    }, name);
  };

  const vA1 = await checkVideo(pageA, 'A');
  const vB1 = await checkVideo(pageB, 'B');
  console.log('Initial Video State A:', vA1);
  console.log('Initial Video State B:', vB1);
  if (vA1.isBlack || vB1.isBlack) throw new Error('Initial video is black!');

  // 2. Peer A shares screen
  console.log('Peer A shares screen...');
  const shareBtnA = await pageA.waitForSelector('.btn-screen-share, [title*="Share"], [aria-label*="Share"]');
  await shareBtnA.click();
  await new Promise(r => setTimeout(r, 2500));

  const vB_screen = await checkVideo(pageB, 'B (viewing A screen)');
  console.log('Peer B viewing A screen:', vB_screen);
  if (vB_screen.isBlack) throw new Error('Screen share displayed black to peer B!');

  // Verify badge exists on Peer B
  const bBadge = await pageB.evaluate(() => document.querySelector('.remote-sharing-badge')?.textContent);
  console.log('Peer B badge text:', bBadge);
  if (!bBadge || !bBadge.includes('sharing screen')) throw new Error('Screen share badge missing on peer B');

  // 3. Peer A stops screen share
  console.log('Peer A stops screen share...');
  await shareBtnA.click();
  await new Promise(r => setTimeout(r, 2500));

  const vB_restored = await checkVideo(pageB, 'B (viewing restored A camera)');
  console.log('Peer B viewing restored camera:', vB_restored);
  if (vB_restored.isBlack) throw new Error('Camera restore after screen share is black!');

  // 4. End Call
  console.log('Ending call from Peer A...');
  const endBtn = await pageA.waitForSelector('.call-dock-btn.end-call');
  await endBtn.click();
  await new Promise(r => setTimeout(r, 1500));

  const overlayA = await pageA.$('.call-overlay');
  const overlayB = await pageB.$('.call-overlay');
  if (overlayA || overlayB) throw new Error('Call overlay did not close properly on end');

  console.log('Call ended cleanly on both peers.');
  await browser.close();
  console.log('--- Video Call Lifecycle Test Passed 100% ---');
}

testVideoLifecycle().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
