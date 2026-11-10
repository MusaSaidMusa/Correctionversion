import React, { useState, useMemo } from 'react';
import { X, Printer, AlertTriangle, Filter, Search, CheckCircle2, Clock } from 'lucide-react';
import { FailedStudentRecord, Exam } from '../../types';

interface PrintFailedStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedStudents: FailedStudentRecord[];
  exams: Exam[];
}

export const PrintFailedStudentsModal: React.FC<PrintFailedStudentsModalProps> = ({
  isOpen,
  onClose,
  failedStudents,
  exams,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [resitStatusFilter, setResitStatusFilter] = useState<'all' | 'approved' | 'pending' | 'not_applied'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique course codes from failed records
  const uniqueCourseCodes = useMemo(() => {
    const set = new Set<string>();
    failedStudents.forEach((f) => {
      if (f.courseCode) set.add(f.courseCode);
    });
    return Array.from(set).sort();
  }, [failedStudents]);

  // Extract unique faculties / departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    failedStudents.forEach((f) => {
      if (f.department) set.add(f.department);
    });
    return Array.from(set).sort();
  }, [failedStudents]);

  const filteredRecords = useMemo(() => {
    return failedStudents.filter((rec) => {
      if (courseFilter !== 'all' && rec.courseCode !== courseFilter) return false;
      if (resitStatusFilter !== 'all' && rec.resitStatus !== resitStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.studentName?.toLowerCase().includes(q);
        const matchesAdm = rec.studentNumber?.toLowerCase().includes(q);
        const matchesUnit = rec.unitName?.toLowerCase().includes(q);
        const matchesCode = rec.courseCode?.toLowerCase().includes(q);
        if (!matchesName && !matchesAdm && !matchesUnit && !matchesCode) return false;
      }
      return true;
    });
  }, [failedStudents, courseFilter, resitStatusFilter, searchQuery]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const approvedResitsCount = filteredRecords.filter((r) => r.resitStatus === 'approved').length;
  const pendingResitsCount = filteredRecords.filter((r) => r.resitStatus === 'pending').length;
  const notAppliedCount = filteredRecords.filter((r) => r.resitStatus === 'not_applied').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Controls Bar (Excluded when printed) */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Official Roster: Candidates Below Passing Marks Threshold
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Institutional Directorate of Academic Standards &amp; Resit Registry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by unit / course */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
              >
                <option value="all">All Units ({uniqueCourseCodes.length})</option>
                {uniqueCourseCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Resit Status */}
            <select
              value={resitStatusFilter}
              onChange={(e) => setResitStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
            >
              <option value="all">All Resit Statuses</option>
              <option value="approved">Resit Cleared &amp; Approved</option>
              <option value="pending">Resit Pending Admin Verification</option>
              <option value="not_applied">Not Yet Applied</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, admission #..."
                className="pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs w-44"
              />
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
              Super Admin Assessment Directorate &amp; Examination Resit Registry
            </h2>
            <div className="mt-2 inline-block px-4 py-1 rounded-full bg-rose-50 border border-rose-300 text-rose-900 text-xs font-sans font-bold uppercase tracking-wider">
              Official Roster &bull; Candidates Below Passing Marks Threshold on Examination Units
            </div>
          </div>

          {/* Roster Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans border border-slate-300 rounded-lg p-3.5 mb-6 bg-slate-50/60">
            <div>
              <span className="text-slate-500 font-medium block">Report Date:</span>
              <strong className="text-black">{currentDate}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Units Scope:</span>
              <strong className="text-black font-mono">
                {courseFilter === 'all' ? `All Examination Units (${uniqueCourseCodes.length})` : courseFilter}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Total Below Threshold:</span>
              <strong className="text-rose-700 font-mono font-bold text-sm">
                {filteredRecords.length} Candidates
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Resit Governance:</span>
              <strong className="text-amber-800">
                {approvedResitsCount} Approved &bull; {pendingResitsCount} Pending
              </strong>
            </div>
          </div>

          {/* Institutional Directive Box */}
          <div className="p-3 bg-rose-50/60 border-l-4 border-rose-600 rounded-r-md text-[11px] font-sans mb-6 text-slate-800 leading-relaxed">
            <strong>Institutional Academic Integrity &amp; Resit Regulation:</strong> In case a student fails to attain the official passing marks threshold (benchmark 50%), they must submit an official Resit Clearance application explicitly stating their grounds and reasons for failure. All candidate applications undergo rigorous administrative verification and Super Admin Directorate approval prior to re-registration or examination room admission.
          </div>

          {/* Table of Candidates Below Threshold across Different Units */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-400">
                  <th className="p-2.5 border-r border-slate-300 text-center w-10">S/N</th>
                  <th className="p-2.5 border-r border-slate-300">Admission No.</th>
                  <th className="p-2.5 border-r border-slate-300">Candidate Full Name</th>
                  <th className="p-2.5 border-r border-slate-300">Unit Code &amp; Title</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Score / Total</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Score %</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Pass %</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Deficit</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Resit Status</th>
                  <th className="p-2.5">Stated Reason for Failure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 italic">
                      No candidates below passing threshold found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec, idx) => {
                    const isApproved = rec.resitStatus === 'approved';
                    const isPending = rec.resitStatus === 'pending';
                    const failureReason =
                      rec.resitRequest?.reasonDetails ||
                      rec.resitRequest?.explanation ||
                      'Awaiting candidate resit application';

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
                          <span>{rec.unitName}</span>
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono">
                          {rec.score} / {rec.totalPoints}
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold text-rose-700">
                          {rec.percentage}%
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono text-slate-600">
                          {rec.passingScorePercentage}%
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold text-rose-700">
                          -{rec.deficitPercentage}%
                        </td>
                        <td className="p-2.5 border-r border-slate-300 text-center">
                          {isApproved ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✓ Resit Cleared
                            </span>
                          ) : isPending ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              ⏳ Pending Admin
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Not Yet Applied
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-700 max-w-[260px]">
                          <p className="line-clamp-2 italic">
                            "{failureReason}"
                          </p>
                          {rec.resitRequest?.reviewedBy && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Reviewed by: {rec.resitRequest.reviewedBy}
                            </span>
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
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Rifkins Education College &bull; Academic Assessment Directorate
              </div>
            </div>

            <div>
              <div className="border-b border-black pb-1 mb-1 font-bold">
                Office of the Academic Registrar
              </div>
              <div className="text-slate-600">Controller of Examinations &amp; Marks Audit Directorate</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">
                Certified Official Seal &bull; Date: {currentDate}
              </div>
            </div>
          </div>

          <div className="text-center mt-10 pt-4 border-t border-slate-300 text-[10px] font-sans text-slate-500 uppercase tracking-widest">
            *** End of Official Below Passing Threshold Roster ***
          </div>
        </div>
      </div>
    </div>
  );
};
