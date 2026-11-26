import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "@/game/store";
import { CROPS, CROP_ORDER } from "@/game/data";
import { drawCard, luckOf } from "@/game/logic";
import type { CropId, DrawResult } from "@/game/types";
import { sfx } from "@/game/audio";
import { Engine, worldBus, type EngineHost, type MazeDone, type MazeHud, type Prompt } from "@/engine/engine";
import { MAZES, things, type Region } from "@/engine/world";
import { Fishing } from "./Fishing";
import { GButton, fmtTime, useToast } from "./ui";
import { cn } from "@/utils/cn";

/* ---------------- virtual joystick (touch + mouse, diagonal) ---------------- */
function Joystick({ onMove, faded }: { onMove: (x: number, y: number) => void; faded: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const update = (e: RPointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    setKnob({ x: dx, y: dy });
    if (m < 0.2) onMove(0, 0);
    else onMove(dx, dy);
  };
  const end = (e: RPointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };
  return (
    <div
      ref={base}
      data-testid="joystick"
      className={cn("relative w-[116px] h-[116px] sm:w-[132px] sm:h-[132px] rounded-full touch-none select-none transition-opacity", faded && pid.current === null ? "opacity-45 hover:opacity-90" : "opacity-95")}
      style={{ background: "radial-gradient(circle, rgba(15,23,42,.35) 0%, rgba(15,23,42,.6) 70%)", border: "3px solid rgba(253,224,71,.65)", boxShadow: "0 6px 18px rgba(0,0,0,.35), inset 0 0 18px rgba(255,255,255,.12)" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        pid.current = e.pointerId;
        update(e);
      }}
      onPointerMove={(e) => pid.current === e.pointerId && update(e)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {["▲", "▶", "▼", "◀"].map((a, i) => (
        <span key={a} className="absolute text-white/60 text-[10px] pointer-events-none" style={{ left: `${50 + [0, 40, 0, -40][i]}%`, top: `${50 + [-40, 0, 40, 0][i]}%`, transform: "translate(-50%,-50%)" }}>
          {a}
        </span>
      ))}
      <div
        className="absolute w-[46%] h-[46%] rounded-full pointer-events-none"
        style={{
          left: `${27 + knob.x * 27}%`,
          top: `${27 + knob.y * 27}%`,
          background: "radial-gradient(circle at 35% 30%, #7cc4ff, #2563eb 70%)",
          border: "3px solid #fde047",
          boxShadow: "0 4px 10px rgba(0,0,0,.45)",
        }}
      />
    </div>
  );
}

function PadBtn({ label, icon, hint, onPress, active, color, testid }: { label: string; icon: string; hint: string; onPress: () => void; active?: boolean; color: string; testid: string }) {
  return (
    <button
      data-testid={testid}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      className={cn(
        "relative w-[54px] h-[54px] sm:w-[60px] sm:h-[60px] rounded-full border-[3px] text-white font-game font-bold shadow-lg touch-none select-none active:scale-90 transition-transform flex flex-col items-center justify-center leading-none",
        active ? "border-yellow-200 ring-4 ring-yellow-300/60" : "border-white/60",
      )}
      style={{ background: color }}
    >
      <span className="text-lg sm:text-xl">{icon}</span>
      <span className="text-[8px] sm:text-[9px] tracking-wide mt-0.5">{label}</span>
      <span className="hidden md:block absolute -top-2 -right-1 px-1 rounded bg-slate-900 text-[9px] text-amber-200 border border-amber-300/50">{hint}</span>
    </button>
  );
}

export function WorldScene({ active, onCard, onMazeDone, onOpenMap }: { active: boolean; onCard: (r: DrawResult) => void; onMazeDone: (d: MazeDone) => void; onOpenMap: () => void }) {
  const { state, dispatch } = useGame();
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const engRef = useRef<Engine | null>(null);
  const live = useRef({ state, dispatch, toast, onCard, onMazeDone });
  live.current = { state, dispatch, toast, onCard, onMazeDone };

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [banner, setBanner] = useState(0);
  const [maze, setMaze] = useState<MazeHud | null>(null);
  const [seedPicker, setSeedPicker] = useState<number | null>(null);
  const [fishing, setFishing] = useState(false);
  const [run, setRun] = useState(false);
  const [touch] = useState(() => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window));

  useEffect(() => {
    const host: EngineHost = {
      getState: () => live.current.state,
      dispatch: (a) => live.current.dispatch(a),
      toast: (m, i, t) => live.current.toast(m, i, t),
      onCard: (r) => live.current.onCard(r),
      onPrompt: setPrompt,
      onRegion: (r) => {
        setRegion(r);
        setBanner((n) => n + 1);
      },
      onSeedPicker: setSeedPicker,
      onFishing: () => setFishing(true),
      onMaze: setMaze,
      onMazeDone: (d) => live.current.onMazeDone(d),
    };
    const eng = new Engine(canvasRef.current!, host);
    eng.minimap = miniRef.current;
    engRef.current = eng;
    worldBus.engine = eng;
    Object.assign(window, { __robi: eng, __world: { things, MAZES } });
    return () => {
      eng.destroy();
      engRef.current = null;
      if (worldBus.engine === eng) worldBus.engine = null;
    };
  }, []);

  useEffect(() => {
    engRef.current?.setActive(active && seedPicker === null && !fishing);
  }, [active, seedPicker, fishing]);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(0), 2600);
    return () => window.clearTimeout(t);
  }, [banner]);

  const plant = (i: number, crop: CropId) => {
    dispatch({ type: "PLANT", plot: i, crop });
    sfx.plant();
    setSeedPicker(null);
    engRef.current?.emote("interact", 0.7);
    toast(`${CROPS[crop].name} ditanam! Siram dengan E atau F 💧`, "🌱", "good");
  };

  return (
    <div className="absolute inset-0 overflow-hidden select-none bg-emerald-800">
      <canvas ref={canvasRef} data-testid="world-canvas" className="absolute inset-0 w-full h-full block touch-none" />

      {/* region banner */}
      <AnimatePresence>
        {banner > 0 && region && (
          <motion.div
            key={region.id}
            initial={{ opacity: 0, y: -18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute left-1/2 top-[24%] -translate-x-1/2 z-20 text-center w-[92vw]"
          >
            <div className="font-game text-3xl sm:text-5xl font-black text-white text-outline tracking-wide">
              {region.icon} {region.name}
            </div>
            <div className="mt-1 inline-block px-3 py-1 rounded-full bg-black/50 text-amber-100 text-xs sm:text-sm font-bold">{region.desc}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* minimap */}
      <button
        onClick={() => {
          sfx.click();
          onOpenMap();
        }}
        className="absolute right-2 top-[154px] sm:right-3 sm:top-[74px] z-30 rounded-xl overflow-hidden border-[3px] border-amber-300/80 shadow-xl bg-slate-900/80 active:scale-95 transition-transform"
        title="Buka peta besar"
        data-testid="minimap"
      >
        <canvas ref={miniRef} width={132} height={99} className="block w-[104px] h-[78px] sm:w-[148px] sm:h-[111px]" style={{ imageRendering: "pixelated" }} />
        <div className="absolute inset-x-0 bottom-0 bg-slate-900/75 text-[9px] sm:text-[10px] text-amber-100 font-bold px-1 py-0.5 truncate text-center">
          {region ? `${region.icon} ${region.name}` : "🗺️ MAP"}
        </div>
      </button>

      {/* maze HUD */}
      {maze && (
        <div className="absolute left-2 top-[104px] sm:left-1/2 sm:-translate-x-1/2 sm:top-[66px] z-30 console-chip rounded-2xl px-3 py-1.5 text-white flex items-center gap-2 sm:gap-3 text-[11px] sm:text-sm font-bold max-w-[62vw] sm:max-w-none" data-testid="maze-hud">
          <span className="font-game text-amber-300 truncate">
            {maze.icon} {maze.name}
          </span>
          <span className="whitespace-nowrap">🎴 {maze.found}/{maze.total}</span>
          <span className="whitespace-nowrap">🗝️ {maze.keys}</span>
          <span className="whitespace-nowrap tabular-nums">⏱ {fmtTime(maze.time)}</span>
          <button
            onClick={() => {
              engRef.current?.exitMaze();
              toast("ROBI keluar dari labirin", "🚪");
            }}
            className="px-2 py-0.5 rounded-lg bg-rose-500 hover:bg-rose-400 border-b-2 border-rose-800 text-[10px] sm:text-xs whitespace-nowrap"
          >
            🚪 Keluar
          </button>
        </div>
      )}

      {/* seed picker */}
      {seedPicker !== null && (
        <div className="absolute inset-x-0 bottom-40 sm:bottom-44 z-40 flex justify-center px-2">
          <div className="wood-panel border-4 border-amber-900/70 rounded-2xl p-3 shadow-2xl anim-pop max-w-md w-full">
            <div className="font-game font-bold text-amber-900 text-center">Pilih bibit untuk ditanam 🌱</div>
            <div className="mt-2 flex gap-2 flex-wrap justify-center">
              {CROP_ORDER.map((c) => {
                const n = state.inventory.seeds[c];
                return (
                  <button
                    key={c}
                    disabled={n <= 0}
                    onClick={() => plant(seedPicker, c)}
                    className="flex flex-col items-center px-2 py-1.5 rounded-xl bg-white/80 border-2 border-amber-400 hover:bg-yellow-100 disabled:opacity-40 disabled:cursor-not-allowed shadow min-w-[62px]"
                  >
                    <img src={CROPS[c].image} alt={CROPS[c].name} className="w-9 h-9 object-contain" />
                    <span className="text-[11px] font-bold text-amber-900">{CROPS[c].name}</span>
                    <span className="text-[10px] font-black text-green-700">x{n}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-amber-800">Tumbuh dalam {CROP_ORDER.map((c) => CROPS[c].growTime).join("/")} detik</span>
              <GButton size="xs" variant="red" onClick={() => setSeedPicker(null)}>
                Batal
              </GButton>
            </div>
          </div>
        </div>
      )}

      {/* controls */}
      <div className="absolute left-2 bottom-2 sm:left-4 sm:bottom-4 z-30">
        <Joystick faded={!touch} onMove={(x, y) => engRef.current?.setJoy(x, y)} />
      </div>
      {!touch && (
        <div className="hidden md:block pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 z-20 px-3 py-1 rounded-full bg-slate-900/55 text-[11px] text-white/90 font-semibold whitespace-nowrap">
          WASD / ↑↓←→ gerak • SHIFT lari • SPACE lompat • E interaksi • F alat • ESC jeda
        </div>
      )}
      <div className="absolute right-2 bottom-2 sm:right-4 sm:bottom-4 z-30 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <PadBtn
            testid="btn-run"
            label={run ? "RUN ON" : "RUN"}
            icon="🏃"
            hint="⇧"
            active={run}
            color={run ? "linear-gradient(#fb923c,#c2410c)" : "linear-gradient(#64748b,#1e293b)"}
            onPress={() => {
              const v = !run;
              setRun(v);
              engRef.current?.setRun(v);
              sfx.click();
            }}
          />
          <PadBtn testid="btn-tool" label="TOOL" icon="🛠️" hint="F" color="linear-gradient(#4ade80,#15803d)" onPress={() => engRef.current?.tool()} />
          <PadBtn testid="btn-jump" label="JUMP" icon="⬆️" hint="␣" color="linear-gradient(#38bdf8,#1d4ed8)" onPress={() => engRef.current?.jump()} />
        </div>
        <button
          data-testid="btn-interact"
          disabled={!prompt}
          onPointerDown={(e) => {
            e.preventDefault();
            engRef.current?.interact();
          }}
          className={cn(
            "relative h-[52px] sm:h-[58px] min-w-[178px] sm:min-w-[196px] px-4 rounded-2xl border-b-[5px] font-game font-bold text-sm sm:text-base shadow-xl touch-none select-none transition-all active:translate-y-1 active:border-b-0",
            prompt ? "bg-gradient-to-b from-yellow-200 to-amber-500 border-amber-800 text-amber-950 anim-pulse-glow" : "bg-gradient-to-b from-slate-600 to-slate-900 border-black text-white/60",
          )}
          style={{ ["--glow" as string]: "rgba(253,224,71,.9)" }}
        >
          {prompt ? prompt.label : "INTERACT"}
          <span className="hidden md:block absolute -top-2 -right-1 px-1 rounded bg-slate-900 text-[9px] text-amber-200 border border-amber-300/50">E</span>
          {prompt?.tool && <span className="absolute -top-2 left-2 px-1.5 rounded bg-green-700 text-[9px] text-white border border-green-300/60">F: {prompt.tool}</span>}
        </button>
      </div>

      {fishing && (
        <Fishing
          onClose={() => setFishing(false)}
          onCatch={(size) => {
            dispatch({ type: "FISH", size });
            if (Math.random() < 0.15) {
              const result = drawCard("river", luckOf(live.current.state));
              dispatch({ type: "CARD_FOUND", result, loc: "river" });
              window.setTimeout(() => onCard(result), 700);
            }
          }}
        />
      )}
    </div>
  );
}
