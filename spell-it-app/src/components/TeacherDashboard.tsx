import React, { useState, useEffect } from "react";
import { Plus, Trash2, Copy, Check, ArrowLeft, Sparkles, BookOpen, ListCollapse, MessageSquare, CircleAlert as AlertCircle, Lock, Pencil, ChartBar as BarChart3, TrendingUp, Award, TriangleAlert as AlertTriangle, FileText, ClipboardList, Users } from "lucide-react";
import { WordSet, WordMetadata, LevelCustomization, PracticeHistory } from "../types";
import { LetterTile } from "./LetterTile";
import { getSetsByCodes, createSet, updateSet, deleteSet } from "../utils/localSets";
import { loadHistory } from "../utils/history";

interface TeacherDashboardProps {
  onBack: () => void;
}

export function calculateSetReport(set: WordSet, allHistory: PracticeHistory[]) {
  const setHistory = allHistory.filter(h => h.listCode === set.code);

  const studentMap: Record<string, {
    name: string;
    class: string;
    attempts: number;
    totalCorrect: number;
    totalWords: number;
    wordErrors: Record<string, { attempts: number; errors: number }>;
  }> = {};

  const classWordErrors: Record<string, { attempts: number; errors: number }> = {};
  let classTotalCorrect = 0;
  let classTotalWords = 0;

  setHistory.forEach(item => {
    const sName = item.studentName || "Guest Student";
    const sClass = item.studentClass || "General";
    const key = `${sName.trim().toLowerCase()}||${sClass.trim().toLowerCase()}`;

    if (!studentMap[key]) {
      studentMap[key] = {
        name: sName,
        class: sClass,
        attempts: 0,
        totalCorrect: 0,
        totalWords: 0,
        wordErrors: {}
      };
    }

    const student = studentMap[key];
    student.attempts += 1;
    student.totalCorrect += item.correctCount;
    student.totalWords += item.totalWords;

    classTotalCorrect += item.correctCount;
    classTotalWords += item.totalWords;

    if (item.details && Array.isArray(item.details)) {
      item.details.forEach(detail => {
        const word = detail.word;
        const isError = !detail.correct;

        // Student's individual word error tracker
        if (!student.wordErrors[word]) {
          student.wordErrors[word] = { attempts: 0, errors: 0 };
        }
        student.wordErrors[word].attempts += 1;
        if (isError) {
          student.wordErrors[word].errors += 1;
        }

        // Class-wide word error tracker
        if (!classWordErrors[word]) {
          classWordErrors[word] = { attempts: 0, errors: 0 };
        }
        classWordErrors[word].attempts += 1;
        if (isError) {
          classWordErrors[word].errors += 1;
        }
      });
    }
  });

  const studentsList = Object.values(studentMap).map(s => {
    let hardestWord = "None";
    let maxErrorRate = 0;
    
    Object.entries(s.wordErrors).forEach(([word, stats]) => {
      const errorRate = stats.attempts > 0 ? stats.errors / stats.attempts : 0;
      if (errorRate > maxErrorRate && stats.errors > 0) {
        maxErrorRate = errorRate;
        hardestWord = word;
      }
    });

    const averageScore = s.totalWords > 0 
      ? Math.round((s.totalCorrect / s.totalWords) * 100) 
      : 100;

    return {
      name: s.name,
      class: s.class,
      attempts: s.attempts,
      averageScore,
      hardestWord: hardestWord !== "None" ? `${hardestWord} (${Math.round(maxErrorRate * 100)}% error)` : "None (Perfect!)"
    };
  });

  let classHardestWord = "None";
  let classMaxErrorRate = 0;
  Object.entries(classWordErrors).forEach(([word, stats]) => {
    const errorRate = stats.attempts > 0 ? stats.errors / stats.attempts : 0;
    if (errorRate > classMaxErrorRate && stats.errors > 0) {
      classMaxErrorRate = errorRate;
      classHardestWord = word;
    }
  });

  const classAverageScore = classTotalWords > 0
    ? Math.round((classTotalCorrect / classTotalWords) * 100)
    : 100;

  return {
    students: studentsList,
    classAverageScore,
    classHardestWord: classHardestWord !== "None" ? `${classHardestWord} (${Math.round(classMaxErrorRate * 100)}% error)` : "None (Perfect!)",
    totalClassAttempts: setHistory.length
  };
}

