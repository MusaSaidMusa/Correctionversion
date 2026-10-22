import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Clock,
} from 'lucide-react';
import { AuthUser, ThemeMode } from '../../types';

interface FooterProps {
  currentUser: AuthUser | null;
  currentTheme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onOpenHelp?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentUser,
  currentTheme,
  onThemeChange,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 w-full overflow-hidden bg-white dark:bg-slate-900 transition-colors">
      
      {/* --- BACKGROUND LAYER: 3-COLOR WAVE PATTERN (REDUCED BY 1/4) --- */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <svg
          viewBox="0 0 1440 150" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full block"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Orange Gradient for Top Section */}
            <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="50%" stopColor="#FF7F50" />
              <stop offset="100%" stopColor="#ffee00" />
            </linearGradient>

            {/* Bluish Gradient for Bottom Section */}
            <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
          </defs>

          {/* 
            Layer 1: Orange Top Section 
            Slopier curve: Starts at Y=48.75 on the left, rises to Y=18.75 on the right.
          */}
          <path
            d="M0,48.75 
               C300,41.25 600,33.75 900,30 
               C1100,26.25 1300,22.5 1440,18.75 
               L1440,0 
               L0,0 Z"
            fill="url(#orangeGradient)"
          />

          {/* 
            Layer 2: White Middle Section 
            Thicker band: Y-gap is now 2.8125
          */}
          <path
            d="M0,50.625 
               C300,43.125 600,35.625 900,31.875 
               C1100,28.125 1300,24.375 1440,20.625 
               L1440,23.4375 
               C1300,27.1875 1100,30.9375 900,34.6875 
               C600,38.4375 300,45.9375 0,53.4375 Z"
            fill="#FFFFFF"
          />

          {/* 
            Layer 3: Bluish Bottom Section 
            Adjusted starting Y to subtract the extra height taken by the white section.
          */}
          <path
            d="M0,53.4375 
               C300,45.9375 600,38.4375 900,34.6875 
               C1100,30.9375 1300,27.1875 1440,23.4375 
               L1440,150 
               L0,150 Z"
            fill="url(#blueGradient)"
          />
        </svg>
      </div>

      {/* --- CONTENT LAYER: POSITIONED ENTIRELY ON THE BLUE SECTION --- */}
      {/* pt-10 adjusts for the smaller background to keep text centered */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 pt-10 pb-2 flex flex-wrap items-center justify-between gap-4 text-xs">
        
        {/* Left: Security Status & Real-time Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-white font-mono text-[11px] font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">SEB Guard Active · AES-256 Validated</span>
            <span className="sm:hidden">SEB Guard Active</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-slate-200 text-[11px] font-mono border-l border-slate-500/50 pl-3">
            <Clock className="w-3 h-3 text-orange-400" />
            <span>GMT Clock: {timeStr}</span>
          </div>
        </div>

        {/* Center: Copyright & Contact */}
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-[10px] sm:text-[11px] text-slate-300 text-center font-bold">
          <span>© Airwaves Software Ltd. 2026</span>
          <a
            href="mailto:musasaid@gmail.com"
            className="underline underline-offset-2 hover:text-white transition-colors"
          >
            musasaid@gmail.com
          </a>
        </div>

        {/* Right: Theme / Mode Switcher & User Role Indicator */}
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-600/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => onThemeChange('light')}
              title="Switch to Light Mode"
              className={`p-1.5 rounded-md transition-all ${
                currentTheme === 'light'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              title="Switch to Dark Mode"
              className={`p-1.5 rounded-md transition-all ${
                currentTheme === 'dark'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onThemeChange('system')}
              title="Switch to High-Contrast Slate System Mode"
              className={`p-1.5 rounded-md transition-all ${
                currentTheme === 'system'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current User Session Snapshot */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-200 font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span>{currentUser.role.toUpperCase()}</span>
              {currentUser.department && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="truncate max-w-[130px]">{currentUser.department}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};