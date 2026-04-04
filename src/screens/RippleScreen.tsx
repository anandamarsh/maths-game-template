import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import TutorialHint from "../components/TutorialHint";
import { isMuted, playLevelComplete, playRipple, shuffleMusic, startMusic, toggleMute } from "../sound";
import { getRainbowColor, ripplePitch } from "../game/rippleGame";

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

const RIPPLE_DURATION_MS = 900;
const TAPS_PER_EGG = 5;   // every 5 taps earns one egg
const EGGS_TOTAL = 10;     // 10 eggs to collect
const LEVEL_COUNT = 3;

export default function RippleScreen() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calcValue, setCalcValue] = useState("");
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [tapTotal, setTapTotal] = useState(0);
  const [, setTapsThisEgg] = useState(0);
  const [eggsCollected, setEggsCollected] = useState(0);
  const [level, setLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
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
    setRipples([]);
    setTapTotal(0);
    setTapsThisEgg(0);
    setEggsCollected(0);
    setLevel(1);
    setUnlockedLevel(1);
    setShowTutorial(true);
    shuffleMusic();
  }

  function handleLevelSelect(lv: number) {
    setLevel(lv);
    setRipples([]);
    setTapTotal(0);
    setTapsThisEgg(0);
    setEggsCollected(0);
    setShowTutorial(true);
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

      const color = getRainbowColor(tapTotal);
      playRipple(ripplePitch(normX, normY));

      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x: normX * 100, y: normY * 100, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_DURATION_MS + 100);

      setTapTotal((n) => n + 1);

      setTapsThisEgg((t) => {
        const next = t + 1;
        if (next >= TAPS_PER_EGG) {
          setEggsCollected((eggs) => {
            const newEggs = Math.min(eggs + 1, EGGS_TOTAL);
            if (eggs < EGGS_TOTAL) playLevelComplete();
            if (newEggs >= EGGS_TOTAL) {
              setUnlockedLevel((u) => Math.min(u + 1, LEVEL_COUNT));
            }
            return newEggs;
          });
          return 0;
        }
        return next;
      });
    },
    [tapTotal],
  );

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  return (
    <GameLayout
      muted={muted}
      onToggleMute={handleToggleMute}
      onRestart={handleRestart}
      keypadValue={calcValue}
      onKeypadChange={setCalcValue}
      question="Tap the screen!"
      progress={eggsCollected}
      progressTotal={EGGS_TOTAL}
      levelCount={LEVEL_COUNT}
      currentLevel={level}
      unlockedLevel={unlockedLevel}
      onLevelSelect={handleLevelSelect}
    >
      {/* ── Game canvas ──────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasTap}
      >
        {/* Deep-space gradient background */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at top, #1e3a5f 0%, #080e1c 72%)",
        }} />
        {/* Arcade grid overlay */}
        <div className="absolute inset-0 arcade-grid opacity-20 pointer-events-none" />
        {/* Individual star dots */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.55 }}>
          {[
            [8,12],[22,38],[37,7],[55,28],[70,14],[85,41],[95,6],
            [12,55],[28,72],[44,60],[60,80],[76,65],[90,78],
            [5,88],[18,95],[32,85],[48,92],[64,88],[80,96],
            [15,30],[42,44],[68,35],[88,22],[3,68],[52,18],
            [74,52],[38,96],[92,48],[25,18],[61,46],
          ].map(([x, y], i) => (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 1.5 : 1} fill="white" />
          ))}
        </svg>

        {/* Ripple animations */}
        {ripples.map((r) => (
          <div key={r.id} className="absolute pointer-events-none"
            style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%, -50%)" }}>
            {[0, 1, 2].map((ring) => (
              <div key={ring} className="absolute rounded-full"
                style={{
                  width: `${60 + ring * 40}px`,
                  height: `${60 + ring * 40}px`,
                  border: `${3 - ring}px solid ${r.color}`,
                  transform: "translate(-50%, -50%)",
                  animation: `ripple-expand ${RIPPLE_DURATION_MS}ms ease-out ${ring * 80}ms forwards`,
                }} />
            ))}
            <div className="absolute rounded-full" style={{
              width: "12px", height: "12px",
              background: r.color,
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 12px ${r.color}`,
              animation: `ripple-expand ${RIPPLE_DURATION_MS * 0.4}ms ease-out forwards`,
            }} />
          </div>
        ))}

        <TutorialHint show={showTutorial} label="Tap anywhere!" />
      </div>
    </GameLayout>
  );
}
