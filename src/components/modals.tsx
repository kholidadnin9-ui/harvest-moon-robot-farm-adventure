import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { useGame } from "@/game/store";
import { CARDS, LEVELS, ROBI_IMG } from "@/game/data";
import { worldBus, type MazeDone } from "@/engine/engine";
import { MAZES } from "@/engine/world";
import { currentLevel, levelMissions } from "@/game/logic";
import { sfx } from "@/game/audio";
import { GButton, Overlay, Panel, fmtTime } from "./ui";

/* ================= Pause ================= */
export function PauseMenu({ onResume, onRestart, onTitle }: { onResume: () => void; onRestart: () => void; onTitle: () => void }) {
  const { state, dispatch } = useGame();
  const [confirm, setConfirm] = useState(false);
  return (
    <Overlay z="z-[75]" className="bg-slate-950/70">
      <Panel title="JEDA" icon="⏸" className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <img src={ROBI_IMG} alt="ROBI" className="h-28 object-contain drop-shadow-xl anim-bob" />
          <div className="font-game font-bold text-amber-900 mt-1">ROBI sedang beristirahat...</div>
          <div className="text-xs text-amber-800/80">
            ⭐ {state.points} poin • 🪙 {state.coins} koin • ⏱ {fmtTime(state.playTime)}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <GButton variant="green" size="lg" onClick={onResume}>
            ▶ LANJUTKAN
          </GButton>
          <GButton variant="blue" onClick={() => dispatch({ type: "TOGGLE_SOUND" })}>
            {state.sound ? "🔊 Suara: AKTIF" : "🔇 Suara: MATI"}
          </GButton>
          {!confirm ? (
            <GButton variant="red" onClick={() => setConfirm(true)}>
              🔄 ULANG PERMAINAN
            </GButton>
          ) : (
            <div className="rounded-xl bg-red-50 border-2 border-red-300 p-2 text-center">
              <div className="text-sm font-bold text-red-800 mb-2">Semua progres akan dihapus. Yakin?</div>
              <div className="flex gap-2 justify-center">
                <GButton size="sm" variant="red" onClick={onRestart}>
                  Ya, ulang dari awal
                </GButton>
                <GButton size="sm" variant="wood" onClick={() => setConfirm(false)}>
                  Batal
                </GButton>
              </div>
            </div>
          )}
          <GButton
            variant="gold"
            onClick={() => {
              worldBus.engine?.goHome();
              onResume();
            }}
          >
            🏡 Pulang ke Rumah (jika tersesat)
          </GButton>
          <GButton variant="wood" onClick={onTitle}>
            🏠 Ke Halaman Judul
          </GButton>
          <div className="text-[11px] text-center text-amber-800/70">Progres tersimpan otomatis di perangkat ini.</div>
        </div>
      </Panel>
    </Overlay>
  );
}

