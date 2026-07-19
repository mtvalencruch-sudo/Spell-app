import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Sparkles, CheckCircle2, Lock, HelpCircle, Trophy, RefreshCw, XCircle, BookOpen, Brain, Play, Check, Home } from "lucide-react";
import { WordSet, PRACTICE_LEVELS, PracticeLevel, PracticeSessionWord } from "../types";
import { LetterTile } from "./LetterTile";
import { VirtualKeyboard } from "./VirtualKeyboard";
import { isVowel, isConsonant, getLetterType } from "../utils/letterUtils";
import { getSetByCode } from "../utils/localSets";

interface StudentPracticeProps {
  accessCode: string;
  onBack: () => void;
  onSaveHistory?: (completedWords: PracticeSessionWord[]) => void;
}

export function StudentPractice({ accessCode, onBack, onSaveHistory }: StudentPracticeProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wordSet, setWordSet] = useState<WordSet | null>(null);

  // Student details bound to session
  const [studentName, setStudentName] = useState<string>(() => sessionStorage.getItem("spell_it_student_name") || "");
  const [studentClass, setStudentClass] = useState<string>(() => sessionStorage.getItem("spell_it_student_class") || "");

  // Practice progress states
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [showLevelIntro, setShowLevelIntro] = useState<boolean>(true);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [currentWordIdx, setCurrentWordIdx] = useState<number>(0);
  const [shuffledWordIndices, setShuffledWordIndices] = useState<number[]>([]);

  // Current spelling round states
  const [typedLetters, setTypedLetters] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [levelUpCelebration, setLevelUpCelebration] = useState<boolean>(false);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [solvedWordsSet, setSolvedWordsSet] = useState<string[]>([]);
  const [sessionWords, setSessionWords] = useState<PracticeSessionWord[]>([]);

  // Transient physical keyboard accent tracking
  const pendingAccentRef = useRef<string | null>(null);

  // Target word computation helpers
  const targetWord = wordSet && shuffledWordIndices.length > 0 
    ? wordSet.words[shuffledWordIndices[currentWordIdx]] 
    : "";

  const targetWordLower = targetWord ? targetWord.toLowerCase() : "";
  const currentWordMetadata = wordSet?.wordMetadata?.[targetWordLower];
  const activeLevelCustomization = currentLevel === 4
    ? (wordSet?.levelCustomizations?.[4] || { showDefinition: true, showPicture: true })
    : { showDefinition: false, showPicture: false };

  // Compute what letters are missing for the current level
  const targetLettersList = targetWord ? targetWord.split("") : [];
  
  // Vowels sequence in target word
  const targetVowels = targetLettersList.filter(isVowel);
  // Consonants sequence in target word
  const targetConsonants = targetLettersList.filter(isConsonant);

  // Compute non-standard characters in the target word (accented letters, ñ, etc.)
  // and always include standard accented Spanish vowels (á, é, í, ó, ú)
  const extraKeys = useMemo(() => {
    const defaultAccented = ["á", "é", "í", "ó", "ú"];
    const found = new Set<string>(defaultAccented);
    if (targetWord) {
      const standardLetters = new Set("abcdefghijklmnopqrstuvwxyz".split(""));
      for (const char of targetWord.toLowerCase()) {
        if (/^\p{L}$/u.test(char) && !standardLetters.has(char)) {
          found.add(char);
        }
      }
    }
    return Array.from(found);
  }, [targetWord]);

  // Determine required number of input characters based on level (exclude space for level 1 & 4)
  let requiredInputLength = 0;
  if (currentLevel === 1 || currentLevel === 4) {
    requiredInputLength = targetLettersList.filter(c => c !== " ").length;
  } else if (currentLevel === 2) {
    requiredInputLength = targetVowels.length;
  } else if (currentLevel === 3) {
    requiredInputLength = targetConsonants.length;
  }

  // A 2D array of words, where each element is an object with { letter, originalIdx }
  const structuredWords = useMemo(() => {
    if (!targetWord) return [];
    const parts = targetWord.split(" ");
    let currentGlobalIdx = 0;
    return parts.map((part) => {
      const chars = part.split("").map((char) => {
        const idx = currentGlobalIdx;
        currentGlobalIdx++;
        return { letter: char, originalIdx: idx };
      });
      currentGlobalIdx++; // Skip the space character in the global index count
      return chars;
    });
  }, [targetWord]);

  // Map flat typedLetters to visual layout, skipping spaces
  const getCharToDisplayAndCursor = (fullWordIdx: number) => {
    const char = targetLettersList[fullWordIdx];
    if (char === " ") {
      return { charToDisplay: " ", isGuide: false, isCurrentTarget: false };
    }

    let charToDisplay = "";
    let isGuide = false;
    let isCurrentTarget = false;

    if (currentLevel === 1 || currentLevel === 4) {
      // Relative index is the number of non-space characters before this index
      const relativeIdx = targetLettersList.slice(0, fullWordIdx).filter(c => c !== " ").length;
      charToDisplay = typedLetters[relativeIdx] || "";
      isCurrentTarget = (relativeIdx === typedLetters.length);
    } else if (currentLevel === 2) {
      // Vowels level
      if (isConsonant(char)) {
        charToDisplay = char;
        isGuide = true;
      } else if (isVowel(char)) {
        const relativeIdx = targetLettersList.slice(0, fullWordIdx).filter(isVowel).length;
        charToDisplay = typedLetters[relativeIdx] || "";
        isCurrentTarget = (relativeIdx === typedLetters.length);
      }
    } else if (currentLevel === 3) {
      // Consonants level
      if (isVowel(char)) {
        charToDisplay = char;
        isGuide = true;
      } else if (isConsonant(char)) {
        const relativeIdx = targetLettersList.slice(0, fullWordIdx).filter(isConsonant).length;
        charToDisplay = typedLetters[relativeIdx] || "";
        isCurrentTarget = (relativeIdx === typedLetters.length);
      }
    }

    return { charToDisplay, isGuide, isCurrentTarget };
  };

  // Fetch word set on mount
  useEffect(() => {
    fetchWordSet();
  }, [accessCode]);

  // Listen for physical computer keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if student is in celebration, or evaluating answer, or if loading
      if (loading || levelUpCelebration || isCorrect !== null) return;

      // Ignore modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore if user is typing in an input or textarea (like teacher passcode)
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      let key = e.key;

      // Handle raw accent / dead keys
      if (
        key === "Dead" ||
        key === "'" ||
        key === "´" ||
        key === "`" ||
        key === "~" ||
        key === "^" ||
        key === "\"" ||
        key === "¨"
      ) {
        pendingAccentRef.current = key;
        return; // Wait for the base character key
      }

      // If we have a pending accent, resolve it with the current key
      const accent = pendingAccentRef.current;
      if (accent) {
        pendingAccentRef.current = null; // Clear immediately

        // Clear accent if control key is pressed
        if (key === "Backspace" || key === "Escape" || key === "Delete" || key === " ") {
          // Continue handling control keys normally
        } else {
          const baseChar = key.toLowerCase();
          let combined = baseChar;

          if (accent === "Dead" || accent === "'" || accent === "´" || accent === "`") {
            // Acute / grave accent combinations
            const mapping: Record<string, string> = {
              a: "á", e: "é", i: "í", o: "ó", u: "ú",
              n: "ñ"
            };
            if (mapping[baseChar]) {
              combined = mapping[baseChar];
            }
          } else if (accent === "~") {
            const mapping: Record<string, string> = {
              n: "ñ", a: "ã", o: "õ"
            };
            if (mapping[baseChar]) {
              combined = mapping[baseChar];
            }
          } else if (accent === "^") {
            const mapping: Record<string, string> = {
              a: "â", e: "ê", i: "î", o: "ô", u: "û"
            };
            if (mapping[baseChar]) {
              combined = mapping[baseChar];
            }
          } else if (accent === "\"" || accent === "¨") {
            const mapping: Record<string, string> = {
              u: "ü", a: "ä", e: "ë", i: "ï", o: "ö"
            };
            if (mapping[baseChar]) {
              combined = mapping[baseChar];
            }
          }

          key = combined;
        }
      }

      if (key === "Backspace") {
        e.preventDefault();
        handleBackspace();
        
        // Highlight Backspace virtual key
        const btn = document.getElementById("kbd-key-backspace");
        if (btn) {
          btn.classList.add("scale-95", "bg-amber-100", "dark:bg-amber-950/40");
          setTimeout(() => {
            btn.classList.remove("scale-95", "bg-amber-100", "dark:bg-amber-950/40");
          }, 150);
        }
      } else if (key === "Escape" || key === "Delete") {
        e.preventDefault();
        handleClear();

        // Highlight Clear virtual key
        const btn = document.getElementById("kbd-key-clear");
        if (btn) {
          btn.classList.add("scale-95", "bg-rose-100", "dark:bg-rose-950/40");
          setTimeout(() => {
            btn.classList.remove("scale-95", "bg-rose-100", "dark:bg-rose-950/40");
          }, 150);
        }
      } else if (key === " ") {
        e.preventDefault();
        handleKeyPress(" ");

        // Highlight Space virtual key
        const btn = document.getElementById("kbd-key-space");
        if (btn) {
          btn.classList.add("scale-95", "bg-slate-200", "dark:bg-slate-700");
          setTimeout(() => {
            btn.classList.remove("scale-95", "bg-slate-200", "dark:bg-slate-700");
          }, 150);
        }
      } else if (key.length === 1 && /^\p{L}$/u.test(key)) {
        e.preventDefault();
        handleKeyPress(key);

        // Highlight matched alphabetical virtual key
        const btn = document.getElementById(`kbd-key-${key.toLowerCase()}`);
        if (btn) {
          btn.classList.add("scale-95", "bg-indigo-50", "dark:bg-indigo-950/40", "border-indigo-300");
          setTimeout(() => {
            btn.classList.remove("scale-95", "bg-indigo-50", "dark:bg-indigo-950/40", "border-indigo-300");
          }, 150);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, levelUpCelebration, isCorrect, typedLetters, requiredInputLength, currentLevel]);

  const fetchWordSet = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const data = getSetByCode(accessCode);
      if (!data) {
        throw new Error(`Vocabulary set with code "${accessCode}" not found.`);
      }

      setWordSet(data);

      // Create shuffled indices for practicing
      shuffleWords(data.words.length);
      
      // Load saved progress for this set if any (to keep state on reload)
      const savedLevel = localStorage.getItem(`spell_it_progress_level_${data.code}`);
      const savedUnlocked = localStorage.getItem(`spell_it_unlocked_levels_${data.code}`);
      
      let initialUnlocked = [1];
      if (savedUnlocked) {
        try {
          const parsed = JSON.parse(savedUnlocked);
          if (Array.isArray(parsed) && parsed.length > 0) {
            initialUnlocked = parsed.map(Number).filter(n => n >= 1 && n <= 4);
          }
        } catch (e) {
          initialUnlocked = [1];
        }
      }
      if (!initialUnlocked.includes(1)) {
        initialUnlocked.push(1);
      }
      setUnlockedLevels(initialUnlocked);

      if (savedLevel) {
        const parsedLevel = parseInt(savedLevel, 10);
        if (initialUnlocked.includes(parsedLevel)) {
          setCurrentLevel(parsedLevel);
        } else {
          setCurrentLevel(Math.min(...initialUnlocked));
        }
      } else {
        setCurrentLevel(1);
      }
      
      // Always show level selection on entry unless already chosen
      setShowLevelIntro(true);
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const shuffleWords = (length: number) => {
    const indices = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledWordIndices(indices);
    setCurrentWordIdx(0);
  };

  // Keyboard controls
  const handleKeyPress = (char: string) => {
    if (isCorrect !== null) return; // Block input during answer evaluation

    const lowercaseChar = char.toLowerCase();

    // Check level-specific constraints
    if (currentLevel === 2 && !isVowel(lowercaseChar)) {
      // Missing vowels level - reject consonants
      triggerInputWarning();
      return;
    }
    if (currentLevel === 3 && !isConsonant(lowercaseChar)) {
      // Missing consonants level - reject vowels
      triggerInputWarning();
      return;
    }

    if (typedLetters.length < requiredInputLength) {
      const updated = [...typedLetters, lowercaseChar];
      setTypedLetters(updated);
      
      // Auto-check once they type all characters
      if (updated.length === requiredInputLength) {
        checkAnswer(updated);
      }
    }
  };

  const handleBackspace = () => {
    if (isCorrect !== null) return;
    if (typedLetters.length > 0) {
      setTypedLetters(typedLetters.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (isCorrect !== null) return;
    setTypedLetters([]);
    setIsCorrect(null);
  };

  const triggerInputWarning = () => {
    // Quick vibration or visual shake on input container
    const inputContainer = document.getElementById("spell-input-container");
    if (inputContainer) {
      inputContainer.classList.add("animate-shake", "border-rose-400");
      setTimeout(() => {
        inputContainer.classList.remove("animate-shake", "border-rose-400");
      }, 300);
    }
  };

  // Verify spelling accuracy
  const checkAnswer = (lettersToCheck: string[]) => {
    const typedWord = lettersToCheck.join("").toLowerCase();

    let checkPassed = false;

    if (currentLevel === 1 || currentLevel === 4) {
      const targetNoSpaces = targetWord.replace(/\s+/g, "").toLowerCase();
      checkPassed = typedWord === targetNoSpaces;
    } else if (currentLevel === 2) {
      // Match exact vowel sequence
      checkPassed = typedWord === targetVowels.join("").toLowerCase();
    } else if (currentLevel === 3) {
      // Match exact consonant sequence
      checkPassed = typedWord === targetConsonants.join("").toLowerCase();
    }

    const newSessionWord: PracticeSessionWord = {
      word: targetWord,
      correct: checkPassed,
      userAttempt: lettersToCheck.join("")
    };
    const updatedSessionWords = [...sessionWords, newSessionWord];
    setSessionWords(updatedSessionWords);

    if (checkPassed) {
      setIsCorrect(true);
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);
      
      setCorrectAttempts(prev => prev + 1);
      setTotalAttempts(prev => prev + 1);
      if (targetWord && !solvedWordsSet.includes(targetWord)) {
        setSolvedWordsSet(prev => [...prev, targetWord]);
      }

      // Check for level completion (based on number of words on the list)
      const totalWords = wordSet!.words.length;
      if (newCorrectCount >= totalWords) {
        if (onSaveHistory) {
          onSaveHistory(updatedSessionWords);
        }

        // Unlock next level if available
        const nextLvl = currentLevel + 1;
        if (nextLvl <= 4 && !unlockedLevels.includes(nextLvl)) {
          const updatedUnlocked = [...unlockedLevels, nextLvl];
          setUnlockedLevels(updatedUnlocked);
          localStorage.setItem(`spell_it_unlocked_levels_${wordSet!.code}`, JSON.stringify(updatedUnlocked));
        }
        
        // Show celebration screen
        setTimeout(() => {
          setLevelUpCelebration(true);
        }, 1200);
      } else {
        // Normal progression to next word
        setTimeout(() => {
          advanceToNextWord();
        }, 1500);
      }
    } else {
      setIsCorrect(false);
      setTotalAttempts(prev => prev + 1);
      // Let them retry or check after a short shake delay
      setTimeout(() => {
        setIsCorrect(null);
      }, 1000);
    }
  };

  const advanceToNextWord = () => {
    setTypedLetters([]);
    setIsCorrect(null);
    setShowHint(false);

    // Increment word index, recycling if they reached the end
    if (currentWordIdx + 1 >= shuffledWordIndices.length) {
      shuffleWords(wordSet!.words.length);
    } else {
      setCurrentWordIdx(currentWordIdx + 1);
    }
  };

  const handleLevelSelect = (lvlId: number) => {
    if (!unlockedLevels.includes(lvlId)) return;
    setCurrentLevel(lvlId);
    setCorrectCount(0); // Reset count for the new level practice session
    setTypedLetters([]);
    setIsCorrect(null);
    setShowHint(false);
    setTotalAttempts(0);
    setCorrectAttempts(0);
    setSolvedWordsSet([]);
    setSessionWords([]);
    localStorage.setItem(`spell_it_progress_level_${wordSet!.code}`, lvlId.toString());
  };

  const handleProceedToNextLevel = () => {
    const nextLvl = currentLevel + 1;
    if (nextLvl <= 4) {
      setCurrentLevel(nextLvl);
      setCorrectCount(0);
      setTypedLetters([]);
      setIsCorrect(null);
      setShowHint(false);
      setLevelUpCelebration(false);
      setTotalAttempts(0);
      setCorrectAttempts(0);
      setSolvedWordsSet([]);
      setSessionWords([]);
      localStorage.setItem(`spell_it_progress_level_${wordSet!.code}`, nextLvl.toString());
    } else {
      // Completed level 4!
      setLevelUpCelebration(false);
      setCurrentLevel(1);
      setCorrectCount(0);
      setTypedLetters([]);
      setIsCorrect(null);
      setShowHint(false);
      setTotalAttempts(0);
      setCorrectAttempts(0);
      setSolvedWordsSet([]);
      setSessionWords([]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading vocabulary set...</p>
      </div>
    );
  }

  if (errorMsg || !wordSet) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-fade-in">
        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-200">
          <XCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-display font-bold text-slate-800">Spelling Set Not Found</h3>
          <p className="text-sm text-slate-500">
            We couldn't retrieve spelling set with the code <span className="font-mono font-bold text-indigo-600">"{accessCode}"</span>.
          </p>
          {errorMsg && <p className="text-xs text-rose-500 bg-rose-50/50 p-2 rounded border border-rose-100">{errorMsg}</p>}
        </div>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
        >
          Go Back and Retry
        </button>
      </div>
    );
  }

  // Visual layout helpers
  const activeLevelConfig = PRACTICE_LEVELS.find(l => l.id === currentLevel) as PracticeLevel;

  if (levelUpCelebration) {
    const accuracy = totalAttempts > 0 
      ? Math.round((correctAttempts / totalAttempts) * 100) 
      : 100;

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col animate-fade-in -m-4 sm:-m-8 justify-center items-center p-4">
        {/* Level 6 Card container */}
        <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200/85 p-8 sm:p-10 text-center flex flex-col items-center justify-center space-y-6 shadow-md relative overflow-hidden">
          <span className="p-4 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 animate-bounce">
            <Trophy className="w-8 h-8" />
          </span>

          <h2 className="text-3xl font-extrabold text-slate-900 font-display">Awesome Job! 🎉</h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-md">
            You successfully completed <span className="font-bold text-indigo-600">"{activeLevelConfig.name}"</span> for <strong>{wordSet.name}</strong>!
          </p>

          {/* Level 7: Sibling Divs for Accuracy and Words Solved */}
          <div className="w-full bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 text-left flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest font-display">Accuracy</span>
              <span className="block text-2xl font-black text-slate-900 font-mono mt-0.5">{accuracy}%</span>
            </div>
            <span className="p-2.5 bg-white rounded-xl text-indigo-600 border border-indigo-100 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>

          <div className="w-full bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100 text-left flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-display">Words Solved</span>
              <span className="block text-2xl font-black text-slate-900 font-mono mt-0.5">{solvedWordsSet.length} / {wordSet.words.length}</span>
              <span className="block text-[10px] text-slate-500 font-sans mt-1 max-w-xs truncate" title={solvedWordsSet.join(", ")}>
                {solvedWordsSet.join(", ") || "All words complete"}
              </span>
            </div>
            <span className="p-2.5 bg-white rounded-xl text-emerald-600 border border-emerald-100 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-2">
            {currentLevel < 4 ? (
              <button
                onClick={handleProceedToNextLevel}
                className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-sm font-display"
              >
                Proceed to Level {currentLevel + 1} 🚀
              </button>
            ) : (
              <button
                onClick={() => {
                  setLevelUpCelebration(false);
                  setCurrentLevel(1);
                  setCorrectCount(0);
                  setTypedLetters([]);
                  setIsCorrect(null);
                  setTotalAttempts(0);
                  setCorrectAttempts(0);
                  setSolvedWordsSet([]);
                  setSessionWords([]);
                  shuffleWords(wordSet.words.length);
                }}
                className="flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer text-sm font-display"
              >
                Restart Challenge
              </button>
            )}

            <button
              onClick={() => {
                setLevelUpCelebration(false);
                setCorrectCount(0);
                setTypedLetters([]);
                setIsCorrect(null);
                setTotalAttempts(0);
                setCorrectAttempts(0);
                setSolvedWordsSet([]);
                setSessionWords([]);
                setShowLevelIntro(true);
              }}
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors cursor-pointer text-sm font-display"
            >
              Choose Level
            </button>

            <button
              onClick={() => {
                setLevelUpCelebration(false);
                setCorrectCount(0);
                setTypedLetters([]);
                setIsCorrect(null);
                setTotalAttempts(0);
                setCorrectAttempts(0);
                setSolvedWordsSet([]);
                setSessionWords([]);
                onBack();
              }}
              className="px-5 py-3 bg-slate-150 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer text-sm font-display flex items-center justify-center gap-1.5"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!studentName.trim() || !studentClass.trim()) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 -m-4 sm:-m-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

          <div className="space-y-2 relative z-10">
            <div className="w-12 h-12 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black font-display text-slate-800 dark:text-slate-100">
              Welcome Student!
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              Before you access the spelling set <span className="font-semibold text-slate-800 dark:text-slate-100">"{wordSet?.name}"</span>, please enter your details.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const nameInput = (e.currentTarget.elements.namedItem("studentNameVal") as HTMLInputElement).value.trim();
              const classInput = (e.currentTarget.elements.namedItem("studentClassVal") as HTMLInputElement).value.trim();
              if (nameInput && classInput) {
                sessionStorage.setItem("spell_it_student_name", nameInput);
                sessionStorage.setItem("spell_it_student_class", classInput);
                localStorage.setItem("spell_it_student_name", nameInput);
                localStorage.setItem("spell_it_student_class", classInput);
                setStudentName(nameInput);
                setStudentClass(classInput);
              }
            }}
            className="space-y-4 max-w-sm mx-auto relative z-10 text-left"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Full Name</label>
              <input
                type="text"
                name="studentNameVal"
                required
                placeholder="e.g. Liam Smith"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-semibold text-slate-800 dark:text-slate-100 transition-all placeholder:text-slate-400"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class / Grade</label>
              <input
                type="text"
                name="studentClassVal"
                required
                placeholder="e.g. 5th Grade, Class A"
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-semibold text-slate-800 dark:text-slate-100 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold font-display transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="flex-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
              >
                Begin Practice
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col animate-fade-in -m-4 sm:-m-8">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-b border-slate-200 gap-4 select-none">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Exit to Main Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{wordSet.name}</h1>
            <p className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Set Code: {wordSet.code}</p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <button
            onClick={() => setShowLevelIntro(true)}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Choose Level
          </button>

          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-display">Difficulty</p>
              <p className="text-xs font-bold text-slate-700 font-mono">Level {currentLevel}/4</p>
            </div>
            
            {/* Interactive Level Button Selector */}
            <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
              {PRACTICE_LEVELS.map((lvl) => {
                const isUnlocked = unlockedLevels.includes(lvl.id);
                const isActive = currentLevel === lvl.id;
                
                // Color schemes per level
                const levelColors: Record<number, string> = {
                  1: "bg-indigo-600 hover:bg-indigo-700 ring-indigo-100",
                  2: "bg-rose-600 hover:bg-rose-700 ring-rose-100",
                  3: "bg-blue-600 hover:bg-blue-700 ring-blue-100",
                  4: "bg-amber-600 hover:bg-amber-700 ring-amber-100",
                };

                return (
                  <button
                    id={`circle-lvl-${lvl.id}`}
                    key={lvl.id}
                    onClick={() => {
                      handleLevelSelect(lvl.id);
                      setShowLevelIntro(false);
                    }}
                    disabled={!isUnlocked}
                    className={`w-8 h-8 rounded-xl text-xs font-black font-display flex items-center justify-center transition-all duration-150 cursor-pointer ${
                      isActive 
                        ? `${levelColors[lvl.id] || "bg-indigo-600"} text-white scale-110 shadow-sm ring-4` 
                        : isUnlocked 
                          ? "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60" 
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                    title={lvl.name}
                  >
                    {lvl.id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>
      {/* Main Grid Layout */}
      <main className="flex-1 flex flex-col overflow-hidden w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 gap-6">
        
        {showLevelIntro ? (
          /* LEVEL SELECTION INTRO */
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-fade-in py-4 max-w-3xl mx-auto">
             <div className="text-center space-y-3">
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black tracking-widest uppercase font-display border border-indigo-100">
                 <Sparkles className="w-3.5 h-3.5" />
                 Ready to Practice
               </div>
               <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                 Choose Your Spelling Level
               </h2>
               <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">
                 Select from Level 1 to 4 to begin practicing words in <span className="font-bold text-slate-850">"{wordSet.name}"</span>. 
               </p>
             </div>

             {/* 2x2 Grid of levels */}
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4.5 w-full">
               {PRACTICE_LEVELS.map((lvl) => {
                 const isSelected = currentLevel === lvl.id;
                 const isUnlocked = unlockedLevels.includes(lvl.id);
                 
                 // Unique styling configs for levels
                 const levelStyle: Record<number, { themeColor: string; bgSoft: string; borderActive: string; icon: any; desc: string }> = {
                   1: {
                     themeColor: "text-indigo-600 bg-indigo-50 border-indigo-200",
                     bgSoft: "bg-indigo-50/45 border-indigo-100",
                     borderActive: "border-indigo-500 ring-2 ring-indigo-100",
                     icon: BookOpen,
                     desc: "Build muscle memory by spelling each full target word exactly as displayed."
                   },
                   2: {
                     themeColor: "text-rose-600 bg-rose-50 border-rose-200",
                     bgSoft: "bg-rose-50/45 border-rose-100",
                     borderActive: "border-rose-500 ring-2 ring-rose-100",
                     icon: Sparkles,
                     desc: "Identify & fill in only the missing red vowel letters (A, E, I, O, U) to spell the word."
                   },
                   3: {
                     themeColor: "text-blue-600 bg-blue-50 border-blue-200",
                     bgSoft: "bg-blue-50/45 border-blue-100",
                     borderActive: "border-blue-500 ring-2 ring-blue-100",
                     icon: Brain,
                     desc: "Identify & fill in only the missing blue consonant letters to complete the spelling."
                   },
                   4: {
                     themeColor: "text-amber-600 bg-amber-50 border-amber-200",
                     bgSoft: "bg-amber-50/45 border-amber-100",
                     borderActive: "border-amber-500 ring-2 ring-amber-100",
                     icon: Trophy,
                     desc: "The master level! No visual hints. Spell the entire word completely from memory."
                   }
                 };

                 const style = levelStyle[lvl.id] || levelStyle[1];
                 const IconComponent = style.icon;

                 return (
                   <button
                     key={lvl.id}
                     onClick={() => handleLevelSelect(lvl.id)}
                     disabled={!isUnlocked}
                     className={`text-left p-5 rounded-2xl border transition-all duration-200 relative group cursor-pointer flex flex-col justify-between h-full ${
                       isSelected 
                         ? `bg-white ${style.borderActive} shadow-md`
                         : isUnlocked
                           ? "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
                           : "bg-slate-100 border-slate-100 opacity-60 cursor-not-allowed"
                     }`}
                   >
                                           <div className="space-y-3 w-full">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl border ${
                            isSelected 
                              ? style.themeColor 
                              : isUnlocked 
                                ? "bg-slate-50 text-slate-700 border-slate-200" 
                                : "bg-slate-100 text-slate-400 border-slate-200/40"
                          }`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-150">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected
                            </span>
                          ) : !isUnlocked ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 px-2.5 py-0.5 rounded-md border border-slate-300/30">
                              <Lock className="w-3 h-3 text-slate-400" /> Locked
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                              Unlocked
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-slate-800 text-base font-display flex items-center gap-1.5">
                            {lvl.name}
                          </h3>
                          <p className="text-slate-500 text-xs leading-relaxed font-sans">
                            {style.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-400 w-full">
                        <span className="font-mono">Difficulty: {lvl.id} of 4</span>
                        {isUnlocked ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-sans">Ready to Play</span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1 font-sans font-medium">Complete Lvl {lvl.id - 1}</span>
                        )}
                      </div>
                   </button>
                 );
               })}
             </div>

             {/* Start Button */}
             <div className="w-full flex justify-center pt-4">
               <button
                 onClick={() => setShowLevelIntro(false)}
                 className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-150 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center gap-2 cursor-pointer font-display"
               >
                 <Play className="w-5 h-5 fill-current" />
                 Start Spelling Challenge
               </button>
             </div>
          </div>
        ) : (
          /* Practice Arena */
          <section className="flex-1 flex flex-col gap-6">
          {levelUpCelebration ? (
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 text-center flex flex-col items-center justify-center space-y-6 shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 animate-bounce shadow-xs">
                <Trophy className="w-10 h-10" />
              </div>
              <div className="space-y-2 max-w-md">
                <h2 className="text-3xl font-display font-bold text-slate-900">Awesome Job! 🎉</h2>
                <p className="text-slate-500 text-sm sm:text-base">
                  You successfully spelled {wordSet.words.length} words in <span className="font-bold text-indigo-600">"{activeLevelConfig.name}"</span>!
                </p>
              </div>

              <div className="w-full max-w-xs py-3 border-y border-slate-100 flex justify-around text-xs text-slate-400 font-mono font-bold">
                <div>
                  <span className="block text-slate-800 text-base">{wordSet.words.length}</span>
                  Total Words
                </div>
                <div className="border-r border-slate-200" />
                <div>
                  <span className="block text-slate-800 text-base">4 / 4</span>
                  Levels
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
                {currentLevel < 4 ? (
                  <button
                    onClick={handleProceedToNextLevel}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Proceed to Level {currentLevel + 1} 🚀
                  </button>
                ) : (
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-emerald-600 font-bold tracking-wider">🎉 CONGRATULATIONS! ALL LEVELS CONQUERED! 🎉</p>
                    <button
                      onClick={() => {
                        setLevelUpCelebration(false);
                        setCurrentLevel(1);
                        setCorrectCount(0);
                        setTypedLetters([]);
                        setIsCorrect(null);
                        setTotalAttempts(0);
                        setCorrectAttempts(0);
                        setSolvedWordsSet([]);
                        setSessionWords([]);
                        shuffleWords(wordSet.words.length);
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                    >
                      Restart Challenge
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setLevelUpCelebration(false);
                    setCorrectCount(0);
                    setTypedLetters([]);
                    setIsCorrect(null);
                    setTotalAttempts(0);
                    setCorrectAttempts(0);
                    setSolvedWordsSet([]);
                    setSessionWords([]);
                    shuffleWords(wordSet.words.length);
                  }}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Practice Lvl {currentLevel} Again
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Challenge Card */}
              <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-6 sm:p-10 relative min-h-[360px]">
                
                {/* Level Title Tag & Helper */}
                <div className="text-center mb-6 space-y-1">
                  <span className="px-3.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {activeLevelConfig.name}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-light text-slate-600 mt-2">
                    {currentLevel === 1 && "Spell the whole word"}
                    {currentLevel === 2 && <span>Fill in the <span className="text-red-500 font-bold underline decoration-2">vowels</span></span>}
                    {currentLevel === 3 && <span>Fill in the <span className="text-blue-500 font-bold underline decoration-2">consonants</span></span>}
                    {currentLevel === 4 && "Spell the word from memory"}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">{activeLevelConfig.instructions}</p>
                </div>

                {/* Clue Panel (with Custom Level settings check) */}
                {(() => {
                  const hasDef = !!(currentWordMetadata?.definition && activeLevelCustomization.showDefinition !== false);
                  const hasPic = !!(currentWordMetadata?.pictureUrl && activeLevelCustomization.showPicture !== false);

                  if (!hasDef && !hasPic) return null;

                  return (
                    <div id="word-clues-panel" className="mb-6 w-full max-w-md mx-auto bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-xs animate-fade-in select-none">
                      {hasPic && (
                        <div className="w-16 h-16 shrink-0 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30 flex items-center justify-center overflow-hidden shadow-xs">
                          {currentWordMetadata.pictureUrl!.startsWith("http") ? (
                            <img
                              src={currentWordMetadata.pictureUrl}
                              alt="Word clue illustration"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl">{currentWordMetadata.pictureUrl}</span>
                          )}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest block">
                          CLUE 💡
                        </span>
                        {hasDef ? (
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 italic leading-relaxed">
                            "{currentWordMetadata.definition}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            Spell the word matching this picture clue!
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Target Guides Display */}
                <div className="space-y-3 w-full flex flex-col items-center mb-8 select-none">
                  {structuredWords.map((wordRow, rowIdx) => (
                    <div key={rowIdx} className="flex flex-nowrap justify-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto pb-1">
                      {wordRow.map(({ letter, originalIdx }) => {
                        let isRevealed = false;
                        
                        if (currentLevel === 1) {
                          isRevealed = true;
                        } else if (currentLevel === 2) {
                          isRevealed = isConsonant(letter);
                        } else if (currentLevel === 3) {
                          isRevealed = isVowel(letter);
                        } else if (currentLevel === 4) {
                          isRevealed = false;
                        }

                        return (
                          <LetterTile
                            key={originalIdx}
                            letter={letter}
                            revealed={isRevealed}
                            size="lg"
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Student's typing assembly */}
                <div className="w-full max-w-xl space-y-3 pt-6 border-t border-slate-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your turn</span>
                  
                  <div
                    id="spell-input-container"
                    className={`
                      w-fit max-w-full mx-auto flex flex-col items-center gap-4 p-5 sm:px-10 rounded-2xl bg-slate-50 border border-slate-150 min-h-[100px] transition-all
                      ${isCorrect === true ? "bg-emerald-50/50 border-emerald-300" : ""}
                      ${isCorrect === false ? "bg-red-50/50 border-red-300" : ""}
                    `}
                  >
                    {structuredWords.map((wordRow, rowIdx) => (
                      <div key={rowIdx} className="flex flex-nowrap justify-center gap-1.5 sm:gap-2 max-w-full overflow-x-auto pb-1">
                        {wordRow.map(({ letter, originalIdx }) => {
                          const { charToDisplay, isGuide, isCurrentTarget } = getCharToDisplayAndCursor(originalIdx);
                          return (
                            <LetterTile
                              key={originalIdx}
                              letter={charToDisplay}
                              revealed={!!charToDisplay}
                              size="lg"
                              isCorrect={isCorrect}
                              className={isGuide ? "opacity-40" : ""}
                              pulse={isCurrentTarget && isCorrect === null}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Feedback line */}
                  <div className="h-6">
                    {isCorrect === true && (
                      <span className="text-emerald-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-1 animate-bounce">
                        ✓ Correct spelling! Proceeding...
                      </span>
                    )}
                    {isCorrect === false && (
                      <span className="text-red-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-1">
                        ✗ Try again! Backspace or Clear to fix.
                      </span>
                    )}
                    {isCorrect === null && showHint && (
                      <span className="text-slate-500 font-medium text-xs">
                        Hint: Starts with <span className="font-bold text-slate-700">"{targetWord.charAt(0)}"</span> — {targetWord.length} letters long.
                      </span>
                    )}
                  </div>
                </div>

                {/* Auxiliary Help Options */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    {showHint ? "Hide Hint" : "Show Hint 💡"}
                  </button>
                  <button
                    onClick={handleClear}
                    className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  >
                    Reset ↻
                  </button>
                </div>

                {/* Consonant/Vowel Key Indicators */}
                <div className="absolute bottom-4 flex gap-6 select-none opacity-80">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">CONSONANTS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">VOWELS</span>
                  </div>
                </div>

              </div>

              {/* Progress Track */}
              <div id="level-progress-track" className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Level Progress
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                    {correctCount} / {wordSet.words.length} words correct
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: wordSet.words.length }).map((_, index) => {
                    const completed = index < correctCount;
                    return (
                      <div
                        key={index}
                        className={`
                          flex-1 h-2 rounded-full transition-all duration-300
                          ${completed 
                            ? "bg-indigo-600 shadow-xs" 
                            : "bg-slate-100 border border-slate-200/50"
                          }
                        `}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Virtual Keyboard */}
              <div className="space-y-1.5">
                <VirtualKeyboard
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onClear={handleClear}
                  extraKeys={extraKeys}
                />
              </div>

            </div>
          )}
        </section>
        )}
      </main>

      {/* Footer Level Guide */}
      <footer className="px-6 py-4 bg-slate-900 flex flex-col sm:flex-row justify-between items-center text-white gap-4 select-none">
        <div className="flex items-center flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-700 rounded font-mono">L1</span>
            <span className="text-xs text-slate-300 font-medium">Copy Word</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-600 rounded font-mono">L2</span>
            <span className="text-xs text-slate-300 font-medium">Vowels</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-600 rounded font-mono">L3</span>
            <span className="text-xs text-slate-300 font-medium">Consonants</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-700 rounded font-mono">L4</span>
            <span className="text-xs text-slate-300 font-medium">Full Memory</span>
          </div>
        </div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
          Complete all {wordSet.words.length} correct words to level up
        </div>
      </footer>
    </div>
  );
}
