/**
 * AudioEngine manages Web Audio context, microphone streaming,
 * real-time frequency analysis for the Orb, and audio playback.
 * 
 * NOTE: Microphone input is analyzed strictly in an isolated AnalyserNode
 * and NEVER routed to ctx.destination (speakers) to prevent acoustic feedback/playback.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.micAnalyser = null;
    this.speakerAnalyser = null;
    this.micStream = null;
    this.micSource = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.currentAudioElement = null;
    this.audioSourceNode = null;
    this.isRecording = false;
    this.dataArray = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Isolated analyser for microphone (NEVER connected to destination)
      this.micAnalyser = this.ctx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.8;

      // Isolated analyser for speaker audio playback
      this.speakerAnalyser = this.ctx.createAnalyser();
      this.speakerAnalyser.fftSize = 256;
      this.speakerAnalyser.smoothingTimeConstant = 0.8;

      this.dataArray = new Uint8Array(128);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Synthesize a crisp acoustic chime to signal microphone open
   */
  async playChime() {
    try {
      const ctx = this.ensureContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
      return new Promise((resolve) => setTimeout(resolve, 360));
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * Start recording microphone and connect stream ONLY to micAnalyser (NOT to speakers)
   */
  async startMicRecording({ onSilenceDetected, onTurnTimeout } = {}) {
    const ctx = this.ensureContext();
    this.recordedChunks = [];
    this.isRecording = true;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      // CONNECT ONLY TO MIC ANALYSER - NEVER TO ctx.destination!
      this.micSource.connect(this.micAnalyser);

      // Check supported MIME types for recording
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/wav"];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(
        this.micStream,
        selectedMime ? { mimeType: selectedMime } : undefined
      );

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(100);
      this.recordingStartTime = Date.now();

      // VAD logic: detect speech start and 1.8s continuous silence
      let speechStarted = false;
      let silenceStart = null;
      const vadThreshold = 14;

      this.vadInterval = setInterval(() => {
        if (!this.isRecording) return;
        const avg = this.getAverageFrequency();

        if (avg > vadThreshold) {
          speechStarted = true;
          silenceStart = null;
        } else if (speechStarted) {
          if (!silenceStart) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart >= 1800) {
            clearInterval(this.vadInterval);
            if (onSilenceDetected) onSilenceDetected();
          }
        }
      }, 100);

      // 15s turn timeout
      this.turnTimer = setTimeout(() => {
        if (this.isRecording && onTurnTimeout) {
          onTurnTimeout();
        }
      }, 15000);

      return true;
    } catch (err) {
      console.warn("Could not access microphone directly:", err);
      return false;
    }
  }

  /**
   * Stop recording microphone and return audio blob + duration
   */
  async stopMicRecording() {
    this.isRecording = false;
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.vadInterval) clearInterval(this.vadInterval);

    const durationSeconds = this.recordingStartTime
      ? (Date.now() - this.recordingStartTime) / 1000
      : 0;

    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        this.cleanupMic();
        const mime = "audio/webm";
        const blob = this.recordedChunks.length > 0 ? new Blob(this.recordedChunks, { type: mime }) : null;
        resolve({ blob, duration: durationSeconds });
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder.mimeType || "audio/webm";
        const blob = this.recordedChunks.length > 0 ? new Blob(this.recordedChunks, { type: mime }) : null;
        this.cleanupMic();
        resolve({ blob, duration: durationSeconds });
      };

      // Request any final data buffered in the recorder
      try {
        if (this.mediaRecorder.state === "recording") {
          this.mediaRecorder.requestData();
        }
      } catch {}

      this.mediaRecorder.stop();
    });
  }

  cleanupMic() {
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {}
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  /**
   * Play base64 WAV/MP3 audio and connect to speakerAnalyser for Orb animation
   */
  async playBase64Audio(base64Audio, onEnded) {
    if (!base64Audio) {
      if (onEnded) onEnded();
      return;
    }

    const ctx = this.ensureContext();
    this.stopAudioPlayback();

    const audioUrl = `data:audio/wav;base64,${base64Audio}`;
    const audio = new Audio(audioUrl);
    this.currentAudioElement = audio;

    try {
      this.audioSourceNode = ctx.createMediaElementSource(audio);
      // Connect to speakerAnalyser for visualization
      this.audioSourceNode.connect(this.speakerAnalyser);
      // Connect to speakers for audible output
      this.audioSourceNode.connect(ctx.destination);
    } catch (err) {
      console.debug("Audio source binding fallback:", err);
    }

    audio.onended = () => {
      this.stopAudioPlayback();
      if (onEnded) onEnded();
    };

    audio.onerror = (e) => {
      console.warn("Audio element error:", e);
      this.stopAudioPlayback();
      if (onEnded) onEnded();
    };

    try {
      await audio.play();
    } catch (err) {
      console.warn("audio.play() prevented or failed:", err);
      this.stopAudioPlayback();
      if (onEnded) onEnded();
    }
  }

  stopAudioPlayback() {
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.src = "";
      this.currentAudioElement = null;
    }
    if (this.audioSourceNode) {
      try {
        this.audioSourceNode.disconnect();
      } catch {}
      this.audioSourceNode = null;
    }
  }

  /**
   * Returns current frequency values (0 to 255) from the active analyser
   */
  getFrequencyData() {
    if (!this.dataArray) {
      return new Uint8Array(64);
    }

    const activeAnalyser = this.isRecording ? this.micAnalyser : this.speakerAnalyser;
    if (!activeAnalyser) {
      return new Uint8Array(64);
    }

    activeAnalyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Returns average frequency value (0 to 255)
   */
  getAverageFrequency() {
    const data = this.getFrequencyData();
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / data.length;
  }
}

export const audioEngine = new AudioEngine();
