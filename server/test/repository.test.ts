import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Point persistence at a throwaway temp dir BEFORE importing modules that
// read config at load time.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-test-'));
process.env.DATA_DIR = tmp;

const { migrate } = await import('../src/db/index.js');
const { consultations, recordings } = await import('../src/db/repository.js');

beforeAll(() => migrate());
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('consultations repository', () => {
  it('creates, reads, updates and deletes', () => {
    const ts = new Date().toISOString();
    const created = consultations.create({
      id: 'c1',
      clientName: 'Test Client',
      consultationType: 'General',
      status: 'scheduled',
      scheduledAt: null,
      notes: 'hello world',
      createdAt: ts,
      updatedAt: ts,
    });
    expect(created.id).toBe('c1');
    expect(consultations.get('c1')?.clientName).toBe('Test Client');

    const updated = consultations.update('c1', { status: 'completed' });
    expect(updated?.status).toBe('completed');
    // Unspecified fields are preserved.
    expect(updated?.clientName).toBe('Test Client');

    expect(consultations.remove('c1')).toBe(true);
    expect(consultations.get('c1')).toBeUndefined();
  });

  it('searches by name, type and notes', () => {
    const ts = new Date().toISOString();
    consultations.create({
      id: 'c2', clientName: 'Aisha Khan', consultationType: 'Legal',
      status: 'scheduled', scheduledAt: null, notes: 'contract',
      createdAt: ts, updatedAt: ts,
    });
    expect(consultations.list('aisha').map((c) => c.id)).toContain('c2');
    expect(consultations.list('legal').map((c) => c.id)).toContain('c2');
    expect(consultations.list('contract').map((c) => c.id)).toContain('c2');
    expect(consultations.list('nonexistent')).toHaveLength(0);
    consultations.remove('c2');
  });

  it('cascades recordings when a consultation is deleted', () => {
    const ts = new Date().toISOString();
    consultations.create({
      id: 'c3', clientName: 'Cascade', consultationType: 'General',
      status: 'scheduled', scheduledAt: null, notes: '',
      createdAt: ts, updatedAt: ts,
    });
    recordings.create({
      id: 'r1', consultationId: 'c3', filename: 'f.webm',
      originalName: 'f.webm', mimeType: 'audio/webm', sizeBytes: 10,
      durationSeconds: 1, createdAt: ts,
    });
    expect(recordings.listByConsultation('c3')).toHaveLength(1);

    consultations.remove('c3');
    expect(recordings.listByConsultation('c3')).toHaveLength(0);
    expect(recordings.get('r1')).toBeUndefined();
  });
});

describe('recordings repository', () => {
  it('updates transcript status and result', () => {
    const ts = new Date().toISOString();
    consultations.create({
      id: 'c4', clientName: 'Rec', consultationType: 'General',
      status: 'scheduled', scheduledAt: null, notes: '',
      createdAt: ts, updatedAt: ts,
    });
    recordings.create({
      id: 'r2', consultationId: 'c4', filename: 'a.webm',
      originalName: 'a.webm', mimeType: 'audio/webm', sizeBytes: 5,
      durationSeconds: null, createdAt: ts,
    });

    recordings.setTranscriptStatus('r2', 'processing');
    expect(recordings.get('r2')?.transcriptStatus).toBe('processing');

    recordings.setTranscriptResult('r2', 'the transcript', 'the summary');
    const r = recordings.get('r2');
    expect(r?.transcriptStatus).toBe('done');
    expect(r?.transcript).toBe('the transcript');
    expect(r?.summary).toBe('the summary');
  });
});
