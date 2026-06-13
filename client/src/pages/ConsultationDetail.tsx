import { useCallback, useEffect, useState } from 'react';
import { ConsultationForm } from '../components/ConsultationForm';
import { Modal } from '../components/Modal';
import { RecorderPanel } from '../components/RecorderPanel';
import { RecordingCard } from '../components/RecordingCard';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import type { ConsultationWithRecordings } from '../lib/types';

interface Props {
  id: string;
  onBack: () => void;
}

export function ConsultationDetail({ id, onBack }: Props) {
  const [data, setData] = useState<ConsultationWithRecordings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getConsultation(id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`Delete consultation for ${data.clientName} and all its recordings?`))
      return;
    await api.deleteConsultation(data.id);
    onBack();
  }

  if (loading) {
    return <p className="mx-auto max-w-3xl px-4 py-8 text-sm text-slate-500">Loading…</p>;
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">{error ?? 'Not found.'}</p>
        <button onClick={onBack} className="mt-3 text-sm text-brand-600 hover:underline">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
        ← All consultations
      </button>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{data.clientName}</h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {data.consultationType}
            {data.scheduledAt && ` · ${formatDateTime(data.scheduledAt)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {data.notes && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{data.notes}</p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Capture a recording</h2>
        <RecorderPanel consultationId={data.id} onUploaded={load} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Recordings ({data.recordings.length})
        </h2>
        {data.recordings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No recordings yet — record or upload one above.
          </p>
        ) : (
          <div className="space-y-3">
            {data.recordings.map((r) => (
              <RecordingCard key={r.id} recording={r} onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <Modal open={showEdit} title="Edit consultation" onClose={() => setShowEdit(false)}>
        <ConsultationForm
          submitLabel="Save changes"
          initial={data}
          onCancel={() => setShowEdit(false)}
          onSubmit={async (input) => {
            await api.updateConsultation(data.id, input);
            setShowEdit(false);
            await load();
          }}
        />
      </Modal>
    </div>
  );
}
