import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, FileText, Lock } from 'lucide-react';
import { Exam } from '../../types';
import { InstitutionLogo } from './InstitutionLogo';
import { resolveExamFacultyDepartment } from '../../services/facultyResolutionService';

interface OfficialMarkingSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  userRole?: 'student' | 'teacher' | 'admin';
  canDownload?: boolean;
  faculty?: string;
  department?: string;
}

export const OfficialMarkingSchemeModal: React.FC<OfficialMarkingSchemeModalProps> = ({
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

  // Check if student is attempting to view an unreleased scheme
  if (userRole === 'student' && !exam.isMarkingSchemeReleased) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Marking Scheme Restricted</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The official solution scheme for <strong>{exam.courseCode}</strong> has not yet been released by the course invigilator.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    );
  }

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
               OFFICIAL MARKING SCHEME & RUBRIC GUIDELINES
================================================================================
FACULTY: ${displayFaculty}
DEPARTMENT: ${displayDept}
COURSE: ${exam.courseCode} - ${exam.courseTitle || exam.title}
TOTAL MARKS: ${totalPoints} Points | CHIEF EXAMINER: ${exam.instructorName}
STATUS: AUTHORIZED ACADEMIC SOLUTION GUIDE
================================================================================

${exam.questions
  .map((q, idx) => {
    return `QUESTION ${idx + 1} [MAX MARKS: ${q.points}]\nQUESTION: ${q.prompt}\n\nOFFICIAL BENCHMARK SOLUTION & CRITERIA:\n${
      q.sampleAnswer || 'Full marks awarded for rigorous technical accuracy and supported derivations.'
    }\n--------------------------------------------------------------------------------\n`;
  })
  .join('\n')}
================================================================================
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.courseCode}_Official_Marking_Scheme.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Official Marking Scheme & Assessment Rubrics
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Scheme</span>
            </button>
            {canDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
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

        {/* Scheme Body */}
        <div className="p-6 sm:p-10 overflow-y-auto font-serif text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 leading-relaxed">
          <div ref={printableRef} className="max-w-3xl mx-auto space-y-6">
            <div className="text-center border-b-2 border-emerald-600 pb-5">
              <InstitutionLogo size="exam" className="justify-center mb-3" />
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-sans text-slate-900 dark:text-white">
                Rifkins College
              </h1>
              <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                {displayFaculty}
              </h2>
              <div className="mt-3 inline-block px-4 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md font-sans text-xs font-bold uppercase tracking-wide">
                Confidential Official Marking Scheme
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl font-sans text-xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Course</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{exam.courseCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Maximum Score</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{totalPoints} Points</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Release Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {exam.isMarkingSchemeReleased ? 'Authorized for Candidate Review' : 'Internal Invigilator Only'}
                </span>
              </div>
            </div>

            {/* Questions with Solutions */}
            <div className="space-y-8 pt-4">
              {exam.questions.map((q, idx) => (
                <div key={q.id || idx} className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div className="flex items-baseline justify-between gap-4 font-sans">
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      QUESTION {idx + 1}
                    </h4>
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-md">
                      [{q.points} MARKS]
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 italic pl-2">
                    {q.prompt}
                  </p>

                  <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-sans block">
                      Official Marking Scheme & Benchmark Solution:
                    </span>
                    <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed pl-1 font-sans">
                      {q.sampleAnswer || 'Full marks awarded for rigorous analytical explanation supported by principles.'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
