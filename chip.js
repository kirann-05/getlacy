/* LacyChip: four original chiptunes, synthesized live with Web Audio (no audio files).
   window.LacyChip.play(song, fromStep?) · pause() · setVolume(0..100) · suspend() · resume() */
(() => {
  "use strict";

  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
  // Melody tokens per 16th step: a scale degree, "." holds the previous note, "_" rests.
  const SONGS = [
    { // Bubblegum Sunrise: bright pop, I V vi IV
      root: 60, scale: MAJOR, bpm: 116, chords: [0, 4, 5, 3], lead: "square", leadGain: 0.11, arp: "triangle",
      melody: ["4 . 4 . 5 . 4 . 2 . . . 0 . 2 .", "4 . . . 1 . . . 4 . 6 . 4 . . .", "5 . 5 . 7 . 5 . 4 . 2 . 0 . 2 .", "3 . 2 . 3 . 5 . 4 . . . _ . . ."],
      bass: "R . . R . . R . R . . R . . O .",
      kick: "x . . . . . x . x . . . . . . .", snare: ". . . . x . . . . . . . x . . .", hat: "x . x . x . x . x . x . x . x .",
    },
    { // Dot Matrix Dreams: dreamy minor, i VI III VII, with echo
      root: 57, scale: MINOR, bpm: 92, chords: [0, 5, 2, 6], lead: "triangle", leadGain: 0.2, arp: "sine", echo: true,
      melody: ["4 . . . 2 . 4 . 7 . . . 6 . 4 .", "5 . . . 4 . 2 . 4 . . . _ . . .", "2 . 4 . 6 . 7 . 9 . . . 7 . 6 .", "6 . . . 4 . 1 . 3 . 2 . 1 . . ."],
      bass: "R . . . . . . . F . . . R . . .",
      kick: "x . . . . . . . . . x . . . . .", snare: ". . . . x . . . . . . . x . . .", hat: ". . x . . . x . . . x . . . x .",
    },
    { // Spring Loaded: bouncy, I IV V IV
      root: 62, scale: MAJOR, bpm: 138, chords: [0, 3, 4, 3], lead: "square", leadGain: 0.09, arp: "square",
      melody: ["0 _ 2 _ 4 _ 7 . 4 _ 2 _ 4 . . .", "3 _ 5 _ 7 _ 8 . 7 _ 5 _ 3 . . .", "4 _ 6 _ 8 . 9 . 8 _ 6 _ 4 . 6 .", "5 . 3 . 5 . 7 . 5 . . . _ . . ."],
      bass: "R _ O _ R _ O _ R _ O _ F _ O _",
      kick: "x . . . x . . . x . . . x . . .", snare: ". . . . x . . . . . . . x . . x", hat: "x x x x x x x x x x x x x x x x",
    },
    { // Notch Me If You Can: driving minor, i iv VII III
      root: 52, scale: MINOR, bpm: 124, chords: [0, 3, 6, 2], lead: "sawtooth", leadGain: 0.07, arp: "square", vibrato: true,
      melody: ["0 . 0 . 3 . 4 . 6 . 4 . 3 . 4 .", "3 . . . 0 . 1 . 3 . . . _ . . .", "6 . 6 . 8 . 6 . 4 . 3 . 4 . 6 .", "7 . . . 6 . 4 . 2 . . . _ . . ."],
      bass: "R . R . _ R . R R . R . _ O F .",
      kick: "x . . x . . x . . . x . . . . .", snare: ". . . . x . . . . . . . x . . .", hat: "x . x . x . x x x . x . x . x x",
    },
  ].map((s) => ({ ...s, melody: s.melody.map((b) => b.split(" ")), bass: s.bass.split(" "),
    kick: s.kick.split(" "), snare: s.snare.split(" "), hat: s.hat.split(" ") }));

  let ctx = null, master = null, noise = null, bus = null, echoIn = null;
  let timer = 0, song = 0, step = 0, nextTime = 0, volume = 60;

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const degree = (s, d) => s.root + 12 * Math.floor(d / 7) + s.scale[((d % 7) + 7) % 7];

  function setup() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain();
    master.connect(comp).connect(ctx.destination);
    applyVolume();
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function applyVolume() {
    if (master) master.gain.setTargetAtTime(Math.pow(volume / 100, 2) * 0.6, ctx.currentTime, 0.03);
  }

  function voice(freq, t, dur, type, gain, dest, vibrato) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (vibrato && dur > 0.2) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = freq * 0.012;
      lfo.connect(lg).connect(o.frequency); lfo.start(t + 0.12); lfo.stop(t + dur + 0.2);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.setTargetAtTime(gain * 0.65, t + 0.006, 0.09);
    g.gain.setTargetAtTime(0, t + dur, 0.03);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.2);
  }
  function hit(t, filter, freq, gain, decay) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise; f.type = filter; f.frequency.value = freq;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + decay);
    src.connect(f).connect(g).connect(bus);
    src.start(t); src.stop(t + decay + 0.02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.22);
  }

  // Length of the note starting at step i: until the next non-hold token.
  function holdSteps(tokens, i) { let n = 1; while (i + n < tokens.length && tokens[i + n] === ".") n++; return n; }

  function schedule(st, t) {
    const s = SONGS[song], sd = 60 / s.bpm / 4;
    const bar = Math.floor(st / 16) % 4, i = st % 16, loop = Math.floor(st / 64);
    const chord = s.chords[bar];
    const breakdown = loop % 4 === 3;           // every fourth loop drops the lead
    const lift = loop % 2 === 1 ? 7 : 0;          // second time round, the lead goes up an octave

    const m = s.melody[bar][i];
    if (!breakdown && m !== "." && m !== "_") {
      voice(hz(degree(s, +m + lift) + 12), t, holdSteps(s.melody[bar], i) * sd * 0.92, s.lead, s.leadGain, s.echo ? echoIn : bus, s.vibrato);
    }
    const b = s.bass[i];
    if (b !== "." && b !== "_") {
      const deg = chord + (b === "F" ? 4 : 0);
      voice(hz(degree(s, deg) - 12 + (b === "O" ? 12 : 0)), t, holdSteps(s.bass, i) * sd * 0.9, "triangle", 0.32, bus);
    }
    // soft arpeggio on chord tones, every other 16th
    if (i % 2 === 0) voice(hz(degree(s, chord + [0, 2, 4, 7][(i / 2) % 4])), t, sd * 1.4, s.arp, breakdown ? 0.07 : 0.035, bus);

    if (s.kick[i] === "x") kick(t);
    if (s.snare[i] === "x") { hit(t, "bandpass", 1800, 0.38, 0.13); voice(190, t, 0.04, "triangle", 0.12, bus); }
    if (s.hat[i] === "x") hit(t, "highpass", 8000, s.hat.every((h) => h === "x") ? 0.06 : 0.11, 0.035);
  }

  function tick() {
    const sd = 60 / SONGS[song].bpm / 4;
    while (nextTime < ctx.currentTime + 0.12) { schedule(step, nextTime); nextTime += sd; step++; }
  }

  function stopBus() {
    clearInterval(timer); timer = 0;
    if (!bus) return;
    const old = bus, oldEcho = echoIn;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    setTimeout(() => { old.disconnect(); oldEcho && oldEcho.disconnect(); }, 400);
    bus = echoIn = null;
  }

  window.LacyChip = {
    play(i, fromStep = 0) {
      setup();
      if (navigator.audioSession) { try { navigator.audioSession.type = "playback"; } catch {} }  // iOS: play even with the ringer off
      ctx.resume();
      stopBus();
      song = i; step = fromStep;
      bus = ctx.createGain(); bus.connect(master);
      if (SONGS[song].echo) {
        echoIn = ctx.createGain(); echoIn.connect(bus);
        const dl = ctx.createDelay(1), fb = ctx.createGain();
        dl.delayTime.value = (60 / SONGS[song].bpm) * 0.75; fb.gain.value = 0.32;
        echoIn.connect(dl); dl.connect(fb).connect(dl); dl.connect(bus);
      }
      nextTime = ctx.currentTime + 0.06;
      timer = setInterval(tick, 25); tick();
    },
    pause() { if (ctx) stopBus(); return step; },
    setVolume(v) { volume = v; applyVolume(); },
    suspend() { ctx && ctx.suspend(); },
    resume() { ctx && ctx.resume(); },
    get step() { return step; },
  };
})();
