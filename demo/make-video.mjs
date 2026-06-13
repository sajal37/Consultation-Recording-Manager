/**
 * Casebook — production demo video generator
 *
 * Pipeline:
 *   1. Generate voice narration with edge-tts (free Microsoft neural TTS)
 *   2. Measure audio durations so screen actions sync exactly to speech
 *   3. Record the live app with Playwright, one scene per narration segment
 *   4. Render a branded title card via Playwright → PNG → video clip
 *   5. Generate a subtle ambient music bed with ffmpeg lavfi synthesis
 *   6. Build an ASS subtitle file from the narration text + timestamps
 *   7. Assemble with ffmpeg: title + app footage, narration + music, captions
 *
 * Usage: npm run dev   (in another terminal, or background)
 *        node demo/make-video.mjs
 */

import { chromium } from 'playwright';
import { spawnSync, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP   = path.join(__dirname, '_tmp');
const OUT   = path.join(__dirname, 'casebook-demo.mp4');
const FPS   = 12;
const W     = 1280;
const H     = 800;
const BASE  = 'http://localhost:5173';
const VOICE = 'en-US-AriaNeural';
const FONT  = 'C:/Windows/Fonts/Arial.ttf';

// ─── narration script + screen actions ───────────────────────────────────────
// Each segment: text to narrate + action to perform on screen
const SEGMENTS = [
  // ── Act 1: what Casebook is ──────────────────────────────────────────────
  {
    id: 'intro-1',
    text: "Casebook is a consultation recording manager. It's a full-stack web application built to solve a simple problem: when you're in a session with a client, your focus should be on the conversation — not on scribbling notes.",
    screen: { type: 'title' },
  },
  {
    id: 'intro-2',
    text: "Casebook records the audio, runs it through a transcription engine, generates a summary, and keeps everything organized by consultation — so you can search, review, and follow up without digging through notebooks.",
    screen: { type: 'title' },
  },

  // ── Act 2: the casebook list ─────────────────────────────────────────────
  {
    id: 'list-land',
    text: "Here's the app. The casebook — a warm, editorial interface styled like a physical filing system. Three consultations are already in here from the seed data.",
    screen: { type: 'load', url: BASE },
  },
  {
    id: 'list-browse',
    text: "Each row is a filed folder: client name, consultation type, status badge, and the timestamp. The clay-colored spine on the left is a subtle visual cue that this row is interactive.",
    screen: { type: 'scroll-down', to: 0.8 },
  },
  {
    id: 'list-scroll-up',
    text: "Status badges use a dot-and-stamp system — scheduled, in progress, completed, or archived. The whole list is keyboard-navigable and updates without a page reload.",
    screen: { type: 'scroll-up' },
  },

  // ── Act 3: search and filter ─────────────────────────────────────────────
  {
    id: 'search-type',
    text: "The search bar filters in real time. Let's look for Marco.",
    screen: { type: 'search', text: 'Marco' },
  },
  {
    id: 'search-filter',
    text: "One result. The filter debounces at two hundred and fifty milliseconds, so it doesn't fire on every keystroke — it waits for a natural pause. Now let's clear that and use the status dropdown instead.",
    screen: { type: 'hold' },
  },
  {
    id: 'status-filter',
    text: "Filtering by in-progress shows only that subset. The search and status filter stack — you can combine them to find exactly what you need.",
    screen: { type: 'status-filter', value: 'in_progress' },
  },
  {
    id: 'filter-clear',
    text: "Back to all consultations.",
    screen: { type: 'clear-filters' },
  },

  // ── Act 4: consultation detail ───────────────────────────────────────────
  {
    id: 'open-detail',
    text: "Let's open Marco Rossi's legal consultation.",
    screen: { type: 'click-first-row' },
  },
  {
    id: 'detail-header',
    text: "The detail page. Client name in a large display serif, the consultation type as a kicker label, status badge, and the scheduled time in a monospace stamp. The notes section shows whatever context was added at creation.",
    screen: { type: 'hold' },
  },
  {
    id: 'detail-scroll',
    text: "Scrolling down — the Capture panel. That terracotta circle is the record button. Hit it and the browser starts capturing from your microphone immediately, with a live timer. The square stops it.",
    screen: { type: 'scroll-to', px: 420 },
  },
  {
    id: 'upload-panel',
    text: "Or you can upload a file. Any audio or video format up to fifty megabytes. The file gets stored on the server and associated with this consultation. The upload button is right there.",
    screen: { type: 'hold' },
  },

  // ── Act 5: recordings ────────────────────────────────────────────────────
  {
    id: 'recordings-section',
    text: "Below the capture panel is the recordings list. This consultation already has one.",
    screen: { type: 'scroll-bottom' },
  },
  {
    id: 'recording-card',
    text: "Each recording card shows the filename, creation timestamp, file size, and duration in a compact mono strip. The status badge tells you whether transcription has run — none, processing, done, or failed.",
    screen: { type: 'hold' },
  },
  {
    id: 'audio-player',
    text: "The audio player is built right in. It streams from the server with full HTTP range support, so you can seek to any point in a long recording without loading the whole file first.",
    screen: { type: 'hold' },
  },

  // ── Act 6: transcript ────────────────────────────────────────────────────
  {
    id: 'transcript-expand',
    text: "This recording has already been transcribed. The summary — two sentences condensed from the full transcript — appears first. Expand the transcript toggle and you get the full text.",
    screen: { type: 'expand-transcript' },
  },
  {
    id: 'transcript-content',
    text: "In the default configuration, transcription is handled by a mock provider that returns sample text immediately. Swap in an OpenAI API key and it routes through Whisper — same interface, real results. The provider is swappable without changing a single route.",
    screen: { type: 'hold' },
  },
  {
    id: 'retranscribe',
    text: "The re-transcribe button re-queues the file. Status updates poll every one and a half seconds on the client side, so the badge flips from processing to done without any manual refresh.",
    screen: { type: 'collapse-transcript' },
  },

  // ── Act 7: edit + back ───────────────────────────────────────────────────
  {
    id: 'edit-modal',
    text: "Back at the top — the Edit button opens a modal. You can update the status, change the scheduled time, or add notes. Everything saves back to the JSON store with an atomic write — temp file, then rename, so you never get a partial write.",
    screen: { type: 'scroll-top-then-edit' },
  },
  {
    id: 'edit-cancel',
    text: "We'll cancel out of that. The breadcrumb in the top-left takes us back to the casebook.",
    screen: { type: 'cancel-edit' },
  },
  {
    id: 'back-to-list',
    text: "",  // silent — just navigate back
    screen: { type: 'go-back' },
  },

  // ── Act 8: create new consultation ───────────────────────────────────────
  {
    id: 'new-consultation',
    text: "Let's create a brand new consultation. Hit New consultation in the top right.",
    screen: { type: 'click-new' },
  },
  {
    id: 'fill-form',
    text: "The modal. Client name, type, status, an optional scheduled date, and notes. All fields are validated on submit — client name is required, the rest optional.",
    screen: { type: 'fill-form', name: 'Priya Kapoor', type: 'Initial Assessment', status: 'in_progress', notes: 'First session — intake form completed. Follow-up in two weeks.' },
  },
  {
    id: 'submit-form',
    text: "Submit — and we land directly on the new consultation's detail page, ready to capture audio.",
    screen: { type: 'submit-form' },
  },
  {
    id: 'new-detail-ready',
    text: "Empty recordings list, recorder standing by. The whole flow took under thirty seconds.",
    screen: { type: 'hold' },
  },

  // ── Act 9: technical overview ─────────────────────────────────────────────
  {
    id: 'tech-frontend',
    text: "Under the hood: the frontend is React eighteen with TypeScript, built with Vite. The design system is a custom Tailwind theme — a warm paper aesthetic called Casebook, with Fraunces as the display serif, Schibsted Grotesk for body text, and JetBrains Mono for timestamps and status stamps.",
    screen: { type: 'scroll-to', px: 0 },
  },
  {
    id: 'tech-backend',
    text: "The backend is Express with TypeScript. Persistence is a JSON file store with atomic writes — no native modules, no database process to spin up. Clone and run works on any machine without a C++ toolchain.",
    screen: { type: 'api-view', url: 'http://localhost:4000/api/health' },
  },
  {
    id: 'tech-api',
    text: "The REST API is predictable: consultations and recordings each have a dedicated router. Uploads go through Multer, audio streams with HTTP range support, and transcription runs in the background via a pluggable provider interface.",
    screen: { type: 'api-view', url: 'http://localhost:4000/api/consultations' },
  },
  {
    id: 'tech-tests',
    text: "The test suite is Vitest with Supertest for API integration — twelve tests covering the full CRUD lifecycle, hermetically isolated using a per-test temporary data directory. CI runs on every push with GitHub Actions.",
    screen: { type: 'load', url: BASE },
  },

  // ── Act 10: conclusion ────────────────────────────────────────────────────
  {
    id: 'conclusion',
    text: "Casebook is a working, tested, extensible full-stack system. Authentication, multi-tenancy, and cloud storage are the natural next steps — but the core is solid and ready to build on. Clone it, run npm install, and you're up in under a minute.",
    screen: { type: 'hold' },
  },
];

// ─── utilities ────────────────────────────────────────────────────────────────

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} failed:\n${r.stderr || r.stdout}`);
  return r.stdout;
}

function probe(file) {
  const out = run('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', file]);
  return JSON.parse(out);
}

function secondsToAss(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = (s % 60).toFixed(2);
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(5, '0')}`;
}

