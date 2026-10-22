import React, { useState } from 'react';
import {
  Shield,
  User,
  GraduationCap,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  LifeBuoy,
  KeyRound,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AuthUser, StudentProfile, TeacherProfile, UserRole } from '../../types';
import { InstitutionLogo } from '../common/InstitutionLogo';
import { SUPER_ADMIN } from '../../data/mockData';
import { getStoredTeachers, getStoredStudents, verifyUserPassword } from '../../services/storageService';

interface AuthViewProps {
  onLogin: (user: AuthUser) => void;
  teacher?: TeacherProfile;
  students?: StudentProfile[];
  onOpenHelp?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  teacher,
  students = [],
  onOpenHelp,
}) => {
  // Authentication option order: student, teacher, admin
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const allTeachers = getStoredTeachers();
  const allStudents = students.length > 0 ? students : getStoredStudents();

  const handleQuickLogin = (role: UserRole, targetId?: string) => {
    if (role === 'student') {
      const targetStudent = allStudents.find((s) => s.id === targetId) || allStudents[0];
      if (targetStudent) {
        onLogin({
          id: targetStudent.id,
          name: targetStudent.name,
          email: targetStudent.email,
          role: 'student',
          avatar: targetStudent.avatar,
          department: targetStudent.department,
          faculty: targetStudent.faculty,
          studentNumber: targetStudent.studentNumber,
          accessStatus: targetStudent.accessStatus,
        });
      }
      return;
    }

    if (role === 'teacher') {
      const targetTeacher = allTeachers.find((t) => t.id === targetId) || allTeachers[0];
      if (targetTeacher) {
        onLogin({
          id: targetTeacher.id,
          name: targetTeacher.name,
          email: targetTeacher.email,
          role: 'teacher',
          avatar: targetTeacher.avatar,
          title: targetTeacher.title,
          department: targetTeacher.department,
          faculty: targetTeacher.faculty,
          assignedCourseCodes: targetTeacher.assignedCourseCodes,
          accessStatus: targetTeacher.accessStatus,
        });
      }
      return;
    }

    if (role === 'admin') {
      onLogin(SUPER_ADMIN);
      return;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedRole === 'student') {
      const foundStudent = allStudents.find(
        (s) =>
          s.email.toLowerCase() === email.trim().toLowerCase() ||
          s.studentNumber.toLowerCase() === email.trim().toLowerCase()
      ) || allStudents[0];

      if (password && !verifyUserPassword('student', foundStudent.email, password)) {
        setError('Incorrect account password. Please enter your valid password or contact examination support.');
        return;
      }

      onLogin({
        id: foundStudent.id,
        name: foundStudent.name,
        email: foundStudent.email,
        role: 'student',
        avatar: foundStudent.avatar,
        department: foundStudent.department,
        faculty: foundStudent.faculty,
        studentNumber: foundStudent.studentNumber,
        accessStatus: foundStudent.accessStatus,
      });
      return;
    }

    if (selectedRole === 'teacher') {
      const foundTeacher = allTeachers.find((t) => t.email.toLowerCase() === email.trim().toLowerCase()) || allTeachers[0];

      if (password && !verifyUserPassword('teacher', foundTeacher.email, password)) {
        setError('Incorrect faculty password. Please verify your credentials or contact the registry.');
        return;
      }

      onLogin({
        id: foundTeacher.id,
        name: foundTeacher.name,
        email: foundTeacher.email,
        role: 'teacher',
        avatar: foundTeacher.avatar,
        title: foundTeacher.title,
        department: foundTeacher.department,
        faculty: foundTeacher.faculty,
        assignedCourseCodes: foundTeacher.assignedCourseCodes,
        accessStatus: foundTeacher.accessStatus,
      });
      return;
    }

    if (selectedRole === 'admin') {
      if (password && !verifyUserPassword('admin', SUPER_ADMIN.email, password)) {
        setError('Invalid master administrator password.');
        return;
      }
      onLogin(SUPER_ADMIN);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative">
      {/* Top Bar with Support Desk button only (single logo will be centered in the auth presentation) */}
      <header className="p-4 sm:p-6 flex items-center justify-between w-full max-w-6xl mx-auto z-10">
        <div className="text-xs text-slate-400 font-mono tracking-wider font-semibold">
          Rifkins College Portal
        </div>
        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 active:bg-emerald-700 transition-all cursor-pointer shadow-sm group"
          >
            <LifeBuoy className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white transition-colors" />
            <span className="hidden sm:inline">Support Desk</span>
          </button>
        )}
      </header>

      {/* Main Container - Centered Elements */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-xl w-full bg-slate-850 bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center">
          
          {/* THE SINGLE CENTERED LOGO & INSTITUTIONAL TITLE */}
          <div className="text-center mb-6 flex flex-col items-center w-full">
            <div className="mb-3.5">
              <InstitutionLogo size="header" variant="transparent" className="justify-center mx-auto" />
            </div>

            <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-white mb-0.5">
              Rifkins<span className="text-amber-400">College</span>
            </h1>
            <p className="text-xs text-orange-400 font-mono font-bold tracking-wide mb-3">
              Impacting lives since 1953 · Examination & Proctoring Network
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-inner">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Institutional Single Sign-On</span>
            </div>
            
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto text-center">
              Select your academic affiliation to authenticate into the Examination & Proctoring Network
            </p>
          </div>

          {/* Role Tabs - Strict Order: student, teacher, admin */}
          {/* Hover: Light Green (hover:bg-emerald-500 hover:border-emerald-400) | Active: Green (bg-emerald-600) */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-800/90 rounded-2xl border border-slate-700/80 mb-6 w-full">
            {/* 1. STUDENT */}
            <button
              type="button"
              onClick={() => setSelectedRole('student')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'student'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                  : 'text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 border border-transparent active:bg-emerald-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student</span>
            </button>

            {/* 2. TEACHER */}
            <button
              type="button"
              onClick={() => setSelectedRole('teacher')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                  : 'text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 border border-transparent active:bg-emerald-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Teacher</span>
            </button>

            {/* 3. ADMIN */}
            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'admin'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-500'
                  : 'text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 border border-transparent active:bg-emerald-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          {/* Quick 1-Click Fast Logins in Student, Teacher, Admin Order */}
          <div className="mb-6 space-y-2.5 w-full">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Quick One-Click Test Presets ({selectedRole.toUpperCase()}):
            </span>

            {/* 1. STUDENT PRESETS */}
            {selectedRole === 'student' && (
              <div className="space-y-2">
                {allStudents.slice(0, 2).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleQuickLogin('student', s.id)}
                    className="w-full p-3 rounded-xl bg-slate-800/70 hover:bg-emerald-500 active:bg-emerald-700 border border-slate-700 hover:border-emerald-400 active:border-emerald-600 text-left flex items-center justify-between transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-full object-cover border border-emerald-400 group-hover:border-white transition-colors" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-white">{s.name}</div>
                        <div className="text-[11px] text-slate-400 group-hover:text-emerald-50">{s.studentNumber} · {s.program}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* 2. TEACHER PRESETS */}
            {selectedRole === 'teacher' && (
              <div className="space-y-2">
                {allTeachers.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleQuickLogin('teacher', t.id)}
                    className="w-full p-3 rounded-xl bg-slate-800/70 hover:bg-emerald-500 active:bg-emerald-700 border border-slate-700 hover:border-emerald-400 active:border-emerald-600 text-left flex items-center justify-between transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover border border-emerald-400 group-hover:border-white transition-colors" />
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-white">{t.name}</div>
                        <div className="text-[11px] text-slate-400 group-hover:text-emerald-50">{t.title}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            )}

            {/* 3. ADMIN PRESET */}
            {selectedRole === 'admin' && (
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="w-full p-3 rounded-xl bg-slate-800/70 hover:bg-emerald-500 active:bg-emerald-700 border border-slate-700 hover:border-emerald-400 active:border-emerald-600 text-left flex items-center justify-between transition-all group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <img src={SUPER_ADMIN.avatar} alt={SUPER_ADMIN.name} className="w-9 h-9 rounded-full object-cover border border-amber-400 group-hover:border-white transition-colors" />
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-white">{SUPER_ADMIN.name}</div>
                    <div className="text-[11px] text-slate-400 group-hover:text-emerald-50">{SUPER_ADMIN.title}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </button>
            )}
          </div>

          {/* Centered Divider */}
          <div className="relative my-4 w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
              <span className="bg-slate-900 px-3">or manual institutional credentials</span>
            </div>
          </div>

          {/* Centered Form */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5 w-full">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                {selectedRole === 'student' ? 'Institutional Email or Student Number' : 'Institutional Email'}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  selectedRole === 'student'
                    ? 'e.g. alex.chen@student.university.edu or ADM-CS-2026-084'
                    : selectedRole === 'teacher'
                    ? 'e.g. e.vance@university.edu'
                    : 'admin@rifkins.ac.ke'
                }
                className="w-full px-3.5 py-2.5 text-xs text-center rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                Account Password or PIN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 text-xs text-center rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
              />
            </div>

            {/* Submit button: Hover light green (hover:bg-emerald-500), active/clicked green (active:bg-emerald-700) */}
            <button
              type="submit"
              className="w-full mt-3 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 border border-emerald-500 hover:border-emerald-400"
            >
              <KeyRound className="w-4 h-4" />
              <span>Authenticate Session ({selectedRole === 'admin' ? 'ADMIN' : selectedRole.toUpperCase()})</span>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
