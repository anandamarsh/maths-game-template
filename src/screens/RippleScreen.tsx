import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import SessionReportModal from "../components/SessionReportModal";
import TutorialHint from "../components/TutorialHint";
import { isMuted, playCorrect, playLevelComplete, playRipple, playWrong, shuffleMusic, startMusic, toggleMute } from "../sound";
import { getRainbowColor, makeRound, ripplePitch } from "../game/rippleGame";
import { startSession, startQuestionTimer, logAttempt, buildSummary } from "../report/sessionLog";
import type { SessionSummary, RipplePosition } from "../report/sessionLog";

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

const RIPPLE_DURATION_MS = 900;
const EGGS_PER_ROUND = 3;     // 3 taps per round, each tap = 1 egg
const LEVEL_COUNT = 3;

type GamePhase = "tapping" | "answering" | "feedback" | "levelComplete";

export default function RippleScreen() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calcValue, setCalcValue] = useState("");
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);

  // Game state
  const [phase, setPhase] = useState<GamePhase>("tapping");
  const [tapCount, setTapCount] = useState(0);
  const [targetTaps, setTargetTaps] = useState(0);
  const [eggsCollected, setEggsCollected] = useState(0);
  const [questionShake, setQuestionShake] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Track ripple positions for current round (for the report diagram)
  const roundRipplesRef = useRef<RipplePosition[]>([]);

  const rippleIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const musicStartedRef = useRef(false);
  const roundRef = useRef(makeRound(1));

  function ensureMusic() {
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      startMusic();
    }
  }

  function startNewRound(lv: 1 | 2 | 3) {
    const round = makeRound(lv);
    roundRef.current = round;
    setTargetTaps(round.target);
    setTapCount(0);
    setCalcValue("");
    setRipples([]);
    setPhase("tapping");
    roundRipplesRef.current = [];
    startQuestionTimer();
  }

  function handleRestart() {
    setRipples([]);
    setLevel(1);
    setUnlockedLevel(1);
    setEggsCollected(0);
    setShowTutorial(true);
    setSessionSummary(null);
    setFeedbackMsg("");
    startSession();
    startNewRound(1);
    shuffleMusic();
  }

  function handleLevelSelect(lv: number) {
    const l = lv as 1 | 2 | 3;
    setLevel(l);
    setRipples([]);
    setEggsCollected(0);
    setShowTutorial(true);
    setSessionSummary(null);
    setFeedbackMsg("");
    startSession();
    startNewRound(l);
  }

  function handleToggleMute() {
    setMuted(toggleMute());
  }

  // Initialize session on mount
  useEffect(() => {
    startSession();
    startNewRound(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "tapping") return;

      ensureMusic();
      setShowTutorial(false);

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      const color = getRainbowColor(tapCount);
      playRipple(ripplePitch(normX, normY));

      // Track position for report diagram
      roundRipplesRef.current.push({
        x: Math.round(normX * 100),
        y: Math.round(normY * 100),
        color,
      });

      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x: normX * 100, y: normY * 100, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_DURATION_MS + 100);

      const newCount = tapCount + 1;
      setTapCount(newCount);

      // Each tap = 1 egg
      setEggsCollected((eggs) => {
        const newEggs = Math.min(eggs + 1, EGGS_PER_ROUND);
        if (eggs < EGGS_PER_ROUND) playLevelComplete();
        return newEggs;
      });

      if (newCount >= targetTaps) {
        // Tapping phase done, move to answering
        setTimeout(() => {
          setPhase("answering");
          setCalcValue("");
        }, 500);
      }
    },
    [phase, tapCount, targetTaps],
  );

  const handleKeypadSubmit = useCallback(() => {
    if (phase !== "answering") return;
    const answer = parseInt(calcValue, 10);
    if (isNaN(answer)) return;

    const correct = targetTaps;
    const isCorrect = answer === correct;

    // Log the attempt with ripple positions
    logAttempt({
      prompt: roundRef.current.entryPrompt,
      level,
      correctAnswer: correct,
      childAnswer: answer,
      isCorrect,
      gamePhase: "normal",
      ripplePositions: [...roundRipplesRef.current],
    });

    if (isCorrect) {
      playCorrect();
      setFeedbackMsg("Correct!");
    } else {
      playWrong();
      setQuestionShake(true);
      setTimeout(() => setQuestionShake(false), 400);
      setFeedbackMsg(`Wrong! It was ${correct}`);
    }

    setPhase("feedback");
    setTimeout(() => {
      setFeedbackMsg("");
      // After EGGS_PER_ROUND eggs, show report
      if (eggsCollected >= EGGS_PER_ROUND) {
        playLevelComplete();
        setUnlockedLevel((u) => Math.min(u + 1, LEVEL_COUNT));
        const summary = buildSummary({
          playerName: "Explorer",
          level,
          normalEggs: EGGS_PER_ROUND,
          monsterEggs: 0,
          levelCompleted: true,
          monsterRoundCompleted: false,
        });
        setSessionSummary(summary);
        setPhase("levelComplete");
      } else {
        startNewRound(level);
      }
    }, 1200);
  }, [phase, calcValue, targetTaps, level, eggsCollected]);

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "answering") return;

      // Ignore if focus is on a real input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        setCalcValue((v) => {
          if (v === "0") return e.key;
          return v + e.key;
        });
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setCalcValue((v) => v.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleKeypadSubmit();
      } else if (e.key === ".") {
        e.preventDefault();
        setCalcValue((v) => {
          if (v.includes(".")) return v;
          return v === "" ? "0." : v + ".";
        });
      } else if (e.key === "-") {
        e.preventDefault();
        setCalcValue((v) => v.startsWith("-") ? v.slice(1) : "-" + (v || "0"));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleKeypadSubmit]);

  function handleReportClose() {
    setSessionSummary(null);
    setPhase("tapping");
    setEggsCollected(0);
    startSession();
    startNewRound(level);
  }

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  // Build question text
  let questionText: string;
  if (phase === "tapping") {
    questionText = `Tap the screen! (${tapCount}/${targetTaps})`;
  } else if (phase === "answering") {
    questionText = roundRef.current.entryPrompt;
  } else if (phase === "feedback") {
    questionText = feedbackMsg;
  } else {
    questionText = "Level Complete!";
  }

  return (
    <GameLayout
      muted={muted}
      onToggleMute={handleToggleMute}
      onRestart={handleRestart}
      keypadValue={calcValue}
      onKeypadChange={phase === "answering" ? setCalcValue : undefined}
      onKeypadSubmit={phase === "answering" ? handleKeypadSubmit : undefined}
      canSubmit={phase === "answering" && calcValue.length > 0}
      question={questionText}
      questionShake={questionShake}
      progress={eggsCollected}
      progressTotal={EGGS_PER_ROUND}
      levelCount={LEVEL_COUNT}
      currentLevel={level}
      unlockedLevel={unlockedLevel}
      onLevelSelect={handleLevelSelect}
    >
      {/* Game canvas */}
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
        {/* Stars */}
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

      {/* Session report modal */}
      {sessionSummary && (
        <SessionReportModal summary={sessionSummary} onClose={handleReportClose} />
      )}
    </GameLayout>
  );
}
