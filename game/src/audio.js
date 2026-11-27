// Langit Nusantara — all sound is synthesised live with WebAudio: engine
// hum, wind, ring chimes, touchdown thuds and crash noise. No audio files.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function createAudio() {
    var ctx = null, master = null, engineOsc = null, engineOsc2 = null;
    var engineGain = null, engineFilter = null, windGain = null, windSrc = null;
    var muted = false, started = false;

    function ensure() {
      if (ctx) return;
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
        // Engine: two detuned saws through a lowpass.
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;
        engineOsc2 = ctx.createOscillator();
        engineOsc2.type = 'square';
        engineOsc2.frequency.value = 82;
        engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 320;
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineFilter);
        engineOsc2.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
        engineOsc2.start();
        // Wind: looped noise through a bandpass.
        var len = ctx.sampleRate * 2;
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var data = buf.getChannelData(0);
        for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        windSrc = ctx.createBufferSource();
        windSrc.buffer = buf;
        windSrc.loop = true;
        var windFilter = ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 500;
        windGain = ctx.createGain();
        windGain.gain.value = 0;
        windSrc.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(master);
        windSrc.start();
        started = true;
      } catch (e) {
        ctx = null;
      }
    }

    function tone(freq, dur, type, vol, when) {
      if (!ctx || muted) return;
      var t0 = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol || 0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    }

    function noiseBurst(dur, vol, freq) {
      if (!ctx || muted) return;
      var t0 = ctx.currentTime;
      var len = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = freq || 800;
      var g = ctx.createGain();
      g.gain.value = vol || 0.5;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t0);
    }

    return {
      start: function startAudio() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
      isStarted: function () { return started; },
      setEngine: function setEngine(throttle, speed, flying) {
        if (!ctx || muted) return;
        var t = ctx.currentTime;
        engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.25, t, 0.1);
        engineOsc2.frequency.setTargetAtTime(72 + throttle * 105 + speed * 0.4, t, 0.1);
        engineGain.gain.setTargetAtTime(flying ? 0.05 + throttle * 0.10 : 0.03 + throttle * 0.05, t, 0.15);
        engineFilter.frequency.setTargetAtTime(280 + throttle * 700, t, 0.1);
        windGain.gain.setTargetAtTime(LN.clamp(speed / 95, 0, 1) * 0.12, t, 0.2);
      },
      chime: function chime() { tone(880, 0.25, 'sine', 0.3); tone(1318, 0.35, 'sine', 0.25, 0.09); },
      thud: function thud() { noiseBurst(0.25, 0.5, 300); tone(90, 0.3, 'sine', 0.4); },
      crash: function crash() { noiseBurst(0.9, 0.8, 500); tone(55, 0.9, 'sawtooth', 0.3); },
      click: function click() { tone(660, 0.08, 'square', 0.12); },
      toggleMute: function toggleMute() {
        muted = !muted;
        if (master) master.gain.value = muted ? 0 : 0.5;
        return muted;
      },
      isMuted: function () { return muted; }
    };
  }

  LN.Audio = { create: createAudio };
})();
