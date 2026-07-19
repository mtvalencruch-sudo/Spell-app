import React, { useState, useEffect, useRef } from "react";
import { WordSet, PracticeSessionWord } from "../types";
import { 
  Check, 
  X, 
  ArrowRight, 
  RotateCcw, 
  ChevronLeft, 
  Delete,
  Keyboard,
  MousePointerClick
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { classifyLetter, getLetterTypeStyles, scrambleWord } from "../utils/spelling";

interface PracticeArenaProps {
  wordSet: WordSet;
  streak: number;
  onFinishSession: (wordsPlayed: PracticeSessionWord[]) => void;
  onBackToDashboard: () => void;
}

export function PracticeArena({ wordSet, streak, onFinishSession, onBackToDashboard }: PracticeArenaProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const words = wordSet.words;
  const currentWord = words[currentIndex] || "";
  
  // Spelling inputs & state
  const [userAttempt, setUserAttempt] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledTiles, setShuffledTiles] = useState<string[]>([]);
  const [tileUsedIndices, setTileUsedIndices] = useState<number[]>([]);
  const [completedWords, setCompletedWords] = useState<PracticeSessionWord[]>([]);

  // Focus and keyboard listeners
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize new word
  useEffect(() => {
    if (currentWord) {
      setUserAttempt([]);
      setIsSubmitted(false);
      setIsCorrect(false);
      setShuffledTiles(scrambleWord(currentWord));
      setTileUsedIndices([]);
    }
  }, [currentIndex, currentWord]);

  // Focus container for keyboard listener
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [currentIndex]);

  // Handle Keyboard Inputs
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isSubmitted) {
      if (e.key === "Enter") {
        handleNextWord();
      }
      return;
    }

    const key = e.key.toLowerCase();

    // Alphabet keys
    if (key.length === 1 && key >= "a" && key <= "z") {
      if (userAttempt.length < currentWord.length) {
        const letter = e.key.toUpperCase();
        // Append letter
        const newAttempt = [...userAttempt, letter];
        setUserAttempt(newAttempt);

        // Try to find a matching tile index to mark as used
        const tileIndexToUse = shuffledTiles.findIndex(
          (t, idx) => t.toUpperCase() === letter && !tileUsedIndices.includes(idx)
        );
        if (tileIndexToUse !== -1) {
          setTileUsedIndices([...tileUsedIndices, tileIndexToUse]);
        }
      }
    } else if (e.key === "Backspace") {
      handleBackspace();
    } else if (e.key === "Enter") {
      if (userAttempt.length === currentWord.length) {
        handleVerify();
      }
    }
  };

  const handleBackspace = () => {
    if (userAttempt.length > 0) {
      const poppedLetter = userAttempt[userAttempt.length - 1];
      setUserAttempt(userAttempt.slice(0, -1));

      // Reclaim the last tile that matches this popped letter
      if (tileUsedIndices.length > 0) {
        const indexToRestore = tileUsedIndices.findLast((usedIdx) => 
          shuffledTiles[usedIdx].toUpperCase() === poppedLetter.toUpperCase()
        );
        if (indexToRestore !== undefined) {
          setTileUsedIndices(tileUsedIndices.filter((idx) => idx !== indexToRestore));
        } else {
          setTileUsedIndices(tileUsedIndices.slice(0, -1));
        }
      }
    }
  };

  const handleTileClick = (letter: string, index: number) => {
    if (isSubmitted) return;

    if (tileUsedIndices.includes(index)) {
      const attemptLetterIdx = userAttempt.findIndex((char, attIdx) => {
        return char.toUpperCase() === letter.toUpperCase() && 
               tileUsedIndices.indexOf(index) === attIdx;
      });
      
      setUserAttempt(userAttempt.filter((_, idx) => idx !== attemptLetterIdx));
      setTileUsedIndices(tileUsedIndices.filter((idx) => idx !== index));
    } else {
      if (userAttempt.length < currentWord.length) {
        setUserAttempt([...userAttempt, letter.toUpperCase()]);
        setTileUsedIndices([...tileUsedIndices, index]);
      }
    }
  };

  // Sound Synth Generator
  const playSound = (type: "success" | "error") => {
    if (!("AudioContext" in window || "webkitAudioContext" in window)) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      if (type === "success") {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          
          gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  };

  const handleVerify = () => {
    if (userAttempt.length === 0) return;
    
    const spelling = userAttempt.join("").toLowerCase();
    const correctSpelling = currentWord.toLowerCase();
    const isCorrectAttempt = spelling === correctSpelling;

    setIsCorrect(isCorrectAttempt);
    setIsSubmitted(true);
    playSound(isCorrectAttempt ? "success" : "error");

    const updatedCompleted = [
      ...completedWords,
      {
        word: currentWord,
        correct: isCorrectAttempt,
        userAttempt: userAttempt.join(""),
      }
    ];
    setCompletedWords(updatedCompleted);
  };

  const handleNextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinishSession(completedWords);
    }
  };

  const handleClear = () => {
    setUserAttempt([]);
    setTileUsedIndices([]);
  };

  return (
    <div 
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className="outline-none space-y-6 max-w-3xl mx-auto"
    >
      {/* Header Back & Progress bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base line-clamp-1">{wordSet.name}</h3>
            <p className="text-xs text-slate-400 font-mono">Spelling Lab Practice</p>
          </div>
        </div>

        {/* Word count & Progress index & Streak */}
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-500 font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-mono">
              <span>{streak} 🔥</span>
            </div>
          )}

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-400 font-mono">WORD INDEX</span>
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{currentIndex + 1} of {words.length}</p>
          </div>
          
          <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
            <div 
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Spell Board Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-8 relative overflow-hidden">
        {/* Top Indicators */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase font-mono">
              Writing & Spelling Lab
            </span>
          </div>

          {/* Instruction Cue */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg">
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span>Type on keyboard or tap tiles</span>
          </div>
        </div>

        {/* Target Word Display */}
        <div className="text-center py-6 px-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 max-w-sm mx-auto space-y-1">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">
            Target Word
          </span>
          <h2 className="text-3.5xl font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase font-sans">
            {currentWord}
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">
            Reassemble the scrambled letters below to spell it
          </p>
        </div>

        {/* Spelling Answer Boxes */}
        <div className="flex flex-wrap justify-center gap-3.5 sm:gap-4 py-4 min-h-[96px]">
          {Array.from({ length: currentWord.length }).map((_, index) => {
            const letter = userAttempt[index] || "";
            const type = letter ? classifyLetter(letter) : "other";
            const colors = getLetterTypeStyles(type);

            return (
              <div
                key={index}
                className={`w-12 h-16 sm:w-16 sm:h-22 rounded-2xl border-2 flex flex-col items-center justify-center text-2xl sm:text-3.5xl font-black uppercase font-mono transition-all duration-200 relative shadow-xs ${
                  letter 
                    ? `${colors.bg} ${colors.border} ${colors.text} scale-102 ring-4 ${type === "vowel" ? "ring-red-500/5" : "ring-blue-500/5"}` 
                    : "border-dashed border-indigo-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 text-slate-300 dark:text-slate-800"
                } ${
                  !isSubmitted && userAttempt.length === index 
                    ? "ring-4 ring-indigo-500/20 border-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10 animate-pulse" 
                    : ""
                }`}
              >
                <span className={letter ? "-mt-2" : ""}>{letter}</span>
                {letter && (
                  <span className={`absolute bottom-2 text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none ${
                    type === "vowel" ? "text-red-400 dark:text-red-500/60" : "text-blue-400 dark:text-blue-500/60"
                  }`}>
                    {type}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrambled Interactive Tile Pool */}
        <div className="space-y-4 pt-2">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 font-semibold flex items-center justify-center gap-1.5 font-display">
            <MousePointerClick className="w-4 h-4 text-indigo-400" />
            Click tiles to spell or click backspace to edit
          </p>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 min-h-[56px] py-2">
            {shuffledTiles.map((letter, idx) => {
              const isUsed = tileUsedIndices.includes(idx);
              const type = classifyLetter(letter);
              const colors = getLetterTypeStyles(type);

              return (
                <motion.button
                  whileHover={!isUsed && !isSubmitted ? { y: -3, scale: 1.05 } : {}}
                  whileTap={!isUsed && !isSubmitted ? { scale: 0.95 } : {}}
                  key={idx}
                  onClick={() => handleTileClick(letter, idx)}
                  disabled={isSubmitted}
                  className={`w-11 h-12 sm:w-14 sm:h-15 rounded-xl border-2 flex flex-col items-center justify-center text-lg sm:text-xl font-black uppercase font-mono transition-all duration-200 shadow-md cursor-pointer relative ${
                    isUsed 
                      ? "bg-slate-100 dark:bg-slate-850 text-slate-300 dark:text-slate-700 border-slate-100 dark:border-slate-800/80 opacity-30 shadow-none pointer-events-none scale-95" 
                      : `${colors.bg} ${colors.border} ${colors.text} hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-none`
                  }`}
                >
                  <span>{letter}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Verification feedback embedded inside the single board */}
        <AnimatePresence mode="wait">
          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-5 rounded-2xl border text-center space-y-2 max-w-md mx-auto ${
                isCorrect 
                  ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400" 
                  : "bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-400"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isCorrect ? (
                  <div className="p-1 bg-emerald-500 text-white rounded-full">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : (
                  <div className="p-1 bg-rose-500 text-white rounded-full">
                    <X className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
                <h3 className="font-extrabold text-sm sm:text-base">
                  {isCorrect ? "Stellar Spelling!" : "Almost Got It!"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isCorrect 
                  ? "Awesome job! You've spelled this word perfectly." 
                  : `The correct spelling is "${currentWord.toUpperCase()}".`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submission and Control Actions */}
        <div className="pt-6 border-t border-slate-50 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              disabled={isSubmitted || userAttempt.length === 0}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={handleBackspace}
              disabled={isSubmitted || userAttempt.length === 0}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Delete className="w-3.5 h-3.5" />
              Backspace
            </button>
          </div>

          <div className="flex gap-3">
            {!isSubmitted ? (
              <button
                onClick={handleVerify}
                disabled={userAttempt.length < currentWord.length}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                <Check className="w-4 h-4" />
                Verify Spelling
              </button>
            ) : (
              <button
                onClick={handleNextWord}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none animate-bounce"
              >
                <span>{currentIndex < words.length - 1 ? "Next Word" : "Complete Practice"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