let frameIdx = 0;
const framesDir = path.join(TMP, 'frames');

async function snap(page) {
  const f = path.join(framesDir, `f${String(frameIdx++).padStart(6, '0')}.png`);
  await page.screenshot({ path: f });
}

async function hold(page, secs) {
  const n = Math.max(1, Math.round(secs * FPS));
  for (let i = 0; i < n; i++) {
    await snap(page);
    await page.waitForTimeout(1000 / FPS);
  }
}

async function smoothScroll(page, targetY, secs) {
  const startY = await page.evaluate(() => window.scrollY);
  const steps = Math.max(2, Math.round(secs * FPS));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(startY + (targetY - startY) * ease));
    await snap(page);
    await page.waitForTimeout(1000 / FPS);
  }
}

async function typeInto(page, selector, text) {
  await page.click(selector);
  await page.waitForTimeout(150);
  for (const ch of text) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(75);
    await snap(page);
  }
}

// ─── TTS generation ───────────────────────────────────────────────────────────

function generateTts(text, outFile) {
  // edge-tts CLI
  const r = spawnSync('edge-tts', [
    '--voice', VOICE,
    '--rate', '-5%',
    '--text', text,
    '--write-media', outFile,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`edge-tts failed: ${r.stderr}`);
}

function getAudioDuration(file) {
  const out = run('ffprobe', [
    '-v', 'quiet', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', file,
  ]);
  return parseFloat(out.trim());
}

// ─── title card ───────────────────────────────────────────────────────────────

async function renderTitleCard(browser, outPng) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  await page.setContent(`<!DOCTYPE html>
<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&family=JetBrains+Mono:wght@400&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${W}px; height:${H}px; overflow:hidden;
    background: #1a1714;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap: 16px;
  }
  .kicker {
    font-family:'JetBrains Mono', monospace;
    font-size:13px; letter-spacing:0.18em; text-transform:uppercase;
    color:#8b897c;
  }
  h1 {
    font-family:'Fraunces', Georgia, serif;
    font-size:82px; font-weight:300; letter-spacing:-2px;
    color:#f1ece1;
    line-height:1;
  }
  .sub {
    font-family:'JetBrains Mono', monospace;
    font-size:15px; letter-spacing:0.08em;
    color:#55554c;
  }
  .divider {
    width:48px; height:1px; background:#bf5236; margin:8px 0;
  }
  .tagline {
    font-family:'Fraunces', Georgia, serif;
    font-size:20px; font-weight:300; font-style:italic;
    color:#bf5236; letter-spacing:0.02em;
  }
</style>
</head>
<body>
  <p class="kicker">take-home challenge</p>
  <h1>Casebook</h1>
  <div class="divider"></div>
  <p class="tagline">record · transcribe · keep</p>
  <p class="sub">Consultation Recording Manager</p>
</body>
</html>`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outPng });
  await page.close();
}

