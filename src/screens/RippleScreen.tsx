import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import TutorialHint from "../components/TutorialHint";
import { isMuted, playRipple, shuffleMusic, startMusic, toggleMute } from "../sound";
import { getRainbowColor, ripplePitch } from "../game/rippleGame";

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

const RIPPLE_DURATION_MS = 900;

export default function RippleScreen() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calcValue, setCalcValue] = useState("");   // calculator is fully independent
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [tapTotal, setTapTotal] = useState(0);      // just for colour cycling
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
    >
      {/* ── Game canvas ──────────────────────────────────────────────────── */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair select-none"
        style={{ touchAction: "none" }}
        onPointerDown={handleCanvasTap}
      >
        {/* Subtle dot-grid background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)",
          backgroundSize: "28px 28px",
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
