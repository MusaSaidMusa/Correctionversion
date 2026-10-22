import React, { useState, useEffect } from 'react';
import {
  X,
  DoorOpen,
  CheckCircle2,
  Clock,
  Key,
  Copy,
  Check,
  UserCheck,
  Users,
  ShieldCheck,
  AlertCircle,
  Search,
} from 'lucide-react';
import { Exam, StudentProfile, ExamSubmission } from '../../types';
import {
  admitStudentToExam,
  admitAllStudentsToExam,
  revokeStudentAdmission,
  getWaitingRoomStudents,
  getStoredExams,
  registerStudentToWaitingRoom,
  removeStudentFromWaitingRoom,
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
  submissions,
  onClose,
  onAdmissionsUpdated,
}) => {
  const [admittedIds, setAdmittedIds] = useState<string[]>(exam.admittedStudentIds || []);
  const [waitingIds, setWaitingIds] = useState<string[]>([]);
  const [waitingCandidates, setWaitingCandidates] = useState<
    { studentId: string; studentName: string; studentNumber: string }[]
  >([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [filter, setFilter] = useState<'all' | 'waiting' | 'admitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [admittingStudentId, setAdmittingStudentId] = useState<string | null>(null);
  const [isAdmittingAll, setIsAdmittingAll] = useState(false);
  const [admissionError, setAdmissionError] = useState<string | null>(null);
  const [backendExam, setBackendExam] = useState<{
    faculty?: string;
    facultyCode?: string;
    location?: string;
    roomNumber?: string;
  } | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const syncAdmissionsAndWaiting = () => {
    const freshExams = getStoredExams();
    const currentExam = freshExams.find((e) => e.id === exam.id) || exam;
    const localAdmitted = currentExam.admittedStudentIds || [];
    const localWaiting = getWaitingRoomStudents(exam.id);

    setAdmittedIds(localAdmitted);
    setWaitingIds(localWaiting);

    // Sync with real-time backend waiting room endpoint
    fetch(`/api/exams/${encodeURIComponent(exam.id)}/waiting-room`)
      .then((res) => {
        if (!res.ok) throw new Error(`Waiting-room sync failed (${res.status}).`);
        return res.json();
      })
      .then((json) => {
        if (json?.success && json?.data) {
          const candidates = (json.data.candidateRecords || json.data.waitingCandidates || []) as {
            studentId: string;
            studentName: string;
            studentNumber: string;
          }[];
          const backendWaiting = (json.data.waitingCandidates || []).map(
            (candidate: { studentId: string }) => candidate.studentId
          );
          const backendAdmitted = json.data.admittedStudentIds || [];

          const mergedWaiting = Array.from(new Set([...localWaiting, ...backendWaiting]));
          const mergedAdmitted = Array.from(new Set([...localAdmitted, ...backendAdmitted]));

          setWaitingIds(mergedWaiting);
          setAdmittedIds(mergedAdmitted);
          setWaitingCandidates(candidates);

          // Ensure local storage has these waiting students
          backendWaiting.forEach((sId: string) => registerStudentToWaitingRoom(exam.id, sId));
        }
      })
      .catch((err: unknown) => {
        setAdmissionError(err instanceof Error ? err.message : 'Waiting-room sync failed.');
      });
  };

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const examUrl = `/api/exams/${encodeURIComponent(exam.id)}`;
    fetch(examUrl)
      .then(async (res) => {
        if (res.status === 404) {
          const createRes = await fetch(examUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(exam),
          });
          if (!createRes.ok) throw new Error(`Exam details sync failed (${createRes.status}).`);
          return createRes.json();
        }
        if (!res.ok) throw new Error(`Exam details fetch failed (${res.status}).`);
        return res.json();
      })
      .then((json) => {
        if (!json?.success || !json?.data) throw new Error('The backend returned invalid exam details.');
        if (active) {
          setBackendExam(json.data);
          setMetadataError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) setMetadataError(err instanceof Error ? err.message : 'Exam details sync failed.');
      });

    syncAdmissionsAndWaiting();

    const handleWaitingRoomUpdate = () => syncAdmissionsAndWaiting();
    const handleAdmissionUpdate = () => syncAdmissionsAndWaiting();
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'examguard_exams_v1' || e.key === 'examguard_waiting_room_v1') {
        syncAdmissionsAndWaiting();
      }
    };

    window.addEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
    window.addEventListener('examguard_admission_updated', handleAdmissionUpdate);
    window.addEventListener('examguard_admissions_updated', handleAdmissionUpdate);
    window.addEventListener('examguard_submissions_updated', () => {
      syncAdmissionsAndWaiting();
      onAdmissionsUpdated();
    });
    window.addEventListener('storage', handleStorageUpdate);
    const interval = setInterval(syncAdmissionsAndWaiting, 1200);

    return () => {
      active = false;
      window.removeEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
      window.removeEventListener('examguard_admission_updated', handleAdmissionUpdate);
      window.removeEventListener('examguard_admissions_updated', handleAdmissionUpdate);
      window.removeEventListener('examguard_submissions_updated', syncAdmissionsAndWaiting);
      window.removeEventListener('storage', handleStorageUpdate);
      clearInterval(interval);
    };
  }, [isOpen, exam.id, onAdmissionsUpdated]);

  if (!isOpen) return null;

  // Registered students or all students if registered list not populated
  const registeredStudents = (exam.registeredStudentIds && exam.registeredStudentIds.length > 0)
    ? students.filter((s) => exam.registeredStudentIds?.includes(s.id))
    : students;
  const studentById = new Map(registeredStudents.map((student) => [student.id, student]));
  waitingCandidates.forEach((candidate) => {
    if (!studentById.has(candidate.studentId)) {
      studentById.set(candidate.studentId, {
        id: candidate.studentId,
        name: candidate.studentName,
        email: '',
        avatar: '',
        studentNumber: candidate.studentNumber,
        department: exam.department || '',
        faculty: exam.faculty,
        enrolledCourseCodes: [exam.courseCode],
      });
    }
  });
  const enrolledStudents = Array.from(studentById.values());

  const handleAdmit = async (studentId: string) => {
    setAdmittingStudentId(studentId);
    setAdmissionError(null);
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(exam.id)}/admit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data?.admittedStudentIds)) {
        throw new Error(json?.error || `Admission failed (${res.status}).`);
      }

      admitStudentToExam(exam.id, studentId);
      removeStudentFromWaitingRoom(exam.id, studentId);
      setAdmittedIds(json.data.admittedStudentIds);
      setWaitingIds((prev) => prev.filter((id) => id !== studentId));

      window.dispatchEvent(
        new CustomEvent('examguard_admission_updated', {
          detail: { examId: exam.id, studentId },
        })
      );

      onAdmissionsUpdated();
    } catch (err) {
      setAdmissionError(err instanceof Error ? err.message : `Could not admit candidate ${studentId}.`);
    } finally {
      setAdmittingStudentId(null);
    }
  };

  const handleRevoke = async (studentId: string) => {
    setAdmissionError(null);
    try {
      const res = await fetch(
        `/api/exams/${encodeURIComponent(exam.id)}/admit/${encodeURIComponent(studentId)}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data?.admittedStudentIds)) {
        throw new Error(json?.error || `Revoking admission failed (${res.status}).`);
      }
      revokeStudentAdmission(exam.id, studentId);
      registerStudentToWaitingRoom(exam.id, studentId);
      setAdmittedIds(json.data.admittedStudentIds);
      window.dispatchEvent(
        new CustomEvent('examguard_admission_updated', {
          detail: { examId: exam.id, studentId, revoked: true },
        })
      );
      onAdmissionsUpdated();
    } catch (err) {
      setAdmissionError(err instanceof Error ? err.message : `Could not revoke candidate ${studentId}.`);
    }
  };

  const handleAdmitAll = async () => {
    const allIds = enrolledStudents.map((s) => s.id);
    setIsAdmittingAll(true);
    setAdmissionError(null);
    try {
      const res = await fetch(`/api/exams/${encodeURIComponent(exam.id)}/admit-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: allIds }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success || !Array.isArray(json?.data?.admittedStudentIds)) {
        throw new Error(json?.error || `Bulk admission failed (${res.status}).`);
      }
      admitAllStudentsToExam(exam.id);
      allIds.forEach((studentId) => removeStudentFromWaitingRoom(exam.id, studentId));
      setAdmittedIds(json.data.admittedStudentIds);
      setWaitingIds([]);
      window.dispatchEvent(
        new CustomEvent('examguard_admission_updated', {
          detail: { examId: exam.id, all: true },
        })
      );
      onAdmissionsUpdated();
    } catch (err) {
      setAdmissionError(err instanceof Error ? err.message : 'Could not admit candidates.');
    } finally {
      setIsAdmittingAll(false);
    }
  };

  const handleCopyPassword = () => {
    if (exam.accessPassword) {
      navigator.clipboard.writeText(exam.accessPassword);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const filteredStudents = enrolledStudents.filter((student) => {
    const isAdmitted = admittedIds.includes(student.id);
    const isWaiting = waitingIds.includes(student.id);
    if (filter === 'waiting' && (!isWaiting || isAdmitted)) return false;
    if (filter === 'admitted' && !isAdmitted) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        student.studentNumber.toLowerCase().includes(q) ||
        student.name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  {exam.courseCode}
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">{exam.courseTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-600 text-white rounded font-bold uppercase">
                  Admission Gate
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight truncate mt-0.5" title={exam.title}>
                {exam.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 border-b border-slate-100 bg-white text-xs">
          <div>
            <div className="text-slate-400">Faculty Code</div>
            <div className="font-mono font-bold text-slate-800">
              {backendExam?.facultyCode || exam.facultyCode || 'Not set'}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Location</div>
            <div className="font-semibold text-slate-800">
              {(backendExam?.location ?? exam.location) || 'Not set'}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Room Number</div>
            <div className="font-mono font-bold text-slate-800">
              {(backendExam?.roomNumber ?? exam.roomNumber) || 'Not set'}
            </div>
          </div>
          {metadataError && (
            <div className="col-span-3 text-[11px] text-rose-700" role="status">
              Exam details could not be loaded from the backend: {metadataError}
            </div>
          )}
        </div>

        {/* Access Password & Admission Rule Banner */}
        <div className="p-4 bg-amber-50/80 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold text-amber-950">Examination Password: </span>
              <span className="font-mono font-bold text-amber-900 bg-white px-2.5 py-1 rounded border border-amber-300 ml-1">
                {exam.accessPassword || 'No password (Open Gate)'}
              </span>
            </div>
            {exam.accessPassword && (
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 bg-amber-100/80 px-2 py-1 rounded border border-amber-300 cursor-pointer font-medium"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-amber-900">
            Admitted candidates see questions and start their countdown as soon as password is verified.
          </div>
        </div>

        {admissionError && (
          <div className="mx-4 mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700" role="alert">
            {admissionError}
          </div>
        )}

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-white text-center py-2.5 px-4 text-xs">
          <div>
            <div className="text-slate-400 text-[11px]">Enrolled Candidates</div>
            <div className="text-base font-bold font-mono text-slate-800">{enrolledStudents.length}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Admitted to Room</div>
            <div className="text-base font-bold font-mono text-emerald-600">
              {admittedIds.filter((id) => enrolledStudents.some((s) => s.id === id)).length}
            </div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">In Waiting Room</div>
            <div className="text-base font-bold font-mono text-amber-600">
              {waitingIds.filter((id) => !admittedIds.includes(id)).length}
            </div>
          </div>
        </div>

        {/* Controls Bar: Filters and Admit All */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Candidates ({enrolledStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('waiting')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'waiting' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Waiting Room ({waitingIds.filter((id) => !admittedIds.includes(id)).length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('admitted')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filter === 'admitted' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admitted ({admittedIds.filter((id) => enrolledStudents.some((s) => s.id === id)).length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleAdmitAll()}
            disabled={isAdmittingAll || admittingStudentId !== null}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:cursor-wait"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isAdmittingAll ? 'Admitting Candidates…' : 'Admit All Candidates to Exam Room'}</span>
          </button>
        </div>

        {/* Quick Admission Number / Name Search Filter */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by Student Admission Number (e.g. STU-2024-8841)..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono placeholder:font-sans focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Student List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No candidates match the selected filter.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isAdmitted = admittedIds.includes(student.id);
              const isWaiting = waitingIds.includes(student.id);
              const submission = submissions.find((s) => s.studentId === student.id && s.examId === exam.id);

              return (
                <div key={student.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{student.name}</span>
                        {/* Prominent Student Admission Number */}
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-mono font-black text-[11px] shadow-2xs">
                          ADM: {student.studentNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{student.email} · {student.department}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {submission && submission.status === 'submitted' ? (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed ({submission.score} Marks)</span>
                      </span>
                    ) : submission && submission.status === 'in_progress' ? (
                      <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>Writing Exam</span>
                      </span>
                    ) : isAdmitted ? (
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Admitted to Room</span>
                      </span>
                    ) : isWaiting ? (
                      <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        <span>In Waiting Room</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        Not Joined
                      </span>
                    )}

                    {/* Action Button */}
                    {isAdmitted ? (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(student.id)}
                        disabled={admittingStudentId !== null || isAdmittingAll}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Revoke Entry
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleAdmit(student.id)}
                        disabled={admittingStudentId !== null || isAdmittingAll}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer disabled:cursor-wait flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{admittingStudentId === student.id ? 'Admitting…' : 'Admit'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Proctored Session · Real-time Admission System</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
