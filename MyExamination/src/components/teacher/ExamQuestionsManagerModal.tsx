import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, BookOpen, AlertCircle } from 'lucide-react';
import { Exam, Question } from '../../types';

interface ExamQuestionsManagerModalProps {
  exam: Exam | null;
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
  const [questions, setQuestions] = useState<Question[]>(() => exam?.questions || []);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // New question form state
  const [topic, setTopic] = useState('');
  const [prompt, setPrompt] = useState('');
  const [points, setPoints] = useState(10);
  const [sampleAnswer, setSampleAnswer] = useState('');
  const [type, setType] = useState('essay');

  if (!isOpen || !exam) return null;

  const handleStartEdit = (q: Question) => {
    setEditingQuestion(q);
    setTopic(q.topic || '');
    setPrompt(q.prompt);
    setPoints(q.points);
    setSampleAnswer(q.sampleAnswer || '');
    setType(q.type);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setTopic('');
    setPrompt('');
    setPoints(10);
    setSampleAnswer('');
    setType('essay');
  };

  const handleSaveQuestion = () => {
    if (!prompt.trim()) return;

    if (editingQuestion) {
      const updated = questions.map((q) =>
        q.id === editingQuestion.id
          ? {
              ...q,
              topic: topic.trim() || 'General',
              prompt: prompt.trim(),
              points,
              sampleAnswer: sampleAnswer.trim() || undefined,
              type,
            }
          : q
      );
      setQuestions(updated);
      handleCancelEdit();
    } else {
      const newQ: Question = {
        id: `q-${Date.now()}`,
        topic: topic.trim() || 'General',
        prompt: prompt.trim(),
        points,
        sampleAnswer: sampleAnswer.trim() || undefined,
        type,
      };
      setQuestions([...questions, newQ]);
      handleCancelEdit();
    }
  };

  const handleDelete = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleCommit = () => {
    onSaveQuestions(questions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Exam Question Manager: {exam.courseCode}
              </h3>
              <p className="text-xs text-slate-500">
                {questions.length} Questions · Total Score:{' '}
                {questions.reduce((sum, q) => sum + (q.points || 0), 0)} Points
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Question List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Current Examination Questions
            </h4>
            {questions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                No questions attached yet. Add questions below.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-extrabold text-indigo-600">Q{idx + 1}.</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate">
                        {q.topic || 'Assessment Problem'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold text-[10px]">
                        {q.points} Pts
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {q.prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(q)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add / Edit Form */}
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
              {editingQuestion ? 'Edit Question' : 'Add New Question'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic / Subheading
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Distributed Consensus"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Question Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="essay">Essay / Long Answer</option>
                  <option value="structured">Structured / Multi-part</option>
                  <option value="calculation">Mathematical / Calculation</option>
                  <option value="code">Algorithmic Code Implementation</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Points Allocation
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Prompt Text
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Enter detailed question text..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Benchmark Solution (Marking Scheme Key)
              </label>
              <textarea
                value={sampleAnswer}
                onChange={(e) => setSampleAnswer(e.target.value)}
                rows={2}
                placeholder="Expected solution criteria or answer keys..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingQuestion && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingQuestion ? 'Update Question' : 'Add to Exam'}</span>
              </button>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Save Examination Paper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
