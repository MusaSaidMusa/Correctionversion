import React, { useState } from 'react';
import {
  Video,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Send,
  Ban,
  Eye,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  UserX,
} from 'lucide-react';
import { Exam, ExamSubmission, Question } from '../../types';

interface LiveProctorRoomProps {
  exam: Exam;
  submissions: ExamSubmission[];
  questions: Question[];
  onDismissIncident: (submissionId: string, incidentId: string) => void;
  onSendStudentWarning: (studentId: string, warning: string) => void;
  onForceSubmit: (submissionId: string) => void;
  onSaveOverride?: (submissionId: string, questionId: string, newPoints: number, reason: string) => void;
  onDataChanged?: () => void;
}

export const LiveProctorRoom: React.FC<LiveProctorRoomProps> = ({
  exam,
  submissions,
  questions,
  onDismissIncident,
  onSendStudentWarning,
  onForceSubmit,
}) => {
  const [warningText, setWarningText] = useState('');
  const [selectedStudentForWarning, setSelectedStudentForWarning] = useState<string>('all');
  const [sentNotice, setSentNotice] = useState(false);

  // Filter submissions for this exam
  const examSubmissions = submissions.filter((s) => s.examId === exam.id);
  const activeSubs = examSubmissions.filter((s) => s.status === 'in_progress');
  const completedSubs = examSubmissions.filter((s) => s.status !== 'in_progress');

  const handleSendWarning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningText.trim()) return;

    onSendStudentWarning(selectedStudentForWarning, warningText.trim());
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      setWarningText('');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Proctor Top Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Live Invigilation Room & Proctor Surveillance
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoring {exam.courseCode}: {exam.title} ({activeSubs.length} Active Candidates, {completedSubs.length} Concluded)
          </p>
        </div>

        {/* Broadcast Warning form */}
        <form onSubmit={handleSendWarning} className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedStudentForWarning}
            onChange={(e) => setSelectedStudentForWarning(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">Broadcast to All</option>
            {examSubmissions.map((s) => (
              <option key={s.studentId} value={s.studentId}>
                {s.studentName || s.studentId}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Direct warning message..."
            value={warningText}
            onChange={(e) => setWarningText(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1 md:w-60 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />

          <button
            type="submit"
            className={`px-3 py-1.5 text-xs font-bold rounded-xl text-white flex items-center gap-1 transition-colors cursor-pointer ${
              sentNotice ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {sentNotice ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
            <span>{sentNotice ? 'Sent' : 'Warn'}</span>
          </button>
        </form>
      </div>

      {/* Grid of Monitored Students */}
      {examSubmissions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <Video className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
            No Active Candidates in Exam Room
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Candidates who enter this exam room will stream live telemetry and proctor status here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {examSubmissions.map((sub) => {
            const isOngoing = sub.status === 'in_progress';
            const incidents = sub.incidents || [];
            const integrity = sub.integrityScore ?? 100;

            return (
              <div
                key={sub.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-xs transition-colors flex flex-col justify-between ${
                  sub.isTerminatedForBreach
                    ? 'border-rose-400 dark:border-rose-900 bg-rose-50/20'
                    : integrity < 70
                    ? 'border-amber-300 dark:border-amber-800'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  {/* Candidate Header Tile */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={sub.studentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                        alt={sub.studentName || 'Student'}
                        className="w-8 h-8 rounded-full object-cover border"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {sub.studentName || sub.studentId}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {sub.studentNumber || 'Candidate'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          sub.isTerminatedForBreach
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isOngoing
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {sub.isTerminatedForBreach ? 'Terminated' : isOngoing ? 'Active' : 'Submitted'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Webcam Video Feed Frame */}
                  <div className="relative mt-3 h-40 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                    <img
                      src={
                        sub.studentAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400'
                      }
                      alt="Candidate Stream"
                      className="w-full h-full object-cover opacity-80"
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>HD Live 30fps</span>
                    </div>

                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-white">
                      Integrity: {integrity}%
                    </div>
                  </div>

                  {/* Flagged Incidents Count */}
                  {incidents.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs">
                      <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Security Flags ({incidents.length})
                        </span>
                      </div>
                      <div className="mt-1 space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
                        {incidents.slice(0, 2).map((inc) => (
                          <div key={inc.id} className="flex items-center justify-between">
                            <span className="truncate max-w-[180px]">{inc.description}</span>
                            <button
                              onClick={() => onDismissIncident(sub.id, inc.id)}
                              className="text-[10px] underline hover:text-amber-950 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Invigilator Action Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSendStudentWarning(sub.studentId, 'Please keep your face centered and refrain from opening other tabs.');
                    }}
                    className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Send Warning</span>
                  </button>

                  {isOngoing && !sub.isTerminatedForBreach && (
                    <button
                      onClick={() => onForceSubmit(sub.id)}
                      className="py-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Force submit & terminate examination for breach of academic rules"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Terminate</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
