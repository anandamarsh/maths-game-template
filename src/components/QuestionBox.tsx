import type { ReactNode } from "react";

interface QuestionBoxProps {
  children: ReactNode;
  shake?: boolean;
}

export default function QuestionBox({ children, shake }: QuestionBoxProps) {
  return (
    <div
      className={`arcade-panel flex min-w-0 items-center gap-2 px-4 py-2 text-lg font-bold text-white ${shake ? "animate-shake" : ""}`}
    >
      {children}
    </div>
  );
}
