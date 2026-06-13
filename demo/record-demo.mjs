/**
 * Casebook demo video recorder — extended walkthrough (~4 min).
 * Covers: list, detail, recordings, transcripts, search/filter, create consultation.
 *
 * Usage:  node demo/record-demo.mjs
 * Prereqs: npm run dev must be running (ports 4000 + 5173)
 */

import { chromium } from 'playwright';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAMES_DIR = path.join(__dirname, 'frames');
const OUTPUT     = path.join(__dirname, 'casebook-demo.mp4');
const FPS        = 10;
const W          = 1280;
const H          = 800;
const BASE       = 'http://localhost:5173';

// --- helpers -------------------------------------------------------------

let frameIdx = 0;

async function snap(page) {
  const file = path.join(FRAMES_DIR, `frame-${String(frameIdx++).padStart(5, '0')}.png`);
  await page.screenshot({ path: file });
}

async function hold(page, seconds) {
  const count = Math.max(1, Math.round(seconds * FPS));
  for (let i = 0; i < count; i++) {
    await snap(page);
    await page.waitForTimeout(1000 / FPS);
  }
}

async function wait(page, ms) {
  await page.waitForTimeout(ms);
}

async function scrollTo(page, targetY, seconds) {
  const startY = await page.evaluate(() => window.scrollY);
  const steps  = Math.max(2, Math.round(seconds * FPS));
  for (let i = 0; i <= steps; i++) {
    const t    = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(startY + (targetY - startY) * ease));
    await snap(page);
    await page.waitForTimeout(1000 / FPS);
  }
}

async function type(page, selector, text, delayMs = 80) {
  await page.click(selector);
  await wait(page, 200);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await wait(page, delayMs);
    await snap(page);
  }
}

// --- scene helpers -------------------------------------------------------

async function goToList(page) {
  await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
  await wait(page, 500);
}

// --- main ----------------------------------------------------------------

console.log('Casebook demo recorder (extended)');
console.log(`Output: ${OUTPUT}\n`);

fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: W, height: H } });
const page    = await ctx.newPage();

// ═══════════════════════════════════════════════════════════════════
// 1. INTRODUCTION — list page overview
// ═══════════════════════════════════════════════════════════════════
console.log('1. Introduction — list page');
await page.goto(BASE, { waitUntil: 'networkidle' });
await hold(page, 3);

// Read the header
await scrollTo(page, 60, 1);
await hold(page, 1.5);
await scrollTo(page, 0, 1);
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 2. BROWSE EXISTING CONSULTATIONS
// ═══════════════════════════════════════════════════════════════════
console.log('2. Browse list');
const bodyH = await page.evaluate(() => document.body.scrollHeight);
await scrollTo(page, bodyH, 3);
await hold(page, 2);
await scrollTo(page, 0, 2.5);
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 3. SEARCH — type a query, see results filter
// ═══════════════════════════════════════════════════════════════════
console.log('3. Search');
const searchBox = page.locator('input[placeholder*="Search"]');
await searchBox.click();
await hold(page, 0.5);
for (const ch of 'Marco') {
  await page.keyboard.type(ch);
  await wait(page, 80);
  await snap(page);
}
await hold(page, 2);
// Clear search
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('Backspace');
  await wait(page, 60);
  await snap(page);
}
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 4. STATUS FILTER
// ═══════════════════════════════════════════════════════════════════
console.log('4. Status filter');
const statusSelect = page.locator('select').first();
await statusSelect.selectOption('in_progress');
await hold(page, 2);
await statusSelect.selectOption('');
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 5. OPEN A CONSULTATION — detail page
// ═══════════════════════════════════════════════════════════════════
console.log('5. Open consultation');
const firstRow = page.locator('ul li').first().locator('button');
await firstRow.hover();
await hold(page, 0.8);
await firstRow.click();
await page.waitForURL(/consultation/, { timeout: 8000 }).catch(() => {});
await page.waitForLoadState('networkidle').catch(() => {});
await hold(page, 2.5);

