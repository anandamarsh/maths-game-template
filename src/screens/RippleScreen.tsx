import { useCallback, useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import DemoIntroOverlay from "../components/DemoIntroOverlay";
import GameLayout from "../components/GameLayout";
import PhantomHand from "../components/PhantomHand";
import SessionReportModal from "../components/SessionReportModal";
import TutorialHint from "../components/TutorialHint";
import { useT } from "../i18n";
import { useDemoRecorder } from "../hooks/useDemoRecorder";
import {
  fadeOutRecordingSoundtrack,
  isMuted,
  playCorrect,
  playLevelComplete,
  playRipple,
  playWrong,
  shuffleMusic,
  startMusic,
  startRecordingSoundtrack,
  stopRecordingSoundtrack,
  toggleMute,
} from "../sound";
import { getRainbowColor, makeRound, ripplePitch } from "../game/rippleGame";
import { startSession, startQuestionTimer, logAttempt, buildSummary } from "../report/sessionLog";
import type { SessionSummary, RipplePosition } from "../report/sessionLog";
import { useCheatCodes } from "../hooks/useCheatCode";
import { useAutopilot } from "../hooks/useAutopilot";
import type { AutopilotCallbacks, ModalAutopilotControls } from "../hooks/useAutopilot";
import { sendEmbeddedAnalyticsEvent } from "../utils/embeddedAnalytics";

interface Ripple {
  id: number;
  x: number; // % from left
  y: number; // % from top
  color: string;
}

const RIPPLE_DURATION_MS = 900;
const EGGS_PER_ROUND = 2;
const LEVEL_COUNT = 2;
const AUTOPILOT_EMAIL = "amarsh.anand@gmail.com";
const DEMO_RECORDING_EMAIL = "teacher@myschool.com";
const IS_LOCALHOST_DEV = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

type GamePhase = "tapping" | "answering" | "feedback" | "levelComplete";

export default function RippleScreen() {
  const t = useT();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [calcValue, setCalcValue] = useState("");
  const [muted, setMuted] = useState(isMuted());
  const [showTutorial, setShowTutorial] = useState(true);
  const [level, setLevel] = useState<1 | 2>(1);
  const [unlockedLevel, setUnlockedLevel] = useState(1);

  // Game state
  const [phase, setPhase] = useState<GamePhase>("tapping");
  const [tapCount, setTapCount] = useState(0);
  const [targetTaps, setTargetTaps] = useState(0);
  const [autopilotMode, setAutopilotMode] = useState<
    "continuous" | "single-question"
  >("continuous");
  const [demoRetryPending, setDemoRetryPending] = useState(false);
  const [eggsCollected, setEggsCollected] = useState(0);
  const [questionShake, setQuestionShake] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Track ripple positions for current round (for the report diagram)
  const roundRipplesRef = useRef<RipplePosition[]>([]);
  const singleQuestionDemoRef = useRef(false);
  const demoRecoveryPendingRef = useRef(false);

  const rippleIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const musicStartedRef = useRef(false);
  const roundRef = useRef(makeRound(1));

  // ── Demo video recorder ──────────────────────────────────────────────────

  const demoRecorderCallbacksRef = useRef({
    onStartPlaying: () => {},
    prepareAudio: () => {},
    cleanupAudio: () => {},
  });
  const { recordingPhase, isRecording, startRecording, onIntroComplete, showOutro, onOutroComplete } =
    useDemoRecorder(demoRecorderCallbacksRef);

  // Always-current refs for cheat code and autopilot callbacks
  const targetTapsRef = useRef(targetTaps);
  targetTapsRef.current = targetTaps;

  function ensureMusic() {
    if (!musicStartedRef.current) {
      musicStartedRef.current = true;
      startMusic();
    }
  }

  function startNewRound(lv: 1 | 2) {
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

  function resetDemoRound() {
    setRipples([]);
    setTapCount(0);
    setCalcValue("");
    setFeedbackMsg("");
    setQuestionShake(false);
    setPhase("tapping");
    roundRipplesRef.current = [];
    startQuestionTimer();
  }

  function spendSingleQuestionDemoPoint() {
    setEggsCollected((value) => Math.max(0, value - 1));
  }

  function restoreSingleQuestionDemoPoint() {
    setEggsCollected((value) => Math.min(EGGS_PER_ROUND, value + 1));
  }

  function clearDemoState() {
    setDemoRetryPending(false);
    singleQuestionDemoRef.current = false;
    demoRecoveryPendingRef.current = false;
  }

  function handleRestart() {
    clearDemoState();
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
    const l = lv as 1 | 2;
    clearDemoState();
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

  // ── Core tap logic (called by both real pointer events and autopilot) ────

  const doTap = useCallback(
    (normX: number, normY: number) => {
      if (demoRetryPending) return;
      if (phase !== "tapping") return;

      ensureMusic();
      setShowTutorial(false);

      const color = getRainbowColor(tapCount);
      playRipple(ripplePitch(normX, normY));

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

      if (!singleQuestionDemoRef.current && !demoRecoveryPendingRef.current) {
        setEggsCollected((eggs) => {
          const newEggs = Math.min(eggs + 1, EGGS_PER_ROUND);
          if (eggs < EGGS_PER_ROUND) playLevelComplete();
          return newEggs;
        });
      }

      if (newCount >= targetTaps) {
        setTimeout(() => {
          setPhase("answering");
          setCalcValue("");
        }, 500);
      }
    },
    [demoRetryPending, phase, tapCount, targetTaps],
  );

  const handleCanvasTap = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (phase !== "tapping") return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      doTap(normX, normY);
    },
    [phase, doTap],
  );

  // ── Answer submission (accepts optional override for cheat code / autopilot) ──

  const handleKeypadSubmit = useCallback((overrideValue?: string) => {
    if (demoRetryPending) return;
    if (phase !== "answering") return;
    const raw = overrideValue ?? calcValue;
    const answer = parseInt(raw, 10);
    if (isNaN(answer)) return;

    const correct = targetTaps;
    const isCorrect = answer === correct;

    if (!singleQuestionDemoRef.current) {
      logAttempt({
        prompt: t("game.entryPrompt"),
        level,
        correctAnswer: correct,
        childAnswer: answer,
        isCorrect,
        gamePhase: "normal",
        ripplePositions: [...roundRipplesRef.current],
      });
    }

    if (isCorrect) {
      playCorrect();
      setFeedbackMsg(t("game.correct"));
    } else {
      playWrong();
      setQuestionShake(true);
      setTimeout(() => setQuestionShake(false), 400);
      setFeedbackMsg(t("game.wrongAnswer", { answer: correct }));
    }

    setPhase("feedback");
    setTimeout(() => {
      setFeedbackMsg("");
      if (singleQuestionDemoRef.current) {
        singleQuestionDemoRef.current = false;
        demoRecoveryPendingRef.current = true;
        setDemoRetryPending(true);
      } else if (demoRecoveryPendingRef.current) {
        if (isCorrect) {
          restoreSingleQuestionDemoPoint();
        }
        clearDemoState();
        setQuestionShake(false);
        setFeedbackMsg("");
        setRipples([]);
        startNewRound(level);
      } else if (eggsCollected >= EGGS_PER_ROUND) {
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
        sendEmbeddedAnalyticsEvent("level_completed", {
          level,
          normalEggs: EGGS_PER_ROUND,
          monsterEggs: 0,
        });
        if (level >= LEVEL_COUNT) {
          sendEmbeddedAnalyticsEvent("game_completed", {
            level,
            totalLevels: LEVEL_COUNT,
          });
        }
        setSessionSummary(summary);
        setPhase("levelComplete");
      } else {
        startNewRound(level);
      }
    }, 1200);
  }, [demoRetryPending, phase, calcValue, targetTaps, level, eggsCollected]);

  // Ref so cheat code callback always has the latest submit function
  const handleKeypadSubmitRef = useRef(handleKeypadSubmit);
  handleKeypadSubmitRef.current = handleKeypadSubmit;

  // Physical keyboard support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (demoRetryPending) return;
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
        if (phase !== "answering") return;
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
        setCalcValue((v) => (v.startsWith("-") ? v.slice(1) : "-" + (v || "0")));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [demoRetryPending, phase, handleKeypadSubmit]);

  // ── Autopilot setup ──────────────────────────────────────────────────────

  const autopilotCallbacksRef = useRef<AutopilotCallbacks | null>(null);
  // Ref populated by SessionReportModal when it mounts, cleared on unmount
  const modalControlsRef = useRef<ModalAutopilotControls | null>(null);

  const { isActive: isAutopilot, activate: activateAutopilot, deactivate: deactivateAutopilot, phantomPos } =
    useAutopilot({
      mode: autopilotMode,
      gameState: { phase, targetTaps, tapCount, level, levelCount: LEVEL_COUNT },
      callbacksRef: autopilotCallbacksRef,
      canvasRef,
      autopilotEmail: isRecording ? DEMO_RECORDING_EMAIL : AUTOPILOT_EMAIL,
    });

  // Always-current callbacks — updated every render, after deactivateAutopilot is available
  autopilotCallbacksRef.current = {
    simulateTap: doTap,
    setCalcValue,
    submitAnswer: (ov) => handleKeypadSubmitRef.current(ov),
    goNextLevel: handleNextLevel,
    playAgain: handleReportClose,
    restartAll: handleRestart,
    emailModalControls: modalControlsRef,
    onAutopilotComplete: () => {
      deactivateAutopilot();
      // If recording a demo video, show the outro slide
      if (isRecording) showOutro();
    },
  };

  // Wire demo recorder callbacks (need handleRestart & activateAutopilot to exist)
  demoRecorderCallbacksRef.current = {
    onStartPlaying: () => {
      handleRestart();
      setAutopilotMode("continuous");
      setCalcValue("");
      activateAutopilot();
    },
    prepareAudio: () => {
      if (!isMuted()) setMuted(toggleMute());
      startRecordingSoundtrack();
    },
    cleanupAudio: () => {
      stopRecordingSoundtrack();
    },
  };

  // ── Cheat codes ──────────────────────────────────────────────────────────

  const { processCheatKey } = useCheatCodes({
    // 197879 → instantly reveal and submit the correct answer
    "197879": () => {
      if (phase !== "answering") return;
      const correct = String(targetTapsRef.current);
      setCalcValue(correct);
      requestAnimationFrame(() => handleKeypadSubmitRef.current(correct));
    },
    // 198081 → toggle autopilot
    "198081": () => {
      singleQuestionDemoRef.current = false;
      if (isAutopilot && autopilotMode === "continuous") {
        deactivateAutopilot();
      } else {
        if (isAutopilot) deactivateAutopilot();
        setAutopilotMode("continuous");
        setCalcValue("");
        activateAutopilot();
      }
    },
  });

  function handleKeypadCheatInput(key: string): boolean {
    return processCheatKey(key);
  }

  function handleSingleQuestionDemo() {
    clearDemoState();
    if (isAutopilot) {
      deactivateAutopilot();
    }
    spendSingleQuestionDemoPoint();
    singleQuestionDemoRef.current = true;
    setAutopilotMode("single-question");
    setCalcValue("");
    activateAutopilot();
  }

  function handleDemoTryAgain() {
    setDemoRetryPending(false);
    setFeedbackMsg("");
    setQuestionShake(false);
    setRipples([]);
    resetDemoRound();
  }

  const isRobotVisibleActive = isAutopilot;
  const handleRobotButtonClick = isRobotVisibleActive
    ? () => {
        clearDemoState();
        deactivateAutopilot();
      }
    : handleSingleQuestionDemo;

  // ── Scene capture (dev only) ─────────────────────────────────────────────

  async function handleCaptureScene() {
    if (!IS_LOCALHOST_DEV || !canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: null });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `ripple-scene-${stamp}.png`;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Capture failed", err);
    }
  }

  function handleReportClose() {
    clearDemoState();
    setSessionSummary(null);
    setPhase("tapping");
    setEggsCollected(0);
    startSession();
    startNewRound(level);
  }

  function handleNextLevel() {
    const next = Math.min(level + 1, LEVEL_COUNT) as 1 | 2;
    clearDemoState();
    setLevel(next);
    setSessionSummary(null);
    setPhase("tapping");
    setEggsCollected(0);
    startNewRound(next);
  }

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

  // ── Question text ────────────────────────────────────────────────────────

  let questionText: string;
  if (phase === "tapping") {
    questionText = t("game.tapScreen", { count: tapCount, total: targetTaps });
  } else if (phase === "answering") {
    questionText = t("game.entryPrompt");
  } else if (phase === "feedback") {
    questionText = feedbackMsg;
  } else {
    questionText = t("game.levelComplete");
  }

  return (
    <>
      <GameLayout
        muted={muted}
        onToggleMute={handleToggleMute}
        onRestart={handleRestart}
        onCapture={IS_LOCALHOST_DEV ? handleCaptureScene : undefined}
        onRecordDemo={IS_LOCALHOST_DEV ? startRecording : undefined}
        isRecordingDemo={isRecording}
        keypadValue={calcValue}
        onKeypadChange={setCalcValue}
        onKeypadKeyInput={handleKeypadCheatInput}
        onKeypadSubmit={phase === "answering" ? () => handleKeypadSubmit() : undefined}
        canSubmit={phase === "answering" && calcValue.length > 0}
        question={questionText}
        questionShake={questionShake}
        progress={eggsCollected}
        progressTotal={EGGS_PER_ROUND}
        levelCount={LEVEL_COUNT}
        currentLevel={level}
        unlockedLevel={unlockedLevel}
        onLevelSelect={handleLevelSelect}
        isAutopilot={false}
        onCancelAutopilot={undefined}
        isQuestionDemo={isRobotVisibleActive}
        onQuestionDemo={handleRobotButtonClick}
        forceKeypadExpanded={isAutopilot && phase === "answering"}
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

          <TutorialHint show={showTutorial && !isAutopilot} label={t("game.tapAnywhere")} />
        </div>

        {/* Session report modal */}
        {sessionSummary && (
          <SessionReportModal
            summary={sessionSummary}
            level={level}
            onClose={handleReportClose}
            onNextLevel={level < LEVEL_COUNT ? handleNextLevel : undefined}
            autopilotControlsRef={isAutopilot ? modalControlsRef : undefined}
          />
        )}
      </GameLayout>

      {demoRetryPending && (
        <div className="fixed inset-0 z-[85]">
          <div className="absolute inset-0 pointer-events-auto" />
          <div className="absolute left-1/2 top-6 -translate-x-1/2">
            <button
              type="button"
              onClick={handleDemoTryAgain}
              className="arcade-button inline-flex px-8 py-4 text-base md:text-lg"
              style={{ borderColor: "#fbbf24" }}
            >
              {t("game.tryOnYourOwn")}
            </button>
          </div>
        </div>
      )}

      {/* Phantom hand — fixed overlay, outside GameLayout so it renders above everything */}
      <PhantomHand pos={phantomPos} />

      {/* Demo video recording overlays */}
      {recordingPhase === "intro-prompt" && (
        <DemoIntroOverlay type="intro" isStatic />
      )}
      {recordingPhase === "intro" && (
        <DemoIntroOverlay type="intro" onComplete={onIntroComplete} />
      )}
      {(recordingPhase === "outro" || recordingPhase === "stopping") && (
        <DemoIntroOverlay
          type="outro"
          onComplete={onOutroComplete}
          onFadeStart={() => fadeOutRecordingSoundtrack(1200)}
        />
      )}

      {/* Recording indicator (pulsing red dot) */}
      {isRecording && recordingPhase === "playing" && (
        <div
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 9998,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ef4444",
            boxShadow: "0 0 8px rgba(239,68,68,0.7)",
            animation: "autopilot-blink 1.5s ease-in-out infinite",
          }}
        />
      )}
    </>
  );
}
