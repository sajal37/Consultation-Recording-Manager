import { useRef, useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { api } from '../lib/api';
import { formatDuration } from '../lib/format';

interface Props {
  consultationId: string;
  onUploaded: () => void;
}

/** Combined "record in browser" + "upload a file" capture panel. */
export function RecorderPanel({ consultationId, onUploaded }: Props) {
  const rec = useAudioRecorder();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveRecorded() {
    if (!rec.blob) return;
    setBusy(true);
    setError(null);
    try {
      const ext = rec.mimeType.includes('mp4') ? 'm4a' : 'webm';
      await api.uploadRecording(
        consultationId,
        rec.blob,
        `recording-${Date.now()}.${ext}`,
        rec.seconds,
      );
      rec.reset();
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadRecording(consultationId, file, file.name);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Record controls */}
        {rec.state !== 'recording' ? (
          <button
            onClick={rec.start}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            Record
          </button>
        ) : (
          <button
            onClick={rec.stop}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            <span className="h-2.5 w-2.5 bg-white" />
            Stop
          </button>
        )}

        {rec.state === 'recording' && (
          <span className="flex items-center gap-2 text-sm text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            Recording… {formatDuration(rec.seconds)}
          </span>
        )}

        <div className="h-6 w-px bg-slate-200" />

        {/* Upload control */}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Upload file
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={handleFile}
            disabled={busy}
          />
        </label>
      </div>

      {/* Preview + save the just-recorded clip */}
      {rec.state === 'stopped' && rec.blob && (
        <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-3">
          <audio
            controls
            src={URL.createObjectURL(rec.blob)}
            className="w-full"
          />
          <div className="flex gap-2">
            <button
              onClick={saveRecorded}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save recording'}
            </button>
            <button
              onClick={rec.reset}
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {rec.error && <p className="mt-3 text-sm text-red-600">{rec.error}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
