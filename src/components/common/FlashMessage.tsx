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
    }, 6000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const type = message.type || 'info';

  const colorStyles = {
    success: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-100',
    warning: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-100',
    error: 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-100',
    info: 'bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/80 dark:border-indigo-800 dark:text-indigo-100',
  }[type];

  const icon = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
  }[type];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 ${colorStyles}`}>
        {icon}
        <div className="flex-1 text-sm">
          <p className="font-semibold">{message.text}</p>
          {message.subtext && <p className="text-xs mt-0.5 opacity-90">{message.subtext}</p>}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss notice"
        >
          <X className="w-4 h-4 opacity-70 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};
