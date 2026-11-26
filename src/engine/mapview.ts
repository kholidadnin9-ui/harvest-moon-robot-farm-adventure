/* Minimap + world map rendering with fog of exploration. */
import type { GameState } from "@/game/types";
import { EXH, EXS, EXW, G, H, MAZES, O, PLACES, T, W, ground, obj, things } from "./world";

type Ctx = CanvasRenderingContext2D;
export const MP = 4; // map pixels per tile
let mapC: HTMLCanvasElement | null = null;

const GC: Record<number, string> = {
  [G.GRASS]: "#86cf5a", [G.PATH]: "#e6c58a", [G.SOIL]: "#9b6a3a", [G.WATER]: "#3f9fe6", [G.BRIDGE]: "#a8703c", [G.FOREST]: "#62a94d", [G.MEADOW]: "#a8e070",
  [G.PEN]: "#c9cf74", [G.PUDDLE]: "#7cc4f2", [G.START]: "#4ade80", [G.FINISH]: "#fbbf24", [G.PLANK]: "#a8703c", [G.PIT]: "#5b4632",
};
const OC: Record<number, string> = {
  [O.TREE]: "#2f8040", [O.PINE]: "#25693d", [O.APPLE]: "#3d9440", [O.CORN]: "#c2a92e", [O.HEDGE]: "#2f7a3c", [O.FENCE]: "#8b5a2b", [O.LOWFENCE]: "#ffffff", [O.ROCK]: "#8d939c",
  [O.BUSH]: "#3d9a48", [O.THORN]: "#a3324a", [O.BLOCK]: "#c8412f", [O.VEG]: "#4f9a3f", [O.MAGIC]: "#7a4fb5", [O.GATE]: "#f5b921", [O.MAZEGATE]: "#d946ef", [O.SECRET]: "#8f98a3",
  [O.SECRETBUSH]: "#2f7a3c", [O.HOUSE]: "#d9503f", [O.BARN]: "#c8412f", [O.COOP]: "#d9503f", [O.MILL]: "#eadfc4", [O.WELL]: "#aab2bd", [O.STUMP]: "#8d5b2c", [O.SIGN]: "#e0b071",
};

export function getMapCanvas(): HTMLCanvasElement {
  if (mapC) return mapC;
  const cv = document.createElement("canvas");
  cv.width = W * MP;
  cv.height = H * MP;
  const c = cv.getContext("2d")!;
  for (let ty = 0; ty < H; ty++)
    for (let tx = 0; tx < W; tx++) {
      const i = tx + ty * W;
      c.fillStyle = GC[ground[i]] ?? "#86cf5a";
      c.fillRect(tx * MP, ty * MP, MP, MP);
      const col = OC[obj[i]];
      if (col) {
        c.fillStyle = col;
        const o = obj[i];
        if (o === O.TREE || o === O.PINE || o === O.MAGIC || o === O.APPLE || o === O.BUSH) c.fillRect(tx * MP + 0.5, ty * MP + 0.5, MP - 1, MP - 1);
        else c.fillRect(tx * MP, ty * MP, MP, MP);
      }
    }
  for (const t of things)
    if (t.kind === "apple") {
      c.fillStyle = "#3d9440";
      c.fillRect(t.tx * MP, t.ty * MP, MP, MP);
    }
  mapC = cv;
  return cv;
}

export function decodeExplored(s: string): Uint8Array {
  const a = new Uint8Array(EXW * EXH);
  for (let i = 0; i < a.length && i < s.length; i++) a[i] = s.charCodeAt(i) === 49 ? 1 : 0;
  return a;
}
export function encodeExplored(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i++) s += a[i] ? "1" : "0";
  return s;
}
export function isExplored(ex: Uint8Array, tx: number, ty: number): boolean {
  const cx = Math.floor(tx / EXS);
  const cy = Math.floor(ty / EXS);
  return cx >= 0 && cy >= 0 && cx < EXW && cy < EXH && ex[cx + cy * EXW] === 1;
}

interface View {
  x0: number; // world tile at left edge
  y0: number;
  z: number; // screen px per tile
  w: number;
  h: number;
}

function drawFog(c: Ctx, v: View, ex: Uint8Array, big: boolean) {
  const cs = EXS * v.z;
  const cx0 = Math.max(0, Math.floor(v.x0 / EXS));
  const cy0 = Math.max(0, Math.floor(v.y0 / EXS));
  const cx1 = Math.min(EXW - 1, Math.ceil((v.x0 + v.w / v.z) / EXS));
  const cy1 = Math.min(EXH - 1, Math.ceil((v.y0 + v.h / v.z) / EXS));
  for (let cy = cy0; cy <= cy1; cy++)
    for (let cx = cx0; cx <= cx1; cx++) {
      if (ex[cx + cy * EXW]) continue;
      const x = (cx * EXS - v.x0) * v.z;
      const y = (cy * EXS - v.y0) * v.z;
      c.fillStyle = (cx + cy) % 2 ? "#aab7cb" : "#b4c0d3";
      c.fillRect(x - 0.5, y - 0.5, cs + 1, cs + 1);
      if (big && (cx * 7 + cy * 13) % 5 === 0) {
        c.fillStyle = "rgba(255,255,255,.35)";
        c.beginPath();
        c.arc(x + cs / 2, y + cs / 2, cs * 0.55, 0, Math.PI * 2);
        c.fill();
      }
    }
}

