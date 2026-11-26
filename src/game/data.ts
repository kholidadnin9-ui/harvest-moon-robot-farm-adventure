import type {
  AnimalDef,
  CardCategory,
  CardDef,
  CropDef,
  CropId,
  DailyDef,
  LevelDef,
  LocationDef,
  LocationId,
  MissionDef,
  ProduceDef,
  ProduceId,
  Rarity,
  RewardDef,
} from "./types";

import bgValley from "@/assets/bg-valley.webp";
import bgGarden from "@/assets/bg-garden.webp";
import bgAnimal from "@/assets/bg-animal.webp";
import bgMeadow from "@/assets/bg-meadow.webp";
import bgForest from "@/assets/bg-forest.webp";
import bgRiver from "@/assets/bg-river.webp";
import imgCarrot from "@/assets/item-carrot.webp";
import imgTomato from "@/assets/item-tomato.webp";
import imgCorn from "@/assets/item-corn.webp";
import imgStrawberry from "@/assets/item-strawberry.webp";
import imgPumpkin from "@/assets/item-pumpkin.webp";
import imgChicken from "@/assets/item-chicken.webp";
import imgGoat from "@/assets/item-goat.webp";
import imgSheep from "@/assets/item-sheep.webp";
import imgCow from "@/assets/item-cow.webp";
import imgCoin from "@/assets/item-coin.webp";
import imgGem from "@/assets/item-gem.webp";
import imgStar from "@/assets/item-star.webp";
import imgCrystal from "@/assets/item-crystal.webp";
import robiImg from "@/assets/robi.webp";

export const ROBI_IMG = robiImg;
export const SAVE_KEY = "robot-farm-adventure-save-v2";
export const SAVE_VERSION = 2;

export const HIDDEN_MAX = 3;
export const HIDDEN_RESPAWN = 16;
export const TREE_REGROW = 35;
export const FLOWER_REGROW = 25;
export const MUSHROOM_REGROW = 30;
export const HAY_REGROW = 20;
export const FEED_PRICE = 3;
export const LANTERN_PRICE = 15;

export const RARITY: Record<
  Rarity,
  { label: string; order: number; color: string; from: string; to: string; glow: string; text: string }
> = {
  common: {
    label: "Common",
    order: 0,
    color: "#94a3b8",
    from: "#e2e8f0",
    to: "#94a3b8",
    glow: "rgba(148,163,184,0.55)",
    text: "#334155",
  },
  rare: {
    label: "Rare",
    order: 1,
    color: "#38bdf8",
    from: "#7dd3fc",
    to: "#2563eb",
    glow: "rgba(56,189,248,0.75)",
    text: "#0c4a6e",
  },
  epic: {
    label: "Epic",
    order: 2,
    color: "#c084fc",
    from: "#e9d5ff",
    to: "#7e22ce",
    glow: "rgba(192,132,252,0.8)",
    text: "#581c87",
  },
  legendary: {
    label: "Legendary",
    order: 3,
    color: "#fbbf24",
    from: "#fde68a",
    to: "#d97706",
    glow: "rgba(251,191,36,0.9)",
    text: "#78350f",
  },
};

export const CATEGORY: Record<CardCategory, { label: string; emoji: string; color: string }> = {
  vegetable: { label: "Vegetable Card", emoji: "🥕", color: "#16a34a" },
  animal: { label: "Animal Card", emoji: "🐄", color: "#d97706" },
  treasure: { label: "Treasure Card", emoji: "💎", color: "#9333ea" },
  mystery: { label: "Mystery Card", emoji: "❓", color: "#db2777" },
};

