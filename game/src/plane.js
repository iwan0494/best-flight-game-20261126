// Langit Nusantara — the courier aircraft "Cendrawasih LNU", built entirely
// from Three.js primitives: fuselage, wings, tail, spinning propeller,
// cockpit glass, landing gear and navigation lights. No borrowed model.
(function () {
  window.LN = window.LN || {};
  var LN = window.LN;

  function makeTextTexture(text, w, h, font, fg, bg) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  function buildPlane(scene) {
    var c = LN.CONFIG;
    var group = new THREE.Group();
    group.name = 'courierPlane';
    var white = new THREE.MeshLambertMaterial({ color: c.planeWhite });
    var teal = new THREE.MeshLambertMaterial({ color: c.planeTeal });
    var orange = new THREE.MeshLambertMaterial({ color: c.planeOrange });
    var dark = new THREE.MeshLambertMaterial({ color: 0x22282e });
    var glass = new THREE.MeshPhongMaterial({ color: 0x1a3a55, shininess: 120, specular: 0xaaddff });

    // Fuselage: rounded body + nose cone.
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.75, 6.4, 12), white);
    body.rotation.x = Math.PI / 2;
    group.add(body);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.8, 12), teal);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 4.1;
    group.add(nose);
    var tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 12), white);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.z = -4.2;
    group.add(tailCone);

    // Livery stripe along the fuselage.
    var stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 0.78, 6.4, 12, 1, true, 0, Math.PI), orange);
    stripe.rotation.x = Math.PI / 2;
    stripe.rotation.y = Math.PI / 2;
    stripe.position.y = -0.12;
    group.add(stripe);

    // Registration text on the rear fuselage.
    var regTex = makeTextTexture('PK-LNU  •  LANGIT NUSANTARA', 512, 64, 'bold 34px sans-serif', '#0e7c7b', '#f4f1e8');
    var reg = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 0.55),
      new THREE.MeshBasicMaterial({ map: regTex, transparent: true })
    );
    reg.position.set(0, 0.35, -2.2);
    reg.rotation.y = Math.PI / 2;
    reg.position.x = 1.06;
    group.add(reg);
    var reg2 = reg.clone();
    reg2.rotation.y = -Math.PI / 2;
    reg2.position.x = -1.06;
    group.add(reg2);

    // Cockpit glass.
    var canopy = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 8), glass);
    canopy.scale.set(0.95, 0.75, 1.5);
    canopy.position.set(0, 0.75, 1.6);
    canopy.name = 'canopy';
    group.add(canopy);

    // Main wings (high wing, above the cabin roof) + struts.
    var wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 1.9), teal);
    wing.position.set(0, 1.5, 0.6);
    wing.name = 'mainWing';
    group.add(wing);
    var wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.9), orange);
    wingTipL.position.set(-5.6, 1.5, 0.6);
    wingTipL.name = 'wingTipL';
    group.add(wingTipL);
    var wingTipR = wingTipL.clone();
    wingTipR.position.x = 5.6;
    wingTipR.name = 'wingTipR';
    group.add(wingTipR);
    [-1, 1].forEach(function (s) {
      var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6), dark);
      strut.position.set(s * 2.2, 0.6, 0.6);
      strut.rotation.z = s * 0.5;
      group.add(strut);
    });

    // Tail: horizontal stabiliser + vertical fin.
    var hstab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.1), teal);
    hstab.position.set(0, 0.35, -4.6);
    group.add(hstab);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 1.6), orange);
    fin.position.set(0, 1.2, -4.5);
    group.add(fin);

    // Propeller at the nose. Blades get their own material so cockpit view
    // can fade them into a blur disc instead of solid bars.
    var prop = new THREE.Group();
    prop.position.set(0, 0, 5.1);
    var hub = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), dark);
    hub.rotation.x = Math.PI / 2;
    prop.add(hub);
    var bladeMat = new THREE.MeshLambertMaterial({ color: 0x22282e, transparent: true, opacity: 1 });
    for (var b = 0; b < 2; b++) {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.12), bladeMat);
      blade.rotation.z = b * Math.PI / 2;
      blade.name = 'blade';
      prop.add(blade);
    }
    prop.name = 'propeller';
    group.add(prop);

    // Fixed landing gear.
    [-1, 1].forEach(function (s) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), dark);
      leg.position.set(s * 0.9, -1.2, 1.2);
      group.add(leg);
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(s * 0.9, -1.85, 1.2);
      group.add(wheel);
    });
    var tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 8), dark);
    tailWheel.rotation.z = Math.PI / 2;
    tailWheel.position.set(0, -1.1, -4.3);
    group.add(tailWheel);

    // Navigation lights: red left, green right, white tail.
    var navL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    navL.position.set(-5.85, 1.5, 0.6);
    group.add(navL);
    var navR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    navR.position.set(5.85, 1.5, 0.6);
    group.add(navR);
    var navT = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    navT.position.set(0, 0.4, -5.3);
    group.add(navT);

    group.traverse(function (o) { if (o.isMesh) o.castShadow = false; });
    scene.add(group);
    return group;
  }

  LN.Plane = {
    build: buildPlane,
    // Pose the mesh from the flight state; order YXZ keeps yaw, pitch, bank independent.
    posePlane: function posePlane(group, state) {
      group.position.set(state.x, state.y, state.z);
      group.rotation.order = 'YXZ';
      group.rotation.y = state.yaw;
      group.rotation.x = -state.pitch;
      group.rotation.z = state.roll;
    },
    spinPropeller: function spinPropeller(group, dt, speed) {
      var prop = group.getObjectByName('propeller');
      if (prop) prop.rotation.z += dt * (4 + speed * 0.55);
    },
    // In cockpit view the wing would fill the frame and the blades would read
    // as solid bars, so the wing hides and the blades fade to a blur disc.
    setCockpitView: function setCockpitView(group, cockpit) {
      ['mainWing', 'wingTipL', 'wingTipR', 'canopy'].forEach(function (n) {
        var o = group.getObjectByName(n);
        if (o) o.visible = !cockpit;
      });
      var prop = group.getObjectByName('propeller');
      if (prop) prop.traverse(function (o) {
        // In cockpit view a blade reads as a solid grey slab across the sky,
        // so hide both blades there; the hub stays and the sightline is clear.
        if (o.name === 'blade') o.visible = !cockpit;
      });
    }
  };
})();
