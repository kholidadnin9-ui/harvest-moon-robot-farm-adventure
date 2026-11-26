import { useState } from "react";
import { LOCATIONS, ROBI_IMG } from "@/game/data";
import { sfx } from "@/game/audio";
import { GButton } from "./ui";
import { Particles } from "./Particles";

export function TitleScreen({ hasSave, onStart, onNew }: { hasSave: boolean; onStart: () => void; onNew: () => void }) {
  const [confirmNew, setConfirmNew] = useState(false);
  return (
    <div className="relative w-full h-dvh overflow-hidden bg-sky-400 select-none">
      <img src={LOCATIONS.valley.bg} alt="Green Valley" className="absolute inset-0 w-full h-full object-cover object-bottom anim-kenburns" draggable={false} />
      {/* sun rays */}
      <div
        className="pointer-events-none absolute -top-[60vmax] -right-[40vmax] w-[160vmax] h-[160vmax] anim-rays opacity-40 mix-blend-screen"
        style={{ background: "repeating-conic-gradient(from 0deg, rgba(255,250,200,.55) 0deg 6deg, transparent 6deg 18deg)", maskImage: "radial-gradient(circle, black 0%, transparent 55%)", WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-900/30 via-transparent to-black/55" />
      <div className="pointer-events-none absolute inset-0 anim-light-ray" style={{ background: "radial-gradient(circle at 80% 10%, rgba(255,240,180,.55), transparent 35%)" }} />
      <Particles kind="petals" count={16} />
      <Particles kind="leaves" count={8} />

      {/* ROBI */}
      <div className="absolute bottom-[4%] left-[4%] sm:left-[8%] anim-bounce-in" style={{ animationDelay: "0.5s" }}>
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-200/40 blur-3xl anim-pulse-soft" />
          <img src={ROBI_IMG} alt="ROBI" draggable={false} className="relative h-[34vh] sm:h-[48vh] max-h-[460px] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.45)] anim-bob" />
          <div className="absolute -right-6 top-6 px-3 py-1.5 rounded-2xl rounded-bl-sm bg-white/95 text-slate-800 font-game font-bold text-sm sm:text-base shadow-xl anim-pop" style={{ animationDelay: "1.6s" }}>
            Halo! Aku ROBI 👋
          </div>
        </div>
      </div>

      {/* Title block */}
      <div className="absolute inset-x-0 top-[6%] sm:top-[9%] flex flex-col items-center text-center px-4">
        <div className="anim-title-in">
          <div className="relative font-game font-black text-[2.1rem] leading-[0.95] sm:text-6xl md:text-7xl tracking-wide">
            {/* outline layer */}
            <div aria-hidden className="absolute inset-0 text-outline text-[#1e1b4b]">
              ROBOT FARM
              <br />
              ADVENTURE
            </div>
            {/* gradient fill layer */}
            <div className="relative">
              <span className="bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500 bg-clip-text text-transparent">ROBOT FARM</span>
              <br />
              <span className="bg-gradient-to-b from-white via-sky-100 to-sky-300 bg-clip-text text-transparent">ADVENTURE</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3 inline-block px-5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 border-2 border-lime-200 shadow-xl">
            <span className="font-game font-bold text-white text-base sm:text-2xl tracking-[0.18em] text-outline-sm">✦ THE MAGIC HARVEST ✦</span>
          </div>
        </div>
        <div className="mt-3 anim-pop" style={{ animationDelay: "0.9s" }}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-slate-900/85 border-2 border-amber-300 text-white font-bold text-sm sm:text-base tracking-wide shadow-lg">
            created by: widodo guru sd
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="absolute inset-x-0 bottom-[7%] sm:bottom-[12%] flex flex-col items-center gap-3 px-4">
        <div className="flex flex-wrap justify-center gap-2 anim-pop" style={{ animationDelay: "1.2s" }}>
          {["🧭 Open World", "🌽 3 Labirin Kebun", "🎴 Magic Hunt Cards", "🏆 5 Level Seru"].map((t) => (
            <span key={t} className="px-3 py-1 rounded-full bg-black/45 border border-white/30 text-white text-xs sm:text-sm font-bold backdrop-blur">
              {t}
            </span>
          ))}
        </div>
        <div className="anim-pop" style={{ animationDelay: "1.2s" }}>
          <GButton
            variant="gold"
            size="xl"
            className="anim-pulse-glow"
            style={{ ["--glow" as string]: "rgba(253,224,71,.95)" }}
            onClick={() => {
              sfx.levelUp();
              onStart();
            }}
          >
            ▶ START ADVENTURE
          </GButton>
        </div>
        {hasSave && !confirmNew && (
          <button onClick={() => setConfirmNew(true)} className="text-white/90 text-sm font-bold underline underline-offset-4 text-outline-sm hover:text-amber-200">
            Mulai petualangan baru (hapus progres)
          </button>
        )}
        {hasSave && confirmNew && (
          <div className="flex items-center gap-2 bg-black/60 rounded-2xl px-3 py-2 border border-white/30 anim-pop">
            <span className="text-white text-sm font-bold">Yakin hapus progres?</span>
            <GButton size="sm" variant="red" onClick={onNew}>
              Ya, mulai baru
            </GButton>
            <GButton size="sm" variant="ghost" onClick={() => setConfirmNew(false)}>
              Batal
            </GButton>
          </div>
        )}
        <div className="text-white/80 text-[11px] sm:text-xs text-outline-sm">Terinspirasi game farming adventure anime • Mainkan di laptop, tablet, atau HP</div>
      </div>
    </div>
  );
}