export const CARDS: CardDef[] = [
  { id: "carrot", name: "Wortel", category: "vegetable", rarity: "common", points: 10, image: imgCarrot, emoji: "🥕", desc: "Wortel renyah kesukaan para kelinci di Green Valley." },
  { id: "tomato", name: "Tomat", category: "vegetable", rarity: "common", points: 15, image: imgTomato, emoji: "🍅", desc: "Tomat merah ranum yang manis dan segar." },
  { id: "corn", name: "Jagung", category: "vegetable", rarity: "common", points: 20, image: imgCorn, emoji: "🌽", desc: "Jagung manis keemasan hasil kebun terbaik." },
  { id: "strawberry", name: "Stroberi", category: "vegetable", rarity: "rare", points: 25, image: imgStrawberry, emoji: "🍓", desc: "Stroberi merah berkilau, buah favorit di festival panen." },
  { id: "pumpkin", name: "Labu", category: "vegetable", rarity: "rare", points: 30, image: imgPumpkin, emoji: "🎃", desc: "Labu raksasa yang hanya tumbuh di tanah ajaib." },
  { id: "chicken", name: "Ayam", category: "animal", rarity: "common", points: 10, image: imgChicken, emoji: "🐔", desc: "Ayam petelur yang rajin bangun pagi." },
  { id: "goat", name: "Kambing", category: "animal", rarity: "common", points: 15, image: imgGoat, emoji: "🐐", desc: "Kambing lincah penghasil susu segar." },
  { id: "sheep", name: "Domba", category: "animal", rarity: "rare", points: 20, image: imgSheep, emoji: "🐑", desc: "Domba berbulu lembut selembut awan." },
  { id: "cow", name: "Sapi", category: "animal", rarity: "rare", points: 25, image: imgCow, emoji: "🐄", desc: "Sapi perah bintang Animal Farm." },
  { id: "coin", name: "Koin Emas", category: "treasure", rarity: "rare", points: 30, image: imgCoin, emoji: "🪙", desc: "Koin emas kuno dari kerajaan petani purba." },
  { id: "gem", name: "Permata", category: "treasure", rarity: "epic", points: 50, image: imgGem, emoji: "💎", desc: "Permata biru yang memancarkan cahaya sungai." },
  { id: "star", name: "Bintang Ajaib", category: "treasure", rarity: "epic", points: 75, image: imgStar, emoji: "⭐", desc: "Bintang jatuh yang tertidur di padang bunga." },
  { id: "crystal", name: "Magic Crystal", category: "treasure", rarity: "legendary", points: 100, image: imgCrystal, emoji: "🔮", desc: "Kristal legendaris sumber keajaiban panen." },
  { id: "goldcorn", name: "Jagung Emas", category: "treasure", rarity: "epic", points: 60, image: imgCorn, emoji: "🌽", desc: "Kartu khusus! Hanya untuk penakluk Corn Field Maze.", tint: "sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.15)", special: true },
  { id: "rainbowveg", name: "Labu Pelangi", category: "treasure", rarity: "epic", points: 80, image: imgPumpkin, emoji: "🎃", desc: "Kartu khusus! Hadiah menaklukkan Vegetable Garden Maze.", tint: "hue-rotate(200deg) saturate(1.6) brightness(1.1)", special: true },
  { id: "guardian", name: "Roh Penjaga Hutan", category: "treasure", rarity: "legendary", points: 150, image: imgCrystal, emoji: "🧚", desc: "Kartu khusus Legendary! Penjaga Magic Forest Maze.", tint: "hue-rotate(110deg) saturate(1.5) brightness(1.15)", special: true },
  { id: "mystery", name: "Mystery Card", category: "mystery", rarity: "rare", points: 0, image: null, emoji: "❓", desc: "Kartu kejutan! Poin acak, hadiah spesial, atau kartu langka." },
];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));

export const CROPS: Record<CropId, CropDef> = {
  carrot: { id: "carrot", name: "Wortel", emoji: "🥕", growTime: 25, seedPrice: 4, points: 10, coins: 6, image: imgCarrot },
  tomato: { id: "tomato", name: "Tomat", emoji: "🍅", growTime: 35, seedPrice: 6, points: 15, coins: 9, image: imgTomato },
  corn: { id: "corn", name: "Jagung", emoji: "🌽", growTime: 45, seedPrice: 8, points: 20, coins: 12, image: imgCorn },
  strawberry: { id: "strawberry", name: "Stroberi", emoji: "🍓", growTime: 55, seedPrice: 11, points: 25, coins: 16, image: imgStrawberry },
  pumpkin: { id: "pumpkin", name: "Labu", emoji: "🎃", growTime: 70, seedPrice: 14, points: 30, coins: 22, image: imgPumpkin },
};
export const CROP_ORDER: CropId[] = ["carrot", "tomato", "corn", "strawberry", "pumpkin"];

