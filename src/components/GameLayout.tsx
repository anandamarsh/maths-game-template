import type { ReactNode } from "react";
import { useState } from "react";
import { useIsMobileLandscape } from "../hooks/useMediaQuery";
import AudioButton from "./AudioButton";
import LevelButtons from "./LevelButtons";
import NumericKeypad from "./NumericKeypad";
import QuestionBox from "./QuestionBox";
import { SocialComments, SocialShare, openCommentsComposer } from "./Social";

interface GameLayoutProps {
  // Levels
  levelCount: number;
  currentLevel: number;
  unlockedLevel: number;
  onLevelSelect: (level: number) => void;

  // Audio
  muted: boolean;
  onToggleMute: () => void;
  onShuffleMusic?: () => void;

  // Keypad
  keypadValue: string;
  onKeypadChange: (v: string) => void;
  onKeypadSubmit: () => void;
  canSubmit: boolean;
  showKeypadHint?: boolean;
  keypadRoundKey?: number;

  // Question
  question: ReactNode;
  questionShake?: boolean;

  // Progress dots (0 – progressTotal)
  progress?: number;
  progressTotal?: number;

  // Game canvas
  children: ReactNode;
}

export default function GameLayout({
  levelCount,
  currentLevel,
  unlockedLevel,
  onLevelSelect,
  muted,
  onToggleMute,
  onShuffleMusic,
  keypadValue,
  onKeypadChange,
  onKeypadSubmit,
  canSubmit,
  showKeypadHint = false,
  keypadRoundKey,
  question,
  questionShake = false,
  progress,
  progressTotal,
  children,
}: GameLayoutProps) {
  const isMobileLandscape = useIsMobileLandscape();
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const closeSocial = () => {
    setShareOpen(false);
    setCommentsOpen(false);
  };

  const dots =
    progress !== undefined && progressTotal !== undefined
      ? Array.from({ length: progressTotal }, (_, i) => i < progress)
      : null;

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col arcade-grid"
      style={{ background: "#020617" }}
    >
      {/* ── Social drawers ──────────────────────────────────────────────── */}
      {(shareOpen || commentsOpen) && (
        <div className="social-backdrop" onClick={closeSocial} />
      )}

      <div className={`social-share-drawer social-drawer ${shareOpen ? "is-open" : ""}`}>
        <div className="social-drawer-header">
          <h2 className="m-0 text-sm font-black uppercase tracking-wider">Share</h2>
          <div className="social-drawer-header-actions">
            <button className="social-drawer-close" onClick={() => setShareOpen(false)}>
              <svg className="social-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <SocialShare />
      </div>

      <div className={`social-comments-drawer social-drawer ${commentsOpen ? "is-open" : ""}`}>
        <div className="social-drawer-header">
          <span style={{ color: "#fde047", fontWeight: 900, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Comments</span>
          <div className="social-drawer-header-actions">
            <button
              className="social-new-comment"
              onClick={() => openCommentsComposer()}
            >
              + New
            </button>
            <button className="social-drawer-close" onClick={() => setCommentsOpen(false)}>
              <svg className="social-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="social-comments-shell">
          <SocialComments />
        </div>
      </div>

      {/* ── Social launchers ────────────────────────────────────────────── */}
      <div className="social-launchers">
        <button
          className={`social-launcher arcade-button ${shareOpen ? "is-active" : ""}`}
          onClick={() => { setShareOpen((o) => !o); setCommentsOpen(false); }}
          title="Share"
        >
          <svg className="social-launcher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
        <button
          className={`social-launcher arcade-button ${commentsOpen ? "is-active" : ""}`}
          onClick={() => { setCommentsOpen((o) => !o); setShareOpen(false); }}
          title="Comments"
        >
          <svg className="social-launcher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className={`flex flex-row items-center gap-2 px-2 shrink-0 ${isMobileLandscape ? "h-[52px]" : "py-2"}`}
      >
        {/* Left: audio + optional shuffle */}
        <div className="flex items-center gap-1.5">
          <AudioButton muted={muted} onToggle={onToggleMute} />
          {onShuffleMusic && (
            <button
              onClick={onShuffleMusic}
              title="Shuffle music"
              className="arcade-button w-10 h-10 flex items-center justify-center p-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <polyline points="16 3 21 3 21 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="4" y1="20" x2="21" y2="3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <polyline points="21 16 21 21 16 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="15" y1="15" x2="21" y2="21" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="4" y1="4" x2="9" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Center: levels + progress dots */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          <LevelButtons
            levelCount={levelCount}
            currentLevel={currentLevel}
            unlockedLevel={unlockedLevel}
            onSelect={onLevelSelect}
          />
          {dots && (
            <div className="flex items-center gap-1">
              {dots.map((filled, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border transition-all"
                  style={{
                    background: filled ? "#67e8f9" : "transparent",
                    borderColor: filled ? "#67e8f9" : "#475569",
                    boxShadow: filled ? "0 0 6px rgba(103,232,249,0.7)" : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: keypad (landscape mobile only — docked in top bar) */}
        {isMobileLandscape && (
          <NumericKeypad
            value={keypadValue}
            onChange={onKeypadChange}
            onSubmit={onKeypadSubmit}
            canSubmit={canSubmit}
            showHint={showKeypadHint}
            roundKey={keypadRoundKey}
          />
        )}
      </div>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className={`flex-1 flex min-h-0 ${isMobileLandscape ? "flex-row" : "flex-col"} gap-2 px-2 pb-2`}>

        {/* Game canvas */}
        <div className="relative flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          {children}
        </div>

        {/* Non-landscape: question + keypad below */}
        {!isMobileLandscape && (
          <div className="flex flex-row items-start gap-2 shrink-0">
            <div className="flex-1 min-w-0">
              <QuestionBox shake={questionShake}>{question}</QuestionBox>
            </div>
            <NumericKeypad
              value={keypadValue}
              onChange={onKeypadChange}
              onSubmit={onKeypadSubmit}
              canSubmit={canSubmit}
              showHint={showKeypadHint}
              roundKey={keypadRoundKey}
            />
          </div>
        )}

        {/* Landscape: question box overlaid at bottom of canvas */}
        {isMobileLandscape && (
          <div className="absolute bottom-2 left-2 right-[calc(16.25rem+1rem)] z-10">
            <QuestionBox shake={questionShake}>{question}</QuestionBox>
          </div>
        )}
      </div>
    </div>
  );
}
