import {
  ANIMALS,
  CARDS,
  CARD_MAP,
  CROPS,
  CROP_ORDER,
  DAILIES,
  FEED_PRICE,
  FISH,
  FLOWER_REGROW,
  HAY_REGROW,
  HIDDEN_MAX,
  HIDDEN_RESPAWN,
  LANTERN_PRICE,
  LEVELS,
  LOCATIONS,
  LOCATION_ORDER,
  MISSIONS,
  MUSHROOM_REGROW,
  PRODUCE,
  RARITY,
  REWARDS,
  SAVE_VERSION,
  TREE_REGROW,
  type FishSize,
} from "./data";
import { MAZES, SPAWN_SPOTS } from "@/engine/world";
import type {
  AnimalId,
  CardDef,
  CropId,
  DailyDef,
  DrawResult,
  GameState,
  HiddenObject,
  LocationId,
  MissionDef,
  ProduceId,
  StatKey,
} from "./types";

export const STAT_KEYS: StatKey[] = [
  "planted", "watered", "harvested", "fed", "eggs", "milk", "wool", "products", "cards", "vegCards",
  "animalCards", "treasureCards", "mysteryCards", "rarePlus", "epicPlus", "legendary", "forestFinds",
  "fish", "flowers", "fruits", "mushrooms", "coinsEarned", "pickups", "dailyDone", "hiddenFound", "unique", "mazes", "chests", "maze1", "maze2", "maze3",
];

export function emptyStats(): Record<StatKey, number> {
  const s = {} as Record<StatKey, number>;
  STAT_KEYS.forEach((k) => (s[k] = 0));
  return s;
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function makeHidden(loc: LocationId, taken: HiddenObject[] = []): HiddenObject {
  const spots = SPAWN_SPOTS[loc];
  let s = spots[Math.floor(Math.random() * spots.length)];
  for (let k = 0; k < 14; k++) {
    const c = spots[Math.floor(Math.random() * spots.length)];
    s = c;
    if (!taken.some((h) => Math.abs(h.x - c[0]) + Math.abs(h.y - c[1]) < 7)) break;
  }
  return { id: uid(), x: s[0], y: s[1] };
}

export function resultForCard(id: string): DrawResult {
  const card = CARD_MAP[id];
  return { card, points: card.points, coins: Math.max(1, Math.round(card.points / 5)) };
}

function regrow(n: number) {
  return Array.from({ length: n }, () => ({ ready: true, progress: 0 }));
}

export function initialState(): GameState {
  const hidden = {} as Record<LocationId, HiddenObject[]>;
  const hiddenTimer = {} as Record<LocationId, number>;
  LOCATION_ORDER.forEach((l) => {
    const first = makeHidden(l);
    hidden[l] = [first, makeHidden(l, [first])];
    hiddenTimer[l] = 0;
  });
  return {
    version: SAVE_VERSION,
    started: false,
    points: 0,
    coins: 25,
    level: 1,
    completedLevels: [],
    stats: emptyStats(),
    baseline: emptyStats(),
    daily: { date: todayKey(), stats: emptyStats(), claimed: [] },
    collection: {},
    log: [],
    inventory: {
      seeds: { carrot: 3, tomato: 2, corn: 0, strawberry: 0, pumpkin: 0 },
      feed: 4,
      lanterns: 1,
      produce: {},
    },
    plots: Array.from({ length: 6 }, () => ({ crop: null, progress: 0, watered: false, stage: 0 })),
    animals: ANIMALS.map((a) => ({ id: a.id, fed: false, progress: 0, ready: false })),
    hidden,
    hiddenTimer,
    trees: regrow(3),
    flowers: regrow(8),
    mushrooms: regrow(4),
    hay: { ready: true, progress: 0 },
    claimed: [],
    equipped: [],
    sound: true,
    location: "valley",
    playTime: 0,
    tutorialSeen: false,
    world: { x: 0, y: 0, explored: "", opened: [], keys: {}, mazes: {} },
  };
}

export function unlockedLocations(level: number): LocationId[] {
  return LOCATION_ORDER.filter((l) => LOCATIONS[l].unlockLevel <= level);
}

export function isUnlocked(state: GameState, loc: LocationId): boolean {
  return LOCATIONS[loc].unlockLevel <= state.level;
}

export function levelMissions(level: number): MissionDef[] {
  return MISSIONS.filter((m) => m.level === level);
}

export function missionProgress(state: GameState, m: MissionDef): number {
  if (m.stat === "unique") return Object.keys(state.collection).length;
  if (m.stat === "maze1" || m.stat === "maze2" || m.stat === "maze3") return state.world.mazes["m" + m.stat.slice(4)]?.done ? 1 : 0;
  return Math.max(0, (state.stats[m.stat] || 0) - (state.baseline[m.stat] || 0));
}

export function currentLevel(state: GameState) {
  return LEVELS[Math.min(5, Math.max(1, state.level)) - 1];
}

export function canLevelUp(state: GameState): boolean {
  if (state.completedLevels.includes(state.level)) return false;
  const lvl = currentLevel(state);
  if (state.points < lvl.target) return false;
  return levelMissions(state.level).every((m) => state.claimed.includes(m.id));
}

export function rewardTier(points: number) {
  let tier = null as (typeof REWARDS)[number] | null;
  for (const r of REWARDS) if (points >= r.points) tier = r;
  return tier;
}

export function nextReward(points: number) {
  return REWARDS.find((r) => points < r.points) || null;
}

export function unlockedGear(state: GameState): string[] {
  return REWARDS.filter((r) => state.points >= r.points).flatMap((r) => r.unlocks.map((u) => u.id));
}

export function luckOf(state: GameState): number {
  return 0.15 * (state.level - 1) + (state.equipped.includes("gear_lucky") ? 0.3 : 0);
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailies(state: GameState): DailyDef[] {
  const feasible = DAILIES.filter((d) => !d.needs || isUnlocked(state, d.needs));
  const seed = hashStr(todayKey());
  const arr = [...feasible];
  // deterministic shuffle
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 3);
}

export function dailyProgress(state: GameState, d: DailyDef): number {
  if (state.daily.date !== todayKey()) return 0;
  return state.daily.stats[d.stat] || 0;
}

function weightedPick<T>(items: { item: T; weight: number }[]): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.item;
  }
  return items[items.length - 1].item;
}

