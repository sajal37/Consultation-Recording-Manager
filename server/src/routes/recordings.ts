import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { consultations, recordings } from '../db/repository.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { startTranscription } from '../services/transcription.js';

export const recordingsRouter = Router();

/* --------------------------- Upload handling --------------------------- */

const ALLOWED_PREFIXES = ['audio/', 'video/'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.recordingsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || guessExt(file.mimetype);
    cb(null, `${nanoid(16)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const ok = ALLOWED_PREFIXES.some((p) => file.mimetype.startsWith(p));
    if (ok) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'Only audio or video files are allowed'));
    }
  },
});

function guessExt(mime: string): string {
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('mpeg')) return '.mp3';
  if (mime.includes('wav')) return '.wav';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('mp4')) return '.mp4';
  return '.bin';
}

/* ------------------------------- Routes -------------------------------- */

/**
 * POST /api/consultations/:consultationId/recordings
 * Accepts a multipart "file" field plus optional "durationSeconds".
 * Saves the file, creates a DB row, and starts transcription in background.
 */
recordingsRouter.post(
  '/consultations/:consultationId/recordings',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const consultation = consultations.get(req.params.consultationId);
    if (!consultation) {
      if (req.file) fs.unlinkSync(req.file.path); // clean up orphaned upload
      throw new ApiError(404, 'Consultation not found');
    }
    if (!req.file) throw new ApiError(400, 'No file uploaded (expected field "file")');

    const durationRaw = req.body?.durationSeconds;
    const durationSeconds =
      durationRaw != null && durationRaw !== '' ? Number(durationRaw) : null;

    const recording = recordings.create({
      id: nanoid(12),
      consultationId: consultation.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      createdAt: new Date().toISOString(),
    });

    // Fire-and-forget transcription; status is polled by the client.
    startTranscription(recording.id, req.file.path, req.file.mimetype);

    res.status(201).json(recording);
  }),
);

/** GET /api/recordings/:id/stream — streams the media with range support. */
recordingsRouter.get(
  '/recordings/:id/stream',
  asyncHandler(async (req, res) => {
    const recording = recordings.get(req.params.id);
    if (!recording) throw new ApiError(404, 'Recording not found');

    const filePath = path.join(config.recordingsDir, recording.filename);
    if (!fs.existsSync(filePath)) throw new ApiError(404, 'Recording file missing on disk');

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = Number(startStr);
      const end = endStr ? Number(endStr) : stat.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': recording.mimeType,
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': recording.mimeType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }),
);

/** GET /api/recordings/:id — metadata + transcript (polled by client). */
recordingsRouter.get(
  '/recordings/:id',
  asyncHandler(async (req, res) => {
    const recording = recordings.get(req.params.id);
    if (!recording) throw new ApiError(404, 'Recording not found');
    res.json(recording);
  }),
);

/** POST /api/recordings/:id/transcribe — (re)run transcription. */
recordingsRouter.post(
  '/recordings/:id/transcribe',
  asyncHandler(async (req, res) => {
    const recording = recordings.get(req.params.id);
    if (!recording) throw new ApiError(404, 'Recording not found');
    const filePath = path.join(config.recordingsDir, recording.filename);
    if (!fs.existsSync(filePath)) throw new ApiError(404, 'Recording file missing on disk');
    startTranscription(recording.id, filePath, recording.mimeType);
    res.status(202).json({ status: 'processing' });
  }),
);

/** DELETE /api/recordings/:id — removes DB row and file from disk. */
recordingsRouter.delete(
  '/recordings/:id',
  asyncHandler(async (req, res) => {
    const recording = recordings.get(req.params.id);
    if (!recording) throw new ApiError(404, 'Recording not found');
    const filePath = path.join(config.recordingsDir, recording.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    recordings.remove(recording.id);
    res.status(204).end();
  }),
);
