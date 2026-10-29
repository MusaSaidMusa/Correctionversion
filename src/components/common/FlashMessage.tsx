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

export const FlashMessage: React.FC<FlashMessageProps> = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const type = message.type || 'info';

  const colorStyles = {
    // Green small rectangle flashcard for login / success
    success: 'bg-emerald-600 text-white border-emerald-400 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-400/30',
    // Red small rectangle flashcard for logout / error
    error: 'bg-rose-600 text-white border-rose-400 shadow-xl shadow-rose-950/40 ring-2 ring-rose-400/30',
    // Amber small rectangle flashcard for warning
    warning: 'bg-amber-600 text-white border-amber-400 shadow-xl shadow-amber-950/40 ring-2 ring-amber-400/30',
    // Indigo small rectangle flashcard for info
    info: 'bg-indigo-600 text-white border-indigo-400 shadow-xl shadow-indigo-950/40 ring-2 ring-indigo-400/30',
  }[type];

  const icon = {
    success: <CheckCircle2 className="w-5 h-5 text-white shrink-0 drop-shadow-xs" />,
    error: <AlertCircle className="w-5 h-5 text-white shrink-0 drop-shadow-xs" />,
    warning: <AlertTriangle className="w-5 h-5 text-white shrink-0 drop-shadow-xs" />,
    info: <Info className="w-5 h-5 text-white shrink-0 drop-shadow-xs" />,
  }[type];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
      {/* Light translucent backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-[1.5px] transition-opacity animate-in fade-in duration-150 pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Small Centered Rectangular Flashcard */}
      <div
        className={`relative z-10 pointer-events-auto max-w-sm sm:max-w-md w-full px-4 py-3 rounded-xl border flex items-center gap-3 animate-in fade-in zoom-in-95 duration-150 ${colorStyles}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
          {icon}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="font-bold text-xs sm:text-sm tracking-tight text-white leading-tight drop-shadow-2xs">
            {message.text}
          </p>
          {message.subtext && (
            <p className="text-[11px] text-white/90 leading-tight mt-0.5 truncate drop-shadow-2xs">
              {message.subtext}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md bg-white/10 hover:bg-white/25 text-white/90 hover:text-white transition-colors cursor-pointer shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
