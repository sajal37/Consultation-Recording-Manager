import { config } from '../config.js';
import { recordings } from '../db/repository.js';

/**
 * Transcription service abstraction.
 *
 * The interface is provider-agnostic so the rest of the app never cares
 * whether transcripts come from a local mock or a real cloud API.
 * Default provider is "mock" so the project runs fully offline with no keys.
 */
export interface TranscriptionResult {
  transcript: string;
  summary: string;
}

export interface TranscriptionProvider {
  transcribe(filePath: string, mimeType: string): Promise<TranscriptionResult>;
}

/* ---------------------------- Mock provider ---------------------------- */

const SAMPLE_LINES = [
  'Clinician: Thanks for coming in today. How have you been feeling since our last session?',
  'Client: A bit better overall, though the evenings are still difficult.',
  'Clinician: Understood. Let us walk through the coping strategies we discussed.',
  'Client: The breathing exercises helped, but I struggled to keep a routine.',
  'Clinician: That is good progress. We will set smaller, more achievable goals this week.',
];

class MockProvider implements TranscriptionProvider {
  async transcribe(): Promise<TranscriptionResult> {
    // Simulate processing latency so the UI's "processing" state is visible.
    await new Promise((r) => setTimeout(r, 1200));
    const transcript = SAMPLE_LINES.join('\n');
    const summary =
      'Follow-up consultation. Client reports modest improvement with continued ' +
      'difficulty in the evenings. Breathing exercises were partially effective. ' +
      'Plan: set smaller weekly goals and reinforce routine.';
    return { transcript, summary };
  }
}

/* --------------------------- OpenAI provider --------------------------- */
/* Real implementation kept minimal & dependency-free (uses global fetch). */

class OpenAiProvider implements TranscriptionProvider {
  constructor(private apiKey: string) {}

  async transcribe(filePath: string, mimeType: string): Promise<TranscriptionResult> {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const fileBuffer = fs.readFileSync(filePath);
    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append(
      'file',
      new Blob([fileBuffer], { type: mimeType }),
      path.basename(filePath),
    );

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { text: string };
    const transcript = data.text;

    // Lightweight extractive summary (first ~2 sentences) to avoid a 2nd API call.
    const summary =
      transcript.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') || transcript.slice(0, 200);
    return { transcript, summary };
  }
}

/* ------------------------------ Factory ------------------------------- */

function makeProvider(): TranscriptionProvider {
  if (config.transcription.provider === 'openai' && config.transcription.openAiApiKey) {
    return new OpenAiProvider(config.transcription.openAiApiKey);
  }
  return new MockProvider();
}

const provider = makeProvider();

/**
 * Kick off transcription for a recording in the background.
 * Updates DB status as it progresses; never throws to the caller.
 */
export function startTranscription(
  recordingId: string,
  filePath: string,
  mimeType: string,
): void {
  recordings.setTranscriptStatus(recordingId, 'processing');
  void provider
    .transcribe(filePath, mimeType)
    .then(({ transcript, summary }) => {
      recordings.setTranscriptResult(recordingId, transcript, summary);
    })
    .catch((err) => {
      console.error(`Transcription failed for ${recordingId}:`, err);
      recordings.setTranscriptStatus(recordingId, 'failed');
    });
}