// ─── background music via ffmpeg lavfi ────────────────────────────────────────

function generateAmbientMusic(durationSecs, outFile) {
  // Multi-oscillator ambient drone: three detuned sine waves + gentle low-pass
  // Sounds like a soft electronic pad — unobtrusive under speech
  const expr =
    '0.07*sin(2*PI*80*t*0.997)' +
    '+0.06*sin(2*PI*120*t*1.003)' +
    '+0.05*sin(2*PI*160*t*0.999)' +
    '+0.04*sin(2*PI*240*t*1.001)' +
    '+0.02*sin(2*PI*320*t*0.998)';
  run('ffmpeg', [
    '-y',
    '-f', 'lavfi',
    '-i', `aevalsrc=${expr}:s=44100:c=stereo`,
    '-af', [
      'aecho=0.7:0.8:900:0.25',
      'lowpass=f=600',
      `afade=t=in:st=0:d=4`,
      `afade=t=out:st=${durationSecs - 4}:d=4`,
      'volume=0.22',
    ].join(','),
    '-t', String(durationSecs),
    '-c:a', 'libmp3lame', '-q:a', '4',
    outFile,
  ]);
}

// ─── subtitle (ASS) generation ────────────────────────────────────────────────

function buildAssSubtitles(segments, cursors) {
  // cursors is an array of { start, end } in seconds matching segments
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Cap,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H99000000,0,0,0,3,1,0,2,40,40,28,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines = segments
    .filter((s, i) => s.text && cursors[i])
    .map((s, i) => {
      const { start, end } = cursors[i];
      const text = s.text
        .replace(/[{}]/g, '')
        .replace(/—/g, '-')
        .replace(/\n/g, '\\N');
      return `Dialogue: 0,${secondsToAss(start)},${secondsToAss(end)},Cap,,0,0,0,,${text}`;
    });

  return header + lines.join('\n');
}

