import React from 'react';
import {
  X,
  Download,
  Printer,
  GraduationCap,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { StudentProfile, Exam, ExamSubmission } from '../../types';
import {
  getStudentAcademicSummary,
  downloadProvisionalTranscriptPdf,
} from '../../services/transcriptPdfService';
import { triggerFlash } from '../common/FlashMessage';
import { InstitutionLogo } from '../common/InstitutionLogo';

interface ProvisionalTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  exams: Exam[];
  submissions: ExamSubmission[];
}

export const ProvisionalTranscriptModal: React.FC<ProvisionalTranscriptModalProps> = ({
  isOpen,
  onClose,
  student,
  exams,
  submissions,
}) => {
  if (!isOpen) return null;

  const summary = getStudentAcademicSummary(student, exams, submissions);

  const handleDownloadPdf = async () => {
    const res = await downloadProvisionalTranscriptPdf(student, summary);
    if (res.success) {
      triggerFlash({
        type: 'success',
        text: 'Provisional Transcript Downloaded (PDF)',
        subtext: `Saved ${res.fileName} with ${summary.totalUnits} examined unit(s).`,
      });
    }
  };

  const getGradeBadgeColor = (grade: string) => {
    const g = (grade || '').toUpperCase();
    if (g.startsWith('A')) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (g.startsWith('B')) return 'bg-blue-100 text-blue-900 border-blue-300';
    if (g.startsWith('C')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (g.startsWith('D')) return 'bg-orange-100 text-orange-900 border-orange-300';
    return 'bg-rose-100 text-rose-900 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:max-h-none print:rounded-none">
        {/* Top Action Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#556b2f] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Provisional Academic Transcript
              </h3>
              <p className="text-[11px] text-slate-500">
                {student.name} ({student.studentNumber}) &bull; {summary.totalUnits} Examined Unit(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 rounded-xl bg-[#556b2f] hover:bg-[#445624] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Transcript (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-teal-100 hover:text-teal-900 hover:border-teal-500 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transcript Document Body */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 bg-white text-slate-900 font-serif print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 text-center space-y-2">
            <div className="flex justify-center mb-2">
              <InstitutionLogo
                size="xl"
                variant="icon"
                className="justify-center"
                imgClassName="h-16 sm:h-20 w-auto object-contain mx-auto"
              />
            </div>
            <h1 className="text-xl font-black font-sans uppercase tracking-tight text-slate-900">
              Rifkins Education College
            </h1>
            <p className="text-xs italic text-slate-600">
              &ldquo;Impacting lives since 1953&rdquo; &bull; Office of the Academic Registrar
            </p>
            <p className="text-xs font-sans font-extrabold text-[#556b2f] uppercase tracking-wider">
              Official Provisional Academic Transcript
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-mono text-[11px] text-slate-600">
              <span>
                <strong>Issued:</strong> {new Date().toLocaleDateString()}
              </span>
              <span>
                <strong>Admission No:</strong> {student.studentNumber}
              </span>
              <span>
                <strong>Status:</strong> PROVISIONAL RECORD
              </span>
            </div>
          </div>

          {/* Student Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 p-4 rounded-xl border border-slate-300 bg-slate-50 font-sans text-xs">
            <div>
              <span className="text-slate-500 font-medium">Candidate Name:</span>{' '}
              <strong className="text-slate-900">{student.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Admission / Reg No:</span>{' '}
              <strong className="font-mono text-slate-900">{student.studentNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Faculty:</span>{' '}
              <strong className="text-slate-900">
                {student.faculty || 'Faculty of Computing & Information Technologies'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Department:</span>{' '}
              <strong className="text-slate-900">
                {student.department || 'Computer Science & Software Engineering'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Course (Program):</span>{' '}
              <strong className="text-slate-900">
                {student.programCode ? `${student.programCode} — ` : ''}{student.program || 'B.Sc. Computer Science (Honours)'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Academic Standing:</span>{' '}
              <strong className="text-[#556b2f]">{summary.standing}</strong>
            </div>
          </div>

          {/* Examined Units Table */}
          <div className="space-y-2 font-sans">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#556b2f]" />
              <span>Examined Units &amp; Results Summary ({summary.totalUnits} Units)</span>
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#556b2f] text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Unit Code</th>
                    <th className="py-2.5 px-3">Course Title &amp; Examination Unit</th>
                    <th className="py-2.5 px-3">Date / Period</th>
                    <th className="py-2.5 px-3 text-center">Marks</th>
                    <th className="py-2.5 px-3 text-center">%</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.units.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        No examined units recorded yet. Complete an examination to populate your transcript.
                      </td>
                    </tr>
                  ) : (
                    summary.units.map((u, idx) => (
                      <tr
                        key={`${u.courseCode}-${idx}`}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {u.courseCode}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{u.courseTitle}</div>
                          {u.examTitle && u.examTitle !== u.courseTitle && (
                            <div className="text-[11px] text-slate-600">{u.examTitle}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          <div>{u.dateLabel}</div>
                          <div className="text-[10px] text-slate-400">{u.period}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {u.score}/{u.totalPoints}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          {u.percentage}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] border ${getGradeBadgeColor(
                              u.grade
                            )}`}
                          >
                            {u.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {u.status === 'approved' || u.status === 'modified' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase">
                              <CheckCircle2 className="w-3 h-3" />
                              {u.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase">
                              <Clock className="w-3 h-3" />
                              Provisional
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-xs">
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-teal-700">Units Examined</div>
              <div className="text-lg font-black font-mono text-teal-950 mt-0.5">
                {summary.totalUnits}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-teal-700">Mean Score</div>
              <div className="text-lg font-black font-mono text-teal-950 mt-0.5">
                {summary.averagePercentage}%
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-teal-700">Provisional GPA</div>
              <div className="text-lg font-black font-mono text-teal-950 mt-0.5">
                {summary.gpa}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-teal-700">Total Credits</div>
              <div className="text-lg font-black font-mono text-teal-950 mt-0.5">
                {summary.totalCredits}
              </div>
            </div>
          </div>

          {/* Official Footer */}
          <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-sans text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#556b2f]" />
              <span>
                This provisional transcript includes all examined units recorded for {student.name}.
              </span>
            </div>
            <div className="font-mono text-[10px]">
              Rifkins Education College &bull; Academic Audit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
