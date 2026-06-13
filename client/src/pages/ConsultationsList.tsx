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
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label-kicker">The casebook</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink">
            Consultations
          </h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Every session, recorded and written up. Open one to record audio or
            read back a transcript.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-clay shrink-0">
          New consultation
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-faint">
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a client, type or note…"
            className="field mt-0 pl-8"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="field mt-0 w-auto"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-7">
        {loading ? (
          <p className="font-mono text-sm text-ink-faint">Opening the casebook…</p>
        ) : error ? (
          <p className="text-sm text-clay-600">{error}</p>
        ) : items.length === 0 ? (
          <div className="sheet flex flex-col items-center px-6 py-14 text-center">
            <p className="font-display text-lg text-ink">Nothing filed yet.</p>
            <p className="mt-1 text-sm text-ink-soft">
              {search || status
                ? 'Nothing matches that. Try clearing the filters.'
                : 'Start a consultation and the recordings will live here.'}
            </p>
            {!search && !status && (
              <button onClick={() => setShowCreate(true)} className="btn-clay mt-5">
                Open the first one
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="label-kicker mb-3">
              {items.length} {items.length === 1 ? 'entry' : 'entries'}
            </p>
            <ul className="space-y-2.5">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => onOpen(c.id)}
                    className="group sheet flex w-full items-center gap-4 overflow-hidden p-0 text-left transition hover:shadow-lift"
                  >
                    {/* clay spine, like the edge of a filed folder */}
                    <span className="h-full w-1.5 shrink-0 self-stretch bg-clay-200 transition group-hover:bg-clay-400" />
                    <div className="flex flex-1 items-center gap-4 py-4 pr-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="truncate font-display text-lg font-medium text-ink">
                            {c.clientName}
                          </span>
                          <StatusBadge status={c.status as ConsultationStatus} />
                        </div>
                        <span className="mt-0.5 block text-sm text-ink-soft">
                          {c.consultationType}
                        </span>
                      </div>
                      <span className="hidden shrink-0 text-right font-mono text-[11px] leading-relaxed text-ink-faint sm:block">
                        {c.scheduledAt ? (
                          <>
                            <span className="block">scheduled</span>
                            {formatDateTime(c.scheduledAt)}
                          </>
                        ) : (
                          <>
                            <span className="block">opened</span>
                            {formatDate(c.createdAt)}
                          </>
                        )}
                      </span>
                      <span className="font-mono text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-clay-500">
                        →
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
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
