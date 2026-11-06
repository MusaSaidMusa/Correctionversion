import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckCircle2,
  Trash2,
  BookOpen,
  Search,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Building,
  GraduationCap,
  Info,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';
import {
  checkMissedExamRegistrationBlock,
  isStudentAdmissionRegistered,
  isValidAdmissionNumberFormat,
} from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  targetExam: Exam | null;
  students: StudentProfile[];
  onEnrollExistingStudent: (studentId: string, examId: string) => { success: boolean; error?: string } | boolean;
  onUnenrollStudent: (studentId: string, examId: string) => boolean;
  onRegisterStudent?: (newStudent: StudentProfile, enrolledCodes: string[]) => void;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  onClose,
  exams,
  targetExam,
  students,
  onEnrollExistingStudent,
  onUnenrollStudent,
}) => {
  const [tab, setTab] = useState<'enroll' | 'by_adm'>('enroll');
  const [selectedExamId, setSelectedExamId] = useState<string>(
    targetExam?.id || exams[0]?.id || ''
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  // Quick enroll by Admission Number state
  const [inputAdmissionNumber, setInputAdmissionNumber] = useState('');
  const [admissionLookupResult, setAdmissionLookupResult] = useState<StudentProfile | null>(null);

  if (!isOpen) return null;

  const currentExam = exams.find((e) => e.id === selectedExamId) || targetExam || exams[0];

  const handleLookupAdmission = (val: string) => {
    setInputAdmissionNumber(val);
    setEnrollmentError(null);
    if (!val.trim()) {
      setAdmissionLookupResult(null);
      return;
    }
    const check = isStudentAdmissionRegistered(val.trim());
    if (check.isRegistered && check.student) {
      setAdmissionLookupResult(check.student);
    } else {
      setAdmissionLookupResult(null);
    }
  };

  const handleEnrollByAdmissionNumber = (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollmentError(null);
    if (!inputAdmissionNumber.trim() || !currentExam) return;

    const formattedAdm = inputAdmissionNumber.trim().toUpperCase();

    // 1. Verify against Institutional Master Database
    const check = isStudentAdmissionRegistered(formattedAdm);
    if (!check.isRegistered || !check.student) {
      const err = `Unregistered Admission Number: Candidate with ADM Number "${formattedAdm}" is not found in the institutional master database. System registration of candidates must be performed by the Administrator. Only existing registered students can be enrolled into examinations.`;
      setEnrollmentError(err);
      triggerFlash({
        type: 'error',
        text: 'Unregistered Admission Number',
        subtext: `No candidate with ADM Number "${formattedAdm}" in system database. Admin registration required.`,
      });
      return;
    }

    const studentToEnroll = check.student;

    // 2. Check if candidate previously missed this exam session
    const blockCheck = checkMissedExamRegistrationBlock(
      studentToEnroll.studentNumber,
      currentExam.courseCode,
      currentExam.title
    );
    if (blockCheck.isBlocked) {
      const err = `Re-registration Blocked: Candidate ${studentToEnroll.name} (${studentToEnroll.studentNumber}) was registered for [${currentExam.courseCode} - "${currentExam.title}"] but missed the session. Re-registration rejected until cleared by the Administrator.`;
      setEnrollmentError(err);
      triggerFlash({
        type: 'error',
        text: 'Registration Rejected (Missed Exam)',
        subtext: `Candidate (${studentToEnroll.studentNumber}) missed ${currentExam.courseCode}. Administrator clearance is required before re-registration.`,
      });
      return;
    }

    // 3. Enroll the student
    const res = onEnrollExistingStudent(studentToEnroll.id, currentExam.id);
    if (typeof res === 'object' && !res.success && res.error) {
      setEnrollmentError(res.error);
    } else {
      triggerFlash({
        type: 'success',
        text: 'Candidate Successfully Enrolled',
        subtext: `${studentToEnroll.name} (${studentToEnroll.studentNumber}) enrolled into ${currentExam.courseCode}.`,
      });
      setInputAdmissionNumber('');
      setAdmissionLookupResult(null);
      setTab('enroll');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Candidate Examination Enrollment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enroll existing registered candidates into scheduled examination sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-950/50 gap-4 text-xs font-bold">
          <button
            onClick={() => {
              setTab('enroll');
              setEnrollmentError(null);
            }}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              tab === 'enroll'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Browse Registered Candidates ({students.length})
          </button>
          <button
            onClick={() => {
              setTab('by_adm');
              setEnrollmentError(null);
            }}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              tab === 'by_adm'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Enroll by Admission Number (e.g. MSA-2026/8-2041)
          </button>
        </div>

        {/* Institutional Policy Notice Banner */}
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/80 dark:border-amber-900/60 px-6 py-2.5 flex items-center gap-2.5 text-[11px] text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Institutional Academic Protocol:</strong> Student registration into the system database is performed exclusively by the <strong>Administrator</strong>. Teachers can only enroll verified existing students into examination sessions.
          </span>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {tab === 'enroll' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Select Target Exam
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.courseCode} — {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Search Candidate Database
                  </label>
                  <input
                    type="text"
                    placeholder="Name, ADM No (MSA-2026/8-2041)..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {enrollmentError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <div className="font-bold">Enrollment Rejected</div>
                    <div>{enrollmentError}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrollmentError(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="mt-4 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {filteredStudents.map((st) => {
                  const isEnrolled = currentExam?.registeredStudentIds?.includes(st.id);
                  const blockCheck = currentExam
                    ? checkMissedExamRegistrationBlock(st.studentNumber, currentExam.courseCode, currentExam.title)
                    : { isBlocked: false };

                  return (
                    <div
                      key={st.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                          alt={st.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{st.name}</span>
                            {blockCheck.isBlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Missed Exam · Admin Clearance Required</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Admission No: <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{st.studentNumber}</span> &bull; {st.department || 'Computing'}
                          </div>
                        </div>
                      </div>

                      {isEnrolled ? (
                        <button
                          type="button"
                          onClick={() => currentExam && onUnenrollStudent(st.id, currentExam.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Unenroll</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentExam) return;
                            if (blockCheck.isBlocked) {
                              const err = `Re-registration Blocked: Candidate ${st.name} (Admission: ${st.studentNumber}) was previously registered for examination [Code: ${currentExam.courseCode} | Title: "${currentExam.title}"] but missed the session. Re-registration is strictly prevented until cleared by the Administrator.`;
                              setEnrollmentError(err);
                              triggerFlash({
                                type: 'error',
                                text: 'Re-registration Rejected (Missed Exam)',
                                subtext: `Candidate (${st.studentNumber}) missed ${currentExam.courseCode}. Administrator clearance is required before re-registration.`,
                              });
                              return;
                            }
                            setEnrollmentError(null);
                            const res = onEnrollExistingStudent(st.id, currentExam.id);
                            if (typeof res === 'object' && !res.success && res.error) {
                              setEnrollmentError(res.error);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                            blockCheck.isBlocked
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 hover:bg-rose-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title={blockCheck.isBlocked ? 'Admin clearance required for missed exam' : 'Enroll candidate into exam'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{blockCheck.isBlocked ? 'Blocked (Missed Exam)' : 'Enroll Candidate'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'by_adm' && (
            <form onSubmit={handleEnrollByAdmissionNumber} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Select Target Examination
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.courseCode} — {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Candidate Admission Number (e.g. MSA-2026/8-2041)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="MSA-2026/8-2041"
                    value={inputAdmissionNumber}
                    onChange={(e) => handleLookupAdmission(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm uppercase"
                  />
                  {admissionLookupResult && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 text-xs font-bold font-sans">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified in Master DB</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Admission number must be pre-registered by the Administrator in the college academic database.
                </p>
              </div>

              {admissionLookupResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={admissionLookupResult.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                      alt={admissionLookupResult.name}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-400"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {admissionLookupResult.name}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                        {admissionLookupResult.studentNumber} &bull; {admissionLookupResult.department}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-lg border border-emerald-400">
                    Ready to Enroll
                  </span>
                </div>
              )}

              {enrollmentError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <div className="font-bold">Validation Error</div>
                    <div>{enrollmentError}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validate &amp; Enroll Candidate into Examination</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
