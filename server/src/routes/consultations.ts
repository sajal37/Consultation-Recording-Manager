import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { consultations, recordings } from '../db/repository.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import type { ConsultationWithRecordings } from '../types.js';

export const consultationsRouter = Router();

const statusEnum = z.enum(['scheduled', 'in_progress', 'completed', 'archived']);

const createSchema = z.object({
  clientName: z.string().trim().min(1, 'Client name is required').max(120),
  consultationType: z.string().trim().min(1).max(80).default('General'),
  status: statusEnum.default('scheduled'),
  scheduledAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).default(''),
});

const updateSchema = createSchema.partial();

/** GET /api/consultations?search=&status= */
consultationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(consultations.list(search, status));
  }),
);

/** GET /api/consultations/:id  (includes recordings) */
consultationsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const consultation = consultations.get(req.params.id);
    if (!consultation) throw new ApiError(404, 'Consultation not found');
    const result: ConsultationWithRecordings = {
      ...consultation,
      recordings: recordings.listByConsultation(consultation.id),
    };
    res.json(result);
  }),
);

/** POST /api/consultations */
consultationsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const now = new Date().toISOString();
    const created = consultations.create({
      id: nanoid(12),
      clientName: data.clientName,
      consultationType: data.consultationType,
      status: data.status,
      scheduledAt: data.scheduledAt ?? null,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json(created);
  }),
);

/** PATCH /api/consultations/:id */
consultationsRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const updated = consultations.update(req.params.id, {
      ...data,
      scheduledAt: data.scheduledAt ?? undefined,
    });
    if (!updated) throw new ApiError(404, 'Consultation not found');
    res.json(updated);
  }),
);

/** DELETE /api/consultations/:id */
consultationsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const ok = consultations.remove(req.params.id);
    if (!ok) throw new ApiError(404, 'Consultation not found');
    res.status(204).end();
  }),
);
