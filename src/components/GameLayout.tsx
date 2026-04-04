import type { ReactNode } from "react";
import { useState } from "react";
import { useIsCoarsePointer, useIsMobileLandscape } from "../hooks/useMediaQuery";
import { SocialComments, SocialShare, openCommentsComposer } from "./Social";
import AudioButton from "./AudioButton";
import NumericKeypad from "./NumericKeypad";
import QuestionBox from "./QuestionBox";

interface GameLayoutProps {
  // Controls
  muted: boolean;
  onToggleMute: () => void;
  onRestart?: () => void;

  // Keypad — fully controlled; pass onChange to make buttons live
  keypadValue: string;
  onKeypadChange?: (v: string) => void;
  onKeypadSubmit?: () => void;
  canSubmit?: boolean;

  // Question bar (optional)
  question?: ReactNode;
  questionShake?: boolean;

  // Progress dots (optional)
  progress?: number;
  progressTotal?: number;

  // Game canvas
  children: ReactNode;
}

export default function GameLayout({
  muted,
  onToggleMute,
  onRestart,
  keypadValue,
  onKeypadChange,
  onKeypadSubmit,
  canSubmit = false,
  question,
  questionShake = false,
  progress,
  progressTotal,
  children,
}: GameLayoutProps) {
  const isMobileLandscape = useIsMobileLandscape();
  const isCoarsePointer = useIsCoarsePointer();
  // Minimized by default on touch devices; expanded by default on desktop
  const [calcMinimized, setCalcMinimized] = useState(() => isMobileLandscape || isCoarsePointer);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  function toggleCalc() {
    setCalcMinimized((m) => !m);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this maths game on Interactive Maths!",
          url: "https://interactive-maths.vercel.app/",
        });
      } catch { /* dismissed */ }
    } else {
      setShareDrawerOpen((o) => !o);
    }
  }

  const dots =
    progress !== undefined && progressTotal !== undefined
      ? Array.from({ length: progressTotal }, (_, i) => i < progress)
      : null;

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col arcade-grid"
      style={{ background: "#020617" }}
    >
      {/* ── Comments drawer ──────────────────────────────────────────────── */}
      {commentsOpen && (
        <div className="social-backdrop" onClick={() => setCommentsOpen(false)} />
      )}
      <div className={`social-comments-drawer social-drawer ${commentsOpen ? "is-open" : ""}`}>
        <div className="social-drawer-header">
          {/* Add Comment on the left — opens compose area inside the iframe */}
          <button className="social-new-comment" onClick={() => openCommentsComposer()}>
            + Add Comment
          </button>
          <button className="social-drawer-close" onClick={() => setCommentsOpen(false)}>
            <svg className="social-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="social-comments-shell">
          <SocialComments />
        </div>
      </div>

      {/* ── Share fallback drawer (desktop without navigator.share) ─────── */}
      {shareDrawerOpen && (
        <div className="social-backdrop" onClick={() => setShareDrawerOpen(false)} />
      )}
      <div className={`social-share-drawer social-drawer ${shareDrawerOpen ? "is-open" : ""}`}>
        <div className="social-drawer-header">
          <h2 className="m-0 text-sm font-black uppercase tracking-wider">Share</h2>
          <button className="social-drawer-close" onClick={() => setShareDrawerOpen(false)}>
            <svg className="social-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SocialShare />
      </div>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-row items-center gap-2 px-2 py-2 shrink-0">
        {/* Left: all controls — first slot reserved for shell home button (injected at absolute top-2 left-2) */}
        <div className="flex items-center gap-1.5">
          <div className="w-10 h-10 shrink-0" aria-hidden="true" />
          <AudioButton muted={muted} onToggle={onToggleMute} />

          {onRestart && (
            <button onClick={onRestart} title="Restart"
              className="arcade-button w-10 h-10 flex items-center justify-center p-2">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full"
                stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}

          <button onClick={handleShare} title="Share"
            className="arcade-button w-10 h-10 flex items-center justify-center p-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="18" cy="5" r="3" stroke="white" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="white" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="white" strokeWidth="2" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Comments — plain chat bubble, no + sign */}
          <button onClick={() => setCommentsOpen((o) => !o)} title="Comments"
            className="arcade-button w-10 h-10 flex items-center justify-center p-2">
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Centre: progress dots */}
        {dots && (
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {dots.map((filled, i) => (
              <div key={i} className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-300"
                style={{
                  background: filled ? "#67e8f9" : "transparent",
                  borderColor: filled ? "#67e8f9" : "#334155",
                  boxShadow: filled ? "0 0 8px rgba(103,232,249,0.8)" : undefined,
                  transform: filled ? "scale(1.15)" : "scale(1)",
                }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Rest: canvas (absolute) + floating bottom bar ───────────────── */}
      {/*
          The canvas is absolute so it always fills this area completely.
          The bottom bar overlays on top — minimizing the calculator never
          shifts the canvas content up or down.
      */}
      <div className="relative flex-1 min-h-0 mx-2 mb-2">

        {/* Canvas — always fills the full rest area */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          {children}
        </div>

        {/* Bottom overlay — floats over canvas, anchored to bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-row items-stretch gap-2">

          {/* Message box — same height as calculator, click = toggle */}
          {question !== undefined && (
            <div className="flex-1 min-w-0">
              <QuestionBox shake={questionShake} onClick={toggleCalc}>
                {question}
              </QuestionBox>
            </div>
          )}

          {/* Calculator */}
          <NumericKeypad
            value={keypadValue}
            onChange={onKeypadChange}
            onSubmit={onKeypadSubmit}
            canSubmit={canSubmit}
            minimized={calcMinimized}
            onToggleMinimized={toggleCalc}
          />
        </div>
      </div>
    </div>
  );
}
