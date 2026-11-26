/* ------------------------------------------------------------------
 * World data: tilemap, mazes, interactable things, regions.
 * Pure data module (no DOM) – deterministic, built once at import time.
 * ------------------------------------------------------------------ */
import type { LocationId } from "@/game/types";

export const T = 48;
export const W = 104;
export const H = 76;
export const EXS = 2; // exploration (fog) cell size in tiles
export const EXW = W / EXS;
export const EXH = H / EXS;

export const G = { GRASS: 0, PATH: 1, SOIL: 2, WATER: 3, BRIDGE: 4, FOREST: 5, MEADOW: 6, PEN: 7, PUDDLE: 8, START: 9, FINISH: 10, PLANK: 11, PIT: 12 } as const;
export const O = {
  NONE: 0, TREE: 1, PINE: 2, APPLE: 3, CORN: 4, HEDGE: 5, FENCE: 6, LOWFENCE: 7, ROCK: 8, BUSH: 9, THORN: 10, BLOCK: 11, FLOWER: 12, TALLGRASS: 13,
  SIGN: 14, STUMP: 15, VEG: 16, MAGIC: 17, GATE: 18, MAZEGATE: 19, SECRET: 20, SECRETBUSH: 21, HOUSE: 22, BARN: 23, COOP: 24, MILL: 25, WELL: 26, LILY: 27,
} as const;

/** 1 = solid, 2 = low obstacle (jumpable), 3 = hazard (thorn: jumpable / cuttable) */
export const SOLID = new Uint8Array(40);
[O.TREE, O.PINE, O.APPLE, O.CORN, O.HEDGE, O.FENCE, O.ROCK, O.BUSH, O.BLOCK, O.SIGN, O.STUMP, O.VEG, O.MAGIC, O.HOUSE, O.BARN, O.COOP, O.MILL, O.WELL].forEach((o) => (SOLID[o] = 1));
SOLID[O.LOWFENCE] = 2;
SOLID[O.THORN] = 3;
export const PATHLIKE = new Uint8Array(20);
[G.PATH, G.BRIDGE, G.PUDDLE, G.START, G.FINISH, G.PLANK, G.PIT].forEach((g) => (PATHLIKE[g] = 1));

export type ThingKind =
  | "plot" | "apple" | "hay" | "flower" | "mushroom" | "dock" | "nest" | "cardspot" | "chest" | "key" | "button" | "door" | "gate" | "mazegate" | "finish" | "sign" | "boulder";

export interface Thing {
  id: string;
  kind: ThingKind;
  tx: number;
  ty: number;
  idx?: number;
  maze?: number;
  card?: string;
  locked?: boolean;
  solid?: boolean;
  prop?: number;
  text?: string;
  door?: string;
  pit?: [number, number];
}

export interface MazeInfo {
  id: string;
  idx: number;
  name: string;
  icon: string;
  reward: number;
  level: number;
  special: string;
  diff: string;
  desc: string;
  x: number;
  y: number;
  w: number;
  h: number;
  start: [number, number];
  entrance: [number, number];
  outside: [number, number];
  finish: [number, number];
  cards: number;
  loc: LocationId;
}

export interface Region {
  id: string;
  name: string;
  icon: string;
  loc: LocationId;
  desc: string;
  maze?: number;
}

export const ground = new Uint8Array(W * H);
export const obj = new Uint8Array(W * H);
export const things: Thing[] = [];
const reserved = new Uint8Array(W * H);

const I = (x: number, y: number) => x + y * W;
const inb = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash2(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function riverX(y: number): number {
  return 58 + Math.round(2.2 * Math.sin(y / 5.5) + 1.1 * Math.sin(y / 2.6 + 1));
}

/* ---------------- helpers ---------------- */
function rect(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, i: number) => void) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) fn(x, y, I(x, y));
}
function road(x0: number, y0: number, x1: number, y1: number, w = 2) {
  const hor = y0 === y1;
  rect(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) + (hor ? 0 : w - 1), Math.max(y0, y1) + (hor ? w - 1 : 0), (_x, _y, i) => {
    ground[i] = ground[i] === G.WATER || ground[i] === G.BRIDGE ? G.BRIDGE : G.PATH;
    obj[i] = O.NONE;
    reserved[i] = 1;
  });
}
function building(type: number, x: number, y: number, w: number, h: number) {
  rect(x - 1, y - 2, x + w, y + h, (_x, _y, i) => (reserved[i] = 1));
  rect(x, y, x + w - 1, y + h - 1, (_x, _y, i) => (obj[i] = O.BLOCK));
  obj[I(x, y + h - 1)] = type;
}
function fenceRect(x0: number, y0: number, x1: number, y1: number) {
  rect(x0, y0, x1, y1, (x, y, i) => {
    reserved[i] = 1;
    if (x === x0 || x === x1 || y === y0 || y === y1) obj[i] = O.FENCE;
  });
}
function addThing(t: Thing): Thing {
  things.push(t);
  reserved[I(t.tx, t.ty)] = 1;
  return t;
}
function sign(x: number, y: number, text: string) {
  obj[I(x, y)] = O.SIGN;
  addThing({ id: `sign_${x}_${y}`, kind: "sign", tx: x, ty: y, text });
}

