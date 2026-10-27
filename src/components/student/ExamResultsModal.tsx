import React from 'react';
import {
  X,
  Award,
  CheckCircle2,
  ShieldCheck,
  Clock,
  AlertTriangle,
  FileText,
  BarChart2,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';

interface ExamResultsModalProps {
  exam: Exam;
  submission: ExamSubmission;
  isOpen: boolean;
  onClose: () => void;
}

export const ExamResultsModal: React.FC<ExamResultsModalProps> = ({
  exam,
  submission,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const totalPoints =
    submission.totalPoints ||
    exam.questions.reduce((sum, q) => sum + (q.points || 0), 0) ||
    100;
  const score = submission.score ?? 0;
  const percentage =
    submission.percentage ?? (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);
  const isPassed = percentage >= (exam.passingScorePercentage || 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Examination Performance Summary</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exam.courseCode} — {exam.title}
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

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Main Score Banner */}
          <div
            className={`p-6 rounded-2xl border text-center ${
              isPassed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100'
            }`}
          >
            <div className="text-xs font-bold uppercase tracking-wider opacity-75">
              Awarded Mark & Grade
            </div>
            <div className="text-4xl font-extrabold my-2">
              {score} <span className="text-xl font-normal opacity-70">/ {totalPoints}</span>
            </div>
            <div className="text-sm font-semibold">
              Percentage: {percentage}% &bull; {isPassed ? 'Standing: PASS' : 'Standing: RESIT REQUIRED'}
            </div>
            {submission.isResultCommitted ? (
              <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Officially Committed by Faculty ({submission.committedBy || exam.instructorName})
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Provisional Result — Pending Final Instructor Audit Release
              </div>
            )}
          </div>

          {/* Academic Integrity & Proctoring Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Integrity Score
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {submission.integrityScore ?? 100}%
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Attempt Number
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {submission.attemptNumber || 1} of {exam.maxAttempts || 1}
              </div>
            </div>
          </div>

          {/* Questions Evaluated Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Question Evaluation Breakdown ({exam.questions.length})
            </h4>
            <div className="space-y-2">
              {exam.questions.map((q, idx) => {
                const ans = submission.answers?.[q.id];
                const awarded = ans?.awardedPoints ?? 0;

                return (
                  <div
                    key={q.id || idx}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Q{idx + 1}: {q.prompt.slice(0, 60)}...
                      </div>
                      {ans?.teacherFeedback && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                          Feedback: {ans.teacherFeedback}
                        </div>
                      )}
                    </div>
                    <div className="font-bold shrink-0 ml-3 text-slate-800 dark:text-slate-200">
                      {awarded} / {q.points} pts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Close & Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
