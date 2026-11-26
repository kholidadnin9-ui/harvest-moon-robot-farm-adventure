import { CATEGORY, RARITY } from "@/game/data";
import type { CardDef } from "@/game/types";
import { cn } from "@/utils/cn";

type Size = "xs" | "sm" | "md" | "lg";
const SIZES: Record<Size, string> = {
  xs: "w-[5.5rem] h-[8rem] text-[8px]",
  sm: "w-28 h-40 text-[9px]",
  md: "w-40 h-60 sm:w-44 sm:h-64 text-[11px]",
  lg: "w-56 h-80 sm:w-72 sm:h-[26rem] text-sm",
};

export function CardFace({
  card,
  size = "md",
  count,
  locked,
  shine = true,
  className,
  onClick,
  isNew,
}: {
  card: CardDef;
  size?: Size;
  count?: number;
  locked?: boolean;
  shine?: boolean;
  className?: string;
  onClick?: () => void;
  isNew?: boolean;
}) {
  const r = RARITY[card.rarity];
  const cat = CATEGORY[card.category];
  const isMystery = card.category === "mystery";
  const frame = isMystery ? "linear-gradient(135deg,#f0abfc,#a21caf,#fbbf24,#a21caf,#f0abfc)" : `linear-gradient(135deg, ${r.from}, ${r.to} 50%, ${r.from})`;
  const glow = isMystery ? "rgba(217,70,239,0.8)" : r.glow;
  const textColor = isMystery ? "#86198f" : r.text;
  return (
    <div
      onClick={onClick}
      className={cn("relative rounded-2xl p-[5px] shrink-0 transition-transform", onClick && "cursor-pointer hover:scale-105 hover:-rotate-1", SIZES[size], className)}
      style={{
        background: locked ? "linear-gradient(135deg,#94a3b8,#475569)" : frame,
        boxShadow: locked ? "0 8px 20px rgba(0,0,0,.35)" : `0 10px 30px rgba(0,0,0,.4), 0 0 ${r.order >= 2 ? 34 : 18}px ${glow}`,
      }}
    >
      <div className={cn("relative w-full h-full rounded-xl overflow-hidden flex flex-col", locked ? "bg-slate-300" : "bg-gradient-to-b from-sky-50 via-white to-amber-50")}>
        {/* header */}
        <div className="flex items-center justify-between px-2 pt-1.5 gap-1">
          <span className="font-game font-bold uppercase tracking-wider text-[1.05em]" style={{ color: locked ? "#475569" : textColor }}>
            {locked ? "???" : isMystery ? "Mystery" : r.label}
          </span>
          <span className="rounded-full px-1.5 py-0.5 text-white font-black text-[0.95em] whitespace-nowrap shadow" style={{ background: locked ? "#64748b" : cat.color }}>
            {locked ? "?? PTS" : card.points > 0 ? `${card.points} PTS` : "??? PTS"}
          </span>
        </div>
        {/* art */}
        <div
          className="relative flex-1 mx-2 mt-1.5 mb-1 rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: locked
              ? "radial-gradient(circle at 50% 40%, #cbd5e1, #64748b)"
              : isMystery
                ? "radial-gradient(circle at 50% 35%, #fdf4ff 0%, #e879f9 40%, #581c87 100%)"
                : `radial-gradient(circle at 50% 35%, #ffffff 0%, ${r.from} 45%, ${r.to} 100%)`,
          }}
        >
          {!locked && r.order >= 1 && (
            <div className="absolute inset-0 opacity-50" style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,255,255,.18) 0 8deg, transparent 8deg 16deg)" }} />
          )}
          {locked ? (
            <span className="text-[4em] opacity-50 grayscale">❔</span>
          ) : card.image ? (
            <img src={card.image} alt={card.name} draggable={false} className="relative w-[84%] h-[84%] object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,.4)] anim-bob" style={card.tint ? { filter: `${card.tint} drop-shadow(0 8px 8px rgba(0,0,0,.4))` } : undefined} />
          ) : (
            <span className="relative text-[4.5em] drop-shadow-[0_8px_8px_rgba(0,0,0,.4)] anim-bob">{card.emoji}</span>
          )}
          {!locked &&
            r.order >= 2 &&
            [0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="absolute text-white anim-sparkle text-[1.6em]"
                style={{ left: `${8 + i * 20}%`, top: `${10 + ((i * 37) % 70)}%`, animationDelay: `${i * 0.25}s` }}
              >
                ✦
              </span>
            ))}
          {!locked && isMystery && (
            <span className="absolute inset-0 flex items-center justify-center text-[6em] font-game font-black text-white/15 select-none">?</span>
          )}
        </div>
        {/* name */}
        <div className="px-2 pb-2 text-center">
          <div className="font-game font-bold text-[1.45em] leading-tight" style={{ color: locked ? "#475569" : textColor }}>
            {locked ? "???" : card.name}
          </div>
          {size !== "xs" && (
            <div className="text-[0.95em] text-slate-600 leading-snug line-clamp-2 mt-0.5">{locked ? "Belum ditemukan" : card.desc}</div>
          )}
          <div className="mt-1 font-bold text-[0.95em]" style={{ color: locked ? "#64748b" : cat.color }}>
            {cat.emoji} {cat.label}
          </div>
        </div>
        {count ? (
          <div className="absolute top-1.5 right-1.5 translate-y-6 rounded-full bg-slate-900/85 text-amber-300 font-black px-2 py-0.5 text-[1em] border border-amber-300/60 shadow">
            x{count}
          </div>
        ) : null}
        {card.special && !locked && (
          <div className="absolute bottom-[26%] right-1 rotate-6 rounded-md bg-fuchsia-600 text-white font-black px-1.5 py-0.5 text-[0.85em] shadow border border-white/60">MAZE ★</div>
        )}
        {isNew && (
          <div className="absolute top-8 left-1 -rotate-12 rounded-md bg-red-500 text-white font-black px-1.5 py-0.5 text-[0.9em] shadow anim-pulse-soft">
            NEW!
          </div>
        )}
        {shine && !locked && <div className="pointer-events-none absolute inset-0 anim-holo" style={{ opacity: 0.35 + r.order * 0.2 }} />}
      </div>
    </div>
  );
}

export function CardBack({ size = "md", className }: { size?: Size; className?: string }) {
  return (
    <div
      className={cn("relative rounded-2xl p-[5px] shrink-0", SIZES[size], className)}
      style={{ background: "linear-gradient(135deg,#fde68a,#b45309,#fde68a)", boxShadow: "0 10px 30px rgba(0,0,0,.45), 0 0 24px rgba(251,191,36,.5)" }}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 flex flex-col items-center justify-center">
        <div className="absolute inset-0 opacity-30" style={{ background: "repeating-linear-gradient(45deg, rgba(251,191,36,.25) 0 2px, transparent 2px 14px)" }} />
        <div className="absolute inset-2 rounded-lg border-2 border-amber-300/50" />
        <div className="relative w-[62%] aspect-square rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,.7)] anim-pulse-glow" style={{ ["--glow" as string]: "rgba(251,191,36,.8)" }}>
          <div className="w-[82%] aspect-square rounded-full bg-indigo-950 flex items-center justify-center text-[3.4em]">🤖</div>
        </div>
        <div className="relative mt-3 font-game font-bold text-amber-200 tracking-[0.2em] text-[1.3em] text-center">MAGIC HUNT</div>
        <div className="relative text-amber-100/70 text-[1em] tracking-widest">✦ CARD ✦</div>
      </div>
    </div>
  );
}
