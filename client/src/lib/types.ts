export type ConsultationStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'archived';

export type TranscriptStatus = 'none' | 'processing' | 'done' | 'failed';

export interface Recording {
  id: string;
  consultationId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  transcriptStatus: TranscriptStatus;
  transcript: string | null;
  summary: string | null;
  createdAt: string;
}

export interface Consultation {
  id: string;
  clientName: string;
  consultationType: string;
  status: ConsultationStatus;
  scheduledAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationWithRecordings extends Consultation {
  recordings: Recording[];
}

export interface ConsultationInput {
  clientName: string;
  consultationType: string;
  status: ConsultationStatus;
  scheduledAt: string | null;
  notes: string;
}
