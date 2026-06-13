import type { ConsultationStatus } from '../lib/types';

const STYLES: Record<ConsultationStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  archived: 'bg-slate-200 text-slate-600',
};

const LABELS: Record<ConsultationStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
