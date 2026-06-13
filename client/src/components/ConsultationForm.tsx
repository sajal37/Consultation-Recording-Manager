import { useState } from 'react';
import type { ConsultationInput, ConsultationStatus } from '../lib/types';

const STATUSES: ConsultationStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'archived',
];

interface Props {
  initial?: Partial<ConsultationInput>;
  submitLabel: string;
  onSubmit: (input: ConsultationInput) => Promise<void> | void;
  onCancel: () => void;
}

/** Convert an ISO string to the value a datetime-local input expects. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function ConsultationForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [consultationType, setConsultationType] = useState(
    initial?.consultationType ?? 'General',
  );
  const [status, setStatus] = useState<ConsultationStatus>(
    initial?.status ?? 'scheduled',
  );
  const [scheduledLocal, setScheduledLocal] = useState(
    toLocalInput(initial?.scheduledAt),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) {
      setError('Client name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        clientName: clientName.trim(),
        consultationType: consultationType.trim() || 'General',
        status,
        scheduledAt: scheduledLocal ? new Date(scheduledLocal).toISOString() : null,
        notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const lbl = 'label-kicker';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={lbl}>Client name</label>
        <input
          className="field"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="e.g. Jordan Patel"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Type</label>
          <input
            className="field"
            value={consultationType}
            onChange={(e) => setConsultationType(e.target.value)}
            placeholder="General"
          />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value as ConsultationStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={lbl}>Scheduled at</label>
        <input
          type="datetime-local"
          className="field"
          value={scheduledLocal}
          onChange={(e) => setScheduledLocal(e.target.value)}
        />
      </div>

      <div>
        <label className={lbl}>Notes</label>
        <textarea
          className="field"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for visit, context, follow-ups…"
        />
      </div>

      {error && <p className="text-sm text-clay-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-clay disabled:opacity-50">
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
