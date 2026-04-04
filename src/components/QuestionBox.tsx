import type { ReactNode } from "react";

interface QuestionBoxProps {
  children: ReactNode;
  shake?: boolean;
  onClick?: () => void;
}

export default function QuestionBox({ children, shake, onClick }: QuestionBoxProps) {
  return (
    <div
      className={`arcade-panel flex min-w-0 h-full items-center gap-2 px-4 py-2 text-lg font-bold text-white ${shake ? "animate-shake" : ""} ${onClick ? "cursor-pointer select-none" : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