export function drawCard(loc: LocationId, luck: number): DrawResult {
  const pool = LOCATIONS[loc].pool;
  const entries = Object.entries(pool).map(([id, w]) => {
    const c = CARD_MAP[id];
    let weight = w;
    if (c.rarity === "epic") weight *= 1 + luck;
    if (c.rarity === "legendary") weight *= 1 + luck * 1.5;
    return { item: c, weight };
  });
  const card = weightedPick(entries);
  if (card.id !== "mystery") {
    return { card, points: card.points, coins: Math.max(1, Math.round(card.points / 5)) };
  }
  const r = Math.random();
  if (r < 0.42) {
    const pts = 5 + Math.floor(Math.random() * 56);
    return { card, points: pts, coins: 0, mystery: { kind: "points", label: `Poin kejutan! +${pts} poin` } };
  }
  if (r < 0.65) {
    const c = 10 + Math.floor(Math.random() * 31);
    return { card, points: 10, coins: c, mystery: { kind: "coins", label: `Hadiah spesial: +${c} koin!` } };
  }
  if (r < 0.82) {
    const item = Math.random() < 0.6 ? "seeds" : "lantern";
    return {
      card,
      points: 10,
      coins: 0,
      mystery: {
        kind: "item",
        item,
        label: item === "seeds" ? "Paket bibit spesial! +3 bibit acak" : "Lentera Ajaib! Gunakan untuk memunculkan benda tersembunyi",
      },
    };
  }
  const rr = Math.random();
  const rarity = rr < 0.5 ? "rare" : rr < 0.82 ? "epic" : "legendary";
  const cands = CARDS.filter((c) => c.rarity === rarity && c.category !== "mystery");
  const bonus = cands[Math.floor(Math.random() * cands.length)];
  return { card, points: bonus.points, coins: 5, mystery: { kind: "card", card: bonus, label: `Kartu langka muncul: ${bonus.name}!` } };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: "START" }
  | { type: "RESET" }
  | { type: "TICK"; dt: number }
  | { type: "GO"; loc: LocationId }
  | { type: "PLANT"; plot: number; crop: CropId }
  | { type: "WATER"; plot: number }
  | { type: "HARVEST"; plot: number }
  | { type: "FEED"; animal: AnimalId }
  | { type: "COLLECT"; animal: AnimalId }
  | { type: "CARD_FOUND"; result: DrawResult; loc: LocationId; hiddenId?: string; worldId?: string }
  | { type: "WORLD_SYNC"; x: number; y: number; explored?: string }
  | { type: "WORLD_OPEN"; ids: string[] }
  | { type: "KEY_PICK"; id: string; maze: string }
  | { type: "KEY_USE"; id: string; maze: string }
  | { type: "MAZE_DONE"; maze: string; time: number }
  | { type: "PICK_FLOWER"; idx: number }
  | { type: "PICK_MUSHROOM"; idx: number }
  | { type: "PICK_FRUIT"; idx: number }
  | { type: "TAKE_HAY" }
  | { type: "FISH"; size: FishSize }
  | { type: "PICKUP"; kind: "coin" | "star" }
  | { type: "BUY"; item: "seed" | "feed" | "lantern"; crop?: CropId }
  | { type: "SELL"; produce: ProduceId; qty: number }
  | { type: "CLAIM_MISSION"; id: string }
  | { type: "CLAIM_DAILY"; id: string }
  | { type: "LEVEL_UP" }
  | { type: "TOGGLE_SOUND" }
  | { type: "TOGGLE_EQUIP"; id: string }
  | { type: "TUTORIAL_SEEN" }
  | { type: "USE_LANTERN"; loc: LocationId };

