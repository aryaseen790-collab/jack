/* Jack Menu Guide — the 3D toy box (Three.js / WebGL)
   A lacquered jack-in-the-box with a brass crank, hinged lid and chrome coil.
   Each menu item pops out as a procedural 3D model, or as the item's own
   image once assets/img/items/<slug>.webp|png exists.
   Exposes window.Box3D = { supported(), create(host, opts) } and fires
   "box3d-ready" on window. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "./vendor/three/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./vendor/three/RoomEnvironment.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

function supported() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

class Spring {
  constructor(x = 0, k = 170, c = 20) { this.x = x; this.t = x; this.v = 0; this.k = k; this.c = c; }
  set(t, c) { this.t = t; if (c != null) this.c = c; if (reduce) { this.x = t; this.v = 0; } }
  kick(v) { if (!reduce) this.v += v; }
  step(dt) { const n = 4, h = dt / n; for (let i = 0; i < n; i++) { const a = -this.k * (this.x - this.t) - this.c * this.v; this.v += a * h; this.x += this.v * h; } }
  get busy() { return Math.abs(this.v) > 1e-3 || Math.abs(this.x - this.t) > 1e-3; }
}

/* ---------- Materials (shared) ---------- */
let MAT = null;
function mats() {
  if (MAT) return MAT;
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  const S = (o) => new THREE.MeshStandardMaterial(o);
  MAT = {
    red: P({ color: 0xc21f12, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    inner: S({ color: 0x4a0a05, roughness: 0.9, side: THREE.BackSide }),
    gold: S({ color: 0xf1b52c, metalness: 0.92, roughness: 0.24 }),
    chrome: S({ color: 0xe6e9ef, metalness: 1, roughness: 0.16 }),
    dark: S({ color: 0x1c2033, metalness: 0.5, roughness: 0.35 }),
    knob: P({ color: 0xe0321f, roughness: 0.22, clearcoat: 1 }),
    bun: P({ color: 0xd88a2a, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.35 }),
    bunBase: S({ color: 0xe8a54c, roughness: 0.72 }),
    brioche: P({ color: 0xb8651c, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.2 }),
    toast: S({ color: 0xd9a35a, roughness: 0.85 }),
    seed: S({ color: 0xfff1cf, roughness: 0.6 }),
    patty: S({ color: 0x4a230f, roughness: 0.95 }),
    cheese: P({ color: 0xffb400, roughness: 0.35, clearcoat: 0.4, side: THREE.DoubleSide }),
    lettuce: S({ color: 0x5bb233, roughness: 0.55, side: THREE.DoubleSide }),
    tomato: P({ color: 0xd8301c, roughness: 0.28, clearcoat: 0.7 }),
    crispy: S({ color: 0xc8862f, roughness: 0.85 }),
    bacon: S({ color: 0xa3321d, roughness: 0.55 }),
    shell: S({ color: 0xf0bd4a, roughness: 0.75, side: THREE.DoubleSide }),
    meat: S({ color: 0x6a3519, roughness: 0.92 }),
    egg: P({ color: 0xfffaf0, roughness: 0.4, clearcoat: 0.3 }),
    yolk: P({ color: 0xffae00, roughness: 0.2, clearcoat: 0.9 }),
    cupRed: P({ color: 0xd2261b, roughness: 0.38, clearcoat: 0.5, side: THREE.DoubleSide }),
    white: P({ color: 0xf6f3ee, roughness: 0.45, clearcoat: 0.3, side: THREE.DoubleSide }),
    fry: S({ color: 0xf2c040, roughness: 0.7 }),
    curly: S({ color: 0xd98d2b, roughness: 0.75 }),
    straw: P({ color: 0xe23b2e, roughness: 0.3, clearcoat: 0.6 }),
    clear: P({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.32, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false }),
    cream: P({ color: 0xfff7ea, roughness: 0.55 }),
    crust: S({ color: 0xb8773a, roughness: 0.9 }),
    berry: P({ color: 0xc81d33, roughness: 0.2, clearcoat: 1 }),
    choc: P({ color: 0x4b2614, roughness: 0.4, clearcoat: 0.5 }),
    pink: P({ color: 0xf2a7b8, roughness: 0.55 }),
    cookie: S({ color: 0x241612, roughness: 0.8 }),
    jalapeno: P({ color: 0x3f8f2a, roughness: 0.35, clearcoat: 0.6 }),
    tortilla: S({ color: 0xe8cf9b, roughness: 0.85 }),
    puff: S({ color: 0xd9dbe2, roughness: 1, transparent: true, opacity: 0.85 })
  };
  return MAT;
}

/* ---------- Geometry helpers ---------- */
function mesh(g, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function bumpy(geo, amt, f = 10) {
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const s = Math.sin(v.x * f * 1.7 + v.y * f * 0.9) * Math.cos(v.z * f * 1.3 - v.y * f * 0.6) + 0.5 * Math.sin((v.x + v.z) * f * 3.1 + v.y * 5);
    p.setXYZ(i, v.x + n.getX(i) * s * amt, v.y + n.getY(i) * s * amt, v.z + n.getZ(i) * s * amt);
  }
  p.needsUpdate = true; geo.computeVertexNormals(); return geo;
}
function lathe(pts, seg = 48) { return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(1e-4, x), y)), seg); }
function domeGeo(r, h) { const pts = [[0, 0], [r * 0.98, 0]]; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; pts.push([r * Math.cos(a), h * Math.sin(a)]); } return lathe(pts); }
let rnd = 1;
const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };
const seed = (s) => { rnd = 1; for (const ch of s) rnd = (rnd * 31 + ch.charCodeAt(0)) % 2147483647 || 7; };

