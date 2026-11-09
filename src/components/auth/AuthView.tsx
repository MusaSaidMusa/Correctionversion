import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Key,
  X,
  ExternalLink,
  Sparkles,
  Send,
  RefreshCw,
} from 'lucide-react';
import { AuthUser, StudentProfile, TeacherProfile, UserRole } from '../../types';
import {
  verifyUserPassword,
  getStoredSuperAdmin,
  getStoredStudents,
  getStoredTeachers,
  findStudentByIdentifier,
  findTeacherByIdentifier,
  generatePasswordResetCode,
  resetPasswordWithCode,
} from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';
import { playAlertBeep } from '../../services/soundService';

interface AuthViewProps {
  onLogin: (user: AuthUser) => void;
  teacher: TeacherProfile;
  students: StudentProfile[];
  onOpenHelp: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  teacher,
  students: propStudents,
  onOpenHelp,
}) => {
  // Always load live fresh accounts from storage with prop fallback
  const allStudents = React.useMemo(() => {
    try {
      const stored = getStoredStudents();
      return stored && stored.length > 0 ? stored : propStudents;
    } catch {
      return propStudents;
    }
  }, [propStudents]);

  const allTeachers = React.useMemo(() => {
    try {
      const stored = getStoredTeachers();
      return stored && stored.length > 0 ? stored : [teacher];
    } catch {
      return [teacher];
    }
  }, [teacher]);

  const [activeRole, setActiveRole] = useState<UserRole>('student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => allStudents[0]?.id || 'student-alex'
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    () => allTeachers[0]?.id || teacher?.id || 'teacher-evelyn'
  );

  const [email, setEmail] = useState<string>(
    () => allStudents[0]?.studentNumber || allStudents[0]?.email || 'MSA-2026/8-2041'
  );
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [generatedTokenData, setGeneratedTokenData] = useState<{
    code: string;
    resetLink: string;
    expiresAt: number;
  } | null>(null);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Handle Role selection
  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    setErrorMessage(null);
    if (role === 'teacher') {
      const t = allTeachers.find((tch) => tch.id === selectedTeacherId) || allTeachers[0] || teacher;
      setEmail(t.email);
      setPassword('password123');
    } else if (role === 'admin') {
      const admin = getStoredSuperAdmin();
      setEmail(admin.email || 'admin@university.edu');
      setPassword('admin123');
    } else {
      const s = allStudents.find((st) => st.id === selectedStudentId) || allStudents[0];
      setEmail(s ? s.studentNumber || s.email : 'MSA-2026/8-2041');
      setPassword('password123');
    }
  };

  const handleStudentSelect = (sId: string) => {
    setSelectedStudentId(sId);
    const s = allStudents.find((st) => st.id === sId);
    if (s) {
      setEmail(s.studentNumber || s.email);
      setPassword('password123');
    }
  };

  const handleTeacherSelect = (tId: string) => {
    setSelectedTeacherId(tId);
    const t = allTeachers.find((tch) => tch.id === tId);
    if (t) {
      setEmail(t.email);
      setPassword('password123');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const inputClean = email.trim();
    const inputLower = inputClean.toLowerCase();

    // Determine target role (flexible multi-role auto-detection if credentials match)
    let effectiveRole = activeRole;
    let isAuthed = verifyUserPassword(effectiveRole, inputClean, password);

    // If verification failed on selected tab, check if user entered Admin or Teacher credentials
    if (!isAuthed) {
      if (inputLower === 'admin' || inputLower === 'admin@university.edu' || inputLower === 'rifkinsmusa@gmail.com') {
        if (verifyUserPassword('admin', inputClean, password)) {
          effectiveRole = 'admin';
          isAuthed = true;
        }
      } else {
        const potentialTeacher = findTeacherByIdentifier(inputClean);
        if (potentialTeacher && verifyUserPassword('teacher', inputClean, password)) {
          effectiveRole = 'teacher';
          isAuthed = true;
        } else {
          const potentialStudent = findStudentByIdentifier(inputClean);
          if (potentialStudent && verifyUserPassword('student', inputClean, password)) {
            effectiveRole = 'student';
            isAuthed = true;
          }
        }
      }
    }

    if (!isAuthed) {
      playAlertBeep('error');
      setErrorMessage('Invalid institutional credentials. Please verify your email, admission number, and password.');
      return;
    }

    playAlertBeep('success');

    if (effectiveRole === 'teacher') {
      const matchedTeacher =
        findTeacherByIdentifier(inputClean) ||
        allTeachers.find((t) => t.id === selectedTeacherId) ||
        allTeachers[0] ||
        teacher;

      const authUser: AuthUser = {
        id: matchedTeacher.id,
        name: matchedTeacher.name,
        email: matchedTeacher.email,
        role: 'teacher',
        avatar: matchedTeacher.avatar,
        title: matchedTeacher.title,
        department: matchedTeacher.department,
        faculty: matchedTeacher.faculty,
        assignedCourseCodes: matchedTeacher.assignedCourseCodes,
        accessStatus: matchedTeacher.accessStatus,
      };
      onLogin(authUser);
    } else if (effectiveRole === 'student') {
      const matchedStudent =
        findStudentByIdentifier(inputClean) ||
        allStudents.find((s) => s.id === selectedStudentId) ||
        allStudents[0];

      const authUser: AuthUser = {
        id: matchedStudent.id,
        name: matchedStudent.name,
        email: matchedStudent.email,
        role: 'student',
        avatar: matchedStudent.avatar,
        studentNumber: matchedStudent.studentNumber,
        department: matchedStudent.department,
        faculty: matchedStudent.faculty,
        assignedCourseCodes: matchedStudent.enrolledCourseCodes,
        accessStatus: matchedStudent.accessStatus,
      };
      onLogin(authUser);
    } else {
      const superAdmin = getStoredSuperAdmin();
      onLogin(superAdmin);
    }
  };

  // Open Forgot Password modal prefilled with current email
  const handleOpenForgotPassword = () => {
    setResetEmail(email);
    setGeneratedTokenData(null);
    setResetCodeInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setResetError(null);
    setResetSuccessMessage(null);
    setIsForgotModalOpen(true);
    playAlertBeep('info');
  };

  // Generate and send reset code automatically to student's email
  const handleSendResetCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setResetError(null);
    if (!resetEmail.trim()) {
      setResetError('Please enter your institutional email address.');
      return;
    }

    const tokenData = generatePasswordResetCode(resetEmail.trim());
    setGeneratedTokenData(tokenData);
    playAlertBeep('success');
    triggerFlash({
      type: 'success',
      text: 'Password Reset Code Generated & Dispatched',
      subtext: `Security verification code sent to ${resetEmail.trim()}. Check the simulated institutional inbox below.`,
    });
  };

  // Auto-apply direct reset link
  const handleApplyResetLink = () => {
    if (!generatedTokenData) return;
    setResetCodeInput(generatedTokenData.code);
    playAlertBeep('info');
    triggerFlash({
      type: 'info',
      text: 'One-Click Reset Link Activated',
      subtext: `Verification code (${generatedTokenData.code}) filled into the reset form.`,
    });
  };

  // Submit reset password and update database in real time
  const handleConfirmPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccessMessage(null);

    if (!resetCodeInput.trim()) {
      setResetError('Please enter the 6-digit verification code.');
      return;
    }
    if (newPasswordInput.length < 6) {
      setResetError('New password must contain at least 6 characters.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setResetError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    const res = resetPasswordWithCode(activeRole, resetEmail.trim(), resetCodeInput.trim(), newPasswordInput);
    if (!res.success) {
      playAlertBeep('error');
      setResetError(res.error || 'Failed to reset password. Please check the verification code.');
      return;
    }

    // Success: updated in database in real-time
    playAlertBeep('success');
    triggerFlash({
      type: 'success',
      text: 'Password Reset Successful & Database Synchronized',
      subtext: `Your institutional password has been updated in real-time. You can now authenticate immediately.`,
    });
    setPassword(newPasswordInput);
    setResetSuccessMessage('Password successfully updated in the system database. You can now log in.');

    setTimeout(() => {
      setIsForgotModalOpen(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-16 flex items-center justify-center mx-auto mb-2">
          <img
            src="/institution-logo.jpg"
            alt="Rifkins Education College Logo"
            className="h-14 max-w-[180px] object-contain drop-shadow-md"
          />
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Rifkins Education College
        </h2>
        <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 italic">
          "Impacting lives since 1953"
        </p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Examination Management & Proctoring Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10">
          {/* Role selector tabs in order: Student, Teacher, Admin */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => handleSelectRole('student')}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRole === 'student'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('teacher')}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRole === 'teacher'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeRole === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* If Student role, quick candidate selector */}
          {activeRole === 'student' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Select Candidate Account
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentSelect(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {allStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Teacher role, quick teacher selector */}
          {activeRole === 'teacher' && (
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Select Teaching Faculty / Invigilator
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => handleTeacherSelect(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.staffId || t.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If Admin role, quick info display */}
          {activeRole === 'admin' && (
            <div className="mb-4 p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-indigo-950 dark:text-indigo-200">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Dr. Marcus Sterling</span>
              </div>
              <div className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                Institutional Registrar &amp; Super Administrator (Username: <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono font-bold">admin</code> or <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono font-bold">admin@university.edu</code>)
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                {activeRole === 'student'
                  ? 'Institutional Admission No. or Email'
                  : activeRole === 'teacher'
                  ? 'Faculty Email or Staff ID'
                  : 'Institutional Administrator Username or Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={email}
                  placeholder={
                    activeRole === 'student'
                      ? 'e.g. MSA-2026/8-2041 or alex.rivera@student.edu'
                      : activeRole === 'teacher'
                      ? 'e.g. e.vance@university.edu or FAC-ENG-8492'
                      : 'e.g. admin or admin@university.edu'
                  }
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleOpenForgotPassword}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <span>Authenticate Academic Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Default Pass: <code className="text-indigo-600 dark:text-indigo-400 font-mono">password123</code></span>
            <button
              onClick={onOpenHelp}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need Help?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal with Real-time Code Generation & Reset Link */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Institutional Password Recovery</h3>
                  <p className="text-xs text-indigo-100">
                    Receive automatic reset code or use secure direct reset link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {resetError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccessMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}

              {/* Step 1: Email & Code Generation */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student Institutional Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="student@student.edu"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendResetCode()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reset Code</span>
                  </button>
                </div>
              </div>

              {/* Simulated Institutional Email Dispatch Card */}
              {generatedTokenData && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:to-teal-950/60 border-2 border-emerald-400 rounded-2xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span className="font-extrabold text-xs text-emerald-900 dark:text-emerald-200">
                        Dispatched to: {resetEmail}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full font-bold">
                      Expires in 15 mins
                    </span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800 text-center space-y-2">
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Automatic 6-Digit Password Reset Verification Code:
                    </span>
                    <div className="text-2xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                      {generatedTokenData.code}
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyResetLink}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Use One-Click Reset Link &amp; Fill Code</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Form to Reset Password in Real-time */}
              <form onSubmit={handleConfirmPasswordReset} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCodeInput}
                    onChange={(e) => setResetCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code..."
                    className="w-full px-3.5 py-2 text-sm font-mono tracking-widest text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Min 6 characters..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-type password..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password in Database (Real-time)</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