function drawMarkers(c: Ctx, v: View, ex: Uint8Array, st: GameState, opened: Set<string>, time: number, big: boolean) {
  const X = (tx: number) => (tx + 0.5 - v.x0) * v.z;
  const Y = (ty: number) => (ty + 0.5 - v.y0) * v.z;
  const dot = (tx: number, ty: number, r: number, fill: string, stroke = "#1c2646") => {
    c.beginPath();
    c.arc(X(tx), Y(ty), r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  };
  const blink = 0.6 + 0.4 * Math.sin(time * 5);
  // treasure chests (only in explored area)
  for (const t of things) {
    if ((t.kind === "chest" || t.kind === "finish") && isExplored(ex, t.tx, t.ty) && (t.kind === "finish" || !opened.has(t.id))) {
      c.fillStyle = t.kind === "finish" ? "#fde047" : "#f97316";
      c.strokeStyle = "#1c2646";
      const s = big ? 6 : 4;
      c.fillRect(X(t.tx) - s / 2, Y(t.ty) - s / 2, s, s);
      c.strokeRect(X(t.tx) - s / 2, Y(t.ty) - s / 2, s, s);
    }
  }
  // hidden sparkles
  c.globalAlpha = blink;
  for (const list of Object.values(st.hidden)) for (const h of list) if (isExplored(ex, h.x, h.y)) dot(h.x, h.y, big ? 3.2 : 2.2, "#fff59d", "#b45309");
  c.globalAlpha = 1;
  // maze entrances
  for (const m of MAZES) {
    const x = X(m.entrance[0]);
    const y = Y(m.entrance[1]);
    const s = big ? 7 : 4.5;
    c.beginPath();
    c.moveTo(x, y - s);
    c.lineTo(x + s, y);
    c.lineTo(x, y + s);
    c.lineTo(x - s, y);
    c.closePath();
    c.fillStyle = st.world.mazes[m.id]?.done ? "#22c55e" : st.level >= m.level ? "#d946ef" : "#64748b";
    c.fill();
    c.strokeStyle = "#fff";
    c.lineWidth = 1.2;
    c.stroke();
  }
  if (big) {
    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const p of PLACES) {
      if (p.id !== "home" && !isExplored(ex, p.tx, p.ty)) continue;
      const x = X(p.tx);
      const y = Y(p.ty) - (p.id.startsWith("m") && p.id.length === 2 ? -v.z * 1.6 : v.z * 1.4);
      c.font = `${Math.max(12, v.z * 2.1)}px sans-serif`;
      c.fillText(p.icon, x, y);
    }
  }
}

function drawPlayer(c: Ctx, x: number, y: number, r: number, time: number) {
  c.beginPath();
  c.arc(x, y, r + 2 + Math.sin(time * 6) * 1.2, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,255,255,.55)";
  c.fill();
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = "#3f9cec";
  c.fill();
  c.strokeStyle = "#ffd43b";
  c.lineWidth = Math.max(1.5, r * 0.45);
  c.stroke();
}

/** Small follow-player minimap. */
export function drawMinimap(c: Ctx, w: number, h: number, ex: Uint8Array, px: number, py: number, st: GameState, opened: Set<string>, time: number) {
  const z = 3;
  const tw = w / z;
  const th = h / z;
  const x0 = Math.max(0, Math.min(W - tw, px / T - tw / 2));
  const y0 = Math.max(0, Math.min(H - th, py / T - th / 2));
  const v: View = { x0, y0, z, w, h };
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, w, h);
  c.drawImage(getMapCanvas(), x0 * MP, y0 * MP, tw * MP, th * MP, 0, 0, w, h);
  drawFog(c, v, ex, false);
  drawMarkers(c, v, ex, st, opened, time, false);
  drawPlayer(c, (px / T - x0) * z, (py / T - y0) * z, 3, time);
}

/** Full world map (fits the given size). Returns the transform used. */
export function drawWorldMap(c: Ctx, w: number, h: number, ex: Uint8Array, px: number, py: number, st: GameState, time: number) {
  const z = Math.min(w / W, h / H);
  const ox = (w - W * z) / 2;
  const oy = (h - H * z) / 2;
  c.clearRect(0, 0, w, h);
  c.save();
  c.translate(ox, oy);
  c.imageSmoothingEnabled = false;
  c.drawImage(getMapCanvas(), 0, 0, W * MP, H * MP, 0, 0, W * z, H * z);
  const v: View = { x0: 0, y0: 0, z, w: W * z, h: H * z };
  drawFog(c, v, ex, true);
  drawMarkers(c, v, ex, st, new Set(st.world.opened), time, true);
  drawPlayer(c, (px / T) * z, (py / T) * z, Math.max(4, z * 0.9), time);
  c.restore();
  return { z, ox, oy };
}
