# AI Usage Declaration

This document discloses how AI tools were used while building the Consultation
Recording Manager, in the spirit of transparency requested by the challenge.

## Tools used

- **An AI coding assistant** — used as a pair-programming aid to scaffold the
  project, draft boilerplate, and write documentation.

## How AI was used

- **Project scaffolding**: generating the monorepo layout, configuration files
  (TypeScript, Vite, Tailwind, ESLint-style conventions), and `package.json`
  scripts.
- **Boilerplate code**: repetitive, low-novelty code such as the repository row
  mappers, Zod schemas, REST route handlers, and React form/list components.
- **Documentation**: first drafts of this `README`, `PROJECT_NOTES.md`, and the
  demo script, which were then reviewed and edited.
- **Rubber-ducking**: discussing trade-offs (polling vs. websockets, SQLite vs.
  a JSON store, storage strategy) to sanity-check decisions.
- **Debugging**: when the native `better-sqlite3` driver failed to compile on the
  build machine (no C++ toolchain), AI helped diagnose it and execute the pivot
  to a zero-dependency JSON store — a change kept small by the repository layer.

## How AI was *not* used / human ownership

- **All architectural and product decisions were made by me** — the choice of
  domain, the layering, the pluggable transcription design, and the scope
  boundaries (no auth, local storage) are deliberate engineering calls, not
  defaults accepted blindly.
- I **reviewed, ran, and understand every line** of the generated code. AI output
  was treated as a draft to verify and adapt, not as a finished product.
- The integration of the parts (recorder ↔ upload ↔ streaming ↔ background
  transcription ↔ live polling) was directed and validated by me.

## Why

AI was used to move faster on the mechanical parts of a time-boxed challenge so
that effort could focus on design, correctness, and a clear, working end-to-end
solution. The result reflects my own engineering judgement.