// ─── main ─────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════╗');
console.log('║   Casebook — production demo recorder    ║');
console.log('╚══════════════════════════════════════════╝\n');

// Setup
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(path.join(TMP, 'audio'), { recursive: true });

// ── Step 1: Generate TTS for every non-empty segment ──────────────────────────
console.log('Step 1/7  Generating voice narration (edge-tts)...');
const durations = [];
for (const seg of SEGMENTS) {
  if (!seg.text.trim()) {
    durations.push(1.0); // silent segment — 1 second
    continue;
  }
  const audioFile = path.join(TMP, 'audio', `${seg.id}.mp3`);
  process.stdout.write(`  ${seg.id.padEnd(24)} `);
  generateTts(seg.text, audioFile);
  const d = getAudioDuration(audioFile);
  durations.push(d + 0.4); // 0.4s padding after speech
  console.log(`${d.toFixed(1)}s`);
}
const totalDuration = durations.reduce((a, b) => a + b, 0);
console.log(`\n  Total narration: ${totalDuration.toFixed(1)}s (${(totalDuration / 60).toFixed(1)} min)\n`);

// ── Step 2: Record the app with Playwright ────────────────────────────────────
console.log('Step 2/7  Recording app footage...');
const browser = await chromium.launch({ headless: true });
const ctx     = await browser.newContext({ viewport: { width: W, height: H } });
const page    = await ctx.newPage();

// timestamps for subtitle alignment
const cursors = [];
let timeCursor = 0;

