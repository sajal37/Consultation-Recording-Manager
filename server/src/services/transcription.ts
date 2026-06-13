import { config } from '../config.js';
import { recordings } from '../db/repository.js';

// Everything that wants a transcript talks to this interface, not to a
// specific service. That's what lets the mock and the real Whisper call be
// interchangeable, and what would let a third one slot in later.
export interface TranscriptionResult {
  transcript: string;
  summary: string;
}

export interface TranscriptionProvider {
  transcribe(filePath: string, mimeType: string): Promise<TranscriptionResult>;
}

// --- Mock: the default. No network, no key, same answer every time. ---
// It exists so the app runs the moment you clone it and so the demo is
// predictable. The little delay is on purpose — without it the UI would never
// show the "processing" state and you'd miss half the point.

const SAMPLE = [
  'Clinician: Thanks for coming in today. How have you been feeling since our last session?',
  'Client: A bit better overall, though the evenings are still difficult.',
  'Clinician: Understood. Let us walk through the coping strategies we discussed.',
  'Client: The breathing exercises helped, but I struggled to keep a routine.',
  'Clinician: That is good progress. We will set smaller, more achievable goals this week.',
].join('\n');

class MockProvider implements TranscriptionProvider {
  async transcribe(): Promise<TranscriptionResult> {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      transcript: SAMPLE,
      summary:
        'Follow-up consultation. Client reports modest improvement with continued ' +
        'difficulty in the evenings. Breathing exercises were partially effective. ' +
        'Plan: set smaller weekly goals and reinforce routine.',
    };
  }
}

// --- OpenAI Whisper: the real one. Uses global fetch, no SDK needed. ---

class OpenAiProvider implements TranscriptionProvider {
  constructor(private apiKey: string) {}

  async transcribe(filePath: string, mimeType: string): Promise<TranscriptionResult> {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('file', new Blob([fs.readFileSync(filePath)], { type: mimeType }), path.basename(filePath));

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);

    const { text } = (await res.json()) as { text: string };
    // Whisper doesn't summarise, and I didn't want to spend a second API call
    // (and more latency) on it for a demo — so the "summary" is just the first
    // couple of sentences. A real product would send this to a chat model.
    const summary = text.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ') || text.slice(0, 200);
    return { transcript: text, summary };
  }
}

const provider =
  config.transcription.provider === 'openai' && config.transcription.openAiApiKey
    ? new OpenAiProvider(config.transcription.openAiApiKey)
    : new MockProvider();

// Start transcribing in the background and return immediately. The recording's
// status walks processing → done (or failed), and the client polls for it.
// This deliberately never throws back to the caller — a failed transcript
// shouldn't fail the upload that triggered it.
export function startTranscription(recordingId: string, filePath: string, mimeType: string): void {
  recordings.setTranscriptStatus(recordingId, 'processing');
  void provider
    .transcribe(filePath, mimeType)
    .then(({ transcript, summary }) => recordings.setTranscriptResult(recordingId, transcript, summary))
    .catch((err) => {
      console.error(`Transcription failed for ${recordingId}:`, err);
      recordings.setTranscriptStatus(recordingId, 'failed');
    });
}

