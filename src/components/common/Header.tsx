import React, { useState } from 'react';
import {
  Shield,
  User,
  GraduationCap,
  ShieldAlert,
  RotateCcw,
  LogOut,
  Building2,
  Lock,
  LifeBuoy,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { AuthUser, StudentProfile, TeacherProfile, ThemeMode } from '../../types';
import { InstitutionLogo } from './InstitutionLogo';
import { ProfileDetailModal } from './ProfileDetailModal';

interface HeaderProps {
  currentUser: AuthUser | null;
  teacher?: TeacherProfile;
  students?: StudentProfile[];
  currentTheme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  onResetData: () => void;
  onNavigateHome?: () => void;
  onOpenSuperAdminProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  teacher,
  students = [],
  currentTheme,
  onThemeChange,
  onOpenHelp,
  onSignOut,
  onResetData,
  onNavigateHome,
  onOpenSuperAdminProfile,
}) => {
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!currentUser) return null;

  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';
  const isStudent = currentUser.role === 'student';

  const activeStudent = students.find((s) => s.id === currentUser.id);
  const activeFaculty =
    (isTeacher && (teacher?.faculty || currentUser.faculty)) ||
    (isStudent && (activeStudent?.faculty || currentUser.faculty)) ||
    currentUser.faculty ||
    'Faculty of Computing & Information Technologies';

  const activeDepartment =
    (isTeacher && (teacher?.department || currentUser.department)) ||
    (isStudent && (activeStudent?.department || currentUser.department)) ||
    currentUser.department ||
    'Computer Science & Software Engineering';

  const activeAdmissionNo =
    (isStudent && (activeStudent?.studentNumber || currentUser.studentNumber)) ||
    undefined;

  return (
    <header className="relative min-h-[120px] bg-slate-800 border-b border-indigo-900 sticky top-0 z-40 shadow-md transition-colors w-full pb-2 overflow-hidden">
      
      {/* --- ABSTRACT BANNER SVG BACKGROUND --- */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <svg
          viewBox="0 0 1200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="goldGradientLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#A16207" />
            </linearGradient>
            
            <linearGradient id="goldGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A16207" />
              <stop offset="50%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#FDE047" />
            </linearGradient>

            <linearGradient id="blueGradientLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id="blueGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>

          {/* LEFT SIDE DESIGN */}
          <path d="M0,200 L0,80 C150,120 300,180 450,200 L0,200 Z" fill="url(#blueGradientLeft)" />
          <path d="M0,0 L0,50 C150,90 300,160 450,200 L350,200 C200,150 80,80 0,0 Z" fill="#E5E7EB" opacity="0.8" />
          <path d="M0,100 C150,130 300,180 450,200 L430,200 C280,175 130,120 0,80 Z" fill="url(#goldGradientLeft)" />
          <path d="M0,0 C100,40 200,80 300,140 L280,140 C180,80 80,40 0,0 Z" fill="#1E3A8A" opacity="0.6" />

          {/* RIGHT SIDE DESIGN */}
          <path d="M1200,0 L1200,60 C1050,30 900,10 750,0 L1200,0 Z" fill="url(#blueGradientRight)" />
          <path d="M1200,200 L1200,150 C1050,120 900,80 750,0 L850,0 C1000,50 1100,100 1200,200 Z" fill="#E5E7EB" opacity="0.8" />
          <path d="M1200,100 C1050,80 900,40 750,0 L770,0 C920,40 1070,80 1200,120 Z" fill="url(#goldGradientRight)" />
          <path d="M1200,200 C1100,160 1000,120 900,60 L920,60 C1020,120 1120,160 1200,200 Z" fill="#1E3A8A" opacity="0.6" />
        </svg>
      </div>

      {/* --- MAIN CONTENT LAYER (ON TOP OF SVG) --- */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-6 flex flex-col gap-2">
        
        {/* Top Navigation Row */}
        <div className="min-h-[64px] sm:min-h-[72px] flex items-center justify-between gap-2 sm:gap-4 pt-2">
          
          {/* Brand / Logo */}
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-3 sm:gap-4 md:gap-5 text-left hover:opacity-95 transition-all cursor-pointer group focus:outline-hidden min-w-0 shrink"
            title="Rifkins College - Click to return to Homepage"
          >
            {/* Logo fitted to match the combined height of the college name & motto */}
            <div className="shrink-0 flex items-center justify-center h-9 sm:h-11 md:h-12">
              <InstitutionLogo
                variant="icon"
                size="lg"
                className="shrink-0"
                imgClassName="h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 object-contain rounded-md drop-shadow-xs transition-transform group-hover:scale-105"
              />
            </div>

            {/* College Name & Motto: hidden in mobile view, displayed with offset spacing on sm+ screens */}
            <div className="hidden sm:flex sm:flex-col justify-center min-w-0 pl-1.5 sm:pl-2.5">
              <div className="truncate leading-none">
                <span className="font-extrabold text-xl sm:text-2xl md:text-3xl tracking-tight text-white group-hover:text-blue-200 transition-colors shrink-0">
                  Rifkins<span className="text-amber-400">College</span>
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-orange-400 font-extrabold font-mono truncate mt-1 leading-none tracking-wide">
                Impacting lives since 1953
              </div>
            </div>
          </button>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            
            {/* Help Button */}
            <button
              type="button"
              onClick={onOpenHelp}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs text-white bg-indigo-700 border border-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors cursor-pointer font-medium shrink-0 shadow-sm"
              title="Seek Help from Institutional Super Admin"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-orange-200 shrink-0" />
              <span className="hidden md:inline">Help & Support</span>
              <span className="hidden sm:inline md:hidden">Help</span>
            </button>

            {/* Theme Quick Switcher */}
            <button
              type="button"
              onClick={() => onThemeChange(currentTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              title={`Current: ${currentTheme} mode. Click to toggle.`}
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* ROLE PORTAL BADGE */}
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-xs font-bold select-none shrink-0 shadow-sm ${
                isAdmin
                  ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                  : isTeacher
                  ? 'bg-indigo-950/60 border-indigo-800 text-indigo-200'
                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              }`}
            >
              {isAdmin ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Super Admin Directorate</span>
                  <span className="sm:hidden">Admin</span>
                </>
              ) : isTeacher ? (
                <>
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-bold hidden sm:inline">Lecturer Portal</span>
                  <span className="font-bold sm:hidden">Faculty</span>
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold hidden sm:inline">Candidate Portal</span>
                  <span className="font-bold sm:hidden">Student</span>
                </>
              )}
              <span title="Role locked to active authenticated session">
                <Lock className="w-3 h-3 text-slate-400 opacity-70 shrink-0" />
              </span>
            </div>

            {/* Active Profile Info Container - Opens Profile Detail / Edit Modal */}
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-600 text-left transition-all shrink-0 rounded-lg bg-slate-700/80 shadow-sm border border-slate-600 cursor-pointer hover:bg-slate-600"
              title="Click to view and edit profile credentials or change password"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-400 shadow-xs shrink-0"
              />
              <div className="hidden lg:block text-left text-xs max-w-[100px] xl:max-w-[140px] pr-2">
                <div className="font-bold text-white leading-tight truncate flex items-center gap-1">
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[10px] text-orange-400 font-extrabold font-mono truncate">
                  {currentUser.studentNumber ? `ADM: ${currentUser.studentNumber}` : currentUser.title || currentUser.department}
                </div>
              </div>
            </button>

            {/* Sign Out Button - MAINTAINED CURRENT STYLING AS REQUESTED */}
            <button
              type="button"
              onClick={onSignOut}
              className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Sign Out Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lower Banner: Academic Assessment Heading & Faculty Details */}
        <div className="py-1.5 px-3 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="font-extrabold text-xs sm:text-sm md:text-base leading-tight text-blue-200 tracking-tight text-center md:text-left">
              Academic Assessment and Examination System
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            {/* Faculty Details Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-800 shadow-2xs"
              title={`Official Institutional Faculty: ${activeFaculty}`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase font-mono font-black text-amber-500 tracking-wider">Faculty:</span>
              <span className="text-amber-100 font-extrabold tracking-tight">{activeFaculty}</span>
            </div>

            {/* Department Details Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/50 border border-indigo-800 shadow-2xs"
              title={`Academic Department: ${activeDepartment}`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[10px] uppercase font-mono font-black text-indigo-400 tracking-wider">Dept:</span>
              <span className="text-indigo-100 font-extrabold">{activeDepartment}</span>
            </div>

            {/* Student Admission Number */}
            {isStudent && activeAdmissionNo && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800 shadow-2xs"
                title={`Verified Student Admission Number: ${activeAdmissionNo}`}
              >
                <span className="text-[10px] uppercase font-black text-emerald-500">Adm No:</span>
                <span className="text-emerald-100 font-black tracking-wide">{activeAdmissionNo}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verified Academic Profile & Password Update Modal */}
      {isProfileModalOpen && (
        <ProfileDetailModal
          isOpen={true}
          onClose={() => setIsProfileModalOpen(false)}
          targetType={currentUser.role}
          targetId={currentUser.id}
        />
      )}
    </header>
  );
};
