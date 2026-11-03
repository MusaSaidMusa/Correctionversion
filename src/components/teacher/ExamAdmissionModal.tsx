import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  UserCheck,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  Loader2,
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
  const [admittingMap, setAdmittingMap] = useState<Record<string, boolean>>({});
  const [isAdmittingAll, setIsAdmittingAll] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshState = () => {
    const exams = getStoredExams();
    const found = exams.find((e) => e.id === exam.id);
    if (found) setCurrentExam(found);
    setWaitingStudentIds(getWaitingRoomStudents(exam.id));
  };

  const debouncedRefresh = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      refreshState();
    }, 60);
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshState();

    const handleEvent = () => debouncedRefresh();
    window.addEventListener('examguard_waiting_room_updated', handleEvent);
    window.addEventListener('examguard_admission_updated', handleEvent);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      window.removeEventListener('examguard_waiting_room_updated', handleEvent);
      window.removeEventListener('examguard_admission_updated', handleEvent);
    };
  }, [exam.id, isOpen]);

  if (!isOpen) return null;

  const admittedIds = currentExam.admittedStudentIds || [];
  const registeredIds = currentExam.registeredStudentIds || [];

  const handleAdmitOne = (studentId: string) => {
    // Set admitting lock to avoid button jitter
    setAdmittingMap((prev) => ({ ...prev, [studentId]: true }));

    // Optimistically update currentExam admittedStudentIds for zero-latency UI stability
    setCurrentExam((prev) => ({
      ...prev,
      admittedStudentIds: Array.from(new Set([...(prev.admittedStudentIds || []), studentId])),
    }));
    setWaitingStudentIds((prev) => prev.filter((id) => id !== studentId));

    try {
      const res = admitStudentToExamWithValidation(exam.id, studentId);
      if (res.success) {
        onAdmissionsUpdated();
      }
    } finally {
      setTimeout(() => {
        setAdmittingMap((prev) => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
        refreshState();
      }, 150);
    }
  };

  const handleRevokeOne = (studentId: string) => {
    // Optimistically revoke
    setCurrentExam((prev) => ({
      ...prev,
      admittedStudentIds: (prev.admittedStudentIds || []).filter((id) => id !== studentId),
    }));

    revokeStudentAdmission(exam.id, studentId);
    onAdmissionsUpdated();
    setTimeout(() => refreshState(), 100);
  };

  const handleAdmitAll = () => {
    setIsAdmittingAll(true);
    try {
      const res = admitAllStudentsToExam(exam.id);
      if (res.success) {
        refreshState();
        onAdmissionsUpdated();
      }
    } finally {
      setTimeout(() => setIsAdmittingAll(false), 200);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
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
          {/* Waiting Room Real-Time Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {waitingStudentIds.length} Candidate(s) in Virtual Waiting Room
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Total Admitted: <strong className="text-emerald-600 dark:text-emerald-400">{admittedIds.length}</strong> of {registeredIds.length || students.length}
                </div>
              </div>
            </div>

            <button
              onClick={handleAdmitAll}
              disabled={isAdmittingAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60 whitespace-nowrap"
            >
              {isAdmittingAll ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Admitting Candidates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Admit Cleared Candidates</span>
                </>
              )}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate by name or registration number..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Candidates List with Stable Non-Flickering Buttons */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {filteredStudents.map((st) => {
              const isAdmitted = admittedIds.includes(st.id);
              const isWaiting = waitingStudentIds.includes(st.id);
              const isAdmitting = Boolean(admittingMap[st.id]);
              const isEnrolledInCourse =
                st.enrolledCourseCodes?.includes(exam.courseCode) ||
                currentExam.registeredStudentIds?.includes(st.id) ||
                exam.courseCode === 'ALL';
              const missedCheck = hasUnapprovedMissedExam(st.id, exam.courseCode, exam.title);

              return (
                <div
                  key={st.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={st.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-1.5 truncate">
                        <span className="truncate">{st.name}</span>
                        {isWaiting && !isAdmitted && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold border border-amber-300 dark:border-amber-700 shrink-0">
                            Waiting Room
                          </span>
                        )}
                        {isAdmitted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700 shrink-0">
                            Admitted ✓
                          </span>
                        )}
                        {!isEnrolledInCourse && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold shrink-0">
                            Not Enrolled
                          </span>
                        )}
                        {missedCheck.isBlocked && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold shrink-0">
                            Admin Clearance Required
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ADM NO: {st.studentNumber} &bull; {st.department || 'Computing'}
                      </div>
                    </div>
                  </div>

                  {/* Stable Action Button Controls */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isAdmitted ? (
                      <button
                        type="button"
                        onClick={() => handleRevokeOne(st.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                        title="Revoke room admission"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Revoke</span>
                      </button>
                    ) : !isEnrolledInCourse ? (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                        Unregistered
                      </span>
                    ) : missedCheck.isBlocked ? (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                        Clearance Required
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdmitting}
                        onClick={() => handleAdmitOne(st.id)}
                        className={`min-w-[125px] px-3.5 py-1.5 rounded-lg font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs transition-colors ${
                          isAdmitting
                            ? 'bg-emerald-700 text-white opacity-80 cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isAdmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Admitting...</span>
                          </>
                        ) : isWaiting ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Admit Candidate ⚡</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Admit to Room</span>
                          </>
                        )}
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