/* ---------- Food models ---------- */
function sesame(group, r, h, y, n = 34) {
  const g = new THREE.SphereGeometry(0.013, 8, 6); g.scale(1, 0.5, 1.7);
  const im = new THREE.InstancedMesh(g, mats().seed, n); const d = new THREE.Object3D(); const nrm = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const phi = rand() * TAU, a = 0.42 + rand() * 0.95;
    d.position.set(r * Math.cos(a) * Math.cos(phi), y + h * Math.sin(a), r * Math.cos(a) * Math.sin(phi));
    nrm.set(Math.cos(a) * Math.cos(phi) / r, Math.sin(a) / h, Math.cos(a) * Math.sin(phi) / r).normalize();
    d.lookAt(d.position.clone().add(nrm)); d.rotateZ(rand() * TAU); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
  }
  im.castShadow = true; group.add(im);
}
function lettuceGeo(r) {
  const g = new THREE.CylinderGeometry(r, r, 0.026, 72, 1); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const rr = Math.hypot(v.x, v.z); if (rr > 0.01) { const a = Math.atan2(v.z, v.x), k = 1 + 0.07 * Math.sin(9 * a) + 0.03 * Math.sin(23 * a); p.setXYZ(i, v.x * k, v.y + 0.014 * Math.sin(13 * a), v.z * k); } }
  g.computeVertexNormals(); return g;
}
function cheeseGeo(s) {
  const g = new THREE.PlaneGeometry(s, s, 18, 18); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z); if (d > s * 0.5) p.setY(i, -(d - s * 0.5) * 0.65); }
  g.rotateY(Math.PI / 4); g.computeVertexNormals(); return g;
}
function burger(o = {}) {
  const m = mats(), g = new THREE.Group(); let y = 0;
  if (o.sourdough) { g.add(mesh(new RoundedBoxGeometry(0.62, 0.1, 0.62, 3, 0.03), m.toast, 0, 0.05, 0)); y = 0.1; }
  else { g.add(mesh(lathe([[0, 0], [0.29, 0], [0.335, 0.03], [0.345, 0.075], [0.33, 0.11], [0, 0.11]]), m.bunBase)); y = 0.11; }
  if (!o.noLettuce) { g.add(mesh(lettuceGeo(0.36), m.lettuce, 0, y + 0.012, 0)); y += 0.024; }
  if (o.tomato) { g.add(mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.04, 40), m.tomato, 0, y + 0.02, 0)); y += 0.04; }
  const patties = o.double ? 2 : 1;
  for (let i = 0; i < patties; i++) {
    if (o.crispy) g.add(mesh(bumpy(new THREE.CylinderGeometry(0.37, 0.36, 0.1, 48, 3), 0.014, 22), m.crispy, 0, y + 0.05, 0));
    else g.add(mesh(bumpy(new THREE.CylinderGeometry(0.35, 0.355, 0.1, 48, 3), 0.008, 30), m.patty, 0, y + 0.05, 0));
    y += 0.1;
    if (o.cheese !== false) { g.add(mesh(cheeseGeo(0.6), m.cheese, 0, y + 0.004, 0)); y += 0.012; }
  }
  if (o.egg) {
    g.add(mesh(bumpy(new THREE.CylinderGeometry(0.31, 0.32, 0.03, 40, 1), 0.01, 8), m.egg, 0, y + 0.015, 0));
    g.add(mesh(new THREE.SphereGeometry(0.1, 24, 12, 0, TAU, 0, Math.PI / 2), m.yolk, 0.03, y + 0.03, 0.02)); y += 0.05;
  }
  if (o.bacon) for (let i = 0; i < 2; i++) {
    const b = new THREE.BoxGeometry(0.66, 0.018, 0.09, 30, 1, 1); const p = b.attributes.position;
    for (let j = 0; j < p.count; j++) p.setY(j, p.getY(j) + 0.012 * Math.sin(p.getX(j) * 22 + i));
    b.computeVertexNormals(); const bm = mesh(b, m.bacon, 0, y + 0.012, (i - 0.5) * 0.12); bm.rotation.y = (i - 0.5) * 0.5; g.add(bm);
  }
  if (o.bacon) y += 0.025;
  if (o.sourdough) { g.add(mesh(new RoundedBoxGeometry(0.62, 0.1, 0.62, 3, 0.03), m.toast, 0, y + 0.05, 0)); y += 0.1; }
  else { const top = mesh(domeGeo(0.36, o.brioche ? 0.22 : 0.25), o.brioche ? m.brioche : m.bun, 0, y, 0); g.add(top); if (!o.brioche) sesame(g, 0.36, 0.25, y); y += 0.25; }
  return g;
}
function taco(scale = 1) {
  const m = mats(), g = new THREE.Group();
  const shellG = bumpy(new THREE.CylinderGeometry(0.27, 0.27, 0.56, 48, 4, true, Math.PI, Math.PI), 0.006, 18);
  shellG.rotateZ(Math.PI / 2); shellG.scale(1, 1.05, 0.62);
  g.add(mesh(shellG, m.shell, 0, 0.29, 0));
  for (let i = 0; i < 14; i++) g.add(mesh(new THREE.SphereGeometry(0.05 + rand() * 0.025, 12, 8), m.meat, (rand() - 0.5) * 0.46, 0.2 + rand() * 0.06, (rand() - 0.5) * 0.08));
  for (let i = 0; i < 26; i++) { const s = mesh(new THREE.BoxGeometry(0.012, 0.012, 0.09), rand() < 0.6 ? m.lettuce : m.cheese, (rand() - 0.5) * 0.5, 0.26 + rand() * 0.05, (rand() - 0.5) * 0.12); s.rotation.set(rand() * 3, rand() * 3, rand() * 3); g.add(s); }
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.SphereGeometry(0.018, 8, 6), m.tomato, (rand() - 0.5) * 0.44, 0.29, (rand() - 0.5) * 0.06));
  g.scale.setScalar(scale); return g;
}
function croissant() {
  const m = mats(), g = new THREE.Group();
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, a = lerp(-1.15, 1.15, t), s = 0.15 * (1 - 0.6 * Math.pow(Math.abs(2 * t - 1), 1.6));
    const seg = mesh(new THREE.SphereGeometry(1, 28, 18), m.brioche, Math.sin(a) * 0.3, s * 0.85, Math.cos(a) * 0.3 - 0.2);
    seg.scale.set(s * 0.9, s * 0.85, s * 1.3); seg.rotation.y = a + Math.PI / 2; g.add(seg);
  }
  return g;
}
function burrito() {
  const m = mats(), g = new THREE.Group();
  const b = bumpy(new THREE.CapsuleGeometry(0.15, 0.42, 10, 28), 0.006, 14); b.rotateZ(Math.PI / 2);
  g.add(mesh(b, m.tortilla, 0, 0.15, 0));
  for (let i = 0; i < 3; i++) { const s = mesh(new THREE.BoxGeometry(0.02, 0.006, 0.2), m.crust, -0.2 + i * 0.2, 0.3, 0); s.rotation.y = 0.5; g.add(s); }
  return g;
}
function nuggets(strips = false) {
  const m = mats(), g = new THREE.Group();
  const tray = mesh(new RoundedBoxGeometry(0.62, 0.1, 0.42, 3, 0.03), m.cupRed, 0, 0.05, 0); g.add(tray);
  const n = strips ? 5 : 7;
  for (let i = 0; i < n; i++) {
    const s = mesh(bumpy(new THREE.SphereGeometry(0.1, 22, 16), 0.012, 26), m.crispy, (rand() - 0.5) * 0.4, 0.14 + rand() * 0.07, (rand() - 0.5) * 0.22);
    s.scale.set(strips ? 2.4 : 1.3, 0.72, strips ? 0.75 : 1); s.rotation.set(rand() * 0.4, rand() * 3, rand() * 0.4); g.add(s);
  }
  return g;
}
function rolls(kind) {
  const m = mats(), g = new THREE.Group(), n = kind === "jalapeno" ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const c = bumpy(new THREE.CapsuleGeometry(kind === "jalapeno" ? 0.06 : 0.075, kind === "jalapeno" ? 0.2 : 0.32, 8, 20), 0.01, 24); c.rotateZ(Math.PI / 2);
    const r = mesh(c, m.crispy, (rand() - 0.5) * 0.12, 0.08 + (i % 2) * 0.12, (i - (n - 1) / 2) * 0.13); r.rotation.y = (rand() - 0.5) * 0.6; g.add(r);
    if (kind === "jalapeno") g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 8), m.jalapeno, r.position.x + 0.2, r.position.y + 0.02, r.position.z));
  }
  return g;
}
function fries(curly) {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.21, 0.155, 0.36, 40, 1, true), m.cupRed, 0, 0.18, 0));
  g.add(mesh(new THREE.CircleGeometry(0.155, 32).rotateX(-Math.PI / 2), m.cupRed, 0, 0.002, 0));
  g.add(mesh(new THREE.TorusGeometry(0.21, 0.008, 8, 48).rotateX(Math.PI / 2), m.white, 0, 0.36, 0));
  if (curly) {
    class Curl extends THREE.Curve { getPoint(u, t = new THREE.Vector3()) { const a = u * TAU * 3; return t.set(Math.cos(a) * 0.05, u * 0.32, Math.sin(a) * 0.05); } }
    const cg = new THREE.TubeGeometry(new Curl(), 120, 0.018, 8, false);
    for (let i = 0; i < 9; i++) { const c = mesh(cg, m.curly, (rand() - 0.5) * 0.22, 0.16 + rand() * 0.08, (rand() - 0.5) * 0.22); c.rotation.set((rand() - 0.5) * 0.9, rand() * TAU, (rand() - 0.5) * 0.9); g.add(c); }
  } else {
    const fg = new THREE.BoxGeometry(0.034, 0.42, 0.034);
    for (let i = 0; i < 26; i++) { const a = rand() * TAU, r = Math.sqrt(rand()) * 0.15; const f = mesh(fg, m.fry, Math.cos(a) * r, 0.28 + rand() * 0.08, Math.sin(a) * r); f.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5); g.add(f); }
  }
  return g;
}
function cup(kind = "soda", flavor = "vanilla") {
  const m = mats(), g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 44, 1, true), m.white, 0, 0.25, 0));
  g.add(mesh(new THREE.CircleGeometry(0.15, 32).rotateX(-Math.PI / 2), m.white, 0, 0.002, 0));
  const band = { vanilla: m.cupRed, chocolate: m.choc, strawberry: m.pink, oreo: m.cookie }[flavor] || m.cupRed;
  const bandMesh = mesh(new THREE.CylinderGeometry(0.188, 0.17, 0.16, 44, 1, true), band, 0, 0.26, 0);
  bandMesh.scale.set(1.012, 1, 1.012); g.add(bandMesh);
  if (kind === "shake") {
    const top = { vanilla: m.cream, chocolate: m.choc, strawberry: m.pink, oreo: m.cream }[flavor] || m.cream;
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; g.add(mesh(new THREE.SphereGeometry(0.075, 18, 12), top, Math.cos(a) * 0.1, 0.53, Math.sin(a) * 0.1)); }
    g.add(mesh(new THREE.SphereGeometry(0.09, 20, 14), top, 0, 0.6, 0));
    if (flavor === "oreo") for (let i = 0; i < 10; i++) g.add(mesh(new THREE.BoxGeometry(0.03, 0.01, 0.03), m.cookie, (rand() - 0.5) * 0.2, 0.62 + rand() * 0.04, (rand() - 0.5) * 0.2));
    else g.add(mesh(new THREE.SphereGeometry(0.035, 16, 12), m.berry, 0.02, 0.7, 0));
    g.add(mesh(new THREE.SphereGeometry(0.205, 32, 16, 0, TAU, 0, Math.PI / 2), m.clear, 0, 0.5, 0));
  } else {
    g.add(mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 44), m.white, 0, 0.51, 0));
  }
  const straw = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.46, 12), m.straw, 0.05, 0.7, 0); straw.rotation.z = -0.22; g.add(straw);
  return g;
}
function cheesecake() {
  const m = mats(), g = new THREE.Group(), w = Math.PI / 3.4, r = 0.46;
  const wedge = (h, mat, y) => { const mm = mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, false, 0, w), mat, 0, y, 0); return mm; };
  g.add(wedge(0.05, m.crust, 0.025)); g.add(wedge(0.2, m.cream, 0.15)); g.add(wedge(0.025, m.berry, 0.262));
  g.add(mesh(new THREE.SphereGeometry(0.045, 16, 12), m.berry, Math.sin(w / 2) * r * 0.6, 0.3, Math.cos(w / 2) * r * 0.6));
  g.children.forEach((c) => { c.position.x -= Math.sin(w / 2) * r * 0.5; c.position.z -= Math.cos(w / 2) * r * 0.5; });
  return g;
}
function puff() {
  const m = mats(), g = new THREE.Group();
  for (let i = 0; i < 8; i++) g.add(mesh(new THREE.SphereGeometry(0.08 + rand() * 0.06, 16, 12), m.puff, (rand() - 0.5) * 0.35, 0.1 + rand() * 0.3, (rand() - 0.5) * 0.25));
  return g;
}
function pair(a, b, sa = 0.62, sb = 0.55) { const g = new THREE.Group(); a.scale.setScalar(sa); a.position.set(-0.22, 0, 0.05); b.scale.setScalar(sb); b.position.set(0.24, 0, -0.08); g.add(a, b); return g; }