function freshDaily(s: GameState) {
  return s.daily.date === todayKey() ? s.daily : { date: todayKey(), stats: emptyStats(), claimed: [] };
}

function bump(s: GameState, key: StatKey, n = 1): GameState {
  const d = freshDaily(s);
  return {
    ...s,
    stats: { ...s.stats, [key]: (s.stats[key] || 0) + n },
    daily: { ...d, stats: { ...d.stats, [key]: (d.stats[key] || 0) + n } },
  };
}

function addPoints(s: GameState, n: number): GameState {
  return { ...s, points: s.points + n };
}

function addCoins(s: GameState, n: number): GameState {
  let r: GameState = { ...s, coins: Math.max(0, s.coins + n) };
  if (n > 0) r = bump(r, "coinsEarned", n);
  return r;
}

function addProduce(s: GameState, id: ProduceId, n = 1): GameState {
  return {
    ...s,
    inventory: { ...s.inventory, produce: { ...s.inventory.produce, [id]: (s.inventory.produce[id] || 0) + n } },
  };
}

const CAT_STAT: Record<CardDef["category"], StatKey> = {
  vegetable: "vegCards",
  animal: "animalCards",
  treasure: "treasureCards",
  mystery: "mysteryCards",
};

function addCard(s: GameState, card: CardDef, loc: LocationId): GameState {
  let r: GameState = {
    ...s,
    collection: { ...s.collection, [card.id]: (s.collection[card.id] || 0) + 1 },
    log: [{ id: card.id, at: Date.now(), loc }, ...s.log].slice(0, 40),
  };
  r = bump(r, "cards");
  r = bump(r, CAT_STAT[card.category]);
  if (card.category !== "mystery") {
    const order = RARITY[card.rarity].order;
    if (order >= 1) r = bump(r, "rarePlus");
    if (order >= 2) r = bump(r, "epicPlus");
    if (order >= 3) r = bump(r, "legendary");
  }
  return r;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START":
      return { ...state, started: true };
    case "RESET":
      return { ...initialState(), started: true, sound: state.sound };
    case "TICK": {
      const dt = action.dt;
      let s: GameState = { ...state, playTime: state.playTime + dt, daily: freshDaily(state) };
      s.plots = s.plots.map((p) => {
        if (!p.crop || p.stage >= 3 || !p.watered) return p;
        const def = CROPS[p.crop];
        const progress = p.progress + dt;
        const t = progress / def.growTime;
        const stage = t >= 1 ? 3 : t >= 0.66 ? 2 : t >= 0.33 ? 1 : 0;
        let watered: boolean = p.watered;
        if (stage > p.stage && stage === 2) watered = false;
        return { ...p, progress, stage, watered: stage >= 3 ? true : watered };
      });
      s.animals = s.animals.map((a) => {
        if (!a.fed || a.ready) return a;
        const def = ANIMALS.find((d) => d.id === a.id)!;
        const progress = a.progress + dt;
        return { ...a, progress, ready: progress >= def.time };
      });
      const hidden = { ...s.hidden };
      const hiddenTimer = { ...s.hiddenTimer };
      for (const loc of LOCATION_ORDER) {
        if (hidden[loc].length >= HIDDEN_MAX) {
          hiddenTimer[loc] = 0;
          continue;
        }
        hiddenTimer[loc] = (hiddenTimer[loc] || 0) + dt;
        if (hiddenTimer[loc] >= HIDDEN_RESPAWN) {
          hidden[loc] = [...hidden[loc], makeHidden(loc, hidden[loc])];
          hiddenTimer[loc] = 0;
        }
      }
      s.hidden = hidden;
      s.hiddenTimer = hiddenTimer;
      const grow = (arr: { ready: boolean; progress: number }[], time: number) =>
        arr.map((r) => (r.ready ? r : { ready: r.progress + dt >= time, progress: r.progress + dt }));
      s.trees = grow(s.trees, TREE_REGROW);
      s.flowers = grow(s.flowers, FLOWER_REGROW);
      s.mushrooms = grow(s.mushrooms, MUSHROOM_REGROW);
      s.hay = grow([s.hay], HAY_REGROW)[0];
      return s;
    }
    case "GO":
      if (!isUnlocked(state, action.loc)) return state;
      return { ...state, location: action.loc };
    case "PLANT": {
      const p = state.plots[action.plot];
      if (!p || p.crop || state.inventory.seeds[action.crop] <= 0) return state;
      let s: GameState = {
        ...state,
        inventory: { ...state.inventory, seeds: { ...state.inventory.seeds, [action.crop]: state.inventory.seeds[action.crop] - 1 } },
        plots: state.plots.map((pl, i) => (i === action.plot ? { crop: action.crop, progress: 0, watered: false, stage: 0 } : pl)),
      };
      s = bump(s, "planted");
      return addPoints(s, 2);
    }
    case "WATER": {
      const p = state.plots[action.plot];
      if (!p || !p.crop || p.watered || p.stage >= 3) return state;
      let s: GameState = { ...state, plots: state.plots.map((pl, i) => (i === action.plot ? { ...pl, watered: true } : pl)) };
      s = bump(s, "watered");
      return addPoints(s, 3);
    }
    case "HARVEST": {
      const p = state.plots[action.plot];
      if (!p || !p.crop || p.stage < 3) return state;
      const def = CROPS[p.crop];
      let s: GameState = { ...state, plots: state.plots.map((pl, i) => (i === action.plot ? { crop: null, progress: 0, watered: false, stage: 0 } : pl)) };
      s = addProduce(s, p.crop);
      s = bump(s, "harvested");
      s = addPoints(s, def.points);
      return addCoins(s, def.coins);
    }
    case "FEED": {
      const a = state.animals.find((x) => x.id === action.animal);
      if (!a || a.fed || state.inventory.feed <= 0) return state;
      let s: GameState = {
        ...state,
        inventory: { ...state.inventory, feed: state.inventory.feed - 1 },
        animals: state.animals.map((x) => (x.id === action.animal ? { ...x, fed: true, progress: 0, ready: false } : x)),
      };
      s = bump(s, "fed");
      return addPoints(s, 3);
    }
    case "COLLECT": {
      const a = state.animals.find((x) => x.id === action.animal);
      if (!a || !a.ready) return state;
      const def = ANIMALS.find((d) => d.id === action.animal)!;
      const prod = PRODUCE[def.produce];
      let s: GameState = {
        ...state,
        animals: state.animals.map((x) => (x.id === action.animal ? { ...x, fed: false, progress: 0, ready: false } : x)),
      };
      s = addProduce(s, def.produce);
      s = bump(s, "products");
      if (def.produce === "egg") s = bump(s, "eggs");
      if (def.produce === "milk" || def.produce === "goatmilk") s = bump(s, "milk");
      if (def.produce === "wool") s = bump(s, "wool");
      s = addPoints(s, prod.points);
      return addCoins(s, Math.round(prod.sell / 2));
    }
    case "CARD_FOUND": {
      const { result, loc, hiddenId, worldId } = action;
      let s: GameState = state;
      if (worldId) {
        if (state.world.opened.includes(worldId)) return state;
        s = { ...s, world: { ...s.world, opened: [...s.world.opened, worldId] } };
        s = bump(s, "hiddenFound");
        s = bump(s, "chests");
        if (loc === "forest") s = bump(s, "forestFinds");
      }
      if (hiddenId) {
        if (!state.hidden[loc].some((h) => h.id === hiddenId)) return state;
        s = { ...s, hidden: { ...s.hidden, [loc]: s.hidden[loc].filter((h) => h.id !== hiddenId) } };
        s = bump(s, "hiddenFound");
        if (loc === "forest") s = bump(s, "forestFinds");
      }
      s = addCard(s, result.card, loc);
      if (result.mystery?.card) s = addCard(s, result.mystery.card, loc);
      if (result.mystery?.kind === "item") {
        if (result.mystery.item === "seeds") {
          const seeds = { ...s.inventory.seeds };
          for (let i = 0; i < 3; i++) {
            const c = CROP_ORDER[Math.floor(Math.random() * CROP_ORDER.length)];
            seeds[c] += 1;
          }
          s = { ...s, inventory: { ...s.inventory, seeds } };
        } else {
          s = { ...s, inventory: { ...s.inventory, lanterns: s.inventory.lanterns + 1 } };
        }
      }
      s = addPoints(s, result.points);
      if (result.coins) s = addCoins(s, result.coins);
      return s;
    }
    case "PICK_FLOWER": {
      const f = state.flowers[action.idx];
      if (!f || !f.ready) return state;
      let s: GameState = { ...state, flowers: state.flowers.map((x, i) => (i === action.idx ? { ready: false, progress: 0 } : x)) };
      s = addProduce(s, "flower");
      s = bump(s, "flowers");
      s = addPoints(s, PRODUCE.flower.points);
      return addCoins(s, 1);
    }
    case "PICK_MUSHROOM": {
      const f = state.mushrooms[action.idx];
      if (!f || !f.ready) return state;
      let s: GameState = { ...state, mushrooms: state.mushrooms.map((x, i) => (i === action.idx ? { ready: false, progress: 0 } : x)) };
      s = addProduce(s, "mushroom");
      s = bump(s, "mushrooms");
      s = addPoints(s, PRODUCE.mushroom.points);
      return addCoins(s, 2);
    }
    case "PICK_FRUIT": {
      const f = state.trees[action.idx];
      if (!f || !f.ready) return state;
      let s: GameState = { ...state, trees: state.trees.map((x, i) => (i === action.idx ? { ready: false, progress: 0 } : x)) };
      s = addProduce(s, "apple", 2);
      s = bump(s, "fruits");
      s = addPoints(s, PRODUCE.apple.points);
      return addCoins(s, 4);
    }
    case "TAKE_HAY": {
      if (!state.hay.ready) return state;
      const s: GameState = { ...state, hay: { ready: false, progress: 0 }, inventory: { ...state.inventory, feed: state.inventory.feed + 2 } };
      return addPoints(s, 2);
    }
    case "FISH": {
      const f = FISH[action.size];
      let s: GameState = addProduce(state, "fish");
      s = bump(s, "fish");
      s = addPoints(s, f.points);
      return addCoins(s, f.coins);
    }
    case "PICKUP": {
      let s = bump(state, "pickups");
      if (action.kind === "coin") {
        s = addCoins(s, 2);
        return addPoints(s, 1);
      }
      return addPoints(s, 5);
    }
    case "BUY": {
      if (action.item === "seed" && action.crop) {
        const price = CROPS[action.crop].seedPrice;
        if (state.coins < price) return state;
        return {
          ...state,
          coins: state.coins - price,
          inventory: { ...state.inventory, seeds: { ...state.inventory.seeds, [action.crop]: state.inventory.seeds[action.crop] + 1 } },
        };
      }
      if (action.item === "feed") {
        if (state.coins < FEED_PRICE) return state;
        return { ...state, coins: state.coins - FEED_PRICE, inventory: { ...state.inventory, feed: state.inventory.feed + 1 } };
      }
      if (action.item === "lantern") {
        if (state.coins < LANTERN_PRICE) return state;
        return { ...state, coins: state.coins - LANTERN_PRICE, inventory: { ...state.inventory, lanterns: state.inventory.lanterns + 1 } };
      }
      return state;
    }
    case "SELL": {
      const have = state.inventory.produce[action.produce] || 0;
      const qty = Math.min(have, action.qty);
      if (qty <= 0) return state;
      const s: GameState = {
        ...state,
        inventory: { ...state.inventory, produce: { ...state.inventory.produce, [action.produce]: have - qty } },
      };
      return addCoins(s, PRODUCE[action.produce].sell * qty);
    }
    case "CLAIM_MISSION": {
      const m = MISSIONS.find((x) => x.id === action.id);
      if (!m || state.claimed.includes(m.id) || missionProgress(state, m) < m.target) return state;
      let s: GameState = { ...state, claimed: [...state.claimed, m.id] };
      s = addPoints(s, m.points);
      return addCoins(s, m.coins);
    }
    case "CLAIM_DAILY": {
      const d = DAILIES.find((x) => x.id === action.id);
      if (!d) return state;
      const daily = freshDaily(state);
      if (daily.claimed.includes(d.id) || (daily.stats[d.stat] || 0) < d.target) return state;
      let s: GameState = { ...state, daily: { ...daily, claimed: [...daily.claimed, d.id] } };
      s = bump(s, "dailyDone");
      s = addPoints(s, d.points);
      return addCoins(s, d.coins);
    }
    case "LEVEL_UP": {
      if (!canLevelUp(state)) return state;
      const done = [...state.completedLevels, state.level];
      const isFinal = state.level >= 5;
      const s: GameState = {
        ...state,
        completedLevels: done,
        level: isFinal ? 5 : state.level + 1,
        baseline: isFinal ? state.baseline : { ...state.stats },
      };
      return addCoins(s, 40 * state.level);
    }
    case "TOGGLE_SOUND":
      return { ...state, sound: !state.sound };
    case "TOGGLE_EQUIP":
      return {
        ...state,
        equipped: state.equipped.includes(action.id) ? state.equipped.filter((x) => x !== action.id) : [...state.equipped, action.id],
      };
    case "TUTORIAL_SEEN":
      return { ...state, tutorialSeen: true };
    case "USE_LANTERN": {
      if (state.inventory.lanterns <= 0) return state;
      const cur = state.hidden[action.loc];
      if (cur.length >= HIDDEN_MAX) return state;
      const add = [makeHidden(action.loc, cur)];
      if (cur.length + 1 < HIDDEN_MAX) add.push(makeHidden(action.loc, [...cur, ...add]));
      return {
        ...state,
        inventory: { ...state.inventory, lanterns: state.inventory.lanterns - 1 },
        hidden: { ...state.hidden, [action.loc]: [...cur, ...add] },
      };
    }
    case "WORLD_SYNC":
      return { ...state, world: { ...state.world, x: action.x, y: action.y, explored: action.explored ?? state.world.explored } };
    case "WORLD_OPEN": {
      const add = action.ids.filter((id) => !state.world.opened.includes(id));
      if (!add.length) return state;
      return { ...state, world: { ...state.world, opened: [...state.world.opened, ...add] } };
    }
    case "KEY_PICK": {
      if (state.world.opened.includes(action.id)) return state;
      const s: GameState = {
        ...state,
        world: { ...state.world, opened: [...state.world.opened, action.id], keys: { ...state.world.keys, [action.maze]: (state.world.keys[action.maze] || 0) + 1 } },
      };
      return addPoints(s, 5);
    }
    case "KEY_USE": {
      const have = state.world.keys[action.maze] || 0;
      if (have <= 0 || state.world.opened.includes(action.id)) return state;
      return { ...state, world: { ...state.world, opened: [...state.world.opened, action.id], keys: { ...state.world.keys, [action.maze]: have - 1 } } };
    }
    case "MAZE_DONE": {
      const info = MAZES.find((m) => m.id === action.maze);
      if (!info) return state;
      const prev = state.world.mazes[info.id];
      const first = !prev?.done;
      let s: GameState = {
        ...state,
        world: {
          ...state.world,
          mazes: { ...state.world.mazes, [info.id]: { done: true, best: prev?.best ? Math.min(prev.best, action.time) : action.time, runs: (prev?.runs || 0) + 1 } },
        },
      };
      s = bump(s, "mazes");
      if (first) {
        const special = CARD_MAP[info.special];
        s = addCard(s, special, info.loc);
        s = addPoints(s, info.reward + special.points);
        return addCoins(s, Math.round(info.reward / 5));
      }
      return addPoints(s, Math.round(info.reward * 0.1));
    }
    default:
      return state;
  }
}
