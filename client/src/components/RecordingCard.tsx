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

const STATUS_CLASS: Record<Recording['transcriptStatus'], string> = {
  none: 'border-line text-ink-faint',
  processing: 'border-clay-200 bg-clay-50 text-clay-600',
  done: 'border-pine-100 bg-pine-50 text-pine-600',
  failed: 'border-clay-200 bg-clay-50 text-clay-700',
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

  return (
    <div className="sheet p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-medium text-ink">{live.originalName}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
            {formatDateTime(live.createdAt)} · {formatBytes(live.sizeBytes)} ·{' '}
            {formatDuration(live.durationSeconds)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_CLASS[live.transcriptStatus]}`}
        >
          {STATUS_LABEL[live.transcriptStatus]}
        </span>
      </div>

      <audio controls src={api.streamUrl(live.id)} className="mt-3 w-full" />

      {(live.summary || live.transcript) && (
        <div className="mt-4 space-y-3">
          {live.summary && (
            <div>
              <p className="label-kicker">Summary</p>
              <p className="mt-1 text-sm text-ink-soft">{live.summary}</p>
            </div>
          )}
          {live.transcript && (
            <details className="group">
              <summary className="label-kicker cursor-pointer hover:text-ink">
                Transcript
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-line bg-paper/60 p-3 font-mono text-xs text-ink-soft">
                {live.transcript}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <a
          href={api.streamUrl(live.id)}
          download={live.originalName}
          className="btn-outline text-xs"
        >
          Download
        </a>
        {live.transcriptStatus !== 'processing' && (
          <button onClick={handleRetranscribe} className="btn-ghost text-xs">
            {live.transcriptStatus === 'done' ? 'Re-transcribe' : 'Transcribe'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="ml-auto font-mono text-xs text-ink-faint hover:text-clay-600 disabled:opacity-40"
        >
          {deleting ? 'removing…' : 'delete'}
        </button>
      </div>
    </div>
  );
}
