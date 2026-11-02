import React, { useState } from 'react';
import {
  X,
  FileQuestion,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Save,
  Eye,
  Key,
  BookOpen,
  Check,
} from 'lucide-react';
import { Exam, Question } from '../../types';

interface ExamQuestionsManagerModalProps {
  exam: Exam;
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestions: (updatedQuestions: Question[]) => void;
}

export const ExamQuestionsManagerModal: React.FC<ExamQuestionsManagerModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSaveQuestions,
}) => {
  const [questions, setQuestions] = useState<Question[]>(() => [...exam.questions]);
  const [viewMode, setViewMode] = useState<'manager' | 'proofread'>('manager');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // New/Edit Question draft
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(10);
  const [type, setType] = useState('multiple_choice');
  const [topic, setTopic] = useState('');
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [optionsText, setOptionsText] = useState('Option A\nOption B\nOption C\nOption D');
  const [correctKeyIndex, setCorrectKeyIndex] = useState(0);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingIndex(questions.length);
    setPrompt('');
    setPoints(10);
    setType('multiple_choice');
    setTopic(exam.courseCode);
    setSampleAnswer('');
    setOptionsText('Option A\nOption B\nOption C\nOption D');
    setCorrectKeyIndex(0);
  };

  const handleStartEdit = (idx: number) => {
    const q = questions[idx];
    setEditingIndex(idx);
    setPrompt(q.prompt);
    setPoints(q.points || 10);
    setType(q.type || 'multiple_choice');
    setTopic(q.topic || exam.courseCode);
    setSampleAnswer(q.sampleAnswer || q.explanation || '');
    if (q.options && q.options.length > 0) {
      setOptionsText(q.options.map((o) => o.text).join('\n'));
      const foundIdx = q.options.findIndex((o) => q.correctAnswers?.includes(o.id) || (o as any).isCorrect);
      setCorrectKeyIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setOptionsText('Option A\nOption B\nOption C\nOption D');
      setCorrectKeyIndex(0);
    }
  };

  const handleSaveDraft = () => {
    if (!prompt.trim()) return;

    let options: { id: string; text: string }[] | undefined = undefined;
    let correctAnswers: string[] | undefined = undefined;

    if (type === 'multiple_choice' || type === 'single_choice') {
      const lines = optionsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      options = lines.map((line, lIdx) => ({
        id: `opt-${lIdx}`,
        text: line,
      }));
      const validCorrect = options[correctKeyIndex] ? [options[correctKeyIndex].id] : [options[0]?.id || 'opt-0'];
      correctAnswers = validCorrect;
    }

    const newQ: Question = {
      id: editingIndex !== null && questions[editingIndex]
        ? questions[editingIndex].id
        : `q-${exam.courseCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      prompt: prompt.trim(),
      points,
      type,
      topic: topic || exam.courseCode,
      options,
      correctAnswers,
      sampleAnswer: sampleAnswer.trim() || undefined,
      explanation: sampleAnswer.trim() || undefined,
    };

    const next = [...questions];
    if (editingIndex !== null && editingIndex < questions.length) {
      next[editingIndex] = newQ;
    } else {
      next.push(newQ);
    }
    setQuestions(next);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    setQuestions(next);
  };

  const handleFinalSave = () => {
    onSaveQuestions(questions);
    onClose();
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Examination Setting & Review</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exam.courseCode} — {exam.title} ({questions.length} Questions &bull; {totalPoints} Total Marks)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Modes */}
            <div className="inline-flex rounded-xl bg-slate-200 dark:bg-slate-800 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('manager')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'manager'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Structure & Reorder
              </button>
              <button
                type="button"
                onClick={() => setViewMode('proofread')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'proofread'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Proofread & Review All Q&As</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROOFREAD MODE */}
        {viewMode === 'proofread' ? (
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs">Complete Examination Proofreading Mode:</span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                  Review all question prompts, option choices, correct keys, model solutions, and line-by-line mark points before publishing.
                </p>
              </div>
              <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs">
                Total Marks: {totalPoints} pts
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.topic && (
                        <span className="text-[11px] text-slate-500 font-medium">Topic: {q.topic}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <span>Marks:</span>
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuestions((curr) =>
                              curr.map((item, itemIdx) => (itemIdx === idx ? { ...item, points: val } : item))
                            );
                          }}
                          className="w-16 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Question Stem textarea */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Question Prompt:
                    </label>
                    <textarea
                      rows={2}
                      value={q.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((curr) =>
                          curr.map((item, itemIdx) => (itemIdx === idx ? { ...item, prompt: val } : item))
                        );
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs leading-relaxed focus:bg-white"
                    />
                  </div>

                  {/* Options if multiple choice */}
                  {q.options && q.options.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                        Answer Options & Target Key:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isKey = q.correctAnswers?.includes(opt.id) || (opt as any).isCorrect;
                          return (
                            <div
                              key={opt.id || optIdx}
                              onClick={() => {
                                setQuestions((curr) =>
                                  curr.map((item, itemIdx) =>
                                    itemIdx === idx ? { ...item, correctAnswers: [opt.id] } : item
                                  )
                                );
                              }}
                              className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                                isKey
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>{opt.text}</span>
                              </div>
                              {isKey && (
                                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.5 rounded font-bold">
                                  Correct Key
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Model Answer & Marking Scheme */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                    <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 font-bold text-xs">
                      <span className="flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Official Model Answer & Line-by-Line Marking Scheme:</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                        Max: {q.points} Marks
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={q.sampleAnswer || q.explanation || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((curr) =>
                          curr.map((item, itemIdx) =>
                            itemIdx === idx
                              ? { ...item, sampleAnswer: val, explanation: val }
                              : item
                          )
                        );
                      }}
                      placeholder="List marking points line-by-line with marks breakdown..."
                      className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* MANAGER / REORDER MODE */
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleStartAdd}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Question</span>
              </button>

              <span className="text-slate-500 font-semibold">
                Total Points: {totalPoints} pts
              </span>
            </div>

            {/* Edit / Draft Form */}
            {editingIndex !== null && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-indigo-200 dark:border-indigo-900 space-y-3">
                <div className="font-bold text-indigo-600 dark:text-indigo-400">
                  {editingIndex < questions.length ? `Edit Question ${editingIndex + 1}` : 'New Question'}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Prompt / Text</label>
                  <textarea
                    rows={2}
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="single_choice">Single Choice</option>
                      <option value="essay">Essay / Long Answer</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Points</label>
                    <input
                      type="number"
                      min={1}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Topic</label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {(type === 'multiple_choice' || type === 'single_choice') && (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-500">
                      Options (One per line)
                    </label>
                    <textarea
                      rows={3}
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Correct Key:</span>
                      <select
                        value={correctKeyIndex}
                        onChange={(e) => setCorrectKeyIndex(Number(e.target.value))}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {optionsText.split(/\r?\n/).map((l, i) => (
                          <option key={i} value={i}>
                            Option {String.fromCharCode(65 + i)}: {l.slice(0, 30)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Official Model Answer / Marking Scheme (Line by line)
                  </label>
                  <textarea
                    rows={2}
                    value={sampleAnswer}
                    onChange={(e) => setSampleAnswer(e.target.value)}
                    placeholder="Enter model answer and point allocations..."
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    Save Question
                  </button>
                </div>
              </div>
            )}

            {/* List of existing questions */}
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-3 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      Q{idx + 1}. {q.prompt}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{q.type} &bull; {q.points} Points &bull; Topic: {q.topic || 'General'}</span>
                      {(q.sampleAnswer || q.explanation) && (
                        <span className="text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                          Marking Scheme Set
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === questions.length - 1}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(idx)}
                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                      title="Edit Question"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {questions.length} questions configured &bull; {totalPoints} Total Points
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-xs"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Publish Updated Examination Paper</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
