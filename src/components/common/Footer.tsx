import React from 'react';
import { Shield, Lock, FileText, HelpCircle, CheckCircle } from 'lucide-react';
import { AuthUser, ThemeMode } from '../../types';

interface FooterProps {
  currentUser: AuthUser | null;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenHelp: () => void;
}

export const Footer: React.FC<FooterProps> = ({ currentUser, onOpenHelp }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs py-4 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Rifkins Education College</span>
          <span className="italic text-slate-500 dark:text-slate-400">"Impacting lives since 1953"</span>
          <span>&bull; &copy; {new Date().getFullYear()} Academic Examination Board.</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            SEB & WebRTC Engine Active
          </span>
          <button
            onClick={onOpenHelp}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Support & Incident Helpdesk
          </button>
        </div>
      </div>
    </footer>
  );
};
