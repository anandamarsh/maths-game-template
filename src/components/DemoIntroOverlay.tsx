// src/components/DemoIntroOverlay.tsx — Animated intro slides for demo video recording

import { useEffect, useState } from "react";

interface Slide {
  title: string;
  subtitle?: string;
  duration: number; // ms to show this slide
}

interface Props {
  slides: Slide[];
  onComplete: () => void;
}

export default function DemoIntroOverlay({ slides, onComplete }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeState, setFadeState] = useState<"in" | "visible" | "out">("in");

  useEffect(() => {
    if (currentSlide >= slides.length) {
      onComplete();
      return;
    }

    const slide = slides[currentSlide];

    // Fade in
    setFadeState("in");
    const fadeInTimer = window.setTimeout(() => setFadeState("visible"), 50);

    // Start fade out before slide ends
    const fadeOutTimer = window.setTimeout(() => {
      setFadeState("out");
    }, slide.duration - 600);

    // Advance to next slide
    const advanceTimer = window.setTimeout(() => {
      setCurrentSlide((s) => s + 1);
    }, slide.duration);

    return () => {
      window.clearTimeout(fadeInTimer);
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [currentSlide, slides, onComplete]);

  if (currentSlide >= slides.length) return null;

  const slide = slides[currentSlide];
  const opacity = fadeState === "in" ? 0 : fadeState === "out" ? 0 : 1;

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
        transition: "opacity 0.5s ease-in-out",
        pointerEvents: "all",
      }}
    >
      {/* Decorative stars */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.4, pointerEvents: "none" }}
      >
        {[
          [10, 15], [25, 40], [40, 10], [55, 30], [72, 18], [88, 42], [92, 8],
          [14, 58], [30, 75], [46, 62], [62, 82], [78, 68], [93, 80],
          [7, 90], [20, 95], [35, 87], [50, 93], [66, 89], [82, 96],
        ].map(([x, y], i) => (
          <circle key={i} cx={`${x}%`} cy={`${y}%`} r={i % 3 === 0 ? 2 : 1.2} fill="white" />
        ))}
      </svg>

      {/* Icon */}
      <div style={{ marginBottom: "2rem" }}>
        <img
          src="/favicon.svg"
          alt=""
          width="120"
          height="120"
          style={{
            filter: "drop-shadow(0 0 24px rgba(103,232,249,0.5))",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 900,
          color: "#fde047",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          textShadow: "0 0 40px rgba(253,224,71,0.5), 0 4px 8px rgba(0,0,0,0.5)",
          textAlign: "center",
          margin: 0,
          padding: "0 2rem",
          lineHeight: 1.2,
        }}
      >
        {slide.title}
      </h1>

      {/* Subtitle */}
      {slide.subtitle && (
        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.6rem)",
            fontWeight: 600,
            color: "#67e8f9",
            textAlign: "center",
            margin: "1.2rem 0 0",
            padding: "0 2rem",
            maxWidth: "700px",
            lineHeight: 1.5,
            textShadow: "0 0 20px rgba(103,232,249,0.3)",
          }}
        >
          {slide.subtitle}
        </p>
      )}

      {/* Slide indicator dots */}
      {slides.length > 1 && (
        <div style={{ marginTop: "3rem", display: "flex", gap: "0.75rem" }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i === currentSlide ? "#67e8f9" : "rgba(255,255,255,0.2)",
                boxShadow: i === currentSlide ? "0 0 10px rgba(103,232,249,0.7)" : undefined,
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
