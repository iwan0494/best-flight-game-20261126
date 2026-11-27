// Langit Nusantara — arcade flight model: throttle, pitch, banked turns,
// stall, fuel burn, wind drift, terrain/water collision, ring passes and
// runway landings. Pure numbers in, events out; no rendering here.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function createState() {
    var r = LN.Terrain.runway;
    return {
      x: r.x, y: r.alt + 3, z: r.z,
      yaw: LN.deg2rad(r.headingDeg),
      pitch: 0, roll: 0,
      speed: 0, throttle: 0,
      fuel: 100, damage: 0,
      vy: 0, airborne: false, onGround: true, _bounceGuard: 0,
      score: 0, ringsPassed: 0,
      flying: false, crashed: false, landed: false, finished: false
    };
  }

  function forwardVector(state) {
    return {
      x: Math.sin(state.yaw) * Math.cos(state.pitch),
      y: Math.sin(state.pitch),
      z: Math.cos(state.yaw) * Math.cos(state.pitch)
    };
  }

  function isOverRunway(state) {
    var r = LN.Terrain.runway;
    var rx = state.x - r.x, rz = state.z - r.z;
    // Same frame as terrain.js: along runs with the runway heading.
    var sh = Math.sin(LN.deg2rad(r.headingDeg));
    var ch = Math.cos(LN.deg2rad(r.headingDeg));
    var along = rx * sh + rz * ch;
    var across = rx * ch - rz * sh;
    return Math.abs(along) < r.length / 2 && Math.abs(across) < r.width / 2 + 6;
  }

  // input: {pitchIn, rollIn, yawIn, throttleDelta} in [-1, 1].
  // world: {rings, wind}. Returns an array of event strings for this step.
  function updatePhysics(state, input, dt, world) {
    var cfg = LN.CONFIG;
    var events = [];
    if (!state.flying || state.crashed || state.finished) return events;

    // Throttle and fuel.
    state.throttle = LN.clamp(state.throttle + input.throttleDelta * dt * 0.55, 0, 1);
    if (state.fuel <= 0) state.throttle = 0;
    state.fuel = Math.max(0, state.fuel - state.throttle * cfg.fuelBurn * dt);

    // Speed chases the throttle target; drag grows with the square of speed.
    var targetSpeed = cfg.minSpeed + state.throttle * (cfg.maxSpeed - cfg.minSpeed);
    var drag = 1 + (state.speed / cfg.maxSpeed) * 0.8;
    var dv = LN.clamp(targetSpeed - state.speed, -cfg.accel * drag * dt, cfg.accel * dt);
    state.speed = Math.max(0, state.speed + dv);

    // Ground roll: braking, taxiing and takeoff rotation. Touchdown is only
    // judged on the moment of contact, never twice.
    if (state.onGround) {
      var groundNow = LN.Terrain.heightAt(state.x, state.z);
      state.y = groundNow + 1.9;
      // Rolling off the pad into the sea is a ditch, not a taxiway.
      if (groundNow <= 0.5 && state.speed > 6) {
        state.crashed = true;
        state.flying = false;
        state.damage = 100;
        events.push('ditch');
        return events;
      }
      if (state.throttle > 0.55) {
        state.speed = Math.min(state.speed + cfg.accel * dt, targetSpeed);
      } else {
        state.speed = Math.max(0, state.speed - 14 * dt);
      }
      state.yaw += input.yawIn * cfg.rudderRate * 0.4 * dt;
      state.pitch = 0;
      state.roll *= 0.9;
      if (state.speed > 34 && input.pitchIn > 0.3) {
        state.onGround = false;
        state.vy = 2;
        // Rotate with a positive pitch so the first airborne frame climbs
        // clear of the runway instead of re-triggering touchdown.
        state.pitch = 0.15;
        state._bounceGuard = 5;
      }
      // Roll forward along the runway while taxiing.
      var gf = forwardVector(state);
      state.x += gf.x * state.speed * dt;
      state.z += gf.z * state.speed * dt;
      return events;
    }

    // Attitude: pitch and roll chase the pilot's input, roll auto-levels.
    var targetPitch = LN.clamp(input.pitchIn, -1, 1) * cfg.maxPitch;
    var targetRoll = LN.clamp(input.rollIn, -1, 1) * cfg.maxRoll;
    var pr = cfg.pitchRate * dt, rr = cfg.rollRate * dt;
    state.pitch += LN.clamp(targetPitch - state.pitch, -pr, pr);
    if (input.rollIn === 0) targetRoll = 0;
    state.roll += LN.clamp(targetRoll - state.roll, -rr, rr);

    // Banked turn plus rudder.
    state.yaw += (-state.roll * cfg.turnFromBank + input.yawIn * cfg.rudderRate) * dt;

    // Climb from pitch; stall sinks the nose when too slow.
    state.vy = Math.sin(state.pitch) * state.speed;
    if (state.speed < cfg.stallSpeed) {
      state.vy -= (cfg.stallSpeed - state.speed) * 0.4;
      if (!state._stallWarned) { events.push('stall'); state._stallWarned = true; }
    } else {
      state._stallWarned = false;
    }

    // Wind drift (mission 3 crosswind).
    var fwd = forwardVector(state);
    state.x += (fwd.x * state.speed + world.wind.x) * dt;
    state.y += state.vy * dt;
    state.z += (fwd.z * state.speed + world.wind.z) * dt;

    // Leaving the chart: warn and gently push the heading home.
    var distC = Math.sqrt(state.x * state.x + state.z * state.z);
    if (distC > cfg.worldRadius) {
      events.push('offchart');
      var homeYaw = Math.atan2(-state.x, -state.z);
      var dy = homeYaw - state.yaw;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      state.yaw += LN.clamp(dy, -0.5 * dt, 0.5 * dt);
    }

    // Rings: pass within the hoop to score.
    for (var i = 0; i < world.rings.length; i++) {
      var ring = world.rings[i];
      if (ring.passed) continue;
      var dx = state.x - ring.x, dy = state.y - ring.y, dz = state.z - ring.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < ring.radius * 0.85) {
        ring.passed = true;
        state.ringsPassed += 1;
        state.score += 100;
        events.push('ring');
      }
    }

    // Touchdown: judged once, on the moment of contact. The bounce guard
    // skips the first frames after rotation so a fresh takeoff is never
    // scored as a second landing.
    if (state._bounceGuard > 0) state._bounceGuard -= 1;
    var ground = LN.Terrain.heightAt(state.x, state.z);
    if (state._bounceGuard <= 0 && state.y <= ground + 1.9) {
      state.y = ground + 1.9;
      var gentle = state.vy > -cfg.crashDescent && state.speed < cfg.landingMaxSpeed;
      if (isOverRunway(state) && gentle && state.speed > 12) {
        state.onGround = true;
        state.landed = true;
        state.flying = false;
        state.score += 250 + Math.round(state.speed);
        events.push('landed');
      } else if (state.speed > 6 || state.vy < -cfg.crashDescent) {
        state.crashed = true;
        state.flying = false;
        state.damage = 100;
        events.push(state.y <= 1 && ground <= 0.5 ? 'ditch' : 'crash');
      } else {
        state.onGround = true;
        state.landed = true;
        state.flying = false;
        events.push('roughland');
      }
    }
    state.airborne = state.y > ground + 8;
    return events;
  }

  LN.Physics = {
    createState: createState,
    forwardVector: forwardVector,
    isOverRunway: isOverRunway,
    update: updatePhysics
  };
})();