/* ================= Level complete ================= */
export function LevelComplete({ onContinue }: { onContinue: () => void }) {
  const { state } = useGame();
  const lvl = currentLevel(state);
  const next = LEVELS[state.level] || null;
  const isFinal = state.level >= 5;
  const missions = levelMissions(state.level);
  useEffect(() => {
    sfx.levelUp();
    const burst = () =>
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#ffffff"] });
    burst();
    const t = window.setTimeout(burst, 700);
    const t2 = window.setTimeout(burst, 1500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, []);
  return (
    <Overlay z="z-[75]" className="bg-slate-950/70">
      <Panel className="w-full max-w-lg">
        <div className="text-center">
          <div className="font-game font-black text-3xl sm:text-4xl bg-gradient-to-b from-yellow-300 to-orange-600 bg-clip-text text-transparent [filter:drop-shadow(0_2px_0_#7c2d12)]">
            {isFinal ? "🏆 LEGEND OF HARVEST! 🏆" : "🎉 LEVEL SELESAI! 🎉"}
          </div>
          <img src={ROBI_IMG} alt="ROBI" className="h-36 mx-auto object-contain drop-shadow-xl anim-bob mt-2" />
          <div className="mt-1 font-game font-bold text-xl text-amber-900">
            Level {state.level}: {lvl.name} {lvl.emoji}
          </div>
          <div className="text-sm text-amber-800">
            {isFinal
              ? "ROBI telah menjadi Legenda Panen! Seluruh dunia pertanian bersorak. Kamu masih bisa terus bermain, berburu kartu, dan melengkapi koleksi."
              : "Semua misi tuntas dan target poin tercapai. Kerja hebat, petani robot!"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-xl bg-white/70 border-2 border-amber-300 p-2 text-xs font-bold text-slate-800">
              ⭐ Total poin: {state.points}
              <br />🪙 Koin: {state.coins}
              <br />🎴 Kartu: {Object.keys(state.collection).length}/{CARDS.length}
            </div>
            <div className="rounded-xl bg-white/70 border-2 border-amber-300 p-2 text-xs font-bold text-slate-800">
              Misi selesai:
              <ul className="font-normal">
                {missions.map((m) => (
                  <li key={m.id}>✅ {m.title}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-emerald-100 border-2 border-emerald-400 p-2 text-sm font-bold text-emerald-900">Bonus naik level: +{40 * state.level} koin!</div>
          {next && (
            <div className="mt-2 rounded-xl bg-slate-800 text-white p-3 text-left">
              <div className="font-game font-bold">
                Selanjutnya: Level {next.level} — {next.name} {next.emoji}
              </div>
              <div className="text-xs text-slate-300">{next.desc}</div>
              {next.unlockText && <div className="text-xs text-amber-300 font-bold mt-1">🔓 Terbuka: {next.unlockText}</div>}
            </div>
          )}
          <GButton variant="gold" size="lg" className="mt-4 w-full" onClick={onContinue}>
            {isFinal ? "👑 Lanjutkan Petualangan Bebas" : `▶ Lanjut ke Level ${state.level + 1}`}
          </GButton>
        </div>
      </Panel>
    </Overlay>
  );
}

/* ================= Tutorial ================= */
export function Tutorial({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: "👋", title: "Halo, aku ROBI!", text: "Selamat datang di Robot Farm Adventure! Sekarang dunia pertanian ini TERBUKA — kamu bebas berjalan ke mana saja: kebun, peternakan, padang bunga, sungai, hutan, dan 3 labirin!" },
    { icon: "🕹️", title: "Kontrol Gerak", text: "Laptop: WASD / tombol panah untuk berjalan (bisa diagonal), SHIFT lari, SPACE lompat. HP: geser JOYSTICK di kiri bawah, tombol RUN & JUMP di kanan bawah." },
    { icon: "🤝", title: "Interaksi & Alat", text: "Dekati objek sampai muncul label kuning, lalu tekan E / tombol INTERACT: menanam, memanen, memberi makan, membuka peti, membaca papan. F / TOOL untuk menyiram dan memotong semak berduri." },
    { icon: "🌽", title: "Labirin & Rintangan", text: "Masuki labirin lewat gerbangnya. Lompati pagar pendek bergaris, dorong batu ke lubang, cari kunci 🗝️ untuk gerbang, dan temukan peti hadiah 🏆 di ujung jalan. Tersesat? Tombol 🚪 Keluar selalu ada." },
    { icon: "🗺️", title: "Peta & Misi", text: "Minimap di pojok menunjukkan posisi ROBI. Tombol MAP membuka peta besar — area berkabut belum dijelajahi. Buka QUEST untuk misi. Mulai dari kebun di timur rumah atau Maze 1 di barat laut!" },
  ];
  const s = steps[step];
  return (
    <Overlay z="z-[72]">
      <Panel className="w-full max-w-md">
        <div className="flex items-start gap-3">
          <img src={ROBI_IMG} alt="ROBI" className="h-28 object-contain drop-shadow-xl anim-bob shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-3xl">{s.icon}</div>
            <div className="font-game font-black text-xl text-amber-900">{s.title}</div>
            <div className="text-sm text-slate-700 mt-1 leading-snug">{s.text}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${i === step ? "bg-amber-500" : "bg-amber-200"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <GButton size="sm" variant="wood" onClick={onDone}>
              Lewati
            </GButton>
            <GButton
              size="sm"
              variant="green"
              onClick={() => {
                sfx.click();
                if (step < steps.length - 1) setStep(step + 1);
                else onDone();
              }}
            >
              {step < steps.length - 1 ? "Lanjut →" : "Ayo Mulai! 🚀"}
            </GButton>
          </div>
        </div>
      </Panel>
    </Overlay>
  );
}

/* ================= Maze complete ================= */
export function MazeComplete({ data, onExit, onStay }: { data: MazeDone; onExit: () => void; onStay: () => void }) {
  const { state } = useGame();
  const m = MAZES[data.idx];
  const rec = state.world.mazes[m.id];
  useEffect(() => {
    sfx.levelUp();
    const burst = () => confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#ffffff"] });
    burst();
    const t = window.setTimeout(burst, 800);
    return () => window.clearTimeout(t);
  }, []);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  return (
    <Overlay z="z-[74]" className="bg-slate-950/70">
      <Panel className="w-full max-w-md">
        <div className="text-center" data-testid="maze-complete">
          <div className="font-game font-black text-3xl bg-gradient-to-b from-yellow-300 to-orange-600 bg-clip-text text-transparent [filter:drop-shadow(0_2px_0_#7c2d12)]">🏆 LABIRIN TAKLUK! 🏆</div>
          <img src={ROBI_IMG} alt="ROBI" className="h-32 mx-auto object-contain drop-shadow-xl anim-bob mt-1" />
          <div className="font-game font-bold text-xl text-amber-900">
            {m.icon} Maze {m.idx + 1}: {m.name}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold text-slate-800">
            <div className="rounded-xl bg-white/75 border-2 border-amber-300 p-2">
              ⏱ Waktu
              <div className="font-game text-lg text-amber-800">{fmt(data.time)}</div>
            </div>
            <div className="rounded-xl bg-white/75 border-2 border-amber-300 p-2">
              🎴 Kartu
              <div className="font-game text-lg text-amber-800">
                {data.found}/{data.total}
              </div>
            </div>
            <div className="rounded-xl bg-white/75 border-2 border-amber-300 p-2">
              🥇 Terbaik
              <div className="font-game text-lg text-amber-800">{fmt(rec?.best ?? data.time)}</div>
            </div>
          </div>
          <div className="mt-2 rounded-xl bg-emerald-100 border-2 border-emerald-400 p-2 text-sm font-bold text-emerald-900">
            {data.first ? `Hadiah labirin: +${data.reward} poin & +${Math.round(data.reward / 5)} koin` : `Bonus ulang: +${data.reward} poin`}
            {data.card && <div className="text-xs font-semibold">+ Kartu khusus MAZE ★ “{data.card.card.name}” (+{data.card.points} poin)</div>}
          </div>
          {data.found < data.total && <div className="mt-2 text-xs text-amber-800 font-semibold">Masih ada {data.total - data.found} kartu tersembunyi di labirin ini — jelajahi jalan buntunya!</div>}
          <div className="mt-3 flex gap-2">
            <GButton variant="gold" size="md" className="flex-1" onClick={onExit}>
              🚪 Keluar Labirin
            </GButton>
            <GButton variant="wood" size="md" className="flex-1" onClick={onStay}>
              🔍 Jelajah Lagi
            </GButton>
          </div>
        </div>
      </Panel>
    </Overlay>
  );
}
