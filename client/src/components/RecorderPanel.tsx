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
    <div className="sheet p-5">
      <div className="flex flex-wrap items-center gap-4">
        {/* the big round record/stop control */}
        {rec.state !== 'recording' ? (
          <button
            onClick={rec.start}
            disabled={busy}
            aria-label="Start recording"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-clay-600 text-clay-50 transition hover:bg-clay-700 disabled:opacity-50"
          >
            <span className="h-4 w-4 rounded-full bg-clay-50" />
          </button>
        ) : (
          <button
            onClick={rec.stop}
            aria-label="Stop recording"
            className="grid h-14 w-14 shrink-0 animate-pulse-ring place-items-center rounded-full bg-clay-600 text-clay-50 transition hover:bg-clay-700"
          >
            <span className="h-4 w-4 rounded-[3px] bg-clay-50" />
          </button>
        )}

        <div className="flex-1">
          {rec.state === 'recording' ? (
            <>
              <p className="font-mono text-2xl tabular-nums text-clay-600">
                {formatDuration(rec.seconds)}
              </p>
              <p className="label-kicker mt-0.5 text-clay-500">● recording — tap to stop</p>
            </>
          ) : (
            <>
              <p className="font-display text-lg text-ink">Capture this session</p>
              <p className="text-sm text-ink-soft">
                Hit record, or bring your own file.
              </p>
            </>
          )}
        </div>

        <label className="btn-outline cursor-pointer shrink-0">
          Upload a file
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
        <div className="mt-5 space-y-3 rounded-md border border-line bg-paper/50 p-4">
          <p className="label-kicker">Take a listen before you file it</p>
          <audio controls src={URL.createObjectURL(rec.blob)} />
          <div className="flex gap-2">
            <button onClick={saveRecorded} disabled={busy} className="btn-clay disabled:opacity-50">
              {busy ? 'Filing…' : 'Save to this consultation'}
            </button>
            <button onClick={rec.reset} disabled={busy} className="btn-ghost">
              Discard
            </button>
          </div>
        </div>
      )}

      {rec.error && <p className="mt-3 text-sm text-clay-600">{rec.error}</p>}
      {error && <p className="mt-3 text-sm text-clay-600">{error}</p>}
    </div>
  );
}
