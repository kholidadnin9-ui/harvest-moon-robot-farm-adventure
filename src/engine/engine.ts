/* ------------------------------------------------------------------
 * ROBOT FARM ADVENTURE – top-down open world engine (HTML5 Canvas).
 * Game loop (rAF + delta time), input, grid collision, camera follow,
 * object interaction, obstacles, mazes, particles and tile renderer.
 * ------------------------------------------------------------------ */
import { ANIMALS, CROPS, CROP_ORDER, PRODUCE } from "@/game/data";
import { drawCard, luckOf, resultForCard, type Action } from "@/game/logic";
import { ambient, music, sfx } from "@/game/audio";
import type { AnimalId, DrawResult, GameState, LocationId } from "@/game/types";
import { drawRobi, type Dir, type RobiAnim } from "./robi";
import * as SP from "./sprites";
import { decodeExplored, drawMinimap, encodeExplored } from "./mapview";
import { EXH, EXS, EXW, G, H, HOME_TILE, MAZES, O, PATHLIKE, PEN, PLACES, SOLID, T, W, ground, hash2, mazeAt, obj, regionAt, things, type Region, type Thing } from "./world";

type Ctx = CanvasRenderingContext2D;
export interface Prompt {
  label: string;
  tool?: string;
}
export interface MazeHud {
  idx: number;
  name: string;
  icon: string;
  found: number;
  total: number;
  keys: number;
  time: number;
  done: boolean;
  best: number;
}
export interface MazeDone {
  idx: number;
  time: number;
  first: boolean;
  reward: number;
  card: DrawResult | null;
  found: number;
  total: number;
}
export interface EngineHost {
  getState(): GameState;
  dispatch(a: Action): void;
  toast(msg: string, icon?: string, tone?: "info" | "good" | "bad" | "gold"): void;
  onCard(r: DrawResult): void;
  onPrompt(p: Prompt | null): void;
  onRegion(r: Region): void;
  onSeedPicker(plot: number): void;
  onFishing(): void;
  onMaze(m: MazeHud | null): void;
  onMazeDone(d: MazeDone): void;
}
interface Target {
  key: string;
  x: number;
  y: number;
  label: string;
  act: () => void;
  tool?: () => void;
  toolLabel?: string;
}
interface Act {
  anim: RobiAnim;
  t: number;
  dur: number;
  done?: () => void;
}
interface Critter {
  id: AnimalId;
  x: number;
  y: number;
  tx: number;
  ty: number;
  wait: number;
  face: number;
  walk: number;
  w: number;
}
interface Pickup {
  x: number;
  y: number;
  kind: "coin" | "star";
  ph: number;
}
interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: number; // 0 dust, 1 spark, 2 drop, 3 leaf
}
interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
}
interface Print {
  x: number;
  y: number;
  life: number;
  hor: boolean;
}
interface Dr {
  y: number;
  k: number;
  a: number;
  b: number;
  o: number;
  r: unknown;
}

const HW = 10;
const HH = 10;
const WALK = 132;
const RUN = 224;
const JUMP_T = 0.56;
const JUMP_H = 30;
const DIRV: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const MAZE_COLORS = ["#d99a1c", "#3f9a3a", "#7a4fb5"];
const CRIT_W: Record<AnimalId, number> = { cow: 68, sheep: 54, goat: 52, chicken: 36 };
const FONT = '"Fredoka", "Nunito", system-ui, sans-serif';
const PLANT_INFO: Record<number, [string, string]> = {
  [O.CORN]: ["🌽 JAGUNG", "Jagung tumbuh tinggi hingga 2 meter. Tongkolnya siap panen saat rambutnya kecokelatan."],
  [O.VEG]: ["🍅 SAYURAN", "Tomat, kubis, dan labu tumbuh subur jika disiram teratur dan mendapat cukup sinar matahari."],
  [O.APPLE]: ["🍎 POHON APEL", "Pohon apel berbuah lebat. Buah yang jatuh bisa diambil di pohon apel dekat rumah ROBI."],
  [O.MAGIC]: ["🔮 POHON AJAIB", "Pohon ajaib ini bercahaya di malam hari. Konon kartu Legendary tersembunyi di dekatnya."],
  [O.HEDGE]: ["🌿 SEMAK PAGAR", "Semak pagar rimbun yang dipangkas rapi. Tidak bisa ditembus — cari jalan lain!"],
};

