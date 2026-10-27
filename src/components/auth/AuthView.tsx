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
  Building,
} from 'lucide-react';
import { AuthUser, StudentProfile, TeacherProfile, UserRole } from '../../types';
import { verifyUserPassword, getStoredSuperAdmin } from '../../services/storageService';

interface AuthViewProps {
  onLogin: (user: AuthUser) => void;
  teacher: TeacherProfile;
  students: StudentProfile[];
  onOpenHelp: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  teacher,
  students,
  onOpenHelp,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>('teacher');
  const [email, setEmail] = useState(teacher.email);
  const [password, setPassword] = useState('password123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || 'student-alex');

  // Handle Role selection
  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    setErrorMessage(null);
    if (role === 'teacher') {
      setEmail(teacher.email);
      setPassword('password123');
    } else if (role === 'admin') {
      const admin = getStoredSuperAdmin();
      setEmail(admin.email);
      setPassword('admin123');
    } else {
      const s = students.find((st) => st.id === selectedStudentId) || students[0];
      setEmail(s ? s.email : 'alex.rivera@student.edu');
      setPassword('password123');
    }
  };

  const handleStudentSelect = (sId: string) => {
    setSelectedStudentId(sId);
    const s = students.find((st) => st.id === sId);
    if (s) {
      setEmail(s.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isValid = verifyUserPassword(activeRole, email, password);
    if (!isValid) {
      setErrorMessage('Invalid institutional credentials. Please verify your email and password.');
      return;
    }

    if (activeRole === 'teacher') {
      const authUser: AuthUser = {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: 'teacher',
        avatar: teacher.avatar,
        title: teacher.title,
        department: teacher.department,
        faculty: teacher.faculty,
        assignedCourseCodes: teacher.assignedCourseCodes,
        accessStatus: teacher.accessStatus,
      };
      onLogin(authUser);
    } else if (activeRole === 'student') {
      const student = students.find((s) => s.email.toLowerCase() === email.toLowerCase()) || students[0];
      const authUser: AuthUser = {
        id: student.id,
        name: student.name,
        email: student.email,
        role: 'student',
        avatar: student.avatar,
        studentNumber: student.studentNumber,
        department: student.department,
        faculty: student.faculty,
        assignedCourseCodes: student.enrolledCourseCodes,
        accessStatus: student.accessStatus,
      };
      onLogin(authUser);
    } else {
      const superAdmin = getStoredSuperAdmin();
      onLogin(superAdmin);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-16 flex items-center justify-center mx-auto mb-2">
          <img
            src="/institution-logo.jpg"
            alt="Institutional Examination Logo"
            className="h-14 max-w-[180px] object-contain drop-shadow-md"
          />
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          ExamGuard<span className="text-indigo-600 dark:text-indigo-400"> Pro</span>
        </h2>
        <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Institutional Examination & Proctoring Gate
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl sm:px-10">
          {/* Role selector tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-6">
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
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentNumber})
                  </option>
                ))}
              </select>
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
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Password
              </label>
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
    </div>
  );
};
