import React from "react";

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  extraKeys?: string[];
}

export function VirtualKeyboard({ onKeyPress, onBackspace, onClear, extraKeys = [] }: VirtualKeyboardProps) {
  // Use lowercase characters for the keys
  const baseRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"]
  ];

  // Filter extra keys to only render unique lowercase strings
  const uniqueExtraKeys = Array.from(new Set(extraKeys.map(k => k.toLowerCase()))).filter(Boolean);

  // If we have extra accented/special characters, append them as an extra row
  const rows = uniqueExtraKeys.length > 0 
    ? [...baseRows, uniqueExtraKeys] 
    : baseRows;

  return (
    <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 max-w-xl mx-auto space-y-2 select-none">
      {rows.map((row, rowIdx) => {
        const isExtraRow = rowIdx >= baseRows.length;
        return (
          <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((key) => (
              <button
                id={`kbd-key-${key}`}
                key={key}
                onClick={() => onKeyPress(key)}
                className={`flex-1 max-w-[44px] h-10 sm:h-12 active:scale-95 text-slate-800 dark:text-slate-200 font-bold rounded-xl border transition shadow-xs text-xs sm:text-sm cursor-pointer flex items-center justify-center
                  ${isExtraRow 
                    ? "bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300"
                    : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800"
                  }
                `}
              >
                {key}
              </button>
            ))}
          </div>
        );
      })}
      <div className="flex justify-center gap-1.5 pt-1">
        <button
          id="kbd-key-clear"
          onClick={onClear}
          className="flex-1 max-w-[120px] h-10 sm:h-12 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl border border-rose-100 dark:border-rose-900/30 transition shadow-xs text-xs cursor-pointer flex items-center justify-center"
        >
          Clear
        </button>
        <button
          id="kbd-key-space"
          onClick={() => onKeyPress(" ")}
          className="flex-grow h-10 sm:h-12 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 font-semibold rounded-xl border border-slate-200 dark:border-slate-800 transition shadow-xs text-xs cursor-pointer flex items-center justify-center"
        >
          Space
        </button>
        <button
          id="kbd-key-backspace"
          onClick={onBackspace}
          className="flex-1 max-w-[120px] h-10 sm:h-12 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold rounded-xl border border-amber-100 dark:border-amber-900/30 transition shadow-xs text-xs cursor-pointer flex items-center justify-center"
        >
          Backspace
        </button>
      </div>
    </div>
  );
}
