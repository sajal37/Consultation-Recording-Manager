import type {
  Consultation,
  ConsultationInput,
  ConsultationWithRecordings,
  Recording,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: init?.body && !(init.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : undefined,
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* non-JSON error body — keep default message */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  /* Consultations */
  listConsultations(search = '', status = ''): Promise<Consultation[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const qs = params.toString();
    return request(`/consultations${qs ? `?${qs}` : ''}`);
  },

  getConsultation(id: string): Promise<ConsultationWithRecordings> {
    return request(`/consultations/${id}`);
  },

  createConsultation(input: ConsultationInput): Promise<Consultation> {
    return request('/consultations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateConsultation(
    id: string,
    input: Partial<ConsultationInput>,
  ): Promise<Consultation> {
    return request(`/consultations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  deleteConsultation(id: string): Promise<void> {
    return request(`/consultations/${id}`, { method: 'DELETE' });
  },

  /* Recordings */
  uploadRecording(
    consultationId: string,
    file: Blob,
    fileName: string,
    durationSeconds?: number,
  ): Promise<Recording> {
    const form = new FormData();
    form.append('file', file, fileName);
    if (durationSeconds != null) {
      form.append('durationSeconds', String(durationSeconds));
    }
    return request(`/consultations/${consultationId}/recordings`, {
      method: 'POST',
      body: form,
    });
  },

  getRecording(id: string): Promise<Recording> {
    return request(`/recordings/${id}`);
  },

  retranscribe(id: string): Promise<{ status: string }> {
    return request(`/recordings/${id}/transcribe`, { method: 'POST' });
  },

  deleteRecording(id: string): Promise<void> {
    return request(`/recordings/${id}`, { method: 'DELETE' });
  },

  streamUrl(id: string): string {
    return `${BASE}/recordings/${id}/stream`;
  },
};
