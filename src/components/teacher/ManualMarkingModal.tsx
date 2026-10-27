import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import {
  manualGradeFullSubmission,
  requestCommittedMarkChange,
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
  const isCommitted = Boolean(submission.isResultCommitted);

  // Initialize marks state for each question
  const [grades, setGrades] = useState<Record<string, { awardedPoints: number; feedback?: string }>>(
    () => {
      const initial: Record<string, { awardedPoints: number; feedback?: string }> = {};
      exam.questions.forEach((q) => {
        const ans = submission.answers?.[q.id];
        initial[q.id] = {
          awardedPoints: ans?.awardedPoints ?? 0,
          feedback: ans?.teacherFeedback || '',
        };
      });
      return initial;
    }
  );

  const [overallRemarks, setOverallRemarks] = useState('');
  const [committedChangeReason, setCommittedChangeReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handlePointChange = (qId: string, val: number, maxPoints: number) => {
    const clamped = Math.max(0, Math.min(maxPoints, val));
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], awardedPoints: clamped },
    }));
  };

  const handleFeedbackChange = (qId: string, text: string) => {
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], feedback: text },
    }));
  };

  const currentTotalScore = Object.values(grades).reduce(
    (sum, g) => sum + (g.awardedPoints || 0),
    0
  );
  const totalPossible = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaving(true);

    try {
      if (isCommitted) {
        if (!committedChangeReason.trim()) {
          setErrorMessage('Written justification is mandatory for committed-mark alterations.');
          setSaving(false);
          return;
        }

        const res = requestCommittedMarkChange(
          submission.id,
          grades,
          committedChangeReason.trim(),
          instructorName
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit mark-change request.');
          setSaving(false);
          return;
        }
      } else {
        const res = manualGradeFullSubmission(
          submission.id,
          grades,
          overallRemarks.trim(),
          instructorName
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to record manual marks.');
          setSaving(false);
          return;
        }
      }

      onGradingCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving grades.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Comprehensive Manual Exam Marking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluating {submission.studentName || submission.studentId} — {exam.courseCode}
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

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {isCommitted && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Institutional Mark Lock Active</span>
              </div>
              <p>
                This examination script has already been committed to the Student Portal. Any mark adjustments will create a formal request sent to the Super Admin Directorate for audit review.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Current Score Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Evaluation</div>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {currentTotalScore} <span className="text-xs font-normal text-slate-500">/ {totalPossible} pts</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Percentage</div>
              <div className="text-lg font-bold">
                {totalPossible > 0 ? Math.round((currentTotalScore / totalPossible) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Question grading cards */}
          <div className="space-y-4">
            {exam.questions.map((q, idx) => {
              const ans = submission.answers?.[q.id];
              const grade = grades[q.id] || { awardedPoints: 0 };

              return (
                <div
                  key={q.id || idx}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        Question {idx + 1} [{q.type}]
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{q.prompt}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[11px] font-semibold text-slate-500">Award:</label>
                      <input
                        type="number"
                        min={0}
                        max={q.points}
                        value={grade.awardedPoints}
                        onChange={(e) => handlePointChange(q.id, Number(e.target.value), q.points)}
                        className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <span className="text-slate-500 font-semibold">/ {q.points}</span>
                    </div>
                  </div>

                  {/* Student Response */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-500 uppercase text-[10px] block mb-1">
                      Candidate's Answer:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                      {ans?.textAnswer ||
                        (ans?.selectedOptionIds && ans.selectedOptionIds.length > 0
                          ? `Selected: ${ans.selectedOptionIds.join(', ')}`
                          : 'No response submitted.')}
                    </p>
                  </div>

                  {/* Question Feedback */}
                  <div>
                    <input
                      type="text"
                      placeholder="Specific feedback on this response..."
                      value={grade.feedback || ''}
                      onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Justification for committed mark change */}
          {isCommitted ? (
            <div>
              <label className="block font-bold uppercase tracking-wider text-amber-600 mb-1">
                Mandatory Written Justification (for Super Admin Approval)
              </label>
              <textarea
                rows={3}
                required
                value={committedChangeReason}
                onChange={(e) => setCommittedChangeReason(e.target.value)}
                placeholder="Detail reason for altering previously published student marks (e.g. recalculated essay points after re-evaluation of step 3)..."
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Overall Invigilator Remarks
              </label>
              <textarea
                rows={2}
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                placeholder="General comments on overall script performance..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isCommitted ? 'Submit Mark Change for Admin Approval' : 'Publish Graded Marks'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
