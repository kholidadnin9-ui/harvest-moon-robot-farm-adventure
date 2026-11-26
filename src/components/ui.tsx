import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/* ---------------- Panel ---------------- */
export function Panel({
  title,
  icon,
  onClose,
  children,
  className,
  bodyClass,
  headerExtra,
}: {
  title?: string;
  icon?: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
  headerExtra?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-3xl border-4 border-amber-900/80 wood-panel shadow-[0_24px_70px_rgba(0,0,0,.55),inset_0_0_0_3px_rgba(255,255,255,.55)] overflow-hidden anim-pop",
        className,
      )}
    >
      {title && (
        <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 text-amber-50 border-b-4 border-amber-950/50 shrink-0">
          {icon && <span className="text-2xl drop-shadow">{icon}</span>}
          <h2 className="font-game text-lg sm:text-2xl font-bold tracking-wide drop-shadow-[0_2px_0_rgba(0,0,0,.35)] truncate">{title}</h2>
          {headerExtra}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="ml-auto w-9 h-9 rounded-full bg-red-500 hover:bg-red-400 border-b-4 border-red-800 active:border-b-0 active:translate-y-0.5 text-white font-bold shadow"
            >
              ✕
            </button>
          )}
        </div>
      )}
      <div className={cn("p-3 sm:p-5 overflow-y-auto scrollbar-thin min-h-0", bodyClass)}>{children}</div>
    </div>
  );
}

/* ---------------- Button ---------------- */
type Variant = "green" | "gold" | "blue" | "red" | "wood" | "purple" | "ghost" | "dark";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<Variant, string> = {
  green: "bg-gradient-to-b from-lime-300 to-green-600 border-green-900 text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]",
  gold: "bg-gradient-to-b from-yellow-200 to-amber-500 border-amber-800 text-amber-950",
  blue: "bg-gradient-to-b from-sky-300 to-blue-600 border-blue-900 text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]",
  red: "bg-gradient-to-b from-rose-300 to-red-600 border-red-900 text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]",
  wood: "bg-gradient-to-b from-amber-100 to-amber-300 border-amber-700 text-amber-950",
  purple: "bg-gradient-to-b from-fuchsia-300 to-purple-600 border-purple-950 text-white [text-shadow:0_1px_2px_rgba(0,0,0,.45)]",
  ghost: "bg-white/15 hover:bg-white/25 border-white/30 text-white backdrop-blur [text-shadow:0_1px_2px_rgba(0,0,0,.6)]",
  dark: "bg-gradient-to-b from-slate-600 to-slate-900 border-black text-white",
};
const SIZES: Record<Size, string> = {
  xs: "px-2.5 py-1 text-xs rounded-lg border-b-[3px]",
  sm: "px-3 py-1.5 text-sm rounded-xl border-b-4",
  md: "px-5 py-2.5 text-base rounded-2xl border-b-4",
  lg: "px-7 py-3 text-lg rounded-2xl border-b-[5px]",
  xl: "px-9 sm:px-12 py-4 text-xl sm:text-2xl rounded-3xl border-b-[6px]",
};

export function GButton({
  variant = "green",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={cn(
        "font-game font-bold tracking-wide inline-flex items-center justify-center gap-2 select-none shadow-lg transition-all duration-100",
        "hover:brightness-110 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:translate-y-0 disabled:active:border-b-4",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- Progress bar ---------------- */
export function Bar({
  value,
  max,
  color = "from-lime-300 via-green-400 to-emerald-600",
  label,
  className,
  height = "h-4",
  showText = true,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
  className?: string;
  height?: string;
  showText?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className={cn("w-full", className)}>
      {label && <div className="text-xs font-bold text-amber-900/80 mb-1">{label}</div>}
      <div className={cn("relative w-full rounded-full bg-slate-900/40 border-2 border-black/30 overflow-hidden shadow-inner", height)}>
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", color)} style={{ width: `${pct}%` }}>
          <div className="h-1/2 w-full bg-white/30 rounded-full" />
        </div>
        {showText && (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-black text-white text-outline-sm leading-none">
            {Math.min(value, max)} / {max}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Overlay ---------------- */
export function Overlay({ children, onClose, className, z = "z-50" }: { children: ReactNode; onClose?: () => void; className?: string; z?: string }) {
  return (
    <div
      className={cn("fixed inset-0 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-[3px]", z, className)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Stat chip ---------------- */
export function Chip({ icon, value, label, className }: { icon: string; value: ReactNode; label?: string; className?: string }) {
  return (
    <div className={cn("console-chip rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 text-white", className)}>
      <span className="text-base sm:text-xl drop-shadow">{icon}</span>
      <div className="leading-tight">
        <div className="font-game font-bold text-sm sm:text-lg tabular-nums leading-none">{value}</div>
        {label && <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-amber-200/80 leading-none mt-0.5">{label}</div>}
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */
interface Toast {
  id: number;
  msg: string;
  icon?: string;
  tone?: "info" | "good" | "bad" | "gold";
}
const ToastCtx = createContext<{ toast: (msg: string, icon?: string, tone?: Toast["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);
  const toast = useCallback((msg: string, icon?: string, tone: Toast["tone"] = "info") => {
    const id = idRef.current++;
    setToasts((t) => [...t.slice(-4), { id, msg, icon, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-[150px] sm:top-[112px] -translate-x-1/2 z-[80] flex flex-col items-center gap-2 w-[min(92vw,420px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "anim-pop flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-xl font-bold text-sm sm:text-base text-white backdrop-blur",
              t.tone === "good" && "bg-emerald-600/90 border-emerald-200/70",
              t.tone === "bad" && "bg-rose-600/90 border-rose-200/70",
              t.tone === "gold" && "bg-amber-500/95 border-yellow-100 text-amber-950",
              (!t.tone || t.tone === "info") && "bg-slate-800/90 border-amber-300/60",
            )}
          >
            {t.icon && <span className="text-xl">{t.icon}</span>}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx.toast;
}

/* ---------------- Misc ---------------- */
export function useNow(interval = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