function modelFor(it) {
  if (!it) return puff();
  seed(it.slug);
  const n = it.name.toLowerCase(), c = it.cat;
  if (/munchie/.test(n)) return pair(burger({ tomato: true }), fries(false));
  if (/taco/.test(n)) { if (/tiny/.test(n)) { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const t = taco(0.55); t.position.set(0, 0, (i - 1) * 0.2); g.add(t); } return g; } if (/2 tacos/.test(n)) { const g = new THREE.Group(); const a = taco(0.85), b = taco(0.85); a.position.z = -0.13; b.position.z = 0.13; g.add(a, b); return g; } return taco(); }
  if (c === "combos") {
    if (/nugget/.test(n)) return pair(nuggets(false), cup("soda"), 0.6, 0.55);
    if (/croissant/.test(n)) return pair(croissant(), cup("soda"), 0.75, 0.5);
    if (/burrito/.test(n)) return pair(burrito(), cup("soda"), 0.75, 0.5);
    if (/sausage/.test(n)) return pair(burger({ egg: true, noLettuce: true }), cup("soda"), 0.62, 0.5);
    return pair(burger({ tomato: true }), fries(false));
  }
  if (c === "breakfast") { if (/croissant/.test(n)) return croissant(); if (/burrito/.test(n)) return burrito(); return burger({ egg: true, noLettuce: true, double: /extreme/.test(n), brioche: true }); }
  if (c === "chicken") { if (/nugget/.test(n)) return nuggets(false); if (/strip/.test(n)) return nuggets(true); return burger({ crispy: true, cheese: /cheese|club/.test(n), bacon: /club/.test(n), brioche: /cluck/.test(n) }); }
  if (c === "sides") { if (/fries/.test(n)) return fries(/curly/.test(n)); if (/jalape/.test(n)) return rolls("jalapeno"); return rolls("eggroll"); }
  if (c === "desserts") { if (/cheesecake/.test(n)) return cheesecake(); if (/shake/.test(n)) return cup("shake", /chocolate/.test(n) ? "chocolate" : /strawberry/.test(n) ? "strawberry" : /oreo/.test(n) ? "oreo" : "vanilla"); return cup("soda"); }
  return burger({ tomato: /jumbo/.test(n), double: /ultimate|smashed/.test(n), bacon: /bacon|sourdough/.test(n), sourdough: /sourdough/.test(n) });
}
// Fit any model into the space the box can hold.
function fit(g, maxW = 0.8, maxH = 0.6) {
  const b = new THREE.Box3().setFromObject(g), s = new THREE.Vector3(); b.getSize(s);
  const k = Math.min(maxW / Math.max(s.x, s.z), maxH / s.y, 1.6);
  const wrap = new THREE.Group(); g.scale.multiplyScalar(k);
  const b2 = new THREE.Box3().setFromObject(g), c = new THREE.Vector3(); b2.getCenter(c);
  g.position.x -= c.x; g.position.z -= c.z; g.position.y -= b2.min.y;
  wrap.add(g); return wrap;
}

