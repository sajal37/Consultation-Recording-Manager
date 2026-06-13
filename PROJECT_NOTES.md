# Project Notes

## 1. What I built

A **Consultation Recording Manager**: a focused tool that lets a professional
manage client consultations and attach **recorded or uploaded** audio to each
one, with **automatic transcription and summarisation**.

The brief specified deliverables but left the application itself open, so I
chose a domain ("consultations") that naturally exercises a meaningful slice of
engineering: CRUD + search, binary media capture/upload, file streaming, an
async background job (transcription) with polled status, and a pluggable
external-service integration.

## 2. Tech stack & why

- **React + TypeScript + Vite** — fast DX, instant HMR, type safety across the
  UI. Vite's dev proxy removes CORS friction and keeps API calls same-origin.
- **Tailwind CSS** — quick, consistent styling without bikeshedding a design
  system in a time-boxed task.
- **Express + TypeScript** — minimal, well-understood, easy to read in review.
- **JSON-file persistence (custom, zero-dependency)** — I started with SQLite
  (`better-sqlite3`) but it's a *native* module requiring a C/C++ toolchain that
  isn't on every machine (it failed to install on the build machine for exactly
  this reason). To honour "clone and run anywhere," I swapped it for a small
  pure-JS store with **atomic writes** (write-temp-then-rename). Because all data
  access goes through a repository, this was a localised change. The store keeps
  persistence real and inspectable with zero setup and zero native deps.
- **Local filesystem for media** — recordings are large binaries; storing them
  on disk and keeping only metadata in the store mirrors how you'd use S3 in
  production, while staying trivially runnable.
- **Zod + Multer 2** — declarative request validation and robust multipart
  uploads (Multer 2.x to avoid the 1.x security advisory).
- **Vitest + Supertest** — fast tests with no extra config; Supertest exercises
  the real Express app in-process.

I deliberately avoided heavier choices (Postgres, S3, Redux, a routing library,
an ORM) because they'd add setup/operational cost without improving what this
challenge is meant to demonstrate. The one place I'd reach for SQLite/Postgres
first in production is persistence — the repository boundary makes that a
drop-in.

## 3. Architecture

```
React (Vite :5173)  ──/api proxy──▶  Express (:4000)
   hooks/components                    routes → repository → SQLite
   polls transcript status            routes → filesystem (recordings)
                                       services/transcription (mock | openai)
```

Key decisions:

- **Layered server**: `routes` (HTTP + validation) → `repository` (all SQL, row
  mapping) → `db` (connection + schema). Routes never touch SQL directly, so the
  data layer is swappable and testable.
- **Repository pattern** maps snake_case columns to camelCase domain objects in
  one place, keeping the rest of the codebase clean.
- **Transcription as a pluggable service** behind a single `TranscriptionProvider`
  interface, chosen by a factory from config. Mock by default (offline,
  deterministic, demo-friendly); OpenAI Whisper as a real drop-in. Transcription
  runs **fire-and-forget** in the background and writes status (`processing` →
  `done`/`failed`) back to the DB; the client **polls** the recording endpoint
  and updates live.
- **Streaming with HTTP range support** so the audio player is seekable and
  large files aren't buffered fully into memory.
- **Centralised error handling**: an `asyncHandler` wrapper funnels rejected
  promises and `ZodError`/`ApiError` into one middleware that returns clean JSON.
- **Minimal hash router** on the client instead of pulling in a router dependency
  — enough for two views with shareable URLs.

## 4. Assumptions

- **Single user / no auth.** Adding authentication was out of scope for a
  time-boxed take-home; the architecture leaves room for it (per-user scoping in
  the repository layer).
- **Local, single-instance deployment.** Filesystem storage and SQLite assume one
  process. Horizontal scaling would move media to object storage and the DB to a
  networked engine.
- **Trusted client.** Beyond validation and a file-type/size guard, there's no
  rate limiting or virus scanning on uploads.
- **Browser support.** In-app recording relies on `MediaRecorder` + a secure
  context (localhost counts). Unsupported browsers can still upload files.
- **Mock transcription is representative**, not real ASR — it returns a fixed
  sample so the full pipeline and UI states are demonstrable without API keys.

## 5. Trade-offs

- Polling for transcript status (simple, robust) instead of WebSockets/SSE
  (lower latency, more moving parts) — polling is the right call at this scale.
- No automated tests shipped due to the time box; the layering (pure repository,
  isolated provider) was specifically designed to make unit tests easy to add.

Update: tests **were** added — see below.

## 5a. Testing

- **Unit tests** (`server/test/repository.test.ts`) cover CRUD, search across
  name/type/notes, the delete→recordings cascade, and transcript status
  transitions.
- **API integration tests** (`server/test/api.test.ts`) drive the real Express
  app via Supertest: health, validation failures, the full consultation
  lifecycle, and 404 handling.
- Each test file points `DATA_DIR` at a throwaway temp directory, so tests never
  touch real data and run hermetically. `npm test` runs all of them.

## 6. Future improvements

- **Auth & multi-tenancy** (sessions/JWT, per-user data scoping).
- **Object storage** (S3/GCS) + signed URLs; **SQLite/Postgres** for the
  metadata (drop-in at the repository boundary).
- **Real ASR with diarisation** and timestamped, clickable transcript segments.
- **Background job queue** (BullMQ) so transcription survives restarts and can
  retry, replacing the in-process fire-and-forget.
- **Tests**: more component tests on the React side; expand API coverage to the
  recording upload/stream endpoints with fixture media.
- **CI** is set up (lint/type-check/build/test on push); next would be a
  one-command Docker setup.
- **Real-time status** via SSE instead of polling.
- **Search upgrades**: full-text search over transcripts (SQLite FTS5).
- **CI** (lint, type-check, build) and a one-command Docker setup.
- **Accessibility & i18n** polish.
