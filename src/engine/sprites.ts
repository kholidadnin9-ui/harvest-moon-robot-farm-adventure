/* ------------------------------------------------------------------
 * Procedural sprite library: all tiles & world objects are painted
 * once into off-screen canvases (2x resolution) and then blitted.
 * ------------------------------------------------------------------ */
import { T } from "./world";

type Ctx = CanvasRenderingContext2D;
export interface Spr {
  c: HTMLCanvasElement;
  w: number;
  h: number;
  ax: number;
  ay: number;
}
const cache = new Map<string, Spr>();
const PI = Math.PI;

function seeded(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mk(key: string, w: number, h: number, ax: number, ay: number, fn: (c: Ctx, r: () => number) => void): Spr {
  let s = cache.get(key);
  if (!s) {
    const cv = document.createElement("canvas");
    cv.width = Math.ceil(w * 2);
    cv.height = Math.ceil(h * 2);
    const c = cv.getContext("2d")!;
    c.scale(2, 2);
    c.lineJoin = "round";
    c.lineCap = "round";
    fn(c, seeded(hashStr(key)));
    s = { c: cv, w, h, ax, ay };
    cache.set(key, s);
  }
  return s;
}
export function blit(c: Ctx, s: Spr, x: number, y: number) {
  c.drawImage(s.c, x - s.ax, y - s.ay, s.w, s.h);
}

/* ---------------- drawing helpers ---------------- */
export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}
function rrc(c: Ctx, x: number, y: number, w: number, h: number, r: number[]) {
  const [tl, tr, br, bl] = r;
  c.beginPath();
  c.moveTo(x + tl, y);
  c.lineTo(x + w - tr, y);
  if (tr) c.quadraticCurveTo(x + w, y, x + w, y + tr);
  c.lineTo(x + w, y + h - br);
  if (br) c.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  c.lineTo(x + bl, y + h);
  if (bl) c.quadraticCurveTo(x, y + h, x, y + h - bl);
  c.lineTo(x, y + tl);
  if (tl) c.quadraticCurveTo(x, y, x + tl, y);
  c.closePath();
}
function circ(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, PI * 2);
}
function ell(c: Ctx, x: number, y: number, rx: number, ry: number) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, PI * 2);
}
function poly(c: Ctx, pts: number[]) {
  c.beginPath();
  for (let i = 0; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function fs(c: Ctx, fill: string, stroke?: string | null, lw = 1.3) {
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function shadow(c: Ctx, x: number, y: number, rx: number, ry: number) {
  ell(c, x, y, rx, ry);
  c.fillStyle = "rgba(20,40,20,.22)";
  c.fill();
}

/* ==================================================================
 * GROUND TILES
 * ================================================================== */
const GP = [
  ["#80cc54", "#64b040", "#a4e378"],
  ["#62a94d", "#4c8f3d", "#7fc264"],
  ["#94d862", "#76bf49", "#b9ef8a"],
];
export function grass(pal: number, v: number): Spr {
  return mk(`g${pal}_${v}`, T, T, 0, 0, (c, r) => {
    const [b, d, l] = GP[pal];
    c.fillStyle = b;
    c.fillRect(0, 0, T, T);
    c.globalAlpha = 0.2;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = r() < 0.5 ? l : d;
      ell(c, 10 + r() * 28, 10 + r() * 28, 5 + r() * 6, 3 + r() * 4);
      c.fill();
    }
    c.globalAlpha = 1;
    c.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const x = 4 + r() * 40;
      const y = 8 + r() * 36;
      c.strokeStyle = r() < 0.55 ? d : l;
      c.beginPath();
      c.moveTo(x - 2, y);
      c.lineTo(x - 0.6, y - 4);
      c.moveTo(x + 2, y);
      c.lineTo(x + 0.6, y - 4.6);
      c.moveTo(x, y);
      c.lineTo(x, y - 3.2);
      c.stroke();
    }
    if (pal === 2)
      for (let i = 0; i < 5; i++) {
        c.fillStyle = ["#fff", "#ffe066", "#ff9ec4", "#fff"][i % 4];
        circ(c, 4 + r() * 40, 4 + r() * 40, 1.4);
        c.fill();
      }
  });
}
/** mask bits: 1=N 2=E 4=S 8=W neighbours that are also path */
export function pathTile(mask: number, v: number): Spr {
  return mk(`p${mask}_${v}`, T, T, 0, 0, (c, r) => {
    const N = mask & 1, E = mask & 2, S = mask & 4, Wm = mask & 8;
    const shape = (inset: number) => {
      const x0 = Wm ? 0 : 3 + inset, x1 = E ? T : T - 3 - inset, y0 = N ? 0 : 3 + inset, y1 = S ? T : T - 3 - inset;
      const R = 13 - inset;
      rrc(c, x0, y0, x1 - x0, y1 - y0, [!N && !Wm ? R : 0, !N && !E ? R : 0, !S && !E ? R : 0, !S && !Wm ? R : 0]);
    };
    shape(0);
    c.fillStyle = "#b98f55";
    c.fill();
    shape(2);
    c.fillStyle = "#e6c58a";
    c.fill();
    c.save();
    shape(2);
    c.clip();
    for (let i = 0; i < 9; i++) {
      c.fillStyle = i < 6 ? "#d6b173" : "#f4e1b8";
      ell(c, r() * T, r() * T, 1.5 + r() * 2.5, 1 + r() * 1.5);
      c.fill();
    }
    c.restore();
  });
}
export function soilTile(v: number): Spr {
  return mk(`soil${v}`, T, T, 0, 0, (c, r) => {
    c.fillStyle = "#8f5e33";
    c.fillRect(0, 0, T, T);
    for (let y = 2; y < T; y += 12) {
      c.fillStyle = "#74481f";
      c.fillRect(0, y + 6, T, 4);
      c.fillStyle = "#a9753f";
      c.fillRect(0, y, T, 2);
    }
    for (let i = 0; i < 6; i++) {
      c.fillStyle = "#b98a57";
      circ(c, r() * T, r() * T, 1.2);
      c.fill();
    }
  });
}
export function penTile(v: number): Spr {
  return mk(`pen${v}`, T, T, 0, 0, (c, r) => {
    c.fillStyle = "#b5c867";
    c.fillRect(0, 0, T, T);
    c.lineWidth = 1.3;
    for (let i = 0; i < 14; i++) {
      const x = r() * T, y = r() * T, a = r() * PI;
      c.strokeStyle = r() < 0.5 ? "#e8d98c" : "#96ad4e";
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 3);
      c.stroke();
    }
  });
}
/** rails bits: 1=N 2=E 4=S 8=W sides bordering water */
export function bridgeTile(hor: boolean, rails: number): Spr {
  return mk(`br${hor ? 1 : 0}_${rails}`, T, T, 0, 0, (c) => {
    c.fillStyle = "#bb8850";
    c.fillRect(0, 0, T, T);
    c.strokeStyle = "#8a5d32";
    c.lineWidth = 1.5;
    for (let k = 0; k <= T; k += 12) {
      c.beginPath();
      if (hor) {
        c.moveTo(k, 0);
        c.lineTo(k, T);
      } else {
        c.moveTo(0, k);
        c.lineTo(T, k);
      }
      c.stroke();
    }
    c.fillStyle = "#d6a56b";
    for (let k = 6; k < T; k += 12) {
      if (hor) c.fillRect(k - 3, 8, 6, 2);
      else c.fillRect(8, k - 1, 2, 2);
    }
    c.fillStyle = "#7a4f2a";
    if (rails & 1) c.fillRect(0, 0, T, 6);
    if (rails & 4) c.fillRect(0, T - 6, T, 6);
    if (rails & 8) c.fillRect(0, 0, 6, T);
    if (rails & 2) c.fillRect(T - 6, 0, 6, T);
    c.fillStyle = "#a16b3b";
    if (rails & 1) c.fillRect(0, 0, T, 2.5);
    if (rails & 4) c.fillRect(0, T - 6, T, 2.5);
    if (rails & 8) c.fillRect(0, 0, 2.5, T);
    if (rails & 2) c.fillRect(T - 6, 0, 2.5, T);
  });
}
export function padTile(kind: "start" | "finish"): Spr {
  return mk(`pad_${kind}`, T, T, 0, 0, (c) => {
    if (kind === "start") {
      circ(c, 24, 24, 17);
      fs(c, "#bff7c4", "#22a04a", 3);
      c.fillStyle = "#157a36";
      c.font = "bold 9px sans-serif";
      c.textAlign = "center";
      c.fillText("START", 24, 27);
    } else {
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          c.fillStyle = (x + y) % 2 ? "#fff8d6" : "#f5b921";
          c.fillRect(8 + x * 8, 8 + y * 8, 8, 8);
        }
      rr(c, 8, 8, 32, 32, 3);
      c.strokeStyle = "#b7791f";
      c.lineWidth = 2;
      c.stroke();
    }
  });
}
export function puddle(): Spr {
  return mk("puddle", T, T, 0, 0, (c) => {
    c.beginPath();
    c.ellipse(24, 25, 19, 13, 0, 0, PI * 2);
    fs(c, "#62bdf2", "#3b8fd2", 1.5);
    ell(c, 18, 21, 7, 3);
    c.fillStyle = "rgba(255,255,255,.55)";
    c.fill();
  });
}
export function pit(filled: boolean): Spr {
  return mk(`pit${filled ? 1 : 0}`, T, T, 0, 0, (c) => {
    ell(c, 24, 25, 19, 15);
    if (filled) {
      fs(c, "#b79a7e", "#7a6350", 2);
      c.strokeStyle = "#8f755f";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(14, 22);
      c.lineTo(22, 27);
      c.lineTo(20, 33);
      c.moveTo(28, 18);
      c.lineTo(32, 26);
      c.stroke();
    } else {
      fs(c, "#2e2015", "#6e5437", 3);
      ell(c, 24, 28, 14, 9);
      c.fillStyle = "#170f0a";
      c.fill();
    }
  });
}
export function pathFlowers(v: number): Spr {
  return mk(`pf${v}`, T, T, 0, 0, (c, r) => {
    for (let i = 0; i < 4; i++) {
      const top = r() < 0.5;
      const x = 5 + r() * 38, y = top ? 3 + r() * 4 : T - 4 - r() * 4;
      const col = ["#ff7eb6", "#ffe066", "#ffffff", "#c8a2ff"][Math.floor(r() * 4)];
      c.fillStyle = "#3f9a3a";
      c.fillRect(x - 0.6, y, 1.2, 4);
      for (let k = 0; k < 5; k++) {
        circ(c, x + Math.cos((k / 5) * PI * 2) * 2.1, y + Math.sin((k / 5) * PI * 2) * 2.1, 1.5);
        c.fillStyle = col;
        c.fill();
      }
      circ(c, x, y, 1.1);
      c.fillStyle = "#f59e0b";
      c.fill();
    }
  });
}