/* ---------------- maze builder ---------------- */
class MazeGrid {
  w: number;
  h: number;
  open: Uint8Array;
  cw: number;
  ch: number;
  constructor(cw: number, ch: number) {
    this.cw = cw;
    this.ch = ch;
    this.w = cw * 2 + 1;
    this.h = ch * 2 + 1;
    this.open = new Uint8Array(this.w * this.h);
  }
  ci(cx: number, cy: number) {
    return cx + cy * this.cw;
  }
  li(lx: number, ly: number) {
    return lx + ly * this.w;
  }
  cellTile(c: number): [number, number] {
    return [1 + 2 * (c % this.cw), 1 + 2 * Math.floor(c / this.cw)];
  }
  edgeTile(a: number, b: number): [number, number] {
    const A = this.cellTile(a);
    const B = this.cellTile(b);
    return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  }
  link(a: number, b: number) {
    const A = this.cellTile(a);
    const B = this.cellTile(b);
    const E = this.edgeTile(a, b);
    this.open[this.li(A[0], A[1])] = 1;
    this.open[this.li(B[0], B[1])] = 1;
    this.open[this.li(E[0], E[1])] = 1;
  }
  path(cells: [number, number][]) {
    for (let i = 0; i < cells.length - 1; i++) this.link(this.ci(cells[i][0], cells[i][1]), this.ci(cells[i + 1][0], cells[i + 1][1]));
  }
  nbrs(c: number): number[] {
    const out: number[] = [];
    const cx = c % this.cw;
    const cy = Math.floor(c / this.cw);
    const [lx, ly] = this.cellTile(c);
    if (cx > 0 && this.open[this.li(lx - 1, ly)]) out.push(c - 1);
    if (cx < this.cw - 1 && this.open[this.li(lx + 1, ly)]) out.push(c + 1);
    if (cy > 0 && this.open[this.li(lx, ly - 1)]) out.push(c - this.cw);
    if (cy < this.ch - 1 && this.open[this.li(lx, ly + 1)]) out.push(c + this.cw);
    return out;
  }
  bfs(start: number, block?: [number, number]) {
    const n = this.cw * this.ch;
    const dist = new Int32Array(n).fill(-1);
    const parent = new Int32Array(n).fill(-1);
    const q = [start];
    dist[start] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      for (const nb of this.nbrs(c)) {
        if (dist[nb] >= 0) continue;
        if (block && ((block[0] === c && block[1] === nb) || (block[1] === c && block[0] === nb))) continue;
        dist[nb] = dist[c] + 1;
        parent[nb] = c;
        q.push(nb);
      }
    }
    return { dist, parent };
  }
  generate(rng: () => number, start: number, skip: number[]) {
    const { cw, ch } = this;
    const vis = new Uint8Array(cw * ch);
    skip.forEach((s) => (vis[s] = 1));
    const act = [start];
    vis[start] = 1;
    const st = this.cellTile(start);
    this.open[this.li(st[0], st[1])] = 1;
    while (act.length) {
      const k = rng() < 0.32 ? Math.floor(rng() * act.length) : act.length - 1;
      const c = act[k];
      const cx = c % cw;
      const cy = Math.floor(c / cw);
      const opts: number[] = [];
      if (cx > 0 && !vis[c - 1]) opts.push(c - 1);
      if (cx < cw - 1 && !vis[c + 1]) opts.push(c + 1);
      if (cy > 0 && !vis[c - cw]) opts.push(c - cw);
      if (cy < ch - 1 && !vis[c + cw]) opts.push(c + cw);
      if (!opts.length) {
        act.splice(k, 1);
        continue;
      }
      const n = opts[Math.floor(rng() * opts.length)];
      vis[n] = 1;
      this.link(c, n);
      act.push(n);
    }
  }
}

interface MItem {
  kind: ThingKind;
  lx: number;
  ly: number;
  card?: string;
  locked?: boolean;
  solid?: boolean;
  prop?: number;
  pit?: [number, number];
}
interface MBuild {
  m: MazeGrid;
  gnd: Int8Array;
  ob: Int8Array;
  items: MItem[];
  start: [number, number];
  finish: [number, number];
}
function newBuild(m: MazeGrid, start: [number, number], finish: [number, number]): MBuild {
  return { m, gnd: new Int8Array(m.w * m.h).fill(-1), ob: new Int8Array(m.w * m.h).fill(-1), items: [], start, finish };
}

