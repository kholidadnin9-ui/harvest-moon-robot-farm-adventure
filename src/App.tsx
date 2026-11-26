import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { GameProvider, useGame } from "@/game/store";
import { ToastProvider, useToast } from "@/components/ui";
import { music, setSoundEnabled, sfx } from "@/game/audio";
import { TitleScreen } from "@/components/TitleScreen";
import { WorldScene } from "@/components/WorldScene";
import { WorldMap } from "@/components/WorldMap";
import { HUD, type PanelId } from "@/components/HUD";
import { Collection, Dashboard, HuntPanel, Inventory, Quests, Rewards } from "@/components/panels";
import { LevelComplete, MazeComplete, PauseMenu, Tutorial } from "@/components/modals";
import { CardReveal } from "@/components/CardReveal";
import { LEVELS, REWARDS } from "@/game/data";
import { canLevelUp } from "@/game/logic";
import type { DrawResult } from "@/game/types";
import { worldBus, type MazeDone } from "@/engine/engine";

function Game() {
  const { state, dispatch, paused, setPaused } = useGame();
  const toast = useToast();
  const [screen, setScreen] = useState<"title" | "game">("title");
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [card, setCard] = useState<DrawResult | null>(null);
  const [levelModal, setLevelModal] = useState(false);
  const [mazeDone, setMazeDone] = useState<MazeDone | null>(null);
  const [epoch, setEpoch] = useState(0);
  const prevPoints = useRef(state.points);
  const readyRef = useRef(false);

  useEffect(() => {
    setSoundEnabled(state.sound);
    if (state.sound && screen === "game" && !paused) music.start();
    else music.stop();
  }, [state.sound, screen, paused]);

  // Reward tier notifications
  useEffect(() => {
    const before = prevPoints.current;
    const after = state.points;
    if (after > before) {
      for (const r of REWARDS) {
        if (before < r.points && after >= r.points) {
          toast(`Gelar baru: ${r.emoji} ${r.title}! Hadiah terbuka di menu REWARD`, "🏆", "gold");
          sfx.levelUp();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ["#fbbf24", "#fde68a", "#f97316", "#ffffff"] });
        }
      }
    }
    prevPoints.current = after;
  }, [state.points, toast]);

  // Level-up availability notification
  useEffect(() => {
    const r = canLevelUp(state);
    if (r && !readyRef.current && screen === "game") {
      toast("Semua misi selesai! Tekan tombol NAIK LEVEL 🎉", "🏆", "gold");
      sfx.mission();
    }
    readyRef.current = r;
  }, [state, screen, toast]);

  // ESC = close panel / pause
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || screen !== "game") return;
      if (panel) setPanel(null);
      else if (!card && !levelModal && !mazeDone) setPaused(!paused);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [screen, panel, paused, card, levelModal, mazeDone, setPaused]);

  const resetGame = () => {
    worldBus.engine?.discard();
    dispatch({ type: "RESET" });
    setEpoch((e) => e + 1);
    setPaused(false);
    setPanel(null);
    setCard(null);
    setLevelModal(false);
    setMazeDone(null);
  };

  if (screen === "title") {
    return (
      <TitleScreen
        hasSave={state.started}
        onStart={() => {
          dispatch({ type: "START" });
          setPaused(false);
          setScreen("game");
        }}
        onNew={() => {
          resetGame();
          setScreen("game");
        }}
      />
    );
  }

  const active = !panel && !card && !paused && !levelModal && !mazeDone && state.tutorialSeen;
  const open = (p: PanelId) => setPanel(p);
  const close = () => setPanel(null);
  const openLevelUp = () => {
    setPanel(null);
    setLevelModal(true);
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-black font-body">
      <WorldScene
        key={epoch}
        active={active}
        onCard={setCard}
        onOpenMap={() => open("map")}
        onMazeDone={(d) => {
          setMazeDone(d);
          if (d.card) setCard(d.card);
        }}
      />
      <HUD onOpen={open} onPause={() => setPaused(true)} onLevelUp={openLevelUp} />

      {panel === "dashboard" && <Dashboard onClose={close} onOpen={open} onLevelUp={openLevelUp} />}
      {panel === "quest" && <Quests onClose={close} onLevelUp={openLevelUp} />}
      {panel === "inventory" && <Inventory onClose={close} />}
      {panel === "map" && <WorldMap onClose={close} />}
      {panel === "collection" && <Collection onClose={close} />}
      {panel === "hunt" && <HuntPanel onClose={close} onOpen={open} />}
      {panel === "rewards" && <Rewards onClose={close} />}

      {mazeDone && !card && (
        <MazeComplete
          data={mazeDone}
          onExit={() => {
            setMazeDone(null);
            worldBus.engine?.exitMaze();
          }}
          onStay={() => setMazeDone(null)}
        />
      )}

      {card && (
        <CardReveal
          result={card}
          onClose={() => {
            const legendary = card.card.rarity === "legendary" || card.mystery?.card?.rarity === "legendary";
            setCard(null);
            if (legendary) worldBus.engine?.celebrate();
          }}
        />
      )}

      {levelModal && (
        <LevelComplete
          onContinue={() => {
            const next = LEVELS[state.level];
            dispatch({ type: "LEVEL_UP" });
            setLevelModal(false);
            if (next) toast(`Level ${next.level}: ${next.name} dimulai! ${next.unlockText ? `🔓 ${next.unlockText}` : ""}`, next.emoji, "gold");
            else toast("Kamu adalah Legend of Harvest! Lanjutkan bermain bebas 👑", "👑", "gold");
          }}
        />
      )}

      {paused && (
        <PauseMenu
          onResume={() => setPaused(false)}
          onRestart={resetGame}
          onTitle={() => {
            setPaused(false);
            setPanel(null);
            setScreen("title");
          }}
        />
      )}

      {!state.tutorialSeen && !paused && <Tutorial onDone={() => dispatch({ type: "TUTORIAL_SEEN" })} />}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <ToastProvider>
        <Game />
      </ToastProvider>
    </GameProvider>
  );
}
