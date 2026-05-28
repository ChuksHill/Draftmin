export type AudioPreprocessorResult = {
  processedStream: MediaStream;
  analyser: AnalyserNode;
  audioContext: AudioContext;
  cleanup: () => void;
  /** Call once after a user gesture if context is still suspended */
  resume: () => Promise<void>;
};

export async function createAudioPreprocessor(
  rawStream: MediaStream
): Promise<AudioPreprocessorResult> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // ── AudioContext: always try to resume immediately ──────────────────────
  // Modern browsers (Chrome Android, iOS Safari, Firefox) start AudioContext
  // in "suspended" state unless created inside a direct user-gesture handler.
  // We call resume() here and also expose it for the caller to retry.
  const audioContext = new AudioContext();
  try {
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  } catch (e) {
    console.warn("[audio] AudioContext resume failed (will retry on gesture):", e);
  }

  const resume = async () => {
    try {
      if (audioContext.state !== "running") await audioContext.resume();
    } catch { /* ignore */ }
  };

  const source = audioContext.createMediaStreamSource(rawStream);

  // ── ANALYSER (shared by VAD on all platforms) ────────────────────────────
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.6;

  if (isMobile) {
    // ── MOBILE: minimal processing to avoid AudioContext complexity ──────
    // Still route through the graph so analyser gets real signal.
    // Return destination.stream (not rawStream) so we have one consistent
    // audio path; MediaRecorder on mobile records from this processed stream.
    const destination = audioContext.createMediaStreamDestination();

    // Lightweight gain to avoid clipping on mobile mics
    const gain = audioContext.createGain();
    gain.gain.value = 1.0;

    source.connect(gain);
    gain.connect(analyser);
    gain.connect(destination);

    return {
      processedStream: destination.stream,
      analyser,
      audioContext,
      resume,
      cleanup: () => {
        try {
          source.disconnect();
          gain.disconnect();
          analyser.disconnect();
          destination.disconnect();
          void audioContext.close();
        } catch { /* ignore */ }
      },
    };
  }

  // ── DESKTOP: full processing pipeline ───────────────────────────────────
  const highPass = audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 80;
  highPass.Q.value = 0.7;

  const lowPass = audioContext.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 8000;
  lowPass.Q.value = 0.7;

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 10;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;

  const gain = audioContext.createGain();
  gain.gain.value = 1.2;

  const destination = audioContext.createMediaStreamDestination();

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(gain);
  gain.connect(analyser);
  gain.connect(destination);

  return {
    processedStream: destination.stream,
    analyser,
    audioContext,
    resume,
    cleanup: () => {
      try {
        source.disconnect();
        highPass.disconnect();
        lowPass.disconnect();
        compressor.disconnect();
        gain.disconnect();
        analyser.disconnect();
        destination.disconnect();
        void audioContext.close();
      } catch { /* ignore */ }
    },
  };
}

// ── VAD ─────────────────────────────────────────────────────────────────────
const _vadBuffer = new Float32Array(2048);

export function getAudioRMS(analyser: AnalyserNode): number {
  analyser.getFloatTimeDomainData(_vadBuffer);
  let sum = 0;
  for (const v of _vadBuffer) sum += v * v;
  return Math.sqrt(sum / _vadBuffer.length);
}

export function isSpeechPresent(
  analyser: AnalyserNode,
  threshold = 0.008
): boolean {
  return getAudioRMS(analyser) > threshold;
}

/**
 * Rolling VAD tracker — polls the analyser on a fixed interval and exposes
 * `consumeSpeechDetected()` which returns true if any poll in the last chunk
 * window saw speech, then resets the flag. Use this instead of a single
 * end-of-chunk snapshot.
 */
export function createRollingVAD(
  analyser: AnalyserNode,
  options: { pollMs?: number; threshold?: number } = {}
) {
  const { pollMs = 80, threshold = 0.008 } = options;
  let speechSeen = false;
  let stopped = false;

  const id = setInterval(() => {
    if (stopped) return;
    if (isSpeechPresent(analyser, threshold)) speechSeen = true;
  }, pollMs);

  return {
    /** Returns true if speech was detected since last call, then resets. */
    consumeSpeechDetected(): boolean {
      const v = speechSeen;
      speechSeen = false;
      return v;
    },
    stop() {
      stopped = true;
      clearInterval(id);
    },
  };
}
