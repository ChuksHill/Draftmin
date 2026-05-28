export type AudioPreprocessorResult = {
  processedStream: MediaStream;
  analyser: AnalyserNode;
  audioContext: AudioContext;
  cleanup: () => void;
};

export async function createAudioPreprocessor(
  rawStream: MediaStream
): Promise<AudioPreprocessorResult> {
  const isMobile =
    /iPhone|Android/i.test(navigator.userAgent);

  // ⚡ IMPORTANT: DO NOT FORCE sampleRate (breaks mobile Safari/Android)
  const audioContext = new AudioContext();

  const source =
    audioContext.createMediaStreamSource(rawStream);

  // ── ANALYSER ONLY (safe for VAD, no heavy processing) ──
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.7;

  // ── MOBILE MODE (bypass all processing) ──
  if (isMobile) {
    source.connect(analyser);

    const destination =
      audioContext.createMediaStreamDestination();

    analyser.connect(destination);

    return {
      processedStream: rawStream, // 👈 KEY FIX: avoid processed chain on mobile
      analyser,
      audioContext,
      cleanup: () => audioContext.close(),
    };
  }

  // ── DESKTOP PROCESSING PIPELINE ──
  const highPass = audioContext.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 100;
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
  gain.gain.value = 1.2; // reduced for stability

  const destination =
    audioContext.createMediaStreamDestination();

  // ── PIPELINE ──
  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(gain);

  // analyser taps AFTER gain (safe VAD signal)
  gain.connect(analyser);
  gain.connect(destination);

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
    } catch {}
  };

  return {
    processedStream: destination.stream,
    analyser,
    audioContext,
    cleanup,
  };
}

// ── VAD (UNCHANGED BUT SAFE) ──
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