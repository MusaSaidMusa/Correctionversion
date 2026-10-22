import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import {
  overrideQuestionMark,
  requestCommittedMarkChange,
  saveSubmission,
} from '../../services/storageService';

interface ManualMarkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: ExamSubmission;
  exam: Exam;
  instructorName: string;
  onGradingCompleted: () => void;
}

export const ManualMarkingModal: React.FC<ManualMarkingModalProps> = ({
  isOpen,
  onClose,
  submission,
  exam,
  instructorName,
  onGradingCompleted,
}) => {
  const [grades, setGrades] = useState<{
    [qId: string]: { points: number; feedback: string };
  }>(() => {
    const initial: { [qId: string]: { points: number; feedback: string } } = {};
    exam.questions.forEach((q) => {
      const ans = submission.answers?.[q.id];
      initial[q.id] = {
        points: ans?.awardedPoints ?? 0,
        feedback: ans?.teacherFeedback ?? '',
      };
    });
    return initial;
  });

  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePointChange = (qId: string, val: number, max: number) => {
    const points = Math.max(0, Math.min(val, max));
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], points },
    }));
  };

  const handleFeedbackChange = (qId: string, feedback: string) => {
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], feedback },
    }));
  };

  const calculatedTotal = Object.values(grades).reduce((sum, g) => sum + (g.points || 0), 0);
  const totalPossible = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const calculatedPercentage =
    totalPossible > 0 ? Math.round((calculatedTotal / totalPossible) * 100) : 0;

  const handleSaveGrades = async () => {
    setError(null);
    setSaving(true);

    try {
      if (submission.isResultCommitted) {
        // If result was already committed, require formal justification note
        if (!explanation.trim()) {
          setError(
            'Institutional Audit Requirement: Because this candidate result was already committed to the student portal, a formal written justification note is mandatory for Super Admin approval.'
          );
          setSaving(false);
          return;
        }

        const questionGrades: Record<string, { awardedPoints: number; feedback?: string }> = {};
        Object.entries(grades).forEach(([qId, val]) => {
          questionGrades[qId] = {
            awardedPoints: val.points,
            feedback: val.feedback,
          };
        });

        const res = requestCommittedMarkChange(
          submission.id,
          questionGrades,
          explanation,
          instructorName
        );
        if (!res.success) {
          setError(res.error || 'Failed to submit mark adjustment request.');
          setSaving(false);
          return;
        }
      } else {
        // Save marks directly
        const updatedAnswers = { ...submission.answers };
        exam.questions.forEach((q) => {
          const g = grades[q.id];
          if (g) {
            updatedAnswers[q.id] = {
              ...(updatedAnswers[q.id] || { questionId: q.id }),
              awardedPoints: g.points,
              teacherFeedback: g.feedback,
              isGraded: true,
            };
          }
        });

        const updatedSubmission: ExamSubmission = {
          ...submission,
          answers: updatedAnswers,
          score: calculatedTotal,
          totalPoints: totalPossible,
          percentage: calculatedPercentage,
          status: 'graded',
        };

        saveSubmission(updatedSubmission);
      }

      onGradingCompleted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Summative Marking & Mark Override Console
              </h3>
              <p className="text-xs text-slate-500">
                Candidate: {submission.studentName} · {exam.courseCode}
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
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {submission.isResultCommitted && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Audited Protocol Notice:</strong> This score has already been published to the student portal. Any modified marks require a written justification and will route to the Super Admin for audit approval.
              </span>
            </div>
          )}

          {/* Real-time score ticker */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Summative Mark Total
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {calculatedTotal} / {totalPossible} Marks ({calculatedPercentage}%)
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Invigilator Examiner
              </span>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {instructorName}
              </div>
            </div>
          </div>

          {/* Question-by-question evaluation */}
          <div className="space-y-6">
            {exam.questions.map((q, idx) => {
              const ans = submission.answers?.[q.id];
              const g = grades[q.id] || { points: 0, feedback: '' };

              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-extrabold text-indigo-600 text-sm">
                      Question {idx + 1} ({q.points} Max Marks)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        Awarded Score:
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={q.points}
                        value={g.points}
                        onChange={(e) =>
                          handlePointChange(q.id, Number(e.target.value), q.points)
                        }
                        className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {q.prompt}
                  </p>

                  {/* Student Response */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Candidate Submitted Response:
                    </span>
                    <div className="text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {ans?.textAnswer || 'No response recorded by candidate.'}
                    </div>
                  </div>

                  {/* Examiner Feedback */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Examiner Annotations & Qualitative Feedback
                    </label>
                    <input
                      type="text"
                      value={g.feedback}
                      onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                      placeholder="e.g. Accurate derivation; slight imprecision on edge condition."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit Reason if committed */}
          {submission.isResultCommitted && (
            <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
              <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                Formal Written Justification for Mark Adjustment (Required)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                placeholder="Specify exact academic grounds for altering committed marks (e.g. Remarking requested by candidate, recalculation of partial credit)..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          )}

          {/* Submit */}
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
              onClick={handleSaveGrades}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>
                {submission.isResultCommitted
                  ? 'Submit Mark Adjustment Request'
                  : 'Save Graded Marks'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