/* ---------- Printed decals ---------- */
function canvasTex(draw, w = 512, h = 512) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const paint = () => { draw(cv.getContext("2d"), w, h); tex.needsUpdate = true; };
  paint(); if (document.fonts) document.fonts.ready.then(paint);
  return tex;
}
function star(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}
const RED = "#c21f12", GOLD = "#f4bd2c", DEEP = "#7c1208";
const frontTex = () => canvasTex((c, w, h) => {
  c.fillStyle = RED; c.fillRect(0, 0, w, h);
  c.strokeStyle = GOLD; c.lineWidth = 10; c.strokeRect(34, 34, w - 68, h - 68);
  c.lineWidth = 3; c.strokeRect(52, 52, w - 104, h - 104);
  [[78, 78], [w - 78, 78], [78, h - 78], [w - 78, h - 78]].forEach(([x, y]) => star(c, x, y, 16, GOLD));
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = "900 190px 'Big Shoulders Display', Impact, sans-serif";
  c.fillStyle = DEEP; c.fillText("MENU", w / 2 + 6, h / 2 - 14);
  c.fillStyle = "#fff8ec"; c.fillText("MENU", w / 2, h / 2 - 20);
  c.font = "600 40px 'IBM Plex Mono', monospace"; c.fillStyle = GOLD; c.fillText("★ GUIDE ★", w / 2, h / 2 + 108);
});
const sideTex = () => canvasTex((c, w, h) => {
  c.fillStyle = RED; c.fillRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h / 2); c.rotate(Math.PI / 4); c.fillStyle = "#a8180c";
  for (let x = -w; x < w; x += 64) c.fillRect(x, -h, 32, h * 2);
  c.restore();
  c.strokeStyle = GOLD; c.lineWidth = 10; c.strokeRect(34, 34, w - 68, h - 68);
});
const lidTex = () => canvasTex((c, w, h) => {
  c.fillStyle = RED; c.fillRect(0, 0, w, h);
  c.strokeStyle = GOLD; c.lineWidth = 8; c.strokeRect(30, 30, w - 60, h - 60);
  c.beginPath(); c.arc(w / 2, h / 2, 120, 0, TAU); c.fillStyle = GOLD; c.fill();
  c.beginPath(); c.arc(w / 2, h / 2, 104, 0, TAU); c.fillStyle = RED; c.fill();
  star(c, w / 2, h / 2, 80, GOLD);
});

