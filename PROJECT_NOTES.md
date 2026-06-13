# Project notes

Some context on why this looks the way it does. The brief left the actual app
open, so the first decision was what to build.

## Picking the problem

I wanted something small enough to finish properly but with enough moving parts
to actually show how I work. "Consultation recording manager" lands well there,
because it forces me to touch a bit of everything:

- ordinary CRUD with search and filtering,
- handling binary media — recording it in the browser *and* accepting uploads,
- streaming that media back out,
- a slow background job (transcription) that the UI has to track without
  blocking,
- and an integration with an external service that I can't assume is available.

If I'd picked a to-do list I'd have shown you CRUD and nothing else. This way
the interesting decisions actually come up.

## The decisions I'd defend

**One JSON file instead of a database.** This wasn't the plan. I started on
SQLite with `better-sqlite3` because it's fast and the synchronous API keeps
data code simple. It wouldn't install — it's a native module and the machine had
no C++ build tools — and I realised any reviewer could hit the same wall. The
whole value of a take-home is that it runs when someone clones it, so I wrote a
tiny store instead: read the JSON once on boot, keep it in memory, write it back
atomically (temp file then rename, so a crash mid-write can't corrupt it).

It's not what I'd ship. But every read and write goes through one repository
module, so the day this needs real concurrency, swapping in SQLite is an
afternoon and nothing above the repository changes. That boundary mattering more
than the storage engine is kind of the point.

**Transcription behind an interface, mock by default.** I didn't want the demo
to depend on a network call or an API key, and I didn't want a reviewer to have
to sign up for anything. So the default provider just returns a realistic
session transcript after a beat. The real OpenAI Whisper provider is right next
to it and switches on with an env var. Same code path, same DB writes, same UI —
only the class behind the interface differs.

**Fire it and poll for it.** When a recording lands, transcription starts in the
background and the response comes straight back; the recording is marked
`processing`. The client polls that one recording every second and a half until
it flips to `done`. Websockets or SSE would be lower-latency and I note that
below, but for a job that takes a few seconds and a single user watching one
page, polling is honestly the right amount of machinery. I'd rather not stand up
a socket layer to save a second.

**A hash router I wrote in fifteen lines.** There are two views. Pulling in
React Router for that felt like a tell that I reach for dependencies by reflex.
`#/` is the list, `#/consultation/:id` is the detail, and a `hashchange`
listener swaps between them. URLs are still shareable and the back button still
works.

**Range requests on the stream.** The audio endpoint honours `Range` headers, so
the `<audio>` element can seek without me buffering whole files into memory.
Small thing, but it's the difference between a player that scrubs and one that
doesn't.

## How the server is laid out

```
routes      HTTP, validation, status codes — nothing else
  ↓
repository  the only thing that knows how data is stored
  ↓
store       the JSON file, loaded once, written atomically
```

Routes validate with Zod and throw typed errors; one error-handling middleware
turns those into consistent JSON (`400` for bad input with the field errors,
`404` for missing things, `500` for the rest). An `asyncHandler` wrapper means I
don't repeat try/catch in every route — rejected promises just land in the error
handler.

The Express app is built in `app.ts` as a factory with no `listen()` call, which
is what lets the tests import and drive it in-process.

## Tests

The server has both unit and integration coverage:

- `repository.test.ts` hits the data layer directly — create/read/update/delete,
  search across name, type and notes, the cascade that drops a consultation's
  recordings with it, and the transcript status transitions.
- `api.test.ts` runs the real Express app through Supertest — the health check,
  a validation failure, the full create→list→get→update→delete lifecycle, and a
  404.

Each test file repoints `DATA_DIR` at a fresh temp directory before importing
anything, so they never touch real data and don't step on each other. Twelve
tests, run with `npm test`.

The client doesn't have tests yet — that's the first gap I'd close with more
time, starting with the recorder hook and the polling logic, since those are the
parts with real behaviour rather than markup.

## Things I'm explicitly not handling

- **No auth.** There's no user model. I know where it'd go (scoping in the
  repository) but it wasn't worth faking in the time.
- **One process only.** The JSON store and on-disk recordings assume a single
  server. Two would race on the file.
- **Uploads are trusted past a point.** I check the mime type and cap the size
  at 50 MB, but there's no virus scanning or rate limiting.
- **The mock transcript is fake.** It's the same sentence every time, on purpose
  — it exists to prove the pipeline and the UI states, not to transcribe
  anything.

## If this kept going

Roughly the order I'd actually do it:

1. Auth, then scope everything to a user.
2. SQLite or Postgres + object storage for the media, once there's more than one
   writer.
3. A proper job queue (BullMQ or similar) so transcription survives a restart
   and retries on failure.
4. SSE in place of polling.
5. Full-text search over the transcripts themselves.
6. Client-side tests and a Docker setup to go with the CI that's already there.
