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
              In accordance with university examination board security protocols, candidate printing and exporting of official marking schemes is strictly restricted.
            </p>
          </div>
        )}

        {/* Times New Roman 12pt Document */}
        <div className={`p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[12pt] leading-relaxed text-black bg-white select-text ${isStudent ? 'student-print-restricted' : ''}`}>
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-center mb-3">
              <img
                src="/institution-logo.jpg"
                alt="Institutional Examination Board Logo"
                className="h-16 max-w-[200px] object-contain"
              />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wide">Institutional Examination Board</h1>
            <h2 className="text-sm font-semibold uppercase tracking-wider mt-0.5">
              {faculty || exam.faculty || 'Faculty of Computing & Information Technologies'}
            </h2>
            <h3 className="text-xs uppercase tracking-wider text-slate-700 mt-0.5">
              Official Marking Scheme & Solution Key
            </h3>
            <p className="text-xs italic mt-1 font-sans">
              Strictly for Internal Examination Evaluation & Candidate Performance Audit
            </p>
          </div>

          <div className="grid grid-cols-2 gap-y-2 text-sm border-b border-slate-300 pb-4 mb-6">
            <div>
              <strong>Course Code:</strong> {exam.courseCode}
            </div>
            <div>
              <strong>Date Released:</strong> {new Date().toLocaleDateString()}
            </div>
            <div>
              <strong>Course Title:</strong> {exam.courseTitle || exam.title}
            </div>
            <div>
              <strong>Lead Examiner:</strong> {exam.instructorName}
            </div>
            <div>
              <strong>Total Marks:</strong> {totalPoints} Marks
            </div>
            <div>
              <strong>Access Level:</strong> {isStudent ? 'Candidate Restricted' : 'Faculty Authorized'}
            </div>
          </div>

          <div className="space-y-8 mt-6">
            {exam.questions.map((q, idx) => (
              <div key={q.id || idx} className="space-y-3 border-b border-slate-200 pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-bold">
                    Question {idx + 1} Solution Guide
                  </div>
                  <div className="font-bold text-sm shrink-0">
                    [Total: {q.points} Marks]
                  </div>
                </div>

                <div className="pl-4 space-y-2 text-sm">
                  <p className="italic text-slate-700">Prompt: {q.prompt}</p>

                  {/* Correct Answers */}
                  {q.correctAnswers && q.correctAnswers.length > 0 && (
                    <div className="bg-emerald-50 p-2.5 rounded-md border border-emerald-300">
                      <strong>Correct Answer Key:</strong>{' '}
                      {q.options
                        ? q.options
                            .filter((opt) => q.correctAnswers?.includes(opt.id))
                            .map((opt) => opt.text)
                            .join(', ')
                        : q.correctAnswers.join(', ')}
                    </div>
                  )}

                  {/* Sample Answer */}
                  {q.sampleAnswer && (
                    <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                      <strong>Sample Solution / Benchmark:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{q.sampleAnswer}</p>
                    </div>
                  )}

                  {/* Marking Rubric */}
                  {q.rubric && (
                    <div className="text-xs text-slate-800 bg-amber-50/60 p-2.5 rounded border border-amber-200">
                      <strong>Marking Criteria & Rubric:</strong> {q.rubric}
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="text-xs text-slate-600">
                      <strong>Pedagogical Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 pt-6 border-t border-slate-300 font-bold uppercase tracking-wider text-xs">
            *** End of Official Marking Scheme ***
          </div>
        </div>
      </div>
    </div>
  );
};
