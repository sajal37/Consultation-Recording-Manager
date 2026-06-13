/** Domain types shared across the server. */

export type ConsultationStatus = 'scheduled' | 'in_progress' | 'completed' | 'archived';

export interface Consultation {
  id: string;
  clientName: string;
  consultationType: string;
  status: ConsultationStatus;
  scheduledAt: string | null; // ISO 8601
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TranscriptStatus = 'none' | 'processing' | 'done' | 'failed';

export interface Recording {
  id: string;
  consultationId: string;
  filename: string; // stored file name on disk
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  transcriptStatus: TranscriptStatus;
  transcript: string | null;
  summary: string | null;
  createdAt: string;
}

export interface ConsultationWithRecordings extends Consultation {
  recordings: Recording[];
}
