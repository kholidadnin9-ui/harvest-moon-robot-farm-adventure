import { useEffect, useRef } from "react";
import { useGame } from "@/game/store";
import { worldBus } from "@/engine/engine";
import { drawWorldMap, decodeExplored, isExplored } from "@/engine/mapview";
import { H, MAZES, PLACES, T, W } from "@/engine/world";
import { sfx } from "@/game/audio";
import { GButton, Overlay, Panel, fmtTime, useToast } from "./ui";
import { cn } from "@/utils/cn";

export function WorldMap({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const toast = useToast();
  const ref = useRef<HTMLCanvasElement>(null);
  const stRef = useRef(state);
  stRef.current = state;
  const eng = worldBus.engine;
  const explored = eng ? eng.getExplored() : decodeExplored(state.world.explored);
  let seen = 0;
  for (let i = 0; i < explored.length; i++) seen += explored[i];
  const pct = Math.round((seen / explored.length) * 100);

  useEffect(() => {
    let raf = 0;
    const draw = (now: number) => {
      const cv = ref.current;
      const e = worldBus.engine;
      if (cv) {
        const ctx = cv.getContext("2d");
        const ex = e ? e.getExplored() : decodeExplored(stRef.current.world.explored);
        if (ctx) drawWorldMap(ctx, cv.width, cv.height, ex, e ? e.px : stRef.current.world.x, e ? e.py : stRef.current.world.y, stRef.current, now / 1000);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (id: string, name: string) => {
    worldBus.engine?.travel(id);
    sfx.travel();
    toast(`Fast travel ke ${name}`, "🧭", "good");
    onClose();
  };

  return (
    <Overlay onClose={onClose}>
      <Panel title="MAP — Peta Dunia Pertanian" icon="🗺️" onClose={onClose} className="w-full max-w-6xl max-h-[96dvh]" headerExtra={<span className="ml-auto mr-2 font-game font-bold text-amber-100 text-sm whitespace-nowrap">🧭 {pct}% dijelajahi</span>}>
        <div className="grid lg:grid-cols-[1fr_300px] gap-3">
          <div>
            <div className="rounded-2xl overflow-hidden border-4 border-amber-900/70 bg-slate-800 shadow-inner">
              <canvas ref={ref} width={W * 8} height={H * 8} className="block w-full h-auto" data-testid="bigmap" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-amber-900">
              <span>🔵 ROBI</span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rotate-45 bg-fuchsia-500 mr-1" />
                Pintu labirin
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 bg-orange-500 mr-1" />
                Peti harta
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-200 border border-amber-700 mr-1" />
                Benda tersembunyi
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 bg-sky-500 mr-1" />
                Sungai
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 bg-amber-200 border border-amber-500 mr-1" />
                Jalan setapak
              </span>
              <span>
                <span className="inline-block w-2.5 h-2.5 bg-slate-400 mr-1" />
                Kabut = belum dijelajahi
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="font-game font-bold text-amber-900">🧭 Fast Travel</div>
            <div className="text-[11px] text-amber-800 -mt-1">Lokasi terbuka setelah ROBI menjelajahinya dengan berjalan.</div>
            {PLACES.map((p) => {
              const maze = MAZES.find((m) => m.id === p.id);
              const known = p.id === "home" || isExplored(explored, p.tx, p.ty);
              const rec = maze ? state.world.mazes[maze.id] : undefined;
              const lockedLv = maze && state.level < maze.level;
              return (
                <div key={p.id} className={cn("rounded-xl border-2 p-2 flex items-center gap-2", known ? "bg-white/85 border-amber-300" : "bg-slate-200/80 border-slate-300")}>
                  <div className={cn("text-2xl", !known && "grayscale opacity-50")}>{known ? p.icon : "❔"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-800 truncate">{known ? p.name : "Belum ditemukan"}</div>
                    {maze && known && (
                      <div className="text-[10px] text-slate-600">
                        {rec?.done ? `✅ Selesai • terbaik ${fmtTime(rec.best)}` : lockedLv ? `🔒 Butuh Level ${maze.level}` : `${maze.diff} • hadiah ${maze.reward} poin`}
                      </div>
                    )}
                  </div>
                  <GButton size="xs" variant={known ? "blue" : "dark"} disabled={!known} onClick={() => go(p.id, p.name)}>
                    Pergi
                  </GButton>
                </div>
              );
            })}
            <div className="text-[10px] text-amber-800">Posisi ROBI: petak ({eng ? Math.floor(eng.px / T) : "-"}, {eng ? Math.floor(eng.py / T) : "-"})</div>
          </div>
        </div>
      </Panel>
    </Overlay>
  );
}
