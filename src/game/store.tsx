import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from "react";
import { SAVE_KEY, SAVE_VERSION } from "./data";
import { initialState, reducer, type Action } from "./logic";
import type { GameState } from "./types";

interface Ctx {
  state: GameState;
  dispatch: Dispatch<Action>;
  paused: boolean;
  setPaused: (v: boolean) => void;
}

const GameContext = createContext<Ctx | null>(null);

function loadState(): GameState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== SAVE_VERSION) return base;
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats || {}) },
      baseline: { ...base.baseline, ...(parsed.baseline || {}) },
      inventory: { ...base.inventory, ...(parsed.inventory || {}), seeds: { ...base.inventory.seeds, ...(parsed.inventory?.seeds || {}) } },
      hidden: { ...base.hidden, ...(parsed.hidden || {}) },
      hiddenTimer: { ...base.hiddenTimer, ...(parsed.hiddenTimer || {}) },
      world: { ...base.world, ...(parsed.world || {}) },
      daily: parsed.daily ? { ...parsed.daily, stats: { ...base.daily.stats, ...(parsed.daily.stats || {}) } } : base.daily,
    };
  } catch {
    return base;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const startedRef = useRef(state.started);
  startedRef.current = state.started;

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [state]);

  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(3, (now - last) / 1000);
      last = now;
      if (pausedRef.current || !startedRef.current || document.visibilityState !== "visible") return;
      dispatch({ type: "TICK", dt });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return <GameContext.Provider value={{ state, dispatch, paused, setPaused }}>{children}</GameContext.Provider>;
}

export function useGame(): Ctx {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
