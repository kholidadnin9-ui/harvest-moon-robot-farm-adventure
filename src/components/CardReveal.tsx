import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CardBack, CardFace } from "./CardView";
import { GButton, Overlay } from "./ui";
import { RARITY } from "@/game/data";
import type { DrawResult } from "@/game/types";
import { sfx } from "@/game/audio";

export function CardReveal({ result, onClose }: { result: DrawResult; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [showMystery, setShowMystery] = useState(false);
  const isMysteryCard = result.mystery?.kind === "card";
  const displayCard = isMysteryCard && showMystery && result.mystery?.card ? result.mystery.card : result.card;
  const r = RARITY[displayCard.rarity];
  const isMystery = displayCard.category === "mystery";
  const glowColor = isMystery ? "rgba(232,121,249,0.55)" : r.glow;

  useEffect(() => {
    sfx.card();
    const t1 = window.setTimeout(() => {
      setFlipped(true);
      const card = result.card;
      if (card.category === "mystery") sfx.rare();
      else if (card.rarity === "legendary") {
        sfx.legendary();
        confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors: ["#fbbf24", "#fde68a", "#f59e0b", "#ffffff"] });
      } else if (card.rarity === "epic") sfx.epic();
      else if (card.rarity === "rare") sfx.rare();
      else sfx.harvest();
    }, 900);
    let t2: number | undefined;
    if (result.mystery) {
      t2 = window.setTimeout(() => {
        setShowMystery(true);
        const bonus = result.mystery?.card;
        if (bonus) {
          if (bonus.rarity === "legendary") {
            sfx.legendary();
            confetti({ particleCount: 180, spread: 110, origin: { y: 0.6 }, colors: ["#fbbf24", "#fde68a", "#f59e0b", "#ffffff"] });
          } else if (bonus.rarity === "epic") sfx.epic();
          else sfx.rare();
        } else sfx.coin();
      }, 2300);
    }
    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [result]);

  const rays = `repeating-conic-gradient(from 0deg, ${glowColor} 0deg 9deg, transparent 9deg 22deg)`;

  return (
    <Overlay z="z-[70]" className="bg-slate-950/75">
      <div className="relative flex flex-col items-center w-full max-w-md">
        <div className="pointer-events-none absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 w-[160vmax] h-[160vmax] anim-rays opacity-60" style={{ background: rays, maskImage: "radial-gradient(circle, black 0%, transparent 42%)", WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 42%)" }} />
        <div className="pointer-events-none absolute left-1/2 top-[36%] -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl anim-pulse-soft" style={{ background: glowColor }} />

        <div className="relative font-game text-amber-200 text-lg sm:text-xl font-bold tracking-widest mb-3 text-outline-sm">
          {flipped ? "KARTU DITEMUKAN!" : "MENCARI KARTU..."}
        </div>

        <div className="relative" style={{ perspective: 1400 }}>
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0, scale: flipped ? 1 : [1, 1.06, 1] }}
            transition={{ rotateY: { duration: 0.85, ease: "easeInOut" }, scale: { duration: 0.9, repeat: flipped ? 0 : Infinity } }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative"
          >
            <div style={{ backfaceVisibility: "hidden" }}>
              <CardBack size="lg" />
            </div>
            <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <motion.div key={displayCard.id} initial={{ scale: 0.4, rotate: -15, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
                <CardFace card={displayCard} size="lg" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="relative mt-4 text-center text-white min-h-[120px]">
          {flipped && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col items-center gap-2">
              <div className="font-game text-2xl sm:text-3xl font-black text-outline-sm" style={{ color: isMystery ? "#f0abfc" : r.color }}>
                {isMystery ? "MYSTERY CARD!" : `${r.label.toUpperCase()} • ${displayCard.name}`}
              </div>
              <div className="font-game text-xl sm:text-2xl font-bold text-amber-300 text-outline-sm">
                +{result.points} poin{result.coins > 0 ? ` • +${result.coins} koin` : ""}
              </div>
              {result.mystery && (
                <div className={`px-4 py-2 rounded-xl border-2 font-bold text-sm sm:text-base transition-all ${showMystery ? "bg-fuchsia-600/90 border-fuchsia-200 anim-pop" : "bg-slate-700/70 border-slate-400 animate-pulse"}`}>
                  {showMystery ? result.mystery.label : "✨ Membuka kejutan..."}
                </div>
              )}
              <GButton onClick={onClose} variant="gold" size="lg" className="mt-2">
                Simpan ke Koleksi ✨
              </GButton>
            </motion.div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
