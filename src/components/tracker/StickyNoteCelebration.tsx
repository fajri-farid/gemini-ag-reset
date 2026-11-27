"use client";

import { useEffect, useState, type CSSProperties } from "react";

interface StickyNoteCelebrationProps {
  burstKey: number;
}

interface ConfettiPiece {
  id: number;
  color: string;
  shape: "square" | "strip" | "diamond";
  tx: string;
  ty: string;
  rot: string;
  delay: string;
  dur: string;
}

const CONFETTI_PIECES: readonly ConfettiPiece[] = [
  { id: 1, color: "#2563EB", shape: "square", tx: "-220px", ty: "-115px", rot: "-220deg", delay: "0ms", dur: "1050ms" },
  { id: 2, color: "#7C3AED", shape: "strip", tx: "-175px", ty: "-165px", rot: "190deg", delay: "25ms", dur: "1120ms" },
  { id: 3, color: "#10B981", shape: "diamond", tx: "-130px", ty: "-85px", rot: "-310deg", delay: "40ms", dur: "980ms" },
  { id: 4, color: "#FDE68A", shape: "square", tx: "-90px", ty: "-180px", rot: "260deg", delay: "15ms", dur: "1180ms" },
  { id: 5, color: "#FED7AA", shape: "strip", tx: "-45px", ty: "-145px", rot: "-175deg", delay: "50ms", dur: "1060ms" },
  { id: 6, color: "#FB7185", shape: "diamond", tx: "0px", ty: "-195px", rot: "300deg", delay: "10ms", dur: "1200ms" },
  { id: 7, color: "#2563EB", shape: "strip", tx: "48px", ty: "-155px", rot: "215deg", delay: "35ms", dur: "1100ms" },
  { id: 8, color: "#10B981", shape: "square", tx: "95px", ty: "-175px", rot: "-245deg", delay: "20ms", dur: "1160ms" },
  { id: 9, color: "#7C3AED", shape: "diamond", tx: "140px", ty: "-95px", rot: "320deg", delay: "45ms", dur: "1020ms" },
  { id: 10, color: "#FDE68A", shape: "strip", tx: "185px", ty: "-155px", rot: "-195deg", delay: "15ms", dur: "1140ms" },
  { id: 11, color: "#FB7185", shape: "square", tx: "225px", ty: "-105px", rot: "250deg", delay: "30ms", dur: "1080ms" },
  { id: 12, color: "#FED7AA", shape: "diamond", tx: "-205px", ty: "40px", rot: "185deg", delay: "55ms", dur: "1120ms" },
  { id: 13, color: "#10B981", shape: "strip", tx: "-150px", ty: "95px", rot: "-260deg", delay: "35ms", dur: "1180ms" },
  { id: 14, color: "#2563EB", shape: "diamond", tx: "-95px", ty: "125px", rot: "220deg", delay: "60ms", dur: "1090ms" },
  { id: 15, color: "#7C3AED", shape: "square", tx: "-35px", ty: "145px", rot: "-190deg", delay: "25ms", dur: "1150ms" },
  { id: 16, color: "#FDE68A", shape: "diamond", tx: "35px", ty: "145px", rot: "240deg", delay: "40ms", dur: "1130ms" },
  { id: 17, color: "#FB7185", shape: "strip", tx: "100px", ty: "120px", rot: "-275deg", delay: "20ms", dur: "1100ms" },
  { id: 18, color: "#2563EB", shape: "square", tx: "155px", ty: "90px", rot: "210deg", delay: "50ms", dur: "1170ms" },
  { id: 19, color: "#FED7AA", shape: "strip", tx: "210px", ty: "45px", rot: "-230deg", delay: "30ms", dur: "1080ms" },
  { id: 20, color: "#10B981", shape: "square", tx: "0px", ty: "115px", rot: "180deg", delay: "45ms", dur: "1040ms" },
];

export function StickyNoteCelebration({ burstKey }: StickyNoteCelebrationProps) {
  const [visibleKey, setVisibleKey] = useState(0);

  useEffect(() => {
    if (burstKey === 0) {
      return;
    }

    const showTimer = window.setTimeout(() => {
      setVisibleKey(burstKey);
    }, 0);

    const hideTimer = window.setTimeout(() => {
      setVisibleKey(0);
    }, 1500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [burstKey]);

  if (visibleKey === 0) {
    return null;
  }

  return (
    <div
      key={visibleKey}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      <div className="relative h-full w-full">
        {CONFETTI_PIECES.map((piece) => {
          const sizeClass =
            piece.shape === "strip"
              ? "h-2.5 w-5 rounded-xs"
              : piece.shape === "diamond"
                ? "h-3 w-3 rounded-[2px]"
                : "h-3.5 w-3.5 rounded-xs";

          const style = {
            backgroundColor: piece.color,
            "--tx": piece.tx,
            "--ty": piece.ty,
            "--rot": piece.rot,
            "--delay": piece.delay,
            "--dur": piece.dur,
          } as CSSProperties;

          return (
            <span
              key={piece.id}
              style={style}
              className={`neo-confetti-piece absolute top-[32%] left-1/2 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-ink shadow-[1px_1px_0px_#111111] ${sizeClass}`}
            />
          );
        })}
      </div>
    </div>
  );
}
