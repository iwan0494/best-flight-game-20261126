// Langit Nusantara — entry point: renderer, lights, camera, game loop and
// the menu / playing / paused / game-over state machine. Wires every module.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  var canvas = document.getElementById('game-canvas');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 9000);

  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5a3a, 0.75);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2d0, 1.05);
  sun.position.set(800, 1200, 400);
  scene.add(sun);

  LN.Terrain.build(scene);
  var planeGroup = LN.Plane.build(scene);
  var missions = LN.Missions.create(scene);
  var audio = LN.Audio.create();
  var hud = LN.Hud.create();
  var input = LN.Input.create(canvas, {});

  var state = LN.Physics.createState();
  var viewMode = 'chase';
  var phase = 'menu'; // menu | playing | paused | over
  var shotMode = LN.Shots.read();
  var menuAngle = 0;

  function setView(mode) {
    viewMode = mode;
    // Cockpit view sits just above the nose: the cowl and propeller stay in
    // frame, the wing and canopy hide so they cannot block the sightline.
    LN.Plane.setCockpitView(planeGroup, mode === 'cockpit');
  }

  function setGoldenHour(on) {
    LN.Terrain.setGoldenHour(scene, on);
    sun.color.setHex(on ? 0xffc98a : 0xfff2d0);
    sun.position.set(on ? -900 : 800, on ? 500 : 1200, on ? -600 : 400);
    hemi.intensity = on ? 0.55 : 0.75;
  }

  function resetForMission(missionIndex, keepScore) {
    var score = keepScore ? state.score : 0;
    var def = missions.startMission(missionIndex);
    state = LN.Physics.createState();
    state.score = score;
    state.fuel = def.fuelStart;
    state.flying = true;
    phase = 'playing';
    hud.hideGameOver();
    hud.hideStart();
    hud.banner(def.name, def.briefing);
  }

  function startGame() {
    audio.start();
    audio.click();
    resetForMission(0, false);
  }

  function missionComplete() {
    var def = missions.current();
    state.score += def.reward;
    hud.banner('Misi selesai! +' + def.reward, def.name + ' — kontrak berikutnya menanti.');
    audio.chime();
    var next = missions.nextMission();
    if (next) {
      setTimeout(function () { if (phase === 'intermission') resetForMission(missions.index, true); }, 1800);
      phase = 'intermission';
      state.flying = false;
    } else {
      phase = 'over';
      state.flying = false;
      hud.showGameOver('KONTRAK SELESAI!', [
        'Semua kargo antar-pulau terkirim.',
        'Skor akhir: ' + state.score,
        'Tekan R untuk terbang lagi.'
      ]);
    }
  }

  function gameOver(title, lines) {
    phase = 'over';
    state.flying = false;
    audio.crash();
    hud.showGameOver(title, lines);
  }

  function handleEvents(events) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev === 'ring') {
        audio.chime();
        hud.message('Ring ' + state.ringsPassed + '/' + missions.ringCount() + ' — +100');
        if (missions.allRingsPassed()) {
          hud.banner('Semua ring dilewati!', 'Kembali dan mendarat di runway Pulau A.');
        }
      } else if (ev === 'landed') {
        audio.thud();
        if (missions.allRingsPassed()) {
          missionComplete();
        } else {
          state.fuel = 100;
          hud.banner('Mendarat — bahan bakar penuh', 'Lepas landas lagi dan lanjutkan misi.');
          state.flying = true;
          state.landed = false;
        }
      } else if (ev === 'roughland') {
        audio.thud();
        hud.message('Mendarat darurat di luar runway — pesawat selamat.');
        state.flying = true;
        state.landed = false;
      } else if (ev === 'crash') {
        gameOver('PESAWAT JATUH', ['Menabrak terrain di ' + Math.round(state.y) + ' m.', 'Skor: ' + state.score, 'Tekan R untuk coba lagi.']);
      } else if (ev === 'ditch') {
        gameOver('MENDARAT DI LAUT', ['Cendrawasih LNU mendarat di laut.', 'Skor: ' + state.score, 'Tekan R untuk coba lagi.']);
      } else if (ev === 'stall') {
        hud.message('STALL — tambah throttle!');
      } else if (ev === 'offchart') {
        hud.message('Keluar dari peta — balik ke kepulauan!');
      }
    }
  }

  function updateCamera(dt) {
    var fwd = LN.Physics.forwardVector(state);
    if (viewMode === 'cockpit') {
      // Over the nose: above the fuselage, a metre ahead of the wing, so the
      // cowl and propeller stay in the lower frame and the view ahead is clear.
      camera.position.set(
        state.x + fwd.x * 1.0,
        state.y + 1.9,
        state.z + fwd.z * 1.0
      );
      camera.lookAt(state.x + fwd.x * 120, state.y + fwd.y * 120 + 2, state.z + fwd.z * 120);
    } else {
      var want = {
        x: state.x - fwd.x * LN.CONFIG.cameraChaseDist - Math.cos(state.yaw) * 4.5,
        y: state.y + LN.CONFIG.cameraChaseHeight,
        z: state.z - fwd.z * LN.CONFIG.cameraChaseDist + Math.sin(state.yaw) * 4.5
      };
      // Snap when far away (view switch, restart, first frame) so the framing
      // is right even if only a few frames render before a screenshot.
      var cdx = want.x - camera.position.x;
      var cdy = want.y - camera.position.y;
      var cdz = want.z - camera.position.z;
      if (cdx * cdx + cdy * cdy + cdz * cdz > 900) {
        camera.position.set(want.x, want.y, want.z);
      } else {
        var k = 1 - Math.exp(-dt * 4.5);
        camera.position.x += cdx * k;
        camera.position.y += cdy * k;
        camera.position.z += cdz * k;
      }
      camera.lookAt(state.x + fwd.x * 24, state.y + fwd.y * 24, state.z + fwd.z * 24);
    }
  }

  function updateMenuCamera(dt) {
    menuAngle += dt * 0.05;
    var r = LN.Terrain.runway;
    var cx = r.x + Math.sin(menuAngle) * 90;
    var cz = r.z + Math.cos(menuAngle) * 90;
    camera.position.set(cx, r.alt + 26, cz);
    camera.lookAt(r.x, r.alt + 4, r.z);
  }

  var clock = new THREE.Clock();
  var hudView = { name: 'Misi 1 — Latihan Ring', objectiveText: '', timeLeft: null };

  function frame() {
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);
    LN.Terrain.update(dt);

    if (phase === 'menu') {
      updateMenuCamera(dt);
      LN.Plane.posePlane(planeGroup, state);
      LN.Plane.spinPropeller(planeGroup, dt, 0);
    } else if (phase === 'shot') {
      // Frozen staged frame for screenshots: camera settles, plane holds pose.
      LN.Plane.posePlane(planeGroup, state);
      LN.Plane.spinPropeller(planeGroup, dt, state.speed);
      updateCamera(dt);
      hudView.name = missions.current().name;
      hudView.objectiveText = missions.objectiveText(state);
      hudView.timeLeft = missions.timeLeft;
      hud.update(state, hudView, viewMode);
    } else if (phase === 'playing') {
      // Edge-triggered keys.
      if (input.consumePressed('KeyC')) setView(viewMode === 'chase' ? 'cockpit' : 'chase');
      if (input.consumePressed('KeyP')) { phase = 'paused'; hud.showPause(); }
      if (input.consumePressed('KeyM')) {
        var m = audio.toggleMute();
        hud.message(m ? 'Suara mati' : 'Suara hidup');
      }
      if (input.consumePressed('KeyR')) resetForMission(missions.index, true);

      var events = LN.Physics.update(state, input.controlVector(), dt, missions.world);
      handleEvents(events);
      var timeout = missions.update(dt, state);
      if (timeout === 'timeout') {
        gameOver('WAKTU HABIS', ['Kargo tidak sampai tepat waktu.', 'Skor: ' + state.score, 'Tekan R untuk coba lagi.']);
      }
      LN.Plane.posePlane(planeGroup, state);
      LN.Plane.spinPropeller(planeGroup, dt, state.speed);
      updateCamera(dt);
      audio.setEngine(state.throttle, state.speed, state.flying);
      hudView.name = missions.current().name;
      hudView.objectiveText = missions.objectiveText(state);
      hudView.timeLeft = missions.timeLeft;
      hud.update(state, hudView, viewMode);
    } else if (phase === 'paused') {
      if (input.consumePressed('KeyP')) { phase = 'playing'; hud.hidePause(); }
      if (input.consumePressed('KeyR')) resetForMission(missions.index, true);
    } else if (phase === 'over' || phase === 'intermission') {
      LN.Plane.posePlane(planeGroup, state);
      updateCamera(dt);
      if (input.consumePressed('KeyR')) resetForMission(phase === 'over' ? 0 : missions.index, phase === 'over' ? false : true);
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.getElementById('start-button').addEventListener('click', startGame);
  document.getElementById('retry-button').addEventListener('click', function () {
    audio.click();
    resetForMission(0, false);
  });
  document.getElementById('resume-button').addEventListener('click', function () {
    phase = 'playing';
    hud.hidePause();
  });

  // Boot.
  missions.startMission(0);
  hud.update(state, hudView, viewMode);
  if (shotMode) {
    LN.Shots.apply(shotMode, {
      state: state, missions: missions,
      setView: setView, setGoldenHour: setGoldenHour,
      plane: planeGroup, hud: hud
    });
    phase = 'shot';
    state.flying = true;
    state.airborne = true;
  } else {
    hud.showStart();
  }
  frame();
})();
