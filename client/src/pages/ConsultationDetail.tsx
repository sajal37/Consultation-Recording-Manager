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
    return (
      <p className="mx-auto max-w-3xl px-5 py-10 font-mono text-sm text-ink-faint">
        Pulling the file…
      </p>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm text-clay-600">{error ?? 'Not found.'}</p>
        <button onClick={onBack} className="btn-ghost mt-3 text-sm">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      {/* breadcrumb */}
      <button
        onClick={onBack}
        className="font-mono text-xs text-ink-faint transition hover:text-ink"
      >
        ← casebook
      </button>

      {/* header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="label-kicker">{data.consultationType}</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              {data.clientName}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          {data.scheduledAt && (
            <p className="mt-1 font-mono text-xs text-ink-faint">
              {formatDateTime(data.scheduledAt)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-outline text-sm">
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="font-mono text-xs text-ink-faint hover:text-clay-600"
          >
            delete
          </button>
        </div>
      </div>

      {/* notes block */}
      {data.notes && (
        <div className="sheet mt-5 p-4">
          <p className="label-kicker">Notes</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-soft">{data.notes}</p>
        </div>
      )}

      {/* recorder */}
      <section className="mt-8">
        <p className="label-kicker mb-3">Capture</p>
        <RecorderPanel consultationId={data.id} onUploaded={load} />
      </section>

      {/* recordings list */}
      <section className="mt-10">
        <div className="flex items-baseline gap-2 border-b border-line pb-3">
          <h2 className="font-display text-xl font-medium text-ink">Recordings</h2>
          <span className="font-mono text-xs text-ink-faint">
            {data.recordings.length} file{data.recordings.length !== 1 ? 's' : ''}
          </span>
        </div>

        {data.recordings.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-line px-6 py-10 text-center">
            <p className="font-display text-ink-soft">Nothing here yet.</p>
            <p className="mt-1 text-sm text-ink-faint">
              Record or upload a file above to get started.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
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