for (let i = 0; i < SEGMENTS.length; i++) {
  const seg = SEGMENTS[i];
  const dur = durations[i];
  process.stdout.write(`  ${seg.id.padEnd(24)} `);

  cursors.push({ start: timeCursor, end: timeCursor + dur });
  timeCursor += dur;

  const bodyH = () => page.evaluate(() => document.body.scrollHeight);

  switch (seg.screen.type) {
    case 'title':
      await hold(page, dur);
      break;

    case 'load':
      await page.goto(seg.screen.url, { waitUntil: 'networkidle' });
      await hold(page, dur);
      break;

    case 'scroll-down': {
      const h = await bodyH();
      await smoothScroll(page, h * (seg.screen.to ?? 1), dur * 0.6);
      await hold(page, dur * 0.4);
      break;
    }

    case 'scroll-up':
      await smoothScroll(page, 0, dur * 0.5);
      await hold(page, dur * 0.5);
      break;

    case 'scroll-to':
      await smoothScroll(page, seg.screen.px, dur * 0.5);
      await hold(page, dur * 0.5);
      break;

    case 'scroll-bottom': {
      const h = await bodyH();
      await smoothScroll(page, h, dur * 0.5);
      await hold(page, dur * 0.5);
      break;
    }

    case 'scroll-top':
      await smoothScroll(page, 0, dur * 0.4);
      await hold(page, dur * 0.6);
      break;

    case 'hold':
      await hold(page, dur);
      break;

    case 'search': {
      const box = page.locator('input[placeholder*="Search"]');
      await box.click();
      await page.waitForTimeout(200);
      for (const ch of (seg.screen.text ?? '')) {
        await page.keyboard.type(ch);
        await page.waitForTimeout(80);
        await snap(page);
      }
      await hold(page, Math.max(0.5, dur - (seg.screen.text ?? '').length * 0.08));
      break;
    }

    case 'status-filter': {
      const sel = page.locator('select').first();
      await sel.selectOption(seg.screen.value);
      await hold(page, dur);
      break;
    }

    case 'clear-filters': {
      const box = page.locator('input[placeholder*="Search"]');
      const val = await box.inputValue();
      for (let j = 0; j < val.length; j++) {
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(50);
        await snap(page);
      }
      const sel = page.locator('select').first();
      await sel.selectOption('');
      await hold(page, Math.max(0.5, dur - 0.5));
      break;
    }

    case 'click-first-row': {
      const row = page.locator('ul li').first().locator('button');
      await row.hover();
      await hold(page, 0.4);
      await row.click();
      await page.waitForURL(/consultation/, { timeout: 6000 }).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await hold(page, dur - 0.4);
      break;
    }

    case 'expand-transcript': {
      const toggle = page.locator('details summary').first();
      if (await toggle.count() > 0) {
        await toggle.scrollIntoViewIfNeeded().catch(() => {});
        await toggle.click();
        await hold(page, dur);
      } else {
        await hold(page, dur);
      }
      break;
    }

    case 'collapse-transcript': {
      const toggle = page.locator('details[open] summary').first();
      if (await toggle.count() > 0) {
        await toggle.click();
      }
      await hold(page, dur);
      break;
    }

    case 'scroll-top-then-edit': {
      await smoothScroll(page, 0, 1.5);
      const editBtn = page.locator('button.btn-outline').first();
      await editBtn.hover();
      await hold(page, 0.5);
      await editBtn.click();
      await hold(page, dur - 2);
      break;
    }

    case 'cancel-edit': {
      const cancel = page.locator('button.btn-ghost').first();
      if (await cancel.count() > 0) await cancel.click();
      await hold(page, dur);
      break;
    }

    case 'go-back': {
      const back = page.locator('button.font-mono').first();
      await back.click();
      await page.waitForLoadState('networkidle').catch(() => {});
      await hold(page, dur);
      break;
    }

    case 'click-new': {
      const newBtn = page.locator('button.btn-clay').first();
      await newBtn.hover();
      await hold(page, 0.5);
      await newBtn.click();
      await hold(page, dur - 0.5);
      break;
    }

    case 'fill-form': {
      const s = seg.screen;
      if (s.name) await typeInto(page, 'input[placeholder*="Jordan"]', s.name);
      if (s.type) {
        await page.click('input[placeholder="General"]');
        await page.keyboard.press('Control+A');
        for (const ch of s.type) {
          await page.keyboard.type(ch);
          await page.waitForTimeout(65);
          await snap(page);
        }
      }
      if (s.status) {
        await page.selectOption('select', s.status);
        await snap(page);
      }
      if (s.notes) await typeInto(page, 'textarea', s.notes);
      await hold(page, 0.5);
      break;
    }

    case 'submit-form': {
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle').catch(() => {});
      await hold(page, dur);
      break;
    }

    case 'api-view': {
      await page.goto(seg.screen.url, { waitUntil: 'networkidle' });
      await hold(page, dur);
      break;
    }
  }

  console.log(`${dur.toFixed(1)}s`);
}

await browser.close();
console.log(`\n  Captured ${frameIdx} frames (${(frameIdx / FPS).toFixed(1)}s @ ${FPS}fps)\n`);

// ── Step 3: Render title card ──────────────────────────────────────────────────
console.log('Step 3/7  Rendering title card...');
const titlePng = path.join(TMP, 'title.png');
const titleBrowser = await chromium.launch({ headless: true });
await renderTitleCard(titleBrowser, titlePng);
await titleBrowser.close();

// Calculate title duration = sum of 'title' segments
const titleDuration = SEGMENTS.reduce((sum, s, i) =>
  s.screen.type === 'title' ? sum + durations[i] : sum, 0);
const titleMp4 = path.join(TMP, 'title.mp4');
run('ffmpeg', [
  '-y', '-loop', '1', '-i', titlePng,
  '-vf', `scale=${W}:${H},fade=t=in:st=0:d=0.8,fade=t=out:st=${titleDuration - 0.8}:d=0.8`,
  '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-t', String(titleDuration),
  '-r', String(FPS),
  titleMp4,
]);
console.log(`  Title card: ${titleDuration.toFixed(1)}s\n`);

// ── Step 4: Encode app footage ────────────────────────────────────────────────
console.log('Step 4/7  Encoding app footage...');
const appMp4 = path.join(TMP, 'app.mp4');
run('ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', path.join(framesDir, 'f%06d.png'),
  '-vf', `scale=${W}:${H}`,
  '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
  appMp4,
], { stdio: 'inherit' });

