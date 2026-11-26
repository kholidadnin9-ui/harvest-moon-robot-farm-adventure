/* ------------------------------------------------------------------
 * ROBI – rigged 2D sprite. Every animation is a sequence of poses
 * (legs, arms, torso lean, head, eyes) rendered for 4 directions.
 * ------------------------------------------------------------------ */
export type RobiAnim = "idle" | "walk" | "run" | "jump" | "land" | "interact" | "harvest" | "water" | "feed" | "search" | "tool" | "push" | "fall" | "victory";
export type Dir = "down" | "up" | "left" | "right";
export interface RobiGear {
  crown?: boolean;
  silver?: boolean;
}
type Eyes = "open" | "closed" | "smile" | "focus" | "dizzy" | "star";
type Mouth = "smile" | "open" | "flat";
type Item = null | "can" | "feed" | "lens" | "sickle";
interface Pose {
  y: number;
  lean: number;
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  head: number;
  hy: number;
  sx: number;
  sy: number;
  rot: number;
  eyes: Eyes;
  mouth: Mouth;
  item: Item;
  ant: number;
}
type Ctx = CanvasRenderingContext2D;

const K = {
  blue: "#3f9cec", blueD: "#2a78c9", yel: "#ffd43b", yelD: "#e0a520", joint: "#3b4358", visor: "#141b30", cyan: "#62f4ff",
  straw: "#edc96f", strawD: "#c4943a", red: "#e5383b", brown: "#8d5b2c", brownD: "#5f3d1e", brownL: "#c98d4f", line: "#1c2646", steel: "#b4bcc8",
};
const HIP = -19;
const PI = Math.PI;

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
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
function fs(c: Ctx, fill: string, stroke: string | null = K.line, lw = 1.2) {
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function glow(c: Ctx, x: number, y: number, r: number) {
  c.save();
  c.shadowColor = K.cyan;
  c.shadowBlur = 5;
  circ(c, x, y, r);
  c.fillStyle = K.cyan;
  c.fill();
  c.restore();
  circ(c, x - r * 0.3, y - r * 0.3, r * 0.35);
  c.fillStyle = "#fff";
  c.fill();
}

export function robiPose(anim: RobiAnim, t: number, p: number): Pose {
  const s = Math.sin;
  const P: Pose = { y: 0, lean: 0, legL: 0, legR: 0, armL: 0.08, armR: 0.08, head: 0, hy: 0, sx: 1, sy: 1, rot: 0, eyes: "open", mouth: "smile", item: null, ant: s(t * 3) * 0.12 };
  switch (anim) {
    case "idle": {
      const b = s(t * 2.4);
      P.sy = 1 + b * 0.014;
      P.hy = b * 0.5;
      P.head = s(t * 1.2) * 0.045;
      P.armL = 0.08 + b * 0.05;
      P.armR = 0.08 - b * 0.05;
      if (t % 3.4 > 3.26 || (t + 1.3) % 5.1 > 5.0) P.eyes = "closed";
      break;
    }
    case "walk": {
      const ph = t * 9;
      P.legL = s(ph);
      P.legR = -s(ph);
      P.armL = -s(ph) * 0.65;
      P.armR = s(ph) * 0.65;
      P.y = -Math.abs(s(ph)) * 1.6;
      P.lean = 0.05;
      P.head = s(ph) * 0.03;
      P.ant = s(ph) * 0.2;
      break;
    }
    case "run": {
      const ph = t * 14;
      P.legL = s(ph) * 1.35;
      P.legR = -s(ph) * 1.35;
      P.armL = -s(ph) * 1.15;
      P.armR = s(ph) * 1.15;
      P.y = -Math.abs(s(ph)) * 3.2;
      P.lean = 0.3;
      P.eyes = "focus";
      P.mouth = "open";
      P.ant = -0.35;
      break;
    }
    case "jump": {
      const up = s(Math.min(1, p) * PI);
      P.legL = 0.5 + up * 0.3;
      P.legR = -0.3 - up * 0.2;
      P.armL = P.armR = 1.2 + up * 1.3;
      P.sy = 1 + up * 0.07;
      P.sx = 1 - up * 0.04;
      if (p < 0.12) {
        P.sy = 0.88;
        P.sx = 1.08;
      }
      P.eyes = "smile";
      P.mouth = "open";
      break;
    }
    case "land": {
      P.sy = 0.84 + 0.16 * p;
      P.sx = 1.12 - 0.12 * p;
      P.armL = P.armR = 0.9 * (1 - p);
      P.legL = 0.2;
      P.legR = -0.2;
      break;
    }
    case "interact": {
      const b = s(p * PI);
      P.lean = b * 0.8;
      P.armL = P.armR = b;
      P.y = b * 2;
      P.eyes = "focus";
      break;
    }
    case "harvest": {
      if (p < 0.45) {
        const b = s((p / 0.45) * PI * 0.5);
        P.lean = b * 0.8;
        P.armL = P.armR = b;
        P.y = b * 2;
        P.eyes = "focus";
      } else {
        const b = s(((p - 0.45) / 0.55) * PI);
        P.lean = -0.12 * b;
        P.armL = P.armR = 2.7;
        P.y = -b * 7;
        P.eyes = "smile";
        P.mouth = "open";
      }
      break;
    }
    case "water":
      P.lean = 0.22;
      P.armR = 1.25 + s(t * 7) * 0.1;
      P.armL = 0.3;
      P.item = "can";
      P.eyes = "smile";
      break;
    case "feed":
      P.lean = 0.15;
      P.armR = 1.1 + s(t * 9) * 0.45;
      P.armL = 0.2;
      P.item = "feed";
      P.eyes = "smile";
      break;
    case "search":
      P.lean = 0.5 + s(t * 5) * 0.08;
      P.head = s(t * 6) * 0.14;
      P.armR = 1.15;
      P.item = "lens";
      P.eyes = "focus";
      P.mouth = "flat";
      break;
    case "tool": {
      const q = Math.min(1, p * 2);
      P.armR = 2.6 - q * 2.2;
      P.lean = 0.1 + q * 0.3;
      P.item = "sickle";
      P.eyes = "focus";
      P.mouth = "flat";
      break;
    }
    case "push": {
      const ph = t * 7;
      P.lean = 0.45;
      P.armL = P.armR = 1.45;
      P.legL = s(ph) * 0.8;
      P.legR = -s(ph) * 0.8;
      P.y = -Math.abs(s(ph)) * 0.8;
      P.eyes = "closed";
      P.mouth = "flat";
      break;
    }
    case "fall": {
      if (p < 0.2) {
        const q = p / 0.2;
        P.rot = q * 1.5;
        P.y = -s(q * PI) * 9 + q * 9;
        P.armL = P.armR = 2.2;
        P.eyes = "dizzy";
        P.mouth = "open";
      } else if (p < 0.7) {
        P.rot = 1.5;
        P.y = 9 - Math.abs(s((p - 0.2) * 24)) * Math.max(0, 0.36 - p) * 26;
        P.armL = 1.8;
        P.armR = 0.6;
        P.eyes = "dizzy";
        P.mouth = "open";
      } else {
        const q = (p - 0.7) / 0.3;
        P.rot = 1.5 * (1 - q) + s(q * PI * 3) * 0.08 * (1 - q);
        P.y = 9 * (1 - q) - s(q * PI) * 5;
        P.armL = P.armR = 0.8 * (1 - q);
        P.eyes = q > 0.6 ? "open" : "closed";
      }
      break;
    }
    case "victory": {
      const ph = t * 7.5;
      const b = Math.abs(s(ph));
      P.y = -b * 13;
      P.armL = 2.75 + s(ph * 2) * 0.15;
      P.armR = 2.75 - s(ph * 2) * 0.15;
      P.legL = b * 0.6;
      P.legR = -b * 0.4;
      P.rot = s(ph) * 0.07;
      P.sy = 1 + b * 0.05;
      P.eyes = "star";
      P.mouth = "open";
      break;
    }
  }
  return P;
}

/* ---------------- parts ---------------- */
function eye(c: Ctx, x: number, y: number, kind: Eyes) {
  c.save();
  c.shadowColor = K.cyan;
  c.shadowBlur = 3;
  c.fillStyle = K.cyan;
  c.strokeStyle = K.cyan;
  c.lineWidth = 1.7;
  c.lineCap = "round";
  switch (kind) {
    case "open":
      rr(c, x - 2, y - 3, 4, 6, 2);
      c.fill();
      break;
    case "closed":
      c.beginPath();
      c.moveTo(x - 2.6, y);
      c.lineTo(x + 2.6, y);
      c.stroke();
      break;
    case "smile":
      c.beginPath();
      c.arc(x, y + 1.3, 2.8, PI, PI * 2);
      c.stroke();
      break;
    case "focus":
      rr(c, x - 2.4, y - 1.4, 4.8, 3.6, 1.4);
      c.fill();
      break;
    case "dizzy":
      c.beginPath();
      c.moveTo(x - 2.3, y - 2.3);
      c.lineTo(x + 2.3, y + 2.3);
      c.moveTo(x + 2.3, y - 2.3);
      c.lineTo(x - 2.3, y + 2.3);
      c.stroke();
      break;
    case "star": {
      c.fillStyle = "#ffe066";
      c.shadowColor = "#ffe066";
      c.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? 1.3 : 3.6;
        const a = (i / 8) * PI * 2 - PI / 2;
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      break;
    }
  }
  c.restore();
}
function mouth(c: Ctx, x: number, y: number, kind: Mouth, w: number) {
  c.save();
  c.strokeStyle = K.cyan;
  c.fillStyle = K.cyan;
  c.lineWidth = 1.3;
  c.lineCap = "round";
  c.beginPath();
  if (kind === "smile") {
    c.arc(x, y - 1, w, 0.15 * PI, 0.85 * PI);
    c.stroke();
  } else if (kind === "open") {
    c.ellipse(x, y + 0.4, w * 0.7, w * 0.55, 0, 0, PI * 2);
    c.fill();
  } else {
    c.moveTo(x - w * 0.7, y + 0.4);
    c.lineTo(x + w * 0.7, y + 0.4);
    c.stroke();
  }
  c.restore();
}
function drawItem(c: Ctx, item: Item) {
  if (!item) return;
  c.save();
  c.translate(0, 12);
  if (item === "can") {
    rr(c, -4, -2, 10, 9, 2);
    fs(c, "#3fae6b");
    c.strokeStyle = "#2c8c52";
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(6, 1);
    c.lineTo(12, -3);
    c.stroke();
    rr(c, 11, -5.5, 3.5, 5, 1);
    fs(c, "#2c8c52", null);
  } else if (item === "feed") {
    rr(c, -4, -1, 9, 9, 3);
    fs(c, "#d9b36c");
    c.fillStyle = "#f6e27a";
    for (let i = 0; i < 3; i++) {
      circ(c, -2 + i * 2.5, -2.5, 1.1);
      c.fill();
    }
  } else if (item === "lens") {
    c.strokeStyle = K.brownD;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(0, 1);
    c.lineTo(0, 7);
    c.stroke();
    circ(c, 0, 11.5, 5.2);
    c.fillStyle = "rgba(190,240,255,.6)";
    c.fill();
    c.strokeStyle = "#444b5e";
    c.lineWidth = 1.8;
    c.stroke();
  } else {
    c.strokeStyle = K.brownD;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(0, -1);
    c.lineTo(0, 8);
    c.stroke();
    c.strokeStyle = K.steel;
    c.lineWidth = 2.6;
    c.beginPath();
    c.arc(4.5, 9, 6, PI * 0.9, PI * 1.9, true);
    c.stroke();
  }
  c.restore();
}
function legSide(c: Ctx, hx: number, ang: number, far: boolean) {
  c.save();
  c.translate(hx, HIP);
  c.rotate(ang);
  rr(c, -3.6, -1, 7.2, 13, 3);
  fs(c, far ? K.blueD : K.blue);
  circ(c, 0, 6, 2);
  fs(c, K.joint, null);
  rr(c, -4.6, 10.4, 12.5, 8.4, 3.6);
  fs(c, far ? K.yelD : K.yel);
  c.fillStyle = K.joint;
  c.fillRect(-4.2, 17.2, 11.6, 1.6);
  c.restore();
}
function legFront(c: Ctx, x: number, sw: number) {
  const lift = Math.max(0, sw) * 4.6;
  c.save();
  c.translate(x, HIP);
  rr(c, -3.7, -1, 7.4, 13 - lift * 0.6, 3);
  fs(c, K.blue);
  rr(c, -5.2, 10.2 - lift, 10.4, 8.8, 4);
  fs(c, K.yel);
  c.fillStyle = K.joint;
  c.fillRect(-4.6, 17.4 - lift, 9.2, 1.6);
  c.restore();
}
function armSide(c: Ctx, sx: number, sy: number, a: number, far: boolean, item: Item) {
  c.save();
  c.translate(sx, sy);
  c.rotate(-a);
  rr(c, -3, -1.5, 6, 11.5, 3);
  fs(c, far ? K.blueD : K.blue);
  if (!far) drawItem(c, item);
  circ(c, 0, 11.6, 3.6);
  fs(c, far ? K.yelD : K.yel);
  c.restore();
}
function armFront(c: Ctx, sx: number, sy: number, a: number, side: number, back: boolean, item: Item) {
  const fwd = a > 1.15 && a < 1.9;
  c.save();
  c.translate(sx, sy);
  if (fwd) {
    c.rotate(side * -0.14);
    if (back) {
      rr(c, -3, -7, 6, 8, 3);
      fs(c, K.blue);
      circ(c, 0, -7.5, 3.4);
      fs(c, K.yel);
    } else {
      rr(c, -3, -1.5, 6, 8, 3);
      fs(c, K.blue);
      drawItem(c, item);
      circ(c, 0, 9.4, 4.6);
      fs(c, K.yel);
    }
  } else {
    const th = a >= 1.9 ? a * 0.97 : 0.14 + Math.abs(a) * 0.3;
    c.rotate(-side * th);
    const len = 11.5 + (back ? -a : a) * (a >= 1.9 ? 0 : 2.2);
    rr(c, -3, -1.5, 6, len, 3);
    fs(c, K.blue);
    if (!back) drawItem(c, item);
    circ(c, 0, len + 0.2, 3.6);
    fs(c, K.yel);
  }
  c.restore();
}
function hat(c: Ctx, y: number, view: 0 | 1 | 2, P: Pose, g: RobiGear) {
  // antenna
  c.strokeStyle = K.joint;
  c.lineWidth = 1.5;
  const ax = 8 + P.ant * 7;
  c.beginPath();
  c.moveTo(3, y - 10);
  c.quadraticCurveTo(3.5, y - 19, ax, y - 19.5);
  c.stroke();
  circ(c, ax, y - 19.5, 3.3);
  fs(c, K.yel, K.line, 1);
  glow(c, ax, y - 19.5, 2);
  // brim + crown
  ell(c, 0, y, 21.5, 6);
  fs(c, K.straw, K.strawD);
  rr(c, -10.8, y - 11.8, 21.6, 13.4, 7);
  fs(c, K.straw, K.strawD);
  c.strokeStyle = K.strawD;
  c.lineWidth = 0.7;
  c.beginPath();
  for (let i = -2; i <= 2; i++) {
    c.moveTo(i * 4, y - 11);
    c.lineTo(i * 4.4, y - 2.5);
  }
  c.moveTo(-19, y + 1);
  c.quadraticCurveTo(0, y + 6.5, 19, y + 1);
  c.stroke();
  // ribbon
  const rib = g.silver ? "#dfe7f2" : K.red;
  rr(c, -10.8, y - 3.6, 21.6, 3.8, 1.2);
  fs(c, rib, null);
  const bx = view === 0 ? 10.5 : view === 1 ? -11 : 0;
  c.fillStyle = rib;
  c.beginPath();
  c.moveTo(bx, y - 1.8);
  c.lineTo(bx - 5, y - 5.5);
  c.lineTo(bx - 5, y + 2);
  c.closePath();
  c.moveTo(bx, y - 1.8);
  c.lineTo(bx + 5, y - 5.5);
  c.lineTo(bx + 5, y + 2);
  c.closePath();
  c.fill();
  if (g.crown) {
    c.beginPath();
    c.moveTo(-7, y - 11);
    c.lineTo(-8, y - 18.5);
    c.lineTo(-3.5, y - 14.5);
    c.lineTo(0, y - 20);
    c.lineTo(3.5, y - 14.5);
    c.lineTo(8, y - 18.5);
    c.lineTo(7, y - 11);
    c.closePath();
    fs(c, "#ffd447", "#a86b00", 1);
    circ(c, 0, y - 13.5, 1.5);
    fs(c, "#e5383b", null);
  }
}

function drawSide(c: Ctx, P: Pose, g: RobiGear) {
  legSide(c, -2, -P.legR * 0.62, true);
  legSide(c, 2, -P.legL * 0.62, false);
  c.save();
  c.translate(0, HIP);
  c.rotate(P.lean);
  c.translate(0, -HIP);
  armSide(c, -1, -33, P.armL, true, null);
  // backpack + shovel
  c.strokeStyle = K.brownD;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-13, -40);
  c.lineTo(-17, -54);
  c.stroke();
  rr(c, -21, -62, 7.5, 9.5, 2.6);
  fs(c, K.steel);
  rr(c, -18.5, -38, 11.5, 19.5, 3.5);
  fs(c, K.brown);
  rr(c, -17.5, -43, 10.5, 6.2, 3);
  fs(c, K.brownL);
  // torso
  rr(c, -8.6, -38, 17.2, 20.5, 7);
  fs(c, K.blue);
  rr(c, -1, -35, 8.6, 12, 3.5);
  fs(c, K.yel, K.yelD, 0.8);
  glow(c, 4.2, -29.5, 2.1);
  c.strokeStyle = K.brownD;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(-6, -37.5);
  c.lineTo(-2.5, -20.5);
  c.stroke();
  // head
  c.save();
  c.translate(1, -46 + P.hy);
  c.rotate(P.head);
  ell(c, 0, 0, 14.5, 12.5);
  fs(c, K.blue);
  c.save();
  ell(c, 0, 0, 14.5, 12.5);
  c.clip();
  c.fillStyle = K.yel;
  c.fillRect(-15, -13, 30, 6.5);
  c.restore();
  circ(c, -3, 1.5, 4.6);
  fs(c, K.yel, K.line, 1);
  circ(c, -3, 1.5, 2.1);
  fs(c, K.blueD, null);
  rr(c, 2.5, -6.5, 13, 13.2, 5);
  fs(c, K.visor);
  eye(c, 9.6, -1.2, P.eyes);
  mouth(c, 10.6, 3.6, P.mouth, 2.1);
  hat(c, -10.5, 1, P, g);
  c.restore();
  armSide(c, 0.5, -33, P.armR, false, P.item);
  c.restore();
}

