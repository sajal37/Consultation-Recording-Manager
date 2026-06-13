import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-api-'));
process.env.DATA_DIR = tmp;

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/index.js');

migrate();
const app = createApp();

beforeAll(() => migrate());
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('API: health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('API: consultations', () => {
  let id: string;

  it('rejects invalid create (missing clientName)', async () => {
    const res = await request(app).post('/api/consultations').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('creates a consultation', async () => {
    const res = await request(app)
      .post('/api/consultations')
      .send({ clientName: 'API Client', consultationType: 'General' });
    expect(res.status).toBe(201);
    expect(res.body.clientName).toBe('API Client');
    id = res.body.id;
  });

  it('lists and finds it', async () => {
    const res = await request(app).get('/api/consultations?search=API');
    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toContain(id);
  });

  it('gets one with a recordings array', async () => {
    const res = await request(app).get(`/api/consultations/${id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.recordings)).toBe(true);
  });

  it('updates it', async () => {
    const res = await request(app)
      .patch(`/api/consultations/${id}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('404s for unknown id', async () => {
    const res = await request(app).get('/api/consultations/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('deletes it', async () => {
    const res = await request(app).delete(`/api/consultations/${id}`);
    expect(res.status).toBe(204);
    const after = await request(app).get(`/api/consultations/${id}`);
    expect(after.status).toBe(404);
  });
});
