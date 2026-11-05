import React, { useEffect } from 'react';
import { X, Printer, FileText, Lock, ShieldAlert, Award, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Exam } from '../../types';
import { cleanDisplayCaption } from '../../services/imageCompressionService';

interface ExaminationPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  userRole?: string;
  canDownload?: boolean;
  faculty?: string;
  department?: string;
}

export const ExaminationPaperModal: React.FC<ExaminationPaperModalProps> = ({
  isOpen,
  onClose,
  exam,
  userRole,
  canDownload = true,
  faculty,
  department,
}) => {
  if (!isOpen) return null;

  const isStudent = userRole === 'student' || canDownload === false;

  // Use the exact marks specified by teacher during examination setting
  const totalTeacherMarks = exam.questions.reduce((sum, q) => {
    const pts = typeof q.points === 'number' && Number.isFinite(q.points) ? q.points : 0;
    return sum + pts;
  }, 0);

  useEffect(() => {
    if (!isOpen || !isStudent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isStudent]);

  const handlePrint = () => {
    if (isStudent) return;
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Action Header (Excluded when printed) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900">
                Official Examination Paper &mdash; {exam.courseCode}
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                {exam.courseTitle || exam.title} &bull; Rifkins Education College
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isStudent && canDownload ? (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Candidate View (Print Prohibited)</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Warning for Student Attempts */}
        {isStudent && (
          <div className="student-print-warning hidden print:flex fixed inset-0 bg-white z-[99999] flex-col items-center justify-center p-12 text-center font-sans">
            <ShieldAlert className="w-16 h-16 text-rose-600 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Printing Prohibited</h2>
            <p className="text-sm text-slate-600 max-w-md">
              In accordance with Rifkins Education College academic integrity and examination regulations, candidates are strictly prohibited from printing or exporting examination papers.
            </p>
            <p className="text-xs text-slate-400 mt-4 italic font-medium">
              Rifkins Education College &bull; "Impacting lives since 1953"
            </p>
          </div>
        )}

        {/* Paper Document Container (Standard Times New Roman Academic Paper Presentation) */}
        <div
          className={`p-8 sm:p-14 overflow-y-auto flex-1 font-serif text-[12pt] leading-relaxed text-black bg-white select-text ${
            isStudent ? 'student-print-restricted' : ''
          }`}
        >
          {/* Institutional Header with Logo & Crest */}
          <div className="text-center border-b-2 border-slate-900 pb-5 mb-6 space-y-1">
            <div className="flex justify-center mb-2">
              <img
                src="/rifkins-logo.png"
                alt="Rifkins Education College Crest"
                className="h-16 max-w-[220px] object-contain drop-shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/institution-logo.jpg';
                }}
              />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-black">
              Rifkins Education College
            </h1>
            <p className="text-xs italic tracking-widest text-slate-700 font-sans">
              "Impacting lives since 1953"
            </p>
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900 pt-1">
              {faculty || exam.faculty || 'Faculty of Computing & Information Technologies'}
            </h2>
            <h3 className="text-xs uppercase tracking-wider text-slate-700 font-sans">
              {department || exam.department || 'Academic Department of Examinations & Assessments'}
            </h3>
            <div className="pt-2">
              <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-mono font-bold uppercase tracking-wider border border-slate-300">
                Official University Examination Paper
              </span>
            </div>
          </div>

          {/* Official Examination Metadata Table */}
          <div className="border border-slate-400 rounded-lg p-4 mb-6 bg-slate-50/50 text-sm font-sans grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            <div>
              <span className="text-slate-500 font-medium">Course Code:</span>{' '}
              <strong className="font-mono text-black">{exam.courseCode}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Examination Date:</span>{' '}
              <strong className="text-black">
                {exam.scheduledDate || new Date(exam.scheduledStartTime).toLocaleDateString()}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Course Title:</span>{' '}
              <strong className="text-black">{exam.courseTitle || exam.title}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Time Allowed:</span>{' '}
              <strong className="text-black">
                {exam.durationMinutes} Minutes ({Math.floor(exam.durationMinutes / 60) > 0 ? `${Math.floor(exam.durationMinutes / 60)} Hr ` : ''}{exam.durationMinutes % 60 > 0 ? `${exam.durationMinutes % 60} Mins` : ''})
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Chief Invigilator:</span>{' '}
              <strong className="text-black">{exam.instructorName}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Total Marks Available:</span>{' '}
              {/* Uses the exact marks specified by teacher during examination setting */}
              <strong className="text-black font-mono">
                {totalTeacherMarks} Marks (100%)
              </strong>
            </div>
          </div>

          {/* Candidate Directives & Instructions */}
          <div className="mb-8 p-4 bg-amber-50/50 border-l-4 border-amber-600 rounded-r-lg text-xs font-sans space-y-1.5">
            <div className="font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <span>Instructions to Candidates:</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-slate-800">
              <li>Answer all questions presented in this examination paper.</li>
              <li>
                <strong>Marks allocation:</strong> The marks allocated for each question are indicated in brackets <span className="font-mono font-bold">[ &hellip; Marks ]</span> as specified by the setting examiner.
              </li>
              <li>All candidate answers must be clear, legible, and organized sequentially.</li>
              <li>Communication with unauthorized persons or external materials is strictly prohibited under institutional regulations.</li>
            </ol>
          </div>

          {/* Questions Section with Teacher-Specified Marks Preserved */}
          <div className="space-y-8 mt-6">
            {exam.questions.map((q, idx) => {
              // Strictly use the teacher's specified marks for this question
              const questionMarks = typeof q.points === 'number' && Number.isFinite(q.points) ? q.points : 0;

              return (
                <div key={q.id || idx} className="space-y-3 pb-6 border-b border-slate-200 last:border-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-bold text-base text-black">
                      Question {idx + 1}.
                    </div>
                    {/* Teacher-specified mark right-aligned without alterations */}
                    <div className="font-bold text-sm shrink-0 font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                      [{questionMarks} Marks]
                    </div>
                  </div>

                  <div className="pl-4 space-y-3">
                    <p className="whitespace-pre-wrap text-black leading-relaxed text-justify">
                      {q.prompt}
                    </p>

                    {/* Attached Diagram / Illustration fitted properly below the question */}
                    {q.imageUrl && (
                      <div className="my-3.5 flex flex-col items-center justify-center w-full">
                        <div className="max-w-full overflow-hidden rounded-md border border-slate-300 bg-white p-2 shadow-xs">
                          <img
                            src={q.imageUrl}
                            alt={cleanDisplayCaption(q.imageCaption, q.imageUrl) || `Question ${idx + 1} Figure`}
                            className="max-h-72 max-w-full w-auto object-contain mx-auto rounded block"
                            loading="lazy"
                          />
                        </div>
                        {cleanDisplayCaption(q.imageCaption, q.imageUrl) && (
                          <p className="mt-1 text-xs text-slate-700 italic text-center font-medium">
                            {cleanDisplayCaption(q.imageCaption, q.imageUrl)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Multiple Choice Options if applicable */}
                    {q.options && q.options.length > 0 && (
                      <div className="mt-3 space-y-2 pl-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={opt.id || oIdx} className="flex items-start gap-2.5 text-sm">
                            <span className="font-bold font-mono text-black w-6">
                              ({String.fromCharCode(65 + oIdx)})
                            </span>
                            <span className="text-black">{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sub-questions if specified by teacher with individual sub-marks */}
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="mt-4 space-y-2.5 pl-4 border-l-2 border-slate-200">
                        {q.subQuestions.map((sq, sqIdx) => {
                          const subMarks = typeof sq.points === 'number' && Number.isFinite(sq.points) ? sq.points : null;
                          return (
                            <div key={sq.id || sqIdx} className="text-sm flex items-baseline justify-between gap-3">
                              <div>
                                <span className="font-bold font-mono text-black">
                                  ({String.fromCharCode(97 + sqIdx)})
                                </span>{' '}
                                <span className="text-black">{sq.prompt}</span>
                              </div>
                              {subMarks !== null && (
                                <span className="font-bold font-mono text-xs shrink-0 text-slate-800">
                                  [{subMarks} Marks]
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Academic Footer */}
          <div className="text-center mt-12 pt-6 border-t-2 border-slate-900 font-sans">
            <div className="font-bold uppercase tracking-widest text-xs text-slate-800">
              *** END OF EXAMINATION PAPER ***
            </div>
            <p className="text-[11px] text-slate-500 mt-1 italic">
              Rifkins Education College &bull; Academic Examination Directorate &bull; "Impacting lives since 1953"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
