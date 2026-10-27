import * as THREE from "three";
import "./style.css";
import "./v02.css";
import {
  defaults,
  heroes,
  heroNames,
  maxHealth,
  damage,
  spellDamage,
  icon,
  recipes,
  type Progress,
  type Hero,
  type Weapon,
} from "./rpg";
const $ = (id: string) => document.getElementById(id)!;
const canvas = $("game") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x293e31);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x253e45, 0.019);
const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.1, 160);
let zoom = 15;
const world = new THREE.Group();
scene.add(world);
const ambient = new THREE.HemisphereLight(0xcbd6ab, 0x263b31, 2.1);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffdf9b, 3.2);
sun.position.set(-12, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -28,
  right: 28,
  top: 28,
  bottom: -28,
});
sun.shadow.normalBias = 0.06;
scene.add(sun);
const player = new THREE.Group();
scene.add(player);
const mat = (c: number) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true });
const materials = new Map<number, THREE.Material>();
function material(c: number) {
  if (!materials.has(c)) materials.set(c, mat(c));
  return materials.get(c)!;
}
function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  c: number,
) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(c));
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  c: number,
  n = 7,
) {
  const o = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.85, r, h, n),
    material(c),
  );
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
let seed = 42;
function rnd() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function range(a: number, b: number) {
  return a + rnd() * (b - a);
}
type Save = Progress & {
  x: number;
  z: number;
  hp: number;
  mp: number;
  xp: number;
  level: number;
  wood: number;
  shards: number;
  potions: number;
  blade: boolean;
  zone: string;
  kills: number;
  stash: number;
  collected: string[];
  bossDefeated: boolean;
};
let state: Save = {
  ...defaults,
  x: 0,
  z: 3,
  hp: 100,
  mp: 60,
  xp: 0,
  level: 1,
  wood: 0,
  shards: 0,
  potions: 2,
  blade: false,
  zone: "forest",
  kills: 0,
  stash: 0,
  collected: [],
  bossDefeated: false,
};
try {
  const s = JSON.parse(
    localStorage.getItem("forest-ash-v2") ||
      localStorage.getItem("forest-ash-v1") ||
      "null",
  );
  if (s && s.level && ["forest", "hub", "abyss"].includes(s.zone))
    state = { ...state, ...s };
} catch {}
if (!heroes.includes(state.hero)) state.hero = "warrior";
if (!["sword", "bow", "staff"].includes(state.weapon)) state.weapon = "sword";
player.position.set(state.x, 0, state.z);
const loader = new THREE.TextureLoader();
const textures = new Map<string, THREE.Texture>();
function assetSprite(name: string) {
  let tex = textures.get(name);
  if (!tex) {
    tex = loader.load(`/assets/${name}.png`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    textures.set(name, tex);
  }
  const o = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    }),
  );
  o.scale.set(1.3, 1.9, 1);
  o.position.y = 1;
  return o;
}
const heroSprite = assetSprite(state.hero);
player.add(heroSprite);
function shadow(parent: THREE.Object3D, r = 0.48) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 16),
    new THREE.MeshBasicMaterial({
      color: 0x0b1710,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  parent.add(m);
}
shadow(player);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(0.52, 0.56, 32),
  new THREE.MeshBasicMaterial({
    color: 0xc4bf89,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.06;
player.add(ring);
type Prop = {
  kind: string;
  x: number;
  z: number;
  mesh: THREE.Object3D;
  active: boolean;
};
type Enemy = {
  id: number;
  x: number;
  z: number;
  hp: number;
  max: number;
  mesh: THREE.Group;
  attack: number;
  boss: boolean;
};
let props: Prop[] = [];
let enemies: Enemy[] = [];
let obstacles: { x: number; z: number; r: number }[] = [];
function tree(x: number, z: number, scale = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  world.add(g);
  cylinder(g, 0, 2, 0, 0.28, 4, 0x514a35);
  for (let i = 0; i < 3; i++) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1 - i * 0.28, 0),
      material([0x2c604a, 0x407952, 0x60935f][i]),
    );
    crown.scale.set(1, 0.72, 1);
    crown.position.set(i === 1 ? 0.5 : -0.2, 3.5 + i * 0.9, i === 2 ? 0.4 : 0);
    crown.castShadow = true;
    g.add(crown);
  }
  obstacles.push({ x, z, r: 0.5 * scale });
}
function ruin(x: number, z: number, h: number) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  world.add(g);
  box(g, 0, 0.15, 0, 1.2, 0.3, 1.2, 0x7f8870);
  for (let y = 0.4; y < h; y += 0.5)
    box(
      g,
      range(-0.04, 0.04),
      y,
      0,
      0.86,
      0.48,
      0.84,
      y > h - 0.7 ? 0x899378 : 0x9a9c80,
    );
  box(g, 0, h, 0, 1.1, 0.2, 1.1, 0x727e63);
  box(g, 0.1, h + 0.13, 0.1, 0.8, 0.08, 0.8, 0x617343);
  obstacles.push({ x, z, r: 0.7 });
}
function addProp(kind: string, x: number, z: number) {
  if (
    ["shard", "wood", "herb", "ore", "chest"].includes(kind) &&
    state.collected.includes(`${state.zone}:${kind}:${x}:${z}`)
  )
    return;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  world.add(g);
  props.push({ kind, x, z, mesh: g, active: true });
  if (["herb", "ore", "chest"].includes(kind)) {
    const o = assetSprite(
      "item-" + { herb: "herb", ore: "ore", chest: "lock" }[kind],
    );
    o.scale.set(0.8, 0.8, 1);
    o.position.y = 0.4;
    g.add(o);
  } else if (kind === "npc") {
    const o = assetSprite("healer");
    g.add(o);
    const marker = assetSprite("item-apple");
    marker.scale.set(0.3, 0.3, 1);
    marker.position.y = 2.2;
    g.add(marker);
  } else if (kind === "shard") {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3),
      new THREE.MeshStandardMaterial({
        color: 0xacc9c3,
        emissive: 0x65aaa5,
        emissiveIntensity: 0.8,
        roughness: 0.4,
      }),
    );
    crystal.position.y = 0.6;
    g.add(crystal);
    const light = new THREE.PointLight(0x9ddbd0, 2, 3);
    light.position.y = 1;
    g.add(light);
    cylinder(g, 0, 0.12, 0, 0.5, 0.2, 0x69755b);
  } else if (kind === "wood") {
    for (let i = 0; i < 3; i++) {
      const o = box(
        g,
        i * 0.15 - 0.15,
        0.15 + i * 0.07,
        0,
        0.16,
        0.16,
        0.9,
        0x86704a,
      );
      o.rotation.y = 0.6 + i * 0.3;
    }
  } else if (kind === "portal") {
    cylinder(g, 0, 0.1, 0, 1.3, 0.2, 0x6b7466);
    const t = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.09, 5, 32),
      new THREE.MeshStandardMaterial({
        color: 0x8eada4,
        emissive: 0x5c9995,
        emissiveIntensity: 1.4,
      }),
    );
    t.position.y = 1.25;
    g.add(t);
    const l = new THREE.PointLight(0x89c9b9, 5, 6);
    l.position.y = 1;
    g.add(l);
  } else if (kind === "bench") {
    box(g, 0, 0.85, 0, 1.7, 0.2, 0.8, 0x9b7c50);
    for (const dx of [-0.65, 0.65])
      for (const dz of [-0.25, 0.25])
        box(g, dx, 0.4, dz, 0.13, 0.8, 0.13, 0x66533c);
    box(g, -0.3, 1.05, 0, 0.45, 0.25, 0.4, 0x737c78);
    box(g, 0.35, 1.02, 0.05, 0.5, 0.12, 0.1, 0xb2a179);
  } else if (kind === "stash") {
    box(g, 0, 0.4, 0, 1.3, 0.7, 0.8, 0x756142);
    box(g, 0, 0.8, 0, 1.36, 0.15, 0.86, 0x9b8251);
    box(g, 0, 0.48, 0.42, 0.2, 0.25, 0.05, 0xc9ac68);
  } else if (kind === "abyss") {
    for (const side of [-1, 1]) ruin(x + side * 1.2, z, 2.8);
    box(g, 0, 2.8, 0, 3, 0.5, 0.8, 0x737d68);
    const plane = box(g, 0, 1.4, 0, 1.8, 2.6, 0.25, 0x152b2a);
    (plane.material as THREE.MeshStandardMaterial).emissive.set(0x183e40);
  }
}
function enemy(x: number, z: number, boss = false, id = enemies.length) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(assetSprite(boss ? "knight" : "bandit"));
  const bar = box(g, 0, 2.12, 0, 0.8, 0.07, 0.03, 0xc8525c);
  bar.name = "enemyhp";
  if (boss) g.scale.setScalar(1.5);
  shadow(g);
  world.add(g);
  enemies.push({
    id,
    x,
    z,
    hp: boss ? 180 : 45,
    max: boss ? 180 : 45,
    mesh: g,
    attack: 0.9,
    boss,
  });
}
function buildZone(zone: string, resetPos = true) {
  for (const child of [...world.children]) {
    world.remove(child);
    child.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
  props = [];
  enemies = [];
  obstacles = [];
  seed = 42;
  state.zone = zone;
  if (zone === "forest") {
    scene.background = new THREE.Color(0x253e45);
    scene.fog = new THREE.FogExp2(0x253e45, 0.018);
    ambient.intensity = 2.1;
    sun.intensity = 3.2;
    const ground = box(world, 0, -0.4, 0, 54, 0.8, 54, 0x456848);
    ground.receiveShadow = true;
    for (let i = 0; i < 400; i++) {
      const x = range(-26, 26),
        z = range(-26, 26);
      box(
        world,
        x,
        0.015,
        z,
        range(0.3, 1.2),
        0.04,
        range(0.3, 1.2),
        [0x5a6f49, 0x62764c, 0x4b6142, 0x6a774d][i % 4],
      );
    }
    for (let i = 0; i < 100; i++) {
      const x = range(-25, 25),
        z = range(-25, 25);
      if (Math.abs(x) < 9 && z > -12 && z < 12) continue;
      tree(x, z, range(0.7, 1.5));
    }
    for (let z = -13; z < 17; z += 1.05)
      for (let x = -2; x <= 2; x++) {
        if (rnd() > 0.22) {
          const o = box(
            world,
            x * 1.02 + range(-0.12, 0.12),
            0.045,
            z,
            range(0.65, 0.95),
            0.1,
            range(0.65, 0.95),
            [0x92957a, 0x81896d, 0xa0a088][Math.floor(rnd() * 3)],
          );
          o.rotation.y = range(-0.1, 0.1);
        }
      }
    for (const [x, z, h] of [
      [-4, -4, 3],
      [4, -4, 3.7],
      [-4, -9, 2.1],
      [4, -9, 3],
      [-6, 4, 1.7],
      [6, 5, 2.3],
    ])
      ruin(x, z, h);
    box(world, 0, 0.12, -7, 6, 0.25, 5, 0x7e876c);
    for (let i = 0; i < 24; i++) {
      const x = range(-7, 7),
        z = range(-11, 10);
      if (Math.abs(x) > 2)
        box(
          world,
          x,
          0.12,
          z,
          range(0.3, 0.8),
          0.25,
          range(0.3, 0.7),
          0x92967a,
        );
    }
    if (state.shards < 3) {
      addProp("shard", -3, -5);
      addProp("shard", 5, 0);
      addProp("shard", -5, 7);
    }
    for (const [x, z] of [
      [3, 5],
      [-3, 1],
      [6, -7],
      [-6, -2],
      [4, 9],
    ])
      addProp("wood", x, z);
    for (const [x, z] of [
      [2, 4],
      [-2, 7],
      [6, 3],
      [-6, -5],
      [3, -9],
    ])
      addProp("herb", x, z);
    for (const [x, z] of [
      [7, 2],
      [-7, 3],
      [5, -10],
    ])
      addProp("ore", x, z);
    addProp("chest", -6, -7);
    addProp("chest", 6, 8);
    addProp("npc", -4, 3);
    addProp("abyss", 0, -13);
    enemy(7, -5);
    enemy(-7, -9);
    enemy(5, 11);
    if (resetPos) player.position.set(0, 0, 4);
    $("region").textContent = "Забытые руины";
    $("zone").textContent = "ЛЕС · ДЕНЬ";
    $("place").textContent = "Окраина Серого леса";
  } else if (zone === "hub") {
    scene.background = new THREE.Color(0x111b29);
    scene.fog = new THREE.FogExp2(0x111b29, 0.025);
    ambient.intensity = 1.1;
    sun.intensity = 1.3;
    for (let x = -5; x <= 5; x++)
      for (let z = -5; z <= 5; z++) {
        if (Math.abs(x) + Math.abs(z) > 8) continue;
        box(
          world,
          x * 1.15,
          -0.35,
          z * 1.15,
          1.12,
          0.7,
          1.12,
          (x + z) % 2 ? 0x41494c : 0x50575a,
        );
      }
    addProp("bench", -3, -2);
    addProp("stash", 3, -2);
    addProp("portal", 0, -4);
    for (const x of [-4, 4]) {
      cylinder(world, x, 0.3, 2, 0.35, 0.6, 0x827253);
      const l = new THREE.PointLight(0xffc46c, 10, 8);
      l.position.set(x, 1.1, 2);
      world.add(l);
      box(world, x, 0.8, 2, 0.15, 0.35, 0.15, 0xf6cc7c);
    }
    if (resetPos) player.position.set(0, 0, 2);
    $("region").textContent = "Астральный приют";
    $("zone").textContent = "МЕЖДУ МИРАМИ";
    $("place").textContent = "Ваше личное пространство";
  } else {
    scene.background = new THREE.Color(0x141c23);
    scene.fog = new THREE.FogExp2(0x141c23, 0.025);
    ambient.intensity = 0.85;
    sun.intensity = 0.7;
    box(world, 0, -0.4, 0, 22, 0.8, 24, 0x414b4c);
    for (let x = -10; x <= 10; x += 1.2)
      for (let z = -11; z <= 11; z += 1.2)
        box(
          world,
          x,
          0.01,
          z,
          1.17,
          0.05,
          1.17,
          Math.round(x + z) % 3 ? 0x454f50 : 0x3b4646,
        );
    for (let z = -11; z < 12; z += 2) {
      box(world, -11, 1, z, 1, 2, 1.95, 0x394346);
      box(world, 11, 1, z, 1, 2, 1.95, 0x394346);
    }
    for (const x of [-8, 8])
      for (const z of [-7, 4]) {
        ruin(x, z, 3);
        const l = new THREE.PointLight(0xffac4f, 18, 10);
        l.position.set(x, 2, z);
        world.add(l);
        box(world, x, 2, z + 0.5, 0.2, 0.45, 0.2, 0xffbc61);
      }
    addProp("portal", 0, 9);
    enemy(-4, -3);
    enemy(4, -5);
    enemy(0, -8, true);
    if (resetPos) player.position.set(0, 0, 7);
    $("region").textContent = "Тюрьма без имени";
    $("zone").textContent = "БЕЗДНА · ЭТАЖ 01";
    $("place").textContent = "Зал забытой печати";
  }
  const caption = document.querySelector(".mapcaption");
  if (caption)
    caption.innerHTML =
      zone === "hub"
        ? "АСТРАЛЬНЫЙ ПРИЮТ"
        : zone === "abyss"
          ? "БЕЗДНА · ЭТАЖ 01"
          : "ЗАБЫТЫЕ РУИНЫ";
  hudSignature = "";
  syncHUD();
}

let started = false;
const keys = new Set<string>();
let facing = new THREE.Vector3(0, 0, -1);
let dashTime = 0,
  dashCooldown = 0;
const dashVector = new THREE.Vector3(-1, 0, -1).normalize();
let hudSignature = "";
let attackTime = 0,
  novaTime = 0,
  combat = 0,
  castTime = 0,
  toastTimer = 0,
  dead = false;
let nearest: Prop | undefined;
const effects: { mesh: THREE.Mesh; life: number; max: number }[] = [];
let sound = false;
let audio: AudioContext | undefined;
function tone(freq = 300, dur = 0.12, type: OscillatorType = "sine") {
  if (!sound) return;
  audio ??= new AudioContext();
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    freq * 0.45,
    audio.currentTime + dur,
  );
  g.gain.setValueAtTime(0.04, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g);
  g.connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + dur);
}
function toast(text: string) {
  $("toast").textContent = text;
  toastTimer = 4;
}
function syncHUD() {
  const signature = [
    state.hp.toFixed(0),
    Math.floor(state.mp),
    state.level,
    state.xp,
    state.gold,
    state.herbs,
    state.shards,
    state.potions,
    state.blade,
    state.bossDefeated,
    state.herbalistDone,
    state.hero,
    Math.ceil(dashCooldown),
    maxHealth(state),
  ].join(":");
  if (signature === hudSignature) return;
  hudSignature = signature;
  if ($("gold")) {
    $("gold").textContent = String(state.gold);
    $("herbcount").textContent = String(state.herbs);
    $("sidequest").textContent = state.herbalistDone
      ? "Травница: поручение выполнено"
      : "Травница: соберите 3 целебные травы";
    $("dashcd").textContent =
      dashCooldown > 0 ? Math.ceil(dashCooldown) + "с" : "";
    $("heroname").textContent = heroNames[state.hero];
    $("hearts").innerHTML = Array.from(
      { length: 5 },
      (_, i) =>
        `<img src="/assets/heart.png" class="${(state.hp / maxHealth(state)) * 5 > i ? "" : "empty"}" alt="">`,
    ).join("");
  }
  const max = maxHealth(state);
  $("hpbar").style.width = `${(Math.max(0, state.hp) / max) * 100}%`;
  $("hptext").textContent = `${Math.ceil(state.hp)} / ${max}`;
  $("mpbar").style.width = `${(state.mp / 60) * 100}%`;
  $("mptext").textContent = `${Math.floor(state.mp)} / 60`;
  $("level").textContent = $("lvlbadge").textContent = String(state.level);
  $("potions").textContent = String(state.potions);
  $("xptext").textContent = `${state.xp} / ${state.level * 60} опыта`;
  $("questbar").style.width = `${(Math.min(3, state.shards) / 3) * 100}%`;
  $("questcount").innerHTML =
    `Осколки памяти <b>${Math.min(3, state.shards)} / 3</b>`;
  if (state.shards >= 3)
    $("quest").innerHTML = state.blade
      ? "Спуститесь в Бездну.<br>Победите стража печати."
      : "Откройте астральный приют (H).<br>Создайте клинок у верстака.";
  if (state.bossDefeated)
    $("quest").innerHTML =
      "Страж пал. Печать ещё цела.<br>Продолжение следует…";
}
function save() {
  state.x = player.position.x;
  state.z = player.position.z;
  try {
    localStorage.setItem("forest-ash-v2", JSON.stringify(state));
    $("savedot").style.color = "#c4bf85";
    setTimeout(() => ($("savedot").style.color = ""), 500);
  } catch {
    toast("Хранилище браузера недоступно");
  }
}
function burst(color: number, r: number) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.8, r, 48),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(player.position);
  mesh.position.y = 0.12;
  scene.add(mesh);
  effects.push({ mesh, life: 0.45, max: 0.45 });
}
function hitEnemy(e: Enemy, damage: number) {
  if (e.hp <= 0) return;
  e.hp -= damage;
  combat = 5;
  e.mesh.children.forEach((o) => {
    if (o instanceof THREE.Sprite) o.material.color.set(0xffdcb0);
  });
  tone(110, 0.15, "triangle");
  if (e.hp <= 0) {
    e.mesh.visible = false;
    state.xp += e.boss ? 90 : 20;
    state.wood += e.boss ? 3 : 1;
    state.kills++;
    state.gold += e.boss ? 40 : 8;
    if (e.boss) state.bossDefeated = true;
    toast(
      e.boss
        ? "Страж повержен · +90 опыта · Печать удержана"
        : "Тень рассеялась · +20 опыта · +1 древесина",
    );
    if (state.xp >= state.level * 60) {
      state.xp -= state.level * 60;
      state.level++;
      state.points += 2;
      state.hp = maxHealth(state);
      toast(`Новый уровень: ${state.level} · здоровье восстановлено`);
    }
    save();
  }
  syncHUD();
}
function attack(nova = false) {
  if (!started || dead || !$("modal").classList.contains("hidden")) return;
  if (nova) {
    if (novaTime > 0) return;
    if (state.mp < 20) {
      toast("Недостаточно маны");
      return;
    }
    state.mp -= 20;
    novaTime = 6;
    burst(0x9fcdd0, 3.2);
    tone(650, 0.5);
  } else {
    if (attackTime > 0) return;
    if (state.weapon === "staff") {
      if (state.mp < 3) {
        toast("Недостаточно маны");
        return;
      }
      state.mp -= 3;
    }
    attackTime = state.weapon === "sword" ? 0.45 : 0.65;
    if (state.weapon !== "sword") projectile();
    burst(0xd3d0a0, 1.6);
    tone(220, 0.09, "triangle");
  }
  castTime = 0;
  for (const e of enemies) {
    const d = Math.hypot(e.x - player.position.x, e.z - player.position.z);
    if (
      d <
        (nova
          ? 3.5
          : state.weapon === "bow"
            ? 7
            : state.weapon === "staff"
              ? 6
              : 2.1) &&
      (nova ||
        new THREE.Vector3(e.x - player.position.x, 0, e.z - player.position.z)
          .normalize()
          .dot(facing) > (state.weapon === "sword" ? -0.2 : 0.94))
    ) {
      if (net.joined && !net.isHost)
        send({
          type: "hit",
          enemy: e.id,
          range: nova
            ? 3.5
            : state.weapon === "bow"
              ? 7
              : state.weapon === "staff"
                ? 6
                : 2.1,
          damage: nova ? spellDamage(state) : damage(state),
        });
      else hitEnemy(e, nova ? spellDamage(state) : damage(state));
    }
  }
  syncHUD();
}
function heal() {
  if (!state.potions) {
    toast("Зелья закончились");
    return;
  }
  if (dead) return;
  state.potions--;
  state.hp = Math.min(maxHealth(state), state.hp + 50);
  burst(0xa3c88d, 1);
  tone(550, 0.3);
  syncHUD();
  save();
}
function portal() {
  if (dead) return;
  if (net.joined && !net.isHost) {
    toast("Переход между мирами выбирает хозяин");
    return;
  }
  if (combat > 0) {
    toast("Возвращение недоступно в бою");
    return;
  }
  castTime = 2;
  $("cast").style.display = "block";
}
function interact() {
  if (dead) return;
  if (!nearest) return;
  const p = nearest;
  if (p.kind === "npc") {
    herbalist();
    return;
  }
  if (["herb", "ore", "chest"].includes(p.kind)) {
    if (p.kind === "herb") {
      state.herbs++;
      toast("Целебная трава +1");
    }
    if (p.kind === "ore") {
      state.ore++;
      toast("Железная руда +1");
    }
    if (p.kind === "chest") {
      state.gold += 20;
      state.potions++;
      state.ore++;
      toast("Тайник открыт · 20 монет · зелье · руда");
    }
    state.collected.push(`${state.zone}:${p.kind}:${p.x}:${p.z}`);
    p.active = false;
    p.mesh.visible = false;
    tone(700, 0.2);
    syncHUD();
    save();
    return;
  }
  if (p.kind === "shard" || p.kind === "wood") {
    if (p.kind === "shard") {
      state.shards++;
      state.mp = Math.min(60, state.mp + 15);
      toast("Осколок памяти найден · «Печать… я уже видел её»");
    } else {
      state.wood++;
      toast("Древесина +1");
    }
    state.collected.push(`${state.zone}:${p.kind}:${p.x}:${p.z}`);
    p.active = false;
    p.mesh.visible = false;
    tone(700, 0.2);
    syncHUD();
    save();
  } else if (p.kind === "bench") craftMenu();
  else if (p.kind === "stash") stashMenu();
  else if (p.kind === "portal") {
    changeZone(state.zone === "hub" ? "forest" : "hub");
  } else if (p.kind === "abyss") {
    if (state.shards < 3) {
      toast("Печать не откликается. Найдите три осколка.");
      return;
    }
    changeZone("abyss");
  }
}
function changeZone(zone: string) {
  if (net.joined && !net.isHost) {
    toast("Переход между мирами выбирает хозяин");
    return;
  }
  buildZone(zone);
  if (net.joined) send({ type: "zone", zone });
  save();
  sendPosition();
}
function modal(html: string) {
  $("modalcontent").innerHTML = html;
  $("modal").classList.remove("hidden");
  keys.clear();
}
function inventory() {
  modal(
    `<div class="eyebrow">СНАРЯЖЕНИЕ И ПРИПАСЫ</div><h2>Всё, что вы унесли с собой</h2><div class="inventorylayout"><div class="paperdoll"><img src="/assets/${state.hero}-portrait.png" alt="${heroNames[state.hero]}"><h3>${heroNames[state.hero]}</h3><div class="equiprow">${icon(state.weapon === "staff" ? "crystal" : state.weapon)}${icon(state.armorEquipped ? "armor" : "feather")}</div><small>Урон ${damage(state)} · защита ${state.armorEquipped ? 4 : 0}</small><button id="openstats">Характеристики · ${state.points} очк.</button></div><div><div class="eyebrow">СУМКА · МАТЕРИАЛЫ И ПРЕДМЕТЫ</div><div class="itemgrid">${[
      ["wood", "Дерево", state.wood],
      ["herb", "Трава", state.herbs],
      ["ore", "Руда", state.ore],
      ["gem", "Память", state.shards],
      ["potion", "Зелье", state.potions],
      ["gold", "Монеты", state.gold],
    ]
      .map(
        ([id, name, n]) =>
          `<div class="item">${icon(String(id))}<span>${name}</span><strong>${n}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="eyebrow">НАЖМИТЕ, ЧТОБЫ ЭКИПИРОВАТЬ</div><div class="loadout">${(
      ["sword", "bow", "staff"] as Weapon[]
    )
      .filter((w) => w === "sword" || state[w])
      .map(
        (w) =>
          `<button data-weapon="${w}" class="${w === state.weapon ? "equipped" : ""}">${icon(w === "staff" ? "crystal" : w)}${{ sword: state.blade ? "Клинок пепла" : "Ржавый меч", bow: "Лесной лук", staff: "Рунный посох" }[w]}</button>`,
      )
      .join(
        "",
      )}${state.armor ? `<button id="equiparmor" class="${state.armorEquipped ? "equipped" : ""}">${icon("armor")}Кожаная броня</button>` : ""}</div><p class="note">Лук и посох бьют по узкому направлению курсора. Посох расходует ману. Облик героя выбирается отдельно от оружия.</p></div></div>`,
  );
  $("openstats").onclick = characterMenu;
  document.querySelectorAll<HTMLButtonElement>("[data-weapon]").forEach(
    (b) =>
      (b.onclick = () => {
        state.weapon = b.dataset.weapon as Weapon;
        save();
        updateAttackIcon();
        inventory();
      }),
  );
  if (state.armor)
    $("equiparmor").onclick = () => {
      state.armorEquipped = !state.armorEquipped;
      save();
      inventory();
    };
}
function craftMenu() {
  modal(
    `<div class="eyebrow">АСТРАЛЬНАЯ МАСТЕРСКАЯ · УРОВЕНЬ 1</div><h2>Придайте материи форму</h2><div class="resourcebar">${icon("wood")} ${state.wood} ${icon("ore")} ${state.ore} ${icon("herb")} ${state.herbs}</div><div class="recipelist">${recipes
      .map((r) => {
        const owned =
          r.id === "blade"
            ? state.blade
            : r.id === "potion"
              ? false
              : state[r.id];
        return `<div class="recipe">${icon(r.icon)}<div><h3>${r.name}</h3><p>${r.description}</p><small>${r.wood ? "Дерево " + r.wood + " · " : ""}${r.ore ? "Руда " + r.ore + " · " : ""}${r.herbs ? "Трава " + r.herbs : ""}${r.shard ? "Найденный осколок (катализатор)" : ""}</small></div><button data-craft="${r.id}" ${owned ? "disabled" : ""}>${owned ? "Создано" : "Создать"}</button></div>`;
      })
      .join("")}</div>`,
  );
  document.querySelectorAll<HTMLButtonElement>("[data-craft]").forEach(
    (b) =>
      (b.onclick = () => {
        const r = recipes.find((r) => r.id === b.dataset.craft)!;
        if (
          state.wood < r.wood ||
          state.ore < r.ore ||
          state.herbs < r.herbs ||
          (r.shard && state.shards < 1)
        ) {
          toast("Недостаточно материалов");
          return;
        }
        state.wood -= r.wood;
        state.ore -= r.ore;
        state.herbs -= r.herbs;
        if (r.id === "potion") state.potions++;
        else if (r.id === "blade") {
          state.blade = true;
          state.weapon = "sword";
        } else if (r.id === "armor") {
          state.armor = true;
          state.armorEquipped = true;
        } else {
          state[r.id] = true;
          state.weapon = r.id;
        }
        toast(r.name + " — создано");
        tone(550, 0.2);
        syncHUD();
        updateAttackIcon();
        save();
        craftMenu();
      }),
  );
}
function stashMenu() {
  modal(
    `<div class="eyebrow">ЛИЧНЫЙ СКЛАД · УРОВЕНЬ 1</div><h2>То, что останется</h2><p>Древесина в сумке: ${state.wood}<br>Древесина на складе: ${state.stash}</p><button id="deposit">Сложить древесину</button><button id="withdraw">Забрать со склада</button><p class="note">Склад и содержимое сумки сохраняются в этом браузере.</p>`,
  );
  $("deposit").onclick = () => {
    state.stash += state.wood;
    state.wood = 0;
    save();
    stashMenu();
  };
  $("withdraw").onclick = () => {
    state.wood += state.stash;
    state.stash = 0;
    save();
    stashMenu();
  };
}
$("close").onclick = () => $("modal").classList.add("hidden");
$("begin").onclick = () => {
  $("intro").classList.add("hidden");
  started = true;
  heroMenu();
  toast("WASD — движение · E — собрать · ЛКМ — удар");
};
$("inventory").onclick = inventory;
$("attack").onclick = () => attack();
$("nova").onclick = () => attack(true);
$("portal").onclick = portal;
$("heal").onclick = heal;
$("sound").onclick = () => {
  sound = !sound;
  $("sound").textContent = `Звук: ${sound ? "вкл." : "выкл."}`;
  tone(440, 0.2);
};
$("help").onclick = () =>
  modal(
    '<div class="eyebrow">ЛЕСНОЙ ПЕПЕЛ · 0.2</div><h2>Ваш первый путь</h2><p>WASD — движение относительно экрана<br>Пробел — рывок (3 секунды перезарядки)<br>C — характеристики и облик<br>ЛКМ — удар в сторону курсора<br>Q — круговой всплеск (20 маны, 6 секунд)<br>E — сбор и взаимодействие<br>R — лечебное зелье<br>H — переход в хаб вне боя (2 секунды)<br>I — инвентарь · Esc — закрыть окно<br>Колесо мыши — масштаб</p><p>Найдите три осколка, соберите древесину, создайте клинок в хабе. Вход в Бездну — на севере руин.</p><p class="note">Процедурная временная графика. Локальные сохранения, без аккаунтов. Кооператив — экспериментальный серверный relay, не P2P; хозяин управляет врагами. Публичный сервер должен работать всё время сессии.</p><button id="reset">Начать заново</button>',
  );
$("modalcontent").addEventListener("click", (e) => {
  if (
    (e.target as HTMLElement).id === "reset" &&
    confirm("Удалить локальное сохранение?")
  ) {
    localStorage.removeItem("forest-ash-v1");
    localStorage.removeItem("forest-ash-v2");
    location.reload();
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).tagName === "INPUT") return;
  const k = e.code;
  if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(k)) e.preventDefault();
  if (e.repeat) return;
  if (k === "Escape") {
    $("modal").classList.add("hidden");
    return;
  }
  if (!started || !$("modal").classList.contains("hidden")) return;
  keys.add(k);
  if (k === "Space") dash();
  if (k === "KeyC") characterMenu();
  if (k === "KeyE") interact();
  if (k === "KeyQ") attack(true);
  if (k === "KeyR") heal();
  if (k === "KeyH") portal();
  if (k === "KeyI") inventory();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => keys.clear());
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
canvas.addEventListener("pointermove", (e) => {
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    (-e.clientY / innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(floor, p))
    facing.copy(p.sub(player.position).setY(0).normalize());
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.button === 0) attack();
});
canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.015, 11, 28);
    resize();
  },
  { passive: false },
);
function resize() {
  const a = innerWidth / innerHeight;
  camera.left = -zoom * a;
  camera.right = zoom * a;
  camera.top = zoom;
  camera.bottom = -zoom;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
window.addEventListener("resize", resize);
resize();
// Room transport: host simulates enemies; server validates host-only snapshots.
const net = {
  ws: null as WebSocket | null,
  joined: false,
  isHost: false,
  code: "",
  id: "",
  count: 1,
};
const peers = new Map<
  string,
  { mesh: THREE.Group; target: THREE.Vector3; zone: string; hp: number }
>();
function send(m: object) {
  if (net.ws?.readyState === WebSocket.OPEN) net.ws.send(JSON.stringify(m));
}
function sendPosition() {
  send({
    type: "position",
    x: player.position.x,
    z: player.position.z,
    zone: state.zone,
    hp: state.hp,
    hero: state.hero,
  });
}
function partyMenu() {
  modal(
    `<div class="eyebrow">СОВМЕСТНАЯ ВЫЛАЗКА · ДО 4 ИГРОКОВ</div><h2>Не уходите в одиночку</h2>${net.joined ? `<p>Код вашей комнаты</p><div class="roomcode">${net.code}</div><p>${net.isHost ? "Вы — хозяин мира." : "Вы — гость."} В отряде: ${net.count} / 4</p><button id="copycode">Скопировать код</button>` : '<p>Создайте комнату или введите код друга.<br>Участники появляются в астральном приюте.</p><button id="createroom" class="primary">Создать комнату</button><input id="roominput" maxlength="6" placeholder="КОД КОМНАТЫ" autocomplete="off"><button id="joinroom">Присоединиться</button>'}<p class="note">Экспериментальный сетевой тест через этот сервер. Делитесь ссылкой на игру и кодом. При выходе хозяина сессия заканчивается. Сюжет и сбор ресурсов пока локальны; сетевой обмен предметами и блокировка контейнеров ещё не реализованы.</p>`,
  );
  if (net.joined)
    $("copycode").onclick = () => {
      navigator.clipboard
        ?.writeText(net.code)
        .then(() => toast("Код скопирован"))
        .catch(() => toast(net.code));
    };
  else {
    $("createroom").onclick = () => connect("");
    $("joinroom").onclick = () => {
      const code = ($("roominput") as HTMLInputElement).value
        .trim()
        .toUpperCase();
      if (code.length !== 6) {
        toast("Введите код из 6 символов");
        return;
      }
      connect(code);
    };
  }
}
$("partybtn").onclick = partyMenu;
function connect(code: string) {
  if (net.ws) net.ws.close();
  const ws = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/party`,
  );
  net.ws = ws;
  ws.onopen = () => send({ type: "join", code });
  ws.onerror = () => toast("Не удалось подключиться к сетевому серверу");
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.type === "error") {
      toast(m.message);
      return;
    }
    if (m.type === "joined") {
      net.joined = true;
      net.id = m.id;
      net.code = m.code;
      net.isHost = m.host === m.id;
      buildZone("hub");
      save();
      partyMenu();
      sendPosition();
    } else if (m.type === "party") {
      net.count = m.count;
      $("partycount").textContent = `${m.count} / 4`;
      if (net.isHost) {
        send({ type: "zone", zone: state.zone });
        sendPosition();
      }
    } else if (m.type === "position") {
      let p = peers.get(m.id);
      if (!p) {
        const mesh = new THREE.Group();
        mesh.add(assetSprite(heroes.includes(m.hero) ? m.hero : "warrior"));
        shadow(mesh);
        scene.add(mesh);
        p = {
          mesh,
          target: new THREE.Vector3(m.x, 0, m.z),
          zone: m.zone,
          hp: m.hp,
        };
        mesh.position.copy(p.target);
        peers.set(m.id, p);
      }
      p.target.set(Number(m.x) || 0, 0, Number(m.z) || 0);
      p.zone = m.zone;
      p.hp = m.hp;
      const ps = p.mesh.children[0] as THREE.Sprite;
      if (heroes.includes(m.hero)) {
        const tex = textures.get(m.hero) || assetSprite(m.hero).material.map;
        ps.material.map = tex!;
      }
      p.mesh.visible = m.zone === state.zone;
      if (m.hp <= 0) p.mesh.children[0].rotation.z = Math.PI / 2;
      else p.mesh.children[0].rotation.z = 0;
    } else if (m.type === "zone" && !net.isHost && m.zone !== state.zone) {
      buildZone(m.zone);
      save();
      sendPosition();
    } else if (m.type === "world" && !net.isHost) {
      for (const v of m.enemies || []) {
        const e = enemies.find((e) => e.id === v.id);
        if (e) {
          e.x = v.x;
          e.z = v.z;
          e.hp = v.hp;
          e.mesh.position.set(e.x, 0, e.z);
          e.mesh.visible = e.hp > 0;
        }
      }
    } else if (m.type === "hit" && net.isHost) {
      const p = peers.get(m.id),
        e = enemies.find((e) => e.id === m.enemy);
      if (
        p &&
        p.zone === state.zone &&
        e &&
        p.target.distanceTo(e.mesh.position) <
          Math.min(7.5, Number(m.range) || 4) + 0.5
      )
        hitEnemy(e, Math.min(100, Math.max(0, Number(m.damage) || 0)));
    } else if (m.type === "revive" && m.target === net.id && dead) {
      dead = false;
      state.hp = 50;
      $("modal").classList.add("hidden");
      toast("Союзник поднял вас");
      syncHUD();
    } else if (m.type === "left") {
      const p = peers.get(m.id);
      if (p) {
        scene.remove(p.mesh);
        peers.delete(m.id);
      }
      net.count = m.count;
      $("partycount").textContent = `${m.count} / 4`;
    } else if (m.type === "closed") {
      toast("Хозяин покинул мир. Сессия завершена.");
      net.joined = false;
    }
  };
  ws.onclose = () => {
    net.joined = false;
    net.count = 1;
    for (const p of peers.values()) scene.remove(p.mesh);
    peers.clear();
    $("partycount").textContent = "1 / 4";
    if (net.code) toast("Сетевое соединение закрыто");
  };
}
function death() {
  dead = true;
  state.hp = 0;
  state.xp = 0;
  castTime = 0;
  save();
  syncHUD();
  modal(
    '<div class="eyebrow">ПАМЯТЬ НЕ ИСЧЕЗАЕТ</div><h2>Вы растворились в тишине</h2><p>Найденные вещи остались с вами.<br>Опыт до следующего уровня потерян.</p><button id="respawn" class="primary">Вернуться в приют</button><p class="note">В кооперативе союзник может подойти и нажать E, чтобы поднять вас.</p>',
  );
  $("respawn").onclick = () => {
    dead = false;
    state.hp = maxHealth(state);
    state.mp = 60;
    $("modal").classList.add("hidden");
    if (net.joined && !net.isHost) {
      player.position.set(0, 0, state.zone === "abyss" ? 7 : 3);
    } else changeZone("hub");
    syncHUD();
    save();
  };
}
const mapctx = ($("map") as HTMLCanvasElement).getContext("2d")!;
function minimap() {
  const c = mapctx;
  c.clearRect(0, 0, 180, 150);
  c.fillStyle = "#182b22";
  c.fillRect(0, 0, 180, 150);
  c.strokeStyle = "#6e7d5330";
  for (let i = 0; i < 180; i += 15) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, 150);
    c.stroke();
  }
  const conv = (x: number, z: number) => [90 + (x - z) * 2, 70 + (x + z)];
  c.fillStyle = "#7b88614d";
  for (const o of obstacles) {
    const [x, y] = conv(o.x, o.z);
    c.fillRect(x - 2, y - 2, 4, 4);
  }
  c.strokeStyle = "#b5ab7955";
  c.beginPath();
  for (let i = -13; i < 16; i++) {
    const [x, y] = conv(0, i);
    if (i === -13) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  for (const p of props) {
    if (!p.active) continue;
    const [x, y] = conv(p.x, p.z);
    c.fillStyle = p.kind === "shard" ? "#b4dbce" : "#a39465";
    c.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
  c.fillStyle = "#dca67c";
  for (const e of enemies)
    if (e.hp > 0) {
      const [x, y] = conv(e.x, e.z);
      c.fillRect(x - 1, y - 1, 2, 2);
    }
  const [x, y] = conv(player.position.x, player.position.z);
  c.fillStyle = "#f5e1a8";
  c.beginPath();
  c.moveTo(x, y - 4);
  c.lineTo(x + 3, y + 3);
  c.lineTo(x - 3, y + 3);
  c.fill();
}
function updateAttackIcon() {
  $("attack").querySelector("span")!.innerHTML = icon(
    state.weapon === "staff" ? "crystal" : state.weapon,
  );
}
function applyHero() {
  const temp = assetSprite(state.hero);
  heroSprite.material.map = temp.material.map;
  heroSprite.material.color.set(0xffffff);
  temp.material.dispose();
  document
    .querySelectorAll<HTMLImageElement>(".hero-portrait")
    .forEach((i) => (i.src = `/assets/${state.hero}-portrait.png`));
  updateAttackIcon();
}
function heroMenu() {
  modal(
    `<div class="eyebrow">НЕ КЛАСС. ВАША НОВАЯ ИСТОРИЯ.</div><h2>Кем вы проснётесь?</h2><p>Выберите облик. Умения и дальность боя определяет экипированное оружие — его можно менять.</p><div class="heroselect">${heroes.map((h) => `<button data-hero="${h}" class="${h === state.hero ? "selected" : ""}"><img src="/assets/${h}-portrait.png" alt="${heroNames[h]}"><b>${heroNames[h]}</b></button>`).join("")}</div><button id="confirmhero" class="primary">Продолжить путь →</button>`,
  );
  document.querySelectorAll<HTMLButtonElement>("[data-hero]").forEach(
    (b) =>
      (b.onclick = () => {
        state.hero = b.dataset.hero as Hero;
        applyHero();
        save();
        heroMenu();
      }),
  );
  $("confirmhero").onclick = () => $("modal").classList.add("hidden");
}
function characterMenu() {
  modal(
    `<div class="eyebrow">РАЗВИТИЕ · УРОВЕНЬ ${state.level}</div><h2>Память тела</h2><div class="statslayout"><img class="statportrait" src="/assets/${state.hero}-portrait.png" alt="Герой"><div><p>Свободные очки: <b>${state.points}</b></p>${(["strength", "vitality", "focus"] as const).map((k) => `<div class="statrow"><div><b>${{ strength: "Сила", vitality: "Жизненная сила", focus: "Сосредоточение" }[k]} · ${state[k]}</b><small>${{ strength: "+3 урона оружием", vitality: "+10 максимального HP", focus: "+5 урона всплеском" }[k]}</small></div><button data-stat="${k}" ${state.points ? "" : "disabled"}>＋</button></div>`).join("")}<p class="note">Урон: ${damage(state)} · всплеск: ${spellDamage(state)}<br>Макс. здоровье: ${maxHealth(state)} · защита: ${state.armorEquipped ? 4 : 0}<br>За каждый уровень: 2 очка.</p><button id="changehero">Изменить облик</button></div></div>`,
  );
  $("changehero").onclick = heroMenu;
  document.querySelectorAll<HTMLButtonElement>("[data-stat]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!state.points) return;
        const k = b.dataset.stat as "strength" | "vitality" | "focus";
        state[k]++;
        state.points--;
        if (k === "vitality") state.hp += 10;
        syncHUD();
        save();
        characterMenu();
      }),
  );
}
function herbalist() {
  modal(
    `<div class="eyebrow">ЭЛЛА · ЛЕСНАЯ ТРАВНИЦА</div><div class="npcdialog"><img src="/assets/healer-portrait.png" alt="Элла"><div><h2>Лес лечит тех, кто слушает</h2><p>«Ты не помнишь дорогу? Не торопись. Иногда сначала нужно помочь другому, чтобы найти себя».</p><p>${state.herbalistDone ? "«Спасибо за травы. Если понадобятся зелья — заходи»." : "Принеси 3 целебные травы. Я дам тебе 25 монет и 2 лечебных зелья."}</p><button id="deliverherbs" ${state.herbalistDone ? "disabled" : ""}>${state.herbalistDone ? "Поручение выполнено" : `Отдать травы (${state.herbs}/3)`}</button><div class="shopline">${icon("potion")}<span>Лечебное зелье · 12 монет</span><button id="buy">Купить</button></div><button id="sellore">Продать 1 руду · +6 монет</button></div></div>`,
  );
  $("deliverherbs").onclick = () => {
    if (state.herbalistDone) return;
    if (state.herbs < 3) {
      toast("Нужно три целебные травы");
      return;
    }
    state.herbs -= 3;
    state.herbalistDone = true;
    state.gold += 25;
    state.potions += 2;
    toast("Поручение выполнено · +25 монет · +2 зелья");
    syncHUD();
    save();
    herbalist();
  };
  $("buy").onclick = () => {
    if (state.gold < 12) {
      toast("Недостаточно монет");
      return;
    }
    state.gold -= 12;
    state.potions++;
    syncHUD();
    save();
    herbalist();
  };
  $("sellore").onclick = () => {
    if (!state.ore) {
      toast("Нет руды на продажу");
      return;
    }
    state.ore--;
    state.gold += 6;
    syncHUD();
    save();
    herbalist();
  };
}
function dash() {
  if (
    dashCooldown ||
    dead ||
    !started ||
    !$("modal").classList.contains("hidden")
  )
    return;
  dashTime = 0.22;
  dashCooldown = 3;
  castTime = 0;
  const v = new THREE.Vector3();
  if (keys.has("KeyW")) v.add(new THREE.Vector3(-1, 0, -1));
  if (keys.has("KeyS")) v.add(new THREE.Vector3(1, 0, 1));
  if (keys.has("KeyA")) v.add(new THREE.Vector3(-1, 0, 1));
  if (keys.has("KeyD")) v.add(new THREE.Vector3(1, 0, -1));
  dashVector.copy(v.lengthSq() ? v.normalize() : facing);
  burst(0xa1daca, 0.8);
  tone(350, 0.12);
}
function projectile() {
  const end = player.position
    .clone()
    .addScaledVector(facing, state.weapon === "bow" ? 7 : 6);
  const points = [
    player.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
    end.add(new THREE.Vector3(0, 0.9, 0)),
  ];
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: state.weapon === "bow" ? 0xe6c491 : 0x92b6ff,
      transparent: true,
      opacity: 0.9,
    }),
  );
  scene.add(line);
  setTimeout(() => {
    scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
  }, 130);
}
$("statsbtn").onclick = characterMenu;
$("dash").onclick = dash;
let prev = performance.now(),
  elapsed = 0,
  netTick = 0,
  saveTick = 0,
  mapTick = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  elapsed += dt;
  dashTime = Math.max(0, dashTime - dt);
  dashCooldown = Math.max(0, dashCooldown - dt);
  attackTime = Math.max(0, attackTime - dt);
  novaTime = Math.max(0, novaTime - dt);
  combat = Math.max(0, combat - dt);
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $("toast").textContent = "";
  }
  if (started && !dead) {
    state.mp = Math.min(60, state.mp + dt * 2.2);
    if (state.zone === "hub")
      state.hp = Math.min(maxHealth(state), state.hp + dt * 4);
    const move = new THREE.Vector3();
    const active = $("modal").classList.contains("hidden");
    if (active) {
      if (keys.has("KeyW")) move.add(new THREE.Vector3(-1, 0, -1));
      if (keys.has("KeyS")) move.add(new THREE.Vector3(1, 0, 1));
      if (keys.has("KeyA")) move.add(new THREE.Vector3(-1, 0, 1));
      if (keys.has("KeyD")) move.add(new THREE.Vector3(1, 0, -1));
    }
    if (dashTime > 0 && active) move.copy(dashVector);
    if (move.lengthSq()) {
      move.normalize().multiplyScalar(dt * (dashTime > 0 ? 13 : 4.1));
      castTime = 0;
      const next = player.position.clone().add(move);
      const bound =
        state.zone === "hub" ? 5.3 : state.zone === "abyss" ? 10 : 24;
      if (
        Math.abs(next.x) < bound &&
        Math.abs(next.z) < bound &&
        !obstacles.some(
          (o) => Math.hypot(next.x - o.x, next.z - o.z) < o.r + 0.3,
        ) &&
        !(
          state.zone === "hub" &&
          Math.abs(next.x / 1.15) + Math.abs(next.z / 1.15) > 8.4
        )
      )
        player.position.copy(next);
      heroSprite.position.y = 0.95 + Math.sin(elapsed * 15) * 0.045;
      heroSprite.scale.x = move.x + move.z < 0 ? -1.2 : 1.2;
    } else heroSprite.position.y = 0.95 + Math.sin(elapsed * 2) * 0.015;
    if (castTime > 0) {
      castTime -= dt;
      $("cast").style.display = "block";
      $("cast").children[1].setAttribute(
        "style",
        `width:${((2 - castTime) / 2) * 100}%`,
      );
      if (castTime <= 0) {
        changeZone(state.zone === "hub" ? "forest" : "hub");
        tone(300, 0.5);
      }
    } else $("cast").style.display = "none";
    nearest = props
      .filter(
        (p) =>
          p.active &&
          Math.hypot(p.x - player.position.x, p.z - player.position.z) < 1.9,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - player.position.x, a.z - player.position.z) -
          Math.hypot(b.x - player.position.x, b.z - player.position.z),
      )[0];
    const labels: Record<string, string> = {
      herb: "Собрать целебную траву",
      ore: "Собрать железную руду",
      chest: "Открыть тайник",
      npc: "Поговорить с травницей",
      shard: "Поднять осколок памяти",
      wood: "Собрать древесину",
      bench: "Открыть верстак",
      stash: "Личный склад",
      portal:
        state.zone === "hub" ? "Вернуться в лес" : "Войти в астральный приют",
      abyss: "Спуститься в Бездну",
    };
    $("prompt").style.display = nearest ? "block" : "none";
    if (nearest) $("prompt").textContent = `[ E ]  ${labels[nearest.kind]}`;
    for (const [id, p] of peers) {
      if (
        p.hp <= 0 &&
        p.zone === state.zone &&
        p.mesh.position.distanceTo(player.position) < 2
      ) {
        $("prompt").style.display = "block";
        $("prompt").textContent = "[ E ] Поднять союзника";
        if (keys.has("KeyE")) {
          send({ type: "revive", target: id });
          keys.delete("KeyE");
          toast("Союзник поднят");
        }
      }
    }
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const bar = e.mesh.getObjectByName("enemyhp");
      if (bar) bar.scale.x = Math.max(0, e.hp / e.max);
      e.attack -= dt;
      if (!net.joined || net.isHost) {
        let target = player.position;
        let distance = Math.hypot(e.x - target.x, e.z - target.z);
        for (const p of peers.values()) {
          const d = Math.hypot(e.x - p.target.x, e.z - p.target.z);
          if (p.zone === state.zone && p.hp > 0 && d < distance) {
            target = p.target;
            distance = d;
          }
        }
        if (distance < 7 && distance > 1.1) {
          const v = new THREE.Vector3(target.x - e.x, 0, target.z - e.z)
            .normalize()
            .multiplyScalar(dt * (e.boss ? 1.3 : 1.65));
          e.x += v.x;
          e.z += v.z;
        }
        e.mesh.position.set(e.x, 0, e.z);
      }
      const d = Math.hypot(e.x - player.position.x, e.z - player.position.z);
      if (d < 1.4 && e.attack <= 0) {
        e.attack = 1.3;
        if (dashTime > 0) continue;
        state.hp -= Math.max(
          1,
          (e.boss ? 22 : 9) - (state.armorEquipped ? 4 : 0),
        );
        combat = 5;
        castTime = 0;
        tone(80, 0.2, "sawtooth");
        burst(0xbf795e, 0.6);
        if (state.hp <= 0) {
          death();
          break;
        }
      }
      e.mesh.children.forEach((o) => {
        if (o instanceof THREE.Sprite)
          o.material.color.lerp(new THREE.Color(0xffffff), dt * 4);
      });
      e.mesh.position.y = Math.sin(elapsed * 4 + e.id) * 0.035;
    }
    syncHUD();
  }
  for (const p of props)
    if (p.active && p.kind === "shard") {
      p.mesh.children[0].rotation.y = elapsed;
      p.mesh.children[0].position.y = 0.65 + Math.sin(elapsed * 2 + p.x) * 0.13;
    }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    e.mesh.scale.setScalar(1 + (1 - e.life / e.max) * 0.5);
    (e.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
      0,
      e.life / e.max,
    );
    if (e.life <= 0) {
      scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      (e.mesh.material as THREE.Material).dispose();
      effects.splice(i, 1);
    }
  }
  const cd = $("cooldown");
  cd.style.display = novaTime > 0 ? "flex" : "none";
  cd.textContent = String(Math.ceil(novaTime));
  camera.position.copy(player.position).add(new THREE.Vector3(22, 27, 22));
  camera.lookAt(player.position.x, 0, player.position.z);
  renderer.render(scene, camera);
  for (const p of peers.values()) {
    p.mesh.position.lerp(p.target, Math.min(1, dt * 12));
    p.mesh.visible = p.zone === state.zone;
  }
  netTick += dt;
  saveTick += dt;
  mapTick += dt;
  if (netTick > 0.1 && net.joined) {
    sendPosition();
    if (net.isHost)
      send({
        type: "world",
        enemies: enemies.map((e) => ({ id: e.id, x: e.x, z: e.z, hp: e.hp })),
      });
    netTick = 0;
  }
  if (saveTick > 5 && started) {
    save();
    saveTick = 0;
  }
  if (mapTick > 0.2) {
    minimap();
    mapTick = 0;
  }
}
buildZone(state.zone, false);
applyHero();
requestAnimationFrame(frame);
window.addEventListener("beforeunload", save);
