import React from 'react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';

interface StudentAnswerSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  submission: ExamSubmission;
}

export const StudentAnswerSheetModal: React.FC<StudentAnswerSheetModalProps> = ({
  isOpen,
  onClose,
  exam,
  submission,
}) => {
  if (!isOpen) return null;

  const totalPoints =
    submission.totalPoints ||
    exam.questions.reduce((sum, q) => sum + (q.points || 0), 0) ||
    100;
  const score = submission.score ?? 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Controls (Excluded when printing) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">
              Candidate Examination Answer Sheet — {exam.courseCode} ({submission.studentName || submission.studentId})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Answer Sheet Script (Official Times New Roman 12pt Academic Format) */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[12pt] leading-relaxed text-black bg-white select-text">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/institution-logo.jpg"
                alt="Institutional Examination Board Logo"
                className="h-16 max-w-[200px] object-contain"
              />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wide">University Academic Examination Board</h1>
            <h2 className="text-sm font-semibold uppercase tracking-wider mt-0.5">
              {exam.faculty || 'Faculty of Computing & Information Technologies'}
            </h2>
            <h3 className="text-xs uppercase tracking-wider text-slate-700 mt-0.5">
              Official Candidate Script & Graded Answer Sheet
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-y-2 text-sm border-b border-slate-300 pb-4 mb-6">
            <div>
              <strong>Candidate Name:</strong> {submission.studentName || submission.studentId}
            </div>
            <div>
              <strong>Date of Sitting:</strong> {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Active Session'}
            </div>
            <div>
              <strong>Course:</strong> {exam.courseCode} - {exam.courseTitle || exam.title}
            </div>
            <div>
              <strong>Awarded Marks:</strong> {score} / {totalPoints} ({submission.percentage ?? Math.round((score/totalPoints)*100)}%)
            </div>
            <div>
              <strong>Integrity Score:</strong> {submission.integrityScore ?? 100}%
            </div>
            <div>
              <strong>Status:</strong> {submission.status.toUpperCase()}
            </div>
          </div>

          {/* Questions and Candidate Responses */}
          <div className="space-y-8 mt-6">
            {exam.questions.map((q, idx) => {
              const ans = submission.answers?.[q.id];
              const awarded = ans?.awardedPoints ?? 0;

              return (
                <div key={q.id || idx} className="space-y-3 border-b border-slate-200 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-bold">
                      Question {idx + 1}.
                    </div>
                    <div className="font-bold text-sm shrink-0">
                      Score: [{awarded} / {q.points} Marks]
                    </div>
                  </div>

                  <div className="pl-4 space-y-2">
                    <p className="text-slate-800">{q.prompt}</p>

                    <div className="mt-3 p-3 bg-slate-50 border border-slate-300 rounded text-sm">
                      <strong className="block text-xs uppercase text-slate-600 mb-1">
                        Candidate’s Response:
                      </strong>
                      {ans?.textAnswer ? (
                        <p className="whitespace-pre-wrap">{ans.textAnswer}</p>
                      ) : ans?.selectedOptionIds && ans.selectedOptionIds.length > 0 ? (
                        <p className="font-sans font-medium">
                          Selected Option:{' '}
                          {q.options
                            ?.filter((o) => ans.selectedOptionIds?.includes(o.id))
                            .map((o) => o.text)
                            .join(', ') || ans.selectedOptionIds.join(', ')}
                        </p>
                      ) : (
                        <p className="italic text-slate-500">No response recorded by candidate.</p>
                      )}
                    </div>

                    {ans?.teacherFeedback && (
                      <div className="text-xs italic text-indigo-900 bg-indigo-50 p-2 rounded border border-indigo-200">
                        <strong>Examiner Feedback:</strong> {ans.teacherFeedback}
                      </div>
                    )}

                    {ans?.isOverridden && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Marks Audit Note:</strong> Adjusted by {ans.overriddenBy || 'Invigilator'}. Justification: "{ans.overrideReason}".
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Examiner Certification Sign-off */}
          <div className="mt-12 pt-6 border-t-2 border-black flex items-center justify-between text-xs">
            <div>
              <strong>Chief Invigilator:</strong> {exam.instructorName}
              <div className="text-slate-500 mt-0.5">Faculty Certification Seal Verified</div>
            </div>
            <div className="text-right">
              <strong>Academic Audit Status:</strong> Verified & Archived
              <div className="text-slate-500 mt-0.5">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
