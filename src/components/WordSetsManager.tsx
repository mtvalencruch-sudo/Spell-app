import React, { useState } from "react";
import { WordSet } from "../types";
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Edit3, 
  Save, 
  X, 
  PlusCircle, 
  CheckCircle,
  FileCode,
  Copy,
  Check,
  Lock,
  Unlock,
  Settings,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WordSetsManagerProps {
  wordSets: WordSet[];
  onCreateSet: (newSet: WordSet) => void;
  onUpdateSet: (updatedSet: WordSet) => void;
  onDeleteSet: (code: string) => void;
  onImportSets: (importedSets: WordSet[]) => void;
  isTeacher?: boolean;
  onUnlockRequest?: () => void;
  onChangeCode?: (newCode: string) => void;
  teacherCode?: string;
  onLockTeacher?: () => void;
}

export function WordSetsManager({ 
  wordSets, 
  onCreateSet, 
  onUpdateSet, 
  onDeleteSet,
  onImportSets,
  isTeacher = false,
  onUnlockRequest = () => {},
  onChangeCode = () => {},
  teacherCode = "1234",
  onLockTeacher = () => {}
}: WordSetsManagerProps) {
  // Creating lists states
  const [isCreating, setIsCreating] = useState(false);
  const [listName, setListName] = useState("");
  const [wordsInput, setWordsInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Local state for changing teacher security code
  const [isChangingCode, setIsChangingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState("");
  const [codeChangeSuccess, setCodeChangeSuccess] = useState(false);

  // Editing lists states
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingWords, setEditingWords] = useState("");

  // Import / Export JSON code states
  const [showImportArea, setShowImportArea] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Parse list input into words
  const cleanWordsInput = (input: string): string[] => {
    return input
      .split(/[\n,]+/) // Split by newlines or commas
      .map((w) => w.trim().toLowerCase()) // Trim and lower-case
      .filter((w) => /^[a-z]+$/.test(w)); // Filter out empty or invalid alphabetic words
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!listName.trim()) {
      setErrorMsg("Please enter a list name.");
      return;
    }

    const processedWords = cleanWordsInput(wordsInput);
    if (processedWords.length === 0) {
      setErrorMsg("Please enter at least one valid English word (alphabetic letters only).");
      return;
    }

    // Generate unique code
    const generatedCode = `custom-${Date.now()}`;

    const newSet: WordSet = {
      code: generatedCode,
      name: listName.trim(),
      words: processedWords,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    onCreateSet(newSet);
    
    // Reset fields
    setListName("");
    setWordsInput("");
    setIsCreating(false);
  };

  const handleStartEdit = (set: WordSet) => {
    setEditingCode(set.code);
    setEditingName(set.name);
    setEditingWords(set.words.join(", "));
  };

  const handleSaveEdit = (code: string) => {
    if (!editingName.trim()) {
      alert("Please enter a list name.");
      return;
    }

    const processedWords = cleanWordsInput(editingWords);
    if (processedWords.length === 0) {
      alert("Please enter at least one valid word.");
      return;
    }

    const updatedSet: WordSet = {
      code,
      name: editingName.trim(),
      words: processedWords,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    onUpdateSet(updatedSet);
    setEditingCode(null);
  };

  // Export all lists
  const handleExport = () => {
    const dataStr = JSON.stringify(wordSets, null, 2);
    navigator.clipboard.writeText(dataStr);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download lists as .json file
  const handleDownloadFile = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(wordSets, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `spell-it-sets-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON list handler
  const handleImport = () => {
    setImportError("");
    try {
      const parsed = JSON.parse(importJson);
      
      // Basic schema validation
      if (!Array.isArray(parsed)) {
        setImportError("JSON must be an array of word sets.");
        return;
      }

      const validated: WordSet[] = [];
      for (const item of parsed) {
        if (!item.code || !item.name || !Array.isArray(item.words)) {
          setImportError("Each item must have a code, name, and an array of words.");
          return;
        }

        // Clean up each word
        const words = item.words
          .map((w: any) => String(w).trim().toLowerCase())
          .filter((w: string) => /^[a-z]+$/.test(w));

        if (words.length === 0) continue;

        validated.push({
          code: item.code.startsWith("custom-") ? item.code : `custom-${item.code}-${Date.now()}`,
          name: String(item.name).trim(),
          words,
          createdAt: item.createdAt || new Date().toISOString(),
          isCustom: true
        });
      }

      if (validated.length === 0) {
        setImportError("No valid spelling lists found in the JSON.");
        return;
      }

      onImportSets(validated);
      setImportJson("");
      setShowImportArea(false);
      alert(`Successfully imported ${validated.length} list(s)!`);
    } catch (e) {
      setImportError("Invalid JSON syntax. Please check your spelling and formatting.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Upper bar with title and action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Spelling Lab Sets</h2>
          <p className="text-slate-400 text-sm">Create, edit, import, or export custom spelling words list sets.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {isTeacher ? (
            <>
              <button
                onClick={() => {
                  setIsCreating(!isCreating);
                  setShowImportArea(false);
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer animate-fade-in"
              >
                <Plus className="w-4 h-4" />
                Create Set
              </button>
              
              <button
                onClick={() => {
                  setShowImportArea(!showImportArea);
                  setIsCreating(false);
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <Upload className="w-4 h-4" />
                Import Lists
              </button>
            </>
          ) : (
            <button
              onClick={onUnlockRequest}
              className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-500" />
              Unlock Teacher Controls
            </button>
          )}

          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copySuccess ? "Copied JSON!" : "Copy Sets"}
          </button>

          <button
            onClick={handleDownloadFile}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Backup
          </button>
        </div>
      </div>

      {/* Teacher Zone Lock/Unlock Banners */}
      {!isTeacher ? (
        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-100/60 dark:border-amber-900/30 text-amber-500 rounded-xl flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold font-display text-slate-800 dark:text-slate-200">
                Teacher Administration Zone Locked
              </h4>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                Only teachers can create, edit, or delete spelling lists. Please unlock with your security access code.
              </p>
            </div>
          </div>
          <button
            onClick={onUnlockRequest}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider transition cursor-pointer self-start sm:self-center shadow-xs"
          >
            Enter Access Code
          </button>
        </div>
      ) : (
        <div className="bg-emerald-500/[0.03] dark:bg-emerald-950/10 border border-emerald-500/15 dark:border-emerald-900/30 rounded-[28px] p-6 space-y-4.5 relative overflow-hidden">
          {/* Decorative radial pattern */}
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none -mr-6 -mb-6" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-3.5 items-start">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-500 rounded-2xl flex-shrink-0 animate-pulse">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black font-display text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Teacher Workspace Active
                  <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/30 font-sans">
                    Authorized
                  </span>
                </h4>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  You are in Teacher Mode. You can freely create lists, import JSON sets, update current titles, or delete custom sets.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setIsChangingCode(!isChangingCode);
                  setNewCodeInput("");
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              >
                <Settings className="w-4 h-4" />
                Configure Code
              </button>
              <button
                onClick={onLockTeacher}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-650 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                Lock Workspace
              </button>
            </div>
          </div>

          {/* Configure Passcode dropdown sub-form */}
          <AnimatePresence>
            {isChangingCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-slate-100 dark:border-slate-800/85 pt-4.5 space-y-4 overflow-hidden"
              >
                <div className="max-w-md space-y-2.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    Define New Teacher Access Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCodeInput}
                      onChange={(e) => {
                        setNewCodeInput(e.target.value);
                        setCodeChangeSuccess(false);
                      }}
                      placeholder="Enter new code (e.g. 5678, TEACHER)"
                      className="flex-grow p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newCodeInput.trim()) {
                          onChangeCode(newCodeInput.trim());
                          setCodeChangeSuccess(true);
                          setIsChangingCode(false);
                          setNewCodeInput("");
                          alert("Teacher Access Code successfully updated!");
                        } else {
                          alert("Please enter a valid code.");
                        }
                      }}
                      className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      Update Code
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Current active access code is: <code className="bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded font-mono font-bold text-slate-500">{teacherCode}</code>.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {/* Import JSON Area */}
        {showImportArea && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Import Spelling Lists</h3>
              </div>
              <button 
                onClick={() => setShowImportArea(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a previously exported Spell It set JSON array. It will append your sets to your current lists.
            </p>

            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='[{"code": "list-1", "name": "My Custom List", "words": ["apple", "banana"]}]'
              className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />

            {importError && (
              <p className="text-xs text-rose-500 font-bold">{importError}</p>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowImportArea(false)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Validate & Import
              </button>
            </div>
          </motion.div>
        )}

        {/* Create Word Set Form */}
        {isCreating && (
          <motion.form
            onSubmit={handleCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Create a New Spelling Set</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Set Title</label>
                <input
                  type="text"
                  required
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g. Science terms, Animals, Grade 3"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>

              <div className="md:col-span-7 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Words List</label>
                <textarea
                  required
                  value={wordsInput}
                  onChange={(e) => setWordsInput(e.target.value)}
                  placeholder="cat, dog, parrot, chicken (separate each word using commas or a new line)"
                  className="w-full h-11 min-h-[46px] p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-500 font-bold">{errorMsg}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Save Set
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {wordSets.map((set) => {
          const isEditing = editingCode === set.code;

          return (
            <div
              key={set.code}
              className={`bg-white dark:bg-slate-900 border rounded-[24px] p-6 shadow-md shadow-slate-100/40 dark:shadow-none flex flex-col justify-between space-y-4 transition-all duration-300 ${
                isEditing 
                  ? "border-indigo-400 dark:border-indigo-950 ring-4 ring-indigo-500/10" 
                  : "border-slate-100 dark:border-slate-800/80 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50"
              }`}
            >
              {isEditing ? (
                // Edit state
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest font-mono">
                      Editing Mode
                    </span>
                    <button 
                      onClick={() => setEditingCode(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Set Title</label>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Spelling Words (comma-separated)</label>
                      <textarea
                        value={editingWords}
                        onChange={(e) => setEditingWords(e.target.value)}
                        className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      onClick={() => setEditingCode(null)}
                      className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(set.code)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-100"
                    >
                      <Save className="w-4 h-4" />
                      Save Updates
                    </button>
                  </div>
                </div>
              ) : (
                // View state
                <>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold font-display text-slate-800 dark:text-slate-100 text-base md:text-lg flex flex-wrap items-center gap-2">
                          {set.name}
                          {!set.isCustom && (
                            <span className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700/50">
                              Core Preset
                            </span>
                          )}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase font-bold tracking-wider">
                          {set.words.length} spelling words
                        </p>
                      </div>

                      {set.isCustom && (
                        <div className="flex gap-1.5">
                          {isTeacher ? (
                            <>
                              <button
                                onClick={() => handleStartEdit(set)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition cursor-pointer border border-transparent hover:border-indigo-100"
                                title="Edit Spelling List"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteSet(set.code)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-100"
                                title="Delete Spelling List"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={onUnlockRequest}
                              className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-amber-500 dark:hover:text-amber-400 rounded-xl transition cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              title="Unlock Teacher Zone to Edit / Delete"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-3">
                      {set.words.map((w, index) => (
                        <span
                          key={index}
                          className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-1 rounded-lg border border-slate-100/60 dark:border-slate-800 font-mono font-medium"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">
                      Created: {new Date(set.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {!set.isCustom && (
                      <span className="text-emerald-500 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Read-Only Preset
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
