// src/components/DemoIntroOverlay.tsx — Intro/outro slides for demo video recording

import { useEffect, useState } from "react";

export type SlideType = "intro" | "outro";

interface Props {
  type: SlideType;
  onComplete: () => void;
}

const INTRO_DURATION = 5500;
const OUTRO_DURATION = 4500;
const FADE_MS = 600;

export default function DemoIntroOverlay({ type, onComplete }: Props) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    const fadeInTimer = window.setTimeout(() => setOpacity(1), 50);

    const duration = type === "intro" ? INTRO_DURATION : OUTRO_DURATION;

    // Start fade out
    const fadeOutTimer = window.setTimeout(() => setOpacity(0), duration - FADE_MS);

    // Signal complete
    const completeTimer = window.setTimeout(onComplete, duration);

    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(completeTimer);
    };
  }, [type, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)",
        opacity,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: "all",
      }}
    >
      {/* Decorative stars */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35, pointerEvents: "none" }}
      >
        {[
          [10, 15], [25, 40], [40, 10], [55, 30], [72, 18], [88, 42], [92, 8],
          [14, 58], [30, 75], [46, 62], [62, 82], [78, 68], [93, 80],
          [7, 90], [20, 95], [35, 87], [50, 93], [66, 89], [82, 96],
        ].map(([x, y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 2 : 1.2} fill="white" />
        ))}
      </svg>

      {type === "intro" ? <IntroContent /> : <OutroContent />}
    </div>
  );
}

function IntroContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8rem", padding: "0 2rem", maxWidth: 720 }}>
      {/* Game icon */}
      <img
        src="/favicon.svg"
        alt=""
        width="100"
        height="100"
        style={{ filter: "drop-shadow(0 0 24px rgba(103,232,249,0.5))", marginBottom: "0.5rem" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Title */}
      <h1 style={{
        fontSize: "clamp(2.5rem, 6vw, 4rem)",
        fontWeight: 900,
        color: "#fde047",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        textShadow: "0 0 40px rgba(253,224,71,0.5), 0 4px 8px rgba(0,0,0,0.5)",
        textAlign: "center",
        margin: 0,
        lineHeight: 1.1,
      }}>
        Ripple Touch
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
        fontWeight: 600,
        color: "#67e8f9",
        textAlign: "center",
        margin: 0,
        textShadow: "0 0 20px rgba(103,232,249,0.3)",
      }}>
        Counting &amp; Number Recognition
      </p>

      {/* Divider */}
      <div style={{
        width: 80,
        height: 2,
        background: "linear-gradient(90deg, transparent, rgba(103,232,249,0.5), transparent)",
        margin: "0.4rem 0",
      }} />

      {/* Syllabus info */}
      <p style={{
        fontSize: "clamp(0.85rem, 1.8vw, 1.05rem)",
        fontWeight: 600,
        color: "#a5b4fc",
        textAlign: "center",
        margin: 0,
        lineHeight: 1.4,
      }}>
        Early Stage 1 (Kindergarten) — NSW Curriculum
      </p>

      <p style={{
        fontSize: "clamp(0.8rem, 1.6vw, 0.95rem)",
        fontWeight: 500,
        color: "#94a3b8",
        textAlign: "center",
        margin: 0,
        lineHeight: 1.4,
      }}>
        MAe-1WM: Demonstrates and describes counting sequences
      </p>

      {/* What it teaches */}
      <p style={{
        fontSize: "clamp(0.8rem, 1.6vw, 0.95rem)",
        fontWeight: 400,
        color: "#cbd5e1",
        textAlign: "center",
        margin: "0.3rem 0 0",
        lineHeight: 1.5,
        maxWidth: 560,
      }}>
        Children learn to count objects and recognise numbers by tapping the screen
        to create ripples, then counting and entering the total.
      </p>
    </div>
  );
}

function OutroContent() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem", padding: "0 2rem" }}>
      {/* Game icon */}
      <img
        src="/favicon.svg"
        alt=""
        width="80"
        height="80"
        style={{ filter: "drop-shadow(0 0 20px rgba(103,232,249,0.5))" }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      <p style={{
        fontSize: "clamp(1.3rem, 3vw, 2rem)",
        fontWeight: 700,
        color: "#e2e8f0",
        textAlign: "center",
        margin: 0,
        lineHeight: 1.3,
      }}>
        Play this and more games at
      </p>

      <a
        href="https://www.seemaths.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
          fontWeight: 900,
          color: "#fde047",
          textDecoration: "none",
          textAlign: "center",
          textShadow: "0 0 30px rgba(253,224,71,0.5)",
          letterSpacing: "0.05em",
        }}
      >
        SeeMaths.com
      </a>

      <p style={{
        fontSize: "clamp(0.8rem, 1.5vw, 1rem)",
        color: "#67e8f9",
        textAlign: "center",
        margin: 0,
      }}>
        www.seemaths.com
      </p>
    </div>
  );
}