/** MAZE 1 – hand designed: exactly 3 junctions, 3 dead ends with cards. */
function buildMaze1(): MBuild {
  const m = new MazeGrid(7, 5);
  m.path([[0, 4], [0, 3], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [4, 2], [4, 3], [5, 3], [5, 2], [5, 1], [5, 0], [6, 0], [6, 1], [6, 2]]);
  m.path([[1, 2], [1, 3], [1, 4], [2, 4], [3, 4]]);
  m.path([[3, 1], [2, 1], [2, 2], [2, 3]]);
  m.path([[5, 3], [5, 4], [6, 4], [6, 3]]);
  const b = newBuild(m, m.cellTile(m.ci(0, 4)), m.cellTile(m.ci(6, 2)));
  const card = (cx: number, cy: number, id: string, prop: number) => {
    const [lx, ly] = m.cellTile(m.ci(cx, cy));
    b.items.push({ kind: "cardspot", lx, ly, card: id, prop });
  };
  card(3, 4, "corn", 2);
  card(2, 3, "carrot", 0);
  card(6, 3, "strawberry", 1);
  const e1 = m.edgeTile(m.ci(2, 0), m.ci(3, 0));
  b.ob[m.li(e1[0], e1[1])] = O.LOWFENCE;
  const e2 = m.edgeTile(m.ci(4, 1), m.ci(4, 2));
  b.gnd[m.li(e2[0], e2[1])] = G.PUDDLE;
  return b;
}

interface GenOpts {
  cards: string[];
  chests: { card: string; locked?: boolean }[];
  stream?: number;
  vault?: [number, number];
  vaultCard?: string;
}