/* ==================================================================
 * OBJECTS (anchor = bottom-centre of their tile)
 * ================================================================== */
function canopy(c: Ctx, cx: number, cy: number, s: number, cols: string[], blobs: number[][]) {
  for (const [dx, dy, rad] of blobs) {
    circ(c, cx + dx * s, cy + dy * s, rad * s);
    fs(c, cols[0], cols[3], 1.6);
  }
  for (const [dx, dy, rad] of blobs) {
    circ(c, cx + dx * s, cy + dy * s, rad * s - 1);
    c.fillStyle = cols[0];
    c.fill();
  }
  for (const [dx, dy, rad] of blobs) {
    circ(c, cx + dx * s - 3, cy + dy * s - 4, rad * s * 0.74);
    c.fillStyle = cols[1];
    c.fill();
  }
  for (const [dx, dy, rad] of blobs) {
    circ(c, cx + dx * s - 6, cy + dy * s - 8, rad * s * 0.36);
    c.fillStyle = cols[2];
    c.fill();
  }
}
const BLOBS = [[0, 8, 30], [-22, 16, 19], [22, 16, 19], [-10, -10, 20], [12, -8, 19]];
const TREE_COLS = [
  ["#2f8f47", "#49b257", "#84da72", "#1f6b33"],
  ["#4a9a3a", "#6dbb48", "#a9e06a", "#2f6f28"],
  ["#2b8a5a", "#40ad74", "#7fdaa0", "#1c6341"],
];
export function tree(v: number, apples = false): Spr {
  return mk(`tree${v}_${apples ? 1 : 0}`, 100, 118, 50, 114, (c, r) => {
    shadow(c, 50, 110, 30, 8);
    rr(c, 43, 76, 14, 36, 4);
    fs(c, "#8d5b2c", "#5f3d1e");
    c.fillStyle = "#6f451f";
    c.fillRect(51, 78, 4, 32);
    canopy(c, 50, 46, 1, TREE_COLS[v % 3], BLOBS);
    if (apples)
      for (let i = 0; i < 7; i++) {
        const x = 24 + r() * 52, y = 30 + r() * 40;
        circ(c, x, y, 4.2);
        fs(c, "#e5383b", "#8f1d22", 1);
        circ(c, x - 1.3, y - 1.5, 1.2);
        c.fillStyle = "#ffb3b3";
        c.fill();
      }
  });
}
export function apples(): Spr {
  return mk("applesOnly", 100, 118, 50, 114, (c, r) => {
    for (let i = 0; i < 7; i++) {
      const x = 24 + r() * 52, y = 30 + r() * 40;
      circ(c, x, y, 4.4);
      fs(c, "#e5383b", "#8f1d22", 1);
      circ(c, x - 1.3, y - 1.5, 1.2);
      c.fillStyle = "#ffb3b3";
      c.fill();
    }
    for (const [x, y] of [[30, 108], [66, 111]]) {
      circ(c, x, y, 4);
      fs(c, "#e5383b", "#8f1d22", 1);
    }
  });
}
export function magicTree(v: number): Spr {
  return mk(`magic${v}`, 100, 118, 50, 114, (c, r) => {
    shadow(c, 50, 110, 30, 8);
    rr(c, 43, 76, 14, 36, 4);
    fs(c, "#5b4a6e", "#372c47");
    canopy(c, 50, 46, 1, v % 2 ? ["#6b46b8", "#8d68dc", "#c3a6ff", "#3f2880"] : ["#2a8f9a", "#3fb7bd", "#8ff0e6", "#17606b"], BLOBS);
    for (let i = 0; i < 9; i++) {
      circ(c, 22 + r() * 56, 24 + r() * 48, 1.6 + r() * 1.4);
      c.fillStyle = i % 2 ? "#fff6a8" : "#b8fff4";
      c.fill();
    }
  });
}
export function pine(v: number): Spr {
  return mk(`pine${v}`, 76, 116, 38, 112, (c) => {
    shadow(c, 38, 108, 22, 6);
    rr(c, 33, 90, 10, 20, 3);
    fs(c, "#7b4e26", "#553417");
    const col = v % 2 ? ["#2d7f52", "#3f9d68"] : ["#27714a", "#38905d"];
    for (let i = 0; i < 4; i++) {
      const y = 92 - i * 21, w = 34 - i * 6;
      poly(c, [38 - w, y, 38, y - 34, 38 + w, y]);
      fs(c, col[0], "#184a30", 1.5);
      poly(c, [38 - w + 4, y - 2, 38, y - 31, 38, y - 2]);
      c.fillStyle = col[1];
      c.fill();
    }
  });
}
export function corn(v: number): Spr {
  return mk(`corn${v}`, 56, 86, 28, 84, (c, r) => {
    rr(c, 1, 34, 54, 50, 9);
    fs(c, "#3f7f2e", "#2c5f21", 1.5);
    for (let k = 0; k < 3; k++) {
      const x = 11 + k * 17 + (r() - 0.5) * 4, top = 10 + r() * 8;
      c.strokeStyle = "#4f9534";
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(x, 82);
      c.lineTo(x + (r() - 0.5) * 3, top);
      c.stroke();
      for (let j = 0; j < 5; j++) {
        const y = 74 - j * 12 - r() * 4, dir = (j + k) % 2 ? 1 : -1;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + dir * 10, y - 12, x + dir * 17, y - 1);
        c.quadraticCurveTo(x + dir * 9, y - 5, x, y + 3);
        fs(c, j % 2 ? "#74c247" : "#62b03d", "#35762a", 0.9);
      }
      const cy = 42 + r() * 14, d = k % 2 ? 1 : -1;
      c.save();
      c.translate(x + d * 5, cy);
      c.rotate(d * 0.35);
      ell(c, 0, 0, 3.6, 8);
      fs(c, "#f7ce3e", "#b98310", 1);
      c.strokeStyle = "#d9a520";
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(-3, -3);
      c.lineTo(3, -3);
      c.moveTo(-3.4, 1);
      c.lineTo(3.4, 1);
      c.stroke();
      c.restore();
      c.strokeStyle = "#e3c56a";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x - 3, top - 6);
      c.moveTo(x, top);
      c.lineTo(x + 3, top - 7);
      c.moveTo(x, top);
      c.lineTo(x, top - 8);
      c.stroke();
    }
  });
}
export function hedge(v: number, light = false): Spr {
  return mk(`hedge${v}_${light ? 1 : 0}`, 54, 66, 27, 64, (c, r) => {
    const cols = light ? ["#55b85a", "#7fd97a", "#2f8f3d"] : ["#2f8744", "#4aa856", "#1f6331"];
    rr(c, 1, 12, 52, 52, 13);
    fs(c, cols[0], cols[2], 1.6);
    for (let i = 0; i < 9; i++) {
      circ(c, 8 + r() * 38, 20 + r() * 30, 5 + r() * 4);
      c.fillStyle = cols[1];
      c.globalAlpha = 0.75;
      c.fill();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < (v % 2 ? 4 : 2); i++) {
      circ(c, 8 + r() * 38, 20 + r() * 34, 2);
      c.fillStyle = v % 2 ? "#ff8fb8" : "#fff3a3";
      c.fill();
    }
  });
}
export function veg(v: number): Spr {
  return mk(`veg${v}`, 54, 74, 27, 72, (c, r) => {
    rr(c, 1, 50, 52, 22, 6);
    fs(c, "#7a4b24", "#553213", 1.4);
    if (v % 2 === 0) {
      c.strokeStyle = "#a8743c";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(7, 68);
      c.lineTo(7, 8);
      c.moveTo(47, 68);
      c.lineTo(47, 8);
      c.moveTo(4, 12);
      c.lineTo(50, 12);
      c.moveTo(4, 34);
      c.lineTo(50, 34);
      c.stroke();
      rr(c, 3, 10, 48, 56, 10);
      c.fillStyle = "#3f9440";
      c.globalAlpha = 0.95;
      c.fill();
      c.globalAlpha = 1;
      for (let i = 0; i < 12; i++) {
        circ(c, 7 + r() * 40, 14 + r() * 48, 4 + r() * 3);
        c.fillStyle = i % 2 ? "#58b452" : "#2f7f38";
        c.fill();
      }
      for (let i = 0; i < 7; i++) {
        const x = 9 + r() * 36, y = 18 + r() * 42;
        circ(c, x, y, 3.8);
        fs(c, "#ea3d3d", "#9c1f1f", 0.9);
        circ(c, x - 1.2, y - 1.2, 1);
        c.fillStyle = "#ffc2c2";
        c.fill();
      }
    } else {
      c.strokeStyle = "#a8743c";
      c.lineWidth = 2.4;
      for (const x of [12, 27, 42]) {
        c.beginPath();
        c.moveTo(x, 60);
        c.lineTo(x, 6);
        c.stroke();
      }
      for (let i = 0; i < 16; i++) {
        const x = 6 + r() * 42, y = 10 + r() * 40;
        c.beginPath();
        c.ellipse(x, y, 6, 3.4, r() * PI, 0, PI * 2);
        fs(c, i % 2 ? "#63bd4c" : "#4aa540", "#2f7a2c", 0.7);
      }
      for (const [x, y, rad] of [[14, 58, 10], [38, 60, 9]]) {
        for (let k = 3; k >= 1; k--) {
          circ(c, x, y, (rad * k) / 3);
          fs(c, ["#d5f2a0", "#a9dd78", "#7cc35a"][k - 1], "#4c9440", 0.9);
        }
      }
      ell(c, 27, 64, 7, 5.5);
      fs(c, "#f59a2b", "#b8611a", 1);
    }
  });
}
/** mask bits: 1=N 2=E 4=S 8=W neighbouring fences */
export function fence(mask: number): Spr {
  return mk(`fence${mask}`, T, 62, 24, 62, (c) => {
    const rail = "#c9965a", dark = "#7a4f2a";
    const bar = (x: number, y: number, w: number, h: number) => {
      rr(c, x, y, w, h, 1.5);
      fs(c, rail, dark, 1.2);
    };
    if (mask & 1) bar(21, 0, 6, 30);
    if (mask & 8) {
      bar(0, 24, 25, 5.5);
      bar(0, 37, 25, 5.5);
    }
    if (mask & 2) {
      bar(23, 24, 25, 5.5);
      bar(23, 37, 25, 5.5);
    }
    if (!(mask & 10)) {
      bar(12, 24, 24, 5.5);
      bar(12, 37, 24, 5.5);
    }
    if (mask & 4) bar(21, 34, 6, 28);
    rr(c, 19.5, 14, 9, 40, 2.5);
    fs(c, "#b07a40", dark, 1.3);
    rr(c, 18.5, 12, 11, 5, 2);
    fs(c, "#d9aa70", dark, 1.2);
  });
}
export function lowFence(vert: boolean): Spr {
  return mk(`lowf${vert ? 1 : 0}`, T, 50, 24, 50, (c) => {
    const post = (x: number, y: number) => {
      rr(c, x - 3.5, y - 16, 7, 18, 2);
      fs(c, "#b07a40", "#6b4423", 1.2);
      circ(c, x, y - 17, 4);
      fs(c, "#ffd43b", "#a86b00", 1);
    };
    if (!vert) {
      post(5, 42);
      post(43, 42);
      rr(c, 3, 26, 42, 8, 2.5);
      fs(c, "#ffffff", "#6b4423", 1.3);
      c.fillStyle = "#e5383b";
      for (let x = 6; x < 42; x += 12) {
        poly(c, [x, 27, x + 6, 27, x + 3, 33, x - 3, 33]);
        c.fill();
      }
    } else {
      post(24, 22);
      rr(c, 20, 14, 8, 32, 2.5);
      fs(c, "#ffffff", "#6b4423", 1.3);
      c.fillStyle = "#e5383b";
      for (let y = 17; y < 44; y += 10) c.fillRect(21, y, 6, 5);
      post(24, 49);
    }
  });
}
export function rock(v: number): Spr {
  return mk(`rock${v}`, 52, 48, 26, 46, (c, r) => {
    shadow(c, 26, 42, 23, 6);
    const pts = v % 2 ? [5, 40, 8, 20, 20, 8, 36, 10, 47, 24, 45, 41] : [4, 41, 10, 16, 26, 6, 42, 14, 48, 30, 44, 42];
    poly(c, pts);
    fs(c, "#98a1ab", "#5e6670", 1.6);
    poly(c, [pts[2] + 3, pts[3] + 2, pts[4] + 1, pts[5] + 3, pts[6] - 3, pts[7] + 3, pts[6] - 8, pts[7] + 12, pts[2] + 6, pts[3] + 9]);
    c.fillStyle = "#c5ccd3";
    c.fill();
    for (let i = 0; i < 3; i++) {
      circ(c, 10 + r() * 30, 30 + r() * 9, 2.2);
      c.fillStyle = "#6fae52";
      c.fill();
    }
  });
}
export function boulder(): Spr {
  return mk("boulder", 52, 54, 26, 52, (c) => {
    shadow(c, 26, 47, 22, 6);
    circ(c, 26, 27, 21);
    fs(c, "#b99776", "#6f5741", 2);
    circ(c, 20, 20, 12);
    c.fillStyle = "#d6b898";
    c.fill();
    c.strokeStyle = "#8a6d54";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(14, 30);
    c.lineTo(22, 34);
    c.lineTo(20, 42);
    c.moveTo(32, 16);
    c.lineTo(36, 26);
    c.lineTo(42, 28);
    c.stroke();
  });
}
export function bush(v: number): Spr {
  return mk(`bush${v}`, 48, 40, 24, 39, (c, r) => {
    shadow(c, 24, 35, 20, 5);
    for (const [x, y, rad] of [[14, 24, 11], [34, 24, 11], [24, 17, 13]]) {
      circ(c, x, y, rad);
      fs(c, "#3d9a48", "#256b33", 1.4);
    }
    for (const [x, y, rad] of [[13, 22, 7], [32, 21, 7], [22, 14, 9]]) {
      circ(c, x, y, rad);
      c.fillStyle = "#5fbd5e";
      c.fill();
    }
    for (let i = 0; i < 5; i++) {
      circ(c, 8 + r() * 32, 12 + r() * 20, 2);
      c.fillStyle = v % 2 ? "#e5383b" : "#6b7cff";
      c.fill();
    }
  });
}
export function thorn(): Spr {
  return mk("thorn", 52, 46, 26, 45, (c, r) => {
    shadow(c, 26, 41, 22, 5);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * PI * 2, x = 26 + Math.cos(a) * 15, y = 26 + Math.sin(a) * 11;
      poly(c, [x + Math.cos(a + 1.5) * 3, y + Math.sin(a + 1.5) * 3, x + Math.cos(a) * 9, y + Math.sin(a) * 8, x + Math.cos(a - 1.5) * 3, y + Math.sin(a - 1.5) * 3]);
      fs(c, "#d93a52", "#7a1728", 0.9);
    }
    for (const [x, y, rad] of [[17, 28, 10], [35, 28, 10], [26, 20, 12]]) {
      circ(c, x, y, rad);
      fs(c, "#4a5d3a", "#2a3a22", 1.4);
    }
    for (let i = 0; i < 9; i++) {
      const x = 12 + r() * 28, y = 14 + r() * 20;
      poly(c, [x - 2, y + 2, x, y - 5, x + 2, y + 2]);
      c.fillStyle = "#ff6b81";
      c.fill();
    }
  });
}
const FCOL = ["#ff7eb6", "#ffe066", "#ffffff", "#c8a2ff", "#ff8a5c", "#8fd3ff"];
export function flowers(v: number): Spr {
  return mk(`fl${v}`, 40, 30, 20, 28, (c, r) => {
    for (let k = 0; k < 3; k++) {
      const x = 8 + k * 12 + (r() - 0.5) * 4, y = 12 + r() * 8;
      c.strokeStyle = "#3f9a3a";
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(x, 27);
      c.quadraticCurveTo(x + 2, 20, x, y);
      c.stroke();
      const col = FCOL[(v + k) % FCOL.length];
      for (let j = 0; j < 5; j++) {
        circ(c, x + Math.cos((j / 5) * PI * 2) * 3.4, y + Math.sin((j / 5) * PI * 2) * 3.4, 2.6);
        fs(c, col, "rgba(0,0,0,.18)", 0.6);
      }
      circ(c, x, y, 2);
      c.fillStyle = "#f59e0b";
      c.fill();
    }
  });
}
export function tallGrass(v: number): Spr {
  return mk(`tg${v}`, 36, 30, 18, 29, (c, r) => {
    for (let i = 0; i < 8; i++) {
      const x = 5 + i * 3.6 + r() * 2, h = 14 + r() * 13, lean = (r() - 0.5) * 10;
      c.beginPath();
      c.moveTo(x - 1.8, 29);
      c.quadraticCurveTo(x + lean * 0.3, 29 - h * 0.6, x + lean, 29 - h);
      c.quadraticCurveTo(x + lean * 0.5 + 1.5, 29 - h * 0.5, x + 1.8, 29);
      fs(c, i % 2 ? "#5fb545" : "#7fd05a", "#3d8a30", 0.7);
    }
  });
}
export function signPost(): Spr {
  return mk("sign", 40, 46, 20, 45, (c) => {
    shadow(c, 20, 42, 12, 4);
    rr(c, 17, 20, 6, 24, 2);
    fs(c, "#8d5b2c", "#5f3d1e");
    rr(c, 3, 4, 34, 21, 3);
    fs(c, "#e0b071", "#6b4423", 1.6);
    c.strokeStyle = "#8d5b2c";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(9, 10);
    c.lineTo(31, 10);
    c.moveTo(9, 15);
    c.lineTo(27, 15);
    c.moveTo(9, 20);
    c.lineTo(23, 20);
    c.stroke();
  });
}
export function stump(): Spr {
  return mk("stump", 40, 34, 20, 33, (c) => {
    shadow(c, 20, 29, 16, 5);
    rr(c, 7, 10, 26, 20, 5);
    fs(c, "#8d5b2c", "#5f3d1e");
    ell(c, 20, 11, 13, 6);
    fs(c, "#e3bd86", "#5f3d1e");
    ell(c, 20, 11, 7, 3);
    c.strokeStyle = "#b98a57";
    c.lineWidth = 1;
    c.stroke();
  });
}
export function chest(open: boolean, locked: boolean, gold: boolean): Spr {
  return mk(`chest${open ? 1 : 0}${locked ? 1 : 0}${gold ? 1 : 0}`, 48, 50, 24, 48, (c) => {
    const wood = gold ? "#f2b21d" : "#a8672e", dark = gold ? "#a86b00" : "#5f3d1e", band = gold ? "#fff0a6" : "#f1c40f";
    shadow(c, 24, 44, 21, 5);
    rr(c, 5, 24, 38, 20, 3);
    fs(c, wood, dark, 1.6);
    c.fillStyle = band;
    c.fillRect(5, 30, 38, 3);
    c.fillRect(9, 24, 4, 20);
    c.fillRect(35, 24, 4, 20);
    if (open) {
      rr(c, 7, 20, 34, 7, 2);
      fs(c, "#3a2412", dark, 1.2);
      c.save();
      c.shadowColor = "#fff3a3";
      c.shadowBlur = 8;
      rr(c, 10, 21, 28, 4, 2);
      c.fillStyle = "#ffe98a";
      c.fill();
      c.restore();
      rr(c, 5, 3, 38, 14, 5);
      fs(c, wood, dark, 1.6);
      c.fillStyle = band;
      c.fillRect(5, 9, 38, 3);
    } else {
      rrc(c, 5, 11, 38, 15, [8, 8, 0, 0]);
      fs(c, wood, dark, 1.6);
      c.fillStyle = band;
      c.fillRect(5, 17, 38, 3);
      c.fillRect(9, 12, 4, 13);
      c.fillRect(35, 12, 4, 13);
      if (locked) {
        c.strokeStyle = "#5b6472";
        c.lineWidth = 2.4;
        c.beginPath();
        c.arc(24, 24, 4, PI, 0);
        c.stroke();
        rr(c, 18.5, 24, 11, 10, 2);
        fs(c, "#c9d1dc", "#4b5563", 1.3);
        circ(c, 24, 28.5, 1.6);
        c.fillStyle = "#1f2937";
        c.fill();
      } else {
        rr(c, 21, 22, 6, 8, 1.5);
        fs(c, "#ffe066", dark, 1);
      }
    }
  });
}
export function keySpr(): Spr {
  return mk("key", 28, 28, 14, 20, (c) => {
    c.save();
    c.shadowColor = "#ffe066";
    c.shadowBlur = 6;
    c.strokeStyle = "#f5b921";
    c.lineWidth = 3.2;
    circ(c, 8, 10, 4.5);
    c.stroke();
    c.beginPath();
    c.moveTo(12, 12);
    c.lineTo(23, 20);
    c.moveTo(19, 17);
    c.lineTo(17, 21);
    c.moveTo(22.5, 19.5);
    c.lineTo(20.5, 23.5);
    c.stroke();
    c.restore();
  });
}
export function buttonSpr(pressed: boolean): Spr {
  return mk(`btn${pressed ? 1 : 0}`, 40, 30, 20, 22, (c) => {
    ell(c, 20, 18, 17, 10);
    fs(c, "#aab2bd", "#5e6670", 1.6);
    ell(c, 20, 16, 12, 7);
    fs(c, "#7b8591", "#4b5563", 1);
    if (pressed) {
      ell(c, 20, 16, 9, 5);
      fs(c, "#3bd16f", "#15803d", 1.2);
    } else {
      rrc(c, 11, 6, 18, 11, [8, 8, 3, 3]);
      fs(c, "#ef4444", "#991b1b", 1.3);
      ell(c, 17, 9, 4, 2);
      c.fillStyle = "rgba(255,255,255,.5)";
      c.fill();
    }
  });
}
export function gate(open: boolean): Spr {
  return mk(`gate${open ? 1 : 0}`, 56, 70, 28, 68, (c) => {
    const post = (x: number) => {
      rr(c, x, 8, 9, 60, 3);
      fs(c, "#8d5b2c", "#4f3219", 1.6);
      rr(c, x - 1.5, 4, 12, 7, 2.5);
      fs(c, "#c9965a", "#4f3219", 1.3);
    };
    if (!open) {
      rr(c, 9, 18, 38, 46, 3);
      fs(c, "#b77a3f", "#4f3219", 1.6);
      c.strokeStyle = "#8a5a2c";
      c.lineWidth = 1.2;
      for (let x = 16; x < 46; x += 7) {
        c.beginPath();
        c.moveTo(x, 19);
        c.lineTo(x, 63);
        c.stroke();
      }
      c.fillStyle = "#4b5563";
      c.fillRect(9, 26, 38, 4);
      c.fillRect(9, 52, 38, 4);
      c.strokeStyle = "#5b6472";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(28, 37, 5.5, PI, 0);
      c.stroke();
      rr(c, 20.5, 37, 15, 13, 2.5);
      fs(c, "#ffd43b", "#a86b00", 1.5);
      circ(c, 28, 42.5, 2);
      c.fillStyle = "#422006";
      c.fill();
      c.fillRect(27.2, 43, 1.6, 4);
    } else {
      rr(c, 0, 20, 5, 44, 2);
      fs(c, "#b77a3f", "#4f3219", 1.3);
      rr(c, 51, 20, 5, 44, 2);
      fs(c, "#b77a3f", "#4f3219", 1.3);
    }
    post(1);
    post(46);
  });
}
export function mazeGate(closed: boolean, label: string, color: string): Spr {
  return mk(`mgate${closed ? 1 : 0}_${label}`, 72, 92, 36, 90, (c) => {
    if (closed) {
      c.strokeStyle = "#4b5563";
      c.lineWidth = 4;
      for (let x = 17; x <= 55; x += 9.5) {
        c.beginPath();
        c.moveTo(x, 30);
        c.lineTo(x, 88);
        c.stroke();
      }
      c.fillStyle = "#374151";
      c.fillRect(12, 44, 48, 5);
      c.fillRect(12, 72, 48, 5);
      rr(c, 27, 52, 18, 16, 3);
      fs(c, "#ffd43b", "#a86b00", 1.6);
      circ(c, 36, 59, 2.4);
      c.fillStyle = "#422006";
      c.fill();
    }
    for (const x of [4, 57]) {
      rr(c, x, 22, 11, 68, 3);
      fs(c, "#8d5b2c", "#4f3219", 1.7);
      c.fillStyle = "#6f451f";
      c.fillRect(x + 7, 24, 3, 64);
    }
    rr(c, 0, 8, 72, 20, 6);
    fs(c, color, "#4f3219", 1.8);
    rr(c, 3, 11, 66, 14, 4);
    c.strokeStyle = "rgba(255,255,255,.55)";
    c.lineWidth = 1.2;
    c.stroke();
    c.fillStyle = "#fff";
    c.font = "bold 10px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.strokeStyle = "rgba(0,0,0,.55)";
    c.lineWidth = 2.5;
    c.strokeText(label, 36, 18.5);
    c.fillText(label, 36, 18.5);
    for (const x of [9.5, 62.5]) {
      circ(c, x, 6, 5);
      fs(c, "#ffd43b", "#a86b00", 1.2);
    }
  });
}
export function secretWall(): Spr {
  return mk("secret", 54, 66, 27, 64, (c, r) => {
    rr(c, 1, 8, 52, 56, 8);
    fs(c, "#8f98a3", "#565e68", 1.8);
    c.strokeStyle = "#6b737e";
    c.lineWidth = 1.3;
    c.beginPath();
    c.moveTo(1, 26);
    c.lineTo(53, 26);
    c.moveTo(1, 45);
    c.lineTo(53, 45);
    c.moveTo(18, 8);
    c.lineTo(18, 26);
    c.moveTo(38, 26);
    c.lineTo(38, 45);
    c.moveTo(14, 45);
    c.lineTo(14, 64);
    c.moveTo(34, 45);
    c.lineTo(34, 64);
    c.stroke();
    c.strokeStyle = "#3f9a3a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(8, 8);
    c.quadraticCurveTo(14, 26, 9, 44);
    c.moveTo(44, 8);
    c.quadraticCurveTo(40, 22, 47, 36);
    c.stroke();
    for (let i = 0; i < 6; i++) {
      circ(c, 6 + r() * 42, 10 + r() * 30, 2.4);
      c.fillStyle = "#58b452";
      c.fill();
    }
    circ(c, 27, 36, 3);
    fs(c, "#c7b3ff", "#6b46b8", 1);
  });
}
export function plotMound(wet: boolean): Spr {
  return mk(`plot${wet ? 1 : 0}`, 48, 30, 24, 15, (c) => {
    ell(c, 24, 16, 22, 12);
    fs(c, wet ? "#5b3716" : "#7a4b24", "#40260f", 1.6);
    c.strokeStyle = wet ? "#7a4e25" : "#9c693a";
    c.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.ellipse(24, 16 + i * 5, 16 - Math.abs(i) * 3, 2.2, 0, PI, PI * 2);
      c.stroke();
    }
  });
}
export function sprout(stage: number): Spr {
  return mk(`sprout${stage}`, 36, 40, 18, 36, (c) => {
    const leaf = (x: number, y: number, dx: number, dy: number, s: number) => {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + dx * 0.4 - dy * 0.5, y + dy * 0.4 - 4 * s, x + dx, y + dy);
      c.quadraticCurveTo(x + dx * 0.5 + dy * 0.3, y + dy * 0.5 + 3 * s, x, y);
      fs(c, "#62c24b", "#2f7f2c", 0.9);
    };
    const h = [8, 15, 22][stage];
    c.strokeStyle = "#3f9a3a";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(18, 36);
    c.lineTo(18, 36 - h);
    c.stroke();
    leaf(18, 36 - h, -8, -5, 1);
    leaf(18, 36 - h, 8, -5, 1);
    if (stage >= 1) {
      leaf(18, 36 - h * 0.5, -10, -3, 1.2);
      leaf(18, 36 - h * 0.5, 10, -3, 1.2);
    }
    if (stage >= 2) {
      leaf(18, 36 - h * 0.2, -11, -1, 1.3);
      leaf(18, 36 - h * 0.2, 11, -1, 1.3);
      circ(c, 18, 36 - h - 3, 3);
      fs(c, "#ffe066", "#b98310", 0.9);
    }
  });
}
export function hay(): Spr {
  return mk("hay", 52, 46, 26, 44, (c) => {
    shadow(c, 26, 41, 23, 5);
    const bale = (x: number, y: number, w: number, h: number) => {
      rr(c, x, y, w, h, 4);
      fs(c, "#f0c851", "#a5781c", 1.5);
      c.strokeStyle = "#d3a531";
      c.lineWidth = 1;
      for (let k = y + 4; k < y + h; k += 4) {
        c.beginPath();
        c.moveTo(x + 2, k);
        c.lineTo(x + w - 2, k);
        c.stroke();
      }
      c.fillStyle = "#b5532a";
      c.fillRect(x + w * 0.28, y, 2.5, h);
      c.fillRect(x + w * 0.68, y, 2.5, h);
    };
    bale(3, 22, 46, 20);
    bale(11, 5, 30, 18);
  });
}
export function nest(egg: boolean): Spr {
  return mk(`nest${egg ? 1 : 0}`, 44, 34, 22, 31, (c) => {
    shadow(c, 22, 28, 18, 5);
    ell(c, 22, 20, 18, 10);
    fs(c, "#d8ab52", "#8a6220", 1.5);
    ell(c, 22, 18, 12, 6);
    fs(c, "#a57a2c", "#8a6220", 1);
    c.strokeStyle = "#f0d07a";
    c.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(6 + i * 5, 24);
      c.lineTo(9 + i * 5, 27);
      c.stroke();
    }
    if (egg) {
      ell(c, 22, 14, 6, 7.5);
      fs(c, "#fff8e6", "#b99d6b", 1.2);
      ell(c, 20, 11, 2, 2.6);
      c.fillStyle = "#fff";
      c.fill();
    }
  });
}
export function mushroom(ready: boolean): Spr {
  return mk(`mush${ready ? 1 : 0}`, 32, 32, 16, 29, (c) => {
    if (!ready) {
      rr(c, 14, 22, 4, 7, 2);
      fs(c, "#f3ead7", "#9c8d70", 1);
      ell(c, 16, 22, 5, 3);
      fs(c, "#d9a0a0", "#9c5a5a", 1);
      return;
    }
    c.save();
    c.shadowColor = "#7df9ff";
    c.shadowBlur = 7;
    rr(c, 12, 15, 8, 14, 3);
    fs(c, "#fff6e3", "#9c8d70", 1.2);
    c.restore();
    c.beginPath();
    c.moveTo(2, 18);
    c.quadraticCurveTo(16, -6, 30, 18);
    c.quadraticCurveTo(16, 22, 2, 18);
    fs(c, "#ef4444", "#8f1d22", 1.4);
    for (const [x, y, rad] of [[10, 12, 2.4], [18, 8, 2.8], [23, 14, 2]]) {
      circ(c, x, y, rad);
      c.fillStyle = "#fff";
      c.fill();
    }
  });
}
export function bigFlower(i: number, ready: boolean): Spr {
  return mk(`bigfl${i}_${ready ? 1 : 0}`, 34, 46, 17, 44, (c) => {
    c.strokeStyle = "#3f9a3a";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(17, 44);
    c.quadraticCurveTo(19, 30, 17, ready ? 16 : 34);
    c.stroke();
    c.beginPath();
    c.ellipse(11, 36, 6, 2.6, -0.5, 0, PI * 2);
    fs(c, "#62c24b", "#2f7f2c", 0.9);
    c.beginPath();
    c.ellipse(23, 33, 6, 2.6, 0.5, 0, PI * 2);
    fs(c, "#62c24b", "#2f7f2c", 0.9);
    if (!ready) {
      ell(c, 17, 33, 3, 4);
      fs(c, "#8fd36a", "#2f7f2c", 0.9);
      return;
    }
    const k = i % 4;
    if (k === 0) {
      c.beginPath();
      c.moveTo(8, 8);
      c.quadraticCurveTo(12, 14, 13, 6);
      c.quadraticCurveTo(17, 14, 21, 6);
      c.quadraticCurveTo(22, 14, 26, 8);
      c.quadraticCurveTo(27, 24, 17, 24);
      c.quadraticCurveTo(7, 24, 8, 8);
      fs(c, i % 8 === 0 ? "#ef4444" : "#ff7eb6", "#8f1d22", 1.2);
    } else {
      const n = k === 1 ? 12 : 7, col = k === 1 ? "#ffd43b" : k === 2 ? "#ffffff" : "#c8a2ff", rad = k === 1 ? 10 : 9;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * PI * 2;
        c.beginPath();
        c.ellipse(17 + Math.cos(a) * rad * 0.6, 14 + Math.sin(a) * rad * 0.6, rad * 0.5, rad * 0.26, a, 0, PI * 2);
        fs(c, col, "rgba(0,0,0,.25)", 0.7);
      }
      circ(c, 17, 14, k === 1 ? 5 : 3.6);
      fs(c, k === 1 ? "#7a4b24" : "#f59e0b", "rgba(0,0,0,.3)", 0.8);
    }
  });
}
export function prop(v: number): Spr {
  return mk(`prop${v}`, 44, 40, 22, 37, (c) => {
    shadow(c, 22, 34, 17, 5);
    if (v === 0) {
      for (const [x, y, rad] of [[14, 26, 9], [29, 27, 8], [22, 18, 9]]) {
        circ(c, x, y, rad);
        fs(c, "#9aa3ad", "#5e6670", 1.4);
        circ(c, x - 2, y - 3, rad * 0.5);
        c.fillStyle = "#c5ccd3";
        c.fill();
      }
    } else if (v === 1) {
      rr(c, 7, 12, 30, 22, 3);
      fs(c, "#c9965a", "#6b4423", 1.5);
      c.strokeStyle = "#8d5b2c";
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(7, 19);
      c.lineTo(37, 19);
      c.moveTo(7, 27);
      c.lineTo(37, 27);
      c.moveTo(10, 13);
      c.lineTo(34, 33);
      c.stroke();
    } else if (v === 2) {
      poly(c, [5, 34, 12, 14, 22, 8, 32, 14, 39, 34]);
      fs(c, "#f0c851", "#a5781c", 1.5);
      c.strokeStyle = "#d3a531";
      c.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(10 + i * 5, 32);
        c.lineTo(14 + i * 3.5, 14 + (i % 2) * 4);
        c.stroke();
      }
    } else if (v === 3) {
      for (const [x, y, rad] of [[14, 24, 10], [30, 24, 10], [22, 17, 11]]) {
        circ(c, x, y, rad);
        fs(c, "#4aa856", "#256b33", 1.4);
      }
      circ(c, 18, 16, 2);
      fs(c, "#fff3a3", null);
      circ(c, 28, 22, 2);
      fs(c, "#ff8fb8", null);
    } else {
      rrc(c, 10, 16, 24, 18, [2, 2, 7, 7]);
      fs(c, "#c8683a", "#7a3a1c", 1.5);
      rr(c, 8, 12, 28, 6, 2);
      fs(c, "#d97b4a", "#7a3a1c", 1.3);
      ell(c, 22, 12, 10, 3);
      fs(c, "#4a3018", null);
      c.beginPath();
      c.moveTo(22, 12);
      c.quadraticCurveTo(14, 2, 16, 0);
      c.moveTo(22, 12);
      c.quadraticCurveTo(30, 3, 27, 0);
      c.strokeStyle = "#3f9a3a";
      c.lineWidth = 2;
      c.stroke();
    }
  });
}
export function lily(): Spr {
  return mk("lily", 30, 22, 15, 16, (c) => {
    c.beginPath();
    c.ellipse(15, 12, 12, 7, 0, 0.3, PI * 2 - 0.2);
    c.lineTo(15, 12);
    c.closePath();
    fs(c, "#5fbd5e", "#2f7f38", 1.1);
    for (let j = 0; j < 5; j++) {
      circ(c, 12 + Math.cos((j / 5) * PI * 2) * 3, 9 + Math.sin((j / 5) * PI * 2) * 3, 2.3);
      fs(c, "#ffc2de", "rgba(0,0,0,.2)", 0.5);
    }
    circ(c, 12, 9, 1.6);
    fs(c, "#ffe066", null);
  });
}

