// Langit Nusantara — Island Courier: shared tuning, colours and mission data.
// Every number that shapes how the game feels lives here, so one file tunes it.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  LN.CONFIG = {
    worldRadius: 2600,
    seaLevel: 0,
    maxSpeed: 95, // m/s at full throttle
    minSpeed: 8,
    stallSpeed: 24,
    accel: 14, // m/s^2 towards target speed
    pitchRate: 0.85, // rad/s towards target pitch
    maxPitch: 0.62,
    rollRate: 1.9, // rad/s towards target roll
    maxRoll: 1.15,
    turnFromBank: 0.55, // yaw rad/s per rad of bank
    rudderRate: 0.45,
    autoLevel: 0.9,
    fuelCapacity: 100,
    fuelBurn: 0.5, // per second at full throttle
    lowFuelWarn: 25,
    crashDescent: 7, // m/s: harder than this on touchdown is a crash
    landingMaxSpeed: 58,
    cameraChaseDist: 22,
    cameraChaseHeight: 6.5,
    skyTop: 0x2f6fb4,
    skyHorizon: 0xbfe3f0,
    fogColor: 0xbfd9e8,
    seaColor: 0x1d6f8e,
    sandColor: 0xe8d29a,
    grassColor: 0x4d8a3f,
    jungleColor: 0x2f6b2a,
    rockColor: 0x7a6a58,
    ringColor: 0xff9f1c,
    planeWhite: 0xf4f1e8,
    planeTeal: 0x0e7c7b,
    planeOrange: 0xff7a1a
  };

  // Deterministic random: the same seed always builds the same archipelago,
  // so screenshots and playtests are repeatable.
  LN.mulberry32 = function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  LN.clamp = function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };
  LN.lerp = function lerp(a, b, t) { return a + (b - a) * t; };
  LN.deg2rad = function deg2rad(d) { return d * Math.PI / 180; };
  LN.rad2deg = function rad2deg(r) { return r * 180 / Math.PI; };

  // Smooth hash-based value noise in 2D (deterministic, no Math.random).
  LN.valueNoise2D = function valueNoise2D(x, z) {
    function hash(ix, iz) {
      var s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453;
      return s - Math.floor(s);
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var a = hash(ix, iz), b = hash(ix + 1, iz);
    var c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    var u = smooth(fx), v = smooth(fz);
    return LN.lerp(LN.lerp(a, b, u), LN.lerp(c, d, u), v);
  };

  // The three courier contracts. Each has a different goal, so each sortie
  // asks the pilot for a different kind of flying.
  LN.MISSIONS = [
    {
      id: 'rings',
      name: 'Misi 1 — Latihan Ring',
      briefing: 'Lewati 5 ring menuju Pulau A. Terbang stabil, jangan buru-buru.',
      rings: 5,
      timeLimit: 0,
      fuelStart: 100,
      wind: { x: 0, z: 0 },
      reward: 500
    },
    {
      id: 'cargo',
      name: 'Misi 2 — Kargo Kilat',
      briefing: 'Antar kargo ke Pulau B sebelum waktu habis. Bahan bakar pas-pasan — hemat throttle.',
      rings: 3,
      timeLimit: 150,
      fuelStart: 62,
      wind: { x: 4, z: -2 },
      reward: 800
    },
    {
      id: 'storm',
      name: 'Misi 3 — Badai Senja',
      briefing: 'Angin kencang dari samping. Mendarat kembali di runway Pulau A — halus atau tidak sama sekali.',
      rings: 2,
      timeLimit: 0,
      fuelStart: 80,
      wind: { x: -9, z: 5 },
      reward: 1200
    }
  ];
})();
