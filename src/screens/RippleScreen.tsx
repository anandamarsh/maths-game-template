// ─── RippleScreen ─────────────────────────────────────────────────────────────
// This is the game-specific screen. Replace with your own game canvas.
//
// It uses GameLayout for all the shared chrome (keypad, levels, audio, social).
// Your job: fill the game canvas area with your game's visuals and logic.

import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import TutorialHint from "../components/TutorialHint";
import {
  isMuted,
  playCorrect,
  playLevelComplete,
  playRipple,
  playWrong,
  shuffleMusic,
  startMusic,
  toggleMute,
} from "../sound";
import {
  type Level,
  type RoundConfig,
  getRainbowColor,
  makeRound,
  ripplePitch,
} from "../game/rippleGame";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

type Phase = "tapping" | "entering";

// ─── Constants ────────────────────────────────────────────────────────────────

const EGGS_PER_LEVEL = 5;
const RIPPLE_DURATION_MS = 900;

// ─── Component ────────────────────────────────────────────────────────────────

export default function RippleScreen() {
  const [level, setLevel] = useState<Level>(1);
  const [unlockedLevel, setUnlockedLevel] = useState<Level>(1);
  const [eggsCollected, setEggsCollected] = useState(0);
  const [round, setRound] = useState<RoundConfig>(() => makeRound(1));
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("tapping");
  const [tapCount, setTapCount] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const rippleIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Start music on first interaction
  const musicStartedRef = useRef(false);
  function ensureMusic() {
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      startMusic();
    }
  }

  function beginNewRound(lvl: Level) {
    const newRound = makeRound(lvl);
    setLevel(lvl);
    setRound(newRound);
    setRoundIndex((i) => i + 1);
    setPhase("tapping");
    setTapCount(0);
    setRipples([]);
    setInput("");
    setShake(false);
  }

  function handleLevelSelect(lvl: number) {
    beginNewRound(lvl as Level);
  }

  function handleToggleMute() {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  }

  function handleShuffleMusic() {
    ensureMusic();
    shuffleMusic();
  }

  const handleCanvasTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "tapping") return;
      ensureMusic();
      setShowTutorial(false);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      const xPct = normX * 100;
      const yPct = normY * 100;

      const color =
        round.level === 3
          ? getRainbowColor(tapCount)
          : round.rippleColor;

      // Play sound
      playRipple(ripplePitch(normX, normY));

      // Add ripple
      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x: xPct, y: yPct, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_DURATION_MS + 100);

      const newCount = tapCount + 1;
      setTapCount(newCount);

      // When target reached, move to entry phase
      if (newCount === round.target) {
        setTimeout(() => setPhase("entering"), 400);
      }
    },
    [phase, round, tapCount],
  );

  function handleSubmit() {
    const entered = parseInt(input, 10);
    if (isNaN(entered)) return;

    if (entered === round.target) {
      // Correct!
      playCorrect();
      const newEggs = eggsCollected + 1;
      setEggsCollected(newEggs);

      if (newEggs >= EGGS_PER_LEVEL) {
        // Level complete
        playLevelComplete();
        setEggsCollected(0);
        const nextLevel = Math.min(level + 1, 3) as Level;
        if (level < 3) setUnlockedLevel(nextLevel as Level);
        setTimeout(() => beginNewRound(level), 800);
      } else {
        setTimeout(() => beginNewRound(level), 600);
      }
    } else {
      // Wrong
      playWrong();
      setShake(true);
      setInput("");
      setTimeout(() => setShake(false), 500);
    }
  }

  // Question box content
  const question =
    phase === "tapping" ? (
      <span>
        {round.tapPrompt}{" "}
        {tapCount > 0 && (
          <span style={{ color: round.rippleColor, fontWeight: 900 }}>
            ({tapCount})
          </span>
        )}
      </span>
    ) : (
      <span>{round.entryPrompt}</span>
    );

  // Prevent scroll/zoom while playing
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  return (
    <GameLayout
      levelCount={3}
      currentLevel={level}
      unlockedLevel={unlockedLevel}
      onLevelSelect={handleLevelSelect}
      muted={muted}
      onToggleMute={handleToggleMute}
      onShuffleMusic={handleShuffleMusic}
      keypadValue={input}
      onKeypadChange={setInput}
      onKeypadSubmit={handleSubmit}
      canSubmit={phase === "entering" && input.length > 0}
      showKeypadHint={phase === "entering" && input === ""}
      keypadRoundKey={roundIndex}
      question={question}
      questionShake={shake}
      progress={eggsCollected}
      progressTotal={EGGS_PER_LEVEL}
    >
      {/* ── Game canvas ────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasTap}
      >
        {/* Background: subtle dot grid */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Target counter — centre of canvas */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none"
        >
          <div
            className="text-6xl font-black tabular-nums"
            style={{
              color: phase === "entering" ? "#4ade80" : round.rippleColor,
              textShadow: `0 0 32px ${round.rippleColor}80`,
              transition: "color 0.3s",
            }}
          >
            {tapCount}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {phase === "tapping" ? `/ ${round.target}` : "done!"}
          </div>
        </div>

        {/* Ripple animations */}
        {ripples.map((r) => (
          <div
            key={r.id}
            className="absolute pointer-events-none"
            style={{
              left: `${r.x}%`,
              top: `${r.y}%`,
              transform: "translate(-50%, -50%)",
            }}
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

        {/* Phase transition overlay */}
        {phase === "entering" && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(2,6,23,0.3)" }}
          >
            <div
              className="text-2xl font-black uppercase tracking-widest animate-bounce-in"
              style={{ color: "#4ade80", textShadow: "0 0 24px rgba(74,222,128,0.7)" }}
            >
              Enter your count →
            </div>
          </div>
        )}

        {/* Tutorial hint */}
        <TutorialHint
          show={showTutorial && tapCount === 0}
          label="Tap anywhere!"
        />
      </div>
    </GameLayout>
  );
}
