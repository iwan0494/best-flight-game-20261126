// Langit Nusantara — deterministic screenshot staging. ?shot=cover|cockpit|
// rings|landing puts the plane, camera, mission and light in a fixed,
// repeatable state so the four screenshots are real renders of the game.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function readShot() {
    var q = new URLSearchParams(window.location.search);
    return q.get('shot') || null;
  }

  // ctx: {state, missions, setView, setGoldenHour, plane, hud}
  function applyShot(name, ctx) {
    var state = ctx.state;
    var r = LN.Terrain.runway;
    state.flying = true;
    state.crashed = false;
    state.landed = false;
    ctx.setGoldenHour(false);

    if (name === 'cockpit') {
      ctx.missions.startMission(0);
      state.x = 100; state.y = 100; state.z = 380;
      state.yaw = LN.deg2rad(13); state.pitch = 0.04; state.roll = -0.06;
      state.speed = 62; state.throttle = 0.72; state.fuel = 88;
      state.score = 100; state.ringsPassed = 1;
      ctx.missions.world.rings[0].passed = true;
      ctx.setView('cockpit');
      return true;
    }
    if (name === 'rings') {
      ctx.missions.startMission(0);
      state.x = 620; state.y = 105; state.z = 420;
      state.yaw = LN.deg2rad(45); state.pitch = 0.02; state.roll = 0.5;
      state.speed = 71; state.throttle = 0.8; state.fuel = 76;
      state.score = 200; state.ringsPassed = 2;
      ctx.missions.world.rings[0].passed = true;
      ctx.missions.world.rings[1].passed = true;
      ctx.setView('chase');
      return true;
    }
    if (name === 'landing') {
      ctx.missions.startMission(2);
      var a = LN.deg2rad(r.headingDeg);
      // TRY 2 (restage): touchdown close-up — plane 80 m before the runway
      // centre (50 m past the threshold), 10 m over the strip, level, slow,
      // chase camera low and close behind. The frame should be runway +
      // plane; the 115 m peak sits ~97 deg off-axis, out of frame, and the
      // low hills past the far threshold read as a green backdrop, not a slab.
      state.x = r.x - Math.sin(a) * 80;
      state.y = r.alt + 10;
      state.z = r.z - Math.cos(a) * 80;
      state.yaw = LN.deg2rad(r.headingDeg); state.pitch = -0.02; state.roll = 0.02;
      state.speed = 32; state.throttle = 0.18; state.fuel = 41;
      state.score = 1450; state.ringsPassed = 2;
      ctx.missions.world.rings[0].passed = true;
      ctx.missions.world.rings[1].passed = true;
      ctx.setView('chase');
      ctx.setGoldenHour(true);
      return true;
    }
    // Default: cover — chase view over the archipelago, runway and rings ahead.
    ctx.missions.startMission(0);
    state.x = 120; state.y = 130; state.z = 420;
    state.yaw = LN.deg2rad(18); state.pitch = 0.02; state.roll = 0.12;
    state.speed = 58; state.throttle = 0.68; state.fuel = 92;
    state.score = 0; state.ringsPassed = 0;
    ctx.setView('chase');
    return true;
  }

  LN.Shots = { read: readShot, apply: applyShot };
})();
