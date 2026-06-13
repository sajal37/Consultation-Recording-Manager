import { store } from './index.js';
import type {
  Consultation,
  ConsultationStatus,
  Recording,
  TranscriptStatus,
} from '../types.js';

/**
 * Repository layer. All data access goes through here so the rest of the app
 * never touches the storage representation directly. Swapping the JSON store
 * for SQLite/Postgres would only change this file + db/index.ts.
 */

/* ------------------------------------------------------------------ *
 * Consultations
 * ------------------------------------------------------------------ */

export interface NewConsultation {
  id: string;
  clientName: string;
  consultationType: string;
  status: ConsultationStatus;
  scheduledAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const byCreatedDesc = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

export const consultations = {
  list(search?: string, status?: string): Consultation[] {
    let rows = [...store.state.consultations];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.clientName.toLowerCase().includes(q) ||
          c.consultationType.toLowerCase().includes(q) ||
          c.notes.toLowerCase().includes(q),
      );
    }
    if (status) {
      rows = rows.filter((c) => c.status === status);
    }
    return rows.sort(byCreatedDesc);
  },

  get(id: string): Consultation | undefined {
    return store.state.consultations.find((c) => c.id === id);
  },

  create(c: NewConsultation): Consultation {
    store.state.consultations.push(c);
    store.persist();
    return c;
  },

  update(id: string, patch: Partial<NewConsultation>): Consultation | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    // Only overwrite fields that were actually provided (ignore undefined).
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        (existing as unknown as Record<string, unknown>)[key] = value;
      }
    }
    existing.updatedAt = new Date().toISOString();
    store.persist();
    return existing;
  },

  remove(id: string): boolean {
    const idx = store.state.consultations.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    store.state.consultations.splice(idx, 1);
    // Cascade: drop child recordings (DB rows only; files handled by route).
    store.state.recordings = store.state.recordings.filter(
      (r) => r.consultationId !== id,
    );
    store.persist();
    return true;
  },
};

/* ------------------------------------------------------------------ *
 * Recordings
 * ------------------------------------------------------------------ */

export const recordings = {
  listByConsultation(consultationId: string): Recording[] {
    return store.state.recordings
      .filter((r) => r.consultationId === consultationId)
      .sort(byCreatedDesc);
  },

  get(id: string): Recording | undefined {
    return store.state.recordings.find((r) => r.id === id);
  },

  create(r: {
    id: string;
    consultationId: string;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    durationSeconds: number | null;
    createdAt: string;
  }): Recording {
    const recording: Recording = {
      ...r,
      transcriptStatus: 'none',
      transcript: null,
      summary: null,
    };
    store.state.recordings.push(recording);
    store.persist();
    return recording;
  },

  setTranscriptStatus(id: string, status: TranscriptStatus): void {
    const rec = this.get(id);
    if (!rec) return;
    rec.transcriptStatus = status;
    store.persist();
  },

  setTranscriptResult(id: string, transcript: string, summary: string): void {
    const rec = this.get(id);
    if (!rec) return;
    rec.transcript = transcript;
    rec.summary = summary;
    rec.transcriptStatus = 'done';
    store.persist();
  },

  remove(id: string): boolean {
    const idx = store.state.recordings.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    store.state.recordings.splice(idx, 1);
    store.persist();
    return true;
  },
};