/** Procedural (seeded) maze with guaranteed-solvable obstacle & key placement. */
function buildGenerated(cw: number, ch: number, seed: number, startCell: [number, number], o: GenOpts): MBuild {
  const rng = mulberry32(seed);
  const m = new MazeGrid(cw, ch);
  const S = m.ci(startCell[0], startCell[1]);
  const V = o.vault ? m.ci(o.vault[0], o.vault[1]) : -1;
  m.generate(rng, S, V >= 0 ? [V] : []);
  const { dist, parent } = m.bfs(S);
  const cells: number[] = [];
  for (let c = 0; c < cw * ch; c++) if (c !== V && dist[c] >= 0) cells.push(c);
  const leaves = cells.filter((c) => c !== S && m.nbrs(c).length === 1);
  let F = leaves[0];
  for (const l of leaves) if (dist[l] > dist[F]) F = l;
  const sol: number[] = [];
  for (let c = F; c !== -1; c = parent[c]) sol.unshift(c);
  const onSol = new Set(sol);
  const L = sol.length - 1;
  const streamX = o.stream !== undefined ? o.stream * 2 : -1;
  const b = newBuild(m, m.cellTile(S), m.cellTile(F));
  const eT = (i: number) => m.edgeTile(sol[i], sol[i + 1]);
  const usedEdges = new Set<number>();
  const edgeOk = (i: number) => i >= 1 && i <= L - 2 && !usedEdges.has(i) && eT(i)[0] !== streamX;
  const pickEdge = (frac: number): number => {
    const base = Math.round(L * frac);
    for (let k = 0; k < L; k++) {
      if (edgeOk(base + k)) return usedEdges.add(base + k), base + k;
      if (edgeOk(base - k)) return usedEdges.add(base - k), base - k;
    }
    return -1;
  };
  const used = new Set<number>([S, F]);
  // --- obstacles on the solution path (all have a guaranteed solution) ---
  const gi = pickEdge(0.56);
  const hurdle = pickEdge(0.18);
  const bould = pickEdge(0.36);
  const thorn = pickEdge(0.76);
  const pud = pickEdge(0.9);
  if (gi >= 0) {
    const [x, y] = eT(gi);
    b.ob[m.li(x, y)] = O.GATE;
    b.items.push({ kind: "gate", lx: x, ly: y });
  }
  if (hurdle >= 0) b.ob[m.li(eT(hurdle)[0], eT(hurdle)[1])] = O.LOWFENCE;
  if (bould >= 0) {
    const [x, y] = eT(bould);
    const pit = m.cellTile(sol[bould + 1]);
    b.gnd[m.li(pit[0], pit[1])] = G.PIT;
    b.items.push({ kind: "boulder", lx: x, ly: y, pit });
    used.add(sol[bould + 1]);
  }
  if (thorn >= 0) b.ob[m.li(eT(thorn)[0], eT(thorn)[1])] = O.THORN;
  if (pud >= 0) b.gnd[m.li(eT(pud)[0], eT(pud)[1])] = G.PUDDLE;

  const take = (lists: number[][]): number => {
    for (const l of lists) for (const c of l) if (!used.has(c)) return used.add(c), c;
    return -1;
  };
  const byDist = (a: number, c: number) => dist[c] - dist[a];
  // --- keys: always reachable BEFORE any lock ---
  const pre = m.bfs(S, gi >= 0 ? [sol[gi], sol[gi + 1]] : undefined).dist;
  const preLeaves = leaves.filter((c) => pre[c] >= 0).sort(byDist);
  const preSide = cells.filter((c) => pre[c] >= 0 && !onSol.has(c)).sort(byDist);
  const preSol = sol.slice(1, Math.max(2, gi + 1));
  const nKeys = (gi >= 0 ? 1 : 0) + o.chests.filter((c) => c.locked).length;
  for (let k = 0; k < nKeys; k++) {
    const c = take([preLeaves, preSide, preSol]);
    if (c >= 0) {
      const [lx, ly] = m.cellTile(c);
      b.items.push({ kind: "key", lx, ly });
    }
  }
  // --- treasure ---
  const rest = () => leaves.filter((c) => !used.has(c)).sort(byDist);
  const side = cells.filter((c) => !onSol.has(c)).sort(byDist);
  for (const cdef of o.chests) {
    let c = take([rest()]);
    let solid = true;
    if (c < 0) {
      c = take([side, sol.slice(1, -1)]);
      solid = false;
    }
    if (c >= 0) {
      const [lx, ly] = m.cellTile(c);
      b.items.push({ kind: "chest", lx, ly, card: cdef.card, locked: cdef.locked, solid });
    }
  }
  if (V >= 0) {
    const c = take([rest(), side, sol.slice(1, -1)]);
    if (c >= 0) {
      const [lx, ly] = m.cellTile(c);
      b.items.push({ kind: "button", lx, ly });
    }
  }
  o.cards.forEach((id, n) => {
    const c = take([rest(), side, sol.slice(1, -1)]);
    if (c < 0) return;
    const [lx, ly] = m.cellTile(c);
    b.items.push({ kind: "cardspot", lx, ly, card: id, prop: n % 5 });
    const nb = m.nbrs(c);
    if (nb.length === 1 && n % 2 === 0) {
      const [ex, ey] = m.edgeTile(c, nb[0]);
      const li = m.li(ex, ey);
      if (ex !== streamX && b.ob[li] < 0 && b.gnd[li] < 0) b.ob[li] = n % 4 === 0 ? O.THORN : O.LOWFENCE;
    }
  });
  // --- secret vault behind a hidden door ---
  if (V >= 0) {
    const vx = V % cw;
    const vy = Math.floor(V / cw);
    const cand = [[vx - 1, vy], [vx + 1, vy], [vx, vy - 1], [vx, vy + 1]]
      .filter(([x, y]) => x >= 0 && y >= 0 && x < cw && y < ch)
      .map(([x, y]) => m.ci(x, y))
      .filter((c) => dist[c] >= 0)
      .sort(byDist);
    const N = cand[0];
    const [tx, ty] = m.cellTile(V);
    const [dx, dy] = m.edgeTile(V, N);
    m.open[m.li(tx, ty)] = 1;
    m.open[m.li(dx, dy)] = 1;
    b.ob[m.li(dx, dy)] = O.SECRET;
    b.items.push({ kind: "door", lx: dx, ly: dy });
    b.items.push({ kind: "chest", lx: tx, ly: ty, card: o.vaultCard, solid: true });
  }
  // --- stream with narrow bridges ---
  if (streamX >= 0) {
    for (let ly = 0; ly < m.h; ly++) {
      const li = m.li(streamX, ly);
      if (m.open[li]) b.gnd[li] = G.BRIDGE;
      else {
        b.gnd[li] = G.WATER;
        b.ob[li] = O.NONE;
      }
    }
  }
  return b;
}

