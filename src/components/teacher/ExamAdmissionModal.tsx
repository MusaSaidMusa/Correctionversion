import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Exam, StudentProfile, ExamSubmission } from '../../types';
import {
  admitStudentToExamWithValidation,
  admitAllStudentsToExam,
  revokeStudentAdmission,
  getWaitingRoomStudents,
  getStoredExams,
  hasUnapprovedMissedExam,
} from '../../services/storageService';

interface ExamAdmissionModalProps {
  exam: Exam;
  isOpen: boolean;
  students: StudentProfile[];
  submissions: ExamSubmission[];
  onClose: () => void;
  onAdmissionsUpdated: () => void;
}

export const ExamAdmissionModal: React.FC<ExamAdmissionModalProps> = ({
  exam,
  isOpen,
  students,
  onClose,
  onAdmissionsUpdated,
}) => {
  const [currentExam, setCurrentExam] = useState<Exam>(exam);
  const [waitingStudentIds, setWaitingStudentIds] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [actionAlert, setActionAlert] = useState<{ text: string; isError?: boolean } | null>(null);

  const refreshState = () => {
    const exams = getStoredExams();
    const found = exams.find((e) => e.id === exam.id);
    if (found) setCurrentExam(found);
    setWaitingStudentIds(getWaitingRoomStudents(exam.id));
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshState();

    const handleWaitingRoomUpdate = () => refreshState();
    window.addEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
    window.addEventListener('examguard_admission_updated', handleWaitingRoomUpdate);

    return () => {
      window.removeEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
      window.removeEventListener('examguard_admission_updated', handleWaitingRoomUpdate);
    };
  }, [exam.id, isOpen]);

  if (!isOpen) return null;

  const admittedIds = currentExam.admittedStudentIds || [];
  const registeredIds = currentExam.registeredStudentIds || [];

  const handleAdmitOne = (studentId: string) => {
    const res = admitStudentToExamWithValidation(exam.id, studentId);
    if (!res.success) {
      setActionAlert({ text: res.error || 'Failed to admit candidate.', isError: true });
      return;
    }
    setActionAlert({ text: 'Candidate successfully admitted into examination room.', isError: false });
    refreshState();
    onAdmissionsUpdated();
  };

  const handleRevokeOne = (studentId: string) => {
    revokeStudentAdmission(exam.id, studentId);
    setActionAlert({ text: 'Candidate admission revoked.', isError: false });
    refreshState();
    onAdmissionsUpdated();
  };

  const handleAdmitAll = () => {
    const res = admitAllStudentsToExam(exam.id);
    if (res.rejectedCount > 0) {
      setActionAlert({
        text: `Admitted ${res.admittedCount} registered & cleared candidate(s). Skipped ${res.rejectedCount} unregistered or uncleared candidate(s).`,
        isError: false,
      });
    } else {
      setActionAlert({ text: `Admitted ${res.admittedCount} candidate(s).`, isError: false });
    }
    refreshState();
    onAdmissionsUpdated();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Exam Room Admission Control</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentExam.courseCode} — {currentExam.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Action Alert Banner */}
          {actionAlert && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                actionAlert.isError
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}
            >
              <span>{actionAlert.text}</span>
              <button
                type="button"
                onClick={() => setActionAlert(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Waiting Room Real-Time Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <div className="font-bold text-sm">
                  {waitingStudentIds.length} Candidate(s) in Virtual Waiting Room
                </div>
                <div className="text-slate-500 mt-0.5">
                  Total Admitted: {admittedIds.length} of {registeredIds.length || students.length}
                </div>
              </div>
            </div>

            <button
              onClick={handleAdmitAll}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Admit Cleared Candidates</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate by name or registration number..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Candidates List with Course Registration & Missed Clearance Enforced */}
          <div className="border rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {filteredStudents.map((st) => {
              const isAdmitted = admittedIds.includes(st.id);
              const isWaiting = waitingStudentIds.includes(st.id);
              const isEnrolledInCourse =
                st.enrolledCourseCodes?.includes(exam.courseCode) ||
                currentExam.registeredStudentIds?.includes(st.id) ||
                exam.courseCode === 'ALL';
              const missedCheck = hasUnapprovedMissedExam(st.id, exam.courseCode, exam.title);

              return (
                <div
                  key={st.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={st.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                        <span>{st.name}</span>
                        {isWaiting && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                            Waiting Room
                          </span>
                        )}
                        {!isEnrolledInCourse && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                            Not Registered for Course
                          </span>
                        )}
                        {missedCheck.isBlocked && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                            Requires Admin Resit Clearance
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Reg: {st.studentNumber} &bull; {st.department || 'Computing'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAdmitted ? (
                      <button
                        type="button"
                        onClick={() => handleRevokeOne(st.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Revoke Admission</span>
                      </button>
                    ) : !isEnrolledInCourse ? (
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded border border-rose-200 dark:border-rose-800">
                        Unregistered (Admission Blocked)
                      </span>
                    ) : missedCheck.isBlocked ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800">
                        Clearance Required
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdmitOne(st.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer flex items-center gap-1 shadow-xs transition-all ${
                          isWaiting
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse ring-2 ring-emerald-400'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isWaiting ? 'Admit Waiting Candidate ⚡' : 'Admit to Exam'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