/* ---------- Image billboard (when the item's own image exists) ---------- */
const imgCache = new Map();
function loadItemImage(base, slug) {
  if (imgCache.has(slug)) return imgCache.get(slug);
  const loader = new THREE.TextureLoader();
  const p = new Promise((res) => {
    loader.load(`${base}${slug}.webp`, res, undefined, () => loader.load(`${base}${slug}.png`, res, undefined, () => res(null)));
  }).then((t) => { if (t) t.colorSpace = THREE.SRGBColorSpace; return t; });
  imgCache.set(slug, p); return p;
}

/* ---------- The toy ---------- */
function create(host, opts = {}) {
  const m = mats();
  const aspect = opts.aspect || 1.02;
  host.innerHTML = "";
  host.classList.add("box3d-host");
  host.style.setProperty("--aspect", String(aspect));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia("(max-width: 900px)").matches ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute("tabindex", opts.crank ? "0" : "-1");
  canvas.setAttribute("role", opts.crank ? "button" : "img");
  canvas.setAttribute("aria-label", opts.crank ? "Toy box. Drag the crank clockwise, or press Enter to crank until something pops out." : "Toy box showing the selected item");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1 / aspect, 0.1, 50);
  const target = new THREE.Vector3(0, opts.targetY || 1.08, 0);
  camera.position.copy(target).add(new THREE.Vector3(0.62, 0.36, 0.7).normalize().multiplyScalar(opts.distance || 5.1));
  camera.lookAt(target);

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
  sun.position.set(2.5, 6, 3.5); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -2; sun.shadow.camera.right = 2; sun.shadow.camera.top = 3; sun.shadow.camera.bottom = -2;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x3a2418, 0.5));
  const rim = new THREE.DirectionalLight(0xffc58a, 1.2); rim.position.set(-3, 2.5, -2.5); scene.add(rim);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.ShadowMaterial({ opacity: 0.22 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Toy body
  const toy = new THREE.Group(); scene.add(toy);
  const body = new THREE.Group(); toy.add(body);
  const T = 0.07, B = 0.06; // wall thickness, height of the feet
  const wall = (w, h, d, x, y, z, mat = m.red) => body.add(mesh(new RoundedBoxGeometry(w, h, d, 3, 0.02), mat, x, y, z));
  wall(1, T, 1, 0, B + T / 2, 0);
  wall(1, 1, T, 0, B + 0.5, 0.5 - T / 2); wall(1, 1, T, 0, B + 0.5, -0.5 + T / 2);
  wall(T, 1, 1, -0.5 + T / 2, B + 0.5, 0); wall(T, 1, 1, 0.5 - T / 2, B + 0.5, 0);
  const lining = new THREE.Mesh(new THREE.BoxGeometry(1 - 2 * T - 0.002, 0.98, 1 - 2 * T - 0.002), m.inner); lining.position.y = B + 0.5 + 0.01; body.add(lining);
  const decal = (tex, w, h) => new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
  const front = mesh(new THREE.PlaneGeometry(0.86, 0.86), decal(frontTex()), 0, B + 0.5, 0.501); body.add(front);
  const side = mesh(new THREE.PlaneGeometry(0.86, 0.86), decal(sideTex()), -0.501, B + 0.5, 0); side.rotation.y = -Math.PI / 2; body.add(side);
  const back = mesh(new THREE.PlaneGeometry(0.86, 0.86), decal(sideTex()), 0, B + 0.5, -0.501); back.rotation.y = Math.PI; body.add(back);
  for (const x of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
    body.add(mesh(new RoundedBoxGeometry(0.09, 1.03, 0.09, 3, 0.03), m.gold, x, B + 0.5, z));
    body.add(mesh(new THREE.SphereGeometry(0.06, 24, 16), m.gold, x * 0.92, 0.055, z * 0.92));
  }
  for (const y of [B + 0.035, B + 0.995]) {
    body.add(mesh(new RoundedBoxGeometry(1.04, 0.05, 0.05, 2, 0.02), m.gold, 0, y, 0.5));
    body.add(mesh(new RoundedBoxGeometry(1.04, 0.05, 0.05, 2, 0.02), m.gold, 0, y, -0.5));
    body.add(mesh(new RoundedBoxGeometry(0.05, 0.05, 1.04, 2, 0.02), m.gold, 0.5, y, 0));
    body.add(mesh(new RoundedBoxGeometry(0.05, 0.05, 1.04, 2, 0.02), m.gold, -0.5, y, 0));
  }
  const TOP = B + 1.0;

  // Lid, hinged on the back edge
  const hinge = new THREE.Group(); hinge.position.set(0, TOP + 0.02, -0.53); toy.add(hinge);
  const lidMesh = mesh(new RoundedBoxGeometry(1.1, 0.08, 1.1, 3, 0.03), m.red, 0, 0.04, 0.55); hinge.add(lidMesh);
  const lidTop = mesh(new THREE.PlaneGeometry(0.9, 0.9), decal(lidTex()), 0, 0.081, 0.55); lidTop.rotation.x = -Math.PI / 2; hinge.add(lidTop);
  hinge.add(mesh(new RoundedBoxGeometry(1.13, 0.05, 0.05, 2, 0.02), m.gold, 0, 0.03, 1.1));
  hinge.add(mesh(new RoundedBoxGeometry(1.13, 0.05, 0.05, 2, 0.02), m.gold, 0, 0.03, 0));
  hinge.add(mesh(new RoundedBoxGeometry(0.05, 0.05, 1.13, 2, 0.02), m.gold, 0.55, 0.03, 0.55));
  hinge.add(mesh(new RoundedBoxGeometry(0.05, 0.05, 1.13, 2, 0.02), m.gold, -0.55, 0.03, 0.55));
  hinge.add(mesh(new RoundedBoxGeometry(0.14, 0.09, 0.04, 2, 0.015), m.gold, 0, -0.02, 1.125));
  for (const x of [-0.3, 0.3]) { const h = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 16), m.gold, x, 0, -0.005); h.rotation.z = Math.PI / 2; hinge.add(h); }

  // Crank on the right side
  const crank = new THREE.Group(); crank.position.set(0.5, B + 0.52, 0); toy.add(crank);
  const plate = mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 56), m.gold, 0.015, 0, 0); plate.rotation.z = Math.PI / 2; crank.add(plate);
  const ring = mesh(new THREE.TorusGeometry(0.2, 0.012, 10, 56), m.gold, 0.03, 0, 0); ring.rotation.y = Math.PI / 2; crank.add(ring);
  const hub = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 24), m.dark, 0.06, 0, 0); hub.rotation.z = Math.PI / 2; crank.add(hub);
  const crankRot = new THREE.Group(); crankRot.position.x = 0.09; crank.add(crankRot);
  crankRot.add(mesh(new RoundedBoxGeometry(0.035, 0.3, 0.06, 2, 0.015), m.gold, 0, 0.13, 0));
  const knob = mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.16, 24), m.knob, 0.08, 0.27, 0); knob.rotation.z = Math.PI / 2; crankRot.add(knob);
  const knobCap = mesh(new THREE.SphereGeometry(0.046, 20, 14), m.knob, 0.16, 0.27, 0); crankRot.add(knobCap);
  const crankParts = [plate, ring, hub, knob, knobCap, ...crankRot.children];
  crank.visible = !!opts.crank;

  // Coil and payload
  class Helix extends THREE.Curve { getPoint(u, t = new THREE.Vector3()) { const a = u * TAU * 9; return t.set(Math.cos(a) * 0.12, u, Math.sin(a) * 0.12); } }
  const coil = mesh(new THREE.TubeGeometry(new Helix(), 520, 0.016, 8, false), m.chrome, 0, B + T, 0); toy.add(coil);
  const payload = new THREE.Group(); toy.add(payload);
  const cap = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 32), m.gold, 0, 0.015, 0); payload.add(cap);
  const holder = new THREE.Group(); holder.position.y = 0.03; payload.add(holder);
  const LEN_IN = 0.26, LEN_OUT = 1.32;

  // Springs
  const lid = new Spring(0, 190, 13), pop = new Spring(0, 230, 11), wob = new Spring(0, 320, 9), spin = new Spring(0, 60, 12), squash = new Spring(0, 420, 12);
  const springs = [lid, pop, wob, spin, squash];
  let state = "closed", current = null, token = 0, billboard = null, closeToken = 0;
  const models = new Map();

  function setItem(it) {
    current = it;
    holder.clear(); billboard = null;
    const key = it ? it.slug : "_puff";
    if (!models.has(key)) models.set(key, fit(modelFor(it)));
    holder.add(models.get(key));
    if (it && opts.imageBase) {
      const mine = it;
      loadItemImage(opts.imageBase, it.slug).then((tex) => {
        if (!tex || current !== mine) return;
        holder.clear();
        billboard = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, toneMapped: false }));
        billboard.position.y = 0.4; holder.add(billboard);
      });
    }
  }
  function open() {
    state = "open"; closeToken++;
    lid.set(1.95, 10); lid.kick(9);
    setTimeout(() => { pop.set(1, 9); pop.kick(7); }, reduce ? 0 : 70);
    wob.kick(-2.2); squash.kick(-3);
    opts.onPop && opts.onPop(current);
  }
  function close() { state = "closed"; pop.set(0, 30); const my = ++closeToken; setTimeout(() => { if (my === closeToken && state === "closed") lid.set(0, 24); }, reduce ? 0 : 170); }
  function show(it) {
    const my = ++token;
    if (state === "open") { close(); setTimeout(() => { if (my === token) { setItem(it); open(); } }, reduce ? 0 : 430); }
    else { setItem(it); open(); }
  }

  // Crank logic: every 30° is one click and one note; the click at popAt pops the lid.
  let angle = 0, acc = 0, noteIdx = 0, autoRun = false, qi = 0;
  const queue = opts.queue || [], popAt = opts.popAt || 23;
  const nextItem = () => queue[qi++ % queue.length];
  const setWind = () => opts.wind && opts.wind.style.setProperty("--w", (noteIdx / popAt).toFixed(3));
  function clickTick() {
    if (state === "open") { close(); setTimeout(() => setItem(nextItem()), reduce ? 0 : 380); noteIdx = 0; setWind(); return; }
    opts.onNote && opts.onNote(noteIdx);
    wob.kick(noteIdx % 2 ? 0.6 : -0.6); squash.kick(-0.8);
    if (noteIdx === popAt) { open(); opts.onPopSound && opts.onPopSound(); noteIdx = 0; } else noteIdx++;
    setWind();
  }
  function turn(deg) {
    if (deg <= 0) return;
    angle += deg; acc += deg;
    while (acc >= 30) { acc -= 30; clickTick(); }
  }
  function autoCrank() {
    if (autoRun) return;
    if (reduce) { setItem(state === "open" ? nextItem() : current); state = "closed"; open(); return; }
    const ticks = state === "open" ? popAt + 2 : popAt + 1 - noteIdx;
    const goal = ticks * 30 - acc + 0.5;
    let done = 0, last = performance.now(); autoRun = true;
    const step = (now) => { const d = Math.min(goal - done, 640 * Math.min(0.25, (now - last) / 1000)); last = now; turn(d); done += d; if (done < goal - 0.01) requestAnimationFrame(step); else autoRun = false; };
    requestAnimationFrame(step);
  }

  // Pointer: drag the crank, or drag the box to spin it
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pick = (e, list) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.intersectObjects(list, true).length > 0; };
  let px = 0, py = 0;
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - 0.5; py = (e.clientY - r.top) / r.height - 0.5;
    if (opts.crank && e.pointerType === "mouse") canvas.style.cursor = pick(e, crankParts) ? "grab" : pick(e, [toy]) ? "ew-resize" : "default";
  });
  canvas.addEventListener("pointerleave", () => { px = 0; py = 0; });
  canvas.addEventListener("pointerdown", (e) => {
    const onCrank = opts.crank && pick(e, crankParts), onToy = pick(e, [toy]);
    if (!onCrank && !onToy) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    let moved = 0;
    if (onCrank) {
      canvas.style.cursor = "grabbing";
      const hubW = new THREE.Vector3(); hub.getWorldPosition(hubW); hubW.project(camera);
      const r = canvas.getBoundingClientRect(); const cx = r.left + (hubW.x + 1) / 2 * r.width, cy = r.top + (1 - hubW.y) / 2 * r.height;
      let prev = Math.atan2(e.clientY - cy, e.clientX - cx);
      const move = (ev) => { const a = Math.atan2(ev.clientY - cy, ev.clientX - cx); let d = (a - prev) * 180 / Math.PI; if (d > 180) d -= 360; if (d < -180) d += 360; prev = a; moved += Math.abs(d); turn(d); };
      const up = () => { canvas.removeEventListener("pointermove", move); canvas.style.cursor = "grab"; if (moved < 6) autoCrank(); };
      canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up, { once: true }); canvas.addEventListener("pointercancel", up, { once: true });
    } else {
      let lastX = e.clientX;
      const move = (ev) => { const d = ev.clientX - lastX; lastX = ev.clientX; moved += Math.abs(d); spin.x += d * 0.012; spin.v = d * 0.6; };
      const up = () => { canvas.removeEventListener("pointermove", move); spin.set(0, 7); if (moved < 4 && opts.crank) autoCrank(); };
      canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", up, { once: true }); canvas.addEventListener("pointercancel", up, { once: true });
    }
  });
  canvas.addEventListener("keydown", (e) => {
    if (!opts.crank) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); autoCrank(); }
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); turn(30 - acc + 0.01); }
  });

  // Size, visibility and the render loop
  function resize() {
    const w = Math.max(120, host.clientWidth), h = Math.round(w * aspect);
    renderer.setSize(w, h, false); canvas.style.width = "100%"; canvas.style.height = "auto";
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();
  let visible = true;
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) loop.start(); }, { rootMargin: "100px" }); io.observe(host);
  const clock = new THREE.Clock();
  let raf = 0, alive = true, turnY = 0;
  const loop = {
    start() { if (!raf && alive) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  };
  function frame() {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.033, clock.getDelta());
    springs.forEach((s) => s.step(dt));
    hinge.rotation.x = -lid.x;
    const len = lerp(LEN_IN, LEN_OUT, pop.x);
    coil.scale.y = Math.max(0.08, len);
    payload.position.y = B + T + len;
    const st = clamp(pop.v * 0.03, -0.2, 0.24);
    payload.scale.set(1 - st * 0.45, 1 + st, 1 - st * 0.45);
    payload.rotation.z = wob.x * 0.08;
    if (state === "open" && !reduce) turnY += dt * 0.55;
    holder.rotation.y = billboard ? 0 : turnY * (pop.x > 0.5 ? 1 : 0) + (billboard ? 0 : -0.4);
    if (billboard) billboard.lookAt(camera.position);
    crankRot.rotation.x = -angle * Math.PI / 180;
    toy.rotation.y = spin.x + (reduce ? 0 : px * 0.35);
    toy.rotation.z = wob.x * 0.025;
    toy.rotation.x = reduce ? 0 : py * 0.12;
    const sq = squash.x * 0.03; body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    renderer.render(scene, camera);
    const busy = springs.some((s) => s.busy) || autoRun || (state === "open" && !reduce) || px !== 0;
    if (visible && !document.hidden && (busy || frame.idle++ < 2)) raf = requestAnimationFrame(frame); else frame.idle = 0;
    if (busy) frame.idle = 0;
  }
  frame.idle = 0;
  canvas.addEventListener("pointermove", () => loop.start());
  canvas.addEventListener("pointerdown", () => loop.start());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop.start(); });
  const kick = () => loop.start();

  if (opts.crank) setItem(nextItem());
  loop.start();
  return {
    show: (it) => { show(it); kick(); }, setItem: (it) => { setItem(it); kick(); }, open: () => { open(); kick(); }, close: () => { close(); kick(); },
    autoCrank: () => { autoCrank(); kick(); },
    get current() { return current; }, get state() { return state; },
    destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.forceContextLoss(); pmrem.dispose(); canvas.remove(); }
  };
}

window.Box3D = { supported, create };
window.dispatchEvent(new Event("box3d-ready"));
