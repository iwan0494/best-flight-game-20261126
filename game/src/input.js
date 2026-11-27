// Langit Nusantara — keyboard and mouse input. W/S throttle, arrows pitch
// and roll, A/D rudder, mouse drag steers, Space airbrake, C camera, P pause,
// R restart, M mute. Exposes a per-frame control vector for the physics.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function createInput(canvas, hooks) {
    var keys = {};
    var mouse = { down: false, dx: 0, dy: 0, x: 0.5, y: 0.5 };
    var pressed = {}; // edge-triggered keys, consumed by the main loop

    function keyOf(e) { return e.code; }

    window.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
      if (hooks.onKey) hooks.onKey(e.code);
    });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () { for (var k in keys) keys[k] = false; mouse.down = false; });

    canvas.addEventListener('mousedown', function (e) { mouse.down = true; mouse.dx = 0; mouse.dy = 0; });
    window.addEventListener('mouseup', function () { mouse.down = false; });
    window.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / Math.max(1, r.width);
      mouse.y = (e.clientY - r.top) / Math.max(1, r.height);
      if (mouse.down) {
        mouse.dx += e.movementX || 0;
        mouse.dy += e.movementY || 0;
      }
    });

    function controlVector() {
      var pitchIn = 0, rollIn = 0, yawIn = 0, throttleDelta = 0;
      if (keys.ArrowUp) pitchIn += 1;
      if (keys.ArrowDown) pitchIn -= 1;
      if (keys.ArrowLeft) rollIn -= 1;
      if (keys.ArrowRight) rollIn += 1;
      if (keys.KeyA) yawIn -= 1;
      if (keys.KeyD) yawIn += 1;
      if (keys.KeyW) throttleDelta += 1;
      if (keys.KeyS) throttleDelta -= 1;
      if (keys.Space) throttleDelta -= 1.6; // airbrake
      // Mouse drag steers: drag left/right to bank, up/down to pitch.
      if (mouse.down) {
        rollIn += LN.clamp(mouse.dx / 160, -1, 1);
        pitchIn -= LN.clamp(mouse.dy / 160, -1, 1);
        mouse.dx *= 0.86;
        mouse.dy *= 0.86;
      }
      return {
        pitchIn: LN.clamp(pitchIn, -1, 1),
        rollIn: LN.clamp(rollIn, -1, 1),
        yawIn: LN.clamp(yawIn, -1, 1),
        throttleDelta: throttleDelta
      };
    }

    return {
      keys: keys,
      mouse: mouse,
      controlVector: controlVector,
      consumePressed: function consumePressed(code) {
        var v = !!pressed[code];
        pressed[code] = false;
        return v;
      },
      clearPressed: function clearPressed() { for (var k in pressed) pressed[k] = false; }
    };
  }

  LN.Input = { create: createInput };
})();