const MAZE_DEFS = [
  { id: "m1", name: "Corn Field Maze", icon: "🌽", reward: 100, level: 1, special: "goldcorn", diff: "Mudah", ox: 5, oy: 4, loc: "valley" as LocationId, floor: G.SOIL as number, desc: "Labirin kebun jagung: 3 persimpangan, 3 kartu tersembunyi." },
  { id: "m2", name: "Vegetable Garden Maze", icon: "🥬", reward: 250, level: 2, special: "rainbowveg", diff: "Sedang", ox: 28, oy: 3, loc: "garden" as LocationId, floor: G.GRASS as number, desc: "Labirin kebun sayur: banyak persimpangan, jalan buntu, gerbang terkunci, 5 kartu." },
  { id: "m3", name: "Magic Forest Maze", icon: "🔮", reward: 500, level: 3, special: "guardian", diff: "Sulit", ox: 68, oy: 3, loc: "forest" as LocationId, floor: G.FOREST as number, desc: "Labirin hutan ajaib: sungai, jembatan sempit, pintu rahasia, kartu Epic & Legendary." },
];
const WALLS: ((outer: boolean, h: number, lx: number, ly: number, m: MazeGrid) => number)[] = [
  (outer, h, lx, ly, m) => (outer ? ((lx === 0 || lx === m.w - 1) && (ly === 0 || ly === m.h - 1) ? O.APPLE : O.FENCE) : h < 0.1 ? O.HEDGE : O.CORN),
  (outer, h) => (outer ? O.HEDGE : h < 0.52 ? O.VEG : h < 0.8 ? O.HEDGE : h < 0.92 ? O.FENCE : O.APPLE),
  (outer, h) => (outer ? (h < 0.5 ? O.PINE : O.MAGIC) : h < 0.66 ? O.MAGIC : h < 0.82 ? O.ROCK : O.PINE),
];

export const MAZES: MazeInfo[] = [];

function stampMaze(idx: number, b: MBuild) {
  const d = MAZE_DEFS[idx];
  const { m } = b;
  const { ox, oy } = d;
  rect(ox - 1, oy - 1, ox + m.w, oy + m.h, (_x, _y, i) => (reserved[i] = 1));
  for (let ly = 0; ly < m.h; ly++)
    for (let lx = 0; lx < m.w; lx++) {
      const i = I(ox + lx, oy + ly);
      const li = m.li(lx, ly);
      const open = m.open[li] === 1;
      const outer = lx === 0 || ly === 0 || lx === m.w - 1 || ly === m.h - 1;
      ground[i] = b.gnd[li] >= 0 ? b.gnd[li] : open ? G.PATH : d.floor;
      obj[i] = b.ob[li] >= 0 ? b.ob[li] : open ? O.NONE : WALLS[idx](outer, hash2(ox + lx, oy + ly), lx, ly, m);
    }
  const ex = ox + b.start[0];
  const ey = oy + m.h - 1;
  ground[I(ex, ey)] = G.PATH;
  obj[I(ex, ey)] = O.MAZEGATE;
  things.push({ id: `${d.id}_gate`, kind: "mazegate", tx: ex, ty: ey, maze: idx });
  ground[I(ox + b.start[0], oy + b.start[1])] = G.START;
  ground[I(ox + b.finish[0], oy + b.finish[1])] = G.FINISH;
  things.push({ id: `${d.id}_finish`, kind: "finish", tx: ox + b.finish[0], ty: oy + b.finish[1], maze: idx, solid: true });
  const counts: Record<string, number> = {};
  let cards = 0;
  for (const it of b.items) {
    const n = (counts[it.kind] = (counts[it.kind] ?? 0) + 1);
    const t: Thing = { id: `${d.id}_${it.kind}${n}`, kind: it.kind, tx: ox + it.lx, ty: oy + it.ly, maze: idx };
    if (it.card) t.card = it.card;
    if (it.locked) t.locked = true;
    if (it.solid !== undefined) t.solid = it.solid;
    if (it.prop !== undefined) t.prop = it.prop;
    if (it.pit) t.pit = [ox + it.pit[0], oy + it.pit[1]];
    if (it.kind === "button") t.door = `${d.id}_door1`;
    if (it.kind === "cardspot" || it.kind === "chest") cards++;
    things.push(t);
  }
  MAZES.push({
    id: d.id, idx, name: d.name, icon: d.icon, reward: d.reward, level: d.level, special: d.special, diff: d.diff, desc: d.desc,
    x: ox, y: oy, w: m.w, h: m.h,
    start: [ox + b.start[0], oy + b.start[1]], entrance: [ex, ey], outside: [ex, ey + 1], finish: [ox + b.finish[0], oy + b.finish[1]],
    cards, loc: d.loc,
  });
}

/* ==================================================================
 * BUILD THE WORLD
 * ================================================================== */
export const HOME_TILE: [number, number] = [24, 30];
export const PEN = { x0: 11, y0: 47, x1: 24, y1: 53 };
const DOCK_Y = 48;
const DOCK_X = riverX(DOCK_Y);

