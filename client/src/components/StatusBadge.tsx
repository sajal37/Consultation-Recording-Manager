import type { ConsultationStatus } from '../lib/types';

// Status reads like a stamp on a case file: a dot + a quiet label.
const META: Record<ConsultationStatus, { label: string; dot: string; text: string }> = {
  scheduled: { label: 'Scheduled', dot: 'bg-clay-400', text: 'text-clay-700' },
  in_progress: { label: 'In progress', dot: 'bg-pine-400 animate-pulse', text: 'text-pine-600' },
  completed: { label: 'Completed', dot: 'bg-pine-600', text: 'text-pine-700' },
  archived: { label: 'Archived', dot: 'bg-ink-faint', text: 'text-ink-faint' },
};

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  const m = META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${m.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
