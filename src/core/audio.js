const CHORDS = [
  [73.42, 110.0, 174.61, 261.63, 329.63],
  [58.27, 87.31, 146.83, 220.0, 261.63],
  [87.31, 130.81, 220.0, 329.63, 392.0],
  [130.81, 196.0, 293.66, 329.63, 392.0],
  [98.0, 146.83, 233.08, 349.23, 440.0],
  [110.0, 164.81, 196.0, 261.63, 329.63],
  [146.83, 220.0, 329.63, 349.23, 523.25],
  [116.54, 174.61, 293.66, 440.0, 523.25],
];

const BELLS = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46];
const CHORD_LEN = 11.5;
const CHORD_DUR = 16;
const TARGET_GAIN = 0.82;

export class AmbientAudio {
  constructor() {
    this.supported = !!(window.AudioContext || window.webkitAudioContext);
    this.ctx = null;
    this.bus = null;
    this.master = null;
    this.reverb = null;
    this.delay = null;
    this.timer = null;
    this.nextChordAt = 0;
    this.nextBellAt = 0;
    this.chordIndex = 0;
    this.running = false;
  }

  start() {
    if (!this.supported) return;
    if (!this.ctx) this._build();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.running) {
      this._fade(TARGET_GAIN, 1.2);
      return;
    }
    this.running = true;
    this._fade(TARGET_GAIN, 4);
    this._resetSchedule();
  }

  stop() {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.ctx && this.master) this._fade(0, 1.4);
  }

  _build() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx({ latencyHint: 'playback' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.0001;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 18;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.8;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.8;
    this.bus.connect(comp);
    comp.connect(this.master);
    this.master.connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.8, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    this.reverb.connect(wet);
    wet.connect(this.bus);

    this.delay = ctx.createDelay(1.5);
    this.delay.delayTime.value = 0.42;
    const fb = ctx.createGain();
    fb.gain.value = 0.3;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    this.delay.connect(tone);
    tone.connect(fb);
    fb.connect(this.delay);
    tone.connect(this.bus);
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  _fade(target, seconds) {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const gain = this.master.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(Math.max(gain.value, 0.0001), now);
    gain.linearRampToValueAtTime(Math.max(target, 0.0001), now + seconds);
  }

  _resetSchedule() {
    if (this.timer) clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.nextChordAt = now + 0.25;
    this.nextBellAt = now + 4 + Math.random() * 3;
    this._schedule();
    this.timer = setInterval(() => this._schedule(), 800);
  }

  _schedule() {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    while (this.nextChordAt < now + 7) {
      this._playChord(this.nextChordAt, CHORDS[this.chordIndex % CHORDS.length]);
      this.chordIndex++;
      this.nextChordAt += CHORD_LEN;
    }
    while (this.nextBellAt < now + 8) {
      this._playBell(this.nextBellAt);
      this.nextBellAt += 3.4 + Math.random() * 3.2;
    }
  }

  _playChord(t, notes) {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.35;
    filter.frequency.setValueAtTime(620, t);
    filter.frequency.linearRampToValueAtTime(1450, t + 4.8);
    filter.frequency.linearRampToValueAtTime(760, t + CHORD_DUR);

    const out = ctx.createGain();
    out.gain.value = 0.9;
    filter.connect(out);
    out.connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = 0.42;
    out.connect(send);
    send.connect(this.reverb);

    const pans = [-0.38, 0.3, -0.18, 0.42, 0.05];
    notes.forEach((freq, i) => {
      const tone = ctx.createGain();
      const peak = 0.045 * (i === 0 ? 1.3 : i === 1 ? 1 : 0.82);
      tone.gain.setValueAtTime(0.0001, t);
      tone.gain.linearRampToValueAtTime(peak, t + 4.8);
      tone.gain.setValueAtTime(peak, t + CHORD_DUR - 5.4);
      tone.gain.exponentialRampToValueAtTime(0.0001, t + CHORD_DUR);

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = pans[i % pans.length];
        tone.connect(pan);
        pan.connect(filter);
      } else {
        tone.connect(filter);
      }

      const main = ctx.createOscillator();
      main.type = 'sine';
      main.frequency.value = freq;
      main.detune.value = i % 2 ? 3 : -3;
      main.connect(tone);

      const shimmer = ctx.createOscillator();
      shimmer.type = 'triangle';
      shimmer.frequency.value = freq * 2;
      shimmer.detune.value = i % 2 ? -4 : 4;
      const shimmerGain = ctx.createGain();
      shimmerGain.gain.value = 0.09;
      shimmer.connect(shimmerGain);
      shimmerGain.connect(tone);

      main.start(t);
      shimmer.start(t);
      main.stop(t + CHORD_DUR + 0.1);
      shimmer.stop(t + CHORD_DUR + 0.1);
    });
  }

  _playBell(t) {
    const ctx = this.ctx;
    const freq = BELLS[Math.floor(Math.random() * BELLS.length)];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.026, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);

    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.pan.value = Math.random() * 1.2 - 0.6;
      gain.connect(pan);
      pan.connect(this.bus);
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.6;
      pan.connect(reverbSend);
      reverbSend.connect(this.reverb);
      const delaySend = ctx.createGain();
      delaySend.gain.value = 0.22;
      pan.connect(delaySend);
      delaySend.connect(this.delay);
    } else {
      gain.connect(this.bus);
    }

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 3.5);

    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = freq * 2.004;
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.value = 0.12;
    harmonic.connect(harmonicGain);
    harmonicGain.connect(gain);
    harmonic.start(t);
    harmonic.stop(t + 3.5);
  }
}
