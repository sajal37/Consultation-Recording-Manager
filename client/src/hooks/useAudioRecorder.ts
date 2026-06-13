import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'stopped' | 'denied';

export interface UseAudioRecorder {
  state: RecorderState;
  seconds: number;
  blob: Blob | null;
  mimeType: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/** Pick a mime type the browser actually supports for MediaRecorder. */
function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return '';
}

/**
 * Encapsulates browser microphone recording via the MediaRecorder API.
 * Handles permissions, an elapsed-time ticker, and produces a final Blob.
 */
export function useAudioRecorder(): UseAudioRecorder {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const mimeRef = useRef<string>(pickMimeType());

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    setError(null);
    setBlob(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = mimeRef.current;
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || 'audio/webm';
        setBlob(new Blob(chunksRef.current, { type }));
        stopStream();
        clearTimer();
        setState('stopped');
      };

      recorder.start();
      setSeconds(0);
      setState('recording');
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission was denied.'
          : 'Could not start recording on this device.',
      );
      setState('denied');
      stopStream();
    }
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    stopStream();
    recorderRef.current = null;
    chunksRef.current = [];
    setBlob(null);
    setSeconds(0);
    setError(null);
    setState('idle');
  }, []);

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      clearTimer();
      stopStream();
    };
  }, []);

  return {
    state,
    seconds,
    blob,
    mimeType: mimeRef.current || 'audio/webm',
    error,
    start,
    stop,
    reset,
  };
}
