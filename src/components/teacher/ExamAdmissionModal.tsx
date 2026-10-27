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
  admitStudentToExam,
  admitAllStudentsToExam,
  revokeStudentAdmission,
  getWaitingRoomStudents,
  getStoredExams,
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
    admitStudentToExam(exam.id, studentId);
    refreshState();
    onAdmissionsUpdated();
  };

  const handleRevokeOne = (studentId: string) => {
    revokeStudentAdmission(exam.id, studentId);
    refreshState();
    onAdmissionsUpdated();
  };

  const handleAdmitAll = () => {
    admitAllStudentsToExam(exam.id);
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
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Admit All Candidates</span>
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

          {/* Candidates List */}
          <div className="border rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {filteredStudents.map((st) => {
              const isAdmitted = admittedIds.includes(st.id);
              const isWaiting = waitingStudentIds.includes(st.id);

              return (
                <div
                  key={st.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={st.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>{st.name}</span>
                        {isWaiting && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                            Waiting
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Reg: {st.studentNumber} &bull; {st.department || 'Computing'}
                      </div>
                    </div>
                  </div>

                  {isAdmitted ? (
                    <button
                      onClick={() => handleRevokeOne(st.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Revoke Admission</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAdmitOne(st.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Admit to Exam</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
