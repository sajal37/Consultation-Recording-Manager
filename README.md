# Consultation Recording Manager

I built this for the kind of person who sits across from clients all day —
a therapist, a caseworker, a financial advisor — and needs the recording of
each session to just *be there* afterwards, transcribed, without fiddling with
five separate tools.

So the whole thing is one screen's worth of idea: a list of consultations, and
inside each one you hit record (or drop in a file you already have), and a
minute later there's a transcript and a short summary sitting next to the audio.

It's a take-home, so I optimised for "clone it and it runs" over "ready for
10,000 tenants." Where I cut a corner on purpose, I've said so.

## Running it

You need Node 20 or newer. That's the only prerequisite — there's no database
to install, no Docker, no API key.

```bash
npm install
npm run dev
```

That boots the API on `:4000` and the Vite dev server on `:5173`. Open
`http://localhost:5173` and you're in. The dev server proxies `/api` straight
to Express, so you never touch the `:4000` URL yourself.

Want some rows to look at instead of an empty list?

```bash
npm run seed
```

For recording, your browser will ask for the microphone. Chrome, Edge and
Firefox all work; the mic only needs a secure context, and `localhost` counts
as secure, so you don't need HTTPS locally.

Other scripts, if you need them:

```bash
npm test         # the server test suite
npm run build    # type-check + production build of both apps
npm start        # run the built server
```

## How it's put together

It's a two-package npm workspace — `client/` and `server/` — with a root
`dev` script that runs both at once via `concurrently`.

```
client/   React + Vite + Tailwind, TypeScript
server/   Express, TypeScript
```

The server is layered so the HTTP code never touches storage directly:

```
routes  →  repository  →  store
            (all data       (a JSON file,
             access)          loaded once, written atomically)
```

Recordings (the actual audio) live as files under `server/data/recordings/`.
Only their metadata goes in the store. That split is deliberate — it's the
same shape you'd use in production with object storage holding the blobs and a
real database holding the rows, just collapsed down to a laptop.

### About the storage choice

I reached for SQLite first. The fast driver for it, `better-sqlite3`, is a
native module, and it refused to compile on my machine because I didn't have a
C++ toolchain installed — which is exactly the kind of friction that makes a
reviewer give up before they've seen the app. So I dropped it for a small
JSON-file store I wrote myself: load the file once into memory, write it back
atomically (temp file + rename) on every change.

For a single-process app holding a few hundred consultations that's completely
fine, and because everything funnels through the repository in
`server/src/db/repository.ts`, moving to SQLite or Postgres later is a
one-file job. I'd make that switch the moment this needed to handle
concurrent writers.

### Transcription

Every recording gets transcribed in the background after upload. The work sits
behind a `TranscriptionProvider` interface with two implementations:

- a **mock** that returns a canned session transcript after a short delay —
  this is the default, so the app works offline with no keys and the demo is
  deterministic;
- an **OpenAI Whisper** one that kicks in if you set the env vars below.

The UI doesn't wait around — it polls the recording until the status flips from
`processing` to `done`, then shows the transcript and summary.

To use the real thing, drop a `server/.env` (there's an `.env.example`):

```
TRANSCRIPTION_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Adding a third backend — AssemblyAI, Deepgram, a local whisper.cpp — means
writing one class and adding a line to the factory. Nothing else changes.

## The API

Everything lives under `/api`.

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/health` | Liveness + which transcription provider is active |
| `GET` | `/consultations?search=&status=` | List, with optional text search and status filter |
| `POST` | `/consultations` | Create one |
| `GET` | `/consultations/:id` | One consultation plus its recordings |
| `PATCH` | `/consultations/:id` | Update fields |
| `DELETE` | `/consultations/:id` | Delete it (its recordings go too) |
| `POST` | `/consultations/:id/recordings` | Upload audio (multipart `file`) |
| `GET` | `/recordings/:id` | Recording metadata + transcript status |
| `GET` | `/recordings/:id/stream` | Stream the audio (supports range requests, so the player is seekable) |
| `POST` | `/recordings/:id/transcribe` | Run transcription again |
| `DELETE` | `/recordings/:id` | Delete the recording and its file |

Bad input gets a `400` with the Zod validation errors; missing things get a
`404`; everything funnels through one error handler so the JSON shape is
consistent.

## What I'd do next

Honest list of what's missing, roughly in the order I'd tackle it:

- **Auth.** There's no concept of a user yet. The repository is the natural
  place to scope rows once there is.
- **Move storage to SQLite/Postgres + object storage** when there's more than
  one process writing.
- **A real job queue** for transcription so it survives a restart and can retry,
  instead of the current fire-once-and-hope.
- **Swap polling for SSE** so the transcript appears the instant it's ready.
- **Full-text search over transcripts**, not just the metadata.
- More tests on the React side — right now the coverage is on the server.

There's more detail on the decisions in [PROJECT_NOTES.md](./PROJECT_NOTES.md),
and an honest account of where I used AI in [AI_USAGE.md](./AI_USAGE.md).