(function build() {
  // biomes
  rect(0, 0, W - 1, H - 1, (x, y, i) => (ground[i] = x >= 63 && y >= 37 ? G.FOREST : G.GRASS));
  rect(30, 42, 52, 58, (_x, _y, i) => (ground[i] = G.MEADOW));
  // river
  for (let y = 0; y < H; y++) {
    const cx = riverX(y);
    rect(cx - 2, y, cx + 2, y, (x, _y, i) => {
      reserved[i] = 1;
      if (Math.abs(x - cx) <= 1) ground[i] = G.WATER;
    });
  }
  // pond (south-west)
  rect(4, 59, 14, 67, (x, y, i) => {
    const d = ((x - 9) / 4.2) ** 2 + ((y - 63) / 2.9) ** 2;
    if (d < 1.5) reserved[i] = 1;
    if (d < 1) {
      ground[i] = G.WATER;
      if (hash2(x, y) < 0.22) obj[i] = O.LILY;
    }
  });
  // main roads
  road(3, 34, 100, 34, 2);
  road(6, 15, 6, 33, 2);
  road(39, 18, 39, 33, 2);
  road(81, 22, 81, 33, 2);
  // home
  building(O.HOUSE, 22, 25, 5, 4);
  road(24, 29, 24, 33, 2);
  building(O.MILL, 15, 20, 2, 2);
  building(O.WELL, 20, 31, 1, 1);
  addThing({ id: "hay", kind: "hay", tx: 28, ty: 28, solid: true });
  [[12, 27], [15, 30], [18, 27]].forEach(([x, y], n) => {
    obj[I(x, y)] = O.BLOCK;
    rect(x - 1, y - 1, x + 1, y + 1, (_a, _b, i) => (reserved[i] = 1));
    addThing({ id: `apple${n}`, kind: "apple", tx: x, ty: y, idx: n });
  });
  sign(27, 31, "🏡 Rumah ROBI — Green Valley. Jalan utama: barat ke Labirin Jagung, timur menyeberang sungai ke hutan.");
  // tutorial hurdle on the way to maze 1
  obj[I(6, 22)] = O.LOWFENCE;
  obj[I(7, 22)] = O.LOWFENCE;
  sign(8, 23, "⬆ Pagar pendek bergaris bisa DILOMPATI: tekan SPACE / tombol JUMP sambil berjalan.");
  sign(8, 16, "🌽 MAZE 1 – Corn Field. Mudah • 3 persimpangan • 3 kartu tersembunyi • Hadiah 100 poin.");
  // vegetable garden
  rect(31, 24, 37, 28, (_x, _y, i) => (ground[i] = G.SOIL));
  fenceRect(30, 23, 38, 29);
  road(34, 29, 34, 33, 2);
  [[32, 25], [34, 25], [36, 25], [32, 27], [34, 27], [36, 27]].forEach(([x, y], n) => addThing({ id: `plot${n}`, kind: "plot", tx: x, ty: y, idx: n }));
  sign(36, 31, "🥕 Vegetable Garden — E: tanam / panen, F: siram dengan alat penyiram. Tanaman perlu disiram 2x.");
  sign(41, 19, "🥬 MAZE 2 – Vegetable Garden. Sedang • banyak jalan buntu • gerbang terkunci • 5 kartu • Hadiah 250 poin. (Level 2)");
  // animal farm
  rect(10, 43, 24, 53, (_x, _y, i) => (ground[i] = G.PEN));
  fenceRect(9, 42, 25, 54);
  road(17, 36, 17, 42, 2);
  building(O.BARN, 10, 43, 5, 3);
  building(O.COOP, 22, 43, 2, 2);
  addThing({ id: "nest", kind: "nest", tx: 21, ty: 44, solid: true });
  sign(19, 40, "🐄 Animal Farm — dekati hewan, tekan E untuk memberi makan lalu ambil susu, wol, dan telur.");
  // flower meadow + southern narrow path
  road(41, 36, 41, 59, 2);
  road(41, 60, 70, 60, 1);
  [[33, 45], [37, 44], [45, 46], [49, 45], [35, 52], [38, 55], [46, 51], [50, 56]].forEach(([x, y], n) => {
    obj[I(x, y)] = O.NONE;
    addThing({ id: `flower${n}`, kind: "flower", tx: x, ty: y, idx: n });
  });
  sign(43, 43, "🌸 Flower Meadow — petik bunga besar dengan E. Jalan ke selatan menuju jembatan sempit.");
  sign(51, 61, "🌉 Jembatan sempit di depan! Berjalanlah hati-hati menuju hutan.");
  // dock
  road(43, DOCK_Y, DOCK_X - 2, DOCK_Y, 1);
  ground[I(DOCK_X - 1, DOCK_Y)] = G.PLANK;
  ground[I(DOCK_X, DOCK_Y)] = G.PLANK;
  addThing({ id: "dock", kind: "dock", tx: DOCK_X, ty: DOCK_Y });
  sign(DOCK_X - 3, DOCK_Y - 1, "🎣 River Side — berdiri di ujung dermaga dan tekan E untuk memancing.");
  // forest roads
  road(82, 36, 82, 51, 2);
  road(82, 50, 97, 50, 2);
  road(96, 50, 96, 69, 2);
  road(68, 68, 97, 68, 2);
  road(68, 60, 68, 69, 2);
  road(96, 42, 96, 49, 1);
  obj[I(96, 45)] = O.THORN;
  rect(88, 50, 89, 51, (_x, _y, i) => (ground[i] = G.PUDDLE));
  addThing({ id: "chest_forest", kind: "chest", tx: 96, ty: 41, card: "gem", solid: true });
  [[85, 43], [90, 49], [99, 60], [75, 67]].forEach(([x, y], n) => {
    rect(x - 1, y - 1, x + 1, y + 1, (_a, _b, i) => (reserved[i] = 1));
    addThing({ id: `mush${n}`, kind: "mushroom", tx: x, ty: y, idx: n });
  });
  sign(84, 38, "🌲 Forest Adventure — petik jamur, temukan peti, dan waspadai semak berduri (lompati atau potong dengan F).");
  sign(83, 23, "🔮 MAZE 3 – Magic Forest. Sulit • sungai & jembatan • pintu rahasia • kartu Epic & Legendary • Hadiah 500 poin. (Level 3)");
  sign(98, 56, "✨ Konon ada taman rahasia di balik semak yang berkilau di sebelah barat jalan ini...");
  // secret grove
  rect(86, 54, 94, 63, (x, y, i) => {
    reserved[i] = 1;
    if (x === 86 || x === 94 || y === 54 || y === 63) obj[i] = (x + y) % 2 ? O.TREE : O.PINE;
    else {
      ground[i] = G.MEADOW;
      obj[i] = hash2(x, y) < 0.3 ? O.FLOWER : O.NONE;
    }
  });
  obj[I(94, 58)] = O.SECRETBUSH;
  reserved[I(95, 58)] = 1;
  obj[I(90, 58)] = O.NONE;
  addThing({ id: "chest_grove", kind: "chest", tx: 90, ty: 58, card: "star", solid: true });
  // pond treasure
  rect(8, 67, 10, 69, (_x, _y, i) => (reserved[i] = 1));
  addThing({ id: "chest_pond", kind: "chest", tx: 9, ty: 68, card: "coin", solid: true });
  // maze 3 stream extension + pond
  rect(76, 0, 76, 2, (_x, _y, i) => {
    ground[i] = G.WATER;
    reserved[i] = 1;
  });
  rect(75, 22, 77, 23, (_x, _y, i) => {
    ground[i] = G.WATER;
    reserved[i] = 1;
  });
  // mazes
  stampMaze(0, buildMaze1());
  stampMaze(1, buildGenerated(10, 7, 4242, [5, 6], { cards: ["tomato", "pumpkin", "chicken", "strawberry"], chests: [{ card: "coin", locked: true }] }));
  stampMaze(2, buildGenerated(13, 9, 9091, [6, 8], { cards: ["coin", "pumpkin"], chests: [{ card: "gem" }, { card: "star", locked: true }], stream: 4, vault: [12, 0], vaultCard: "crystal" }));
  // world boundary ring
  rect(0, 0, W - 1, H - 1, (x, y, i) => {
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) {
      reserved[i] = 1;
      if (ground[i] !== G.WATER) obj[i] = (x + y) % 3 === 0 ? O.PINE : O.TREE;
    }
  });
  // decoration scatter
  const rng = mulberry32(20240607);
  rect(0, 0, W - 1, H - 1, (x, _y, i) => {
    const r = rng();
    if (reserved[i] || obj[i] || ground[i] === G.WATER || PATHLIKE[ground[i]]) return;
    const g = ground[i];
    if (g === G.FOREST) obj[i] = r < 0.11 ? O.TREE : r < 0.22 ? O.PINE : r < 0.235 ? O.ROCK : r < 0.26 ? O.BUSH : r < 0.33 ? O.TALLGRASS : r < 0.37 ? O.FLOWER : r < 0.376 ? O.STUMP : O.NONE;
    else if (g === G.MEADOW) obj[i] = r < 0.3 ? O.FLOWER : r < 0.37 ? O.TALLGRASS : O.NONE;
    else if (g === G.GRASS) obj[i] = r < 0.028 ? O.TREE : r < 0.034 ? O.ROCK : r < 0.045 ? O.BUSH : r < 0.12 ? O.FLOWER : r < 0.19 ? O.TALLGRASS : r < 0.193 ? O.STUMP : x >= 63 && r < 0.27 ? O.PINE : O.NONE;
  });
})();

