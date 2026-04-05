import { useCallback, useEffect, useRef, useState } from "react";
import GameLayout from "../components/GameLayout";
import SessionReportModal from "../components/SessionReportModal";
import TutorialHint from "../components/TutorialHint";
import { isMuted, playCorrect, playLevelComplete, playRipple, playWrong, shuffleMusic, startMusic, toggleMute } from "../sound";
import { getRainbowColor, makeRound, ripplePitch } from "../game/rippleGame";
import { startSession, startQuestionTimer, logAttempt, buildSummary } from "../report/sessionLog";
import type { SessionSummary } from "../report/sessionLog";

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

const RIPPLE_DURATION_MS = 900;
const EGGS_TOTAL = 10;
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
  const [roundPhase, setRoundPhase] = useState<"normal" | "monster">("normal");
  const [tapCount, setTapCount] = useState(0);
  const [targetTaps, setTargetTaps] = useState(0);
  const [eggsCollected, setEggsCollected] = useState(0);
  const [monsterEggs, setMonsterEggs] = useState(0);
  const [questionShake, setQuestionShake] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

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

  // Start a new round of tapping
  function startNewRound(lv: 1 | 2 | 3) {
    const round = makeRound(lv);
    roundRef.current = round;
    setTargetTaps(round.target);
    setTapCount(0);
    setCalcValue("");
    setRipples([]);
    setPhase("tapping");
    startQuestionTimer();
  }

  function handleRestart() {
    setRipples([]);
    setLevel(1);
    setUnlockedLevel(1);
    setEggsCollected(0);
    setMonsterEggs(0);
    setRoundPhase("normal");
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
    setMonsterEggs(0);
    setRoundPhase("normal");
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

      const id = ++rippleIdRef.current;
      setRipples((prev) => [...prev, { id, x: normX * 100, y: normY * 100, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_DURATION_MS + 100);

      const newCount = tapCount + 1;
      setTapCount(newCount);

      if (newCount >= targetTaps) {
        // Tapping phase done, move to answering
        setTimeout(() => {
          setPhase("answering");
          setCalcValue("");
        }, 400);
      }
    },
    [phase, tapCount, targetTaps],
  );

  function handleKeypadSubmit() {
    if (phase !== "answering") return;
    const answer = parseInt(calcValue, 10);
    if (isNaN(answer)) return;

    const correct = targetTaps;
    const isCorrect = answer === correct;

    // Log the attempt
    logAttempt({
      prompt: roundRef.current.entryPrompt,
      level,
      correctAnswer: correct,
      childAnswer: answer,
      isCorrect,
      gamePhase: roundPhase,
    });

    if (isCorrect) {
      playCorrect();
      if (roundPhase === "normal") {
        const newEggs = eggsCollected + 1;
        setEggsCollected(newEggs);
        if (newEggs >= EGGS_TOTAL) {
          // Normal round complete - switch to monster round
          setFeedbackMsg("Normal round cleared! Monster Round begins!");
          setPhase("feedback");
          setTimeout(() => {
            setRoundPhase("monster");
            setMonsterEggs(0);
            setFeedbackMsg("");
            startNewRound(level);
          }, 1800);
          return;
        }
      } else {
        // Monster round
        const newMonsterEggs = monsterEggs + 1;
        setMonsterEggs(newMonsterEggs);
        if (newMonsterEggs >= EGGS_TOTAL) {
          // Level complete!
          playLevelComplete();
          setUnlockedLevel((u) => Math.min(u + 1, LEVEL_COUNT));
          const summary = buildSummary({
            playerName: "Explorer",
            level,
            normalEggs: EGGS_TOTAL,
            monsterEggs: EGGS_TOTAL,
            levelCompleted: true,
            monsterRoundCompleted: true,
          });
          setSessionSummary(summary);
          setPhase("levelComplete");
          return;
        }
      }
      setFeedbackMsg("Correct!");
    } else {
      playWrong();
      setQuestionShake(true);
      setTimeout(() => setQuestionShake(false), 400);

      if (roundPhase === "monster") {
        const newMonsterEggs = Math.max(monsterEggs - 1, 0);
        setMonsterEggs(newMonsterEggs);
      }
      setFeedbackMsg(`Wrong! It was ${correct}`);
    }

    setPhase("feedback");
    setTimeout(() => {
      setFeedbackMsg("");
      startNewRound(level);
    }, 1200);
  }

  function handleReportClose() {
    setSessionSummary(null);
    setPhase("tapping");
    // Reset for next level or replay
    setEggsCollected(0);
    setMonsterEggs(0);
    setRoundPhase("normal");
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
    if (roundPhase === "monster") {
      questionText = `MONSTER ROUND - Tap the screen! (${tapCount}/${targetTaps})`;
    } else {
      questionText = `Tap the screen! (${tapCount}/${targetTaps})`;
    }
  } else if (phase === "answering") {
    questionText = roundRef.current.entryPrompt;
  } else if (phase === "feedback") {
    questionText = feedbackMsg;
  } else {
    questionText = "Level Complete!";
  }

  // Progress dots: normal round = eggsCollected, monster round = monsterEggs
  const progress = roundPhase === "monster" ? monsterEggs : eggsCollected;

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
      progress={progress}
      progressTotal={EGGS_TOTAL}
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

        {/* Monster round overlay tint */}
        {roundPhase === "monster" && (
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.15) 100%)",
          }} />
        )}

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
