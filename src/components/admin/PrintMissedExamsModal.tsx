import React, { useState, useMemo } from 'react';
import { X, Printer, ShieldAlert, Filter, Search } from 'lucide-react';
import { MissedExamRecord, StudentProfile, Exam } from '../../types';

interface PrintMissedExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missedExams: MissedExamRecord[];
  students: StudentProfile[];
  exams: Exam[];
}

export const PrintMissedExamsModal: React.FC<PrintMissedExamsModalProps> = ({
  isOpen,
  onClose,
  missedExams,
  students,
  exams,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'blocked' | 'cleared'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique course codes from missed records
  const uniqueCourseCodes = useMemo(() => {
    const set = new Set<string>();
    missedExams.forEach((m) => {
      if (m.courseCode) set.add(m.courseCode);
    });
    return Array.from(set).sort();
  }, [missedExams]);

  const filteredRecords = useMemo(() => {
    return missedExams.filter((rec) => {
      if (courseFilter !== 'all' && rec.courseCode !== courseFilter) return false;
      const isCleared = !!rec.isCleared || rec.status === 'cleared';
      if (statusFilter === 'blocked' && isCleared) return false;
      if (statusFilter === 'cleared' && !isCleared) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.studentName?.toLowerCase().includes(q);
        const matchesAdm = rec.studentNumber?.toLowerCase().includes(q);
        const matchesTitle = rec.examTitle?.toLowerCase().includes(q);
        if (!matchesName && !matchesAdm && !matchesTitle) return false;
      }
      return true;
    });
  }, [missedExams, courseFilter, statusFilter, searchQuery]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Controls Bar (Excluded when printed) */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Official Roster: Students Who Missed Examination
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Institutional Academic Integrity & Assessment Census
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by course */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
              >
                <option value="all">All Courses ({uniqueCourseCodes.length})</option>
                {uniqueCourseCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by clearance status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="blocked">Clearance Required / Blocked</option>
              <option value="cleared">Admin Cleared</option>
            </select>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official List / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-[11pt] text-black bg-white select-text">
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-center mb-2">
              <img
                src="/rifkins-logo.png"
                alt="Rifkins Education College Logo"
                className="h-16 max-w-[200px] object-contain"
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mt-1">
              Super Admin Assessment Directorate & Examination Registry
            </h2>
            <div className="mt-2 inline-block px-4 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-900 text-xs font-sans font-bold uppercase tracking-wider">
              Official Roster &bull; Candidates Who Missed Examination Sessions
            </div>
          </div>

          {/* Roster Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans border border-slate-300 rounded-lg p-3.5 mb-6 bg-slate-50/60">
            <div>
              <span className="text-slate-500 font-medium block">Report Date:</span>
              <strong className="text-black">{currentDate}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Course Scope:</span>
              <strong className="text-black font-mono">
                {courseFilter === 'all' ? 'All Enrolled Courses' : courseFilter}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Missed Records:</span>
              <strong className="text-rose-700 font-mono font-bold text-sm">
                {filteredRecords.length} Candidates
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Clearance Requirement:</span>
              <strong className="text-amber-800">Admin Resit Approval Required</strong>
            </div>
          </div>

          {/* Institutional Notice Box */}
          <div className="p-3 bg-amber-50/60 border-l-4 border-amber-600 rounded-r-md text-[11px] font-sans mb-6 text-slate-800 leading-relaxed">
            <strong>Institutional Academic Integrity Directive:</strong> In accordance with Rifkins Education College Assessment Regulations, candidates who were previously registered to sit an examination but missed the designated session are strictly restricted from re-registration or room admission unless formally approved by the Super Admin Directorate via the Resit Clearance process.
          </div>

          {/* Table of Candidates Who Missed Examination */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-400">
                  <th className="p-2.5 border-r border-slate-300 text-center w-10">S/N</th>
                  <th className="p-2.5 border-r border-slate-300">Admission No.</th>
                  <th className="p-2.5 border-r border-slate-300">Candidate Full Name</th>
                  <th className="p-2.5 border-r border-slate-300">Course Code & Examination Title</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Missed Session</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Clearance Status</th>
                  <th className="p-2.5 text-center">Admin Clearance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No missed examination records matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const isCleared = !!rec.isCleared || rec.status === 'cleared';
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 font-mono font-bold text-slate-900">
                          {rec.studentNumber}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 font-medium text-slate-900">
                          {rec.studentName}
                        </td>
                        <td className="p-2.5 border-r border-slate-300">
                          <span className="font-mono font-bold text-indigo-700 mr-1.5">
                            {rec.courseCode}:
                          </span>
                          <span>{rec.examTitle}</span>
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono text-[11px]">
                          {rec.scheduledDate ? new Date(rec.scheduledDate).toLocaleDateString() : 'Scheduled Session'}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center">
                          {isCleared ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Cleared by Admin
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Clearance Required (Blocked)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-slate-600">
                          {isCleared ? (
                            <span>{rec.clearedBy || 'Cleared by Super Admin'}</span>
                          ) : (
                            <span className="italic text-rose-700 font-medium">Re-registration Rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Section */}
          <div className="mt-14 pt-8 border-t-2 border-black grid grid-cols-2 gap-12 font-sans text-xs">
            <div>
              <div className="border-b border-black pb-1 mb-1 font-bold">
                Dr. Marcus Sterling
              </div>
              <div className="text-slate-600">Director, Institutional Assessment &amp; Super Admin</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Rifkins Education College &bull; Academic Directorate</div>
            </div>

            <div>
              <div className="border-b border-black pb-1 mb-1 font-bold">
                Office of the Academic Registrar
              </div>
              <div className="text-slate-600">Controller of Examinations &amp; Candidate Enrollment</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Certified Official Seal &bull; Date: {currentDate}</div>
            </div>
          </div>

          <div className="text-center mt-10 pt-4 border-t border-slate-300 text-[10px] font-sans text-slate-500 uppercase tracking-widest">
            *** End of Official Missed Examinations Roster ***
          </div>
        </div>
      </div>
    </div>
  );
};