/* ---------------- regions ---------------- */
const R: Record<string, Region> = {
  valley: { id: "valley", name: "Green Valley", icon: "🏡", loc: "valley", desc: "Area pertanian utama" },
  garden: { id: "garden", name: "Vegetable Garden", icon: "🥕", loc: "garden", desc: "Tanam, siram, dan panen" },
  animal: { id: "animal", name: "Animal Farm", icon: "🐄", loc: "animal", desc: "Peternakan sapi, domba, kambing, ayam" },
  meadow: { id: "meadow", name: "Flower Meadow", icon: "🌸", loc: "meadow", desc: "Padang bunga" },
  river: { id: "river", name: "River Side", icon: "🎣", loc: "river", desc: "Sungai, jembatan, dan dermaga pancing" },
  forest: { id: "forest", name: "Forest Adventure", icon: "🌲", loc: "forest", desc: "Hutan penuh rahasia" },
  trail: { id: "trail", name: "Forest Trail", icon: "🌲", loc: "forest", desc: "Jalan menuju hutan ajaib" },
  grove: { id: "grove", name: "Secret Grove", icon: "✨", loc: "forest", desc: "Taman rahasia tersembunyi!" },
};
const MAZE_REGIONS: Region[] = MAZES.map((m) => ({ id: m.id, name: m.name, icon: m.icon, loc: m.loc, desc: `Labirin • ${m.diff}`, maze: m.idx }));

