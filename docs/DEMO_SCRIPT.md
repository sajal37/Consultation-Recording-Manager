# Demo Video Script (5–10 minutes)

A shot-by-shot guide for recording the demo. Aim for ~6 minutes.

---

## 0. Setup (before recording)
- Run `npm install && npm run dev`.
- Have the browser at `http://localhost:5173` and a terminal visible.
- Optional: have one short audio file ready to upload.

---

## 1. Intro (30s)
- "This is the Consultation Recording Manager — a tool to record, transcribe and
  manage client consultations."
- One line on the stack: "React + TypeScript frontend, an Express + TypeScript
  API, SQLite for metadata, and files on disk for recordings."

## 2. Create & manage consultations (60s)
- Click **New consultation**, fill in client name, type, status, schedule, notes.
- Show it appears in the list.
- Demonstrate **search** and the **status filter**.
- Open the consultation; show **Edit** updating a field.

## 3. Record in the browser (90s)
- On the detail page, click **Record** — note the live timer and permission flow.
- Speak a sentence or two, click **Stop**.
- Show the **preview player**, then **Save recording**.
- Point out the status badge flips **Transcribing… → Transcript ready**
  automatically (the UI is polling the API).
- Expand the **Summary** and **Transcript** sections.

## 4. Upload a file (45s)
- Use **Upload file** to add an existing audio file.
- Show it transcribing too, and the seekable player + **Download** link.

## 5. Delete (20s)
- Delete a recording; then mention deleting a consultation cascades its
  recordings.

## 6. Code tour (90s)
- Show the monorepo: `client/` and `server/`.
- Server: `routes → repository → db` layering; `services/transcription.ts` with
  the **mock + OpenAI** providers behind one interface.
- Client: `useAudioRecorder` hook, the API client, and the polling in
  `RecordingCard`.
- Mention `.env` switch to real OpenAI Whisper.

## 7. Wrap-up (30s)
- Recap decisions: zero-setup persistence, pluggable transcription, background
  job + live status.
- Mention `PROJECT_NOTES.md` for assumptions and future work (auth, object
  storage, queue, tests, SSE).
- "Thanks for watching."

---

### Talking-point cheat sheet
- **Why SQLite + filesystem?** Real persistence with zero setup; mirrors an
  S3-style split (metadata in DB, blobs in storage).
- **Why mock transcription by default?** Runs offline with no keys; same code
  path as the real provider.
- **Why polling?** Simple and robust at this scale; SSE/WebSockets noted as a
  future improvement.
