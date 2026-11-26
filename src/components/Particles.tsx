import { useMemo } from "react";
import type { ParticleKind } from "@/game/types";

interface P {
  id: number;
  left: number;
  top: number;
  delay: number;
  dur: number;
  size: number;
  drift: number;
  v: number;
}

export function Particles({ kind, count = 14 }: { kind: ParticleKind; count?: number }) {
  const items = useMemo<P[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: -Math.random() * 14,
        dur: 9 + Math.random() * 9,
        size: 7 + Math.random() * 9,
        drift: (Math.random() * 2 - 1) * 160,
        v: Math.random(),
      })),
    [kind, count],
  );

  if (kind === "leaves" || kind === "petals" || kind === "hay") {
    const shape = kind === "leaves" ? "leaf-shape" : kind === "petals" ? "petal-shape" : "hay-shape";
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {items.map((p) => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: `${p.left}%`,
              top: 0,
              animation: `leafFall ${p.dur}s linear ${p.delay}s infinite`,
              ["--drift" as string]: `${p.drift}px`,
            }}
          >
            <div
              className={shape}
              style={{
                width: kind === "hay" ? p.size * 1.6 : p.size,
                height: kind === "hay" ? p.size * 0.28 : p.size,
                opacity: 0.85,
                animation: `leafSway ${2 + p.v * 2}s ease-in-out ${p.delay}s infinite`,
                filter: kind === "petals" && p.v > 0.6 ? "hue-rotate(-30deg) brightness(1.2)" : undefined,
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (kind === "fireflies") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {items.map((p) => (
          <div
            key={p.id}
            className="absolute firefly-dot"
            style={{
              left: `${p.left}%`,
              top: `${20 + p.top * 0.75}%`,
              width: p.size * 0.9,
              height: p.size * 0.9,
              animation: `firefly ${4 + p.v * 5}s ease-in-out ${p.delay}s infinite`,
              boxShadow: "0 0 12px 4px rgba(190,242,100,0.5)",
            }}
          />
        ))}
      </div>
    );
  }

  if (kind === "sparkles") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {items.map((p) => (
          <div
            key={p.id}
            className="absolute text-white anim-twinkle drop-shadow-[0_0_6px_rgba(255,255,255,.9)]"
            style={{
              left: `${p.left}%`,
              top: `${35 + p.top * 0.5}%`,
              fontSize: p.size * 0.9,
              animationDelay: `${p.delay}s`,
              animationDuration: `${1.2 + p.v * 1.6}s`,
              opacity: 0.8,
            }}
          >
            ✦
          </div>
        ))}
      </div>
    );
  }

  // butterflies
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.slice(0, Math.min(count, 7)).map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left * 0.8}%`,
            top: `${25 + p.top * 0.5}%`,
            animation: `butterfly ${7 + p.v * 6}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <div style={{ fontSize: 14 + p.size, animation: `flap ${0.35 + p.v * 0.2}s ease-in-out infinite`, filter: p.v > 0.5 ? "hue-rotate(120deg)" : undefined }}>
            🦋
          </div>
        </div>
      ))}
    </div>
  );
}
