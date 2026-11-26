import { useEffect, useRef, useState } from "react";
import { FISH, type FishSize } from "@/game/data";
import { sfx } from "@/game/audio";
import { GButton, Overlay, Panel } from "./ui";

type Phase = "ready" | "waiting" | "bite" | "reel" | "result" | "escaped";

export function Fishing({ onCatch, onClose }: { onCatch: (size: FishSize) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [size, setSize] = useState<FishSize>("small");
  const [pos, setPos] = useState(0);
  const dirRef = useRef(1);
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const timers = useRef<number[]>([]);
  const zoneStart = useRef(0.4);
  const [zone, setZone] = useState({ start: 0.4, width: 0.22 });

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => () => {
    clearTimers();
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    if (phase !== "reel") return;
    let last = performance.now();
    const speed = 1.6;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      posRef.current += dirRef.current * speed * dt;
      if (posRef.current >= 1) {
        posRef.current = 1;
        dirRef.current = -1;
      }
      if (posRef.current <= 0) {
        posRef.current = 0;
        dirRef.current = 1;
      }
      setPos(posRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  const cast = () => {
    sfx.splash();
    setPhase("waiting");
    const wait = 1500 + Math.random() * 2500;
    timers.current.push(
      window.setTimeout(() => {
        setPhase("bite");
        sfx.bite();
        timers.current.push(
          window.setTimeout(() => {
            setPhase((p) => (p === "bite" ? "escaped" : p));
          }, 1400),
        );
      }, wait),
    );
  };

  const hook = () => {
    clearTimers();
    const w = 0.16 + Math.random() * 0.12;
    zoneStart.current = 0.15 + Math.random() * (0.7 - w);
    setZone({ start: zoneStart.current, width: w });
    posRef.current = 0;
    dirRef.current = 1;
    setPhase("reel");
  };

  const grab = () => {
    cancelAnimationFrame(rafRef.current);
    const p = posRef.current;
    const z = zone;
    const center = z.start + z.width / 2;
    if (p < z.start || p > z.start + z.width) {
      sfx.error();
      setPhase("escaped");
      return;
    }
    const dist = Math.abs(p - center) / (z.width / 2);
    const s: FishSize = dist < 0.3 ? "big" : dist < 0.7 ? "medium" : "small";
    setSize(s);
    setPhase("result");
    sfx.harvest();
    onCatch(s);
  };

  const fish = FISH[size];

  return (
    <Overlay z="z-[60]" onClose={phase === "ready" || phase === "result" || phase === "escaped" ? onClose : undefined}>
      <Panel title="Memancing di River Side" icon="🎣" onClose={onClose} className="w-full max-w-md">
        <div className="relative h-44 rounded-2xl overflow-hidden border-4 border-sky-900/40 bg-gradient-to-b from-sky-300 via-sky-500 to-blue-800">
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute left-1/2 top-[55%] w-24 h-24 rounded-full border-2 border-white/60 anim-ripple" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
          <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 text-4xl anim-bobber">{phase === "ready" ? "🪝" : phase === "bite" ? "❗" : "🎈"}</div>
          {phase === "waiting" && <div className="absolute bottom-3 left-0 right-0 text-center text-white font-bold text-outline-sm animate-pulse">Menunggu ikan menggigit...</div>}
          {phase === "bite" && <div className="absolute bottom-3 left-0 right-0 text-center text-yellow-300 font-game font-black text-2xl text-outline-sm anim-pop">IKAN MENGGIGIT! TARIK!</div>}
          {phase === "result" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 anim-pop">
              <div className="text-6xl drop-shadow-xl">{fish.emoji}</div>
              <div className="text-white font-game font-black text-xl text-outline-sm">{fish.name}!</div>
              <div className="text-amber-300 font-bold text-outline-sm">+{fish.points} poin • +{fish.coins} koin</div>
            </div>
          )}
          {phase === "escaped" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 anim-pop">
              <div className="text-5xl">💨</div>
              <div className="text-white font-game font-black text-xl text-outline-sm">Ikannya kabur!</div>
            </div>
          )}
        </div>

        {phase === "reel" && (
          <div className="mt-3">
            <div className="text-center font-bold text-amber-900 text-sm mb-1">Tekan TANGKAP saat penanda di zona hijau!</div>
            <div className="relative h-8 rounded-full bg-slate-800 border-2 border-slate-900 overflow-hidden">
              <div className="absolute top-0 bottom-0 bg-gradient-to-r from-lime-400 via-green-400 to-lime-400" style={{ left: `${zone.start * 100}%`, width: `${zone.width * 100}%` }} />
              <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_white]" style={{ left: `calc(${pos * 100}% - 3px)` }} />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {phase === "ready" && (
            <GButton variant="blue" size="lg" onClick={cast}>
              🎣 LEMPAR KAIL
            </GButton>
          )}
          {phase === "waiting" && (
            <GButton variant="dark" size="lg" disabled>
              ... sabar ...
            </GButton>
          )}
          {phase === "bite" && (
            <GButton variant="red" size="lg" onClick={hook} className="animate-pulse">
              ❗ TARIK!
            </GButton>
          )}
          {phase === "reel" && (
            <GButton variant="green" size="xl" onClick={grab}>
              🐟 TANGKAP!
            </GButton>
          )}
          {(phase === "result" || phase === "escaped") && (
            <>
              <GButton variant="blue" size="lg" onClick={() => setPhase("ready")}>
                🎣 Pancing Lagi
              </GButton>
              <GButton variant="wood" size="lg" onClick={onClose}>
                Selesai
              </GButton>
            </>
          )}
        </div>
      </Panel>
    </Overlay>
  );
}
