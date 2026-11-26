// Browser verification for the Derby Race "LICENSE EXPIRED?" billboard Easter egg:
// clicking the sign opens a 1024x576 looping video pop-up, pausing the Derby until the user clicks ✕.
import test from 'node:test';
import assert from 'node:assert/strict';
import { skip, openBrowser, startServer, pageHelpers } from './browser.js';

test('clicking the License Expired? sign opens a 1024x576 looping video pop-up and ✕ returns to the derby', { skip }, async (t) => {
  const base = await startServer(t, ['Ada', 'Grace', 'Linus', 'Hedy']);
  const send = await openBrowser(t);
  const { evaluate, until } = pageHelpers(send);
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await send('Page.enable');
  await send('Page.navigate', { url: `${base}/?test&mode=race` });
  await until('Boolean(window.derbyTest?.game?.scenery?.licenseBillboard)', 10_000, 'Derby scene and license billboard');

  // Aim the Derby camera squarely at the "LICENSE EXPIRED?" billboard and click its projected centre in the same frame.
  const target = await evaluate(`(() => {
    const game = window.derbyTest.game;
    const board = game.scenery.licenseBillboard;
    board.updateWorldMatrix(true, false);
    const pos = board.localToWorld(board.position.clone().set(0, 0, 0));
    const normal = board.localToWorld(board.position.clone().set(0, 0, 1)).sub(pos).normalize();
    const camPos = pos.clone().addScaledVector(normal, 12);
    game.setCamera(camPos, pos, 1, 100, 100);
    game.camera.position.copy(camPos);
    game.camera.lookAt(pos);
    game.camera.updateMatrixWorld(true);
    const ndc = pos.clone().project(game.camera);
    const rect = game.renderer.domElement.getBoundingClientRect();
    const x = rect.left + (ndc.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-ndc.y * 0.5 + 0.5) * rect.height;
    const hit = game.hitLicenseBillboard(x, y);
    const canvas = document.getElementById('scene');
    const opts = { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y };
    canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
    canvas.dispatchEvent(new MouseEvent('click', opts));
    return { x, y, hit };
  })()`);

  assert.equal(target.hit, true, 'raycast should hit the LICENSE EXPIRED? billboard');

  await until('Boolean(document.getElementById("license-dialog")?.open)', 5_000, 'license dialog to open');

  const opened = await evaluate(`(() => {
    const dialog = document.getElementById('license-dialog');
    const video = document.getElementById('license-video');
    const closeBtn = document.getElementById('license-close');
    const dRect = dialog.getBoundingClientRect();
    const cRect = closeBtn.getBoundingClientRect();
    return {
      open: dialog.open,
      width: Math.round(dRect.width),
      height: Math.round(dRect.height),
      closeInUpperRight: cRect.right <= dRect.right && cRect.right >= dRect.right - 40 && cRect.top >= dRect.top && cRect.top <= dRect.top + 40,
      loop: video.loop,
      src: video.getAttribute('src'),
      paused: window.derbyTest.game.paused,
    };
  })()`);

  assert.equal(opened.open, true);
  assert.equal(opened.width, 1024);
  assert.equal(opened.height, 576);
  assert.equal(opened.closeInUpperRight, true, '✕ button should sit in the upper-right corner of the dialog');
  assert.equal(opened.loop, true);
  assert.equal(opened.src, 'assets/easterEggs/softwareLicenceMeeting.mp4');
  assert.equal(opened.paused, true, 'Derby should pause while the video pop-up is open');

  // Click the ✕ button to close the pop-up and return to the Derby.
  await evaluate(`document.getElementById('license-close').click()`);
  await until('!document.getElementById("license-dialog")?.open', 5_000, 'license dialog to close');

  const closed = await evaluate(`(() => {
    const dialog = document.getElementById('license-dialog');
    const video = document.getElementById('license-video');
    return {
      open: dialog.open,
      videoPaused: video.paused,
      gamePaused: window.derbyTest.game.paused,
    };
  })()`);

  assert.equal(closed.open, false);
  assert.equal(closed.videoPaused, true);
  assert.equal(closed.gamePaused, false, 'Derby should resume after closing the pop-up');
});
