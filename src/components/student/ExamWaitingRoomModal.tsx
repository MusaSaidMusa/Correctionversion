import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';
import {
  isStudentAdmittedToExam,
  registerStudentToWaitingRoom,
  removeStudentFromWaitingRoom,
  admitStudentToExam,
} from '../../services/storageService';

interface ExamWaitingRoomModalProps {
  exam: Exam;
  student: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
  onAdmittedAndUnlocked: () => void;
  onOpenHelp?: () => void;
}

export const ExamWaitingRoomModal: React.FC<ExamWaitingRoomModalProps> = ({
  exam,
  student,
  isOpen,
  onClose,
  onAdmittedAndUnlocked,
  onOpenHelp,
}) => {
  const [isAdmitted, setIsAdmitted] = useState<boolean>(() =>
    isStudentAdmittedToExam(exam.id, student.id)
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    registerStudentToWaitingRoom(exam.id, student.id);

    // Initial check
    setIsAdmitted(isStudentAdmittedToExam(exam.id, student.id));

    // Listen for real-time invigilator admission updates
    const handleAdmission = (e: any) => {
      const detail = e.detail;
      if (detail && detail.examId === exam.id) {
        if (detail.all || detail.studentId === student.id) {
          setIsAdmitted(!detail.revoked);
        }
      }
    };

    window.addEventListener('examguard_admission_updated', handleAdmission);
    return () => {
      removeStudentFromWaitingRoom(exam.id, student.id);
      window.removeEventListener('examguard_admission_updated', handleAdmission);
    };
  }, [exam.id, student.id, isOpen]);

  if (!isOpen) return null;

  const handleStart = () => {
    if (exam.accessPassword && exam.accessPassword.trim().length > 0) {
      if (passwordInput.trim() !== exam.accessPassword.trim()) {
        setPasswordError('Incorrect examination room access passcode.');
        return;
      }
    }
    onAdmittedAndUnlocked();
  };

  const handleSelfAdmitForTesting = () => {
    admitStudentToExam(exam.id, student.id);
    setIsAdmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Virtual Examination Waiting Room</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exam.courseCode} — {exam.title}
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

        <div className="p-6 space-y-5 text-sm">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Candidate:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Student Reg No:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">{student.studentNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Invigilator:</span>
              <span>{exam.instructorName}</span>
            </div>
          </div>

          {/* Admission Status Indicator */}
          <div className="p-4 rounded-xl border text-center space-y-2">
            {isAdmitted ? (
              <div className="text-emerald-600 dark:text-emerald-400 space-y-1.5">
                <CheckCircle2 className="w-8 h-8 mx-auto" />
                <div className="font-bold text-sm">Admitted by Chief Invigilator ✓</div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You are cleared to commence your examination session.
                </p>
              </div>
            ) : (
              <div className="text-amber-600 dark:text-amber-400 space-y-1.5">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                <div className="font-bold text-sm">Awaiting Invigilator Admission</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The instructor is verifying candidate identities. You will be automatically admitted shortly.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSelfAdmitForTesting}
                    className="text-[11px] underline text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
                  >
                    Quick-admit Candidate (Test Demo)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Access passcode if exam requires one */}
          {exam.accessPassword && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Exam Access Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Enter passcode provided by invigilator"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(null);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              {passwordError && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{passwordError}</p>
              )}
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleStart}
              disabled={!isAdmitted}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isAdmitted ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Commence Examination</span>
            </button>
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Get Invigilator Assistance"
              >
                <HelpCircle className="w-5 h-5 text-slate-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