export function TeacherDashboard({ onBack }: TeacherDashboardProps) {
  // Form states
  const [setName, setSetName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [wordInput, setWordInput] = useState("");
  const [wordDefinitionInput, setWordDefinitionInput] = useState("");
  const [wordPictureInput, setWordPictureInput] = useState("");
  const [wordsList, setWordsList] = useState<string[]>([]);
  const [bulkInput, setBulkInput] = useState("");
  const [useBulk, setUseBulk] = useState(false);

  // New Clue & Level customization states
  const [wordMetadata, setWordMetadata] = useState<Record<string, WordMetadata>>({});
  const [levelCustomizations, setLevelCustomizations] = useState<Record<number, LevelCustomization>>({
    1: { showDefinition: true, showPicture: true },
    2: { showDefinition: true, showPicture: true },
    3: { showDefinition: true, showPicture: true },
    4: { showDefinition: true, showPicture: true },
  });
  const [expandedWordIdx, setExpandedWordIdx] = useState<number | null>(null);

  // Status/Result states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSet, setCreatedSet] = useState<WordSet | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // History of created sets (saved in localStorage for the teacher)
  const [savedSets, setSavedSets] = useState<WordSet[]>([]);
  const [isLoadingSets, setIsLoadingSets] = useState(false);

  // Passcode Settings state
  const [passcodeVal, setPasscodeVal] = useState("");
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  // Delete Confirmation state
  const [setToDelete, setSetToDelete] = useState<string | null>(null);

  // Edit Mode states
  const [editingSetCode, setEditingSetCode] = useState<string | null>(null);

  // Performance Report states
  const [selectedReportSet, setSelectedReportSet] = useState<WordSet | null>(null);
  const [allHistory, setAllHistory] = useState<PracticeHistory[]>([]);

  useEffect(() => {
    loadTeacherSets();
    const currentPasscode = localStorage.getItem("spell_it_teacher_passcode") || "1234";
    setPasscodeVal(currentPasscode);

    // Load practice history from Supabase
    loadHistory().then(setAllHistory).catch((e) => console.error("Failed to load history", e));
  }, []);

  const handleUpdatePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcodeVal.trim();
    if (!trimmed) {
      setErrorMsg("Teacher passcode cannot be empty.");
      return;
    }
    localStorage.setItem("spell_it_teacher_passcode", trimmed);
    setPasscodeSuccess(true);
    setTimeout(() => setPasscodeSuccess(false), 3000);
  };

  const loadTeacherSets = async () => {
    let codesStr = localStorage.getItem("spell_it_teacher_codes");
    if (!codesStr) {
      // Pre-populate teacher codes with our default code
      localStorage.setItem("spell_it_teacher_codes", JSON.stringify(["SDU4"]));
      codesStr = JSON.stringify(["SDU4"]);
    }

    try {
      setIsLoadingSets(true);
      const codes = JSON.parse(codesStr);
      if (codes.length === 0) {
        setSavedSets([]);
        return;
      }

      const matchedSets = await getSetsByCodes(codes);
      setSavedSets(matchedSets);
    } catch (e) {
      console.error("Failed to load previously created sets:", e);
      setSavedSets([]);
    } finally {
      setIsLoadingSets(false);
    }
  };

  const handleEditSet = (set: WordSet) => {
    setEditingSetCode(set.code);
    setSetName(set.name);
    setWordsList(set.words);
    setCustomCode(set.code);
    setWordMetadata(set.wordMetadata || {});
    setLevelCustomizations(set.levelCustomizations || {
      1: { showDefinition: true, showPicture: true },
      2: { showDefinition: true, showPicture: true },
      3: { showDefinition: true, showPicture: true },
      4: { showDefinition: true, showPicture: true },
    });
    setExpandedWordIdx(null);
    setCreatedSet(null);
    setErrorMsg(null);
    // Scroll smoothly to creation form
    const formElement = document.getElementById("set-creator-card");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCancelEdit = () => {
    setEditingSetCode(null);
    setSetName("");
    setWordsList([]);
    setCustomCode("");
    setWordMetadata({});
    setLevelCustomizations({
      1: { showDefinition: true, showPicture: true },
      2: { showDefinition: true, showPicture: true },
      3: { showDefinition: true, showPicture: true },
      4: { showDefinition: true, showPicture: true },
    });
    setExpandedWordIdx(null);
    setErrorMsg(null);
  };

  const handleDeleteSet = async (code: string) => {
    try {
      await deleteSet(code);

      // Remove from localStorage
      const localCodesStr = localStorage.getItem("spell_it_teacher_codes");
      if (localCodesStr) {
        const localCodes = JSON.parse(localCodesStr);
        const updatedCodes = localCodes.filter((c: string) => c !== code);
        localStorage.setItem("spell_it_teacher_codes", JSON.stringify(updatedCodes));
      }

      // If we were editing this set, cancel editing
      if (editingSetCode === code) {
        handleCancelEdit();
      }

      // Reload
      loadTeacherSets();
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to delete set.");
    }
  };

  const handleAddWord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const cleaned = wordInput.trim().toLowerCase().replace(/[^a-záéíóúüñ\s]/g, "").replace(/\s+/g, " ");
    if (!cleaned) {
      setErrorMsg("Please enter a valid word or phrase with alphabetic letters.");
      return;
    }

    if (wordsList.includes(cleaned)) {
      setErrorMsg(`"${cleaned}" is already in your vocabulary list.`);
      return;
    }

    setWordsList([...wordsList, cleaned]);

    if (wordDefinitionInput.trim() || wordPictureInput.trim()) {
      setWordMetadata(prev => ({
        ...prev,
        [cleaned]: {
          definition: wordDefinitionInput.trim() || undefined,
          pictureUrl: wordPictureInput.trim() || undefined
        }
      }));
    }

    setWordInput("");
    setWordDefinitionInput("");
    setWordPictureInput("");
    setErrorMsg(null);
  };

  const handleImportBulk = () => {
    if (!bulkInput.trim()) return;

    const parsed = bulkInput
      .split(/[\n,;]+/)
      .map(w => w.trim().toLowerCase().replace(/[^a-záéíóúüñ\s]/g, "").replace(/\s+/g, " "))
      .filter(w => w.length > 0);

    if (parsed.length === 0) {
      setErrorMsg("No valid words found in the text area.");
      return;
    }

    // Filter out duplicates
    const uniqueNew = parsed.filter(w => !wordsList.includes(w));
    setWordsList([...wordsList, ...uniqueNew]);
    setBulkInput("");
    setUseBulk(false);
    setErrorMsg(null);
  };

  const handleRemoveWord = (index: number) => {
    setWordsList(wordsList.filter((_, i) => i !== index));
  };

  const handleCreateSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCreatedSet(null);

    if (!setName.trim()) {
      setErrorMsg("Please enter a name for this vocabulary set.");
      return;
    }

    if (wordsList.length === 0) {
      setErrorMsg("Please add at least one vocabulary word to the set.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingSetCode) {
        // Update existing set
        const data = await updateSet(editingSetCode, setName, wordsList, wordMetadata, levelCustomizations);
        setCreatedSet(data);
        setEditingSetCode(null);
      } else {
        // Create new set
        const data = await createSet(setName, wordsList, customCode.trim() || undefined, wordMetadata, levelCustomizations);
        setCreatedSet(data);
        
        // Save code to teacher's browser history
        const localCodesStr = localStorage.getItem("spell_it_teacher_codes");
        const localCodes = localCodesStr ? JSON.parse(localCodesStr) : [];
        if (!localCodes.includes(data.code)) {
          localCodes.push(data.code);
          localStorage.setItem("spell_it_teacher_codes", JSON.stringify(localCodes));
        }
      }

      // Reset form
      setSetName("");
      setCustomCode("");
      setWordsList([]);
      setWordMetadata({});
      setLevelCustomizations({
        1: { showDefinition: true, showPicture: true },
        2: { showDefinition: true, showPicture: true },
        3: { showDefinition: true, showPicture: true },
        4: { showDefinition: true, showPicture: true },
      });
      setExpandedWordIdx(null);
      
      // Refresh teacher's list
      loadTeacherSets();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const reportData = selectedReportSet ? calculateSetReport(selectedReportSet, allHistory) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-col animate-fade-in -m-4 sm:-m-8 pb-12">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-4 select-none">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Exit to Main Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Teacher's Spelling Lab</h1>
            <p className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Configure homework vocabulary sets</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
          <span>Teacher Mode</span>
          <span className="text-slate-200 dark:text-slate-800">|</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-mono">Set Creator</span>
        </div>
      </header>

      {selectedReportSet && reportData ? (
        <div className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6 animate-fade-in">
          {/* Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                Performance Report
              </span>
              <h2 className="text-2xl font-black font-display text-slate-800 dark:text-white mt-2">
                {selectedReportSet.name}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Class Access Code: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{selectedReportSet.code}</span> • Total of {selectedReportSet.words.length} words
              </p>
            </div>
            <button
              onClick={() => setSelectedReportSet(null)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold font-display transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sets Manager
            </button>
          </div>

          {/* Aggregated Performance Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Total Student Attempts */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none -mr-4 -mt-4" />
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-100/30 dark:border-indigo-900/30 shadow-2xs shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Class Attempts</span>
                <span className="block text-3xl font-black text-slate-800 dark:text-white font-mono">{reportData.totalClassAttempts}</span>
              </div>
            </div>

            {/* Card 2: Average Spelling Score */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none -mr-4 -mt-4" />
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-100/30 dark:border-emerald-900/30 shadow-2xs shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class Average Score</span>
                <span className="block text-3xl font-black text-slate-800 dark:text-white font-mono">{reportData.classAverageScore}%</span>
              </div>
            </div>

            {/* Card 3: Class Hardest Word */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none -mr-4 -mt-4" />
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center border border-rose-100/30 dark:border-rose-900/30 shadow-2xs shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Class Hardest Word</span>
                <span className="block text-xl font-black text-slate-800 dark:text-white truncate" title={reportData.classHardestWord}>
                  {reportData.classHardestWord}
                </span>
              </div>
            </div>

          </div>

          {/* Student Analytics Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm font-display">Student Performance Breakdown</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono">
                {reportData.students.length} Student{reportData.students.length === 1 ? "" : "s"} tracked
              </span>
            </div>

            {reportData.students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30 dark:bg-slate-900/20">
                      <th className="py-3 px-6">Student Name</th>
                      <th className="py-3 px-6">Class / Grade</th>
                      <th className="py-3 px-6 text-center">Attempts</th>
                      <th className="py-3 px-6 text-center">Avg Score</th>
                      <th className="py-3 px-6">Hardest Word (Error Rate)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                    {reportData.students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center font-black text-[11px] font-display border border-indigo-100/50 dark:border-indigo-900/20">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{student.name}</span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-500 dark:text-slate-400">{student.class}</td>
                        <td className="py-4 px-6 text-center font-bold font-mono">{student.attempts}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-block font-bold font-mono px-2.5 py-1 rounded-full text-[11px] ${
                            student.averageScore >= 85 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20"
                              : student.averageScore >= 60
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/20"
                          }`}>
                            {student.averageScore}%
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-600 dark:text-slate-400">
                          {student.hardestWord.includes("Perfect") ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{student.hardestWord}</span>
                          ) : (
                            <span className="text-rose-500 dark:text-rose-400 font-semibold">{student.hardestWord}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 rounded-3xl flex items-center justify-center mx-auto border border-slate-200/50 dark:border-slate-800">
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-xs mx-auto">
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">No Student Data Yet</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] leading-relaxed">
                    Students haven't made any spelling attempts for this set. Share the access code below with your students to begin collecting report analytics:
                  </p>
                  <div className="pt-2">
                    <span className="inline-block font-mono font-bold text-sm bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 rounded-xl px-4 py-2 select-all tracking-wider">
                      {selectedReportSet.code}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left column: Create Form (3/5 width) */}
        <div className="lg:col-span-3 space-y-6">
          
          {createdSet && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-emerald-800 dark:text-emerald-400 space-y-4 shadow-sm animate-scale-up">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 text-white p-2 rounded-full mt-0.5">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-emerald-900 dark:text-emerald-200">Vocabulary Set Created!</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                    Your set <span className="font-semibold text-emerald-900 dark:text-emerald-200">"{createdSet.name}"</span> has been saved.
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col items-center text-center space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Access Code for Students</span>
                <div className="flex items-center gap-3">
                  <code className="text-3xl font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                    {createdSet.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdSet.code)}
                    className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 active:scale-95 transition-all cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copiedCode && <span className="text-xs text-emerald-600 font-medium">Copied!</span>}
              </div>

              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/30 p-3 rounded-lg text-center">
                Tell your students to type <strong>{createdSet.code}</strong> in the home screen to practice this set. No registration required!
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 text-rose-800 dark:text-rose-400 flex items-start gap-3 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Heads up: </span> {errorMsg}
              </div>
            </div>
          )}

          <div id="set-creator-card" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
            <h2 className="text-xl font-display font-semibold text-slate-800 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                {editingSetCode ? "Edit Vocabulary Set" : "Design New Spelling Set"}
              </span>
              {editingSetCode && (
                <span className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2.5 py-1 rounded-full font-mono font-bold animate-pulse">
                  Editing: {editingSetCode}
                </span>
              )}
            </h2>

            <form onSubmit={handleCreateSet} className="space-y-6">
              
              {/* Set Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Set Name</label>
                <input
                  type="text"
                  placeholder="e.g. Science Week 3, Silent letters, Spanish Verbs"
                  value={setName}
                  onChange={(e) => setSetName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500/80 transition-all font-sans text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              {/* Custom Code */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Custom Access Code</label>
                  <span className="text-xs text-slate-400">
                    {editingSetCode ? "Access code cannot be changed" : "Leaves random if blank (Optional)"}
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. GRADE5, SPACE1, VERBS"
                  value={customCode}
                  disabled={!!editingSetCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-500/80 transition-all font-mono text-indigo-600 dark:text-indigo-400 font-bold placeholder:font-sans placeholder:font-normal disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                />
              </div>

              {/* Level Customization Settings */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Level Customization Settings</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Configure what clues are allowed for students during practice in Level 4 (Full Memory) to support learning.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[4].map((lvlId) => {
                    const lvlName = "Level 4: Full Memory";
                    const config = levelCustomizations[lvlId] || { showDefinition: true, showPicture: true };

                    return (
                      <div key={lvlId} className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{lvlName}</span>
                        <div className="flex flex-col gap-1.5">
                          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.showDefinition !== false}
                              onChange={(e) => {
                                setLevelCustomizations({
                                  ...levelCustomizations,
                                  [lvlId]: {
                                    ...config,
                                    showDefinition: e.target.checked
                                  }
                                });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            Show definitions as clues
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.showPicture !== false}
                              onChange={(e) => {
                                setLevelCustomizations({
                                  ...levelCustomizations,
                                  [lvlId]: {
                                    ...config,
                                    showPicture: e.target.checked
                                  }
                                });
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            Show pictures/emojis as clues
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Word insertion */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Vocabulary Words ({wordsList.length})</label>
                  <button
                    type="button"
                    onClick={() => setUseBulk(!useBulk)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {useBulk ? "Single Word Mode" : "Bulk Paste Mode"}
                  </button>
                </div>

                {useBulk ? (
                  <div className="space-y-2">
                    <textarea
                      placeholder="Paste words separated by commas, spaces or newlines (e.g. Cat, Dog, Elephant)"
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-sans text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleImportBulk}
                      disabled={!bulkInput.trim()}
                      className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 disabled:opacity-50 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Import All Words
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Spelling Word</label>
                        <input
                          type="text"
                          placeholder="e.g. cat, banana..."
                          value={wordInput}
                          onChange={(e) => setWordInput(e.target.value.toLowerCase().replace(/[^a-záéíóúüñ\s]/g, ""))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddWord();
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Definition Clue (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. A furry pet that meows"
                          value={wordDefinitionInput}
                          onChange={(e) => setWordDefinitionInput(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddWord();
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">Picture Clue (URL or Emoji 🐱)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. 🐱 or URL"
                            value={wordPictureInput}
                            onChange={(e) => setWordPictureInput(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddWord();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddWord()}
                            className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer text-sm shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Displaying Current Words with color preview */}
                {wordsList.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950/40">
                    <div className="grid grid-cols-1 gap-2">
                      {wordsList.map((word, idx) => {
                        const isExpanded = expandedWordIdx === idx;
                        const wordLower = word.toLowerCase();
                        const currentMeta = wordMetadata[wordLower] || {};
                        return (
                          <div
                            key={idx}
                            className="flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-xs p-3 space-y-2 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1.5 select-none py-1">
                                {word.split(" ").map((subWord, subIdx) => (
                                  <div key={subIdx} className="flex gap-0.5 flex-wrap">
                                    {subWord.split("").map((letter, letterIdx) => (
                                      <LetterTile key={letterIdx} letter={letter} size="sm" />
                                    ))}
                                  </div>
                                ))}
                                {(currentMeta.definition || currentMeta.pictureUrl) && (
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-450 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded border border-slate-100 dark:border-slate-850">
                                    {currentMeta.pictureUrl && (
                                      <span className="text-sm shrink-0" title="Picture/Emoji Clue">
                                        {currentMeta.pictureUrl.startsWith("http") ? "🖼️" : currentMeta.pictureUrl}
                                      </span>
                                    )}
                                    {currentMeta.definition && (
                                      <span className="truncate italic max-w-[200px]" title={currentMeta.definition}>
                                        "{currentMeta.definition}"
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setExpandedWordIdx(isExpanded ? null : idx)}
                                  className={`p-1.5 text-xs rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                                    isExpanded 
                                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                      : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-850"
                                  }`}
                                  title="Add definition or picture clue"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-semibold">Clues</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWord(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Remove word"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Expanded Clue Customizer */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-2 animate-scale-up">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Word Definition / Meaning</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. A furry pet that meows"
                                      value={currentMeta.definition || ""}
                                      onChange={(e) => {
                                        setWordMetadata({
                                          ...wordMetadata,
                                          [wordLower]: {
                                            ...currentMeta,
                                            definition: e.target.value
                                          }
                                        });
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Picture Clue (URL or Emoji 🐱)</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. 🐱 or URL"
                                      value={currentMeta.pictureUrl || ""}
                                      onChange={(e) => {
                                        setWordMetadata({
                                          ...wordMetadata,
                                          [wordLower]: {
                                            ...currentMeta,
                                            pictureUrl: e.target.value
                                          }
                                        });
                                      }}
                                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-sm">
                    No words added yet. Add single words or paste a list above!
                  </div>
                )}
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {editingSetCode && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-center active:scale-98 transition-all cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || wordsList.length === 0}
                  className={`
                    flex-2 py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-center shadow-md
                    hover:bg-indigo-700 active:scale-98 transition-all
                    disabled:opacity-50 disabled:pointer-events-none cursor-pointer
                  `}
                >
                  {isSubmitting
                    ? editingSetCode
                      ? "Saving changes..."
                      : "Creating spelling set..."
                    : editingSetCode
                    ? `Save Changes (${wordsList.length} words)`
                    : `Publish Spelling Set (${wordsList.length} words)`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column: Previously Created Sets (2/5 width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Passcode Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <Lock className="w-5 h-5 text-indigo-500" />
              Teacher Passcode
            </h3>
            <p className="text-xs text-slate-400">
              Change the passcode required to access this Teacher Zone. The default passcode is <strong className="font-semibold text-indigo-600 dark:text-indigo-400">1234</strong>.
            </p>
            <form onSubmit={handleUpdatePasscode} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 1234"
                  value={passcodeVal}
                  onChange={(e) => setPasscodeVal(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shrink-0"
                >
                  Save Code
                </button>
              </div>
              {passcodeSuccess && (
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
                  <Check className="w-4 h-4" /> Passcode saved successfully!
                </div>
              )}
            </form>
          </div>

          <div id="teacher-saved-sets-card" className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ListCollapse className="w-5 h-5 text-indigo-500" />
              Your Created Sets
            </h3>
            <p className="text-xs text-slate-400">
              Sets you published on this computer are remembered here. (Students cannot delete these sets).
            </p>

            {isLoadingSets ? (
              <div className="space-y-3">
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
            ) : savedSets.length > 0 ? (
              <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                {savedSets.map((set) => (
                  <div
                    key={set.code}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-xs hover:shadow-sm transition-all space-y-3 ${
                      editingSetCode === set.code ? "border-amber-400 ring-2 ring-amber-100 dark:ring-amber-950/40" : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base line-clamp-1">{set.name}</h4>
                        <span className="text-xs text-slate-400 font-medium">
                          {set.words.length} words
                        </span>
                      </div>
                      
                      {/* Copy code pill */}
                      <button
                        onClick={() => copyToClipboard(set.code)}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-black rounded-full bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-colors border border-indigo-100/50 dark:border-indigo-900/50 cursor-pointer"
                        title="Click to copy student code"
                      >
                        {set.code}
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                      {set.words.slice(0, 5).map((w, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 rounded-sm font-mono text-[10px] text-slate-500 inline-flex flex-col items-start gap-0.5"
                        >
                          {w.split(" ").map((part, pIdx) => (
                            <span key={pIdx} className="block leading-tight">{part}</span>
                          ))}
                        </span>
                      ))}
                      {set.words.length > 5 && (
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 rounded-sm font-mono text-[10px] text-slate-400">
                          +{set.words.length - 5} more
                        </span>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-2.5 min-h-[42px] items-center">
                      {setToDelete === set.code ? (
                        <div className="flex gap-2 w-full items-center animate-scale-up">
                          <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 select-none">
                            Are you sure?
                          </span>
                          <button
                            onClick={() => {
                              handleDeleteSet(set.code);
                              setSetToDelete(null);
                            }}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setSetToDelete(null)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setSelectedReportSet(set)}
                            className="flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30 transition-all cursor-pointer"
                            title="View performance report"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Report
                          </button>

                          <button
                            onClick={() => handleEditSet(set)}
                            className={`flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                              editingSetCode === set.code
                                ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900"
                                : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30"
                            }`}
                            title="Edit vocabulary words"
                          >
                            <Pencil className="w-3 h-3" />
                            {editingSetCode === set.code ? "Editing..." : "Edit"}
                          </button>
                          
                          <button
                            onClick={() => setSetToDelete(set.code)}
                            className="flex items-center justify-center gap-1 flex-1 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 transition-all cursor-pointer"
                            title="Delete vocabulary set"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                You haven't created any custom spelling sets yet on this browser. Try building one above!
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
