# Consultation Recording Manager

A web app for professionals who run client consultations (clinicians, advisors,
lawyers, coaches) to **record or upload audio**, **auto-transcribe & summarise**
it, and **manage consultations** with searchable metadata.

> Built as a take-home challenge. The goal is to demonstrate clean structure,
> sound engineering decisions, and a working end-to-end slice — not a
> production deployment.

---

## ✨ Features

- **Consultations CRUD** — create, edit, delete, search and filter by status.
- **In-browser recording** — capture microphone audio with the MediaRecorder
  API, preview it, then save.
- **File upload** — drag in an existing audio/video file instead.
- **Streaming playback** — recordings stream from the server with HTTP range
  support (seekable `<audio>` player) and one-click download.
- **Automatic transcription + summary** — every recording is transcribed in the
  background. A pluggable provider runs a **fully-offline mock by default**, with
  a drop-in **OpenAI Whisper** implementation behind an env flag.
- **Live status** — the UI polls and updates as transcription completes.

---

## 🧱 Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS            |
| Backend    | Node.js, Express, TypeScript                        |
| Persistence| JSON file store (zero native deps, atomic writes)   |
| Storage    | Local filesystem (`server/data/recordings`)         |
| Validation | Zod                                                 |
| Uploads    | Multer 2                                            |
| Tests      | Vitest + Supertest                                  |

A npm-workspaces monorepo runs both apps with a single command.

> **Why a JSON store and not SQLite?** SQLite's fast driver (`better-sqlite3`)
> is a native module that needs a C/C++ build toolchain — which isn't present on
> every machine and breaks "clone and run anywhere." The repository layer is
> deliberately storage-shaped, so swapping in SQLite/Postgres later touches only
> `server/src/db/`. See `PROJECT_NOTES.md`.

---

## 🚀 Getting started

### Prerequisites
- Node.js **20+** and npm 9+
- A browser with microphone access for in-app recording (Chrome/Edge/Firefox)

### Install & run

```bash
git clone <your-repo-url>
cd "Consultation Recording Manager"

npm install          # installs root + both workspaces
npm run dev          # starts API (:4000) and client (:5173) together
```

Open **http://localhost:5173**.

> The client proxies `/api` to the server, so you only need the one URL.
> The data file and recordings are created automatically under
> `server/data/` on first run.

### Optional: seed sample data

```bash
npm run seed         # adds a few example consultations for the demo
```

### Other scripts

```bash
npm run build        # type-check + build server and client
npm test             # run the server test suite (Vitest + Supertest)
npm run start        # run the built server (after npm run build)
```

---

## 🔌 Transcription provider (optional)

By default the app uses a **mock** transcriber — no keys, fully offline — so it
works the moment you clone it.

To use real transcription, create `server/.env` (see `server/.env.example`):

```env
TRANSCRIPTION_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

The provider is selected by a small factory in
`server/src/services/transcription.ts`; adding another backend (AssemblyAI,
Deepgram, a local Whisper binary, …) means implementing one interface.

---

## 🗂️ Project structure

```
.
├── package.json            # workspaces + combined dev script
├── client/                 # React + Vite + Tailwind
│   └── src/
│       ├── components/      # Form, Modal, RecorderPanel, RecordingCard, …
│       ├── hooks/           # useAudioRecorder (MediaRecorder wrapper)
│       ├── lib/             # api client, types, formatters
│       ├── pages/           # ConsultationsList, ConsultationDetail
│       └── App.tsx          # hash router + shell
└── server/                 # Express API
    └── src/
        ├── db/              # JSON store + repository (storage-shaped API)
        ├── routes/          # consultations, recordings
        ├── services/        # transcription (mock + openai)
        ├── middleware/      # error handling + async wrapper
        ├── seed.ts          # sample data
        ├── app.ts           # Express app factory (importable by tests)
        └── index.ts         # app entrypoint
    └── test/                # Vitest unit + Supertest API tests
```

---

## 📡 API overview

| Method | Endpoint                                          | Purpose                          |
| ------ | ------------------------------------------------- | -------------------------------- |
| GET    | `/api/health`                                     | Health + active provider         |
| GET    | `/api/consultations?search=&status=`              | List / search consultations      |
| POST   | `/api/consultations`                              | Create consultation              |
| GET    | `/api/consultations/:id`                          | Get one (with recordings)        |
| PATCH  | `/api/consultations/:id`                          | Update consultation              |
| DELETE | `/api/consultations/:id`                          | Delete (cascades to recordings)  |
| POST   | `/api/consultations/:id/recordings`               | Upload/record (multipart `file`) |
| GET    | `/api/recordings/:id`                             | Recording + transcript status    |
| GET    | `/api/recordings/:id/stream`                      | Stream media (range support)     |
| POST   | `/api/recordings/:id/transcribe`                  | (Re)run transcription            |
| DELETE | `/api/recordings/:id`                             | Delete recording + file          |

---

## 📄 More docs

- [`PROJECT_NOTES.md`](./PROJECT_NOTES.md) — tech stack, architecture, assumptions, future work
- [`AI_USAGE.md`](./AI_USAGE.md) — how AI tools were used on this project
