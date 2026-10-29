import React from 'react';
import {
  ShieldCheck,
  Moon,
  Sun,
  Monitor,
  HelpCircle,
  LogOut,
  RefreshCw,
  User,
  GraduationCap,
  Award,
  KeyRound,
} from 'lucide-react';
import { AuthUser, TeacherProfile, StudentProfile, ThemeMode } from '../../types';

interface HeaderProps {
  currentUser: AuthUser | null;
  teacher?: TeacherProfile;
  students?: StudentProfile[];
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  onResetData: () => void;
  onNavigateHome: () => void;
  onOpenSuperAdminProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTheme,
  onThemeChange,
  onOpenHelp,
  onSignOut,
  onResetData,
  onNavigateHome,
  onOpenSuperAdminProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="Return to Dashboard Home"
        >
          <div className="h-10 px-1 py-0.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <img
              src="/institution-logo.jpg"
              alt="Institutional Examination Logo"
              className="h-8 max-w-[65px] object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 dark:text-slate-100 tracking-tight">
                Rifkins Education College
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                ExamGuard Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic hidden sm:block">
              "Impacting lives since 1953"
            </p>
          </div>
        </div>

        {/* Actions & User Session */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => onThemeChange('light')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTheme === 'light'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              title="Light Mode"
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('dark')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTheme === 'dark'
                  ? 'bg-white dark:bg-slate-700 text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onThemeChange('system')}
              className={`p-1.5 rounded-lg transition-colors ${
                currentTheme === 'system'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
              title="System Mode"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors hover-light-blue"
            title="Help & Academic Support"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetData}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            title="Reset system database to institutional defaults"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Data</span>
          </button>

          {/* User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div
                onClick={() => {
                  if (currentUser.role === 'admin' && onOpenSuperAdminProfile) {
                    onOpenSuperAdminProfile();
                  }
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 ${
                  currentUser.role === 'admin' ? 'cursor-pointer hover:border-indigo-400' : ''
                }`}
              >
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {currentUser.role === 'admin' ? (
                      <KeyRound className="w-4 h-4" />
                    ) : currentUser.role === 'teacher' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] font-medium capitalize text-indigo-600 dark:text-indigo-400">
                    {currentUser.role === 'admin' ? 'Super Administrator' : currentUser.role}
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={onSignOut}
                className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                title="Sign Out Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
