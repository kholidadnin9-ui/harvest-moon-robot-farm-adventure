import { useGame } from "@/game/store";
import { CARDS, ROBI_IMG } from "@/game/data";
import { canLevelUp, currentLevel, getDailies, dailyProgress, levelMissions, missionProgress, rewardTier } from "@/game/logic";
import { sfx } from "@/game/audio";
import { Chip } from "./ui";
import { cn } from "@/utils/cn";

export type PanelId = "dashboard" | "inventory" | "hunt" | "map" | "quest" | "collection" | "rewards";

function IconBtn({ icon, label, onClick, badge, className }: { icon: string; label?: string; onClick: () => void; badge?: number; className?: string }) {
  return (
    <button
      onClick={() => {
        sfx.click();
        onClick();
      }}
      className={cn(
        "relative console-chip rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 text-white flex flex-col items-center min-w-[44px] sm:min-w-[56px] hover:brightness-125 active:translate-y-0.5 transition",
        className,
      )}
    >
      <span className="text-lg sm:text-xl leading-none drop-shadow">{icon}</span>
      {label && <span className="font-game text-[9px] sm:text-[10px] font-bold tracking-wider mt-0.5 leading-none">{label}</span>}
      {badge ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 border border-white text-[10px] font-black flex items-center justify-center anim-pulse-soft">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function HUD({ onOpen, onPause, onLevelUp }: { onOpen: (p: PanelId) => void; onPause: () => void; onLevelUp: () => void }) {
  const { state, dispatch } = useGame();
  const lvl = currentLevel(state);
  const tier = rewardTier(state.points);
  const unique = Object.keys(state.collection).length;
  const ready = canLevelUp(state);
  const claimable =
    levelMissions(state.level).filter((m) => !state.claimed.includes(m.id) && missionProgress(state, m) >= m.target).length +
    getDailies(state).filter((d) => !state.daily.claimed.includes(d.id) && dailyProgress(state, d) >= d.target).length;
  const pct = Math.min(100, (state.points / lvl.target) * 100);

  return (
    <div className="absolute inset-x-0 top-0 z-40 p-2 sm:p-3 flex items-start justify-between gap-2 pointer-events-none">
      <button
        onClick={() => {
          sfx.click();
          onOpen("dashboard");
        }}
        className="pointer-events-auto console-chip rounded-2xl flex items-center gap-2 pl-1.5 pr-3 py-1.5 text-white hover:brightness-125 active:translate-y-0.5 transition shrink-0"
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-sky-200 to-blue-600 border-2 border-amber-300 overflow-hidden flex items-start justify-center shadow-inner">
          <img src={ROBI_IMG} alt="ROBI" className="h-[150%] object-contain mt-0.5" />
        </div>
        <div className="leading-tight text-left">
          <div className="font-game font-bold text-sm sm:text-base">
            ROBI <span className="text-amber-300">Lv.{state.level}</span>
          </div>
          <div className="text-[10px] sm:text-xs text-amber-100/90 whitespace-nowrap">
            {lvl.name}
            {tier ? ` • ${tier.emoji} ${tier.title}` : ""}
          </div>
          <div className="mt-1 w-24 sm:w-40 h-2 rounded-full bg-black/50 overflow-hidden border border-white/20">
            <div className="h-full bg-gradient-to-r from-lime-300 to-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </button>

      <div className="hidden xs:flex sm:flex gap-1.5 sm:gap-2 pointer-events-auto">
        <Chip icon="⭐" value={state.points} label="poin" />
        <Chip icon="🪙" value={state.coins} label="koin" />
        <Chip icon="🎴" value={`${unique}/${CARDS.length}`} label="kartu" className="hidden md:flex" />
      </div>

      <div className="flex flex-wrap justify-end gap-1 sm:gap-1.5 pointer-events-auto max-w-[52vw] sm:max-w-none">
        <IconBtn onClick={() => onOpen("map")} icon="🗺️" label="MAP" />
        <IconBtn onClick={() => onOpen("quest")} icon="📜" label="QUEST" badge={claimable} />
        <IconBtn onClick={() => onOpen("hunt")} icon="🎴" label="CARDS" />
        <IconBtn onClick={() => onOpen("inventory")} icon="🎒" label="TAS" />
        <IconBtn onClick={() => dispatch({ type: "TOGGLE_SOUND" })} icon={state.sound ? "🔊" : "🔇"} />
        <IconBtn onClick={onPause} icon="⏸" label="JEDA" />
      </div>

      {/* mobile points row */}
      <div className="sm:hidden absolute left-2 top-[66px] flex gap-1.5 pointer-events-auto">
        <Chip icon="⭐" value={state.points} />
        <Chip icon="🪙" value={state.coins} />
        <Chip icon="🎴" value={`${unique}/${CARDS.length}`} />
      </div>

      {ready && (
        <button
          onClick={() => {
            sfx.click();
            onLevelUp();
          }}
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-[196px] sm:left-3 sm:translate-x-0 sm:top-[84px] px-4 py-2 rounded-2xl bg-gradient-to-b from-yellow-200 to-amber-500 border-b-4 border-amber-800 text-amber-950 font-game font-black text-sm sm:text-base shadow-xl anim-pulse-glow"
          style={{ ["--glow" as string]: "rgba(253,224,71,.95)" }}
        >
          🎉 LEVEL SELESAI! Naik Level →
        </button>
      )}
    </div>
  );
}