// ═══════════════════════════════════════════════════════════════════
// 6. DETAIL — scroll to show recorder panel + recordings
// ═══════════════════════════════════════════════════════════════════
console.log('6. Detail page — scroll');
await scrollTo(page, 400, 2);
await hold(page, 2);
const detailH = await page.evaluate(() => document.body.scrollHeight);
await scrollTo(page, detailH, 3);
await hold(page, 3);
await scrollTo(page, 0, 2.5);
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 7. TRANSCRIPT — open the details element on a recording card
// ═══════════════════════════════════════════════════════════════════
console.log('7. Transcript expand');
// Scroll to the recordings section
await scrollTo(page, detailH * 0.7, 2);
await hold(page, 1);
const transcriptToggle = page.locator('details summary').first();
const exists = await transcriptToggle.count();
if (exists > 0) {
  await transcriptToggle.click();
  await hold(page, 2.5);
  await transcriptToggle.click();
  await hold(page, 1);
}
await scrollTo(page, 0, 2);
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 8. EDIT CONSULTATION — open edit modal
// ═══════════════════════════════════════════════════════════════════
console.log('8. Edit consultation');
const editBtn = page.locator('button.btn-outline').first();
await editBtn.hover();
await hold(page, 0.6);
await editBtn.click();
await hold(page, 1.5);
// Change notes
const notesField = page.locator('textarea');
await notesField.click();
await notesField.fill('Follow-up scheduled for next week. Documents reviewed.');
await hold(page, 1);
// Cancel (don't actually save — keep demo clean)
const cancelBtn = page.locator('button.btn-ghost').first();
await cancelBtn.click();
await hold(page, 1);

// ═══════════════════════════════════════════════════════════════════
// 9. BACK TO LIST → CREATE NEW CONSULTATION
// ═══════════════════════════════════════════════════════════════════
console.log('9. Back to list');
const backBtn = page.locator('button.font-mono').first();
await backBtn.click();
await page.waitForLoadState('networkidle').catch(() => {});
await hold(page, 1.5);

console.log('10. Create new consultation');
const newBtn = page.locator('button.btn-clay').first();
await newBtn.hover();
await hold(page, 0.6);
await newBtn.click();
await hold(page, 1);

// Fill form
await type(page, 'input[placeholder*="Jordan"]', 'Priya Kapoor', 75);
await hold(page, 0.4);

await page.click('input[placeholder="General"]');
await page.keyboard.press('Control+A');
for (const ch of 'Initial Assessment') {
  await page.keyboard.type(ch);
  await wait(page, 65);
  await snap(page);
}
await hold(page, 0.5);

// Change status to in_progress
await page.selectOption('select', 'in_progress');
await hold(page, 0.8);

// Add notes
await type(page, 'textarea', 'First session — intake form completed.', 55);
await hold(page, 1);

// Submit
console.log('11. Submit form');
await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle').catch(() => {});
await hold(page, 2.5);

// ═══════════════════════════════════════════════════════════════════
// 10. FINAL SHOT — new consultation open, recorder ready
// ═══════════════════════════════════════════════════════════════════
console.log('12. Final — new consultation detail');
await hold(page, 2);
const finalH = await page.evaluate(() => document.body.scrollHeight);
await scrollTo(page, finalH * 0.45, 2.5);
await hold(page, 4);

// ═══════════════════════════════════════════════════════════════════
// Done
// ═══════════════════════════════════════════════════════════════════
await browser.close();
console.log(`\nCaptured ${frameIdx} frames (${(frameIdx / FPS).toFixed(1)}s at ${FPS}fps)`);

// Encode
console.log('\nEncoding MP4...');
const enc = spawnSync('ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(FRAMES_DIR, 'frame-%05d.png'),
  '-vf', `scale=${W}:${H}`,
  '-c:v', 'libx264',
  '-crf', '20',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
  OUTPUT,
], { stdio: 'inherit' });

if (enc.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }

fs.rmSync(FRAMES_DIR, { recursive: true, force: true });

const sizeMb = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ ${OUTPUT}`);
console.log(`  ${(frameIdx / FPS).toFixed(0)}s · ${sizeMb} MB · H.264 ${W}×${H} @${FPS}fps`);
