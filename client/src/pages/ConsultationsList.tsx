import { useEffect, useState } from 'react';
import { ConsultationForm } from '../components/ConsultationForm';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import type { Consultation, ConsultationStatus } from '../lib/types';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

export function ConsultationsList({ onOpen }: { onOpen: (id: string) => void }) {
  const [items, setItems] = useState<Consultation[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listConsultations(search, status));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }

  // Debounced reload on search/status change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
          <p className="text-sm text-slate-500">
            Record, transcribe and manage client sessions.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + New consultation
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client, type or notes…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-slate-500">No consultations yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-medium text-brand-600 hover:underline"
            >
              Create your first one
            </button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onOpen(c.id)}
                  className="flex w-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-400 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{c.clientName}</span>
                    <StatusBadge status={c.status as ConsultationStatus} />
                  </div>
                  <span className="mt-1 text-sm text-slate-500">{c.consultationType}</span>
                  <span className="mt-3 text-xs text-slate-400">
                    {c.scheduledAt
                      ? `Scheduled ${formatDateTime(c.scheduledAt)}`
                      : `Created ${formatDate(c.createdAt)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={showCreate} title="New consultation" onClose={() => setShowCreate(false)}>
        <ConsultationForm
          submitLabel="Create"
          onCancel={() => setShowCreate(false)}
          onSubmit={async (input) => {
            const created = await api.createConsultation(input);
            setShowCreate(false);
            onOpen(created.id);
          }}
        />
      </Modal>
    </div>
  );
}
