import React from "react";
import { WordSet, PracticeHistory } from "../types";
import { Target, BookOpen, Calendar, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  wordSets: WordSet[];
  history: PracticeHistory[];
  onSelectSet: (set: WordSet) => void;
  onNavigateToTab: (tab: "practice" | "wordsets" | "progress") => void;
}

export function Dashboard({ wordSets, history, onSelectSet, onNavigateToTab }: DashboardProps) {
  // Compute overall stats
  let totalWordsPracticed = 0;
  let totalCorrect = 0;
  history.forEach((h) => {
    totalWordsPracticed += h.totalWords;
    totalCorrect += h.correctCount;
  });

  const accuracy = totalWordsPracticed > 0 ? Math.round((totalCorrect / totalWordsPracticed) * 100) : 0;

  // Let's get the 3 most recent practice sessions for a quick view
  const recentHistory = [...history]
    .sort((a, b) => new Date(b.setDate).getTime() - new Date(a.setDate).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8 pb-12">
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center gap-5 transition-shadow hover:shadow-lg hover:shadow-indigo-100/30"
        >
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl text-indigo-500 border border-indigo-100 dark:border-indigo-900/40">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">Overall Accuracy</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 font-display">
              {accuracy}%
            </h3>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[24px] p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center gap-5 transition-shadow hover:shadow-lg hover:shadow-emerald-100/30"
        >
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl text-emerald-500 border border-emerald-100 dark:border-emerald-900/40">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-display">Words Solved</p>
            <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1 font-display">
              {totalCorrect}<span className="text-sm text-slate-400 font-semibold font-sans">/{totalWordsPracticed}</span>
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Practice Logs / Overview */}
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold font-display text-slate-800 dark:text-slate-100">Recent Activity</h2>
          </div>
          <button
            onClick={() => onNavigateToTab("progress")}
            className="text-xs font-bold font-display text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer tracking-wider uppercase"
          >
            Full Report
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[28px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none space-y-4">
          {recentHistory.length === 0 ? (
             <div className="text-center py-12 space-y-3">
               <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center mx-auto text-slate-300 border border-slate-100 dark:border-slate-800">
                 <Calendar className="w-6 h-6" />
               </div>
               <p className="text-slate-500 text-sm font-semibold">No spelling sessions yet!</p>
               <p className="text-slate-400 text-xs">Choose a spelling set to begin practicing.</p>
             </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentHistory.map((h, index) => {
                const sAccuracy = Math.round((h.correctCount / h.totalWords) * 100);
                return (
                  <div
                    key={h.id || index}
                    className={`py-4 flex items-center justify-between ${index === 0 ? "pt-1" : ""} ${index === recentHistory.length - 1 ? "pb-1" : ""}`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-base line-clamp-1 font-display">
                        {h.listName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {new Date(h.setDate).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs md:text-sm font-bold font-mono px-3 py-1.5 rounded-xl border ${
                        sAccuracy >= 80 
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                          : sAccuracy >= 50 
                          ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30" 
                          : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/30"
                      }`}>
                        {h.correctCount}/{h.totalWords} ({sAccuracy}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
