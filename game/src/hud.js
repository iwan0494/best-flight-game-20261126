// Langit Nusantara — the cockpit: lit instruments and HUD. Altitude, speed
// and heading are always on screen; the artificial horizon, compass tape,
// throttle and fuel gauges look flown, not drawn. All DOM, updated per frame.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function el(id) { return document.getElementById(id); }

  function createHud() {
    var horizon = el('horizon');
    var hctx = horizon.getContext('2d');
    var msgTimer = null;
    var bannerTimer = null;

    function pad(n, w) {
      var s = String(n);
      while (s.length < w) s = '0' + s;
      return s;
    }

    function drawHorizon(roll, pitch) {
      var W = horizon.width, H = horizon.height;
      var cx = W / 2, cy = H / 2;
      hctx.save();
      hctx.clearRect(0, 0, W, H);
      hctx.beginPath();
      hctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
      hctx.clip();
      hctx.translate(cx, cy);
      hctx.rotate(roll);
      var py = LN.clamp(pitch, -0.6, 0.6) / 0.6 * (H * 0.35);
      hctx.fillStyle = '#2f6fb4';
      hctx.fillRect(-W, -H - py, W * 2, H + py);
      hctx.fillStyle = '#7a5a34';
      hctx.fillRect(-W, -py, W * 2, H + py);
      hctx.strokeStyle = '#ffffff';
      hctx.lineWidth = 2;
      hctx.beginPath();
      hctx.moveTo(-W, -py); hctx.lineTo(W, -py);
      hctx.stroke();
      hctx.restore();
      // Fixed aircraft symbol.
      hctx.strokeStyle = '#ffe9a8';
      hctx.lineWidth = 3;
      hctx.beginPath();
      hctx.moveTo(cx - 26, cy); hctx.lineTo(cx - 8, cy);
      hctx.moveTo(cx + 8, cy); hctx.lineTo(cx + 26, cy);
      hctx.moveTo(cx, cy); hctx.lineTo(cx, cy + 6);
      hctx.stroke();
      // Rim and glow.
      hctx.strokeStyle = '#0e7c7b';
      hctx.lineWidth = 4;
      hctx.beginPath();
      hctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
      hctx.stroke();
    }

    function compassStrip(headingDeg) {
      var pts = [];
      for (var d = -60; d <= 60; d += 30) {
        var h = Math.round((headingDeg + d + 360) % 360);
        var label = h % 90 === 0 ? ['N', 'E', 'S', 'W'][Math.round(h / 90) % 4] : String(h);
        pts.push({ off: d, label: label, major: h % 90 === 0 });
      }
      return pts;
    }

    function update(state, mission, viewMode) {
      var cfg = LN.CONFIG;
      var altM = Math.max(0, Math.round(state.y - LN.Terrain.heightAt(state.x, state.z)));
      var altAbs = Math.round(state.y);
      el('hud-alt').textContent = pad(altAbs, 4);
      el('hud-spd').textContent = String(Math.round(state.speed * 1.94));
      var hdg = Math.round(((LN.rad2deg(state.yaw) % 360) + 360) % 360);
      el('hud-hdg').textContent = pad(hdg, 3);
      el('hud-agl').textContent = altM + ' m AGL';
      el('hud-thr').textContent = Math.round(state.throttle * 100) + '%';
      el('thr-val').textContent = Math.round(state.throttle * 100) + '%';
      el('hud-fuel').textContent = Math.round(state.fuel) + '%';
      el('hud-score').textContent = String(state.score);
      el('hud-view').textContent = viewMode === 'cockpit' ? 'COCKPIT' : 'CHASE';

      // Compass tape.
      var tape = el('compass-tape');
      var marks = compassStrip(hdg);
      var html = '';
      for (var i = 0; i < marks.length; i++) {
        var m = marks[i];
        html += '<span class="tick' + (m.major ? ' major' : '') + '" style="left:' + (50 + m.off * 0.55) + '%">' + m.label + '</span>';
      }
      tape.innerHTML = html;

      // Throttle + fuel bars.
      el('thr-fill').style.height = (state.throttle * 100) + '%';
      var fuelFill = el('fuel-fill');
      fuelFill.style.height = state.fuel + '%';
      fuelFill.className = 'fill' + (state.fuel < cfg.lowFuelWarn ? ' low' : '');
      el('fuel-label').textContent = state.fuel < cfg.lowFuelWarn ? 'FUEL LOW' : 'FUEL';

      // Artificial horizon + pitch ladder readout.
      drawHorizon(state.roll, state.pitch);
      el('hud-pitch').textContent = (state.pitch >= 0 ? '+' : '') + Math.round(LN.rad2deg(state.pitch)) + '°';
      el('hud-bank').textContent = (state.roll >= 0 ? 'R ' : 'L ') + Math.abs(Math.round(LN.rad2deg(state.roll))) + '°';

      // Objective line.
      if (mission) {
        el('objective-name').textContent = mission.name;
        el('objective-text').textContent = mission.objectiveText || '';
        el('objective-time').textContent = mission.timeLeft != null ? ('T-' + Math.max(0, Math.ceil(mission.timeLeft)) + 's') : '';
      }

      // Stall + off-chart warnings.
      el('warn-stall').style.display = (state.speed < cfg.stallSpeed && state.airborne) ? 'block' : 'none';
      el('warn-fuel').style.display = state.fuel < cfg.lowFuelWarn ? 'block' : 'none';
    }

    function banner(title, sub) {
      var b = el('banner');
      el('banner-title').textContent = title;
      el('banner-sub').textContent = sub || '';
      b.classList.add('show');
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function () { b.classList.remove('show'); }, 3600);
    }

    function message(text) {
      var m = el('message');
      m.textContent = text;
      m.classList.add('show');
      if (msgTimer) clearTimeout(msgTimer);
      msgTimer = setTimeout(function () { m.classList.remove('show'); }, 2200);
    }

    function show(id) { el(id).classList.add('show'); }
    function hide(id) { el(id).classList.remove('show'); }

    return {
      update: update,
      banner: banner,
      message: message,
      showStart: function () { show('start-screen'); },
      hideStart: function () { hide('start-screen'); },
      showPause: function () { show('pause-screen'); },
      hidePause: function () { hide('pause-screen'); },
      showGameOver: function (title, lines) {
        el('gameover-title').textContent = title;
        el('gameover-lines').innerHTML = lines.map(function (l) { return '<div>' + l + '</div>'; }).join('');
        show('gameover-screen');
      },
      hideGameOver: function () { hide('gameover-screen'); }
    };
  }

  LN.Hud = { create: createHud };
})();
