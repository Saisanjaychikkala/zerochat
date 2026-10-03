// Lightweight browser audio recorder using MediaRecorder (100% native)

class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.startTime = 0;
    this.audioCtx = null;
    this.analyser = null;
    this.sourceNode = null;
    this.volumeSamples = [];
    this.sampleInterval = null;
  }

  calculateNormalizedWaveform(samples, targetLength = 16) {
    if (!samples || samples.length === 0) {
      return [0.15, 0.40, 0.65, 0.85, 0.50, 0.90, 0.70, 0.35, 0.45, 0.80, 0.60, 0.30, 0.55, 0.75, 0.40, 0.20];
    }
    const result = [];
    const step = samples.length / targetLength;
    let max = 0.05;

    for (let i = 0; i < targetLength; i++) {
      const startIdx = Math.floor(i * step);
      const endIdx = Math.max(startIdx + 1, Math.floor((i + 1) * step));
      let sum = 0;
      let count = 0;
      for (let j = startIdx; j < endIdx && j < samples.length; j++) {
        sum += samples[j];
        count++;
      }
      const avg = count > 0 ? sum / count : 0.08;
      if (avg > max) max = avg;
      result.push(avg);
    }

    return result.map((v) => {
      const normalized = Math.max(0.08, Math.min(1.0, v / max));
      return Math.round(normalized * 100) / 100;
    });
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Audio recording not supported in this browser');
    }

    this.audioChunks = [];
    this.volumeSamples = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Pick supported MIME type with fallback
    let mimeType = '';
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }

    try {
      this.mediaRecorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);
    } catch (e) {
      console.warn('[ZeroChat] MediaRecorder with mimeType failed, falling back to default:', e);
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    // Attach AudioContext & AnalyserNode for volume waveform sampling
    try {
      const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
        this.sourceNode.connect(this.analyser);

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        this.sampleInterval = setInterval(() => {
          if (!this.analyser) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / (bufferLength * 255);
          this.volumeSamples.push(avg);
        }, 100);
      }
    } catch (err) {
      console.warn('[ZeroChat] Web Audio Analyser init warning:', err);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start(100); // 100ms timeslices
  }

  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        return reject(new Error('Recorder not active'));
      }

      this.mediaRecorder.onstop = () => {
        const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        if (this.sampleInterval) {
          clearInterval(this.sampleInterval);
          this.sampleInterval = null;
        }

        const waveform = this.calculateNormalizedWaveform(this.volumeSamples, 16);

        if (this.sourceNode) {
          try { this.sourceNode.disconnect(); } catch (e) {}
          this.sourceNode = null;
        }
        if (this.audioCtx) {
          try { this.audioCtx.close(); } catch (e) {}
          this.audioCtx = null;
        }
        this.analyser = null;
        this.volumeSamples = [];

        // Clean up mic hardware tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const fileName = `voice_note_${Date.now()}.${ext}`;
        const file = new File([blob], fileName, { type: mimeType });

        resolve({ file, durationSec, url: URL.createObjectURL(blob), waveform });
      };

      this.mediaRecorder.stop();
    });
  }

  cancel() {
    if (this.sampleInterval) {
      clearInterval(this.sampleInterval);
      this.sampleInterval = null;
    }
    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    this.analyser = null;
    this.volumeSamples = [];

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}

export const voiceRecorder = new VoiceRecorder();