export const PRODUCE: Record<ProduceId, ProduceDef> = {
  egg: { id: "egg", name: "Telur", emoji: "🥚", points: 10, sell: 5 },
  milk: { id: "milk", name: "Susu Sapi", emoji: "🥛", points: 12, sell: 7 },
  goatmilk: { id: "goatmilk", name: "Susu Kambing", emoji: "🍼", points: 12, sell: 6 },
  wool: { id: "wool", name: "Wol Domba", emoji: "🧶", points: 15, sell: 8 },
  apple: { id: "apple", name: "Apel", emoji: "🍎", points: 8, sell: 4 },
  fish: { id: "fish", name: "Ikan", emoji: "🐟", points: 0, sell: 6 },
  flower: { id: "flower", name: "Bunga", emoji: "🌷", points: 5, sell: 2 },
  mushroom: { id: "mushroom", name: "Jamur", emoji: "🍄", points: 6, sell: 3 },
  carrot: { id: "carrot", name: "Wortel", emoji: "🥕", points: 0, sell: 6 },
  tomato: { id: "tomato", name: "Tomat", emoji: "🍅", points: 0, sell: 9 },
  corn: { id: "corn", name: "Jagung", emoji: "🌽", points: 0, sell: 12 },
  strawberry: { id: "strawberry", name: "Stroberi", emoji: "🍓", points: 0, sell: 16 },
  pumpkin: { id: "pumpkin", name: "Labu", emoji: "🎃", points: 0, sell: 22 },
};

export const ANIMALS: AnimalDef[] = [
  { id: "cow", name: "Sapi", image: imgCow, produce: "milk", time: 30, x: 16, size: 120, wander: 70, speed: 11 },
  { id: "sheep", name: "Domba", image: imgSheep, produce: "wool", time: 40, x: 38, size: 100, wander: 60, speed: 9 },
  { id: "goat", name: "Kambing", image: imgGoat, produce: "goatmilk", time: 35, x: 60, size: 100, wander: 80, speed: 7 },
  { id: "chicken", name: "Ayam", image: imgChicken, produce: "egg", time: 25, x: 82, size: 76, wander: 50, speed: 6 },
];

export const FISH = {
  small: { name: "Ikan Kecil", emoji: "🐟", points: 10, coins: 4 },
  medium: { name: "Ikan Sedang", emoji: "🐠", points: 18, coins: 7 },
  big: { name: "Ikan Besar", emoji: "🐡", points: 30, coins: 12 },
} as const;
export type FishSize = keyof typeof FISH;

