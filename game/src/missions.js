// Langit Nusantara — the courier contracts: ring courses between islands,
// delivery timers, crosswind landings, scoring and mission flow.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  // Ring courses: waypoints the rings hang on, per mission. The training
  // course loops around the home island, starting just ahead of the runway.
  var COURSES = {
    rings: [
      { x: 150, y: 95, z: 550 },
      { x: 450, y: 110, z: 700 },
      { x: 700, y: 100, z: 500 },
      { x: 500, y: 120, z: 150 },
      { x: 150, y: 90, z: -150 }
    ],
    cargo: [
      { x: 500, y: 100, z: -500 },
      { x: 900, y: 130, z: -750 },
      { x: 1150, y: 90, z: -780 }
    ],
    storm: [
      { x: -500, y: 110, z: -600 },
      { x: -1050, y: 120, z: -950 }
    ]
  };

  function createMissions(scene) {
    var ringGroup = new THREE.Group();
    ringGroup.name = 'rings';
    scene.add(ringGroup);
    var ringMeshes = [];
    var index = 0;
    var timeLeft = null;
    var world = { rings: [], wind: { x: 0, z: 0 } };

    function clearRings() {
      while (ringGroup.children.length) ringGroup.remove(ringGroup.children[0]);
      ringMeshes = [];
      world.rings = [];
    }

    function spawnRings(course) {
      clearRings();
      for (var i = 0; i < course.length; i++) {
        var wp = course[i];
        var ring = { x: wp.x, y: wp.y, z: wp.z, radius: 20, passed: false };
        world.rings.push(ring);
        var mesh = new THREE.Mesh(
          new THREE.TorusGeometry(20, 1.8, 12, 40),
          new THREE.MeshBasicMaterial({ color: LN.CONFIG.ringColor })
        );
        mesh.position.set(wp.x, wp.y, wp.z);
        // Face the ring along the course direction.
        var next = course[Math.min(i + 1, course.length - 1)];
        var prev = course[Math.max(i - 1, 0)];
        var dx = next.x - prev.x, dz = next.z - prev.z;
        mesh.rotation.y = Math.atan2(dx, dz);
        mesh.userData.ring = ring;
        ringGroup.add(mesh);
        ringMeshes.push(mesh);
      }
    }

    function current() { return LN.MISSIONS[index]; }

    function startMission(i) {
      index = i;
      var def = LN.MISSIONS[i];
      timeLeft = def.timeLimit > 0 ? def.timeLimit : null;
      world.wind = { x: def.wind.x, z: def.wind.z };
      spawnRings(COURSES[def.id]);
      return def;
    }

    function nextMission() {
      if (index + 1 < LN.MISSIONS.length) return startMission(index + 1);
      return null;
    }

    function update(dt, state) {
      if (timeLeft != null) {
        timeLeft -= dt;
        if (timeLeft <= 0 && state.flying) {
          timeLeft = 0;
          return 'timeout';
        }
      }
      // Pulse the next unpassed ring so the pilot can find it.
      for (var i = 0; i < ringMeshes.length; i++) {
        var mesh = ringMeshes[i];
        if (!mesh.userData.ring.passed) {
          var s = 1 + Math.sin(performance.now() / 300) * 0.06;
          mesh.scale.set(s, s, s);
          mesh.material.color.setHex(0xff9f1c);
        } else {
          mesh.material.color.setHex(0x37c978);
          mesh.scale.set(1, 1, 1);
        }
      }
      return null;
    }

    function allRingsPassed() {
      return world.rings.length > 0 && world.rings.every(function (r) { return r.passed; });
    }

    function objectiveText(state) {
      var def = current();
      var done = state.ringsPassed;
      var total = world.rings.length;
      if (def.id === 'cargo') return 'Lewati ' + done + '/' + total + ' ring, lalu kembali mendarat di runway Pulau A sebelum waktu habis.';
      if (def.id === 'storm') return 'Lewati ' + done + '/' + total + ' ring, lalu mendarat di runway Pulau A.';
      return 'Lewati ' + done + '/' + total + ' ring menuju Pulau A.';
    }

    return {
      world: world,
      current: current,
      startMission: startMission,
      nextMission: nextMission,
      update: update,
      allRingsPassed: allRingsPassed,
      objectiveText: objectiveText,
      get timeLeft() { return timeLeft; },
      get index() { return index; },
      ringCount: function () { return world.rings.length; }
    };
  }

  LN.Missions = { create: createMissions };
})();
