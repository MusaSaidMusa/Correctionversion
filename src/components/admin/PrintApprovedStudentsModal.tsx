import React, { useState, useMemo } from 'react';
import { X, Printer, CheckCircle2, Filter, Search } from 'lucide-react';
import { Exam, StudentProfile, ResitRequest } from '../../types';

interface PrintApprovedStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  students: StudentProfile[];
  resitRequests: ResitRequest[];
}

interface ApprovedCandidateEntry {
  id: string;
  studentNumber: string;
  studentName: string;
  department: string;
  courseCode: string;
  examTitle: string;
  approvalType: 'Admin Resit Clearance Approved' | 'Invigilator Room Admitted' | 'Officially Enrolled & Cleared';
  approvalDate: string;
  approvedBy: string;
}

export const PrintApprovedStudentsModal: React.FC<PrintApprovedStudentsModalProps> = ({
  isOpen,
  onClose,
  exams,
  students,
  resitRequests,
}) => {
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all approved candidate entries
  const allApprovedEntries = useMemo(() => {
    const list: ApprovedCandidateEntry[] = [];
    const seenKeys = new Set<string>();

    // 1. Approved Resit Clearances by Super Admin
    resitRequests
      .filter((r) => r.status === 'approved')
      .forEach((r) => {
        const key = `${r.studentId}-${r.courseCode}-resit`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const st = students.find((s) => s.id === r.studentId || s.studentNumber === r.studentNumber);
          list.push({
            id: r.id,
            studentNumber: r.studentNumber,
            studentName: r.studentName,
            department: st?.department || 'Computing & Information Technologies',
            courseCode: r.courseCode,
            examTitle: r.examTitle,
            approvalType: 'Admin Resit Clearance Approved',
            approvalDate: r.reviewedAt || r.submittedAt || new Date().toISOString(),
            approvedBy: r.reviewedBy || 'Dr. Marcus Sterling (Super Admin)',
          });
        }
      });

    // 2. Candidates Admitted to Examination Rooms by Invigilator
    exams.forEach((exam) => {
      const admittedIds = exam.admittedStudentIds || [];
      admittedIds.forEach((sid) => {
        const key = `${sid}-${exam.courseCode}-admitted`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const st = students.find((s) => s.id === sid);
          if (st) {
            list.push({
              id: `${exam.id}-${sid}`,
              studentNumber: st.studentNumber,
              studentName: st.name,
              department: st.department || exam.department || 'Computing & Information Technologies',
              courseCode: exam.courseCode,
              examTitle: exam.courseTitle || exam.title,
              approvalType: 'Invigilator Room Admitted',
              approvalDate: new Date().toISOString(),
              approvedBy: exam.instructorName,
            });
          }
        }
      });
    });

    // 3. Registered & Cleared candidates for scheduled examinations
    exams.forEach((exam) => {
      const registeredIds = exam.registeredStudentIds || [];
      registeredIds.forEach((sid) => {
        const key = `${sid}-${exam.courseCode}-registered`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const st = students.find((s) => s.id === sid);
          if (st && st.accessStatus === 'active') {
            list.push({
              id: `${exam.id}-${sid}-reg`,
              studentNumber: st.studentNumber,
              studentName: st.name,
              department: st.department || exam.department || 'Computing & Information Technologies',
              courseCode: exam.courseCode,
              examTitle: exam.courseTitle || exam.title,
              approvalType: 'Officially Enrolled & Cleared',
              approvalDate: exam.createdAt || new Date().toISOString(),
              approvedBy: 'Directorate Examination Roll',
            });
          }
        }
      });
    });

    return list;
  }, [exams, students, resitRequests]);

  // Extract unique course codes
  const uniqueCourseCodes = useMemo(() => {
    const set = new Set<string>();
    allApprovedEntries.forEach((e) => {
      if (e.courseCode) set.add(e.courseCode);
    });
    return Array.from(set).sort();
  }, [allApprovedEntries]);

  const filteredEntries = useMemo(() => {
    return allApprovedEntries.filter((entry) => {
      if (courseFilter !== 'all' && entry.courseCode !== courseFilter) return false;
      if (typeFilter !== 'all' && entry.approvalType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = entry.studentName.toLowerCase().includes(q);
        const matchesAdm = entry.studentNumber.toLowerCase().includes(q);
        const matchesCourse = entry.courseCode.toLowerCase().includes(q);
        if (!matchesName && !matchesAdm && !matchesCourse) return false;
      }
      return true;
    });
  }, [allApprovedEntries, courseFilter, typeFilter, searchQuery]);

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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Official Roll: Candidates Approved for Examination
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Certified Examination Admission & Invigilation Roll
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

            {/* Filter by Approval Category */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
            >
              <option value="all">All Approval Types</option>
              <option value="Admin Resit Clearance Approved">Admin Resit Clearance Approved</option>
              <option value="Invigilator Room Admitted">Invigilator Room Admitted</option>
              <option value="Officially Enrolled & Cleared">Officially Enrolled & Cleared</option>
            </select>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Approved Roll / Save PDF</span>
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
              Assessment Directorate &bull; Official Examination Admission Roll
            </h2>
            <div className="mt-2 inline-block px-4 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-sans font-bold uppercase tracking-wider">
              Certified Candidate Roll &bull; Authorized &amp; Approved to Sit
            </div>
          </div>

          {/* Roster Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans border border-slate-300 rounded-lg p-3.5 mb-6 bg-slate-50/60">
            <div>
              <span className="text-slate-500 font-medium block">Census Date:</span>
              <strong className="text-black">{currentDate}</strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Course Scope:</span>
              <strong className="text-black font-mono">
                {courseFilter === 'all' ? 'All University Courses' : courseFilter}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Approved Candidates:</span>
              <strong className="text-emerald-700 font-mono font-bold text-sm">
                {filteredEntries.length} Candidates
              </strong>
            </div>
            <div>
              <span className="text-slate-500 font-medium block">Authentication:</span>
              <strong className="text-slate-900 font-medium">Verified by Assessment Directorate</strong>
            </div>
          </div>

          {/* Candidate Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans border-collapse border border-slate-400">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-400">
                  <th className="p-2.5 border-r border-slate-300 text-center w-10">S/N</th>
                  <th className="p-2.5 border-r border-slate-300">Admission No.</th>
                  <th className="p-2.5 border-r border-slate-300">Candidate Full Name</th>
                  <th className="p-2.5 border-r border-slate-300">Department / Faculty</th>
                  <th className="p-2.5 border-r border-slate-300">Approved Course &amp; Title</th>
                  <th className="p-2.5 border-r border-slate-300 text-center">Approval Authority</th>
                  <th className="p-2.5 text-center w-28">Hall Sign-In / Seal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                      No approved examination candidates found for selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="p-2.5 border-r border-slate-300 text-center font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 font-mono font-bold text-slate-900">
                        {entry.studentNumber}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 font-semibold text-slate-900">
                        {entry.studentName}
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-[11px] text-slate-600">
                        {entry.department}
                      </td>
                      <td className="p-2.5 border-r border-slate-300">
                        <span className="font-mono font-bold text-indigo-700 mr-1.5">
                          {entry.courseCode}:
                        </span>
                        <span>{entry.examTitle}</span>
                      </td>
                      <td className="p-2.5 border-r border-slate-300 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.approvalType === 'Admin Resit Clearance Approved'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : entry.approvalType === 'Invigilator Room Admitted'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {entry.approvalType}
                        </span>
                        <div className="text-[9px] text-slate-500 mt-0.5 font-mono">{entry.approvedBy}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="w-24 h-6 border-b border-dashed border-slate-400 mx-auto" />
                      </td>
                    </tr>
                  ))
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
              <div className="text-slate-600">Super Admin &amp; Assessment Directorate Head</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Rifkins Education College &bull; Academic Board</div>
            </div>

            <div>
              <div className="border-b border-black pb-1 mb-1 font-bold">
                Office of the Chief Invigilator
              </div>
              <div className="text-slate-600">Chief Proctor &amp; Assessment Invigilation Officer</div>
              <div className="text-[10px] text-slate-400 font-mono mt-1">Certified Official Seal &bull; Date: {currentDate}</div>
            </div>
          </div>

          <div className="text-center mt-10 pt-4 border-t border-slate-300 text-[10px] font-sans text-slate-500 uppercase tracking-widest">
            *** End of Official Approved Examination Candidate Roll ***
          </div>
        </div>
      </div>
    </div>
  );
};