export const LOCATIONS: Record<LocationId, LocationDef> = {
  valley: {
    id: "valley",
    name: "Green Valley",
    subtitle: "Area pertanian utama",
    desc: "Rumah ROBI. Petik apel, ambil jerami untuk pakan, dan cari kartu di padang rumput.",
    bg: bgValley,
    unlockLevel: 1,
    ground: 12,
    particles: "leaves",
    icon: "🏡",
    pool: { carrot: 25, tomato: 18, corn: 12, chicken: 12, coin: 8, mystery: 12, strawberry: 6, gem: 2 },
    minX: 4,
    maxX: 96,
  },
  garden: {
    id: "garden",
    name: "Vegetable Garden",
    subtitle: "Kebun sayuran",
    desc: "Tanam bibit, siram dengan rajin, lalu panen sayuran segar untuk poin dan koin.",
    bg: bgGarden,
    unlockLevel: 1,
    ground: 11,
    particles: "butterflies",
    icon: "🥕",
    pool: { carrot: 24, tomato: 22, corn: 18, strawberry: 14, pumpkin: 10, mystery: 8, gem: 3, star: 1 },
    minX: 4,
    maxX: 96,
  },
  animal: {
    id: "animal",
    name: "Animal Farm",
    subtitle: "Peternakan",
    desc: "Beri makan sapi, domba, kambing, dan ayam lalu kumpulkan susu, wol, dan telur.",
    bg: bgAnimal,
    unlockLevel: 1,
    ground: 11,
    particles: "hay",
    icon: "🐄",
    pool: { chicken: 28, goat: 24, sheep: 18, cow: 14, mystery: 10, coin: 4, gem: 2 },
    minX: 4,
    maxX: 96,
  },
  meadow: {
    id: "meadow",
    name: "Flower Meadow",
    subtitle: "Padang bunga",
    desc: "Petik bunga warna-warni yang bergoyang tertiup angin dan temukan Mystery Card.",
    bg: bgMeadow,
    unlockLevel: 1,
    ground: 10,
    particles: "petals",
    icon: "🌸",
    pool: { mystery: 24, strawberry: 14, tomato: 8, sheep: 10, star: 8, coin: 12, gem: 10, crystal: 2, chicken: 8, pumpkin: 4 },
    minX: 4,
    maxX: 96,
  },
  forest: {
    id: "forest",
    name: "Forest Adventure",
    subtitle: "Hutan ajaib",
    desc: "Jelajahi hutan, petik jamur bercahaya, dan buru kartu harta karun tersembunyi.",
    bg: bgForest,
    unlockLevel: 1,
    ground: 9,
    particles: "fireflies",
    icon: "🌲",
    pool: { coin: 25, gem: 18, star: 10, crystal: 4, mystery: 15, pumpkin: 10, corn: 8, goat: 10 },
    minX: 6,
    maxX: 94,
  },
  river: {
    id: "river",
    name: "River Side",
    subtitle: "Tepi sungai",
    desc: "Memancing ikan di dermaga dan mengumpulkan poin di tepi sungai yang berkilau.",
    bg: bgRiver,
    unlockLevel: 1,
    ground: 8,
    particles: "sparkles",
    icon: "🎣",
    pool: { mystery: 20, coin: 20, gem: 12, star: 8, crystal: 3, carrot: 10, cow: 8, strawberry: 10, corn: 9 },
    minX: 4,
    maxX: 96,
  },
};
export const LOCATION_ORDER: LocationId[] = ["valley", "garden", "animal", "meadow", "forest", "river"];

export const LEVELS: LevelDef[] = [
  { level: 1, name: "Little Farmer", subtitle: "Mengenal pertanian", target: 100, desc: "Belajar menanam, menyiram, dan memanen sayuran di Vegetable Garden.", unlocks: [], focus: "garden", emoji: "🌱", unlockText: "Dunia terbuka + Maze 1: Corn Field" },
  { level: 2, name: "Animal Keeper", subtitle: "Merawat hewan", target: 250, desc: "Rawat hewan ternak di Animal Farm dan kumpulkan telur serta susu.", unlocks: [], focus: "animal", emoji: "🐄", unlockText: "Maze 2: Vegetable Garden Maze" },
  { level: 3, name: "Treasure Hunter", subtitle: "Menjelajahi hutan", target: 500, desc: "Jelajahi Forest Adventure dan River Side untuk berburu kartu harta karun.", unlocks: [], focus: "forest", emoji: "💎", unlockText: "Maze 3: Magic Forest Maze" },
  { level: 4, name: "Master Farmer", subtitle: "Misi beragam", target: 800, desc: "Selesaikan berbagai misi di seluruh dunia dan kumpulkan kartu langka.", unlocks: [], focus: "valley", emoji: "🏆" },
  { level: 5, name: "Legend of Harvest", subtitle: "Petualangan terakhir", target: 1500, desc: "Temukan kartu Legendary dan lengkapi koleksi Magic Hunt Cards.", unlocks: [], focus: "meadow", emoji: "👑" },
];

