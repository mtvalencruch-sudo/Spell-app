import React from "react";
import { classifyLetter, getLetterTypeStyles } from "../utils/spelling";

interface LetterTileProps {
  key?: React.Key;
  letter: string;
  size?: "sm" | "md" | "lg";
  revealed?: boolean;
  isCorrect?: boolean | null;
  className?: string;
  pulse?: boolean;
}

export function LetterTile({
  letter,
  size = "md",
  revealed = true,
  isCorrect = null,
  className = "",
  pulse = false,
}: LetterTileProps) {
  // If not revealed, represent with empty string
  const displayLetter = revealed ? letter.toLowerCase() : "";
  const type = classifyLetter(letter);
  const colors = getLetterTypeStyles(type);

  const sizeClasses = {
    sm: "w-6 h-7 text-[11px] rounded-md border",
    md: "w-10 h-12 text-sm rounded-lg border-2",
    lg: "w-14 h-16 text-lg rounded-xl border-2"
  };

  let borderStyle = colors.border;
  let bgStyle = colors.bg;
  let textStyle = colors.text;

  if (!revealed) {
    bgStyle = "bg-slate-50 dark:bg-slate-850";
    borderStyle = "border-dashed border-slate-300 dark:border-slate-700";
    textStyle = "text-slate-300 dark:text-slate-600";
  } else if (isCorrect === true) {
    bgStyle = "bg-emerald-50 dark:bg-emerald-950/40";
    borderStyle = "border-emerald-500 dark:border-emerald-400";
    textStyle = "text-emerald-600 dark:text-emerald-400";
  } else if (isCorrect === false) {
    bgStyle = "bg-rose-50 dark:bg-rose-950/40";
    borderStyle = "border-rose-500 dark:border-rose-400";
    textStyle = "text-rose-600 dark:text-rose-400";
  }

  const pulseClass = pulse ? "animate-pulse ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900" : "";

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center font-black lowercase font-mono shadow-xs select-none ${bgStyle} ${borderStyle} ${textStyle} ${pulseClass} ${className}`}
    >
      {displayLetter}
    </div>
  );
}