export class Engine {
  minimap: HTMLCanvasElement | null = null;
  px: number;
  py: number;
  private canvas: HTMLCanvasElement;
  private host: EngineHost;
  private c: Ctx;
  private dpr = 1;
  private cw = 1;
  private ch = 1;
  private scale = 1;
  private vw = 1;
  private vh = 1;
  private camX = 0;
  private camY = 0;
  private shake = 0;
  private time = 0;
  private raf = 0;
  private last = 0;
  private alive = true;
  private active = true;
  private pz = 0;
  private dir: Dir = "down";
  private anim: RobiAnim = "idle";
  private animT = 0;
  private animP = 0;
  private jumpT = -1;
  private landT = 0;
  private jsx = 0;
  private jsy = 0;
  private lastDx = 0;
  private lastDy = 1;
  private action: Act | null = null;
  private knock: { x0: number; y0: number; x1: number; y1: number } | null = null;
  private pushT = 0;
  private pushing = false;
  private pushHint = 0;
  private stepAcc = 0;
  private running = false;
  private safeX: number;
  private safeY: number;
  private keys = new Set<string>();
  private joyX = 0;
  private joyY = 0;
  private runToggle = false;
  private robj = new Uint8Array(obj);
  private block = new Uint8Array(W * H);
  private thingAt = new Map<number, Thing>();
  private pitOwner = new Map<number, Thing>();
  private opened = new Set<string>();
  private openedRef: string[] | null = null;
  private levelRef = -1;
  private cut = new Map<number, number>();
  private slides = new Map<string, { p: number; sent: boolean }>();
  private explored: Uint8Array;
  private exDirty = false;
  private exCell = -1;
  private syncT = 0;
  private syncX = 0;
  private syncY = 0;
  private nearT = 0;
  private target: Target | null = null;
  private promptKey = "";
  private region: Region | null = null;
  private regionT = 0;
  private mazeIdx = -1;
  private mazeTime = 0;
  private mazeClaimed = false;
  private hudT = 0;
  private ambT = 0;
  private mooT = 5;
  private miniT = 0;
  private forestA = 0;
  private critters: Critter[] = [];
  private pickups: Pickup[] = [];
  private pickT = 3;
  private parts: Part[] = [];
  private floaters: Floater[] = [];
  private prints: Print[] = [];
  private draws: Dr[] = [];
  private gear: string[] = [];
  private imgs = new Map<string, HTMLImageElement>();
  private leaves = Array.from({ length: 12 }, (_, i) => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.7, ph: i * 1.7 }));
  private ro: ResizeObserver | null = null;
  private discarded = false;

  constructor(canvas: HTMLCanvasElement, host: EngineHost) {
    this.canvas = canvas;
    this.host = host;
    this.c = canvas.getContext("2d")!;
    const st = host.getState();
    for (const t of things) {
      this.thingAt.set(t.tx + t.ty * W, t);
      if (t.pit) this.pitOwner.set(t.pit[0] + t.pit[1] * W, t);
    }
    this.explored = decodeExplored(st.world.explored);
    this.refresh(st);
    this.px = (HOME_TILE[0] + 0.5) * T;
    this.py = (HOME_TILE[1] + 0.8) * T;
    if (st.world.x > 0 && st.world.y > 0 && !this.hits(st.world.x, st.world.y, 2)) {
      this.px = st.world.x;
      this.py = st.world.y;
    }
    this.safeX = this.syncX = this.px;
    this.safeY = this.syncY = this.py;
    ANIMALS.forEach((a, i) => {
      const x = (PEN.x0 + 2 + i * 3.2) * T;
      const y = (PEN.y0 + 1.5 + (i % 2) * 3) * T;
      this.critters.push({ id: a.id, x, y, tx: x, ty: y, wait: 1 + i, face: 1, walk: 0, w: CRIT_W[a.id] });
      this.img(a.image);
    });
    CROP_ORDER.forEach((cid) => this.img(CROPS[cid].image));
    this.resize();
    this.snapCam();
    this.reveal();
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("resize", this.resize);
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(canvas);
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ================= public API ================= */
  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("resize", this.resize);
    this.ro?.disconnect();
    if (!this.discarded) this.sync(true);
    ambient.setWater(0);
  }
  /** call before a game reset so the old position is not written into the fresh save */
  discard() {
    this.discarded = true;
  }
  setActive(v: boolean) {
    this.active = v;
    if (!v) this.keys.clear();
  }
  setJoy(x: number, y: number) {
    this.joyX = x;
    this.joyY = y;
  }
  setRun(v: boolean) {
    this.runToggle = v;
  }
  jump() {
    if (!this.active || this.action || this.jumpT >= 0) return;
    this.jumpT = 0;
    this.jsx = this.px;
    this.jsy = this.py;
    sfx.jump();
    this.dust(this.px, this.py, 4);
  }
  interact() {
    if (!this.active || this.action || this.jumpT >= 0) return;
    if (this.target) this.target.act();
  }
  tool() {
    if (!this.active || this.action || this.jumpT >= 0) return;
    if (this.target?.tool) this.target.tool();
    else {
      this.playAct("tool", 0.45);
      sfx.swing();
    }
  }
  emote(anim: RobiAnim, dur: number) {
    this.playAct(anim, dur);
  }
  celebrate() {
    this.playAct("victory", 2);
    for (let i = 0; i < 26; i++) this.spark(this.px + (Math.random() - 0.5) * 50, this.py - 30 - Math.random() * 40, ["#ffe066", "#ff7eb6", "#8fd3ff", "#fff"][i % 4]);
  }
  teleport(tx: number, ty: number) {
    let bx = tx;
    let by = ty;
    search: for (let r = 0; r <= 4; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++)
          if (!this.hits((tx + dx + 0.5) * T, (ty + dy + 0.8) * T, 2)) {
            bx = tx + dx;
            by = ty + dy;
            break search;
          }
    this.px = (bx + 0.5) * T;
    this.py = (by + 0.8) * T;
    this.pz = 0;
    this.jumpT = -1;
    this.action = null;
    this.knock = null;
    this.safeX = this.px;
    this.safeY = this.py;
    this.dir = "down";
    this.slides.clear();
    this.snapCam();
    this.exCell = -1;
    this.regionT = 0;
    sfx.travel();
    for (let i = 0; i < 14; i++) this.spark(this.px + (Math.random() - 0.5) * 36, this.py - Math.random() * 50, "#8fd3ff");
  }
  travel(placeId: string) {
    const p = PLACES.find((z) => z.id === placeId);
    if (p) this.teleport(p.tx, p.ty);
  }
  travelLoc(loc: LocationId) {
    const p = PLACES.find((z) => z.loc === loc);
    if (p) this.teleport(p.tx, p.ty);
  }
  goHome() {
    this.teleport(HOME_TILE[0], HOME_TILE[1]);
  }
  exitMaze() {
    if (this.mazeIdx >= 0) this.teleport(MAZES[this.mazeIdx].outside[0], MAZES[this.mazeIdx].outside[1] + 1);
  }
  getExplored() {
    return this.explored;
  }
  /** debug / automated-test helper */
  debug() {
    return { x: this.px, y: this.py, z: this.pz, tx: Math.floor(this.px / T), ty: Math.floor((this.py - 4) / T), anim: this.anim, dir: this.dir, cam: [this.camX, this.camY], maze: this.mazeIdx, target: this.target?.label ?? null, region: this.region?.id ?? null };
  }
  probe(tx: number, ty: number) {
    const i = tx + ty * W;
    const t = this.thingAt.get(i);
    const sd = SOLID[this.robj[i]];
    return { solid: this.solidAt(tx, ty, 0), air: this.solidAt(tx, ty, 1), low: sd === 2 || sd === 3, kind: t?.kind ?? null, id: t?.id ?? null, open: t ? this.opened.has(t.id) : false, pit: this.pitOwner.has(i), g: ground[i], o: this.robj[i] };
  }

  /* ================= input ================= */
  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.active) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    if (k === " ") {
      if (!e.repeat) this.jump();
      return;
    }
    if (k === "e" || k === "enter") {
      if (!e.repeat) this.interact();
      return;
    }
    if (k === "f") {
      if (!e.repeat) this.tool();
      return;
    }
    this.keys.add(k);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private onBlur = () => {
    this.keys.clear();
  };
  private resize = () => {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cw = Math.max(1, r.width);
    this.ch = Math.max(1, r.height);
    this.canvas.width = Math.round(this.cw * this.dpr);
    this.canvas.height = Math.round(this.ch * this.dpr);
    this.scale = Math.max(0.78, Math.min(1.7, Math.min(this.cw, this.ch) / (10.4 * T)));
    this.vw = this.cw / this.scale;
    this.vh = this.ch / this.scale;
  };

  /* ================= helpers ================= */
  private img(src: string): HTMLImageElement {
    let im = this.imgs.get(src);
    if (!im) {
      im = new Image();
      im.src = src;
      this.imgs.set(src, im);
    }
    return im;
  }
  private refresh(st: GameState) {
    this.openedRef = st.world.opened;
    this.levelRef = st.level;
    this.opened = new Set(st.world.opened);
    this.block.fill(0);
    for (const t of things) {
      const i = t.tx + t.ty * W;
      switch (t.kind) {
        case "chest":
        case "finish":
        case "hay":
        case "nest":
          if (t.solid !== false) this.block[i] = 1;
          break;
        case "boulder":
          if (!this.opened.has(t.id)) {
            this.block[i] = 1;
            if (t.pit) this.block[t.pit[0] + t.pit[1] * W] = 1;
          }
          break;
        case "gate":
        case "door":
          if (!this.opened.has(t.id)) this.block[i] = 1;
          break;
        case "mazegate":
          if (st.level < MAZES[t.maze!].level) this.block[i] = 1;
          break;
      }
    }
  }
  /** mode: 0 walking, 1 airborne (low obstacles passable), 2 landing (low obstacles + hazards solid) */
  private solidAt(tx: number, ty: number, mode: number): boolean {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
    const i = tx + ty * W;
    if (ground[i] === G.WATER || this.block[i]) return true;
    const s = SOLID[this.robj[i]];
    if (s === 1) return true;
    if (s === 2) return mode !== 1;
    if (s === 3) return mode === 2;
    return false;
  }
  private hits(x: number, y: number, mode: number): boolean {
    const x0 = Math.floor((x - HW) / T);
    const x1 = Math.floor((x + HW) / T);
    const y0 = Math.floor((y - HH) / T);
    const y1 = Math.floor((y - 0.5) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solidAt(tx, ty, mode)) return true;
    return false;
  }
  private moveAxis(dx: number, dy: number, mode: number): boolean {
    if (!dx && !dy) return false;
    if (!this.hits(this.px + dx, this.py + dy, mode)) {
      this.px += dx;
      this.py += dy;
      return false;
    }
    for (let k = 0; k < 3; k++) {
      dx *= 0.5;
      dy *= 0.5;
      if (!this.hits(this.px + dx, this.py + dy, mode)) {
        this.px += dx;
        this.py += dy;
      }
    }
    return true;
  }
  /** corner assist: slide around corners into 1-tile wide corridors */
  private nudge(sx: number, sy: number, amt: number, mode: number) {
    const a = Math.min(amt * 0.8, 14);
    for (const s of [-1, 1]) {
      if (sx) {
        if (!this.hits(this.px + sx * 4, this.py + s * 14, mode) && !this.hits(this.px, this.py + s * a, mode)) {
          this.py += s * a;
          return;
        }
      } else if (!this.hits(this.px + s * 14, this.py + sy * 4, mode) && !this.hits(this.px + s * a, this.py, mode)) {
        this.px += s * a;
        return;
      }
    }
  }
  private tileIdx() {
    return Math.floor(this.px / T) + Math.floor((this.py - 4) / T) * W;
  }
  private frontIdx(dist = 26): number {
    const [fx, fy] = DIRV[this.dir];
    const tx = Math.floor((this.px + fx * dist) / T);
    const ty = Math.floor((this.py - 5 + fy * dist) / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return -1;
    return tx + ty * W;
  }
  private playAct(anim: RobiAnim, dur: number, done?: () => void) {
    this.action = { anim, t: 0, dur, done };
    this.anim = anim;
    this.animT = 0;
    this.animP = 0;
  }
  private face(x: number, y: number) {
    const dx = x - this.px;
    const dy = y - (this.py - 6);
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  }
  private snapCam() {
    this.camX = Math.max(0, Math.min(W * T - this.vw, this.px - this.vw / 2));
    this.camY = Math.max(0, Math.min(H * T - this.vh, this.py - this.vh * 0.47));
  }
  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + (Math.random() - 0.5) * 12, y: y - 2, vx: (Math.random() - 0.5) * 40, vy: -8 - Math.random() * 18, life: 0.45, max: 0.45, size: 3 + Math.random() * 3, color: "#e9dcc0", kind: 0 });
  }
  private spark(x: number, y: number, color = "#ffe066") {
    this.parts.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 60, life: 0.9, max: 0.9, size: 3 + Math.random() * 3, color, kind: 1 });
  }
  private burst(x: number, y: number, n = 16, color?: string) {
    for (let i = 0; i < n; i++) this.spark(x + (Math.random() - 0.5) * 20, y - Math.random() * 20, color ?? ["#ffe066", "#fff", "#ffb347"][i % 3]);
  }
  private floater(text: string, x: number, y: number) {
    this.floaters.push({ x, y, text, life: 1.2 });
  }
  private sync(force = false) {
    const moved = Math.abs(this.px - this.syncX) + Math.abs(this.py - this.syncY) > 6;
    if (!force && !moved && !this.exDirty) return;
    this.syncX = this.px;
    this.syncY = this.py;
    this.host.dispatch({ type: "WORLD_SYNC", x: Math.round(this.px), y: Math.round(this.py), explored: this.exDirty ? encodeExplored(this.explored) : undefined });
    this.exDirty = false;
  }
  private reveal() {
    const cx = Math.floor(this.px / T / EXS);
    const cy = Math.floor((this.py - 8) / T / EXS);
    const cell = cx + cy * EXW;
    if (cell === this.exCell) return;
    this.exCell = cell;
    const R = this.mazeIdx >= 0 ? 2 : 4;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R + 1) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= EXW || y >= EXH) continue;
        if (!this.explored[x + y * EXW]) {
          this.explored[x + y * EXW] = 1;
          this.exDirty = true;
        }
      }
  }

  /* ================= game loop ================= */
  private frame = (now: number) => {
    if (!this.alive) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    const st = this.host.getState();
    this.update(dt, st);
    this.render(st);
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(dt: number, st: GameState) {
    this.time += dt;
    this.animT += dt;
    if (st.world.opened !== this.openedRef || st.level !== this.levelRef) this.refresh(st);
    this.gear = st.equipped;
    const act = this.active;

    // ---- input vector (keyboard + virtual joystick, diagonal supported) ----
    let ix = 0;
    let iy = 0;
    if (act) {
      const k = this.keys;
      if (k.has("arrowleft") || k.has("a")) ix -= 1;
      if (k.has("arrowright") || k.has("d")) ix += 1;
      if (k.has("arrowup") || k.has("w")) iy -= 1;
      if (k.has("arrowdown") || k.has("s")) iy += 1;
      ix += this.joyX;
      iy += this.joyY;
    }
    let mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
      mag = 1;
    }
    this.running = act && (this.keys.has("shift") || this.runToggle);

    // ---- one-shot actions ----
    if (this.action) {
      const a = this.action;
      a.t += dt;
      if (a.anim === "fall" && this.knock) {
        const q = Math.min(1, a.t / (a.dur * 0.2));
        this.px = this.knock.x0 + (this.knock.x1 - this.knock.x0) * q;
        this.py = this.knock.y0 + (this.knock.y1 - this.knock.y0) * q;
      }
      if (a.anim === "water" && Math.random() < 0.5) {
        const [fx, fy] = DIRV[this.dir];
        this.parts.push({ x: this.px + fx * 20 + (Math.random() - 0.5) * 8, y: this.py - 22 + fy * 8, vx: fx * 20, vy: 30, life: 0.4, max: 0.4, size: 2.4, color: "#7cc8ff", kind: 2 });
      }
      if (a.t >= a.dur) {
        this.action = null;
        this.knock = null;
        a.done?.();
      }
    }
    const locked = this.action !== null;
    const air = this.jumpT >= 0;
    let moving = false;

    // ---- movement + collision ----
    if (!locked && mag > 0.05) {
      moving = true;
      if (Math.abs(ix) > Math.abs(iy) * 1.15) this.dir = ix > 0 ? "right" : "left";
      else if (Math.abs(iy) > Math.abs(ix) * 1.15) this.dir = iy > 0 ? "down" : "up";
      let sp = (this.running ? RUN : WALK) * (this.gear.includes("gear_boots") ? 1.3 : 1);
      if (!air && ground[this.tileIdx()] === G.PUDDLE) sp *= 0.5;
      const mx = ix * sp * dt;
      const my = iy * sp * dt;
      this.lastDx = ix / mag;
      this.lastDy = iy / mag;
      const mode = air ? 1 : 0;
      const bx = this.moveAxis(mx, 0, mode);
      const by = this.moveAxis(0, my, mode);
      if (bx && Math.abs(iy) < 0.25) this.nudge(Math.sign(mx), 0, sp * dt, mode);
      if (by && Math.abs(ix) < 0.25) this.nudge(0, Math.sign(my), sp * dt, mode);
      // pushing boulders
      let pushed: Thing | null = null;
      if ((bx || by) && !air) {
        const fi = this.frontIdx(HW + 9);
        const th = fi >= 0 ? this.thingAt.get(fi) : undefined;
        if (th && th.kind === "boulder" && !this.opened.has(th.id) && !this.slides.has(th.id)) pushed = th;
      }
      if (pushed) {
        this.pushT += dt;
        this.pushing = true;
        if (this.pushT > 0.45) this.pushBoulder(pushed);
      } else {
        this.pushT = 0;
        this.pushing = false;
      }
    } else {
      this.pushT = 0;
      this.pushing = false;
    }

    // ---- jump ----
    if (this.jumpT >= 0) {
      this.jumpT += dt / JUMP_T;
      this.pz = Math.sin(Math.min(1, this.jumpT) * Math.PI) * JUMP_H;
      if (this.jumpT >= 1) this.land();
    }
    if (this.landT > 0) this.landT -= dt;

    // ---- hazards (thorn bushes) ----
    if (this.jumpT < 0 && !locked) {
      if (this.robj[this.tileIdx()] === O.THORN) this.fall();
      else {
        this.safeX = this.px;
        this.safeY = this.py;
      }
    }

    // ---- boulder slides ----
    for (const [id, s] of this.slides) {
      s.p = Math.min(1, s.p + dt / 0.45);
      if (s.p >= 1 && !s.sent) {
        s.sent = true;
        this.host.dispatch({ type: "WORLD_OPEN", ids: [id] });
        sfx.thud();
        this.shake = 0.3;
        const t = things.find((z) => z.id === id);
        if (t?.pit) this.dust((t.pit[0] + 0.5) * T, (t.pit[1] + 0.7) * T, 10);
      }
      if (s.sent && this.opened.has(id)) this.slides.delete(id);
    }

    // ---- animation state machine ----
    let anim: RobiAnim = "idle";
    let p = 0;
    if (this.action) {
      anim = this.action.anim;
      p = Math.min(1, this.action.t / this.action.dur);
    } else if (this.jumpT >= 0) {
      anim = "jump";
      p = this.jumpT;
    } else if (this.landT > 0) {
      anim = "land";
      p = 1 - this.landT / 0.16;
    } else if (this.pushing) anim = "push";
    else if (moving) anim = this.running ? "run" : "walk";
    if (anim !== this.anim) {
      this.anim = anim;
      this.animT = 0;
    }
    this.animP = p;
    if ((anim === "walk" || anim === "run") && this.jumpT < 0) {
      const before = Math.floor(this.stepAcc);
      this.stepAcc += dt * (anim === "run" ? 4.46 : 2.86);
      if (Math.floor(this.stepAcc) !== before) this.footstep(anim === "run");
    }

    // ---- camera follow (smooth, clamped to world bounds) ----
    const tcx = Math.max(0, Math.min(W * T - this.vw, this.px - this.vw / 2 + this.lastDx * (moving ? 26 : 0)));
    const tcy = Math.max(0, Math.min(H * T - this.vh, this.py - this.vh * 0.47 + this.lastDy * (moving ? 20 : 0)));
    const kf = 1 - Math.exp(-dt * 6.5);
    this.camX += (tcx - this.camX) * kf;
    this.camY += (tcy - this.camY) * kf;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

    // ---- world systems ----
    this.reveal();
    this.regionT -= dt;
    if (this.regionT <= 0) {
      this.regionT = 0.2;
      this.updateRegion(st);
    }
    if (act && this.mazeIdx >= 0 && !this.mazeClaimed) this.mazeTime += dt;
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.5;
      this.pushMazeHud(st);
      for (const [i, t] of this.cut) if (this.time > t && this.tileIdx() !== i) (this.robj[i] = O.THORN), this.cut.delete(i);
    }
    this.nearT -= dt;
    if (this.nearT <= 0) {
      this.nearT = 0.1;
      this.updateNear(st);
    }
    if (act) {
      this.updateCritters(dt);
      this.updatePickups(dt, st);
      this.autoPick(st);
    }
    this.syncT += dt;
    if (this.syncT > 2.5) {
      this.syncT = 0;
      this.sync();
    }
    this.ambT -= dt;
    if (this.ambT <= 0) {
      this.ambT = 0.4;
      this.updateAmbience();
    }
    const inForest = this.region?.loc === "forest";
    this.forestA += ((inForest ? 1 : 0) - this.forestA) * Math.min(1, dt * 2);

    // ---- particles ----
    for (const q of this.parts) {
      q.life -= dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (q.kind === 1 || q.kind === 2 || q.kind === 3) q.vy += (q.kind === 3 ? 60 : 140) * dt;
    }
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    for (const f of this.prints) f.life -= dt;
    this.prints = this.prints.filter((f) => f.life > 0);
    this.pushHint = Math.max(0, this.pushHint - dt);

    // ---- minimap ----
    this.miniT -= dt;
    if (this.miniT <= 0 && this.minimap) {
      this.miniT = 0.12;
      const mc = this.minimap.getContext("2d");
      if (mc) drawMinimap(mc, this.minimap.width, this.minimap.height, this.explored, this.px, this.py, st, this.opened, this.time);
    }
  }

  private land() {
    this.jumpT = -1;
    this.pz = 0;
    this.landT = 0.16;
    if (this.hits(this.px, this.py, 2)) {
      let dx = this.lastDx;
      let dy = this.lastDy;
      if (!dx && !dy) [dx, dy] = DIRV[this.dir];
      let ok = false;
      for (const sgn of [1, -1]) {
        for (let k = 1; k <= 13 && !ok; k++) {
          const nx = this.px + dx * sgn * k * 6;
          const ny = this.py + dy * sgn * k * 6;
          if (!this.hits(nx, ny, 2)) {
            this.px = nx;
            this.py = ny;
            ok = true;
          }
        }
        if (ok) break;
      }
      if (!ok) {
        this.px = this.jsx;
        this.py = this.jsy;
      }
    }
    sfx.land();
    this.dust(this.px, this.py, 7);
    if (ground[this.tileIdx()] === G.PUDDLE) this.splash();
  }
  private splash() {
    sfx.step(3);
    for (let i = 0; i < 6; i++) this.parts.push({ x: this.px + (Math.random() - 0.5) * 16, y: this.py - 2, vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 40, life: 0.45, max: 0.45, size: 2.4, color: "#9fdcff", kind: 2 });
  }
  private fall() {
    if (this.action?.anim === "fall") return;
    const i = this.tileIdx();
    const cx = ((i % W) + 0.5) * T;
    const cy = (Math.floor(i / W) + 0.5) * T;
    let dx = this.safeX - cx;
    let dy = this.safeY - 5 - cy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    let x1 = this.safeX;
    let y1 = this.safeY;
    if (!this.hits(x1 + dx * 14, y1 + dy * 14, 2)) {
      x1 += dx * 14;
      y1 += dy * 14;
    }
    this.knock = { x0: this.px, y0: this.py, x1, y1 };
    this.playAct("fall", 1.3);
    this.shake = 0.35;
    sfx.fall();
    for (let k = 0; k < 8; k++) this.parts.push({ x: cx + (Math.random() - 0.5) * 20, y: cy, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 50, life: 0.7, max: 0.7, size: 4, color: "#4a8d3c", kind: 3 });
    this.host.toast("Aduh! Semak berduri — lompati (SPACE/JUMP) atau potong dengan alat (F/TOOL)", "🌵", "bad");
  }
  private footstep(run: boolean) {
    const g = ground[this.tileIdx()];
    const surface = g === G.BRIDGE || g === G.PLANK ? 2 : g === G.PUDDLE ? 3 : PATHLIKE[g] || g === G.SOIL ? 1 : 0;
    sfx.step(surface);
    if (surface === 3) this.splash();
    else if (surface !== 2) {
      const hor = this.dir === "left" || this.dir === "right";
      const side = Math.floor(this.stepAcc) % 2 ? 4 : -4;
      this.prints.push({ x: this.px + (hor ? 0 : side), y: this.py - 2 + (hor ? side * 0.6 : 0), life: 2.6, hor });
      if (this.prints.length > 40) this.prints.shift();
    }
    if (run) this.dust(this.px - this.lastDx * 8, this.py, 2);
    const o = this.robj[this.tileIdx()];
    if (o === O.TALLGRASS && Math.random() < 0.5) this.parts.push({ x: this.px, y: this.py - 10, vx: (Math.random() - 0.5) * 50, vy: -50, life: 0.6, max: 0.6, size: 3.5, color: "#7fd05a", kind: 3 });
  }
  private pushBoulder(t: Thing) {
    const [fx, fy] = DIRV[this.dir];
    this.pushT = 0;
    if (t.pit && t.pit[0] === t.tx + fx && t.pit[1] === t.ty + fy) {
      this.slides.set(t.id, { p: 0, sent: false });
      sfx.push();
      this.host.toast("Batu terdorong ke lubang — jalan terbuka!", "🪨", "good");
    } else if (this.pushHint <= 0) {
      this.pushHint = 3;
      sfx.error();
      this.host.toast("Batu ini hanya bisa didorong ke arah lubang di belakangnya", "🪨");
    }
  }

  /* ---------------- regions / mazes ---------------- */
  private updateRegion(st: GameState) {
    const tx = Math.floor(this.px / T);
    const ty = Math.floor((this.py - 4) / T);
    const r = regionAt(tx, ty);
    if (r.id !== this.region?.id) {
      this.region = r;
      this.host.onRegion(r);
      music.setForest(r.loc === "forest");
      if (r.loc !== st.location) this.host.dispatch({ type: "GO", loc: r.loc });
    }
    const mi = mazeAt(tx, ty);
    if (mi !== this.mazeIdx) {
      this.mazeIdx = mi;
      this.exCell = -1;
      if (mi >= 0) {
        this.mazeTime = 0;
        this.mazeClaimed = false;
        this.hudT = 0;
      } else this.host.onMaze(null);
    }
  }
  private mazeFound(idx: number) {
    let n = 0;
    for (const t of things) if (t.maze === idx && (t.kind === "cardspot" || t.kind === "chest") && this.opened.has(t.id)) n++;
    return n;
  }
  private pushMazeHud(st: GameState) {
    if (this.mazeIdx < 0) return;
    const m = MAZES[this.mazeIdx];
    this.host.onMaze({ idx: m.idx, name: m.name, icon: m.icon, found: this.mazeFound(m.idx), total: m.cards, keys: st.world.keys[m.id] || 0, time: this.mazeTime, done: !!st.world.mazes[m.id]?.done, best: st.world.mazes[m.id]?.best || 0 });
  }
  private finishMaze(t: Thing, st: GameState) {
    const m = MAZES[t.maze!];
    const first = !st.world.mazes[m.id]?.done;
    const time = this.mazeTime;
    this.face((t.tx + 0.5) * T, (t.ty + 0.5) * T);
    this.playAct("interact", 0.6, () => {
      this.mazeClaimed = true;
      this.host.dispatch({ type: "MAZE_DONE", maze: m.id, time });
      sfx.chest();
      this.burst((t.tx + 0.5) * T, (t.ty + 0.3) * T, 30);
      this.shake = 0.3;
      this.playAct("victory", 2);
      this.host.onMazeDone({ idx: m.idx, time, first, reward: first ? m.reward : Math.round(m.reward * 0.1), card: first ? resultForCard(m.special) : null, found: this.mazeFound(m.idx), total: m.cards });
    });
  }

  /* ---------------- interaction ---------------- */
  private updateNear(st: GameState) {
    const cx = this.px;
    const cy = this.py - 6;
    let best: Target | null = null;
    let bd = 1e9;
    if (!this.action && this.jumpT < 0) {
      for (const t of things) {
        const x = (t.tx + 0.5) * T;
        const y = (t.ty + 0.5) * T;
        if (Math.abs(x - cx) > 70 || Math.abs(y - cy) > 70) continue;
        const d = Math.hypot(x - cx, y - cy);
        const range = this.block[t.tx + t.ty * W] || SOLID[this.robj[t.tx + t.ty * W]] ? 62 : 54;
        if (d < range && d < bd) {
          const tg = this.thingTarget(t, st);
          if (tg) {
            best = tg;
            bd = d;
          }
        }
      }
      for (const cr of this.critters) {
        const d = Math.hypot(cr.x - cx, cr.y - 12 - cy);
        if (d < 52 && d < bd) {
          best = this.critterTarget(cr, st);
          bd = d;
        }
      }
      for (const loc of Object.keys(st.hidden) as LocationId[])
        for (const h of st.hidden[loc]) {
          const x = (h.x + 0.5) * T;
          const y = (h.y + 0.5) * T;
          const d = Math.hypot(x - cx, y - cy);
          if (d < 44 && d < bd) {
            bd = d;
            best = { key: "sp_" + h.id, x, y: y - 26, label: "🔍 SEARCH", act: () => this.searchSparkle(loc, h.id, x, y) };
          }
        }
      if (!best) best = this.frontTarget();
    }
    this.target = best;
    const key = best ? `${best.key}|${best.label}|${best.toolLabel ?? ""}` : "";
    if (key !== this.promptKey) {
      this.promptKey = key;
      this.host.onPrompt(best ? { label: best.label, tool: best.toolLabel } : null);
    }
  }
  private frontTarget(): Target | null {
    let fi = this.frontIdx(28);
    if (fi < 0) return null;
    if (this.robj[fi] !== O.THORN && this.robj[fi] !== O.LOWFENCE) {
      const far = this.frontIdx(56);
      if (far >= 0 && (this.robj[far] === O.THORN || this.robj[far] === O.LOWFENCE)) fi = far;
    }
    const o = this.robj[fi];
    const x = ((fi % W) + 0.5) * T;
    const y = Math.floor(fi / W) * T;
    if (o === O.THORN) {
      const cutIt = () => this.cutThorn(fi);
      return { key: "thorn" + fi, x, y: y - 6, label: "✂️ POTONG SEMAK", act: cutIt, tool: cutIt, toolLabel: "✂️ Potong" };
    }
    if (o === O.LOWFENCE) return { key: "lf" + fi, x, y: y - 6, label: "⬆ LOMPATI", act: () => this.jump() };
    const info = PLANT_INFO[o];
    if (info) return { key: "info" + o, x, y: y - 20, label: `ℹ️ ${info[0]}`, act: () => this.host.toast(info[1], "📖") };
    return null;
  }
  private cutThorn(i: number) {
    this.playAct("tool", 0.45, () => {
      if (this.robj[i] !== O.THORN) return;
      this.robj[i] = O.NONE;
      this.cut.set(i, this.time + 60);
      const x = ((i % W) + 0.5) * T;
      const y = (Math.floor(i / W) + 0.6) * T;
      for (let k = 0; k < 12; k++) this.parts.push({ x: x + (Math.random() - 0.5) * 24, y: y - 10, vx: (Math.random() - 0.5) * 120, vy: -70 - Math.random() * 60, life: 0.8, max: 0.8, size: 4, color: k % 2 ? "#4a5d3a" : "#d93a52", kind: 3 });
      this.floater("✂️ Terpotong!", x, y - 20);
    });
    sfx.cut();
  }
  private searchSparkle(loc: LocationId, id: string, x: number, y: number) {
    this.face(x, y);
    sfx.search();
    this.playAct("search", 1.0, () => {
      const s = this.host.getState();
      if (!s.hidden[loc].some((o) => o.id === id)) return;
      const result = drawCard(loc, luckOf(s));
      this.host.dispatch({ type: "CARD_FOUND", result, loc, hiddenId: id });
      this.burst(x, y);
      this.floater(`+${result.points} ⭐`, x, y - 20);
      this.host.onCard(result);
    });
  }
  private openCard(t: Thing, anim: RobiAnim, dur: number) {
    const x = (t.tx + 0.5) * T;
    const y = (t.ty + 0.5) * T;
    this.face(x, y);
    this.playAct(anim, dur, () => {
      const s = this.host.getState();
      if (s.world.opened.includes(t.id) || !t.card) return;
      const result = resultForCard(t.card);
      const loc: LocationId = t.maze !== undefined ? MAZES[t.maze].loc : regionAt(t.tx, t.ty).loc;
      this.host.dispatch({ type: "CARD_FOUND", result, loc, worldId: t.id });
      this.burst(x, y - 10, 22);
      this.floater(`+${result.points} ⭐`, x, y - 24);
      this.host.onCard(result);
    });
  }
  private simplePick(x: number, y: number, ready: boolean, action: Action, msg: string, pts: number, wait: string) {
    if (!ready) {
      this.host.toast(wait, "⏳");
      return;
    }
    this.face(x, y);
    this.playAct("harvest", 0.8);
    sfx.harvest();
    this.host.dispatch(action);
    this.floater(`+${pts} ⭐`, x, y - 26);
    this.host.toast(msg, "✨", "good");
  }
  private thingTarget(t: Thing, st: GameState): Target | null {
    const x = (t.tx + 0.5) * T;
    const y = (t.ty + 0.5) * T;
    const done = this.opened.has(t.id);
    const mk = (label: string, act: () => void, up = 34, extra?: Partial<Target>): Target => ({ key: t.id, x, y: y - up, label, act, ...extra });
    const toast = this.host.toast;
    switch (t.kind) {
      case "plot": {
        const i = t.idx!;
        const p = st.plots[i];
        if (!p.crop)
          return mk("🌱 TANAM", () => {
            if (CROP_ORDER.reduce((a, cid) => a + st.inventory.seeds[cid], 0) <= 0) {
              sfx.error();
              toast("Bibit habis! Beli bibit di menu TAS 🎒", "🌱", "bad");
              return;
            }
            this.face(x, y);
            this.host.onSeedPicker(i);
          });
        const def = CROPS[p.crop];
        if (p.stage >= 3)
          return mk("🧺 PANEN", () => {
            this.face(x, y);
            this.playAct("harvest", 0.8);
            sfx.harvest();
            this.host.dispatch({ type: "HARVEST", plot: i });
            this.floater(`+${def.points} ⭐ +${def.coins} 🪙`, x, y - 26);
            toast(`Panen ${def.name}! +${def.points} poin, +${def.coins} koin`, def.emoji, "good");
          });
        if (!p.watered) {
          const water = () => {
            this.face(x, y);
            this.playAct("water", 0.9);
            sfx.water();
            this.host.dispatch({ type: "WATER", plot: i });
            this.floater("+3 ⭐ 💧", x, y - 26);
          };
          return mk("💧 SIRAM", water, 34, { tool: water, toolLabel: "💧 Siram" });
        }
        return mk(`🌿 ${def.name.toUpperCase()}`, () => toast(`${def.emoji} ${def.name}: tumbuh ${Math.round((p.progress / def.growTime) * 100)}% • panen +${def.points} poin, +${def.coins} koin`, "📖"));
      }
      case "apple": {
        const r = st.trees[t.idx!].ready;
        return mk(r ? "🍎 PETIK APEL" : "🌱 BELUM BERBUAH", () => this.simplePick(x, y, r, { type: "PICK_FRUIT", idx: t.idx! }, "Apel segar! +8 poin, +4 koin", 8, "Apel masih tumbuh, kembali lagi nanti"), 70);
      }
      case "hay":
        return mk(st.hay.ready ? "🌾 AMBIL JERAMI" : "⏳ JERAMI", () => this.simplePick(x, y, st.hay.ready, { type: "TAKE_HAY" }, "+2 pakan ternak 🌾", 2, "Jerami belum siap"), 44);
      case "flower": {
        const r = st.flowers[t.idx!].ready;
        return r ? mk("🌷 PETIK BUNGA", () => this.simplePick(x, y, true, { type: "PICK_FLOWER", idx: t.idx! }, "Bunga cantik! +5 poin, +1 koin", 5, ""), 44) : null;
      }
      case "mushroom": {
        const r = st.mushrooms[t.idx!].ready;
        return r ? mk("🍄 PETIK JAMUR", () => this.simplePick(x, y, true, { type: "PICK_MUSHROOM", idx: t.idx! }, "Jamur ajaib! +6 poin, +2 koin", 6, ""), 34) : null;
      }
      case "dock":
        return mk("🎣 MANCING", () => {
          this.dir = "right";
          this.host.onFishing();
        });
      case "nest": {
        const ch = st.animals.find((a) => a.id === "chicken")!;
        return mk(ch.ready ? "🥚 AMBIL TELUR" : "🪹 SARANG", () => {
          if (!ch.ready) {
            toast(ch.fed ? "Ayam sedang bertelur... tunggu sebentar" : "Beri makan ayam dulu agar bertelur", "🐔");
            return;
          }
          this.face(x, y);
          this.playAct("interact", 0.7);
          sfx.harvest();
          sfx.cluck();
          this.host.dispatch({ type: "COLLECT", animal: "chicken" });
          this.floater(`+${PRODUCE.egg.points} ⭐`, x, y - 26);
          toast(`Dapat Telur! +${PRODUCE.egg.points} poin`, "🥚", "good");
        });
      }
      case "cardspot":
        return done ? null : mk("🔍 SEARCH", () => (sfx.search(), this.openCard(t, "search", 1.0)));
      case "chest": {
        if (done) return null;
        const mid = t.maze !== undefined ? MAZES[t.maze].id : "";
        if (t.locked && !this.opened.has(t.id + "_unlock")) {
          if ((st.world.keys[mid] || 0) <= 0) return mk("🔒 PETI TERKUNCI", () => (sfx.error(), toast("Peti terkunci! Cari kunci 🗝️ di labirin ini", "🔒", "bad")), 44);
          return mk("🗝️ BUKA PETI", () => {
            this.host.dispatch({ type: "KEY_USE", id: t.id + "_unlock", maze: mid });
            sfx.chest();
            this.openCard(t, "interact", 0.7);
          }, 44);
        }
        return mk("📦 BUKA PETI", () => (sfx.chest(), this.openCard(t, "interact", 0.7)), 44);
      }
      case "key":
        return done ? null : mk("🗝️ AMBIL KUNCI", () => this.takeKey(t), 30);
      case "button":
        return done
          ? null
          : mk("🔘 TEKAN TOMBOL", () => {
              this.face(x, y);
              this.playAct("interact", 0.7, () => {
                this.host.dispatch({ type: "WORLD_OPEN", ids: t.door ? [t.id, t.door] : [t.id] });
                sfx.button();
                this.shake = 0.6;
                toast("Tombol rahasia aktif! Terdengar pintu batu bergeser di suatu tempat...", "🔘", "gold");
              });
            }, 26);
      case "door":
        return done ? null : mk("❔ DINDING ANEH", () => toast("Dinding batu ini terlihat berbeda... mungkin ada tombol tersembunyi di labirin.", "🧱"), 50);
      case "gate": {
        if (done) return null;
        const mid = MAZES[t.maze!].id;
        if ((st.world.keys[mid] || 0) <= 0) return mk("🔒 GERBANG TERKUNCI", () => (sfx.error(), toast("Gerbang terkunci! Temukan kunci 🗝️ di jalan buntu labirin ini", "🔒", "bad")), 56);
        return mk("🗝️ BUKA GERBANG", () => {
          this.face(x, y);
          this.playAct("interact", 0.7, () => {
            this.host.dispatch({ type: "KEY_USE", id: t.id, maze: mid });
            sfx.gate();
            this.burst(x, y - 20, 14);
            toast("Gerbang terbuka!", "🗝️", "good");
          });
        }, 56);
      }
      case "mazegate": {
        const m = MAZES[t.maze!];
        if (st.level >= m.level) return null;
        return mk(`🔒 BUTUH LEVEL ${m.level}`, () => (sfx.error(), toast(`${m.name} terbuka di Level ${m.level}. Selesaikan misi di menu QUEST untuk naik level!`, "🔒", "bad")), 70);
      }
      case "finish":
        return this.mazeClaimed ? null : mk("🏆 BUKA PETI HADIAH", () => this.finishMaze(t, st), 50);
      case "sign":
        return mk("📖 BACA", () => (sfx.click(), toast(t.text ?? "", "📜")), 44);
      case "boulder":
        return done || this.slides.has(t.id) ? null : mk("🪨 DORONG", () => toast("Berjalanlah ke arah batu dan tahan — ROBI akan mendorongnya ke lubang!", "🪨"), 44);
    }
    return null;
  }
  private takeKey(t: Thing) {
    if (this.opened.has(t.id)) return;
    this.opened.add(t.id);
    this.host.dispatch({ type: "KEY_PICK", id: t.id, maze: MAZES[t.maze!].id });
    sfx.key();
    this.burst((t.tx + 0.5) * T, (t.ty + 0.4) * T, 12);
    this.floater("🗝️ +1 Kunci", (t.tx + 0.5) * T, t.ty * T);
    this.host.toast("Kunci ditemukan! Gunakan untuk membuka gerbang / peti terkunci", "🗝️", "gold");
  }
  private autoPick(st: GameState) {
    if (this.jumpT >= 0) return;
    for (const t of things) {
      if (t.kind !== "key" || this.opened.has(t.id)) continue;
      if (Math.hypot((t.tx + 0.5) * T - this.px, (t.ty + 0.6) * T - this.py) < 22) this.takeKey(t);
    }
    void st;
  }
  private critterTarget(cr: Critter, st: GameState): Target {
    const def = ANIMALS.find((a) => a.id === cr.id)!;
    const a = st.animals.find((z) => z.id === cr.id)!;
    const prod = PRODUCE[def.produce];
    const voice = () => (cr.id === "cow" ? sfx.moo() : cr.id === "sheep" ? sfx.baa() : cr.id === "goat" ? sfx.bleat() : sfx.cluck());
    const label = a.ready ? `${prod.emoji} AMBIL ${prod.name.toUpperCase()}` : a.fed ? "⏳ MENUNGGU" : "🌾 BERI MAKAN";
    return {
      key: "cr_" + cr.id,
      x: cr.x,
      y: cr.y - cr.w * 0.9 - 18,
      label,
      act: () => {
        const s = this.host.getState();
        const cur = s.animals.find((z) => z.id === cr.id)!;
        this.face(cr.x, cr.y - 10);
        cr.wait = 2.5;
        voice();
        if (cur.ready) {
          this.playAct("harvest", 0.8);
          sfx.harvest();
          this.host.dispatch({ type: "COLLECT", animal: cr.id });
          this.floater(`+${prod.points} ⭐`, cr.x, cr.y - 50);
          this.host.toast(`Dapat ${prod.name}! +${prod.points} poin`, prod.emoji, "good");
        } else if (!cur.fed) {
          if (s.inventory.feed <= 0) {
            sfx.error();
            this.host.toast("Pakan habis! Ambil jerami dekat rumah ROBI atau beli di menu TAS", "🌾", "bad");
            return;
          }
          this.playAct("feed", 0.9);
          sfx.feed();
          this.host.dispatch({ type: "FEED", animal: cr.id });
          this.floater("+3 ⭐ 💗", cr.x, cr.y - 50);
          this.host.toast(`${def.name} makan dengan lahap! ${prod.name} siap dalam ${def.time} detik`, "🌾", "good");
        } else this.host.toast(`${def.name} sedang menghasilkan ${prod.name}... ${Math.round((cur.progress / def.time) * 100)}%`, "⏳");
      },
    };
  }

  /* ---------------- living world ---------------- */
  private updateCritters(dt: number) {
    for (const a of this.critters) {
      if (a.wait > 0) {
        a.wait -= dt;
        continue;
      }
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) {
        a.wait = 1.2 + Math.random() * 3.5;
        a.tx = (PEN.x0 + 0.5 + Math.random() * (PEN.x1 - PEN.x0 - 0.5)) * T;
        a.ty = (PEN.y0 + 0.8 + Math.random() * (PEN.y1 - PEN.y0 - 0.3)) * T;
      } else {
        const sp = a.id === "chicken" ? 30 : 20;
        a.x += (dx / d) * sp * dt;
        a.y += (dy / d) * sp * dt;
        a.face = dx > 0 ? -1 : 1;
        a.walk += dt;
      }
    }
    this.mooT -= dt;
    if (this.mooT <= 0) {
      this.mooT = 7 + Math.random() * 8;
      if (this.region?.id === "animal") [sfx.moo, sfx.baa, sfx.bleat, sfx.cluck][Math.floor(Math.random() * 4)]();
    }
  }
  private updatePickups(dt: number, st: GameState) {
    this.pickT -= dt;
    if (this.pickT <= 0) {
      this.pickT = 4.5;
      this.pickups = this.pickups.filter((p) => Math.hypot(p.x - this.px, p.y - this.py) < 22 * T);
      if (this.pickups.length < 5) {
        const a = Math.random() * Math.PI * 2;
        const d = (4 + Math.random() * 5) * T;
        const x = this.px + Math.cos(a) * d;
        const y = this.py + Math.sin(a) * d;
        const tx = Math.floor(x / T);
        const ty = Math.floor(y / T);
        if (tx > 2 && ty > 2 && tx < W - 2 && ty < H - 2 && !this.solidAt(tx, ty, 2) && this.robj[tx + ty * W] === O.NONE && !this.thingAt.has(tx + ty * W))
          this.pickups.push({ x: (tx + 0.5) * T, y: (ty + 0.6) * T, kind: Math.random() < 0.62 ? "coin" : "star", ph: Math.random() * 6 });
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(p.x - this.px, p.y - this.py) < 24) {
        this.pickups.splice(i, 1);
        this.host.dispatch({ type: "PICKUP", kind: p.kind });
        sfx.pickup();
        this.floater(p.kind === "coin" ? "+2 🪙" : "+5 ⭐", p.x, p.y - 24);
        this.burst(p.x, p.y - 10, 6);
      }
    }
    void st;
  }
  private updateAmbience() {
    const tx = Math.floor(this.px / T);
    const ty = Math.floor(this.py / T);
    let best = 99;
    for (let dy = -6; dy <= 6; dy++)
      for (let dx = -6; dx <= 6; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (x < 0 || y < 0 || x >= W || y >= H || ground[x + y * W] !== G.WATER) continue;
        best = Math.min(best, Math.hypot(dx, dy));
      }
    ambient.setWater(best > 6.5 ? 0 : 1 - best / 6.5);
  }

  /* ==================================================================
   * RENDER
   * ================================================================== */
  private render(st: GameState) {
    const c = this.c;
    const s = this.scale * this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#2f7d3a";
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    let cx = this.camX;
    let cy = this.camY;
    if (this.shake > 0) {
      cx += (Math.random() - 0.5) * this.shake * 10;
      cy += (Math.random() - 0.5) * this.shake * 10;
    }
    c.setTransform(s, 0, 0, s, -Math.round(cx * s), -Math.round(cy * s));
    c.imageSmoothingEnabled = true;
    const x0 = Math.max(0, Math.floor(cx / T));
    const y0 = Math.max(0, Math.floor(cy / T));
    const x1 = Math.min(W - 1, Math.floor((cx + this.vw) / T));
    const y1 = Math.min(H - 1, Math.floor((cy + this.vh) / T));
    this.drawGround(c, x0, y0, x1, y1);

    // footprints
    for (const f of this.prints) {
      c.globalAlpha = Math.min(0.28, f.life * 0.14);
      c.fillStyle = "#3b2a14";
      c.beginPath();
      c.ellipse(f.x, f.y, f.hor ? 4.5 : 3, f.hor ? 3 : 4.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    this.drawDecor(c, st);

    // ---- y-sorted drawables ----
    const D = this.draws;
    D.length = 0;
    const vx0 = x0 * T - 150;
    const vx1 = (x1 + 1) * T + 150;
    const vy0 = y0 * T - 60;
    const vy1 = (y1 + 1) * T + 280;
    for (let ty = Math.max(0, y0 - 1); ty <= Math.min(H - 1, y1 + 6); ty++)
      for (let tx = Math.max(0, x0 - 6); tx <= Math.min(W - 1, x1 + 3); tx++) {
        const o = this.robj[tx + ty * W];
        if (!o || o === O.BLOCK || o === O.GATE || o === O.MAZEGATE || o === O.SECRET) continue;
        D.push({ y: (ty + 1) * T - (o === O.FLOWER || o === O.TALLGRASS ? 12 : 0), k: 0, a: tx, b: ty, o, r: null });
      }
    for (const t of things) {
      const y = (t.ty + 1) * T;
      const x = t.tx * T;
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      const flat = t.kind === "plot" || t.kind === "button" || t.kind === "key" ? T * 0.5 : t.kind === "cardspot" || t.kind === "flower" || t.kind === "mushroom" || t.kind === "dock" ? T * 0.15 : t.kind === "mazegate" || t.kind === "gate" ? -2 : 0;
      D.push({ y: y - flat, k: 1, a: 0, b: 0, o: 0, r: t });
    }
    for (const loc of Object.keys(st.hidden) as LocationId[]) for (const h of st.hidden[loc]) D.push({ y: (h.y + 0.75) * T, k: 5, a: h.x, b: h.y, o: 0, r: null });
    for (const a of this.critters) D.push({ y: a.y, k: 2, a: 0, b: 0, o: 0, r: a });
    for (const p of this.pickups) D.push({ y: p.y, k: 4, a: 0, b: 0, o: 0, r: p });
    D.push({ y: this.py, k: 3, a: 0, b: 0, o: 0, r: null });
    D.sort((p, q) => p.y - q.y);
    for (const d of D) {
      switch (d.k) {
        case 0:
          this.drawObj(c, d.o, d.a, d.b);
          break;
        case 1:
          this.drawThing(c, d.r as Thing, st);
          break;
        case 2:
          this.drawCritter(c, d.r as Critter, st);
          break;
        case 3:
          this.drawPlayer(c);
          break;
        case 4:
          this.drawPickup(c, d.r as Pickup);
          break;
        case 5:
          this.drawSparkle(c, (d.a + 0.5) * T, (d.b + 0.6) * T, 1);
          break;
      }
    }

    // faint silhouette so ROBI stays visible behind tall corn / trees / buildings
    c.globalAlpha = 0.3;
    drawRobi(c, this.px, this.py - this.pz, this.dir, this.anim, this.animT, this.animP, { crown: this.gear.includes("gear_crown"), silver: this.gear.includes("gear_silverhat") });
    c.globalAlpha = 1;

    // butterflies over the meadow
    for (let i = 0; i < 7; i++) {
      const bx = (33 + i * 2.7) * T + Math.sin(this.time * 0.6 + i * 2) * 70;
      const by = (46 + (i % 3) * 4) * T + Math.cos(this.time * 0.8 + i) * 40;
      if (bx < vx0 || bx > vx1 || by < vy0 || by > vy1) continue;
      const f = Math.abs(Math.sin(this.time * 14 + i));
      c.fillStyle = ["#ff9ec4", "#ffe066", "#8fd3ff"][i % 3];
      c.beginPath();
      c.ellipse(bx - 3.5 * f, by, 3.5 * f + 0.6, 4.5, 0, 0, Math.PI * 2);
      c.ellipse(bx + 3.5 * f, by, 3.5 * f + 0.6, 4.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#3b2a14";
      c.fillRect(bx - 0.6, by - 4, 1.2, 8);
    }
    // cloud shadows drifting over the land
    c.fillStyle = "rgba(20,40,70,.07)";
    for (let i = 0; i < 6; i++) {
      const wx = ((i * 1130 + this.time * 14) % (W * T + 800)) - 400;
      const wy = ((i * 733) % (H * T)) + Math.sin(i) * 100;
      if (wx < vx0 - 300 || wx > vx1 + 300 || wy < vy0 - 200 || wy > vy1 + 200) continue;
      c.beginPath();
      c.ellipse(wx, wy, 230, 110, 0, 0, Math.PI * 2);
      c.ellipse(wx + 150, wy + 40, 150, 80, 0, 0, Math.PI * 2);
      c.fill();
    }

    // particles
    for (const q of this.parts) {
      const a = Math.max(0, q.life / q.max);
      c.globalAlpha = q.kind === 0 ? a * 0.7 : a;
      c.fillStyle = q.color;
      if (q.kind === 0) {
        c.beginPath();
        c.arc(q.x, q.y, q.size * (1.6 - a * 0.6), 0, Math.PI * 2);
        c.fill();
      } else if (q.kind === 1) this.star(c, q.x, q.y, q.size * (0.5 + a * 0.6), q.life * 6);
      else if (q.kind === 2) {
        c.beginPath();
        c.ellipse(q.x, q.y, q.size * 0.7, q.size, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        c.save();
        c.translate(q.x, q.y);
        c.rotate(q.life * 9);
        c.beginPath();
        c.ellipse(0, 0, q.size, q.size * 0.45, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    c.globalAlpha = 1;

    // interact indicator
    if (this.target && this.active) this.bubble(c, this.target.x, this.target.y + Math.sin(this.time * 5) * 2, this.target.label);
    // floating texts
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `700 14px ${FONT}`;
    for (const f of this.floaters) {
      c.globalAlpha = Math.min(1, f.life * 2);
      c.lineWidth = 3.5;
      c.strokeStyle = "rgba(20,20,40,.85)";
      c.strokeText(f.text, f.x, f.y);
      c.fillStyle = "#ffe45c";
      c.fillText(f.text, f.x, f.y);
    }
    c.globalAlpha = 1;

    // ---- screen-space atmosphere ----
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.forestA > 0.02) {
      c.fillStyle = `rgba(18,48,58,${0.16 * this.forestA})`;
      c.fillRect(0, 0, this.cw, this.ch);
      for (let i = 0; i < 16; i++) {
        const fx = ((hash2(i, 3) * this.cw + Math.sin(this.time * 0.7 + i) * 40 - cx * 0.3) % this.cw + this.cw) % this.cw;
        const fy = ((hash2(i, 9) * this.ch + Math.cos(this.time * 0.9 + i * 2) * 30 - cy * 0.3) % this.ch + this.ch) % this.ch;
        const a = (0.35 + 0.65 * Math.abs(Math.sin(this.time * 1.6 + i))) * this.forestA;
        c.fillStyle = `rgba(210,255,140,${a * 0.9})`;
        c.beginPath();
        c.arc(fx, fy, 2.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = `rgba(210,255,140,${a * 0.22})`;
        c.beginPath();
        c.arc(fx, fy, 7, 0, Math.PI * 2);
        c.fill();
      }
    }
    for (const l of this.leaves) {
      l.y += 0.0009 * l.s * 3;
      l.x += 0.0006 + Math.sin(this.time + l.ph) * 0.0006;
      if (l.y > 1.05) {
        l.y = -0.05;
        l.x = Math.random();
      }
      if (l.x > 1.05) l.x = -0.05;
      c.save();
      c.translate(l.x * this.cw, l.y * this.ch);
      c.rotate(this.time * 2 * l.s + l.ph);
      c.globalAlpha = 0.75;
      c.fillStyle = this.region?.id === "meadow" ? "#ffb3d1" : l.ph % 2 > 1 ? "#a6d94a" : "#6fbf45";
      c.beginPath();
      c.ellipse(0, 0, 6 * l.s, 2.8 * l.s, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    if (this.gear.includes("decor_rainbow") && this.region?.id === "valley") {
      const cols = ["#ff5b5b", "#ffa94d", "#ffe066", "#69db7c", "#4dabf7", "#b197fc"];
      c.globalAlpha = 0.3;
      c.lineWidth = 7;
      cols.forEach((col, i) => {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(this.cw * 0.7, this.ch * 0.52, this.cw * 0.34 - i * 7, Math.PI * 1.05, Math.PI * 1.95);
        c.stroke();
      });
      c.globalAlpha = 1;
    }
    const g = c.createRadialGradient(this.cw / 2, this.ch / 2, Math.min(this.cw, this.ch) * 0.45, this.cw / 2, this.ch / 2, Math.max(this.cw, this.ch) * 0.75);
    g.addColorStop(0, "rgba(255,240,200,0)");
    g.addColorStop(1, "rgba(20,30,60,.3)");
    c.fillStyle = g;
    c.fillRect(0, 0, this.cw, this.ch);
  }

  private star(c: Ctx, x: number, y: number, r: number, rot: number) {
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 ? r * 0.38 : r;
      const a = rot + (i / 8) * Math.PI * 2;
      c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    c.closePath();
    c.fill();
  }
  private bubble(c: Ctx, x: number, y: number, text: string) {
    c.font = `700 11px ${FONT}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    const w = c.measureText(text).width + 30;
    SP.rr(c, x - w / 2, y - 10, w, 20, 10);
    c.fillStyle = "#fde047";
    c.fill();
    c.strokeStyle = "#92400e";
    c.lineWidth = 1.6;
    c.stroke();
    c.beginPath();
    c.moveTo(x - 5, y + 10);
    c.lineTo(x, y + 16);
    c.lineTo(x + 5, y + 10);
    c.fillStyle = "#fde047";
    c.fill();
    SP.rr(c, x - w / 2 + 3, y - 7, 14, 14, 4);
    c.fillStyle = "#1c2646";
    c.fill();
    c.fillStyle = "#fff";
    c.fillText("E", x - w / 2 + 10, y + 0.5);
    c.fillStyle = "#451a03";
    c.fillText(text, x + 8, y + 0.5);
  }

  private biome(tx: number, ty: number, g: number): number {
    if (g === G.FOREST) return 1;
    if (g === G.MEADOW) return 2;
    if (tx >= 63 && ty >= 37) return 1;
    if (tx >= 30 && tx <= 52 && ty >= 42 && ty <= 58) return 2;
    return 0;
  }
  private pl(tx: number, ty: number): number {
    return tx >= 0 && ty >= 0 && tx < W && ty < H ? PATHLIKE[ground[tx + ty * W]] : 0;
  }
  private isWater(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < W && ty < H && ground[tx + ty * W] === G.WATER;
  }
  private drawGround(c: Ctx, x0: number, y0: number, x1: number, y1: number) {
    const S = T + 0.6;
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const i = tx + ty * W;
        const g = ground[i];
        const X = tx * T;
        const Y = ty * T;
        const h = hash2(tx, ty);
        const v = (h * 4) | 0;
        if (g === G.WATER) {
          this.drawWater(c, tx, ty);
          continue;
        }
        if (g === G.BRIDGE || g === G.PLANK) {
          const hor = !!(this.pl(tx - 1, ty) || this.pl(tx + 1, ty));
          const rails = (this.isWater(tx, ty - 1) ? 1 : 0) | (this.isWater(tx + 1, ty) ? 2 : 0) | (this.isWater(tx, ty + 1) ? 4 : 0) | (this.isWater(tx - 1, ty) ? 8 : 0);
          c.drawImage(SP.bridgeTile(hor, rails).c, X, Y, S, S);
          continue;
        }
        if (g === G.SOIL) {
          c.drawImage(SP.soilTile(v % 2).c, X, Y, S, S);
          continue;
        }
        if (g === G.PEN) {
          c.drawImage(SP.penTile(v % 2).c, X, Y, S, S);
          continue;
        }
        c.drawImage(SP.grass(this.biome(tx, ty, g), v).c, X, Y, S, S);
        if (PATHLIKE[g]) {
          const mask = (this.pl(tx, ty - 1) ? 1 : 0) | (this.pl(tx + 1, ty) ? 2 : 0) | (this.pl(tx, ty + 1) ? 4 : 0) | (this.pl(tx - 1, ty) ? 8 : 0);
          c.drawImage(SP.pathTile(mask, v % 2).c, X, Y, S, S);
          if (g === G.PUDDLE) c.drawImage(SP.puddle().c, X, Y, T, T);
          else if (g === G.START) c.drawImage(SP.padTile("start").c, X, Y, T, T);
          else if (g === G.FINISH) c.drawImage(SP.padTile("finish").c, X, Y, T, T);
          else if (g === G.PIT) {
            const owner = this.pitOwner.get(i);
            c.drawImage(SP.pit(!!owner && this.opened.has(owner.id)).c, X, Y, T, T);
          } else if (h < 0.34 && mazeAt(tx, ty) >= 0) c.drawImage(SP.pathFlowers(v).c, X, Y, T, T);
        }
      }
  }
  private drawWater(c: Ctx, tx: number, ty: number) {
    const X = tx * T;
    const Y = ty * T;
    c.fillStyle = (tx + ty) % 2 ? "#3d9fe8" : "#3a9be4";
    c.fillRect(X, Y, T + 0.6, T + 0.6);
    c.fillStyle = "rgba(255,255,255,.34)";
    for (let k = 0; k < 3; k++) {
      const h = hash2(tx * 3 + k, ty * 7 + k);
      const yy = (h * T + this.time * 16 * (0.7 + k * 0.25)) % (T - 2);
      c.fillRect(X + 3 + hash2(tx + k * 5, ty) * 26, Y + yy, 9 + h * 9, 1.6);
    }
    const land = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return false;
      const g = ground[x + y * W];
      return g !== G.WATER && g !== G.BRIDGE && g !== G.PLANK;
    };
    const wob = Math.sin(this.time * 2.2 + tx + ty) * 1.2;
    if (land(tx, ty - 1)) {
      c.fillStyle = "rgba(10,50,110,.3)";
      c.fillRect(X, Y, T, 7);
      c.fillStyle = "rgba(255,255,255,.75)";
      c.fillRect(X, Y + 6 + wob, T, 1.8);
    }
    c.fillStyle = "rgba(255,255,255,.6)";
    if (land(tx, ty + 1)) c.fillRect(X, Y + T - 3.5 + wob, T, 2);
    if (land(tx - 1, ty)) c.fillRect(X + 1.5 + wob, Y, 2, T);
    if (land(tx + 1, ty)) c.fillRect(X + T - 3.5 + wob, Y, 2, T);
  }
  /** reward decorations near ROBI's home */
  private drawDecor(c: Ctx, st: GameState) {
    const eq = st.equipped;
    if (!eq.some((e) => e.startsWith("decor"))) return;
    if (Math.abs(this.px - 26 * T) > 30 * T || Math.abs(this.py - 30 * T) > 24 * T) return;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    const em = (e: string, tx: number, ty: number, size: number, bob = 0) => {
      c.font = `${size}px sans-serif`;
      c.fillText(e, tx * T, ty * T + Math.sin(this.time * 2 + tx) * bob);
    };
    if (eq.includes("decor_scarecrow")) em("🤖", 29.4, 27, 34, 1.5);
    if (eq.includes("decor_fence")) for (let i = 0; i < 6; i++) em(i % 2 ? "🌼" : "🌷", 21.6 + i, 29.7, 20, 1.5);
    if (eq.includes("decor_fountain")) em("⛲", 21.5, 33.6, 40);
    if (eq.includes("decor_lights")) for (let i = 0; i < 8; i++) em("🏮", 14 + i * 3, 33.8, 18, 2.5);
  }
  private openTile(tx: number, ty: number) {
    return tx >= 0 && ty >= 0 && tx < W && ty < H && ground[tx + ty * W] !== G.WATER && SOLID[this.robj[tx + ty * W]] === 0;
  }
  private sway(c: Ctx, s: SP.Spr, x: number, y: number, amp: number, h: number, sc = 1) {
    const a = Math.sin(this.time * 1.4 + h * 40) * amp;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    if (sc !== 1) c.scale(sc, sc);
    c.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
    c.restore();
  }
  private drawObj(c: Ctx, o: number, tx: number, ty: number) {
    const x = tx * T + T / 2;
    const y = (ty + 1) * T;
    const h = hash2(tx, ty);
    const v = (h * 8) | 0;
    // trees used as maze walls are drawn smaller so corridors stay readable
    const ms = (o === O.TREE || o === O.APPLE || o === O.PINE || o === O.MAGIC) && mazeAt(tx, ty) >= 0 ? 0.7 : 1;
    switch (o) {
      case O.TREE:
        this.sway(c, SP.tree(v % 3), x, y, 0.012, h, ms);
        break;
      case O.APPLE:
        this.sway(c, SP.tree(0, true), x, y, 0.012, h, ms);
        break;
      case O.PINE:
        this.sway(c, SP.pine(v % 2), x, y, 0.01, h, ms);
        break;
      case O.MAGIC: {
        this.sway(c, SP.magicTree(v % 2), x, y, 0.012, h, ms);
        c.fillStyle = `rgba(190,255,245,${0.25 + 0.25 * Math.sin(this.time * 2 + h * 30)})`;
        c.beginPath();
        c.arc(x + (h - 0.5) * 40, y - 60 - h * 20, 3, 0, Math.PI * 2);
        c.fill();
        break;
      }
      case O.CORN:
        this.sway(c, SP.corn(v % 2), x, y, 0.022, h);
        break;
      case O.HEDGE:
        SP.blit(c, SP.hedge(v % 2), x, y);
        break;
      case O.SECRETBUSH:
        SP.blit(c, SP.hedge(1, true), x, y);
        if (Math.sin(this.time * 1.7 + h * 9) > 0.55) this.drawSparkle(c, x + 8, y - 40, 0.5);
        break;
      case O.VEG:
        SP.blit(c, SP.veg(v % 2), x, y);
        break;
      case O.FENCE: {
        const f = (dx: number, dy: number) => (this.robj[tx + dx + (ty + dy) * W] === O.FENCE ? 1 : 0);
        SP.blit(c, SP.fence(f(0, -1) | (f(1, 0) << 1) | (f(0, 1) << 2) | (f(-1, 0) << 3)), x, y);
        break;
      }
      case O.LOWFENCE:
        SP.blit(c, SP.lowFence(this.openTile(tx - 1, ty) && this.openTile(tx + 1, ty)), x, y);
        break;
      case O.ROCK:
        SP.blit(c, SP.rock(v % 2), x, y);
        break;
      case O.BUSH:
        SP.blit(c, SP.bush(v % 2), x, y);
        break;
      case O.THORN:
        SP.blit(c, SP.thorn(), x, y);
        break;
      case O.FLOWER:
        this.sway(c, SP.flowers(v % 6), x + (h - 0.5) * 14, y - 8, 0.09, h);
        break;
      case O.TALLGRASS: {
        const near = Math.abs(this.px - x) < 20 && Math.abs(this.py - y + 10) < 18;
        this.sway(c, SP.tallGrass(v % 3), x + (h - 0.5) * 12, y - 8, near ? 0.3 : 0.13, near ? this.time * 3 : h);
        break;
      }
      case O.SIGN:
        SP.blit(c, SP.signPost(), x, y);
        break;
      case O.STUMP:
        SP.blit(c, SP.stump(), x, y);
        break;
      case O.LILY:
        SP.blit(c, SP.lily(), x + (h - 0.5) * 10, y - 18 + Math.sin(this.time * 1.5 + h * 8) * 1.5);
        break;
      case O.HOUSE:
        SP.blit(c, SP.house(), tx * T, y);
        if (Math.random() < 0.06) this.parts.push({ x: tx * T + 192, y: y - 240, vx: 6 + Math.random() * 8, vy: -22, life: 1.6, max: 1.6, size: 5, color: "#f1f5f9", kind: 0 });
        break;
      case O.BARN:
        SP.blit(c, SP.barn(), tx * T, y);
        break;
      case O.COOP:
        SP.blit(c, SP.coop(), tx * T, y);
        break;
      case O.WELL:
        SP.blit(c, SP.well(), tx * T, y);
        break;
      case O.MILL: {
        SP.blit(c, SP.mill(), tx * T, y);
        const hx = tx * T + SP.MILL_HUB.x;
        const hy = y + SP.MILL_HUB.y;
        c.save();
        c.translate(hx, hy);
        c.rotate(this.time * 0.7);
        for (let i = 0; i < 4; i++) {
          c.rotate(Math.PI / 2);
          c.fillStyle = "#8d5b2c";
          c.fillRect(-2, -62, 4, 62);
          c.fillStyle = "rgba(255,248,225,.92)";
          c.strokeStyle = "#8a7a5c";
          c.lineWidth = 1.2;
          c.fillRect(2, -62, 15, 44);
          c.strokeRect(2, -62, 15, 44);
          c.beginPath();
          c.moveTo(2, -47);
          c.lineTo(17, -47);
          c.moveTo(2, -33);
          c.lineTo(17, -33);
          c.moveTo(9.5, -62);
          c.lineTo(9.5, -18);
          c.stroke();
        }
        c.restore();
        c.beginPath();
        c.arc(hx, hy, 5, 0, Math.PI * 2);
        c.fillStyle = "#5f3d1e";
        c.fill();
        break;
      }
    }
  }
  private drawSparkle(c: Ctx, x: number, y: number, sc: number) {
    const t = this.time;
    c.save();
    c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 4);
    const g = c.createRadialGradient(x, y - 6, 1, x, y - 6, 22 * sc);
    g.addColorStop(0, "rgba(255,250,170,.95)");
    g.addColorStop(1, "rgba(255,250,170,0)");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y - 6, 22 * sc, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = "#fff8b0";
    this.star(c, x, y - 8 + Math.sin(t * 3) * 2, (7 + Math.sin(t * 6) * 2) * sc, t * 1.5);
    c.fillStyle = "#ffffff";
    this.star(c, x + 10 * sc, y - 18, (3 + Math.sin(t * 7 + 1) * 1.5) * sc, -t * 2);
    this.star(c, x - 11 * sc, y - 2, (2.6 + Math.sin(t * 5 + 2) * 1.3) * sc, t * 2.4);
    c.restore();
  }
  private icon(c: Ctx, text: string, x: number, y: number, hi = false) {
    c.font = "13px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fillStyle = hi ? "#fde047" : "rgba(255,255,255,.94)";
    c.fill();
    c.strokeStyle = hi ? "#b45309" : "#d6a13a";
    c.lineWidth = 1.4;
    c.stroke();
    c.fillStyle = "#000";
    c.fillText(text, x, y + 1);
  }
  private bar(c: Ctx, x: number, y: number, f: number, col: string) {
    SP.rr(c, x - 15, y, 30, 5, 2.5);
    c.fillStyle = "rgba(0,0,0,.5)";
    c.fill();
    SP.rr(c, x - 14, y + 1, 28 * Math.max(0.04, Math.min(1, f)), 3, 1.5);
    c.fillStyle = col;
    c.fill();
  }
  private drawThing(c: Ctx, t: Thing, st: GameState) {
    const x = t.tx * T + T / 2;
    const y = (t.ty + 1) * T;
    const done = this.opened.has(t.id);
    const bob = Math.sin(this.time * 3 + t.tx) * 2;
    switch (t.kind) {
      case "plot": {
        const p = st.plots[t.idx!];
        SP.blit(c, SP.plotMound(!!p.crop && p.watered), x, y - 22);
        if (!p.crop) break;
        const def = CROPS[p.crop];
        if (p.stage >= 3) {
          const im = this.img(def.image);
          const hh = 34 + Math.sin(this.time * 3 + t.idx!) * 1.5;
          if (im.complete && im.naturalWidth) {
            const ww = (im.naturalWidth / im.naturalHeight) * hh;
            c.drawImage(im, x - ww / 2, y - 20 - hh, ww, hh);
          }
          this.icon(c, "✅", x, y - 64 + bob, true);
        } else {
          this.sway(c, SP.sprout(p.stage), x, y - 20, 0.07, t.idx! * 0.1);
          if (!p.watered) this.icon(c, "💧", x, y - 56 + bob);
          else this.bar(c, x, y - 12, p.progress / def.growTime, "#a3e635");
        }
        break;
      }
      case "apple": {
        this.sway(c, SP.tree(1), x, y, 0.012, 0.3 + t.idx! * 0.2);
        if (st.trees[t.idx!].ready) this.sway(c, SP.apples(), x, y, 0.012, 0.3 + t.idx! * 0.2);
        break;
      }
      case "hay":
        if (!st.hay.ready) c.globalAlpha = 0.45;
        SP.blit(c, SP.hay(), x, y);
        c.globalAlpha = 1;
        break;
      case "flower":
        this.sway(c, SP.bigFlower(t.idx!, st.flowers[t.idx!].ready), x, y - 6, 0.08, t.idx! * 0.13);
        break;
      case "mushroom":
        SP.blit(c, SP.mushroom(st.mushrooms[t.idx!].ready), x, y - 10);
        break;
      case "dock": {
        c.strokeStyle = "#8d5b2c";
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + 14, y - 14);
        c.lineTo(x + 20, y - 52);
        c.stroke();
        c.strokeStyle = "rgba(255,255,255,.8)";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x + 20, y - 52);
        c.quadraticCurveTo(x + 44, y - 40, x + 46, y - 18 + bob);
        c.stroke();
        c.beginPath();
        c.arc(x + 46, y - 16 + bob, 3.5, 0, Math.PI * 2);
        c.fillStyle = "#ef4444";
        c.fill();
        c.strokeStyle = `rgba(255,255,255,${0.6 - ((this.time * 0.7) % 1) * 0.6})`;
        c.beginPath();
        c.ellipse(x + 46, y - 14, 4 + ((this.time * 0.7) % 1) * 12, 2 + ((this.time * 0.7) % 1) * 5, 0, 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case "nest": {
        const ch = st.animals.find((a) => a.id === "chicken")!;
        SP.blit(c, SP.nest(ch.ready), x, y - 6);
        if (ch.ready) this.icon(c, "🥚", x, y - 46 + bob, true);
        break;
      }
      case "cardspot":
        SP.blit(c, SP.prop(t.prop ?? 0), x, y - 4);
        if (!done && Math.sin(this.time * 1.3 + t.tx * 3) > 0.72) {
          c.fillStyle = "#fffbe0";
          this.star(c, x + 9, y - 30, 4.5, this.time * 2);
        }
        break;
      case "chest":
        SP.blit(c, SP.chest(done, !!t.locked && !done && !this.opened.has(t.id + "_unlock"), false), x, y - 2);
        if (!done && Math.sin(this.time * 2 + t.tx) > 0.6) {
          c.fillStyle = "#fffbe0";
          this.star(c, x + 14, y - 34, 4, this.time * 2);
        }
        break;
      case "finish": {
        const claimed = this.mazeClaimed && this.mazeIdx === t.maze;
        if (!claimed) {
          c.save();
          c.translate(x, y - 22);
          c.rotate(this.time * 0.6);
          c.fillStyle = "rgba(255,236,130,.22)";
          for (let i = 0; i < 8; i++) {
            c.rotate(Math.PI / 4);
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(-7, -44);
            c.lineTo(7, -44);
            c.closePath();
            c.fill();
          }
          c.restore();
        }
        SP.blit(c, SP.chest(claimed, false, true), x, y - 2);
        if (!claimed) this.icon(c, "🏆", x, y - 58 + bob, true);
        break;
      }
      case "key":
        if (!done) {
          c.fillStyle = "rgba(0,0,0,.2)";
          c.beginPath();
          c.ellipse(x, y - 14, 9, 3, 0, 0, Math.PI * 2);
          c.fill();
          SP.blit(c, SP.keySpr(), x, y - 22 + bob);
        }
        break;
      case "button":
        SP.blit(c, SP.buttonSpr(done), x, y - 16);
        break;
      case "door":
        if (!done) SP.blit(c, SP.secretWall(), x, y);
        break;
      case "gate":
        SP.blit(c, SP.gate(done), x, y);
        break;
      case "mazegate": {
        const m = MAZES[t.maze!];
        const closed = st.level < m.level;
        SP.blit(c, SP.mazeGate(closed, closed ? `LEVEL ${m.level}` : `MAZE ${m.idx + 1}`, MAZE_COLORS[m.idx]), x, y);
        break;
      }
      case "boulder": {
        if (done) break;
        const s = this.slides.get(t.id);
        let bx = x;
        let by = y;
        let sc = 1;
        if (s && t.pit) {
          bx += (t.pit[0] - t.tx) * T * s.p;
          by += (t.pit[1] - t.ty) * T * s.p;
          sc = 1 - Math.max(0, s.p - 0.7) * 0.9;
        }
        const b = SP.boulder();
        c.drawImage(b.c, bx - b.ax * sc, by - b.ay * sc - (1 - sc) * 10, b.w * sc, b.h * sc);
        break;
      }
    }
  }
  private drawCritter(c: Ctx, a: Critter, st: GameState) {
    const def = ANIMALS.find((d) => d.id === a.id)!;
    const s = st.animals.find((z) => z.id === a.id)!;
    const im = this.img(def.image);
    c.fillStyle = "rgba(0,0,0,.22)";
    c.beginPath();
    c.ellipse(a.x, a.y - 2, a.w * 0.42, a.w * 0.13, 0, 0, Math.PI * 2);
    c.fill();
    const moving = a.wait <= 0;
    const hop = moving ? Math.abs(Math.sin(a.walk * 9)) * 3 : Math.sin(this.time * 2 + a.w) * 0.8;
    if (im.complete && im.naturalWidth) {
      const hh = (im.naturalHeight / im.naturalWidth) * a.w;
      c.save();
      c.translate(a.x, a.y - hop);
      c.scale(a.face, 1);
      c.rotate(moving ? Math.sin(a.walk * 9) * 0.04 : 0);
      c.drawImage(im, -a.w / 2, -hh, a.w, hh);
      c.restore();
      const top = a.y - hh - 14;
      if (s.ready) this.icon(c, PRODUCE[def.produce].emoji, a.x, top + Math.sin(this.time * 5) * 2.5, true);
      else if (s.fed) this.bar(c, a.x, top + 6, s.progress / def.time, "#fbbf24");
      else this.icon(c, "🍽️", a.x, top);
    }
  }
  private drawPickup(c: Ctx, p: Pickup) {
    const b = Math.sin(this.time * 3 + p.ph) * 3;
    c.fillStyle = "rgba(0,0,0,.2)";
    c.beginPath();
    c.ellipse(p.x, p.y, 8, 3, 0, 0, Math.PI * 2);
    c.fill();
    if (p.kind === "coin") {
      const sx = Math.abs(Math.cos(this.time * 3 + p.ph)) * 0.8 + 0.2;
      c.beginPath();
      c.ellipse(p.x, p.y - 14 + b, 9 * sx, 9, 0, 0, Math.PI * 2);
      c.fillStyle = "#fbbf24";
      c.fill();
      c.strokeStyle = "#b45309";
      c.lineWidth = 1.6;
      c.stroke();
      c.beginPath();
      c.ellipse(p.x, p.y - 14 + b, 5 * sx, 5, 0, 0, Math.PI * 2);
      c.strokeStyle = "#fde68a";
      c.stroke();
    } else {
      c.save();
      c.shadowColor = "#fff3a3";
      c.shadowBlur = 8;
      c.fillStyle = "#ffe14d";
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4.5 : 10.5;
        const a = this.time * 1.5 + (i / 10) * Math.PI * 2;
        c.lineTo(p.x + Math.cos(a) * r, p.y - 14 + b + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      c.restore();
      c.strokeStyle = "#b7791f";
      c.lineWidth = 1.2;
      c.stroke();
    }
  }
  private drawPlayer(c: Ctx) {
    const x = this.px;
    const y = this.py;
    const k = 1 - this.pz / 70;
    if (this.gear.includes("gear_bandana") || this.gear.includes("gear_lucky") || this.gear.includes("gear_crown")) {
      const col = this.gear.includes("gear_crown") ? "255,214,90" : this.gear.includes("gear_lucky") ? "160,240,120" : "110,190,255";
      const g = c.createRadialGradient(x, y - 22, 4, x, y - 22, 44);
      g.addColorStop(0, `rgba(${col},${0.34 + 0.1 * Math.sin(this.time * 3)})`);
      g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y - 22, 44, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(0,0,0,.28)";
    c.beginPath();
    c.ellipse(x, y - 1, 14 * k, 5 * k, 0, 0, Math.PI * 2);
    c.fill();
    drawRobi(c, x, y - this.pz, this.dir, this.anim, this.animT, this.animP, { crown: this.gear.includes("gear_crown"), silver: this.gear.includes("gear_silverhat") });
    if (this.anim === "fall" && this.animP > 0.15 && this.animP < 0.75) {
      c.fillStyle = "#ffe14d";
      for (let i = 0; i < 3; i++) {
        const a = this.time * 5 + (i * Math.PI * 2) / 3;
        this.star(c, x + Math.cos(a) * 16, y - 44 + Math.sin(a) * 5, 4.5, a);
      }
    }
    if (this.anim === "push") {
      const [fx, fy] = DIRV[this.dir];
      c.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 2; i++) {
        const o = 22 + ((this.time * 30 + i * 9) % 14);
        c.beginPath();
        c.arc(x - fx * o * 0.4 + fy * (i ? 7 : -7), y - 46 - fy * 4, 2, 0, Math.PI * 2);
        c.fill();
      }
    }
    if (this.gear.includes("gear_boots") && this.anim === "run" && Math.random() < 0.5) this.parts.push({ x: x - this.lastDx * 10, y: y - 3, vx: -this.lastDx * 30, vy: -10, life: 0.3, max: 0.3, size: 3, color: "#ff9f43", kind: 0 });
    if (this.gear.includes("gear_lucky")) {
      c.font = "12px sans-serif";
      c.textAlign = "center";
      c.fillText("🍀", x + 20, y - 54 + Math.sin(this.time * 3) * 3);
    }
  }
}

/** global handle so React panels (map / pause / hunt) can command the running engine */
export const worldBus: { engine: Engine | null } = { engine: null };