export const MISSIONS: MissionDef[] = [
  { id: "m1_plant", level: 1, title: "Tanam Bibit", desc: "Tanam 3 bibit di Vegetable Garden", stat: "planted", target: 3, points: 20, coins: 10 },
  { id: "m1_water", level: 1, title: "Rajin Menyiram", desc: "Siram tanaman 4 kali", stat: "watered", target: 4, points: 15, coins: 5 },
  { id: "m1_harvest", level: 1, title: "Panen Pertama", desc: "Panen 3 sayuran", stat: "harvested", target: 3, points: 30, coins: 15 },
  { id: "m1_cards", level: 1, title: "Kartu Sayuran", desc: "Temukan 2 Vegetable Card", stat: "vegCards", target: 2, points: 25, coins: 10 },

  { id: "m1_maze", level: 1, title: "Penjelajah Labirin", desc: "Taklukkan Maze 1: Corn Field (barat laut rumah)", stat: "maze1", target: 1, points: 30, coins: 15 },

  { id: "m2_feed", level: 2, title: "Waktunya Makan", desc: "Beri makan hewan 4 kali", stat: "fed", target: 4, points: 25, coins: 10 },
  { id: "m2_egg", level: 2, title: "Pengumpul Telur", desc: "Kumpulkan 3 telur", stat: "eggs", target: 3, points: 30, coins: 15 },
  { id: "m2_milk", level: 2, title: "Susu Segar", desc: "Kumpulkan 2 susu (sapi/kambing)", stat: "milk", target: 2, points: 30, coins: 15 },
  { id: "m2_cards", level: 2, title: "Kartu Hewan", desc: "Temukan 3 Animal Card", stat: "animalCards", target: 3, points: 40, coins: 20 },

  { id: "m2_maze", level: 2, title: "Ahli Labirin Sayur", desc: "Taklukkan Maze 2: Vegetable Garden Maze", stat: "maze2", target: 1, points: 50, coins: 25 },

  { id: "m3_forest", level: 3, title: "Penjelajah Hutan", desc: "Temukan 5 benda tersembunyi di hutan / Magic Forest Maze", stat: "forestFinds", target: 5, points: 40, coins: 20 },
  { id: "m3_treasure", level: 3, title: "Pemburu Harta", desc: "Temukan 3 Treasure Card", stat: "treasureCards", target: 3, points: 50, coins: 25 },
  { id: "m3_fish", level: 3, title: "Pemancing Handal", desc: "Tangkap 3 ikan di River Side", stat: "fish", target: 3, points: 35, coins: 20 },
  { id: "m3_epic", level: 3, title: "Kilau Epic", desc: "Temukan 1 kartu Epic atau lebih langka", stat: "epicPlus", target: 1, points: 60, coins: 30 },

  { id: "m3_maze", level: 3, title: "Penakluk Hutan Ajaib", desc: "Taklukkan Maze 3: Magic Forest Maze", stat: "maze3", target: 1, points: 80, coins: 40 },

  { id: "m4_harvest", level: 4, title: "Panen Raya", desc: "Panen 8 sayuran", stat: "harvested", target: 8, points: 50, coins: 25 },
  { id: "m4_products", level: 4, title: "Hasil Ternak", desc: "Kumpulkan 6 hasil peternakan", stat: "products", target: 6, points: 50, coins: 25 },
  { id: "m4_flowers", level: 4, title: "Pemetik Bunga", desc: "Petik 10 bunga di Flower Meadow", stat: "flowers", target: 10, points: 40, coins: 20 },
  { id: "m4_rare", level: 4, title: "Kolektor Langka", desc: "Temukan 6 kartu Rare atau lebih langka", stat: "rarePlus", target: 6, points: 80, coins: 40 },

  { id: "m5_legend", level: 5, title: "Kartu Legenda", desc: "Temukan 1 kartu Legendary", stat: "legendary", target: 1, points: 150, coins: 60 },
  { id: "m5_cards", level: 5, title: "Pemburu Sejati", desc: "Temukan 12 kartu", stat: "cards", target: 12, points: 80, coins: 40 },
  { id: "m5_unique", level: 5, title: "Koleksi Lengkap", desc: "Kumpulkan 14 jenis Magic Hunt Card berbeda", stat: "unique", target: 14, points: 120, coins: 50 },
  { id: "m5_coins", level: 5, title: "Saudagar Panen", desc: "Kumpulkan 250 koin", stat: "coinsEarned", target: 250, points: 100, coins: 50 },
];

