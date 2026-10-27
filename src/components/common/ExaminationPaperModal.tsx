import React from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Exam } from '../../types';

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
  canDownload = true,
  faculty,
  department,
}) => {
  if (!isOpen) return null;

  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Action Header (Excluded when printed) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-800">
              Official Examination Paper — {exam.courseCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canDownload && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Document Container (Standard Times New Roman 12pt Academic Styling) */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[12pt] leading-relaxed text-black bg-white select-text">
          {/* Official University Header with Uploaded Institutional Logo */}
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
              {faculty || exam.faculty || 'Faculty of Computing & Information Technologies'}
            </h2>
            <h3 className="text-xs uppercase tracking-wider text-slate-700 mt-0.5">
              {department || exam.department || 'Academic Department of Examinations'}
            </h3>
            <p className="text-xs italic mt-1 font-sans">
              Semester Academic Assessment Examination Paper
            </p>
          </div>

          {/* Exam Details Grid */}
          <div className="grid grid-cols-2 gap-y-2 text-sm border-b border-slate-300 pb-4 mb-6">
            <div>
              <strong>Course Code:</strong> {exam.courseCode}
            </div>
            <div>
              <strong>Date:</strong> {exam.scheduledDate || new Date(exam.scheduledStartTime).toLocaleDateString()}
            </div>
            <div>
              <strong>Course Title:</strong> {exam.courseTitle || exam.title}
            </div>
            <div>
              <strong>Time Allowed:</strong> {exam.durationMinutes} Minutes
            </div>
            <div>
              <strong>Chief Examiner:</strong> {exam.instructorName}
            </div>
            <div>
              <strong>Total Marks Available:</strong> {totalPoints} Marks
            </div>
          </div>

          {/* Instructions to Candidates */}
          <div className="mb-6 bg-slate-50 p-4 border border-slate-300 text-xs font-sans">
            <strong className="block text-sm uppercase tracking-wide mb-1.5">Instructions to Candidates:</strong>
            <ul className="list-disc pl-5 space-y-1 text-slate-800">
              <li>Answer all questions in this examination paper.</li>
              <li>Marks allocated for each question are indicated in brackets [ ] at the right margin.</li>
              <li>Calculators and electronic communication devices are subject to proctored surveillance guidelines.</li>
              <li>Ensure all submitted responses are written clearly and numbered sequentially.</li>
            </ul>
          </div>

          {/* Questions Section */}
          <div className="space-y-8 mt-6">
            {exam.questions.map((q, idx) => (
              <div key={q.id || idx} className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="font-bold">
                    Question {idx + 1}.
                  </div>
                  <div className="font-bold text-sm shrink-0">
                    [{q.points} Marks]
                  </div>
                </div>

                <div className="pl-4">
                  <p className="whitespace-pre-wrap">{q.prompt}</p>

                  {/* Multiple Choice Options if applicable */}
                  {q.options && q.options.length > 0 && (
                    <div className="mt-3 space-y-1.5 pl-4">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id || oIdx} className="flex items-start gap-2 text-sm">
                          <span className="font-semibold">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sub-questions if applicable */}
                  {q.subQuestions && q.subQuestions.length > 0 && (
                    <div className="mt-3 space-y-2 pl-4">
                      {q.subQuestions.map((sq, sqIdx) => (
                        <div key={sq.id || sqIdx} className="text-sm">
                          <span className="font-semibold">({String.fromCharCode(97 + sqIdx)})</span>{' '}
                          {sq.prompt}{' '}
                          {sq.points && <span className="font-bold">[{sq.points} Marks]</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* End of Examination Footer */}
          <div className="text-center mt-12 pt-6 border-t border-slate-300 font-bold uppercase tracking-wider text-xs">
            *** End of Examination Paper ***
          </div>
        </div>
      </div>
    </div>
  );
};
