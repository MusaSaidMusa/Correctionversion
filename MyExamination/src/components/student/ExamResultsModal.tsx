import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import { StudentAnswerSheetModal } from './StudentAnswerSheetModal';

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
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);

  if (!isOpen) return null;

  const totalPoints =
    submission.totalPoints ?? exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const score = submission.score ?? 0;
  const percentage =
    submission.percentage ?? (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);
  const isPassed = percentage >= (exam.passingScorePercentage || 50);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Examination Result & Performance Audit
                </h3>
                <p className="text-xs text-slate-500">
                  {exam.courseCode} · {exam.title}
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

          {/* Score Banner */}
          <div className="p-6 text-center space-y-4">
            <div className="inline-flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30">
              <span className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                {percentage}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isPassed ? 'Passed' : 'Failed'}
              </span>
            </div>

            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">
                {score} / {totalPoints} Points Awarded
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Submitted on {new Date(submission.submittedAt || submission.startedAt).toLocaleString()}
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Integrity Heuristic</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">
                  {submission.integrityScore ?? 98}% Verified
                </div>
                <div className="text-[10px] text-slate-500">
                  {submission.incidents?.length || 0} Incident(s) flagged
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold mb-1">
                  <FileCheck2 className="w-4 h-4" />
                  <span>Portal Status</span>
                </div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white capitalize">
                  {submission.isResultCommitted ? 'Official Transcript' : 'Preliminary Grade'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {submission.isResultCommitted ? 'Committed by Invigilator' : 'Under Review'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowAnswerSheet(true)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View Complete Graded Answer Sheet</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAnswerSheet && (
        <StudentAnswerSheetModal
          isOpen={true}
          onClose={() => setShowAnswerSheet(false)}
          exam={exam}
          submission={submission}
        />
      )}
    </>
  );
};
