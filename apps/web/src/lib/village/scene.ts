// Scène three.js du village (style « laboratoire blanc »). Chargée à la demande, seulement sur /village.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { BuildingId, BuildingState, Phase } from "./model";
import { isLit } from "./model";

export type VillageView = {
  phase: Phase; lit: number; breach: boolean;
  states: BuildingState[];
};
export type Village = {
  windowCount: number;
  update(v: VillageView): void;
  flyTo(id: BuildingId | null): void;
  pulse(kind: "form" | "rafiq"): void;
  rotate(dir: -1 | 1): void;
  dispose(): void;
};

// Plan au sol : coordonnées de la maquette (0..240) → mètres de la scène (-6..6).
const U = (c: number) => c / 20 - 6;
const CAPS: Record<BuildingId, number> = { securite: 0x7aa2f7, donnees: 0x5cc8be, rafiq: 0xa78bfa, accessibilite: 0xf6b26b, sobriete: 0x6fcf8f };
const PIPES: Record<string, [number, number][]> = {
  securite: [[125, 80], [125, 150]],
  donnees: [[202, 75], [202, 100], [125, 100], [125, 150]],
  rafiq: [[80, 150], [125, 150]],
  accessibilite: [[122, 195], [122, 150]],
  sobriete: [[170, 150], [125, 150]],
  gate: [[236, 190], [155, 190], [155, 150], [125, 150]],
};
const SKY: Record<Phase, { bg: number; hemiTop: number; hemiBottom: number; hemi: number; sun: number; sunI: number; sunPos: [number, number, number]; dot: number; glass: number }> = {
  day: { bg: 0xf5f4fa, hemiTop: 0xffffff, hemiBottom: 0xdcd8ec, hemi: 1.7, sun: 0xffffff, sunI: 2.2, sunPos: [6, 12, 5], dot: 0xc04df0, glass: 0xe3e1ee },
  dusk: { bg: 0xf6dccb, hemiTop: 0xfff0e6, hemiBottom: 0xd6c8f0, hemi: 1.6, sun: 0xffb48a, sunI: 1.3, sunPos: [12, 5, -3], dot: 0xb83ee8, glass: 0xcfc6e0 },
  night: { bg: 0x1f2547, hemiTop: 0x9aa4ee, hemiBottom: 0x3a3f73, hemi: 1.25, sun: 0xc9d1ff, sunI: 0.9, sunPos: [-5, 9, 7], dot: 0xf0a6ff, glass: 0x4a4f80 },
};
const LIT = new THREE.Color(0xffd98a);

