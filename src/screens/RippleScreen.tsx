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

export default function RippleScreen() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calcValue, setCalcValue] = useState("");
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [tapTotal, setTapTotal] = useState(0);
  const [, setTapsThisEgg] = useState(0);
  const [eggsCollected, setEggsCollected] = useState(0);
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
    setShowTutorial(true);
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
            if (eggs < EGGS_TOTAL) playLevelComplete();
            return Math.min(eggs + 1, EGGS_TOTAL);
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
    >
      {/* ── Game canvas ──────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasTap}
      >
        {/* Starry background */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 50% 0%, #0f2a4a 0%, #020617 60%)",
        }} />
        {/* Star field */}
        <div className="absolute inset-0 opacity-70" style={{
          backgroundImage: [
            "radial-gradient(circle, #e0f2fe 1px, transparent 1px)",
            "radial-gradient(circle, #bae6fd 1px, transparent 1px)",
            "radial-gradient(circle, #f0f9ff 1.5px, transparent 1.5px)",
          ].join(", "),
          backgroundSize: "97px 89px, 61px 73px, 149px 131px",
          backgroundPosition: "13px 7px, 41px 33px, 79px 61px",
        }} />
        {/* Subtle nebula glow */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: [
            "radial-gradient(ellipse 40% 30% at 20% 40%, #38bdf8 0%, transparent 70%)",
            "radial-gradient(ellipse 35% 25% at 80% 70%, #818cf8 0%, transparent 70%)",
            "radial-gradient(ellipse 30% 20% at 60% 20%, #34d399 0%, transparent 70%)",
          ].join(", "),
        }} />

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
