import React, { useState, useMemo } from "react";
import { PracticeHistory, WordSet } from "../types";
import { 
  Trash2, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  Award,
  Sparkles,
  RefreshCw,
  TrendingUp,
  LineChart,
  BookOpen,
  HelpCircle,
  Activity,
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProgressTrackerProps {
  history: PracticeHistory[];
  onClearHistory: () => void;
  wordSets: WordSet[];
  activeSet: WordSet | null;
}

export function ProgressTracker({ history, onClearHistory, wordSets, activeSet }: ProgressTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"words" | "sessions">("words");
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Initialize selected set code based on priority:
  // 1. Currently active set code
  // 2. Most recent session's listCode in history
  // 3. First word set code in the list
  // 4. Fallback empty string
  const defaultSetCode = useMemo(() => {
    if (activeSet?.code) return activeSet.code;
    if (history.length > 0 && history[0].listCode) return history[0].listCode;
    if (wordSets.length > 0) return wordSets[0].code;
    return "";
  }, [activeSet, history, wordSets]);

  const [selectedSetCode, setSelectedSetCode] = useState<string>(defaultSetCode);

  // Sync selectedSetCode if defaultSetCode changes (e.g. after a session completes)
  React.useEffect(() => {
    if (defaultSetCode) {
      setSelectedSetCode(defaultSetCode);
    }
  }, [defaultSetCode]);

  // Overall Stats calculation
  const totalSessions = history.length;
  const totalCorrect = history.reduce((sum, s) => sum + s.correctCount, 0);
  const totalWords = history.reduce((sum, s) => sum + s.totalWords, 0);
  const averageAccuracy = totalWords > 0 ? Math.round((totalCorrect / totalWords) * 100) : 0;
  
  const highAccuracySessions = history.filter(
    (h) => (h.correctCount / h.totalWords) >= 0.85
  ).length;

  // Selected set object
  const selectedSet = useMemo(() => {
    return wordSets.find(s => s.code === selectedSetCode);
  }, [wordSets, selectedSetCode]);

  // Word-by-word analysis calculations
  const wordAnalysis = useMemo(() => {
    if (!selectedSet) return [];

    // Filter practice history for this spelling list
    const listHistory = history.filter(h => h.listCode === selectedSet.code);

    // Group attempts per word
    const attemptsMap: Record<string, { correct: boolean; userAttempt: string; date: string }[]> = {};
    
    // Initialize empty array for each word in the set
    selectedSet.words.forEach(w => {
      attemptsMap[w.toLowerCase().trim()] = [];
    });

    // Populate attempts in chronological order (from oldest session to newest)
    const chronologicalHistory = [...listHistory].reverse();
    chronologicalHistory.forEach(h => {
      h.details.forEach(detail => {
        const wordKey = detail.word.toLowerCase().trim();
        if (attemptsMap[wordKey] !== undefined) {
          attemptsMap[wordKey].push({
            correct: detail.correct,
            userAttempt: detail.userAttempt,
            date: h.setDate
          });
        }
      });
    });

    // Build stats for each word
    return selectedSet.words.map(word => {
      const wKey = word.toLowerCase().trim();
      const attempts = attemptsMap[wKey] || [];
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter(a => a.correct).length;
      const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null;
      
      const latestAttempt = totalAttempts > 0 ? attempts[totalAttempts - 1] : null;

      // Extract unique misspelled attempts as spelling bugs to solve
      const misspelledAttempts = Array.from(
        new Set(
          attempts
            .filter(a => !a.correct)
            .map(a => a.userAttempt?.trim())
            .filter(Boolean)
        )
      );

      // Mastery definition: Spelled correctly on the most recent attempt AND >= 80% accuracy
      let status: "mastered" | "learning" | "unpracticed" = "unpracticed";
      if (totalAttempts > 0) {
        if (latestAttempt?.correct && (accuracy ?? 0) >= 80) {
          status = "mastered";
        } else {
          status = "learning";
        }
      }

      return {
        word,
        totalAttempts,
        correctAttempts,
        accuracy,
        latestAttempt,
        misspelledAttempts,
        status
      };
    });
  }, [selectedSet, history]);

  const handleToggleExpand = (id: string) => {
    if (expandedSessionId === id) {
      setExpandedSessionId(null);
    } else {
      setExpandedSessionId(id);
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to delete all practice history logs? This action cannot be undone.")) {
      onClearHistory();
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black font-display text-slate-800 dark:text-slate-100">Progress Lab Tracker</h2>
          <p className="text-slate-400 text-sm">Detailed performance review of your completed spelling sessions.</p>
        </div>

        {totalSessions > 0 && (
          <button
            onClick={handleClear}
            className="px-4.5 py-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold font-display uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer self-start border border-rose-150/40"
          >
            <Trash2 className="w-4 h-4" />
            Reset Practice Logs
          </button>
        )}
      </div>

      {totalSessions === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[32px] p-12 text-center space-y-4 max-w-xl mx-auto shadow-md shadow-slate-100/40">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-100 dark:border-slate-800">
            <TrendingUp className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold font-display text-slate-700 dark:text-slate-300">Your Progress Log is Empty</h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Begin spelling lists in practice. Your score, spelling mistakes, and accuracy trends will appear here!
          </p>
        </div>
      ) : (
        <>
          {/* Bento-Grid Performance metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none flex items-center gap-5"
            >
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                <LineChart className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">Average Accuracy</p>
                <h3 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 mt-1">
                  {averageAccuracy}%
                </h3>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none flex items-center gap-5"
            >
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">Words Solved</p>
                <h3 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 mt-1">
                  {totalCorrect} <span className="text-xs font-semibold text-slate-400 font-sans">/{totalWords}</span>
                </h3>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none flex items-center gap-5"
            >
              <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-500 rounded-2xl border border-teal-100 dark:border-teal-900/40">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">A+ Sessions (85%+)</p>
                <h3 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 mt-1">
                  {highAccuracySessions} <span className="text-xs font-semibold text-slate-400 font-sans">/{totalSessions}</span>
                </h3>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none flex items-center gap-5"
            >
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-500 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">Total Words Attempted</p>
                <h3 className="text-3xl font-black font-display text-slate-800 dark:text-slate-100 mt-1">
                  {totalWords} <span className="text-xs font-semibold text-slate-400 font-sans">words</span>
                </h3>
              </div>
            </motion.div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 dark:border-slate-850 gap-6">
            <button
              onClick={() => setActiveSubTab("words")}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider transition cursor-pointer relative ${
                activeSubTab === "words"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Word Progress Lab</span>
              </div>
              {activeSubTab === "words" && (
                <motion.div 
                  layoutId="activeSubTabLine" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" 
                />
              )}
            </button>
            <button
              onClick={() => setActiveSubTab("sessions")}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider transition cursor-pointer relative ${
                activeSubTab === "sessions"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Practice Session History</span>
              </div>
              {activeSubTab === "sessions" && (
                <motion.div 
                  layoutId="activeSubTabLine" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" 
                />
              )}
            </button>
          </div>

          {/* Sub Tab Contents */}
          <div className="space-y-6">
            {activeSubTab === "words" && (
              <div className="space-y-6">
                {/* Word Set Selector Card */}
                {wordSets.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-[28px] p-8 text-center text-slate-500">
                    No spelling sets available yet. Go to the Teacher Zone or unlock a set first!
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-[24px] shadow-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Spelling Set Selector</label>
                      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Choose a list to review word-by-word progress:</h4>
                    </div>
                    <select
                      value={selectedSetCode}
                      onChange={(e) => setSelectedSetCode(e.target.value)}
                      className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:outline-none text-sm text-slate-700 dark:text-slate-200 font-semibold cursor-pointer min-w-[220px]"
                    >
                      {wordSets.map((set) => (
                        <option key={set.code} value={set.code}>
                          {set.name} ({set.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Word-by-word grid */}
                {selectedSet && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold font-display text-slate-800 dark:text-slate-200 text-lg">
                          Word-by-Word Mastery — {selectedSet.name}
                        </h3>
                        <p className="text-slate-400 text-xs">
                          {selectedSet.words.length} words inside this list. Practice more to achieve "Mastered" status!
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {wordAnalysis.map((item) => {
                        // Dynamic styling based on status
                        let statusColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50";
                        let statusLabel = "Not Practiced";
                        
                        if (item.status === "mastered") {
                          statusColor = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100/80 dark:border-emerald-900/30";
                          statusLabel = "Mastered";
                        } else if (item.status === "learning") {
                          statusColor = "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100/80 dark:border-amber-900/30";
                          statusLabel = "Learning";
                        }

                        // Determine visual color of the progress bar
                        let progressColor = "bg-slate-200 dark:bg-slate-800";
                        if (item.accuracy !== null) {
                          if (item.accuracy >= 80) {
                            progressColor = "bg-emerald-500";
                          } else if (item.accuracy >= 50) {
                            progressColor = "bg-amber-500";
                          } else {
                            progressColor = "bg-rose-500";
                          }
                        }

                        return (
                          <div
                            key={item.word}
                            className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800 p-5 rounded-[24px] flex flex-col justify-between shadow-xs hover:shadow-sm hover:border-slate-250 dark:hover:border-slate-750 transition duration-200"
                          >
                            <div className="space-y-3">
                              {/* Word Title & Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-base font-mono uppercase tracking-wide">
                                  {item.word}
                                </h4>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>

                              {/* Progress bar and accurate metrics */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-400">Accuracy</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                                    {item.accuracy !== null ? `${item.accuracy}%` : "--"}
                                  </span>
                                </div>
                                
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                    style={{ width: `${item.accuracy !== null ? item.accuracy : 0}%` }}
                                  />
                                </div>

                                <p className="text-[10px] text-slate-400 font-medium">
                                  {item.totalAttempts > 0 ? (
                                    <span>
                                      Spelled correctly <strong>{item.correctAttempts}</strong> of{" "}
                                      <strong>{item.totalAttempts}</strong> attempts
                                    </span>
                                  ) : (
                                    <span>No attempts recorded yet</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Additional review of mistakes */}
                            {item.totalAttempts > 0 && (
                              <div className="mt-4 pt-4.5 border-t border-slate-100 dark:border-slate-850/60 space-y-2 text-[11px]">
                                {item.latestAttempt && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Latest Attempt:</span>
                                    <span className={`font-mono uppercase font-extrabold flex items-center gap-1 ${
                                      item.latestAttempt.correct 
                                        ? "text-emerald-500" 
                                        : "text-rose-500"
                                    }`}>
                                      {item.latestAttempt.correct ? (
                                        <>
                                          <CheckCircle className="w-3.5 h-3.5" /> Correct
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-3.5 h-3.5" /> "{item.latestAttempt.userAttempt || "(empty)"}"
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}

                                {item.misspelledAttempts.length > 0 && (
                                  <div className="space-y-1 pt-0.5">
                                    <span className="text-slate-400 font-semibold block">Spelling bugs to solve:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {item.misspelledAttempts.map((err, i) => (
                                        <span
                                          key={i}
                                          className="px-1.5 py-0.5 bg-rose-50/70 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-md font-mono font-bold border border-rose-100/30 dark:border-rose-900/25 uppercase text-[10px]"
                                        >
                                          {err}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {wordAnalysis.length === 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-12 text-center rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                        No words are currently defined in this spelling list.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeSubTab === "sessions" && (
              <div className="space-y-4">
                <h3 className="font-extrabold font-display text-slate-700 dark:text-slate-300 text-lg">Practice History List</h3>
                
                <div className="space-y-4">
                  {history.map((h) => {
                    const isExpanded = expandedSessionId === h.id;
                    const accuracyRate = Math.round((h.correctCount / h.totalWords) * 100);

                    return (
                      <div
                        key={h.id}
                        className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition duration-200"
                      >
                        {/* Header Panel */}
                        <div
                          onClick={() => handleToggleExpand(h.id)}
                          className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="space-y-1.5">
                            <h4 className="font-bold font-display text-slate-800 dark:text-slate-100 text-base md:text-lg">
                              {h.listName}
                            </h4>
                            
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                {new Date(h.setDate).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className="text-slate-200">•</span>
                              <span>{h.totalWords} words studied</span>
                              {h.streak > 0 && (
                                <>
                                  <span className="text-slate-200">•</span>
                                  <span className="text-orange-500 font-bold flex items-center gap-0.5">
                                    <Flame className="w-3.5 h-3.5 shrink-0" /> {h.streak} streak
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-center">
                            <div className="text-right">
                              <span className={`text-xs md:text-sm font-bold font-mono px-3.5 py-1.5 rounded-xl border ${
                                accuracyRate >= 80 
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                                  : accuracyRate >= 50 
                                  ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" 
                                  : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
                              }`}>
                                {h.correctCount}/{h.totalWords} ({accuracyRate}%)
                              </span>
                            </div>
                            
                            <div className="text-slate-400 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded detailed word reviews */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-slate-50/50 dark:bg-slate-950/10 border-t border-slate-100 dark:border-slate-800/80 p-6 overflow-hidden"
                            >
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-4.5">
                                Word-by-Word Session Breakdown
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {h.details.map((detail, dIdx) => (
                                  <div
                                    key={dIdx}
                                    className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/85 p-4 rounded-2xl flex items-center justify-between shadow-xs hover:border-slate-200/80 transition-colors"
                                  >
                                    <div className="space-y-1">
                                      <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 font-mono uppercase">
                                        {detail.word}
                                      </h5>
                                      <p className="text-[11px] text-slate-400">
                                        Attempt:{" "}
                                        <span className={`font-mono uppercase font-black ${
                                          detail.correct 
                                            ? "text-emerald-500" 
                                            : "text-rose-500 line-through"
                                        }`}>
                                          {detail.userAttempt || "(empty)"}
                                        </span>
                                      </p>
                                    </div>

                                    <div className="flex-shrink-0">
                                      {detail.correct ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-rose-500" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
