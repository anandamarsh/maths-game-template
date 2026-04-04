import type { ReactNode } from "react";
import { useState } from "react";
import { SocialComments, SocialShare, openCommentsComposer } from "./Social";
import AudioButton from "./AudioButton";
import NumericKeypad from "./NumericKeypad";
import QuestionBox from "./QuestionBox";

interface GameLayoutProps {
  // Controls
  muted: boolean;
  onToggleMute: () => void;
  onRestart?: () => void;

  // Keypad — pass displayOnly={true} to show just the digital display
  keypadValue: string;
  keypadDisplayOnly?: boolean;
  onKeypadChange?: (v: string) => void;
  onKeypadSubmit?: () => void;
  canSubmit?: boolean;
  showKeypadHint?: boolean;
  keypadRoundKey?: number;

  // Question bar (optional)
  question?: ReactNode;
  questionShake?: boolean;

  // Progress dots
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
  keypadDisplayOnly = false,
  onKeypadChange,
  onKeypadSubmit,
  canSubmit = false,
  showKeypadHint = false,
  keypadRoundKey,
  question,
  questionShake = false,
  progress,
  progressTotal,
  children,
}: GameLayoutProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this maths game on Interactive Maths!",
          url: "https://interactive-maths.vercel.app/",
        });
      } catch {
        // dismissed — ignore
      }
    } else {
      setShareDrawerOpen((o) => !o);
    }
  }

  function handleAddComment() {
    setCommentsOpen(true);
    // Give the iframe time to mount before posting
    setTimeout(() => openCommentsComposer(), 300);
  }

  const dots =
    progress !== undefined && progressTotal !== undefined
      ? Array.from({ length: progressTotal }, (_, i) => i < progress)
      : null;

  const showBottomBar = question !== undefined || true; // always show keypad

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col arcade-grid"
      style={{ background: "#020617" }}
    >
      {/* ── Hidden comments iframe (always in DOM for postMessage) ─────── */}
      {!commentsOpen && (
        <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
          <SocialComments />
        </div>
      )}

      {/* ── Comments drawer (slides up from bottom) ─────────────────────── */}
      {commentsOpen && (
        <div
          className="social-backdrop"
          onClick={() => setCommentsOpen(false)}
        />
      )}
      <div className={`social-comments-drawer social-drawer ${commentsOpen ? "is-open" : ""}`}>
        <div className="social-drawer-header">
          <button
            className="social-new-comment"
            onClick={() => openCommentsComposer()}
          >
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

      {/* ── Share fallback drawer (only for browsers without navigator.share) */}
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

        {/* Left: all controls */}
        <div className="flex items-center gap-1.5">
          {/* Mute */}
          <AudioButton muted={muted} onToggle={onToggleMute} />

          {/* Restart */}
          {onRestart && (
            <button
              onClick={onRestart}
              title="Restart"
              className="arcade-button w-10 h-10 flex items-center justify-center p-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path d="M1 4v6h6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.98L1 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Share */}
          <button
            onClick={handleShare}
            title="Share"
            className="arcade-button w-10 h-10 flex items-center justify-center p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <circle cx="18" cy="5" r="3" stroke="white" strokeWidth="2" />
              <circle cx="6" cy="12" r="3" stroke="white" strokeWidth="2" />
              <circle cx="18" cy="19" r="3" stroke="white" strokeWidth="2" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Add Comment */}
          <button
            onClick={handleAddComment}
            title="Add Comment"
            className="arcade-button w-10 h-10 flex items-center justify-center p-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="8" x2="12" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="11" x2="15" y2="11" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Center: progress dots */}
        {dots && (
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {dots.map((filled, i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-300"
                style={{
                  background: filled ? "#67e8f9" : "transparent",
                  borderColor: filled ? "#67e8f9" : "#334155",
                  boxShadow: filled ? "0 0 8px rgba(103,232,249,0.8)" : undefined,
                  transform: filled ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Game canvas ─────────────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 mx-2 rounded-xl overflow-hidden">
        {children}
      </div>

      {/* ── Bottom bar: question + keypad ───────────────────────────────── */}
      {showBottomBar && (
        <div className="flex flex-row items-start gap-2 px-2 py-2 shrink-0">
          {question !== undefined && (
            <div className="flex-1 min-w-0 self-center">
              <QuestionBox shake={questionShake}>{question}</QuestionBox>
            </div>
          )}
          <NumericKeypad
            value={keypadValue}
            displayOnly={keypadDisplayOnly}
            onChange={onKeypadChange}
            onSubmit={onKeypadSubmit}
            canSubmit={canSubmit}
            showHint={showKeypadHint}
            roundKey={keypadRoundKey}
          />
        </div>
      )}
    </div>
  );
}