function drawFrontBack(c: Ctx, P: Pose, g: RobiGear, back: boolean) {
  const drop = P.lean * 4.5;
  if (!back) {
    // backpack edges + shovel behind body
    c.strokeStyle = K.brownD;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(11, -36 + drop);
    c.lineTo(17, -53 + drop);
    c.stroke();
    rr(c, 14, -61 + drop, 7.5, 9.5, 2.6);
    fs(c, K.steel);
    rr(c, -14.5, -38.5 + drop, 29, 19.5, 5);
    fs(c, K.brown);
  }
  legFront(c, -6, back ? P.legR : P.legL);
  legFront(c, 6, back ? P.legL : P.legR);
  c.save();
  c.translate(0, drop);
  c.scale(1, 1 - P.lean * 0.1);
  armFront(c, -12.6, -33, P.armL, -1, back, null);
  armFront(c, 12.6, -33, P.armR, 1, back, back ? null : P.item);
  rr(c, -11, -38, 22, 20.5, 7.5);
  fs(c, K.blue);
  if (!back) {
    rr(c, -7, -35, 14, 12.4, 4);
    fs(c, K.yel, K.yelD, 0.8);
    glow(c, 0, -29.3, 2.5);
    c.strokeStyle = K.brownD;
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-8, -37.5);
    c.lineTo(-10, -22);
    c.moveTo(8, -37.5);
    c.lineTo(10, -22);
    c.stroke();
  } else {
    c.strokeStyle = K.brownD;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(9, -30);
    c.lineTo(15, -52);
    c.stroke();
    rr(c, 12, -60, 7.5, 9.5, 2.6);
    fs(c, K.steel);
    rr(c, -11.5, -39, 23, 20.5, 5);
    fs(c, K.brown);
    rr(c, -11.5, -39, 23, 8, 4);
    fs(c, K.brownL);
    rr(c, -5.5, -28, 11, 7.5, 2);
    fs(c, K.brownL, K.brownD, 0.9);
    c.fillStyle = K.yel;
    c.fillRect(-1.2, -32.5, 2.4, 3);
    rr(c, -12.5, -43.5, 25, 6.4, 3.2);
    fs(c, "#d9a65e");
    rr(c, -17, -33, 6.5, 8, 2);
    fs(c, "#3fae6b");
  }
  c.restore();
  c.save();
  c.translate(0, -46 + P.hy + drop * 1.9);
  c.rotate(P.head);
  ell(c, 0, 0, 15.5, 13);
  fs(c, K.blue);
  c.save();
  ell(c, 0, 0, 15.5, 13);
  c.clip();
  c.fillStyle = K.yel;
  c.fillRect(-16, -13.5, 32, 6.6);
  if (back) c.fillRect(-16, 0, 32, 3.6);
  c.restore();
  for (const sx of [-15.2, 15.2]) {
    circ(c, sx, 1, 4.2);
    fs(c, K.yel, K.line, 1);
  }
  if (!back) {
    rr(c, -11.5, -7, 23, 14.2, 6);
    fs(c, K.visor);
    c.save();
    c.globalAlpha = 0.14;
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(-9, -5.5);
    c.lineTo(-4, -5.5);
    c.lineTo(-8, 3);
    c.lineTo(-10.5, 3);
    c.closePath();
    c.fill();
    c.restore();
    eye(c, -5.3, -1.4, P.eyes);
    eye(c, 5.3, -1.4, P.eyes);
    mouth(c, 0, 3.8, P.mouth, 2.6);
  } else {
    c.strokeStyle = K.blueD;
    c.lineWidth = 1.2;
    c.beginPath();
    for (let i = -1; i <= 1; i++) {
      c.moveTo(i * 4, 6);
      c.lineTo(i * 4, 9.5);
    }
    c.stroke();
  }
  hat(c, -10.5, back ? 2 : 0, P, g);
  c.restore();
}

/** Draw ROBI with feet at (x, y). `t` = seconds in current animation, `p` = 0..1 progress of one-shot animations. */
export function drawRobi(c: Ctx, x: number, y: number, dir: Dir, anim: RobiAnim, t: number, p: number, gear: RobiGear = {}, scale = 0.92) {
  const P = robiPose(anim, t, p);
  c.save();
  c.lineJoin = "round";
  c.translate(x, y + P.y * scale);
  c.scale(scale, scale);
  if (P.rot) {
    c.translate(0, -20);
    c.rotate(dir === "left" ? -P.rot : P.rot);
    c.translate(0, 20);
  }
  c.scale(P.sx, P.sy);
  if (dir === "left") c.scale(-1, 1);
  if (dir === "left" || dir === "right") drawSide(c, P, gear);
  else drawFrontBack(c, P, gear, dir === "up");
  c.restore();
}
