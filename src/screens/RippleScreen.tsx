import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import TutorialHint from "../components/TutorialHint";
import {
  isMuted,
  playCorrect,
  playLevelComplete,
  playRipple,
  shuffleMusic,
  startMusic,
  toggleMute,
} from "../sound";
import { getRainbowColor, ripplePitch } from "../game/rippleGame";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAPS_PER_EGG = 10;
const EGGS_TOTAL = 5;
const RIPPLE_DURATION_MS = 900;

// Ripple colours cycle through this palette
const RIPPLE_COLORS = ["#67e8f9", "#a78bfa", "#fbbf24", "#34d399", "#f472b6", "#fb923c"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RippleScreen() {
  const [tapCount, setTapCount] = useState(0);          // taps this egg
  const [totalTaps, setTotalTaps] = useState(0);        // taps all time
  const [eggsCollected, setEggsCollected] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  const rippleIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const musicStartedRef = useRef(false);

  function ensureMusic() {
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      startMusic();
    }
  }

  function handleRestart() {
    setTapCount(0);
    setTotalTaps(0);
    setEggsCollected(0);
    setRipples([]);
    setColorIndex(0);
    setShowTutorial(true);
    ensureMusic();
    shuffleMusic();
  }

  function handleToggleMute() {
    setMuted(toggleMute());
  }

  const handleCanvasTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      ensureMusic();
      setShowTutorial(false);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      // Cycle colour per tap
      const color = getRainbowColor(totalTaps) ?? RIPPLE_COLORS[colorIndex % RIPPLE_COLORS.length];

      // Sound pitched by position
      playRipple(ripplePitch(normX, normY));

      // Spawn ripple
      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x: normX * 100, y: normY * 100, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_DURATION_MS + 100);

      // Increment counts
      const newTap = tapCount + 1;
      const newTotal = totalTaps + 1;
      setTapCount(newTap);
      setTotalTaps(newTotal);
      setColorIndex((i) => i + 1);

      // Egg collected every TAPS_PER_EGG taps
      if (newTap >= TAPS_PER_EGG) {
        setTapCount(0);
        const newEggs = eggsCollected + 1;

        if (newEggs >= EGGS_TOTAL) {
          // All eggs collected — celebrate and reset
          playLevelComplete();
          setEggsCollected(0);
        } else {
          playCorrect();
          setEggsCollected(newEggs);
        }
      }
    },
    [tapCount, totalTaps, eggsCollected, colorIndex],
  );

  // Prevent scroll/zoom on touch
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  // Progress within current egg (0–TAPS_PER_EGG mapped to dots)
  const currentColor = RIPPLE_COLORS[colorIndex % RIPPLE_COLORS.length];

  return (
    <GameLayout
      muted={muted}
      onToggleMute={handleToggleMute}
      onRestart={handleRestart}
      keypadValue={tapCount.toString()}
      question="Tap the screen!"
      progress={eggsCollected}
      progressTotal={EGGS_TOTAL}
    >
      {/* ── Game canvas ──────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasTap}
      >
        {/* Subtle dot-grid background */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Tap counter — centre */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <div
            className="text-7xl font-black tabular-nums transition-colors duration-150"
            style={{
              color: currentColor,
              textShadow: `0 0 40px ${currentColor}80`,
            }}
          >
            {tapCount}
          </div>
          {/* Mini progress bar for current egg */}
          <div className="flex gap-1">
            {Array.from({ length: TAPS_PER_EGG }, (_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all duration-150"
                style={{
                  background: i < tapCount ? currentColor : "rgba(71,85,105,0.5)",
                  boxShadow: i < tapCount ? `0 0 5px ${currentColor}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Ripple animations */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute pointer-events-none"
            style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%, -50%)" }}
          >
            {[0, 1, 2].map((ring) => (
              <div
                key={ring}
                className="absolute rounded-full"
                style={{
                  width: `${60 + ring * 40}px`,
                  height: `${60 + ring * 40}px`,
                  border: `${3 - ring}px solid ${r.color}`,
                  transform: "translate(-50%, -50%)",
                  animation: `ripple-expand ${RIPPLE_DURATION_MS}ms ease-out ${ring * 80}ms forwards`,
                }}
              />
            ))}
            <div
              className="absolute rounded-full"
              style={{
                width: "12px",
                height: "12px",
                background: r.color,
                transform: "translate(-50%, -50%)",
                boxShadow: `0 0 12px ${r.color}`,
                animation: `ripple-expand ${RIPPLE_DURATION_MS * 0.4}ms ease-out forwards`,
              }}
            />
          </div>
        ))}

        {/* Tutorial hint */}
        <TutorialHint
          show={showTutorial}
          label="Tap anywhere!"
        />
      </div>
    </GameLayout>
  );
}
