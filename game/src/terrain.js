// Langit Nusantara — the archipelago: procedural islands, sea, sky, clouds,
// runway, palms, village houses and a lighthouse. heightAt() is the single
// source of truth for terrain height, shared by the meshes and the physics.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  // Island table: position, radius, peak height, and what lives on it.
  var ISLANDS = [
    { x: 0, z: 0, radius: 620, height: 120, home: true, name: 'Pulau A' },
    { x: 1150, z: -780, radius: 480, height: 85, name: 'Pulau B' },
    { x: -1050, z: -950, radius: 520, height: 150, name: 'Pulau C' },
    { x: 900, z: 1050, radius: 380, height: 60, name: 'Pulau D' },
    { x: -1300, z: 850, radius: 300, height: 45, name: 'Pulau E' }
  ];

  // The home runway: a flat strip on Pulau A, heading north-east.
  var RUNWAY = { x: -80, z: 180, headingDeg: 35, length: 260, width: 26, alt: 9 };

  function islandProfile(island, dx, dz) {
    var d = Math.sqrt(dx * dx + dz * dz) / island.radius;
    if (d >= 1) return 0;
    // Smooth dome with a flattened top so peaks read as mountains, not spikes.
    var dome = Math.pow(Math.cos(d * Math.PI * 0.5), 1.4);
    var rough = 0.72 + 0.55 * LN.valueNoise2D(dx * 0.012 + 7, dz * 0.012 + 3);
    var h = island.height * dome * rough;
    // Beach shelf: keep the shoreline gentle.
    if (d > 0.82) h *= (1 - d) / 0.18 * 0.35 + 0.65 * ((1 - d) / 0.18);
    return Math.max(0, h);
  }

  function heightAt(x, z) {
    var h = 0;
    for (var i = 0; i < ISLANDS.length; i++) {
      var isl = ISLANDS[i];
      var hh = islandProfile(isl, x - isl.x, z - isl.z);
      if (hh > h) h = hh;
    }
    // Flatten the runway strip so landings are fair. along runs with the
    // runway heading (sinH, cosH), across is perpendicular to it.
    var rx = x - RUNWAY.x, rz = z - RUNWAY.z;
    var sh = Math.sin(LN.deg2rad(RUNWAY.headingDeg));
    var ch = Math.cos(LN.deg2rad(RUNWAY.headingDeg));
    var along = rx * sh + rz * ch;
    var across = rx * ch - rz * sh;
    // Fully flat across the whole strip, blending out over a 35% margin.
    var u = Math.abs(along) / (RUNWAY.length / 2);
    var v = Math.abs(across) / (RUNWAY.width / 2);
    var mm = Math.max(u, v);
    if (mm < 1.35) {
      var t = LN.clamp((mm - 1.0) / 0.35, 0, 1);
      h = Math.min(h, LN.lerp(RUNWAY.alt, h, t));
    }
    // Approach corridor: carve a gentle valley along the extended centreline
    // on the landing side, so a final approach can actually reach the runway
    // instead of meeting the island's dome. Reads as a cleared approach path.
    if (along < -RUNWAY.length / 2 && along > -RUNWAY.length / 2 - 520 && Math.abs(across) < 70) {
      var distPast = -RUNWAY.length / 2 - along; // 0 at the threshold, 520 far out
      var target = RUNWAY.alt + distPast * 0.10;
      var wAcross = LN.clamp((70 - Math.abs(across)) / 25, 0, 1);
      var wAlong = LN.clamp((520 - distPast) / 60, 0, 1);
      var w = Math.min(wAcross, wAlong);
      h = Math.min(h, LN.lerp(h, target, w));
    }
    return h;
  }

  function colorForHeight(h, nx, nz) {
    var c = LN.CONFIG;
    var n = LN.valueNoise2D(nx * 0.05, nz * 0.05);
    if (h < 2.5) return new THREE.Color(c.sandColor);
    if (h < 26) {
      var g = new THREE.Color(c.grassColor);
      if (n > 0.62) g.lerp(new THREE.Color(c.jungleColor), 0.7);
      return g;
    }
    if (h < 70) return new THREE.Color(c.jungleColor).lerp(new THREE.Color(c.grassColor), 0.4);
    return new THREE.Color(c.rockColor);
  }

  function buildIslandMesh(island) {
    var size = island.radius * 2.4;
    var seg = 56;
    var geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i) + island.x;
      var z = pos.getZ(i) + island.z;
      var h = islandProfile(island, x - island.x, z - island.z);
      // Sink the flat outer apron below sea level so it never z-fights the sea.
      pos.setY(i, h > 0 ? h : -2);
      pos.setX(i, x);
      pos.setZ(i, z);
      var col = colorForHeight(h, x, z);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    return mesh;
  }

  function buildSea(scene) {
    var geo = new THREE.PlaneGeometry(9000, 9000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    var sea = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
      color: LN.CONFIG.seaColor, shininess: 90, specular: 0x99ccdd
    }));
    sea.position.y = 0;
    scene.add(sea);
    // Pale foam rings where the sea meets each island.
    for (var i = 0; i < ISLANDS.length; i++) {
      var isl = ISLANDS[i];
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(isl.radius * 0.94, isl.radius * 1.04, 48),
        new THREE.MeshBasicMaterial({ color: 0xeaf6f2, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(isl.x, 0.4, isl.z);
      scene.add(ring);
    }
  }

  function buildSky(scene) {
    var skyGeo = new THREE.SphereGeometry(4200, 24, 14);
    var skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(LN.CONFIG.skyTop) },
        horizon: { value: new THREE.Color(LN.CONFIG.skyHorizon) }
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 horizon; void main(){ float h = normalize(vP).y; vec3 c = mix(horizon, top, smoothstep(0.0, 0.55, h)); gl_FragColor = vec4(c, 1.0); }'
    });
    var sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name = 'skyDome';
    scene.add(sky);
    scene.fog = new THREE.Fog(LN.CONFIG.fogColor, 900, 3900);
  }

  var clouds = [];
  function buildClouds(scene) {
    var rng = LN.mulberry32(20261126);
    var mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    for (var i = 0; i < 16; i++) {
      var group = new THREE.Group();
      var puffs = 3 + Math.floor(rng() * 3);
      for (var p = 0; p < puffs; p++) {
        var r = 18 + rng() * 26;
        var s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
        s.position.set((rng() - 0.5) * 90, (rng() - 0.5) * 12, (rng() - 0.5) * 40);
        s.scale.y = 0.45;
        group.add(s);
      }
      group.position.set((rng() - 0.5) * 4200, 260 + rng() * 160, (rng() - 0.5) * 4200);
      group.userData.drift = 1.5 + rng() * 2.5;
      clouds.push(group);
      scene.add(group);
    }
  }

  function buildRunway(scene) {
    var g = new THREE.Group();
    var strip = new THREE.Mesh(
      new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.length),
      new THREE.MeshLambertMaterial({ color: 0x3a3f45 })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = LN.deg2rad(RUNWAY.headingDeg);
    g.add(strip);
    // Centre dashes.
    for (var d = -RUNWAY.length / 2 + 15; d < RUNWAY.length / 2 - 10; d += 30) {
      var dash = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = LN.deg2rad(RUNWAY.headingDeg);
      var a = LN.deg2rad(RUNWAY.headingDeg);
      dash.position.set(Math.sin(a) * d, 0.15, Math.cos(a) * d);
      g.add(dash);
    }
    // Threshold bars at both ends.
    [-1, 1].forEach(function (s) {
      var bar = new THREE.Mesh(
        new THREE.PlaneGeometry(RUNWAY.width - 4, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 })
      );
      bar.rotation.x = -Math.PI / 2;
      bar.rotation.z = LN.deg2rad(RUNWAY.headingDeg);
      var a = LN.deg2rad(RUNWAY.headingDeg);
      bar.position.set(Math.sin(a) * s * (RUNWAY.length / 2 - 8), 0.15, Math.cos(a) * s * (RUNWAY.length / 2 - 8));
      g.add(bar);
    });
    // Windsock beside the strip.
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 9, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(RUNWAY.width / 2 + 8, 4.5, 0);
    g.add(pole);
    var sock = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 8), new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
    sock.rotation.z = Math.PI / 2;
    sock.position.set(RUNWAY.width / 2 + 11, 8.4, 0);
    sock.name = 'windsock';
    g.add(sock);
    g.position.set(RUNWAY.x, RUNWAY.alt + 0.2, RUNWAY.z);
    scene.add(g);
    return g;
  }

  function buildVegetation(scene) {
    var rng = LN.mulberry32(777);
    var trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
    var leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
    var roofMat = new THREE.MeshLambertMaterial({ color: 0xc25e3a });
    var wallMat = new THREE.MeshLambertMaterial({ color: 0xf2e8d5 });
    for (var i = 0; i < ISLANDS.length; i++) {
      var isl = ISLANDS[i];
      // Palm trees on the beach ring and low grass.
      for (var p = 0; p < 26; p++) {
        var ang = rng() * Math.PI * 2;
        var rr = isl.radius * (0.55 + rng() * 0.35);
        var px = isl.x + Math.cos(ang) * rr;
        var pz = isl.z + Math.sin(ang) * rr;
        var h = heightAt(px, pz);
        if (h < 2 || h > 30) continue;
        var palm = new THREE.Group();
        var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
        trunk.position.y = 4.5;
        trunk.rotation.z = (rng() - 0.5) * 0.25;
        palm.add(trunk);
        for (var f = 0; f < 5; f++) {
          var frond = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 4), leafMat);
          frond.position.y = 9.5;
          frond.rotation.z = Math.PI / 2.4;
          frond.rotation.y = (f / 5) * Math.PI * 2;
          frond.position.x = Math.cos((f / 5) * Math.PI * 2) * 2.2;
          frond.position.z = Math.sin((f / 5) * Math.PI * 2) * 2.2;
          palm.add(frond);
        }
        palm.position.set(px, h, pz);
        scene.add(palm);
      }
      // A small village of houses near the shore of the home island only.
      if (isl.home) {
        for (var v = 0; v < 9; v++) {
          var hx = isl.x + 150 + (v % 3) * 55 + rng() * 12;
          var hz = isl.z + 260 + Math.floor(v / 3) * 55 + rng() * 12;
          var hh = heightAt(hx, hz);
          var house = new THREE.Group();
          var walls = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 10), wallMat);
          walls.position.y = 3.5;
          house.add(walls);
          var roof = new THREE.Mesh(new THREE.ConeGeometry(9.5, 5, 4), roofMat);
          roof.position.y = 9.5;
          roof.rotation.y = Math.PI / 4;
          house.add(roof);
          house.position.set(hx, hh, hz);
          house.rotation.y = rng() * Math.PI;
          scene.add(house);
        }
        // Lighthouse on the northern point.
        var light = new THREE.Group();
        var tower = new THREE.Mesh(new THREE.CylinderGeometry(4, 5.5, 26, 10), new THREE.MeshLambertMaterial({ color: 0xf5f5f0 }));
        tower.position.y = 13;
        light.add(tower);
        var band = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 4, 10), new THREE.MeshLambertMaterial({ color: 0xd23c2e }));
        band.position.y = 18;
        light.add(band);
        var lamp = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
        lamp.position.y = 27.5;
        lamp.name = 'lighthouseLamp';
        light.add(lamp);
        var lx = isl.x - 40, lz = isl.z - 480;
        light.position.set(lx, heightAt(lx, lz), lz);
        scene.add(light);
      }
    }
  }

  function setGoldenHour(scene, on) {
    var sky = scene.getObjectByName('skyDome');
    if (!sky) return;
    if (on) {
      sky.material.uniforms.top.value.setHex(0x5a4a8a);
      sky.material.uniforms.horizon.value.setHex(0xffb36b);
      scene.fog.color.setHex(0xe8a06a);
    } else {
      sky.material.uniforms.top.value.setHex(LN.CONFIG.skyTop);
      sky.material.uniforms.horizon.value.setHex(LN.CONFIG.skyHorizon);
      scene.fog.color.setHex(LN.CONFIG.fogColor);
    }
    // Sunset backlights the clouds into dark slabs across the sky, so shrink
    // them, fade them and warm their tint; daylight restores the white puffs.
    var cloudMat = clouds.length && clouds[0].children[0] ? clouds[0].children[0].material : null;
    for (var i = 0; i < clouds.length; i++) clouds[i].scale.setScalar(on ? 0.5 : 1);
    if (cloudMat) {
      cloudMat.opacity = on ? 0.55 : 0.92;
      cloudMat.color.setHex(on ? 0xffd9b3 : 0xffffff);
    }
  }

  LN.Terrain = {
    islands: ISLANDS,
    runway: RUNWAY,
    heightAt: heightAt,
    build: function buildTerrain(scene) {
      for (var i = 0; i < ISLANDS.length; i++) scene.add(buildIslandMesh(ISLANDS[i]));
      buildSea(scene);
      buildSky(scene);
      buildClouds(scene);
      buildRunway(scene);
      buildVegetation(scene);
    },
    update: function updateTerrain(dt) {
      for (var i = 0; i < clouds.length; i++) {
        clouds[i].position.x += clouds[i].userData.drift * dt;
        if (clouds[i].position.x > 2200) clouds[i].position.x = -2200;
      }
    },
    setGoldenHour: setGoldenHour
  };
})();
