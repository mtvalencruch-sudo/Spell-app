import React, { useState, useEffect } from "react";
import { WordSet, PracticeHistory, PracticeSessionWord } from "./types";
import { DEFAULT_WORD_SETS } from "./constants/wordSets";
import { Dashboard } from "./components/Dashboard";
import { StudentPractice } from "./components/StudentPractice";
import { WordSetsManager } from "./components/WordSetsManager";
import { ProgressTracker } from "./components/ProgressTracker";
import { TeacherDashboard } from "./components/TeacherDashboard";
import { 
  Trophy, 
  Flame, 
  LayoutDashboard, 
  Gamepad2, 
  BookOpen, 
  TrendingUp,
  Award,
  Sun,
  Moon,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "newset" | "practice" | "wordsets" | "progress" | "teacher">("dashboard");
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [history, setHistory] = useState<PracticeHistory[]>([]);
  const [activeSet, setActiveSet] = useState<WordSet | null>(null);
  const [streak, setStreak] = useState(0);

  // Launching / Access gate state
  const [hasAccessedSet, setHasAccessedSet] = useState<boolean>(false);
  const [launchCode, setLaunchCode] = useState<string>("");
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Dark/Light Theme configuration (default is Light, clean Slate)
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Teacher Zone State
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [teacherCode, setTeacherCode] = useState<string>("1234");
  const [showTeacherModal, setShowTeacherModal] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const openTeacherModal = () => {
    setPasscodeError(null);
    setShowTeacherModal(true);
  };

  // Load from local storage on mount
  useEffect(() => {
    // Word sets
    const storedSets = localStorage.getItem("spell_it_word_sets");
    if (storedSets) {
      try {
        const parsed = JSON.parse(storedSets) as WordSet[];
        const oldDefaultCodes = ["short-vowels", "long-vowels", "vowel-teams", "consonant-blends", "challenging-words"];
        const filtered = parsed.filter(s => s.isCustom === true && !oldDefaultCodes.includes(s.code));
        setWordSets(filtered);
        if (filtered.length !== parsed.length) {
          localStorage.setItem("spell_it_word_sets", JSON.stringify(filtered));
        }
      } catch (e) {
        setWordSets(DEFAULT_WORD_SETS);
        localStorage.setItem("spell_it_word_sets", JSON.stringify(DEFAULT_WORD_SETS));
      }
    } else {
      setWordSets(DEFAULT_WORD_SETS);
      localStorage.setItem("spell_it_word_sets", JSON.stringify(DEFAULT_WORD_SETS));
    }

    // Practice History
    const storedHistory = localStorage.getItem("spell_it_practice_history");
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory) as PracticeHistory[];
        setHistory(parsedHistory);
        
        // Calculate Streak from stored history
        calculateStreak(parsedHistory);
      } catch (e) {
        setHistory([]);
      }
    }

    // Theme preference
    const storedTheme = localStorage.getItem("spell_it_theme");
    if (storedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }

    // Teacher settings preference
    const storedTeacherCode = localStorage.getItem("spell_it_teacher_passcode") || localStorage.getItem("spell_it_teacher_code");
    if (storedTeacherCode) {
      setTeacherCode(storedTeacherCode);
    } else {
      localStorage.setItem("spell_it_teacher_passcode", "1234");
    }
  }, []);

  // Auto lock teacher mode when leaving the teacher tab
  useEffect(() => {
    if (activeTab !== "teacher") {
      setIsTeacher(false);
      localStorage.removeItem("spell_it_is_teacher");
    }
  }, [activeTab]);

  // Listen for custom wordset update events from TeacherDashboard or other sources
  useEffect(() => {
    const handleUpdate = () => {
      const storedSets = localStorage.getItem("spell_it_word_sets");
      if (storedSets) {
        try {
          setWordSets(JSON.parse(storedSets));
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener("spell-it-wordsets-updated", handleUpdate);
    return () => {
      window.removeEventListener("spell-it-wordsets-updated", handleUpdate);
    };
  }, []);


  // Helper to calculate daily practice streak
  const calculateStreak = (hist: PracticeHistory[]) => {
    if (hist.length === 0) {
      setStreak(0);
      return;
    }

    // Sort history by date descending
    const sorted = [...hist].sort((a, b) => new Date(b.setDate).getTime() - new Date(a.setDate).getTime());
    
    let currentStreak = 0;
    const todayStr = new Date().toDateString();
    
    // Check if practiced today or yesterday to preserve the streak
    const lastSessionDate = new Date(sorted[0].setDate);
    const differenceInMs = new Date(todayStr).getTime() - new Date(lastSessionDate.toDateString()).getTime();
    const differenceInDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));

    if (differenceInDays > 1) {
      // Streak broken
      setStreak(0);
      return;
    }

    // Traverse history to check consecutive calendar days
    const uniqueDays = new Set<string>();
    sorted.forEach(item => {
      uniqueDays.add(new Date(item.setDate).toDateString());
    });

    const uniqueDaysArr = Array.from(uniqueDays).map(d => new Date(d));
    
    let tempStreak = 0;
    let expectedDate = new Date(todayStr);

    // If they haven't practiced today but did yesterday, check from yesterday
    const hasPracticedToday = uniqueDays.has(todayStr);
    if (!hasPracticedToday) {
      expectedDate.setDate(expectedDate.getDate() - 1);
    }

    for (let i = 0; i < uniqueDaysArr.length; i++) {
      const actualDate = uniqueDaysArr[i];
      if (actualDate.toDateString() === expectedDate.toDateString()) {
        tempStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1); // move back 1 day
      } else {
        break;
      }
    }

    setStreak(tempStreak);
  };

  // Toggle App Theme
  const handleToggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("spell_it_theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("spell_it_theme", "light");
    }
  };

  // Teacher Zone actions
  const handleUnlockTeacher = (code: string): boolean => {
    const currentPasscode = localStorage.getItem("spell_it_teacher_passcode") || localStorage.getItem("spell_it_teacher_code") || "1234";
    const cleaned = code.trim();
    if (cleaned === "1234" || cleaned === currentPasscode.trim()) {
      setIsTeacher(true);
      localStorage.setItem("spell_it_is_teacher", "true");
      // Heal the stored passcode back to 1234 if they typed 1234 but it was something else
      if (cleaned === "1234" && currentPasscode.trim() !== "1234") {
        localStorage.setItem("spell_it_teacher_passcode", "1234");
        setTeacherCode("1234");
      }
      return true;
    }
    return false;
  };

  const handleLockTeacher = () => {
    setIsTeacher(false);
    localStorage.removeItem("spell_it_is_teacher");
    if (activeTab === "teacher") {
      setActiveTab("dashboard");
    }
  };

  const handleChangeTeacherCode = (newCode: string) => {
    const cleaned = newCode.trim();
    if (cleaned) {
      setTeacherCode(cleaned);
      localStorage.setItem("spell_it_teacher_passcode", cleaned);
    }
  };

  // Handle set selected for practice
  const handleSelectSet = (set: WordSet) => {
    setActiveSet(set);
    setHasAccessedSet(true);
    setActiveTab("practice");
  };

  const handleLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = launchCode.trim().toUpperCase();
    if (!cleaned) return;

    const foundSet = wordSets.find(s => s.code.toUpperCase() === cleaned);
    if (foundSet) {
      setLaunchError(null);
      setLaunchCode("");
      setHasAccessedSet(true);
      setActiveSet(foundSet);
      setActiveTab("practice");
    } else {
      setLaunchError("Spelling set not found. Check the code and try again!");
    }
  };

  // Callback when a user finishes a practice session
  const handleFinishSession = (completedWords: PracticeSessionWord[]) => {
    if (!activeSet) return;

    const correctCount = completedWords.filter(w => w.correct).length;
    const totalWords = completedWords.length;

    const sName = sessionStorage.getItem("spell_it_student_name") || localStorage.getItem("spell_it_student_name") || "Guest Student";
    const sClass = sessionStorage.getItem("spell_it_student_class") || localStorage.getItem("spell_it_student_class") || "General";

    // Build new history item
    const newSession: PracticeHistory = {
      id: `session-${Date.now()}`,
      setDate: new Date().toISOString(),
      correctCount,
      totalWords,
      streak: streak + 1, // temporary updated streak
      listCode: activeSet.code,
      listName: activeSet.name,
      details: completedWords,
      studentName: sName,
      studentClass: sClass
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem("spell_it_practice_history", JSON.stringify(updatedHistory));
    
    // Recalculate streak based on new history
    calculateStreak(updatedHistory);

    // Route to Progress Report to review achievements
    setActiveTab("progress");
    setActiveSet(null);
  };

  // Callback when a user completes a level to save history without exiting
  const handleSaveHistory = (completedWords: PracticeSessionWord[]) => {
    if (!activeSet) return;

    const correctCount = completedWords.filter(w => w.correct).length;
    const totalWords = completedWords.length;

    const sName = sessionStorage.getItem("spell_it_student_name") || localStorage.getItem("spell_it_student_name") || "Guest Student";
    const sClass = sessionStorage.getItem("spell_it_student_class") || localStorage.getItem("spell_it_student_class") || "General";

    // Build new history item
    const newSession: PracticeHistory = {
      id: `session-${Date.now()}`,
      setDate: new Date().toISOString(),
      correctCount,
      totalWords,
      streak: streak + 1, // temporary updated streak
      listCode: activeSet.code,
      listName: activeSet.name,
      details: completedWords,
      studentName: sName,
      studentClass: sClass
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem("spell_it_practice_history", JSON.stringify(updatedHistory));
    
    // Recalculate streak based on new history
    calculateStreak(updatedHistory);
  };

  // Create Custom Word Set
  const handleCreateSet = (newSet: WordSet) => {
    const updatedSets = [newSet, ...wordSets];
    setWordSets(updatedSets);
    localStorage.setItem("spell_it_word_sets", JSON.stringify(updatedSets));
  };

  // Update Existing Word Set
  const handleUpdateSet = (updatedSet: WordSet) => {
    const updatedSets = wordSets.map(set => set.code === updatedSet.code ? updatedSet : set);
    setWordSets(updatedSets);
    localStorage.setItem("spell_it_word_sets", JSON.stringify(updatedSets));
  };

  // Delete Custom Word Set
  const handleDeleteSet = (code: string) => {
    const updatedSets = wordSets.filter(set => set.code !== code);
    setWordSets(updatedSets);
    localStorage.setItem("spell_it_word_sets", JSON.stringify(updatedSets));
  };

  // Import Word Sets list
  const handleImportSets = (imported: WordSet[]) => {
    // Append imported sets, ensuring no duplicated codes
    const existingCodes = new Set(wordSets.map(set => set.code));
    const uniqueImported = imported.filter(set => !existingCodes.has(set.code));
    
    const updatedSets = [...wordSets, ...uniqueImported];
    setWordSets(updatedSets);
    localStorage.setItem("spell_it_word_sets", JSON.stringify(updatedSets));
  };

  // Clear Practice Logs
  const handleClearHistory = () => {
    setHistory([]);
    setStreak(0);
    localStorage.removeItem("spell_it_practice_history");
  };

  // Early return for initial launch state if no spelling set has been accessed and we are not in teacher administration mode
  if (!hasAccessedSet && !isTeacher) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center font-sans transition-colors duration-200 relative p-4 overflow-hidden">
        {/* Decorative Watermarks - Artistic Flair */}
        <div className="fixed top-12 left-[10%] text-slate-200/25 dark:text-slate-900/40 font-black text-[10rem] md:text-[14rem] select-none pointer-events-none -z-10 font-display">
          A
        </div>
        <div className="fixed bottom-12 right-[10%] text-slate-200/25 dark:text-slate-900/40 font-black text-[12rem] md:text-[16rem] select-none pointer-events-none -z-10 font-display">
          Z
        </div>

        {/* Top-Right Tools */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm transition cursor-pointer"
            title="Toggle Theme"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Teacher Unlock Trigger */}
          <button
            onClick={openTeacherModal}
            className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-150 dark:border-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition"
            title="Unlock Teacher Zone"
          >
            <Lock className="w-4 h-4" />
            <span className="font-display">Teacher Zone</span>
          </button>
        </div>

        {/* Centerpiece Access Code Input */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[32px] p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
          {/* Artistic background decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

          {/* Logo */}
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-center gap-1 select-none">
              <span className="text-2xl font-black font-display tracking-tight flex items-center">
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs transform -rotate-3 transition duration-300">S</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform rotate-3 transition duration-300">p</span>
                <span className="text-red-500 bg-red-50/80 dark:bg-red-950/30 px-2.5 py-1.5 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xs -ml-1 transform -rotate-6 transition duration-300">e</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform rotate-6 transition duration-300">l</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform -rotate-3 transition duration-300">l</span>
                <span className="w-2"></span>
                <span className="text-red-500 bg-red-50/80 dark:bg-red-950/30 px-2.5 py-1.5 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xs transform rotate-2 transition duration-300">I</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform -rotate-3 transition duration-300">t</span>
              </span>
            </div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-display">
              SPELLING LAB
            </p>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="w-12 h-12 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black font-display text-slate-800 dark:text-slate-100">
              Access Spelling Set
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
              Enter your spelling set code below to unlock your word list and start practice.
            </p>
          </div>

          <form onSubmit={handleLaunchSubmit} className="space-y-4 max-w-xs mx-auto relative z-10">
            <div className="space-y-1.5">
              <input
                type="text"
                value={launchCode}
                onChange={(e) => {
                  setLaunchCode(e.target.value.toUpperCase());
                  setLaunchError(null);
                }}
                placeholder="ENTER CODE (e.g., SDU4)"
                maxLength={12}
                className="w-full text-center tracking-widest text-lg p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-mono transition-all font-semibold uppercase placeholder:tracking-normal placeholder:text-sm text-slate-800 dark:text-slate-100"
                autoFocus
              />
              {launchError && (
                <p className="text-rose-500 text-[11px] font-bold text-center mt-1.5 flex items-center justify-center gap-1 leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {launchError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
            >
              Unlock & Practice
            </button>
          </form>

          {wordSets.length === 0 ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 leading-relaxed relative z-10">
              No spelling sets created yet! Teachers, please access the <strong>Teacher Zone</strong> at the top right to create your first word set.
            </p>
          ) : (
            <div className="space-y-2 pt-2 relative z-10">
              <p className="text-[10px] text-slate-400 font-medium">
                Available practice codes for testing:
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {wordSets.slice(0, 5).map((set) => (
                  <button
                    key={set.code}
                    onClick={() => {
                      setLaunchCode(set.code);
                      setLaunchError(null);
                    }}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/35 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono font-bold px-2 py-0.5 rounded border border-indigo-100/40 dark:border-indigo-900/35 transition uppercase tracking-wider cursor-pointer"
                    title={`Click to copy: ${set.name}`}
                  >
                    {set.code}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="mt-8 text-slate-400/80 text-[10px] font-medium font-display tracking-wider uppercase font-mono">
          Empowering Young Spellers
        </div>

        {/* Teacher Zone Unlock Modal */}
        <AnimatePresence>
          {showTeacherModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowTeacherModal(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black font-display text-slate-800 dark:text-slate-100">
                    Teacher Administration Zone
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                    Only teachers are authorized to create or edit word sets. Please enter the security access code below.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const codeVal = (form.elements.namedItem("passcode") as HTMLInputElement).value;
                    const success = handleUnlockTeacher(codeVal);
                    if (success) {
                      setShowTeacherModal(false);
                      setPasscodeError(null);
                      setActiveTab("teacher");
                    } else {
                      setPasscodeError("Incorrect code! Please try again.");
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Security Access Code
                    </label>
                    <input
                      type="password"
                      name="passcode"
                      required
                      autoFocus
                      placeholder="••••"
                      onChange={() => {
                        if (passcodeError) setPasscodeError(null);
                      }}
                      className="w-full text-center tracking-widest text-lg p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-mono transition-all font-semibold"
                    />
                    {passcodeError && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-rose-500 text-xs font-bold text-center mt-1 flex items-center justify-center gap-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {passcodeError}
                      </motion.p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowTeacherModal(false)}
                      className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
                    >
                      Authorize
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative overflow-x-hidden">
      
      {/* Decorative Watermarks - Artistic Flair */}
      <div className="fixed top-28 right-[5%] text-slate-200/25 dark:text-slate-900/40 font-black text-[10rem] md:text-[14rem] select-none pointer-events-none -z-10 font-display transition-colors leading-none">
        A
      </div>
      <div className="fixed bottom-36 left-[3%] text-slate-200/20 dark:text-slate-900/35 font-black text-[12rem] md:text-[16rem] select-none pointer-events-none -z-10 font-display transition-colors leading-none">
        B
      </div>
      <div className="fixed bottom-12 right-[8%] text-slate-200/25 dark:text-slate-900/40 font-black text-[9rem] md:text-[12rem] select-none pointer-events-none -z-10 font-display transition-colors leading-none">
        C
      </div>

      {/* Dynamic Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-4 py-4.5 shadow-sm shadow-slate-100/40 dark:shadow-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Color-Coded spelling logo */}
          <div className="flex items-center gap-3 select-none">
            <div className="flex items-center">
              <span className="text-xl font-extrabold font-display tracking-tight flex items-center">
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs transform -rotate-3 transition duration-300 hover:rotate-0">S</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform rotate-3 transition duration-300 hover:rotate-0">p</span>
                <span className="text-red-500 bg-red-50/80 dark:bg-red-950/30 px-2 py-1 rounded-xl border border-red-200 dark:border-red-900/50 shadow-xs -ml-1 transform -rotate-6 transition duration-300 hover:rotate-0">e</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform rotate-6 transition duration-300 hover:rotate-0">l</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform -rotate-3 transition duration-300 hover:rotate-0">l</span>
                <span className="w-1.5"></span>
                <span className="text-red-500 bg-red-50/80 dark:bg-red-950/30 px-2 py-1 rounded-xl border border-red-200 dark:border-red-900/50 shadow-xs transform rotate-2 transition duration-300 hover:rotate-0">I</span>
                <span className="text-blue-600 bg-blue-50/80 dark:bg-blue-950/30 px-2 py-1 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs -ml-1 transform -rotate-3 transition duration-300 hover:rotate-0">t</span>
              </span>
            </div>
            
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest hidden sm:block font-display">
              SPELLING LAB
            </p>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-2 sm:gap-4">
            
            {/* Exit Set button for students */}
            {hasAccessedSet && !isTeacher && (
              <button
                onClick={() => {
                  setHasAccessedSet(false);
                  setActiveSet(null);
                  setActiveTab("dashboard");
                }}
                className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3 py-1.5 rounded-xl border border-transparent hover:border-rose-100 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
                title="Exit Current Word Set / Change Code"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline font-display">Exit Set</span>
                <span className="sm:hidden font-display">Exit</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50 transition cursor-pointer"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Teacher Zone Unlock Toggle Badge */}
            {isTeacher ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <button
                  onClick={() => setActiveTab("teacher")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition ${
                    activeTab === "teacher"
                      ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-950/60"
                  }`}
                  title="Open Teacher's Lab"
                >
                  <ShieldCheck className="w-4 h-4 animate-pulse" />
                  <span className="hidden sm:inline font-display">Teacher's Lab</span>
                  <span className="sm:hidden font-display">Lab</span>
                </button>
                <button
                  onClick={handleLockTeacher}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-100/30 transition cursor-pointer"
                  title="Lock Teacher Zone"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openTeacherModal}
                className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 px-3 py-1.5 rounded-xl border border-transparent hover:border-indigo-100 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition animate-pulse"
                title="Unlock Teacher Zone"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline font-display">Teacher Zone</span>
                <span className="sm:hidden font-display">Teacher</span>
              </button>
            )}

            {/* Streak count indicator */}
            {streak > 0 && (
              <div 
                className="bg-orange-50/80 dark:bg-orange-950/30 text-orange-500 px-3.5 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900/40 text-xs font-bold flex items-center gap-1.5 cursor-help shadow-xs"
                title={`${streak} consecutive active learning days! Keep spelling!`}
              >
                <Flame className="w-4 h-4 fill-current animate-pulse" />
                <span className="font-display">{streak} Streak</span>
              </div>
            )}
          </nav>

        </div>
      </header>

      {/* Primary Workspace container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Core Tab switching with frame transitions */}
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Dashboard 
                wordSets={wordSets}
                history={history}
                onSelectSet={handleSelectSet}
                onNavigateToTab={(tab) => {
                  if (tab === "practice") {
                    if (wordSets.length > 0) {
                      handleSelectSet(wordSets[0]);
                    } else {
                      setActiveTab("wordsets");
                    }
                  } else {
                    setActiveTab(tab);
                  }
                }}
              />
            </motion.div>
          )}

          {activeTab === "newset" && (
            <motion.div
              key="newset"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[32px] p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

                <div className="space-y-2 relative z-10">
                  <div className="w-12 h-12 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black font-display text-slate-800 dark:text-slate-100">
                    Access Spelling Set
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                    Enter your spelling set code below to unlock your word list and start practice.
                  </p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const cleaned = launchCode.trim().toUpperCase();
                    if (!cleaned) return;

                    const foundSet = wordSets.find(s => s.code.toUpperCase() === cleaned);
                    if (foundSet) {
                      setLaunchError(null);
                      setLaunchCode("");
                      setActiveSet(foundSet);
                      setHasAccessedSet(true);
                      setActiveTab("practice");
                    } else {
                      setLaunchError("Spelling set not found. Check the code and try again!");
                    }
                  }} 
                  className="space-y-4 max-w-xs mx-auto relative z-10"
                >
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={launchCode}
                      onChange={(e) => {
                        setLaunchCode(e.target.value.toUpperCase());
                        setLaunchError(null);
                      }}
                      placeholder="ENTER CODE (e.g., SDU4)"
                      maxLength={12}
                      className="w-full text-center tracking-widest text-lg p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-mono transition-all font-semibold uppercase placeholder:tracking-normal placeholder:text-sm text-slate-800 dark:text-slate-100"
                      autoFocus
                    />
                    {launchError && (
                      <p className="text-rose-500 text-[11px] font-bold text-center mt-1.5 flex items-center justify-center gap-1 leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {launchError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
                  >
                    Unlock & Practice
                  </button>
                </form>

                {wordSets.length > 0 && (
                  <div className="space-y-2 pt-2 relative z-10">
                    <p className="text-[10px] text-slate-400 font-medium">
                      Available practice codes:
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {wordSets.map((set) => (
                        <button
                          key={set.code}
                          onClick={() => {
                            setLaunchCode(set.code);
                            setLaunchError(null);
                          }}
                          className={`text-[10px] font-mono font-bold px-2 py-1 rounded border transition uppercase tracking-wider cursor-pointer ${
                            activeSet?.code === set.code 
                              ? "bg-indigo-600 text-white border-indigo-600" 
                              : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/35 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100/40 dark:border-indigo-900/35"
                          }`}
                          title={`Click to copy: ${set.name}`}
                        >
                          {set.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "practice" && (
            <motion.div
              key="practice"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {activeSet ? (
                <StudentPractice 
                  accessCode={activeSet.code}
                  onBack={() => {
                    setActiveSet(null);
                    setActiveTab("dashboard");
                  }}
                  onSaveHistory={handleSaveHistory}
                />
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                    <Gamepad2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Set Selected</h3>
                  <p className="text-slate-400 text-xs">
                    Please select or create a spelling set first to start practice sessions.
                  </p>
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    Select From Sets
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "wordsets" && (
            <motion.div
              key="wordsets"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <WordSetsManager 
                wordSets={wordSets}
                onCreateSet={handleCreateSet}
                onUpdateSet={handleUpdateSet}
                onDeleteSet={handleDeleteSet}
                onImportSets={handleImportSets}
                isTeacher={isTeacher}
                onUnlockRequest={openTeacherModal}
                onChangeCode={handleChangeTeacherCode}
                teacherCode={teacherCode}
                onLockTeacher={handleLockTeacher}
              />
            </motion.div>
          )}

          {activeTab === "teacher" && (
            <motion.div
              key="teacher"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <TeacherDashboard
                onBack={() => {
                  setActiveTab("dashboard");
                }}
              />
            </motion.div>
          )}

          {activeTab === "progress" && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <ProgressTracker 
                history={history}
                onClearHistory={handleClearHistory}
                wordSets={wordSets}
                activeSet={activeSet}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Floating Bottom Navigation for tactile SPA mobile ergonomics */}
      <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 px-4 py-3 select-none">
        <div className="max-w-md mx-auto flex items-center justify-around gap-2">
          
          <button
            onClick={() => {
              setActiveSet(null);
              setActiveTab("dashboard");
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
              activeTab === "dashboard" 
                ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("newset");
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
              activeTab === "newset" 
                ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">New Set</span>
          </button>

          <button
            onClick={() => {
              if (!activeSet && wordSets.length > 0) {
                setActiveSet(wordSets[0]);
              }
              setActiveTab("practice");
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
              activeTab === "practice" 
                ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Practice</span>
          </button>

          <button
            onClick={() => {
              setActiveSet(null);
              setActiveTab("wordsets");
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
              activeTab === "wordsets" 
                ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Sets</span>
          </button>

          <button
            onClick={() => {
              setActiveSet(null);
              setActiveTab("progress");
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
              activeTab === "progress" 
                ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Progress</span>
          </button>

          {isTeacher && (
            <button
              onClick={() => {
                setActiveSet(null);
                setActiveTab("teacher");
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center w-20 transition cursor-pointer ${
                activeTab === "teacher" 
                  ? "text-indigo-600 dark:text-indigo-400 font-extrabold" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] tracking-wide">Lab</span>
            </button>
          )}

        </div>
      </footer>

      {/* Teacher Zone Unlock Modal */}
      <AnimatePresence>
        {showTeacherModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTeacherModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 space-y-6 overflow-hidden"
            >
              {/* Artistic background blur decoration */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
              
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/50">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black font-display text-slate-800 dark:text-slate-100">
                  Teacher Administration Zone
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
                  Only teachers are authorized to create or edit word sets. Please enter the security access code below.
                </p>
              </div>

              {/* Form Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const codeVal = (form.elements.namedItem("passcode") as HTMLInputElement).value;
                  const success = handleUnlockTeacher(codeVal);
                  if (success) {
                    setShowTeacherModal(false);
                    setPasscodeError(null);
                    setActiveTab("teacher");
                  } else {
                    setPasscodeError("Incorrect code! Please try again.");
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Security Access Code
                  </label>
                  <input
                    type="password"
                    name="passcode"
                    required
                    autoFocus
                    placeholder="••••"
                    onChange={() => {
                      if (passcodeError) setPasscodeError(null);
                    }}
                    className="w-full text-center tracking-widest text-lg p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/15 focus:outline-none focus:border-indigo-500/60 font-mono transition-all font-semibold"
                  />
                  {passcodeError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-rose-500 text-xs font-bold text-center mt-1 flex items-center justify-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      {passcodeError}
                    </motion.p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTeacherModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer shadow-md shadow-indigo-100 dark:shadow-none"
                  >
                    Authorize
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
