import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatBytes, formatDateTime, formatDuration } from '../lib/format';
import type { Recording } from '../lib/types';

interface Props {
  recording: Recording;
  onChanged: () => void;
}

const STATUS_LABEL: Record<Recording['transcriptStatus'], string> = {
  none: 'No transcript',
  processing: 'Transcribing…',
  done: 'Transcript ready',
  failed: 'Transcription failed',
};

export function RecordingCard({ recording, onChanged }: Props) {
  const [live, setLive] = useState<Recording>(recording);
  const [deleting, setDeleting] = useState(false);

  // Keep in sync when the parent refetches.
  useEffect(() => setLive(recording), [recording]);

  // Poll while transcription is in progress.
  useEffect(() => {
    if (live.transcriptStatus !== 'processing') return;
    let active = true;
    const id = window.setInterval(async () => {
      try {
        const updated = await api.getRecording(live.id);
        if (!active) return;
        setLive(updated);
        if (updated.transcriptStatus !== 'processing') {
          window.clearInterval(id);
          onChanged();
        }
      } catch {
        /* transient error — keep polling */
      }
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [live.id, live.transcriptStatus, onChanged]);

  async function handleDelete() {
    if (!confirm('Delete this recording? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteRecording(live.id);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  async function handleRetranscribe() {
    await api.retranscribe(live.id);
    setLive({ ...live, transcriptStatus: 'processing' });
  }

  const badgeColor =
    live.transcriptStatus === 'done'
      ? 'bg-green-100 text-green-700'
      : live.transcriptStatus === 'processing'
        ? 'bg-amber-100 text-amber-700'
        : live.transcriptStatus === 'failed'
          ? 'bg-red-100 text-red-700'
          : 'bg-slate-100 text-slate-600';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800">{live.originalName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateTime(live.createdAt)} · {formatBytes(live.sizeBytes)} ·{' '}
            {formatDuration(live.durationSeconds)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
          {STATUS_LABEL[live.transcriptStatus]}
        </span>
      </div>

      <audio controls src={api.streamUrl(live.id)} className="mt-3 w-full" />

      {(live.summary || live.transcript) && (
        <div className="mt-3 space-y-3">
          {live.summary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Summary
              </p>
              <p className="mt-1 text-sm text-slate-700">{live.summary}</p>
            </div>
          )}
          {live.transcript && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600">
                Transcript
              </summary>
              <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {live.transcript}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-3 text-sm">
        <a
          href={api.streamUrl(live.id)}
          download={live.originalName}
          className="font-medium text-brand-600 hover:underline"
        >
          Download
        </a>
        {live.transcriptStatus !== 'processing' && (
          <button
            onClick={handleRetranscribe}
            className="font-medium text-slate-600 hover:underline"
          >
            {live.transcriptStatus === 'done' ? 'Re-transcribe' : 'Transcribe'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
