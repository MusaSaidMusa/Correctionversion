import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface FlashMessageData {
  type?: 'success' | 'warning' | 'error' | 'info';
  text: string;
  subtext?: string;
}

interface FlashMessageProps {
  message: FlashMessageData | null;
  onClose: () => void;
}

/**
 * Global helper to trigger popup flashcard from anywhere in the application
 */
export function triggerFlash(data: FlashMessageData): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_flash', { detail: data }));
  }
}

export const FlashMessage: React.FC<FlashMessageProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const type = message.type || 'info';

  // Light green background for all successful actions, light red for unsuccessful actions
  const colorStyles = {
    // Light Green popup flashcard for success
    success:
      'bg-emerald-50 text-emerald-950 border-2 border-emerald-400 shadow-xl shadow-emerald-950/20 ring-2 ring-emerald-300/50',
    // Light Red popup flashcard for unsuccessful / error
    error:
      'bg-rose-50 text-rose-950 border-2 border-rose-400 shadow-xl shadow-rose-950/20 ring-2 ring-rose-300/50',
    // Light Amber popup flashcard for warnings
    warning:
      'bg-amber-50 text-amber-950 border-2 border-amber-400 shadow-xl shadow-amber-950/20 ring-2 ring-amber-300/50',
    // Light Blue popup flashcard for info
    info:
      'bg-sky-50 text-sky-950 border-2 border-sky-400 shadow-xl shadow-sky-950/20 ring-2 ring-sky-300/50',
  }[type];

  const iconContainerStyles = {
    success: 'bg-emerald-200/90 text-emerald-800 border border-emerald-300',
    error: 'bg-rose-200/90 text-rose-800 border border-rose-300',
    warning: 'bg-amber-200/90 text-amber-800 border border-amber-300',
    info: 'bg-sky-200/90 text-sky-800 border border-sky-300',
  }[type];

  const icon = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-700 shrink-0" />,
  }[type];

  const dismissBtnStyles = {
    success: 'text-emerald-700 hover:text-emerald-950 hover:bg-emerald-200/60',
    error: 'text-rose-700 hover:text-rose-950 hover:bg-rose-200/60',
    warning: 'text-amber-700 hover:text-amber-950 hover:bg-amber-200/60',
    info: 'text-sky-700 hover:text-sky-950 hover:bg-sky-200/60',
  }[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
      {/* Light translucent backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200 pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Popup Flashcard with Light Green (success) or Light Red (unsuccessful) background */}
      <div
        className={`relative z-10 pointer-events-auto max-w-sm sm:max-w-md w-full px-4 py-3.5 rounded-2xl flex items-center gap-3.5 animate-flashcard-entry transition-all overflow-hidden ${colorStyles}`}
        role="alert"
        aria-live="assertive"
      >
        {/* Animated Timer Progress Bar */}
        <div
          className={`absolute bottom-0 left-0 h-1 animate-flashcard-timer ${
            type === 'success'
              ? 'bg-emerald-500'
              : type === 'error'
              ? 'bg-rose-500'
              : type === 'warning'
              ? 'bg-amber-500'
              : 'bg-sky-500'
          }`}
        />

        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform transform hover:scale-105 ${iconContainerStyles}`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="font-extrabold text-xs sm:text-sm tracking-tight leading-snug">
            {message.text}
          </p>
          {message.subtext && (
            <p className="text-[11px] font-medium leading-tight mt-0.5 line-clamp-2 opacity-90">
              {message.subtext}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${dismissBtnStyles}`}
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