export function createVillage(canvas: HTMLCanvasElement, opts: { reducedMotion: boolean; onPick: (id: BuildingId) => void }): Village {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY.day.bg);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const target = new THREE.Vector3(0, 1.2, 0);
  let azimuth = Math.PI / 4, zoom = 1;
  const want = { azimuth, zoom, target: target.clone() };

  const hemi = new THREE.HemisphereLight(SKY.day.hemiTop, SKY.day.hemiBottom, SKY.day.hemi);
  const sun = new THREE.DirectionalLight(SKY.day.sun, SKY.day.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 50 });
  scene.add(hemi, sun);

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra }));
  const white = mat(0xf7f6fc), whiteSide = mat(0xffffff);

  // Île : plaque blanche arrondie + grille lilas.
  const island = new THREE.Mesh(keep(new RoundedBoxGeometry(12.6, 0.8, 12.6, 4, 0.38)), whiteSide);
  island.position.y = -0.4;
  island.receiveShadow = true;
  scene.add(island);
  const grid = new THREE.GridHelper(12, 6, 0xe4e0f4, 0xece9f6);
  grid.position.y = 0.012;
  scene.add(grid);

  // Bâtiments.
  const groups = new Map<BuildingId, THREE.Group>();
  const caps = new Map<BuildingId, THREE.MeshStandardMaterial>();
  const bodies = new Map<BuildingId, THREE.MeshStandardMaterial>();
  const windowSlots: { pos: THREE.Vector3; rotY: number }[] = [];
  const pickables: THREE.Object3D[] = [];

  function addBox(id: BuildingId, cx: number, cz: number, w: number, d: number, h: number) {
    const g = new THREE.Group();
    g.position.set(U(cx), 0, U(cz));
    const bm = mat(0xf7f6fc);
    bodies.set(id, bm);
    const body = new THREE.Mesh(keep(new RoundedBoxGeometry(w, h, d, 3, 0.12)), bm);
    body.position.y = h / 2;
    body.castShadow = body.receiveShadow = true;
    const cm = mat(CAPS[id], { transparent: true, opacity: 0.88, emissive: CAPS[id], emissiveIntensity: 0.25, roughness: 0.4 });
    caps.set(id, cm);
    const cap = new THREE.Mesh(keep(new RoundedBoxGeometry(w - 0.3, 0.22, d - 0.3, 2, 0.08)), cm);
    cap.position.y = h + 0.1;
    cap.name = "cap";
    const strip = new THREE.Mesh(keep(new THREE.BoxGeometry(w + 0.02, 0.12, d + 0.02)), cm);
    strip.position.y = h - 0.35;
    g.add(body, cap, strip);
    g.userData = { id, w, d, h, body, cap, strip, lift: 0 };
    // fenêtres sur les deux faces visibles (+x et +z)
    const rows = Math.max(1, Math.floor((h - 0.8) / 0.9));
    for (let r = 0; r < rows; r++) {
      const y = 0.6 + r * 0.9;
      for (let c = 0; c < Math.floor((w - 0.4) / 0.7); c++) windowSlots.push({ pos: new THREE.Vector3(U(cx) - w / 2 + 0.55 + c * 0.7, y, U(cz) + d / 2 + 0.011), rotY: 0 });
      for (let c = 0; c < Math.floor((d - 0.4) / 0.7); c++) windowSlots.push({ pos: new THREE.Vector3(U(cx) + w / 2 + 0.011, y, U(cz) - d / 2 + 0.55 + c * 0.7), rotY: Math.PI / 2 });
    }
    scene.add(g);
    groups.set(id, g);
    pickables.push(body, cap);
    return g;
  }

  addBox("securite", 125, 55, 2.5, 2.5, 6.4);
  addBox("rafiq", 55, 150, 2.5, 2.5, 3.4);
  addBox("sobriete", 195, 150, 2.5, 2.5, 2.0);
  const acc = addBox("accessibilite", 122, 212, 2.3, 1.8, 1.9);
  const ramp = new THREE.Mesh(keep(new THREE.BoxGeometry(0.9, 0.08, 1.4)), white);
  ramp.position.set(-0.55, 0.32, 1.45);
  ramp.rotation.x = 0.42;
  ramp.castShadow = true;
  acc.add(ramp);

  // Silo des données : cylindre de verre qui se remplit avec les missions reçues.
  const silo = new THREE.Group();
  silo.position.set(U(202), 0, U(57));
  const shell = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.95, 0.95, 2.4, 40, 1, true)), mat(0xffffff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.2 }));
  shell.position.y = 1.2;
  const fillMat = mat(CAPS.donnees, { emissive: CAPS.donnees, emissiveIntensity: 0.3 });
  caps.set("donnees", fillMat);
  const fill = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.85, 0.85, 1, 40)), fillMat);
  fill.castShadow = true;
  const lid = new THREE.Mesh(keep(new THREE.CylinderGeometry(1, 1, 0.16, 40)), white);
  lid.position.y = 2.45;
  const base = new THREE.Mesh(keep(new THREE.CylinderGeometry(1, 1, 0.12, 40)), white);
  base.position.y = 0.06;
  silo.add(shell, fill, lid, base);
  silo.userData = { id: "donnees", lift: 0, h: 2.4 };
  scene.add(silo);
  groups.set("donnees", silo);
  pickables.push(shell, lid, fill);

  // Antenne de Rafiq + ondes.
  const rafG = groups.get("rafiq")!;
  const mast = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8)), white);
  mast.position.y = 3.4 + 0.75;
  const beaconMat = keep(new THREE.MeshBasicMaterial({ color: CAPS.rafiq }));
  const beacon = new THREE.Mesh(keep(new THREE.SphereGeometry(0.17, 16, 12)), beaconMat);
  beacon.position.y = 3.4 + 1.45;
  rafG.add(mast, beacon);
  const ringMat = keep(new THREE.MeshBasicMaterial({ color: CAPS.rafiq, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.5, 0.04, 8, 48)), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3.4 + 1.45;
  rafG.add(ring);

  // Fenêtres : une seule InstancedMesh (lumière non éclairée → elles « brillent » la nuit).
  const winMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const windows = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(0.34, 0.46)), winMat, windowSlots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  windowSlots.forEach((s, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rotY);
    windows.setMatrixAt(i, m4.compose(s.pos, q, one));
    windows.setColorAt(i, new THREE.Color(SKY.day.glass));
  });
  scene.add(windows);

  // Tuyaux + points lumineux qui y circulent.
  const pipeMat = mat(0xe7e3f6, { roughness: 0.5 });
  const curves: Record<string, THREE.CurvePath<THREE.Vector3>> = {};
  for (const [k, pts] of Object.entries(PIPES)) {
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 0; i < pts.length - 1; i++) {
      path.add(new THREE.LineCurve3(new THREE.Vector3(U(pts[i][0]), 0.1, U(pts[i][1])), new THREE.Vector3(U(pts[i + 1][0]), 0.1, U(pts[i + 1][1]))));
    }
    curves[k] = path;
    for (const c of path.curves) {
      const tube = new THREE.Mesh(keep(new THREE.TubeGeometry(c, 2, 0.1, 10, false)), pipeMat);
      tube.receiveShadow = true;
      scene.add(tube);
    }
  }
  const hub = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 32)), mat(0xc04df0, { emissive: 0xc04df0, emissiveIntensity: 0.35 }));
  hub.position.set(U(125), 0.1, U(150));
  scene.add(hub);
  const gateMat = mat(0xd8d2ee);
  for (const dx of [-0.45, 0.45]) {
    const post = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 8)), gateMat);
    post.position.set(U(236) + 0.2, 0.55, U(190) + dx);
    scene.add(post);
  }
  const lintel = new THREE.Mesh(keep(new RoundedBoxGeometry(0.2, 0.2, 1.2, 2, 0.08)), mat(0xc04df0));
  lintel.position.set(U(236) + 0.2, 1.15, U(190));
  scene.add(lintel);

  const DOTS = 4;
  const keys = Object.keys(curves);
  const dotMat = keep(new THREE.MeshBasicMaterial({ color: SKY.day.dot }));
  const dots = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(0.1, 10, 8)), dotMat, keys.length * DOTS);
  scene.add(dots);
  const speed: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0.12]));

  const pulseMat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const pulseBall = new THREE.Mesh(keep(new THREE.SphereGeometry(0.22, 16, 12)), pulseMat);
  const pulseLight = new THREE.PointLight(0xe9b6ff, 0, 4);
  pulseBall.add(pulseLight);
  pulseBall.visible = false;
  scene.add(pulseBall);
  const pulsePath = new THREE.CurvePath<THREE.Vector3>();
  curves.gate.curves.forEach((c) => pulsePath.add(c));
  [...curves.donnees.curves].reverse().forEach((c) => {
    const l = c as THREE.LineCurve3;
    pulsePath.add(new THREE.LineCurve3(l.v2, l.v1));
  });

  // Arbres « bulles ».
  const leaf = mat(0xe8dcfb), trunk = mat(0xd0c8e8);
  for (const [x, z] of [[22, 30], [55, 45], [228, 120], [25, 225], [60, 222], [228, 225], [88, 100], [160, 228]]) {
    const t = new THREE.Group();
    t.position.set(U(x), 0, U(z));
    const tr = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6)), trunk);
    tr.position.y = 0.3;
    const lf = new THREE.Mesh(keep(new THREE.SphereGeometry(0.42, 16, 12)), leaf);
    lf.position.y = 0.85;
    lf.castShadow = true;
    t.add(tr, lf);
    scene.add(t);
  }

  // Fumée de la tour en cas d'alerte.
  const smokeMat = keep(new THREE.MeshStandardMaterial({ color: 0x9aa0aa, transparent: true, opacity: 0.6, roughness: 1 }));
  const smoke = [0, 1, 2].map((i) => {
    const s = new THREE.Mesh(keep(new THREE.SphereGeometry(0.35 + i * 0.1, 12, 10)), smokeMat.clone());
    keep(s.material as THREE.Material);
    s.visible = false;
    scene.add(s);
    return s;
  });

  // Étoiles.
  const starGeo = keep(new THREE.BufferGeometry());
  const sp: number[] = [];
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 60;
    sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const starMat = keep(new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, transparent: true, opacity: 0 }));
  scene.add(new THREE.Points(starGeo, starMat));

  // ---- état
  let view: VillageView | null = null;
  const cur = { bg: new THREE.Color(SKY.day.bg), top: new THREE.Color(SKY.day.hemiTop), bottom: new THREE.Color(SKY.day.hemiBottom), sun: new THREE.Color(SKY.day.sun), hemi: SKY.day.hemi, sunI: SKY.day.sunI, sunPos: new THREE.Vector3(...SKY.day.sunPos), stars: 0 };
  let pulseT = -1, ringT = -1, hovered: BuildingId | null = null;
  const tmp = new THREE.Color();

  function applyView(v: VillageView) {
    const sky = SKY[v.phase];
    dotMat.color.set(sky.dot);
    for (let i = 0; i < windowSlots.length; i++) windows.setColorAt(i, isLit(i, windowSlots.length, v.lit) ? LIT : tmp.set(sky.glass));
    windows.instanceColor!.needsUpdate = true;
    const sec = v.states.find((s) => s.id === "securite");
    const alarm = !!sec?.alert;
    caps.get("securite")!.color.set(alarm ? 0xef4444 : CAPS.securite);
    caps.get("securite")!.emissive.set(alarm ? 0xef4444 : CAPS.securite);
    bodies.get("securite")!.color.set(alarm ? 0xfbe1de : 0xf7f6fc);
    smoke.forEach((s) => (s.visible = alarm));
    speed.securite = alarm ? 0 : 0.12;
    const eco = v.states.find((s) => s.id === "sobriete");
    const eg = groups.get("sobriete")!;
    const target = 1.4 + (eco?.level ?? 0.7) * 3.2;
    eg.userData.targetH = target;
    const dataLevel = v.states.find((s) => s.id === "donnees")?.level ?? 0;
    const fh = 0.15 + dataLevel * 2.1;
    fill.scale.y = fh;
    fill.position.y = 0.12 + fh / 2;
    beacon.userData.blink = !!v.states.find((s) => s.id === "rafiq")?.alert;
  }

  function resize() {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    const aspect = w / h, size = 9.5;
    camera.left = -size * aspect; camera.right = size * aspect; camera.top = size; camera.bottom = -size;
    camera.updateProjectionMatrix();
    invalidate();
  }

  function placeCamera() {
    const r = 40;
    camera.position.set(target.x + Math.cos(azimuth) * r, target.y + r * 0.82, target.z + Math.sin(azimuth) * r);
    camera.zoom = zoom;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }

  let raf = 0, last = performance.now(), dirty = true, visible = true, t = 0;
  const motion = !opts.reducedMotion;
  function invalidate() { dirty = true; if (!raf && visible) raf = requestAnimationFrame(frame); }

  function frame(now: number) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    let busy = false;
    const k = motion ? 1 - Math.pow(0.002, dt) : 1;
    // ciel
    if (view) {
      const s = SKY[view.phase];
      const eps = 0.002;
      cur.bg.lerp(tmp.set(s.bg), k); cur.top.lerp(tmp.set(s.hemiTop), k); cur.bottom.lerp(tmp.set(s.hemiBottom), k); cur.sun.lerp(tmp.set(s.sun), k);
      cur.hemi += (s.hemi - cur.hemi) * k; cur.sunI += (s.sunI - cur.sunI) * k;
      cur.sunPos.lerp(new THREE.Vector3(...s.sunPos), k);
      const st = view.phase === "night" ? 0.9 : 0;
      cur.stars += (st - cur.stars) * k;
      busy ||= Math.abs(s.hemi - cur.hemi) > eps || Math.abs(st - cur.stars) > eps;
      (scene.background as THREE.Color).copy(cur.bg);
      hemi.color.copy(cur.top); hemi.groundColor.copy(cur.bottom); hemi.intensity = cur.hemi;
      sun.color.copy(cur.sun); sun.intensity = cur.sunI; sun.position.copy(cur.sunPos);
      starMat.opacity = cur.stars;
    }
    // caméra
    azimuth += (want.azimuth - azimuth) * k; zoom += (want.zoom - zoom) * k; target.lerp(want.target, k);
    busy ||= Math.abs(want.azimuth - azimuth) > 1e-3 || Math.abs(want.zoom - zoom) > 1e-3 || target.distanceTo(want.target) > 1e-3;
    placeCamera();
    // bâtiments : survol et hauteur de la Sobriété
    for (const [id, g] of groups) {
      const lift = id === hovered ? 0.25 : 0;
      g.userData.lift += (lift - g.userData.lift) * k;
      g.position.y = g.userData.lift;
      busy ||= Math.abs(lift - g.userData.lift) > 1e-3;
    }
    const eg = groups.get("sobriete")!;
    if (eg.userData.targetH) {
      const ud = eg.userData;
      const sy = (ud.body as THREE.Mesh).scale.y;
      const want = ud.targetH / ud.h;
      const ny = sy + (want - sy) * k;
      (ud.body as THREE.Mesh).scale.y = ny;
      (ud.body as THREE.Mesh).position.y = (ud.h * ny) / 2;
      (ud.cap as THREE.Mesh).position.y = ud.h * ny + 0.1;
      (ud.strip as THREE.Mesh).position.y = ud.h * ny - 0.35;
      busy ||= Math.abs(want - ny) > 1e-3;
    }
    // points dans les tuyaux
    let i = 0;
    for (const key of keys) {
      for (let j = 0; j < DOTS; j++) {
        const u = (((motion ? t : 0) * speed[key] * 4 + j / DOTS) % 1 + 1) % 1;
        const p = curves[key].getPointAt(u);
        p.y += 0.06;
        dots.setMatrixAt(i++, m4.compose(p, q.identity(), speed[key] === 0 ? new THREE.Vector3(0.6, 0.6, 0.6) : one));
      }
    }
    dots.instanceMatrix.needsUpdate = true;
    // impulsion « mission reçue »
    if (pulseT >= 0) {
      pulseT += dt / 2.2;
      if (pulseT >= 1) { pulseT = -1; pulseBall.visible = false; pulseLight.intensity = 0; speed.gate = speed.donnees = 0.12; }
      else { pulseBall.position.copy(pulsePath.getPointAt(pulseT)).setY(0.35); pulseLight.intensity = 3; busy = true; }
    }
    // ondes de Rafiq
    if (ringT >= 0) {
      ringT += dt / 1.6;
      if (ringT >= 1) { ringT = -1; ringMat.opacity = 0; speed.rafiq = 0.12; }
      else { ring.scale.setScalar(1 + ringT * 4); ringMat.opacity = 0.9 * (1 - ringT); busy = true; }
    }
    beaconMat.color.set(beacon.userData.blink && motion && Math.sin(t * 4) > 0 ? 0xffffff : CAPS.rafiq);
    // fumée
    const tower = groups.get("securite")!;
    smoke.forEach((s, n) => {
      if (!s.visible) return;
      const ph = motion ? ((t * 0.35 + n / 3) % 1) : n / 3;
      s.position.set(tower.position.x + 0.2 * Math.sin(ph * 6 + n), 6.8 + ph * 2.6, tower.position.z);
      (s.material as THREE.MeshStandardMaterial).opacity = 0.65 * (1 - ph);
      busy = true;
    });
    renderer.render(scene, camera);
    dirty = false;
    if (visible && (motion || busy || dirty)) raf = requestAnimationFrame(frame);
  }

  // Interaction : clic = ouvrir la fiche, survol = soulever.
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e: PointerEvent): BuildingId | null => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let o: THREE.Object3D | null = ray.intersectObjects(pickables, false)[0]?.object ?? null;
    while (o && !o.userData?.id) o = o.parent;
    return (o?.userData.id as BuildingId) ?? null;
  };
  let downX = 0, downAz = 0, dragging = false;
  const onMove = (e: PointerEvent) => {
    if (dragging) { want.azimuth = downAz + (e.clientX - downX) * 0.01; invalidate(); return; }
    const h = hit(e);
    if (h !== hovered) { hovered = h; canvas.style.cursor = h ? "pointer" : "grab"; invalidate(); }
  };
  const onDown = (e: PointerEvent) => { dragging = true; downX = e.clientX; downAz = want.azimuth; };
  const onUp = (e: PointerEvent) => {
    const moved = Math.abs(e.clientX - downX) > 4;
    dragging = false;
    if (!moved) { const h = hit(e); if (h) opts.onPick(h); }
  };
  const onLeave = () => { dragging = false; hovered = null; invalidate(); };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting && document.visibilityState === "visible"; if (visible) invalidate(); });
  io.observe(canvas);
  const onVis = () => { visible = document.visibilityState === "visible"; if (visible) { last = performance.now(); invalidate(); } };
  document.addEventListener("visibilitychange", onVis);
  resize();

  return {
    windowCount: windowSlots.length,
    update(v) { view = v; applyView(v); invalidate(); },
    flyTo(id) {
      if (!id) { want.target.set(0, 1.2, 0); want.zoom = 1; }
      else {
        const g = groups.get(id)!;
        want.target.set(g.position.x, (g.userData.h ?? 2) * 0.5, g.position.z);
        want.zoom = 1.7;
        hovered = id;
      }
      invalidate();
    },
    pulse(kind) {
      if (kind === "form") { pulseT = 0; pulseBall.visible = true; speed.gate = speed.donnees = 0.45; }
      else { ringT = 0; speed.rafiq = 0.45; }
      invalidate();
    },
    rotate(dir) { want.azimuth += (dir * Math.PI) / 4; invalidate(); },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      disposables.forEach((d) => d.dispose());
      windows.dispose(); dots.dispose();
      renderer.dispose();
    },
  };
}