// ── Step 5: Concatenate title + app ───────────────────────────────────────────
console.log('\nStep 5/7  Concatenating segments...');
const concatList = path.join(TMP, 'concat.txt');
fs.writeFileSync(concatList, `file '${titleMp4.replace(/\\/g, '/')}'\nfile '${appMp4.replace(/\\/g, '/')}'\n`);
const rawMp4 = path.join(TMP, 'raw.mp4');
run('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', concatList,
  '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p',
  rawMp4,
]);

// ── Step 6: Assemble narration audio ──────────────────────────────────────────
console.log('Step 6/7  Assembling audio...');
// Concatenate all audio segments in order (silent segments get a silent file)
const silentMp3 = path.join(TMP, 'silent.mp3');
run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
  '-t', '2', '-c:a', 'libmp3lame', silentMp3]);

const audioConcat = path.join(TMP, 'audio-concat.txt');
const audioLines = SEGMENTS.map((seg) => {
  const f = path.join(TMP, 'audio', `${seg.id}.mp3`);
  return fs.existsSync(f) ? `file '${f.replace(/\\/g, '/')}'` : `file '${silentMp3.replace(/\\/g, '/')}'`;
}).join('\n');
fs.writeFileSync(audioConcat, audioLines);

const narrationMp3 = path.join(TMP, 'narration.mp3');
run('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0', '-i', audioConcat,
  '-c:a', 'libmp3lame', '-q:a', '3',
  narrationMp3,
]);

// Generate ambient background music
const bgMp3 = path.join(TMP, 'bg.mp3');
console.log('  Generating ambient music...');
generateAmbientMusic(totalDuration + titleDuration + 5, bgMp3);

// Mix narration (full volume) + title-card gap silence + background music
// Prepend silence equal to title duration before narration
// (screen is showing title card during that time)
const titleSilence = path.join(TMP, 'title-silence.mp3');
run('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
  '-t', String(titleDuration), '-c:a', 'libmp3lame', titleSilence]);

const narWithGap = path.join(TMP, 'nar-full.mp3');
const gapConcat = path.join(TMP, 'gap-concat.txt');
fs.writeFileSync(gapConcat,
  `file '${titleSilence.replace(/\\/g, '/')}'\nfile '${narrationMp3.replace(/\\/g, '/')}'\n`);
run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', gapConcat,
  '-c:a', 'libmp3lame', '-q:a', '3', narWithGap]);

// Mix: narration + ambient (at 20%)
const mixedAudio = path.join(TMP, 'mixed.mp3');
run('ffmpeg', [
  '-y',
  '-i', narWithGap,
  '-i', bgMp3,
  '-filter_complex',
    `[0]volume=1.0[nar];[1]volume=0.20[bg];[nar][bg]amix=inputs=2:duration=first:dropout_transition=2`,
  '-c:a', 'libmp3lame', '-q:a', '2',
  mixedAudio,
]);

// ── Step 7: Burn subtitles + mux audio ────────────────────────────────────────
console.log('Step 7/7  Burning captions and muxing final video...');

// Build subtitle file (offset cursors by title duration since narration starts after title)
const subtitleCursors = cursors.map((c, i) => ({
  start: c.start + titleDuration,
  end: c.end + titleDuration,
}));
const assFile = path.join(TMP, 'subs.ass');
fs.writeFileSync(assFile, buildAssSubtitles(SEGMENTS, subtitleCursors));

// Run ffmpeg from TMP so the subtitles filter can use a bare relative path
// (Windows drive-letter colon in absolute paths breaks the filter's option parser)
run('ffmpeg', [
  '-y',
  '-i', 'raw.mp4',
  '-i', 'mixed.mp3',
  '-vf', 'subtitles=subs.ass',
  '-c:v', 'libx264', '-crf', '19', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest',
  OUT,
], { stdio: 'inherit', cwd: TMP });

// Cleanup
fs.rmSync(TMP, { recursive: true, force: true });

const stat  = fs.statSync(OUT);
const sizeMb = (stat.size / 1024 / 1024).toFixed(1);
const totalSecs = totalDuration + titleDuration;
console.log('\n╔══════════════════════════════════════════╗');
console.log(`║  ✓  ${OUT.split('/').pop()}`);
console.log(`║     ${(totalSecs / 60).toFixed(1)} min  ·  ${sizeMb} MB  ·  H.264 ${W}×${H}`);
console.log('╚══════════════════════════════════════════╝');