export function mazeAt(tx: number, ty: number): number {
  for (const m of MAZES) if (tx >= m.x && tx < m.x + m.w && ty >= m.y && ty < m.y + m.h) return m.idx;
  return -1;
}
export function regionAt(tx: number, ty: number): Region {
  const mi = mazeAt(tx, ty);
  if (mi >= 0) return MAZE_REGIONS[mi];
  if (tx >= 86 && tx <= 94 && ty >= 54 && ty <= 63) return R.grove;
  if (tx >= 29 && tx <= 39 && ty >= 22 && ty <= 31) return R.garden;
  if (tx >= 8 && tx <= 26 && ty >= 40 && ty <= 55) return R.animal;
  if (tx >= 30 && tx <= 52 && ty >= 42 && ty <= 58) return R.meadow;
  if (Math.abs(tx - riverX(ty)) <= 4) return R.river;
  if (tx >= 63 && ty >= 37) return R.forest;
  if (tx >= 63) return R.trail;
  return R.valley;
}

export const PLACES: { id: string; name: string; icon: string; tx: number; ty: number; loc?: LocationId }[] = [
  { id: "home", name: "Rumah ROBI • Green Valley", icon: "🏡", tx: HOME_TILE[0], ty: HOME_TILE[1], loc: "valley" },
  { id: "garden", name: "Vegetable Garden", icon: "🥕", tx: 34, ty: 31, loc: "garden" },
  { id: "animal", name: "Animal Farm", icon: "🐄", tx: 17, ty: 40, loc: "animal" },
  { id: "meadow", name: "Flower Meadow", icon: "🌸", tx: 41, ty: 44, loc: "meadow" },
  { id: "river", name: "River Side • Dermaga", icon: "🎣", tx: DOCK_X - 3, ty: DOCK_Y, loc: "river" },
  { id: "forest", name: "Forest Adventure", icon: "🌲", tx: 82, ty: 40, loc: "forest" },
  ...MAZES.map((m) => ({ id: m.id, name: `Maze ${m.idx + 1} • ${m.name}`, icon: m.icon, tx: m.outside[0], ty: m.outside[1] + 1 })),
];

/* ---------------- spawn spots for random hidden sparkles ---------------- */
export const SPAWN_SPOTS: Record<LocationId, [number, number][]> = { valley: [], garden: [], animal: [], meadow: [], forest: [], river: [] };
(function spots() {
  const solidThing = new Uint8Array(W * H);
  const anyThing = new Uint8Array(W * H);
  for (const t of things) {
    anyThing[I(t.tx, t.ty)] = 1;
    if (t.solid || t.kind === "boulder" || t.kind === "gate" || t.kind === "door" || t.kind === "mazegate") solidThing[I(t.tx, t.ty)] = 1;
  }
  const seen = new Uint8Array(W * H);
  const q = [I(HOME_TILE[0], HOME_TILE[1])];
  seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const i = q[h];
    const x = i % W;
    const y = Math.floor(i / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = I(nx, ny);
      if (seen[j] || ground[j] === G.WATER || ground[j] === G.PIT || SOLID[obj[j]] === 1 || solidThing[j] || obj[j] === O.SECRETBUSH) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  for (const i of q) {
    const x = i % W;
    const y = Math.floor(i / W);
    const o = obj[i];
    if (anyThing[i] || (o !== O.NONE && o !== O.FLOWER && o !== O.TALLGRASS)) continue;
    if (mazeAt(x, y) >= 0 || Math.abs(x - HOME_TILE[0]) + Math.abs(y - HOME_TILE[1]) < 4) continue;
    if (ground[i] === G.BRIDGE || ground[i] === G.PLANK || ground[i] === G.PUDDLE) continue;
    SPAWN_SPOTS[regionAt(x, y).loc].push([x, y]);
  }
})();
