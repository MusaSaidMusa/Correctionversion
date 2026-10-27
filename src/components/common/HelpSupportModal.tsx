import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Send,
  LifeBuoy,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { AuthUser, Exam, HelpTicket } from '../../types';
import { getStoredHelpTickets, addHelpTicket } from '../../services/storageService';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  activeExam?: Exam | null;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeExam,
}) => {
  const [tickets, setTickets] = useState<HelpTicket[]>(() => getStoredHelpTickets());
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [severity, setSeverity] = useState('medium');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !subject.trim()) return;

    const newTicket: HelpTicket = {
      id: `TICK-${Date.now().toString().slice(-4)}`,
      userId: currentUser?.id || 'guest',
      userName: currentUser?.name || 'Academic User',
      userEmail: currentUser?.email || 'user@university.edu',
      userRole: currentUser?.role || 'student',
      subject: subject.trim(),
      message: message.trim(),
      category,
      severity,
      status: 'open',
      createdAt: new Date().toISOString(),
      activeExamId: activeExam?.id,
    };

    addHelpTicket(newTicket);
    setTickets(getStoredHelpTickets());
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSubject('');
      setMessage('');
    }, 2000);
  };

  const userTickets = tickets.filter(
    (t) => t.userId === currentUser?.id || t.userEmail === currentUser?.email
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Examination Support & Helpdesk</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional Academic Proctoring Resolution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeExam && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Active Exam Session: <strong>{activeExam.courseCode}</strong> ({activeExam.title}). Tickets will be flagged as high priority to invigilators.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of inquiry or proctoring issue"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="technical">Technical / Hardware Check</option>
                  <option value="seb">Safe Exam Browser (SEB)</option>
                  <option value="grading_appeal">Grading & Mark Audit</option>
                  <option value="exam_access">Exam Room Admission</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="low">Standard Inquiry</option>
                  <option value="medium">Medium Urgency</option>
                  <option value="high">Critical (Active Examination)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Message & Description
              </label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the issue with error messages or exam details..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitted}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                submitted ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ticket Dispatched to Invigilator</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Support Request</span>
                </>
              )}
            </button>
          </form>

          {/* User's recent tickets */}
          {userTickets.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Your Support History ({userTickets.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {userTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{t.subject}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          t.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{t.message}</p>
                    {t.adminReply && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200">
                        <strong>Official Reply:</strong> {t.adminReply}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
