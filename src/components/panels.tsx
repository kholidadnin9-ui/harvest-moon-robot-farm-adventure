import { useState } from "react";
import confetti from "canvas-confetti";
import { useGame } from "@/game/store";
import {
  ALL_UNLOCKS,
  CARDS,
  CATEGORY,
  CROPS,
  CROP_ORDER,
  FEED_PRICE,
  HIDDEN_MAX,
  LANTERN_PRICE,
  LEVELS,
  LOCATIONS,
  LOCATION_ORDER,
  PRODUCE,
  RARITY,
  REWARDS,
  ROBI_IMG,
} from "@/game/data";
import { canLevelUp, currentLevel, dailyProgress, getDailies, isUnlocked, levelMissions, missionProgress, nextReward, rewardTier, unlockedGear } from "@/game/logic";
import type { CardCategory, CardDef, ProduceId } from "@/game/types";
import { sfx } from "@/game/audio";
import { Bar, GButton, Overlay, Panel, fmtTime, useToast } from "./ui";
import { CardFace } from "./CardView";
import type { PanelId } from "./HUD";
import { worldBus } from "@/engine/engine";
import { MAZES } from "@/engine/world";
import { cn } from "@/utils/cn";

/* ================= Dashboard ================= */
export function Dashboard({ onClose, onOpen, onLevelUp }: { onClose: () => void; onOpen: (p: PanelId) => void; onLevelUp: () => void }) {
  const { state } = useGame();
  const lvl = currentLevel(state);
  const tier = rewardTier(state.points);
  const unique = Object.keys(state.collection).length;
  const total = Object.values(state.collection).reduce((a, b) => a + b, 0);
  const missions = levelMissions(state.level);
  const ready = canLevelUp(state);
  const loc = LOCATIONS[state.location];
  const bigBtn = (label: string, icon: string, variant: "green" | "gold" | "blue" | "purple", p: PanelId, sub: string) => (
    <button
      onClick={() => {
        sfx.click();
        onOpen(p);
      }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border-b-[6px] p-3 sm:p-4 text-left shadow-xl hover:brightness-110 active:translate-y-1 active:border-b-0 transition-all",
        variant === "green" && "bg-gradient-to-br from-lime-300 to-green-600 border-green-900",
        variant === "gold" && "bg-gradient-to-br from-yellow-200 to-amber-500 border-amber-800",
        variant === "blue" && "bg-gradient-to-br from-sky-300 to-blue-600 border-blue-900",
        variant === "purple" && "bg-gradient-to-br from-fuchsia-300 to-purple-600 border-purple-950",
      )}
    >
      <div className="absolute -right-3 -bottom-4 text-6xl sm:text-7xl opacity-30 group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-2xl sm:text-3xl drop-shadow">{icon}</div>
      <div className={cn("font-game font-black text-lg sm:text-xl tracking-wide", variant === "gold" ? "text-amber-950" : "text-white text-outline-sm")}>{label}</div>
      <div className={cn("text-[11px] sm:text-xs font-semibold", variant === "gold" ? "text-amber-900/80" : "text-white/90")}>{sub}</div>
    </button>
  );
  return (
    <Overlay onClose={onClose}>
      <Panel title="ROBI FARM HQ — Dashboard" icon="🎮" onClose={onClose} className="w-full max-w-5xl max-h-[96dvh]">
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[250px_1fr]">
          {/* character card */}
          <div className="rounded-2xl border-4 border-sky-800/60 bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 p-3 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 50% 30%, white, transparent 60%)" }} />
            <img src={ROBI_IMG} alt="ROBI" className="relative h-40 sm:h-48 object-contain drop-shadow-xl anim-bob" />
            <div className="relative font-game font-black text-2xl text-sky-900">ROBI</div>
            <div className="relative text-xs font-bold text-sky-900/80">Robot Petani Petualang</div>
            <div className="relative mt-2 px-3 py-1 rounded-full bg-amber-400 border-2 border-amber-700 text-amber-950 font-game font-bold text-sm">
              {tier ? `${tier.emoji} ${tier.title}` : "🌱 Petani Pemula"}
            </div>
            <div className="relative mt-2 grid grid-cols-2 gap-1.5 w-full text-[11px] font-bold text-sky-950">
              <div className="rounded-lg bg-white/70 px-2 py-1">⏱ {fmtTime(state.playTime)}</div>
              <div className="rounded-lg bg-white/70 px-2 py-1">📍 {loc.icon} {loc.name.split(" ")[0]}</div>
              <div className="rounded-lg bg-white/70 px-2 py-1">🎒 {state.equipped.filter((e) => e.startsWith("gear")).length} gear</div>
              <div className="rounded-lg bg-white/70 px-2 py-1">🏡 {state.equipped.filter((e) => e.startsWith("decor")).length} dekor</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-0">
            {/* stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["⭐", state.points, "Total Poin", "from-amber-300 to-orange-500"],
                ["🪙", state.coins, "Koin", "from-yellow-200 to-yellow-500"],
                ["🏅", `Lv.${state.level}`, lvl.name, "from-sky-300 to-blue-500"],
                ["🎴", `${unique}/${CARDS.length}`, `${total} kartu ditemukan`, "from-fuchsia-300 to-purple-500"],
              ].map(([icon, v, l, grad]) => (
                <div key={String(l)} className={cn("rounded-xl bg-gradient-to-br p-2 border-2 border-white/60 shadow text-slate-900", String(grad))}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{icon}</span>
                    <span className="font-game font-black text-xl leading-none">{v}</span>
                  </div>
                  <div className="text-[10px] font-bold opacity-80 mt-0.5 truncate">{l}</div>
                </div>
              ))}
            </div>
            {/* level progress */}
            <div className="rounded-xl bg-white/60 border-2 border-amber-300 p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-game font-bold text-amber-900">
                  {lvl.emoji} Level {state.level}: {lvl.name} <span className="text-xs font-semibold text-amber-800/70">— {lvl.subtitle}</span>
                </div>
                {ready && (
                  <GButton size="xs" variant="gold" onClick={onLevelUp} className="anim-pulse-soft">
                    🎉 NAIK LEVEL
                  </GButton>
                )}
              </div>
              <Bar value={state.points} max={lvl.target} color="from-amber-300 via-orange-400 to-red-500" />
              <div className="text-[11px] text-amber-900/70 mt-1">Target: {lvl.target} poin + selesaikan semua misi level ini.</div>
            </div>
            {/* missions */}
            <div className="rounded-xl bg-white/60 border-2 border-amber-300 p-3">
              <div className="font-game font-bold text-amber-900 mb-2 flex items-center justify-between">
                <span>📜 Misi Aktif</span>
                <button onClick={() => onOpen("quest")} className="text-xs underline text-blue-700 font-bold">
                  Lihat semua
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {missions.map((m) => {
                  const prog = missionProgress(state, m);
                  const done = state.claimed.includes(m.id);
                  return (
                    <div key={m.id} className={cn("rounded-lg px-2.5 py-1.5 border", done ? "bg-emerald-100 border-emerald-400" : "bg-white/80 border-amber-200")}>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="truncate">
                          {done ? "✅" : prog >= m.target ? "🎁" : "▫️"} {m.title}
                        </span>
                        <span className="tabular-nums text-amber-800">
                          {Math.min(prog, m.target)}/{m.target}
                        </span>
                      </div>
                      <Bar value={prog} max={m.target} height="h-1.5" showText={false} className="mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* big buttons */}
        <div className="mt-3 sm:mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {bigBtn("INVENTORY", "🎒", "green", "inventory", "Bibit, pakan, hasil panen")}
          {bigBtn("HUNT CARDS", "🎴", "purple", "hunt", "Berburu Magic Hunt Cards")}
          {bigBtn("MAP", "🗺️", "blue", "map", "Peta dunia, kabut & fast travel")}
          {bigBtn("QUEST", "📜", "gold", "quest", "Misi & tantangan harian")}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 justify-center">
          <GButton size="sm" variant="wood" onClick={() => onOpen("collection")}>
            🃏 Koleksi Kartu ({unique}/{CARDS.length})
          </GButton>
          <GButton size="sm" variant="wood" onClick={() => onOpen("rewards")}>
            🏆 Reward & Dekorasi
          </GButton>
          <GButton size="sm" variant="green" onClick={onClose}>
            ▶ Lanjut Bermain
          </GButton>
        </div>
      </Panel>
    </Overlay>
  );
}

/* ================= Quests ================= */
export function Quests({ onClose, onLevelUp }: { onClose: () => void; onLevelUp: () => void }) {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const lvl = currentLevel(state);
  const missions = levelMissions(state.level);
  const dailies = getDailies(state);
  const ready = canLevelUp(state);
  const next = LEVELS[state.level] || null;
  const claim = (id: string, pts: number, coins: number, daily = false) => {
    dispatch(daily ? { type: "CLAIM_DAILY", id } : { type: "CLAIM_MISSION", id });
    sfx.mission();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    toast(`Misi selesai! +${pts} poin, +${coins} koin`, "🎉", "gold");
  };
  return (
    <Overlay onClose={onClose}>
      <Panel title="QUEST — Misi Petualangan" icon="📜" onClose={onClose} className="w-full max-w-3xl max-h-[96dvh]">
        <div className="rounded-2xl bg-gradient-to-r from-amber-200 to-yellow-100 border-2 border-amber-400 p-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{lvl.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-game font-black text-xl text-amber-900">
                Level {state.level}: {lvl.name}
              </div>
              <div className="text-xs text-amber-900/80 font-semibold">{lvl.desc}</div>
            </div>
          </div>
          <Bar value={state.points} max={lvl.target} className="mt-2" color="from-amber-300 via-orange-400 to-red-500" label={`Target poin level: ${lvl.target}`} />
          {ready ? (
            <GButton variant="gold" size="md" className="mt-3 w-full anim-pulse-soft" onClick={onLevelUp}>
              🎉 SEMUA MISI SELESAI — NAIK LEVEL!
            </GButton>
          ) : (
            <div className="mt-2 text-[11px] font-bold text-amber-800">Selesaikan & klaim semua misi, lalu capai target poin untuk naik level.</div>
          )}
        </div>

        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">Misi Level {state.level}</h3>
        <div className="space-y-2">
          {missions.map((m) => {
            const prog = missionProgress(state, m);
            const done = state.claimed.includes(m.id);
            const can = !done && prog >= m.target;
            return (
              <div key={m.id} className={cn("rounded-xl border-2 p-2.5 flex items-center gap-3", done ? "bg-emerald-100 border-emerald-400" : can ? "bg-yellow-100 border-yellow-400" : "bg-white/70 border-amber-200")}>
                <div className="text-2xl">{done ? "✅" : can ? "🎁" : "📌"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm">{m.title}</div>
                  <div className="text-[11px] text-slate-600">{m.desc}</div>
                  <Bar value={prog} max={m.target} height="h-2.5" className="mt-1" />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold text-amber-800">
                    +{m.points} ⭐ +{m.coins} 🪙
                  </div>
                  <GButton size="xs" variant={can ? "gold" : "dark"} disabled={!can} onClick={() => claim(m.id, m.points, m.coins)} className="mt-1">
                    {done ? "Selesai" : "KLAIM"}
                  </GButton>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🌞 Tantangan Harian</h3>
        <div className="space-y-2">
          {dailies.map((d) => {
            const prog = dailyProgress(state, d);
            const done = state.daily.claimed.includes(d.id);
            const can = !done && prog >= d.target;
            return (
              <div key={d.id} className={cn("rounded-xl border-2 p-2.5 flex items-center gap-3", done ? "bg-emerald-100 border-emerald-400" : can ? "bg-yellow-100 border-yellow-400" : "bg-sky-50 border-sky-200")}>
                <div className="text-2xl">{done ? "✅" : "☀️"}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm">{d.title}</div>
                  <Bar value={prog} max={d.target} height="h-2.5" className="mt-1" color="from-sky-300 to-blue-500" />
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-bold text-amber-800">
                    +{d.points} ⭐ +{d.coins} 🪙
                  </div>
                  <GButton size="xs" variant={can ? "gold" : "dark"} disabled={!can} onClick={() => claim(d.id, d.points, d.coins, true)} className="mt-1">
                    {done ? "Selesai" : "KLAIM"}
                  </GButton>
                </div>
              </div>
            );
          })}
        </div>

        {next && (
          <div className="mt-4 rounded-xl bg-slate-800 text-white p-3 flex items-center gap-3">
            <div className="text-3xl opacity-80">{next.emoji}</div>
            <div>
              <div className="font-game font-bold">
                Berikutnya: Level {next.level} — {next.name}
              </div>
              <div className="text-xs text-slate-300">
                {next.desc} {next.unlockText && `Membuka: ${next.unlockText}.`}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </Overlay>
  );
}

/* ================= Inventory ================= */
export function Inventory({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const inv = state.inventory;
  const produceIds = (Object.keys(inv.produce) as ProduceId[]).filter((k) => (inv.produce[k] || 0) > 0);
  const gear = unlockedGear(state);
  const buy = (item: "seed" | "feed" | "lantern", crop?: (typeof CROP_ORDER)[number]) => {
    const price = item === "seed" && crop ? CROPS[crop].seedPrice : item === "feed" ? FEED_PRICE : LANTERN_PRICE;
    if (state.coins < price) {
      toast("Koin tidak cukup!", "🪙", "bad");
      sfx.error();
      return;
    }
    dispatch({ type: "BUY", item, crop });
    sfx.coin();
  };
  const sellAll = (p: ProduceId) => {
    const n = inv.produce[p] || 0;
    dispatch({ type: "SELL", produce: p, qty: n });
    sfx.coin();
    toast(`Terjual ${n} ${PRODUCE[p].name} → +${n * PRODUCE[p].sell} koin`, "🪙", "gold");
  };
  return (
    <Overlay onClose={onClose}>
      <Panel title="INVENTORY — Tas ROBI" icon="🎒" onClose={onClose} className="w-full max-w-3xl max-h-[96dvh]" headerExtra={<span className="ml-auto mr-2 font-game font-bold text-amber-100">🪙 {state.coins}</span>}>
        <h3 className="font-game font-bold text-amber-900 mb-2">🌱 Bibit (klik beli)</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CROP_ORDER.map((c) => {
            const d = CROPS[c];
            return (
              <div key={c} className="rounded-xl bg-white/80 border-2 border-amber-300 p-2 flex flex-col items-center text-center">
                <img src={d.image} alt={d.name} className="w-12 h-12 object-contain" />
                <div className="font-bold text-sm text-slate-800">{d.name}</div>
                <div className="text-[10px] text-slate-600">
                  {d.growTime}s • +{d.points}⭐ +{d.coins}🪙
                </div>
                <div className="font-black text-green-700">x{inv.seeds[c]}</div>
                <GButton size="xs" variant="gold" onClick={() => buy("seed", c)} className="mt-1 w-full">
                  Beli {d.seedPrice}🪙
                </GButton>
              </div>
            );
          })}
        </div>

        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🧰 Perlengkapan</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/80 border-2 border-amber-300 p-3 flex items-center gap-3">
            <div className="text-4xl">🌾</div>
            <div className="flex-1">
              <div className="font-bold text-slate-800">Pakan Ternak</div>
              <div className="text-[11px] text-slate-600">Untuk memberi makan hewan. Gratis dari jerami di Green Valley.</div>
              <div className="font-black text-green-700">x{inv.feed}</div>
            </div>
            <GButton size="xs" variant="gold" onClick={() => buy("feed")}>
              Beli {FEED_PRICE}🪙
            </GButton>
          </div>
          <div className="rounded-xl bg-white/80 border-2 border-amber-300 p-3 flex items-center gap-3">
            <div className="text-4xl">🏮</div>
            <div className="flex-1">
              <div className="font-bold text-slate-800">Lentera Ajaib</div>
              <div className="text-[11px] text-slate-600">Memunculkan benda tersembunyi baru di lokasi saat ini.</div>
              <div className="font-black text-green-700">x{inv.lanterns}</div>
            </div>
            <div className="flex flex-col gap-1">
              <GButton size="xs" variant="gold" onClick={() => buy("lantern")}>
                Beli {LANTERN_PRICE}🪙
              </GButton>
              <GButton
                size="xs"
                variant="purple"
                disabled={inv.lanterns <= 0 || state.hidden[state.location].length >= HIDDEN_MAX}
                onClick={() => {
                  dispatch({ type: "USE_LANTERN", loc: state.location });
                  sfx.rare();
                  toast("Lentera menyala! Benda tersembunyi baru muncul ✨", "🏮", "good");
                  onClose();
                }}
              >
                Pakai
              </GButton>
            </div>
          </div>
        </div>

        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🧺 Hasil Panen & Ternak (jual untuk koin)</h3>
        {produceIds.length === 0 ? (
          <div className="rounded-xl bg-white/60 border-2 border-dashed border-amber-300 p-4 text-center text-sm text-amber-800">Belum ada hasil. Panen sayuran, kumpulkan telur & susu, petik bunga, atau mancing ikan!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {produceIds.map((p) => (
              <div key={p} className="rounded-xl bg-white/80 border-2 border-amber-300 p-2 flex items-center gap-2">
                <div className="text-3xl">{PRODUCE[p].emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{PRODUCE[p].name}</div>
                  <div className="text-[11px] text-slate-600">
                    x{inv.produce[p]} • {PRODUCE[p].sell}🪙/pcs
                  </div>
                </div>
                <GButton size="xs" variant="green" onClick={() => sellAll(p)}>
                  Jual
                </GButton>
              </div>
            ))}
          </div>
        )}

        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🤖 Perlengkapan Robot & Dekorasi</h3>
        {gear.length === 0 ? (
          <div className="rounded-xl bg-white/60 border-2 border-dashed border-amber-300 p-3 text-center text-sm text-amber-800">Kumpulkan 100 poin untuk membuka perlengkapan pertama (Bronze Farmer)!</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_UNLOCKS.filter((u) => gear.includes(u.id)).map((u) => {
              const on = state.equipped.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    dispatch({ type: "TOGGLE_EQUIP", id: u.id });
                    sfx.click();
                  }}
                  className={cn("rounded-xl border-2 p-2 flex items-center gap-2 text-left", on ? "bg-emerald-100 border-emerald-500" : "bg-white/80 border-amber-300")}
                >
                  <div className="text-2xl">{u.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800 truncate">{u.name}</div>
                    <div className="text-[10px] text-slate-600">{u.type === "gear" ? "Gear" : "Dekorasi"} • {on ? "Dipakai ✓" : "Klik untuk pakai"}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </Overlay>
  );
}

/* ================= Collection ================= */
export function Collection({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const [filter, setFilter] = useState<CardCategory | "all">("all");
  const [detail, setDetail] = useState<CardDef | null>(null);
  const cards = CARDS.filter((c) => filter === "all" || c.category === filter);
  const unique = Object.keys(state.collection).length;
  const total = Object.values(state.collection).reduce((a, b) => a + b, 0);
  const pts = state.log.length;
  return (
    <Overlay onClose={onClose}>
      <Panel title={`KOLEKSI MAGIC HUNT CARDS — ${unique}/${CARDS.length}`} icon="🃏" onClose={onClose} className="w-full max-w-5xl max-h-[96dvh]">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {(["all", "vegetable", "animal", "treasure", "mystery"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("px-3 py-1 rounded-full border-2 text-xs font-bold", filter === f ? "bg-amber-500 border-amber-800 text-white" : "bg-white/70 border-amber-300 text-amber-900")}
            >
              {f === "all" ? "🎴 Semua" : `${CATEGORY[f].emoji} ${CATEGORY[f].label}`}
            </button>
          ))}
          <span className="ml-auto text-xs font-bold text-amber-900">
            Total {total} kartu • {pts} penemuan terakhir tercatat
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {cards.map((c) => {
            const n = state.collection[c.id] || 0;
            return <CardFace key={c.id} card={c} size="sm" count={n} locked={n === 0} onClick={() => n > 0 && setDetail(c)} isNew={state.log[0]?.id === c.id && n > 0} />;
          })}
        </div>
        <div className="mt-4 grid sm:grid-cols-4 gap-2">
          {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => {
            const have = CARDS.filter((c) => c.rarity === r && c.category !== "mystery" && state.collection[c.id]).length;
            const all = CARDS.filter((c) => c.rarity === r && c.category !== "mystery").length;
            return (
              <div key={r} className="rounded-xl p-2 text-center border-2" style={{ borderColor: RARITY[r].color, background: `linear-gradient(135deg, ${RARITY[r].from}55, ${RARITY[r].to}33)` }}>
                <div className="font-game font-black" style={{ color: RARITY[r].text }}>
                  {RARITY[r].label}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {have}/{all} ditemukan
                </div>
              </div>
            );
          })}
        </div>
        {state.log.length > 0 && (
          <div className="mt-3 text-xs text-amber-900">
            <span className="font-bold">Penemuan terakhir:</span>{" "}
            {state.log.slice(0, 8).map((l, i) => (
              <span key={i} className="inline-block mr-1 px-1.5 py-0.5 rounded bg-white/70 border border-amber-200">
                {CARDS.find((c) => c.id === l.id)?.emoji} {CARDS.find((c) => c.id === l.id)?.name} <span className="opacity-60">({LOCATIONS[l.loc].name})</span>
              </span>
            ))}
          </div>
        )}
        {detail && (
          <Overlay onClose={() => setDetail(null)} z="z-[65]">
            <div className="flex flex-col items-center gap-3 anim-pop">
              <CardFace card={detail} size="lg" count={state.collection[detail.id]} />
              <GButton variant="gold" onClick={() => setDetail(null)}>
                Tutup
              </GButton>
            </div>
          </Overlay>
        )}
      </Panel>
    </Overlay>
  );
}

/* ================= Hunt Cards ================= */
export function HuntPanel({ onClose, onOpen }: { onClose: () => void; onOpen: (p: PanelId) => void }) {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const cats: CardCategory[] = ["vegetable", "animal", "treasure", "mystery"];
  return (
    <Overlay onClose={onClose}>
      <Panel title="HUNT CARDS — Berburu Magic Hunt Cards" icon="🎴" onClose={onClose} className="w-full max-w-5xl max-h-[96dvh]">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white p-3 sm:p-4 border-2 border-amber-300/60">
          <div className="font-game font-black text-lg sm:text-xl text-amber-300">Cara Berburu Kartu ✨</div>
          <ol className="mt-1 grid sm:grid-cols-3 gap-x-4 gap-y-1 text-xs sm:text-sm list-decimal list-inside text-indigo-50">
            <li>Jelajahi dunia terbuka — kilauan ✨ adalah benda tersembunyi.</li>
            <li>Dekati lalu tekan E / tombol INTERACT (SEARCH) — kartu terbuka dengan animasi flip!</li>
            <li>Di dalam 3 LABIRIN, kartu tersembunyi di balik batu, peti, jerami, dan jalan buntu.</li>
            <li>Peti terkunci & gerbang butuh kunci 🗝️ yang ada di labirin yang sama.</li>
            <li>Taklukkan labirin untuk kartu khusus MAZE ★ yang tidak ada di tempat lain.</li>
            <li>Lentera Ajaib 🏮 memunculkan kilauan baru di area ROBI berada.</li>
          </ol>
        </div>

        <div className="mt-3 grid md:grid-cols-[1fr_1.1fr] gap-3">
          <div>
            <h3 className="font-game font-bold text-amber-900 mb-2">Jenis Kartu & Poin</h3>
            <div className="space-y-2">
              {cats.map((cat) => (
                <div key={cat} className="rounded-xl bg-white/75 border-2 p-2" style={{ borderColor: CATEGORY[cat].color }}>
                  <div className="font-bold text-sm" style={{ color: CATEGORY[cat].color }}>
                    {CATEGORY[cat].emoji} {CATEGORY[cat].label}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {CARDS.filter((c) => c.category === cat).map((c) => (
                      <span key={c.id} className="px-1.5 py-0.5 rounded-md text-[11px] font-bold border" style={{ borderColor: RARITY[c.rarity].color, background: `${RARITY[c.rarity].from}66`, color: RARITY[c.rarity].text }}>
                        {c.emoji} {c.name}: {c.points > 0 ? `${c.points} poin` : "acak"} <span className="opacity-70">({RARITY[c.rarity].label})</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full text-white" style={{ background: RARITY[r].to }}>
                  {RARITY[r].label}
                </span>
              ))}
              <span className="text-amber-900 self-center">← semakin langka, semakin besar poinnya!</span>
            </div>
          </div>
          <div>
            <h3 className="font-game font-bold text-amber-900 mb-2">Pilih Lokasi Berburu</h3>
            <div className="space-y-2">
              {LOCATION_ORDER.map((id) => {
                const L = LOCATIONS[id];
                const unlocked = isUnlocked(state, id);
                const here = state.location === id;
                const top = Object.entries(L.pool)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([c]) => CARDS.find((x) => x.id === c)?.emoji)
                  .join(" ");
                return (
                  <div key={id} className={cn("rounded-xl border-2 p-2 flex items-center gap-2", unlocked ? "bg-white/80 border-amber-300" : "bg-slate-200 border-slate-300 opacity-70")}>
                    <img src={L.bg} alt="" className={cn("w-16 h-12 object-cover rounded-lg border border-amber-400", !unlocked && "grayscale")} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-800">
                        {L.icon} {L.name} {here && <span className="text-[10px] text-green-700">(di sini)</span>}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {unlocked ? `✨ ${state.hidden[id].length} benda tersembunyi • kartu: ${top}` : `🔒 Terbuka di Level ${L.unlockLevel}`}
                      </div>
                    </div>
                    <GButton
                      size="xs"
                      variant={here ? "dark" : "purple"}
                      disabled={!unlocked || here}
                      onClick={() => {
                        worldBus.engine?.travelLoc(id);
                        toast(`Berburu kartu di ${L.name}!`, "🎴");
                        onClose();
                      }}
                    >
                      {here ? "Di sini" : "Berburu"}
                    </GButton>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <GButton size="sm" variant="wood" onClick={() => onOpen("collection")} className="flex-1">
                🃏 Lihat Koleksi
              </GButton>
              <GButton
                size="sm"
                variant="purple"
                disabled={state.inventory.lanterns <= 0 || state.hidden[state.location].length >= HIDDEN_MAX}
                onClick={() => {
                  dispatch({ type: "USE_LANTERN", loc: state.location });
                  sfx.rare();
                  toast("Lentera menyala! Kilauan baru muncul ✨", "🏮", "good");
                  onClose();
                }}
              >
                🏮 Pakai Lentera ({state.inventory.lanterns})
              </GButton>
            </div>
          </div>
        </div>
      </Panel>
    </Overlay>
  );
}

/* ================= Rewards ================= */
export function Rewards({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const next = nextReward(state.points);
  return (
    <Overlay onClose={onClose}>
      <Panel title="REWARD — Gelar & Hadiah" icon="🏆" onClose={onClose} className="w-full max-w-3xl max-h-[96dvh]">
        <div className="rounded-2xl bg-gradient-to-r from-amber-200 to-yellow-100 border-2 border-amber-400 p-3">
          <div className="font-game font-bold text-amber-900">
            Total poin: <span className="text-2xl">{state.points}</span> ⭐
          </div>
          {next ? (
            <Bar value={state.points} max={next.points} className="mt-1" color="from-amber-300 via-orange-400 to-red-500" label={`Menuju ${next.emoji} ${next.title} (${next.points} poin)`} />
          ) : (
            <div className="text-sm font-bold text-amber-800 mt-1">Semua gelar sudah diraih! Kamu adalah Legendary Farmer 👑</div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {REWARDS.map((r) => {
            const got = state.points >= r.points;
            return (
              <div key={r.id} className={cn("rounded-xl border-2 p-3", got ? "bg-white/85 border-amber-400" : "bg-slate-100 border-slate-300")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 shadow", got ? "bg-gradient-to-b from-yellow-200 to-amber-400 border-amber-600" : "bg-slate-200 border-slate-300 grayscale")}>{r.emoji}</div>
                  <div className="flex-1">
                    <div className="font-game font-black text-lg" style={{ color: got ? r.color : "#64748b" }}>
                      {r.title}
                    </div>
                    <div className="text-xs font-bold text-slate-600">{r.points} poin {got ? "— DIRAIH ✓" : `— butuh ${r.points - state.points} poin lagi`}</div>
                  </div>
                </div>
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  {r.unlocks.map((u) => {
                    const on = state.equipped.includes(u.id);
                    return (
                      <div key={u.id} className="rounded-lg bg-amber-50 border border-amber-200 p-2 flex items-center gap-2">
                        <span className="text-2xl">{u.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800">
                            {u.name} <span className="font-normal text-slate-500">({u.type === "gear" ? "perlengkapan robot" : "dekorasi kebun"})</span>
                          </div>
                          <div className="text-[10px] text-slate-600">{u.desc}</div>
                        </div>
                        <GButton
                          size="xs"
                          variant={on ? "green" : "wood"}
                          disabled={!got}
                          onClick={() => {
                            dispatch({ type: "TOGGLE_EQUIP", id: u.id });
                            sfx.click();
                          }}
                        >
                          {!got ? "🔒" : on ? "Dipakai ✓" : u.type === "gear" ? "Pakai" : "Pasang"}
                        </GButton>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🧩 Labirin Petualangan</h3>
        <div className="grid sm:grid-cols-3 gap-2 mb-3">
          {MAZES.map((m) => {
            const rec = state.world.mazes[m.id];
            const ok = state.level >= m.level;
            return (
              <div key={m.id} className={cn("rounded-lg border-2 p-2 text-xs font-bold", rec?.done ? "bg-emerald-50 border-emerald-400 text-emerald-900" : ok ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-slate-100 border-slate-300 text-slate-500")}>
                <div>
                  {ok ? m.icon : "🔒"} Maze {m.idx + 1}: {m.name}
                </div>
                <div className="font-normal text-[10px]">{rec?.done ? `✅ Selesai ${rec.runs}x` : ok ? `Hadiah ${m.reward} poin + kartu MAZE ★` : `Terbuka di Level ${m.level}`}</div>
              </div>
            );
          })}
        </div>
        <h3 className="font-game font-bold text-amber-900 mt-4 mb-2">🗺️ Area Petualangan</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {LOCATION_ORDER.map((id) => {
            const L = LOCATIONS[id];
            const ok = isUnlocked(state, id);
            return (
              <div key={id} className={cn("rounded-lg border-2 p-2 text-xs font-bold flex items-center gap-2", ok ? "bg-emerald-50 border-emerald-400 text-emerald-900" : "bg-slate-100 border-slate-300 text-slate-500")}>
                <span className="text-xl">{ok ? L.icon : "🔒"}</span>
                <div>
                  {L.name}
                  <div className="font-normal text-[10px]">{ok ? "Terbuka" : `Level ${L.unlockLevel}`}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </Overlay>
  );
}


