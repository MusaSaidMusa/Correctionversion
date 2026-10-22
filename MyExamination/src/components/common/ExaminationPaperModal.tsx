import React, { useRef } from 'react';
import { X, Printer, Download, BookOpen, Clock, Calendar, Building2, GraduationCap } from 'lucide-react';
import { Exam } from '../../types';
import { InstitutionLogo } from './InstitutionLogo';
import { splitExamSentences } from '../../services/sentenceFormatter';
import { resolveExamFacultyDepartment } from '../../services/facultyResolutionService';

interface ExaminationPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  userRole?: 'student' | 'teacher' | 'admin';
  canDownload?: boolean;
  faculty?: string;
  department?: string;
}

export const ExaminationPaperModal: React.FC<ExaminationPaperModalProps> = ({
  isOpen,
  onClose,
  exam,
  userRole = 'student',
  canDownload = true,
  faculty,
  department,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !exam) return null;

  const resolved = resolveExamFacultyDepartment(exam);
  const displayFaculty = faculty || resolved.faculty;
  const displayDept = department || resolved.department;

  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
================================================================================
                           RIFKINS COLLEGE
                   UNIVERSITY EXAMINATION DIVISION
                     OFFICIAL QUESTION PAPER
================================================================================
FACULTY: ${displayFaculty}
DEPARTMENT: ${displayDept}
COURSE: ${exam.courseCode} - ${exam.courseTitle || exam.title}
DURATION: ${exam.durationMinutes} Minutes | TOTAL MARKS: ${totalPoints} Points
INSTRUCTOR: ${exam.instructorName}

INSTRUCTIONS TO CANDIDATES:
1. Answer all questions clearly.
2. Academic integrity and invigilation protocols are in effect.
================================================================================

${exam.questions
  .map((q, idx) => {
    return `QUESTION ${idx + 1} [${q.points} MARKS]\n${q.prompt}\n\n`;
  })
  .join('\n')}
================================================================================
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.courseCode}_Examination_Paper.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Official Examination Question Paper
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Paper</span>
            </button>
            {canDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Document */}
        <div className="p-6 sm:p-10 overflow-y-auto font-serif text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 leading-relaxed">
          <div ref={printableRef} className="max-w-3xl mx-auto space-y-6">
            {/* University Letterhead */}
            <div className="text-center border-b-2 border-slate-900 dark:border-slate-100 pb-5">
              <InstitutionLogo size="exam" className="justify-center mb-3" />
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-sans">
                Rifkins College
              </h1>
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                {displayFaculty}
              </h2>
              <h3 className="text-xs uppercase font-medium text-slate-500 font-sans mt-0.5">
                {displayDept}
              </h3>
              <div className="mt-3 inline-block px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-sans text-xs font-bold uppercase tracking-wide">
                Final Summative University Examination
              </div>
            </div>

            {/* Exam Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl font-sans text-xs border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Course Code</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">{exam.courseCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Allocated Time</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{exam.durationMinutes} Minutes</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Marks</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{totalPoints} Points</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Invigilator</span>
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">{exam.instructorName}</span>
              </div>
            </div>

            {/* Examination Instructions */}
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs font-sans">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1">INSTRUCTIONS TO CANDIDATES:</span>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-200/90 text-[11px]">
                <li>Answer all questions in the sequence provided.</li>
                <li>Ensure all working, assumptions, and mathematical derivations are clearly presented.</li>
                <li>Strict electronic invigilation and identity verification are actively monitored.</li>
              </ul>
            </div>

            {/* Questions Section */}
            <div className="space-y-8 pt-4">
              {exam.questions.map((q, idx) => {
                const sentences = splitExamSentences(q.prompt);
                return (
                  <div key={q.id || idx} className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div className="flex items-baseline justify-between gap-4 font-sans">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        QUESTION {idx + 1}
                      </h4>
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-md">
                        [{q.points} MARKS]
                      </span>
                    </div>

                    <div className="text-sm text-slate-800 dark:text-slate-200 space-y-1.5 pl-2">
                      {sentences.map((sentence, sIdx) => (
                        <p key={sIdx} className="leading-relaxed">
                          {sentence}
                        </p>
                      ))}
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="mt-3 pl-4 space-y-1.5 font-sans text-xs">
                        {q.options.map((opt, oIdx) => (
                          <div key={opt.id || oIdx} className="flex items-center gap-2">
                            <span className="font-bold text-slate-500">
                              {String.fromCharCode(65 + oIdx)}.
                            </span>
                            <span>{opt.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* End of paper */}
            <div className="text-center py-6 font-sans text-xs font-bold tracking-widest text-slate-400 uppercase">
              *** END OF EXAMINATION PAPER ***
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
