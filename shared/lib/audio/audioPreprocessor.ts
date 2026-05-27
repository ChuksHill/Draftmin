/**
 * Audio preprocessing pipeline for speech-to-text accuracy.
 *
 * Routes the raw microphone stream through a Web Audio API graph:
 *  1. High-pass filter  — removes AC hum, fan rumble, traffic below 100 Hz
 *  2. Low-pass filter   — removes hiss and interference above 8 kHz
 *  3. Dynamics compressor — normalises uneven volume (critical for Nigerian English
 *                           where stress patterns differ from US/UK models' training data)
 *  4. Gain boost        — lifts quiet voices above the noise floor
 *  5. MediaStreamDestination — produces a *new* processed MediaStream so MediaRecorder
 *                              records clean audio, not the raw mic
 *
 * The AnalyserNode is also returned so callers can run VAD (voice-activity detection)
 * and skip silent / noise-only audio chunks before sending them to an STT API.
 */

export type AudioPreprocessorResult = {
  /** Processed stream — pass this to MediaRecorder instead of the raw mic stream */
  processedStream: MediaStream;
  /** Use with isSpeechPresent() to gate audio chunks before sending to STT */
  analyser: AnalyserNode;
  audioContext: AudioContext;
  cleanup: () => void;
};

/**
 * Creates the full processing chain.
 * Always call cleanup() when done to release the AudioContext and all nodes.
 */
export async function createAudioPreprocessor(
  rawStream: MediaStream
): Promise<AudioPreprocessorResult> {
  // 16 kHz is the native sample rate that Deepgram nova-3 and Whisper large-v3
  // both expect. Downsampling here avoids lossy re-encoding server-side.
  const audioContext = new AudioContext({ sampleRate: 16_000 });
  const source = audioContext.createMediaStreamSource(rawStream);

  // ── Filter 1: high-pass ─────────────────────────────────────────────────
  // Removes everything below 100 Hz — generator hum, air-con rumble, traffic.
  const highPass = audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 100;
  highPass.Q.value = 0.7;

  // ── Filter 2: low-pass ──────────────────────────────────────────────────
  // Removes everything above 8 kHz — fan whine, electronics hiss.
  // Human speech lives between ~80 Hz and ~8 kHz; keeping only that range
  // dramatically improves model accuracy.
  const lowPass = audioContext.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 8_000;
  lowPass.Q.value = 0.7;

  // ── Dynamics compressor ─────────────────────────────────────────────────
  // Smooths out volume spikes and lifts quieter sections. Important for
  // Nigerian English where syllable stress differs from US/UK patterns —
  // unstressed syllables often drop below the STT model's sensitivity.
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -24; // start compressing at -24 dBFS
  compressor.knee.value = 10;
  compressor.ratio.value = 6;      // 6:1 — natural sounding, not over-squashed
  compressor.attack.value = 0.005; // 5 ms — catches plosives ("p", "b", "t")
  compressor.release.value = 0.15; // 150 ms — smooth tail

  // ── Gain ────────────────────────────────────────────────────────────────
  // +60% boost after compression to put the speech signal well above the
  // quantisation noise floor of the 16-bit PCM in the audio chunk.
  const gain = audioContext.createGain();
  gain.gain.value = 1.6;

  // ── Analyser ────────────────────────────────────────────────────────────
  // Used by isSpeechPresent() to read the instantaneous RMS energy and decide
  // whether a recorded chunk actually contains speech before sending it to the
  // STT API (Voice Activity Detection / VAD).
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2_048;
  analyser.smoothingTimeConstant = 0.7; // smooth slightly so single-frame spikes don't pass VAD

  // ── Output destination ──────────────────────────────────────────────────
  // createMediaStreamDestination() gives us a *new* MediaStream derived from
  // the processed audio graph. MediaRecorder records THIS stream, not the raw mic.
  const destination = audioContext.createMediaStreamDestination();

  // ── Wire the graph ──────────────────────────────────────────────────────
  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(gain);
  gain.connect(analyser);
  analyser.connect(destination);

  const cleanup = () => {
    try {
      source.disconnect();
      highPass.disconnect();
      lowPass.disconnect();
      compressor.disconnect();
      gain.disconnect();
      analyser.disconnect();
      destination.disconnect();
      void audioContext.close();
    } catch {
      /* nodes may already be disconnected if context was closed */
    }
  };

  return {
    processedStream: destination.stream,
    analyser,
    audioContext,
    cleanup,
  };
}

// ── VAD helpers ─────────────────────────────────────────────────────────────

// Reuse a single buffer to avoid GC pressure in the hot path
const _vadBuffer = new Float32Array(2_048);

/**
 * Returns the Root Mean Square energy of the current audio frame.
 * Typical values:
 *   ~0.001–0.003  →  silence / background noise
 *   ~0.007–0.010  →  onset of quiet speech
 *   ~0.020–0.100  →  normal speech
 *   ~0.100+       →  loud speech or clipping
 */
export function getAudioRMS(analyser: AnalyserNode): number {
  analyser.getFloatTimeDomainData(_vadBuffer);
  let sum = 0;
  for (const v of _vadBuffer) sum += v * v;
  return Math.sqrt(sum / _vadBuffer.length);
}

/**
 * Returns true when the measured RMS exceeds `threshold`.
 *
 * Tuning guide:
 *   threshold = 0.006  — very sensitive (catches whispers; may pass soft noise)
 *   threshold = 0.008  — good default for home/office (recommended)
 *   threshold = 0.012  — noisy environment (generator nearby, open window)
 *   threshold = 0.018  — very noisy (market, street, shared office)
 */
export function isSpeechPresent(analyser: AnalyserNode, threshold = 0.008): boolean {
  return getAudioRMS(analyser) > threshold;
}
