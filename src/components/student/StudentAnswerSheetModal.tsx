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
  const percentage = Math.min(100, Math.max(0, Math.round((score / totalPoints) * 100)));
  const isMarked = submission.status === 'graded' || (submission.score !== undefined && submission.score !== null);

  const getAcademicGrade = (pct: number) => {
    if (pct >= 80) return { letter: 'A', label: 'Distinction / Excellent', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
    if (pct >= 70) return { letter: 'B', label: 'Very Good / Merit', color: 'text-blue-700 bg-blue-50 border-blue-300' };
    if (pct >= 60) return { letter: 'C', label: 'Good / Credit', color: 'text-teal-700 bg-teal-50 border-teal-300' };
    if (pct >= 50) return { letter: 'D', label: 'Pass', color: 'text-amber-700 bg-amber-50 border-amber-300' };
    return { letter: 'F', label: 'Fail / Unsatisfactory', color: 'text-rose-700 bg-rose-50 border-rose-300' };
  };

  const gradeInfo = isMarked ? getAcademicGrade(percentage) : null;

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
              Candidate Examination Answer Sheet — {exam.courseCode}: {exam.courseTitle || exam.title}
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

          {/* Graded Result Banner when marked by faculty */}
          {isMarked && gradeInfo && (
            <div className={`mb-6 p-4 rounded-xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 font-sans ${gradeInfo.color}`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Faculty Evaluation Complete</h4>
                  <p className="text-xs opacity-90">Official marks verified and certified by course instructor.</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="font-mono text-2xl font-black tracking-tight">
                  Grade {gradeInfo.letter}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider">
                  {gradeInfo.label} ({percentage}%)
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-y-2 text-sm border-b border-slate-300 pb-4 mb-6">
            <div>
              <strong>Candidate Name:</strong> {submission.studentName || submission.studentId}
            </div>
            <div>
              <strong>Date of Sitting:</strong> {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Active Session'}
            </div>
            <div>
              <strong>Course Code:</strong> {exam.courseCode}
            </div>
            <div>
              <strong>Course Title:</strong> {exam.courseTitle || exam.title}
            </div>
            <div>
              <strong>Awarded Marks:</strong> {score} / {totalPoints} ({percentage}%)
            </div>
            <div>
              <strong>Official Grade:</strong>{' '}
              {isMarked && gradeInfo ? (
                <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold border text-xs ${gradeInfo.color}`}>
                  Grade {gradeInfo.letter} ({gradeInfo.label})
                </span>
              ) : (
                <span className="italic text-slate-500">
                  Pending Faculty Evaluation
                </span>
              )}
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
