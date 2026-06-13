import { nanoid } from 'nanoid';
import { migrate } from './db/index.js';
import { consultations } from './db/repository.js';

/**
 * Inserts a few sample consultations so the app isn't empty on first run
 * (handy for the demo). Idempotent-ish: skips if data already exists.
 *
 *   npm run seed --workspace server
 */
migrate();

if (consultations.list().length > 0) {
  console.log('ℹ️  Data already present — skipping seed.');
  process.exit(0);
}

const now = Date.now();
const iso = (offsetDays: number) =>
  new Date(now + offsetDays * 86_400_000).toISOString();

const samples = [
  {
    clientName: 'Jordan Patel',
    consultationType: 'Therapy — follow-up',
    status: 'completed' as const,
    scheduledAt: iso(-2),
    notes: 'Reviewing coping strategies from last session.',
  },
  {
    clientName: 'Aisha Khan',
    consultationType: 'Initial assessment',
    status: 'scheduled' as const,
    scheduledAt: iso(1),
    notes: 'New client. Intake questionnaire sent.',
  },
  {
    clientName: 'Marco Rossi',
    consultationType: 'Legal consultation',
    status: 'in_progress' as const,
    scheduledAt: iso(0),
    notes: 'Contract review in progress.',
  },
];

for (const s of samples) {
  const ts = new Date().toISOString();
  consultations.create({
    id: nanoid(12),
    clientName: s.clientName,
    consultationType: s.consultationType,
    status: s.status,
    scheduledAt: s.scheduledAt,
    notes: s.notes,
    createdAt: ts,
    updatedAt: ts,
  });
}

console.log(`✅ Seeded ${samples.length} consultations.`);
