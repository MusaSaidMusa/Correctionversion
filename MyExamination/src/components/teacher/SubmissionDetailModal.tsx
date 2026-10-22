import React, { useState } from 'react';
import {
  X,
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  User,
  GraduationCap,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import { commitSubmissionResult } from '../../services/storageService';
import { StudentAnswerSheetModal } from '../student/StudentAnswerSheetModal';

interface SubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: ExamSubmission;
  exam: Exam;
  instructorName: string;
  onCommitResult?: () => void;
  onOpenAnswerSheet?: () => void;
  onDataChanged?: () => void;
  onSaveOverride?: (submissionId: string, questionId: string, newPoints: number, reason: string) => void;
}

export const SubmissionDetailModal: React.FC<SubmissionDetailModalProps> = ({
  isOpen,
  onClose,
  submission,
  exam,
  instructorName,
  onCommitResult,
  onOpenAnswerSheet,
}) => {
  const [committing, setCommitting] = useState(false);
  const [committedSuccess, setCommittedSuccess] = useState(submission.isResultCommitted ?? false);
  const [showAnswerSheet, setShowAnswerSheet] = useState(false);

  if (!isOpen) return null;

  const totalPoints =
    submission.totalPoints ?? exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const score = submission.score ?? 0;
  const percentage =
    submission.percentage ?? (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const res = await commitSubmissionResult(submission.id, instructorName);
      if (res.success) {
        setCommittedSuccess(true);
        onCommitResult?.();
      }
    } finally {
      setCommitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Submission Assessment Audit
                </h3>
                <p className="text-xs text-slate-500">
                  {submission.studentName} ({submission.studentNumber || 'Candidate'}) · {exam.courseCode}
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

          <div className="p-6 space-y-5">
            {/* Score & Status banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Calculated Score
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {score} / {totalPoints} Points ({percentage}%)
                </div>
                <div className="text-xs text-slate-500">
                  Status: <span className="font-semibold capitalize">{submission.status}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Integrity Rating
                </span>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{submission.integrityScore ?? 98}% Verified</span>
                </div>
                <div className="text-xs text-slate-500">
                  {submission.incidents?.length || 0} Incident(s) flagged
                </div>
              </div>
            </div>

            {/* Candidate details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Candidate Email</span>
                <span className="font-medium text-slate-900 dark:text-white">{submission.studentEmail}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Submission Time</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {new Date(submission.submittedAt || submission.startedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Proctor Incidents */}
            {submission.incidents && submission.incidents.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Invigilation Telemetry Log
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {submission.incidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span>{inc.description}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(inc.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (onOpenAnswerSheet) {
                    onOpenAnswerSheet();
                  } else {
                    setShowAnswerSheet(true);
                  }
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-indigo-500" />
                <span>Open Full Student Answer Sheet</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={committing || committedSuccess}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md ${
                    committedSuccess
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{committedSuccess ? 'Result Committed ✓' : 'Commit Result to Portal'}</span>
                </button>
              </div>
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
