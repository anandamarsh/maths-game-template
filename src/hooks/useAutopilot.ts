import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionSummary } from "../report/sessionLog";

export type AutopilotGamePhase = "tapping" | "answering" | "feedback" | "levelComplete";

// Human-paced timing ranges (ms) — quick but not robotic
const T = {
  TAP_FIRST:    [320, 550] as [number, number],   // pause before first tap
  TAP_BETWEEN:  [380, 700] as [number, number],   // between canvas taps
  READ_DELAY:   [700, 1200] as [number, number],  // "reading" the question
  KEY_BETWEEN:  [180, 340] as [number, number],   // between keypad digits
  PRE_SUBMIT:   [220, 380] as [number, number],   // pause before pressing submit
  EMAIL_DELAY:  [1200, 1800] as [number, number], // before auto-emailing
  END_PAUSE:    [1800, 2500] as [number, number], // before clicking next/play again
} as const;

const WRONG_ANSWER_RATE = 0.2; // 20% chance of submitting a wrong answer

function rand([lo, hi]: [number, number]): number {
  return Math.round(lo + Math.random() * (hi - lo));
}

function wrongAnswer(correct: number): number {
  const candidates = [-3, -2, -1, 1, 2, 3]
    .map(d => correct + d)
    .filter(v => v > 0 && v <= 20);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? correct + 1;
}

/** Query a keypad button by its data-autopilot-key attribute */
function getKeyRect(key: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`[data-autopilot-key="${key}"]`);
  return el ? el.getBoundingClientRect() : null;
}

export interface AutopilotCallbacks {
  simulateTap: (normX: number, normY: number) => void;
  setCalcValue: React.Dispatch<React.SetStateAction<string>>;
  submitAnswer: (overrideValue?: string) => void;
  goNextLevel: () => void;
  playAgain: () => void;
  restartAll: () => void;
  sendEmail: (summary: SessionSummary, email: string) => Promise<void>;
  /** Called when autopilot naturally finishes (reached last level) */
  onAutopilotComplete?: () => void;
}

export interface PhantomPos {
  x: number;         // viewport X (px)
  y: number;         // viewport Y (px)
  isClicking: boolean;
}

interface AutopilotGameState {
  phase: AutopilotGamePhase;
  targetTaps: number;
  tapCount: number;
  sessionSummary: SessionSummary | null;
  level: number;
  levelCount: number;
}

interface UseAutopilotArgs {
  gameState: AutopilotGameState;
  callbacksRef: React.RefObject<AutopilotCallbacks | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  autopilotEmail: string;
}

export function useAutopilot({
  gameState,
  callbacksRef,
  canvasRef,
  autopilotEmail,
}: UseAutopilotArgs) {
  const [isActive, setIsActive] = useState(false);
  const [phantomPos, setPhantomPos] = useState<PhantomPos | null>(null);

  const isActiveRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  // Always-current snapshot — read inside scheduled callbacks
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  function clearTimers() {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }

  /** Schedule a callback only if autopilot is still active */
  function after(ms: number, fn: () => void): void {
    const t = window.setTimeout(() => {
      if (!isActiveRef.current) return;
      fn();
    }, ms);
    timersRef.current.push(t);
  }

  function canvasToScreen(normX: number, normY: number): { x: number; y: number } | null {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: rect.left + normX * rect.width, y: rect.top + normY * rect.height };
  }

  function moveHand(x: number, y: number) {
    setPhantomPos({ x, y, isClicking: false });
  }

  function clickAt(x: number, y: number) {
    setPhantomPos({ x, y, isClicking: true });
    window.setTimeout(() => {
      if (!isActiveRef.current) return;
      setPhantomPos(prev => prev ? { ...prev, isClicking: false } : null);
    }, 120);
  }

  // ─── Phase handlers ──────────────────────────────────────────────────────

  function scheduleTaps(targetCount: number, alreadyDone: number) {
    const remaining = Math.max(0, targetCount - alreadyDone);
    if (remaining === 0) return;
    let delay = rand(T.TAP_FIRST);

    for (let i = 0; i < remaining; i++) {
      const tapDelay = delay;
      after(tapDelay, () => {
        const normX = 0.15 + Math.random() * 0.7;
        const normY = 0.15 + Math.random() * 0.65;
        const screen = canvasToScreen(normX, normY);
        if (screen) moveHand(screen.x, screen.y);

        // Short lead-up then click
        window.setTimeout(() => {
          if (!isActiveRef.current) return;
          if (screen) clickAt(screen.x, screen.y);
          callbacksRef.current?.simulateTap(normX, normY);
        }, 90);
      });
      delay += rand(T.TAP_BETWEEN);
    }
  }

  function scheduleAnswer(correctAnswer: number) {
    const isWrong = Math.random() < WRONG_ANSWER_RATE;
    const answer = isWrong ? wrongAnswer(correctAnswer) : correctAnswer;
    const digits = String(answer).split("");
    let delay = rand(T.READ_DELAY);

    // Preview: move hand toward first digit
    after(delay - 150, () => {
      const rect = getKeyRect(digits[0]);
      if (rect) moveHand(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    for (const d of digits) {
      const td = delay;
      after(td, () => {
        const rect = getKeyRect(d);
        if (rect) clickAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
        callbacksRef.current?.setCalcValue(prev =>
          prev === "" || prev === "0" ? d : prev + d
        );
      });
      delay += rand(T.KEY_BETWEEN);
    }

    // Submit
    after(delay + rand(T.PRE_SUBMIT), () => {
      const rect = getKeyRect("submit");
      if (rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        clickAt(cx, cy);
      }
      window.setTimeout(() => {
        if (!isActiveRef.current) return;
        callbacksRef.current?.submitAnswer();
        setPhantomPos(null);
      }, 130);
    });
  }

  function scheduleLevelEnd(summary: SessionSummary) {
    // Auto-email
    after(rand(T.EMAIL_DELAY), () => {
      callbacksRef.current?.sendEmail(summary, autopilotEmail).catch((err: unknown) => {
        console.warn("[Autopilot] Email failed:", err);
      });
    });

    // Auto-proceed: go to next level, or halt at the final level
    after(rand(T.END_PAUSE), () => {
      const { level, levelCount } = stateRef.current;
      if (level < levelCount) {
        callbacksRef.current?.goNextLevel();
      } else {
        // Final level complete — stop autopilot and let the modal sit
        isActiveRef.current = false;
        setIsActive(false);
        setPhantomPos(null);
        callbacksRef.current?.onAutopilotComplete?.();
      }
    });
  }

  // ─── Main effect: react to phase changes ─────────────────────────────────

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      setPhantomPos(null);
      return;
    }
    clearTimers();

    const { phase, targetTaps, tapCount, sessionSummary } = stateRef.current;

    switch (phase) {
      case "tapping":
        scheduleTaps(targetTaps, tapCount);
        break;
      case "answering":
        scheduleAnswer(targetTaps);
        break;
      case "feedback":
        // Let the game run its 1200ms feedback window naturally
        break;
      case "levelComplete":
        if (sessionSummary) scheduleLevelEnd(sessionSummary);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, gameState.phase]);

  // ─── Controls ────────────────────────────────────────────────────────────

  const activate = useCallback(() => {
    isActiveRef.current = true;
    setIsActive(true);
  }, []);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    clearTimers();
    setPhantomPos(null);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return { isActive, activate, deactivate, phantomPos };
}
