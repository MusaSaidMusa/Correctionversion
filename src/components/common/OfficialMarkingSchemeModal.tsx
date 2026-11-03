import React, { useEffect } from 'react';
import { X, Printer, CheckCircle2, Award, Lock, ShieldAlert } from 'lucide-react';
import { Exam } from '../../types';

interface OfficialMarkingSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  userRole?: string;
  canDownload?: boolean;
  faculty?: string;
  department?: string;
}

export const OfficialMarkingSchemeModal: React.FC<OfficialMarkingSchemeModalProps> = ({
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
  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

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
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">
              Official Marking Scheme & Grading Guide — {exam.courseCode}: {exam.courseTitle || exam.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isStudent && canDownload ? (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Candidate View (Print Prohibited)</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
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
              In accordance with Rifkins Education College examination security protocols, candidate printing and exporting of official marking schemes is strictly restricted.
            </p>
            <p className="text-xs text-slate-400 mt-4 italic font-medium">
              Rifkins Education College &bull; "Impacting lives since 1953"
            </p>
          </div>
        )}

        {/* Times New Roman 12pt Document */}
        <div className={`p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[12pt] leading-relaxed text-black bg-white select-text ${isStudent ? 'student-print-restricted' : ''}`}>
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/institution-logo.jpg"
                alt="Rifkins Education College Logo"
                className="h-16 max-w-[200px] object-contain"
              />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wide">Rifkins Education College</h1>
            <p className="text-xs italic tracking-wide text-slate-700">"Impacting lives since 1953"</p>
            <h2 className="text-sm font-semibold uppercase tracking-wider mt-1">
              {faculty || exam.faculty || 'Faculty of Computing & Information Technologies'}
            </h2>
            <h3 className="text-xs uppercase tracking-wider text-slate-700 mt-0.5">
              Official Marking Scheme & Solution Key
            </h3>
            <p className="text-xs italic mt-1 font-sans text-slate-600">
              Strictly for Internal Examination Evaluation & Candidate Performance Audit
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-b-2 border-black pb-4 mb-6">
            <div>
              <strong>Examination Title:</strong> {exam.title}
            </div>
            <div>
              <strong>Course Code:</strong> <span className="font-mono font-bold">{exam.courseCode}</span>
            </div>
            <div>
              <strong>Course Title:</strong> {exam.courseTitle || exam.title}
            </div>
            <div>
              <strong>Academic Faculty:</strong> {faculty || exam.faculty || 'Faculty of Computing & Information Technologies'}
            </div>
            <div>
              <strong>Department:</strong> {department || exam.department || 'Computer Science & Software Engineering'}
            </div>
            <div>
              <strong>Date Released:</strong> {new Date().toLocaleDateString()}
            </div>
            <div>
              <strong>Lead Examiner:</strong> {exam.instructorName}
            </div>
            <div>
              <strong>Total Marks Available:</strong> <span className="font-bold">{totalPoints} Marks (100%)</span>
            </div>
            <div>
              <strong>Access Classification:</strong> {isStudent ? 'Candidate Evaluation Copy' : 'Authorized Faculty Marking Guide'}
            </div>
            <div>
              <strong>Examination Session:</strong> {exam.scheduledDate || new Date(exam.scheduledStartTime).toLocaleDateString()}
            </div>
          </div>

          {/* Clean Line-by-Line Marking Scheme Points */}
          <div className="space-y-6 mt-6">
            {exam.questions.map((q, idx) => {
              // Parse solution points line by line as specified by the teacher
              const rawSolutionText = q.sampleAnswer || '';
              const rawLines = rawSolutionText
                ? rawSolutionText
                    .split(/\r?\n/)
                    .map((l) => l.trim())
                    .filter(Boolean)
                : [];

              return (
                <div key={q.id || idx} className="border-b border-black/30 pb-5 last:border-0 space-y-3">
                  <div className="flex items-baseline justify-between gap-4 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <span className="font-bold text-base">
                      Question {idx + 1}
                    </span>
                    <span className="font-bold text-sm font-mono shrink-0">
                      Total Allocated: [{q.points} Marks]
                    </span>
                  </div>

                  <div className="pl-2 space-y-2 text-sm">
                    <p className="font-semibold text-slate-900 leading-snug">
                      {q.prompt}
                    </p>

                    {/* Multiple Choice / Single Choice Direct Key */}
                    {q.correctAnswers && q.correctAnswers.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                          Official Key & Award:
                        </span>
                        <div className="pl-3 border-l-2 border-emerald-600 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-emerald-800">
                              &bull; Correct Selection:{' '}
                              {q.options
                                ? q.options
                                    .filter((opt) => q.correctAnswers?.includes(opt.id))
                                    .map((opt) => `${opt.id.toUpperCase()}: ${opt.text}`)
                                    .join('; ')
                                : q.correctAnswers.join(', ')}
                            </span>
                            <span className="font-mono font-bold text-slate-900">
                              [{q.points} Marks]
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sub-questions line by line breakdown */}
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                          Sub-Question Marking Criteria:
                        </span>
                        <div className="space-y-1.5 pl-3 border-l-2 border-slate-400">
                          {q.subQuestions.map((sq, sqIdx) => {
                            const hasExplicitSubMarks = typeof sq.points === 'number' && Number.isFinite(sq.points);
                            return (
                              <div key={sq.id || sqIdx} className="flex items-start justify-between gap-3 text-xs">
                                <span className="leading-relaxed">
                                  &bull; ({String.fromCharCode(97 + sqIdx)}) {sq.prompt}
                                  {sq.sampleAnswer && (
                                    <span className="block italic text-slate-700 mt-0.5">
                                      Key: {sq.sampleAnswer}
                                    </span>
                                  )}
                                </span>
                                {hasExplicitSubMarks && (
                                  <span className="font-mono font-bold shrink-0 text-slate-900">
                                    [{sq.points} Marks]
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Official marking scheme criteria without automatic marks distribution */}
                    {rawLines.length > 0 && (!q.subQuestions || q.subQuestions.length === 0) && (
                      <div className="space-y-1.5 pt-1">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-700 block">
                          Official Marking Scheme Criteria & Solution:
                        </span>
                        <div className="space-y-1 pl-3 border-l-2 border-slate-700">
                          {rawLines.map((line, lIdx) => {
                            const cleanLine = line.replace(/^[•\-\*\d\.\)\s]+/, '');
                            // Check if teacher explicitly wrote marks in this line (e.g. "[3 marks]", "(2 marks)", "(4 Marks)")
                            const teacherMarkMatch = line.match(/(?:\[|\()(\d+(?:\.\d+)?)\s*(?:marks?|pts?|points?)(?:\]|\))/i);

                            return (
                              <div
                                key={lIdx}
                                className="flex items-start justify-between gap-4 text-xs leading-relaxed py-0.5"
                              >
                                <span>&bull; {cleanLine}</span>
                                {teacherMarkMatch && (
                                  <span className="font-mono font-semibold shrink-0 text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                    [{teacherMarkMatch[1]} Marks]
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12 pt-6 border-t-2 border-black font-bold uppercase tracking-wider text-xs">
            *** End of Official Marking Scheme ***
          </div>
        </div>
      </div>
    </div>
  );
};