export const DAILIES: DailyDef[] = [
  { id: "d_harvest", title: "Panen 4 sayuran hari ini", stat: "harvested", target: 4, points: 30, coins: 15 },
  { id: "d_cards", title: "Temukan 3 Magic Hunt Card", stat: "cards", target: 3, points: 40, coins: 20 },
  { id: "d_water", title: "Siram tanaman 5 kali", stat: "watered", target: 5, points: 20, coins: 10 },
  { id: "d_hidden", title: "Temukan 4 benda tersembunyi", stat: "hiddenFound", target: 4, points: 35, coins: 15 },
  { id: "d_pickups", title: "Kumpulkan 5 koin/bintang melayang", stat: "pickups", target: 5, points: 25, coins: 10 },
  { id: "d_feed", title: "Beri makan 3 hewan", stat: "fed", target: 3, points: 25, coins: 10, needs: "animal" },
  { id: "d_flowers", title: "Petik 5 bunga", stat: "flowers", target: 5, points: 25, coins: 10, needs: "meadow" },
  { id: "d_fish", title: "Tangkap 2 ikan", stat: "fish", target: 2, points: 30, coins: 15, needs: "river" },
  { id: "d_mush", title: "Petik 3 jamur hutan", stat: "mushrooms", target: 3, points: 25, coins: 10, needs: "forest" },
];

export const REWARDS: RewardDef[] = [
  {
    id: "bronze", points: 100, title: "Bronze Farmer", emoji: "🥉", color: "#b45309",
    unlocks: [
      { id: "decor_scarecrow", name: "Robot Sawah", type: "decor", emoji: "🤖", desc: "Orang-orangan sawah robot di Green Valley" },
      { id: "gear_bandana", name: "Aura Biru", type: "gear", emoji: "💙", desc: "Aura biru berkilau untuk ROBI" },
    ],
  },
  {
    id: "silver", points: 300, title: "Silver Farmer", emoji: "🥈", color: "#64748b",
    unlocks: [
      { id: "decor_fence", name: "Pagar Bunga", type: "decor", emoji: "🌷", desc: "Deretan bunga cantik di Green Valley" },
      { id: "gear_silverhat", name: "Pita Perak", type: "gear", emoji: "🎀", desc: "Kilau perak di topi ROBI" },
    ],
  },
  {
    id: "gold", points: 600, title: "Gold Farmer", emoji: "🥇", color: "#ca8a04",
    unlocks: [
      { id: "gear_lucky", name: "Jimat Keberuntungan", type: "gear", emoji: "🍀", desc: "Peluang kartu Epic & Legendary +30%" },
      { id: "decor_fountain", name: "Air Mancur", type: "decor", emoji: "⛲", desc: "Air mancur indah di Green Valley" },
    ],
  },
  {
    id: "super", points: 1000, title: "Super Farmer", emoji: "🏆", color: "#dc2626",
    unlocks: [
      { id: "gear_boots", name: "Rocket Boots", type: "gear", emoji: "🚀", desc: "ROBI berlari 30% lebih cepat" },
      { id: "decor_lights", name: "Lampu Pesta", type: "decor", emoji: "🏮", desc: "Lampion meriah di Green Valley" },
    ],
  },
  {
    id: "legend", points: 1500, title: "Legendary Farmer", emoji: "👑", color: "#7c3aed",
    unlocks: [
      { id: "gear_crown", name: "Mahkota Legenda", type: "gear", emoji: "👑", desc: "Mahkota emas untuk ROBI" },
      { id: "decor_rainbow", name: "Pelangi Abadi", type: "decor", emoji: "🌈", desc: "Pelangi menghiasi langit Green Valley" },
    ],
  },
];

export const ALL_UNLOCKS = REWARDS.flatMap((r) => r.unlocks.map((u) => ({ ...u, reward: r })));
