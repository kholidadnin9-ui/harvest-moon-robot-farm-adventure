export type Rarity = "common" | "rare" | "epic" | "legendary";
export type CardCategory = "vegetable" | "animal" | "treasure" | "mystery";
export type LocationId = "valley" | "garden" | "animal" | "meadow" | "forest" | "river";
export type CropId = "carrot" | "tomato" | "corn" | "strawberry" | "pumpkin";
export type AnimalId = "chicken" | "goat" | "sheep" | "cow";
export type ProduceId =
  | "egg"
  | "milk"
  | "goatmilk"
  | "wool"
  | "apple"
  | "fish"
  | "flower"
  | "mushroom"
  | CropId;

export type StatKey =
  | "planted"
  | "watered"
  | "harvested"
  | "fed"
  | "eggs"
  | "milk"
  | "wool"
  | "products"
  | "cards"
  | "vegCards"
  | "animalCards"
  | "treasureCards"
  | "mysteryCards"
  | "rarePlus"
  | "epicPlus"
  | "legendary"
  | "forestFinds"
  | "fish"
  | "flowers"
  | "fruits"
  | "mushrooms"
  | "coinsEarned"
  | "pickups"
  | "dailyDone"
  | "hiddenFound"
  | "unique"
  | "mazes"
  | "chests"
  | "maze1"
  | "maze2"
  | "maze3";

export interface CardDef {
  id: string;
  name: string;
  category: CardCategory;
  rarity: Rarity;
  points: number;
  image: string | null;
  emoji: string;
  desc: string;
  tint?: string;
  special?: boolean;
}

export interface CropDef {
  id: CropId;
  name: string;
  emoji: string;
  growTime: number;
  seedPrice: number;
  points: number;
  coins: number;
  image: string;
}

export interface ProduceDef {
  id: ProduceId;
  name: string;
  emoji: string;
  points: number;
  sell: number;
}

export interface AnimalDef {
  id: AnimalId;
  name: string;
  image: string;
  produce: ProduceId;
  time: number;
  x: number;
  size: number;
  wander: number;
  speed: number;
}

export type ParticleKind = "leaves" | "petals" | "fireflies" | "sparkles" | "butterflies" | "hay";

export interface LocationDef {
  id: LocationId;
  name: string;
  subtitle: string;
  desc: string;
  bg: string;
  unlockLevel: number;
  ground: number;
  particles: ParticleKind;
  icon: string;
  pool: Record<string, number>;
  minX: number;
  maxX: number;
}

export interface MissionDef {
  id: string;
  level: number;
  title: string;
  desc: string;
  stat: StatKey;
  target: number;
  points: number;
  coins: number;
}

export interface LevelDef {
  level: number;
  name: string;
  subtitle: string;
  target: number;
  desc: string;
  unlocks: LocationId[];
  focus: LocationId;
  emoji: string;
  unlockText?: string;
}

export interface UnlockDef {
  id: string;
  name: string;
  type: "decor" | "gear";
  emoji: string;
  desc: string;
}

export interface RewardDef {
  id: string;
  points: number;
  title: string;
  emoji: string;
  color: string;
  unlocks: UnlockDef[];
}

export interface DailyDef {
  id: string;
  title: string;
  stat: StatKey;
  target: number;
  points: number;
  coins: number;
  needs?: LocationId;
}

export interface Plot {
  crop: CropId | null;
  progress: number;
  watered: boolean;
  stage: number;
}

export interface AnimalState {
  id: AnimalId;
  fed: boolean;
  progress: number;
  ready: boolean;
}

export interface HiddenObject {
  id: string;
  x: number;
  y: number;
}

export interface Regrow {
  ready: boolean;
  progress: number;
}

export interface MysteryOutcome {
  kind: "points" | "coins" | "item" | "card";
  label: string;
  card?: CardDef;
  item?: "seeds" | "lantern";
}

export interface DrawResult {
  card: CardDef;
  points: number;
  coins: number;
  mystery?: MysteryOutcome;
}

export interface WorldState {
  x: number;
  y: number;
  explored: string;
  opened: string[];
  keys: Record<string, number>;
  mazes: Record<string, { done: boolean; best: number; runs: number }>;
}

export interface GameState {
  version: number;
  started: boolean;
  points: number;
  coins: number;
  level: number;
  completedLevels: number[];
  stats: Record<StatKey, number>;
  baseline: Record<StatKey, number>;
  daily: { date: string; stats: Record<StatKey, number>; claimed: string[] };
  collection: Record<string, number>;
  log: { id: string; at: number; loc: LocationId }[];
  inventory: {
    seeds: Record<CropId, number>;
    feed: number;
    lanterns: number;
    produce: Partial<Record<ProduceId, number>>;
  };
  plots: Plot[];
  animals: AnimalState[];
  hidden: Record<LocationId, HiddenObject[]>;
  hiddenTimer: Record<LocationId, number>;
  trees: Regrow[];
  flowers: Regrow[];
  mushrooms: Regrow[];
  hay: Regrow;
  claimed: string[];
  equipped: string[];
  sound: boolean;
  location: LocationId;
  playTime: number;
  tutorialSeen: boolean;
  world: WorldState;
}
