import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface FlashMessageData {
  text: string;
  subtext?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface FlashMessageProps {
  message: FlashMessageData | null;
  onClose: () => void;
  autoCloseDuration?: number;
}

export const FlashMessage: React.FC<FlashMessageProps> = ({
  message,
  onClose,
  autoCloseDuration = 5000,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseDuration);
    return () => clearTimeout(timer);
  }, [message, autoCloseDuration, onClose]);

  if (!message) return null;

  const bgStyles = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    info: 'bg-indigo-600 text-white border-indigo-500',
    warning: 'bg-amber-600 text-white border-amber-500',
    error: 'bg-rose-600 text-white border-rose-500',
  }[message.type];

  const IconComponent = {
    success: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  }[message.type];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 ${bgStyles}`}>
        <IconComponent className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-tight">{message.text}</h4>
          {message.subtext && (
            <p className="text-xs opacity-90 mt-1 leading-relaxed">{message.subtext}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-black/20 transition-colors cursor-pointer text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
