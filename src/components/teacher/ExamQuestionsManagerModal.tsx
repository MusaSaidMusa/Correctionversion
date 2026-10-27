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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // New/Edit Question draft
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(10);
  const [type, setType] = useState('multiple_choice');
  const [topic, setTopic] = useState('');

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingIndex(questions.length);
    setPrompt('');
    setPoints(10);
    setType('multiple_choice');
    setTopic(exam.courseCode);
  };

  const handleSaveDraft = () => {
    if (!prompt.trim()) return;

    const newQ: Question = {
      id: editingIndex !== null && questions[editingIndex]
        ? questions[editingIndex].id
        : `q-${exam.courseCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      prompt: prompt.trim(),
      points,
      type,
      topic: topic || exam.courseCode,
      options:
        type === 'multiple_choice' || type === 'single_choice'
          ? [
              { id: 'opt-a', text: 'Option A' },
              { id: 'opt-b', text: 'Option B' },
              { id: 'opt-c', text: 'Option C' },
              { id: 'opt-d', text: 'Option D' },
            ]
          : undefined,
      correctAnswers: ['opt-a'],
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Examination Questions Manager</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exam.courseCode} — {questions.length} Questions Configured
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
              Total Points: {questions.reduce((sum, q) => sum + (q.points || 0), 0)} pts
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIndex(null)}
                  className="px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
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
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {q.type} &bull; {q.points} Points &bull; Topic: {q.topic || 'General'}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === questions.length - 1}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingIndex(idx);
                      setPrompt(q.prompt);
                      setPoints(q.points);
                      setType(q.type);
                      setTopic(q.topic || '');
                    }}
                    className="p-1 rounded text-indigo-600 hover:bg-indigo-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1 rounded text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <button
              onClick={handleFinalSave}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Save Questions to Examination Paper</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
