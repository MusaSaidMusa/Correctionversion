import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  KeyRound,
  HelpCircle,
  RefreshCw,
  AlertCircle,
  Play,
  FileText,
  Loader2,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';
import {
  isStudentAdmittedToExam,
  registerStudentToWaitingRoom,
  removeStudentFromWaitingRoom,
  hasUnapprovedMissedExam,
} from '../../services/storageService';
import { StudentResitRequestModal } from './StudentResitRequestModal';

interface ExamWaitingRoomModalProps {
  exam: Exam;
  student: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
  onAdmittedAndUnlocked: () => void;
  onOpenHelp?: () => void;
  onRequestResit?: () => void;
  allExams?: Exam[];
}

function playAdmissionChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
    osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.25); // C6
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.52);
  } catch {}
}

export const ExamWaitingRoomModal: React.FC<ExamWaitingRoomModalProps> = ({
  exam,
  student,
  isOpen,
  onClose,
  onAdmittedAndUnlocked,
  onOpenHelp,
  allExams = [],
}) => {
  const [isAdmitted, setIsAdmitted] = useState<boolean>(() =>
    isStudentAdmittedToExam(exam.id, student.id)
  );
  const [isAutoLaunching, setIsAutoLaunching] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isResitModalOpen, setIsResitModalOpen] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const onAdmittedAndUnlockedRef = useRef(onAdmittedAndUnlocked);
  onAdmittedAndUnlockedRef.current = onAdmittedAndUnlocked;

  // Verification 1: Course Registration Check
  const isEnrolledInCourse =
    student.enrolledCourseCodes?.includes(exam.courseCode) ||
    exam.registeredStudentIds?.includes(student.id) ||
    exam.courseCode === 'ALL';

  // Verification 2: Missed Exam Clearance Check
  const missedCheck = hasUnapprovedMissedExam(student.id, exam.courseCode, exam.title);

  // Stable lifecycle for waiting room registration: ONLY runs when isOpen, exam.id, or student.id changes
  useEffect(() => {
    if (!isOpen) return;

    if (isEnrolledInCourse && !missedCheck.isBlocked) {
      registerStudentToWaitingRoom(exam.id, student.id);
    }

    // Initial check
    const currentlyAdmitted = isStudentAdmittedToExam(exam.id, student.id);
    setIsAdmitted(currentlyAdmitted);

    // Listen for real-time invigilator admission updates
    const handleAdmission = (e: any) => {
      const detail = e.detail;
      if (detail && detail.examId === exam.id) {
        const isTarget =
          detail.all ||
          detail.studentId === student.id ||
          (Array.isArray(detail.studentIds) && detail.studentIds.includes(student.id));

        if (isTarget) {
          if (!detail.revoked) {
            setIsAdmitted(true);
            playAdmissionChime();

            // If no password required, trigger instant commencement
            if (!exam.accessPassword || exam.accessPassword.trim().length === 0) {
              setIsAutoLaunching(true);
              const timer = setTimeout(() => {
                onAdmittedAndUnlockedRef.current();
              }, 450);
              return () => clearTimeout(timer);
            } else {
              setTimeout(() => {
                passwordInputRef.current?.focus();
              }, 150);
            }
          } else {
            setIsAdmitted(false);
            setIsAutoLaunching(false);
          }
        }
      }
    };

    const handleResitUpdate = () => {
      setIsAdmitted(isStudentAdmittedToExam(exam.id, student.id));
    };

    window.addEventListener('examguard_admission_updated', handleAdmission);
    window.addEventListener('examguard_resit_requests_updated', handleResitUpdate);

    return () => {
      removeStudentFromWaitingRoom(exam.id, student.id);
      window.removeEventListener('examguard_admission_updated', handleAdmission);
      window.removeEventListener('examguard_resit_requests_updated', handleResitUpdate);
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
    setIsAutoLaunching(true);
    onAdmittedAndUnlockedRef.current();
  };

  return (
    <>
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
                  {exam.courseCode} &bull; Rifkins Education College &bull; <span className="italic">"Impacting lives since 1953"</span>
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
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.studentNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invigilator:</span>
                <span>{exam.instructorName}</span>
              </div>
            </div>

            {/* BLOCK CASE 1: NOT REGISTERED FOR COURSE */}
            {!isEnrolledInCourse ? (
              <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Admission Denied: Not Enrolled in Course</span>
                </div>
                <p className="text-xs leading-relaxed">
                  Institutional Security Rule: Candidate <strong className="font-mono">{student.studentNumber}</strong> is not registered for course <strong className="font-mono">{exam.courseCode}</strong>. Students not registered to a course cannot be admitted into the examination room for that course.
                </p>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : missedCheck.isBlocked ? (
              /* BLOCK CASE 2: MISSED PREVIOUS SITTING & REQUIRES ADMIN CLEARANCE */
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Missed Examination Clearance Required</span>
                </div>
                <p className="text-xs leading-relaxed">
                  You were previously registered for and missed <strong className="font-mono">{exam.courseCode}</strong> ({exam.title}). Candidates who missed an examination must apply for a resit and wait for approval from the Super Admin Directorate before their admission details can be accepted.
                </p>
                {missedCheck.resitRequest?.status === 'pending' ? (
                  <div className="p-3 bg-amber-100/80 dark:bg-amber-900/40 rounded-lg text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span>Your Resit Clearance Request is currently awaiting Super Admin review.</span>
                  </div>
                ) : (
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResitModalOpen(true)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Submit Resit Clearance Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* STABLE ADMISSION STATUS INDICATOR */
              <div
                className={`p-4 rounded-xl border text-center space-y-2 transition-all ${
                  isAdmitted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                }`}
              >
                {isAdmitted ? (
                  <div className="text-emerald-800 dark:text-emerald-200 space-y-1.5 animate-in fade-in">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="font-extrabold text-sm flex items-center justify-center gap-1.5">
                      <span>Admitted by Chief Invigilator ✓</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                        Real-Time
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {isAutoLaunching
                        ? 'Unlocking examination room... Launching active test session now!'
                        : 'Identity verified and admitted to session. You may commence immediately.'}
                    </p>
                  </div>
                ) : (
                  <div className="text-amber-800 dark:text-amber-200 space-y-1.5">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-600 dark:text-amber-400" />
                    <div className="font-bold text-sm">Awaiting Invigilator Admission</div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      The chief invigilator is actively admitting candidates. Your room unlocks automatically when admitted.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Access passcode if exam requires one */}
            {exam.accessPassword && (
              <div
                className={`space-y-1.5 p-3 rounded-xl border transition-all ${
                  isAdmitted
                    ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Examination Room Access Passcode{' '}
                  {isAdmitted && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">(Required to Commence)</span>
                  )}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={passwordInputRef}
                    type="password"
                    placeholder="Enter passcode provided by invigilator"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleStart();
                    }}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {passwordError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{passwordError}</p>
                )}
              </div>
            )}

            {/* STABLE, NON-FLICKERING COMMENCE / ADMIT AWAITING BUTTON */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleStart}
                disabled={!isAdmitted || isAutoLaunching}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer ${
                  isAdmitted
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
                    : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-80'
                }`}
              >
                {isAutoLaunching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Commencing Examination Now...</span>
                  </>
                ) : isAdmitted ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Commence Examination Immediately</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 animate-spin text-amber-200" />
                    <span>Awaiting Invigilator Admission</span>
                  </>
                )}
              </button>
              {onOpenHelp && (
                <button
                  onClick={onOpenHelp}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Get Invigilator Assistance"
                >
                  <HelpCircle className="w-5 h-5 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isResitModalOpen && (
        <StudentResitRequestModal
          isOpen={true}
          onClose={() => setIsResitModalOpen(false)}
          student={student}
          exams={allExams.length > 0 ? allExams : [exam]}
          preselectedExam={exam}
        />
      )}
    </>
  );
};