/* ---------------- buildings (anchor = bottom-left tile, bottom-left corner) ---------------- */
export function house(): Spr {
  return mk("house", 256, 250, 8, 246, (c) => {
    shadow(c, 128, 244, 124, 8);
    rr(c, 14, 120, 228, 126, 3);
    fs(c, "#fff1d0", "#8a5a3c", 2);
    c.fillStyle = "#b9b2a6";
    c.fillRect(15, 228, 226, 17);
    c.strokeStyle = "#8a5a3c";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(14, 180);
    c.lineTo(242, 180);
    c.moveTo(94, 122);
    c.lineTo(94, 180);
    c.moveTo(162, 122);
    c.lineTo(162, 180);
    c.moveTo(16, 180);
    c.lineTo(94, 124);
    c.moveTo(240, 180);
    c.lineTo(162, 124);
    c.stroke();
    // chimney
    rr(c, 188, 12, 24, 44, 2);
    fs(c, "#b9634a", "#6f3324", 1.6);
    rr(c, 185, 8, 30, 8, 2);
    fs(c, "#d98a6d", "#6f3324", 1.4);
    // roof
    poly(c, [0, 134, 256, 134, 224, 38, 32, 38]);
    fs(c, "#d9503f", "#7c2318", 2);
    c.strokeStyle = "#b53a2c";
    c.lineWidth = 1.6;
    for (let y = 52; y < 132; y += 14) {
      const k = (y - 38) / 96;
      c.beginPath();
      c.moveTo(32 - 32 * k, y);
      c.lineTo(224 + 32 * k, y);
      c.stroke();
      for (let x = 20 + ((y / 14) % 2) * 9; x < 240; x += 18) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 14);
        c.stroke();
      }
    }
    c.fillStyle = "#f07a66";
    c.fillRect(32, 38, 192, 5);
    c.fillStyle = "rgba(90,40,20,.35)";
    c.fillRect(14, 134, 228, 6);
    // dormer window
    poly(c, [104, 100, 128, 70, 152, 100]);
    fs(c, "#e86c58", "#7c2318", 1.6);
    rr(c, 114, 86, 28, 22, 2);
    fs(c, "#9fd8f5", "#8a5a3c", 2);
    // door
    rrc(c, 108, 176, 40, 70, [18, 18, 0, 0]);
    fs(c, "#9c6238", "#5f3d1e", 2);
    c.strokeStyle = "#7a4a25";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(128, 178);
    c.lineTo(128, 246);
    c.stroke();
    circ(c, 140, 214, 2.6);
    fs(c, "#ffd43b", "#a86b00", 1);
    rr(c, 111, 160, 34, 12, 3);
    fs(c, "#3f9cec", "#1c2646", 1.3);
    c.fillStyle = "#fff";
    c.font = "bold 9px sans-serif";
    c.textAlign = "center";
    c.fillText("ROBI", 128, 169.5);
    // windows
    for (const x of [34, 178]) {
      rr(c, x, 190, 44, 34, 3);
      fs(c, "#9fd8f5", "#8a5a3c", 2.4);
      c.beginPath();
      c.moveTo(x + 22, 190);
      c.lineTo(x + 22, 224);
      c.moveTo(x, 207);
      c.lineTo(x + 44, 207);
      c.stroke();
      rr(c, x - 3, 224, 50, 8, 2);
      fs(c, "#a8743c", "#5f3d1e", 1.2);
      for (let k = 0; k < 5; k++) {
        circ(c, x + 3 + k * 10, 222, 4);
        fs(c, ["#ff7eb6", "#ffe066", "#ff8a5c"][k % 3], "rgba(0,0,0,.2)", 0.6);
      }
    }
  });
}
export function barn(): Spr {
  return mk("barn", 256, 226, 8, 222, (c) => {
    shadow(c, 128, 220, 124, 8);
    const g = [14, 222, 14, 118, 36, 66, 78, 28, 178, 28, 220, 66, 242, 118, 242, 222];
    poly(c, g);
    fs(c, "#c8412f", "#6f1d14", 2);
    c.strokeStyle = "#a8301f";
    c.lineWidth = 1.2;
    for (let x = 30; x < 242; x += 16) {
      c.beginPath();
      c.moveTo(x, 70);
      c.lineTo(x, 222);
      c.stroke();
    }
    c.strokeStyle = "#5a3d30";
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(6, 124);
    c.lineTo(32, 62);
    c.lineTo(76, 24);
    c.lineTo(180, 24);
    c.lineTo(224, 62);
    c.lineTo(250, 124);
    c.stroke();
    c.strokeStyle = "#7a5646";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(8, 118);
    c.lineTo(33, 59);
    c.lineTo(77, 21);
    c.lineTo(179, 21);
    c.stroke();
    // loft
    rr(c, 108, 58, 40, 34, 3);
    fs(c, "#3a2412", "#fff", 3);
    c.fillStyle = "#f0c851";
    c.fillRect(112, 78, 32, 12);
    // doors
    rr(c, 76, 126, 104, 96, 3);
    fs(c, "#b03524", "#ffffff", 4);
    c.strokeStyle = "#fff";
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(128, 126);
    c.lineTo(128, 222);
    c.moveTo(78, 128);
    c.lineTo(128, 220);
    c.moveTo(128, 128);
    c.lineTo(78, 220);
    c.moveTo(128, 128);
    c.lineTo(178, 220);
    c.moveTo(178, 128);
    c.lineTo(128, 220);
    c.stroke();
    for (const x of [32, 198]) {
      rr(c, x, 150, 26, 26, 2);
      fs(c, "#9fd8f5", "#fff", 3);
    }
  });
}
export function coop(): Spr {
  return mk("coop", 108, 128, 6, 124, (c) => {
    shadow(c, 54, 122, 50, 6);
    rr(c, 12, 58, 84, 64, 3);
    fs(c, "#dba862", "#7a4f2a", 1.8);
    c.strokeStyle = "#b9844d";
    c.lineWidth = 1.2;
    for (let y = 70; y < 120; y += 12) {
      c.beginPath();
      c.moveTo(13, y);
      c.lineTo(95, y);
      c.stroke();
    }
    poly(c, [2, 64, 54, 14, 106, 64]);
    fs(c, "#d9503f", "#7c2318", 2);
    c.strokeStyle = "#f07a66";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(10, 60);
    c.lineTo(54, 18);
    c.stroke();
    rrc(c, 42, 84, 24, 38, [12, 12, 0, 0]);
    fs(c, "#3a2412", "#7a4f2a", 1.8);
    circ(c, 54, 46, 8);
    fs(c, "#9fd8f5", "#7a4f2a", 2);
    poly(c, [44, 122, 64, 122, 70, 128, 38, 128]);
    fs(c, "#b9844d", "#7a4f2a", 1.2);
  });
}
export function mill(): Spr {
  return mk("mill", 112, 200, 8, 196, (c) => {
    shadow(c, 56, 194, 44, 7);
    poly(c, [20, 196, 92, 196, 80, 70, 32, 70]);
    fs(c, "#eadfc4", "#8a7a5c", 2);
    c.strokeStyle = "#cfc09c";
    c.lineWidth = 1.2;
    for (let y = 86; y < 196; y += 16) {
      c.beginPath();
      c.moveTo(30 - (y - 70) * 0.08, y);
      c.lineTo(82 + (y - 70) * 0.08, y);
      c.stroke();
    }
    poly(c, [24, 76, 56, 34, 88, 76]);
    fs(c, "#8d5b2c", "#4f3219", 2);
    rrc(c, 44, 158, 24, 38, [12, 12, 0, 0]);
    fs(c, "#9c6238", "#5f3d1e", 1.8);
    rr(c, 47, 104, 18, 22, 8);
    fs(c, "#9fd8f5", "#8a5a3c", 2);
  });
}
export const MILL_HUB = { x: 56 - 8, y: 60 - 196 };
export function well(): Spr {
  return mk("well", 56, 70, 4, 66, (c) => {
    shadow(c, 28, 63, 22, 5);
    c.strokeStyle = "#8d5b2c";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(11, 44);
    c.lineTo(11, 14);
    c.moveTo(45, 44);
    c.lineTo(45, 14);
    c.stroke();
    poly(c, [2, 18, 28, 2, 54, 18]);
    fs(c, "#d9503f", "#7c2318", 1.8);
    rr(c, 6, 38, 44, 26, 6);
    fs(c, "#aab2bd", "#5e6670", 1.8);
    ell(c, 28, 40, 20, 7);
    fs(c, "#3d9fe8", "#5e6670", 1.6);
    c.strokeStyle = "#7b8591";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(6, 52);
    c.lineTo(50, 52);
    c.moveTo(20, 46);
    c.lineTo(20, 64);
    c.moveTo(36, 46);
    c.lineTo(36, 64);
    c.stroke();
  });
}
