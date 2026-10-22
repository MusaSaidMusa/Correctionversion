import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Camera,
  Mic,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  Eye,
  LogOut,
  Maximize2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Radio,
  FileText,
  Clock,
  User,
  Activity,
  Layers,
  ChevronRight,
  Shield,
  ShieldCheck,
  HelpCircle,
  Megaphone,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import { Exam, ExamSubmission, Question, ProctorIncident } from '../../types';
import {
  getStoredSubmissions,
  saveSubmission,
  saveStoredSubmissions,
} from '../../services/storageService';

interface LiveProctorRoomProps {
  exam: Exam;
  submissions: ExamSubmission[];
  questions: Question[];
  onDismissIncident?: (subId: string, incidentId: string) => void;
  onSendStudentWarning: (studentId: string, text: string) => void;
  onForceSubmit: (subId: string) => void;
  onSaveOverride?: (
    submissionId: string,
    questionId: string,
    newPoints: number,
    reason: string
  ) => void;
  onClose?: () => void;
  onDataChanged?: () => void;
}

type CandidateFilter = 'all' | 'active' | 'flagged' | 'submitted';

export const LiveProctorRoom: React.FC<LiveProctorRoomProps> = ({
  exam,
  submissions: initialSubmissions,
  questions,
  onDismissIncident,
  onSendStudentWarning,
  onForceSubmit,
  onSaveOverride,
  onClose,
  onDataChanged,
}) => {
  const [liveSubmissions, setLiveSubmissions] = useState<ExamSubmission[]>(initialSubmissions);
  const [warningText, setWarningText] = useState<{ [studentId: string]: string }>({});
  const [actionNotice, setActionNotice] = useState<{ [studentId: string]: string }>({});
  const [filterStatus, setFilterStatus] = useState<CandidateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspect Live Candidate Workspace Modal
  const [inspectedCandidate, setInspectedCandidate] = useState<ExamSubmission | null>(null);

  // Broadcast announcement
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Live real-time polling and synchronization (updates every 2s for zero latency)
  useEffect(() => {
    const syncLiveTelemetry = () => {
      const stored = getStoredSubmissions();
      setLiveSubmissions(stored);
    };

    const interval = setInterval(syncLiveTelemetry, 2000);
    window.addEventListener('examguard_submissions_updated', syncLiveTelemetry);
    window.addEventListener('storage', syncLiveTelemetry);

    return () => {
      clearInterval(interval);
      window.removeEventListener('examguard_submissions_updated', syncLiveTelemetry);
      window.removeEventListener('storage', syncLiveTelemetry);
    };
  }, []);

  // Filter submissions for this specific exam
  const examSubmissions = useMemo(() => {
    return liveSubmissions.filter((s) => s.examId === exam.id);
  }, [liveSubmissions, exam.id]);

  // Applied filtering
  const filteredCandidates = useMemo(() => {
    return examSubmissions.filter((sub) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (sub.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.studentNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterStatus === 'active') return sub.status === 'in_progress';
      if (filterStatus === 'submitted') return sub.status === 'submitted' || sub.status === 'graded';
      if (filterStatus === 'flagged') {
        const incCount = (sub.incidents || []).length;
        const lowIntegrity = (sub.integrityScore ?? 100) < 85;
        return incCount > 0 || lowIntegrity;
      }
      return true;
    });
  }, [examSubmissions, filterStatus, searchQuery]);

  // Aggregate Metrics
  const activeCount = examSubmissions.filter((s) => s.status === 'in_progress').length;
  const submittedCount = examSubmissions.filter(
    (s) => s.status === 'submitted' || s.status === 'graded'
  ).length;
  const flaggedCount = examSubmissions.filter(
    (s) => (s.incidents || []).length > 0 || (s.integrityScore ?? 100) < 85
  ).length;
  const avgIntegrity =
    examSubmissions.length > 0
      ? Math.round(
          examSubmissions.reduce((acc, curr) => acc + (curr.integrityScore ?? 100), 0) /
            examSubmissions.length
        )
      : 100;

  // Warning Presets
  const WARNING_PRESETS = [
    '👁️ Keep your gaze centered on the examination screen.',
    '🔇 Silence background voices/noise in your room.',
    '🖥️ Return to fullscreen mode immediately.',
    '✋ Please keep your hands and desk visible in camera frame.',
  ];

  const handleSendWarning = (studentId: string, customText?: string) => {
    const text = customText || warningText[studentId] || 'Please remain focused on your examination window.';
    onSendStudentWarning(studentId, text);
    setWarningText((prev) => ({ ...prev, [studentId]: '' }));
    setActionNotice((prev) => ({ ...prev, [studentId]: 'Direct warning transmitted to candidate' }));
    setTimeout(() => {
      setActionNotice((prev) => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }, 4000);
  };

  // Toggle Exam Pause / Resume
  const handleTogglePause = (sub: ExamSubmission) => {
    const newPaused = !sub.isExamPaused;
    const subs = getStoredSubmissions();
    const idx = subs.findIndex((s) => s.id === sub.id);
    if (idx !== -1) {
      subs[idx] = {
        ...subs[idx],
        isExamPaused: newPaused,
        pauseReason: newPaused
          ? 'Invigilator has paused your session for live proctoring verification.'
          : undefined,
      };
      saveStoredSubmissions(subs);
      setLiveSubmissions(subs);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(newPaused ? 'examguard_pause_exam' : 'examguard_resume_exam', {
          detail: {
            studentId: sub.studentId,
            examId: sub.examId,
            reason: 'Invigilator paused session for live telemetry check.',
          },
        })
      );
    }

    setActionNotice((prev) => ({
      ...prev,
      [sub.studentId]: newPaused ? 'Examination timer paused for candidate' : 'Candidate examination resumed',
    }));
    setTimeout(() => {
      setActionNotice((prev) => {
        const copy = { ...prev };
        delete copy[sub.studentId];
        return copy;
      });
    }, 4000);
  };

  // Request 360 Environment Verification
  const handleRequestEnvironmentCheck = (sub: ExamSubmission) => {
    const subs = getStoredSubmissions();
    const idx = subs.findIndex((s) => s.id === sub.id);
    if (idx !== -1) {
      subs[idx] = {
        ...subs[idx],
        environmentCheckRequested: true,
      };
      saveStoredSubmissions(subs);
      setLiveSubmissions(subs);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examguard_environment_check', {
          detail: { studentId: sub.studentId, examId: sub.examId },
        })
      );
    }

    setActionNotice((prev) => ({
      ...prev,
      [sub.studentId]: '360° surroundings verification requested',
    }));
    setTimeout(() => {
      setActionNotice((prev) => {
        const copy = { ...prev };
        delete copy[sub.studentId];
        return copy;
      });
    }, 4000);
  };

  // Broadcast to All Active Sitting Candidates
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastDraft.trim()) return;

    onSendStudentWarning('all', broadcastDraft.trim());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examguard_student_warning', {
          detail: { studentId: 'all', text: broadcastDraft.trim() },
        })
      );
    }

    setBroadcastSuccess('Announcement broadcasted to all active examination candidates.');
    setBroadcastDraft('');
    setTimeout(() => {
      setBroadcastSuccess(null);
      setIsBroadcastOpen(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Cockpit Top Bar */}
      <div className="p-6 rounded-3xl bg-slate-950 border border-indigo-900/60 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 -ml-5" />
            <span>REAL-TIME BIOMETRIC PROCTORING COCKPIT · ACTIVE</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {exam.courseCode}: {exam.title}
          </h2>
          <p className="text-xs text-slate-400">
            Live candidate activity, gaze tracking, answer progress, and direct telemetry interventions
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsBroadcastOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Megaphone className="w-4 h-4 text-cyan-300" />
            <span>Broadcast Announcement</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Proctor Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Aggregate Telemetry Pulse Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Sitting Now
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {activeCount} Candidates
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Avg Integrity
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {avgIntegrity}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Flagged Incidents
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {flaggedCount} Candidates
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Completed Papers
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {submittedCount} Submitted
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Candidates ({examSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterStatus === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Sitting ({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('flagged')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'flagged'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Flagged Alerts ({flaggedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('submitted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterStatus === 'submitted'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Submitted ({submittedCount})
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name or Adm No..."
            className="pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 w-full sm:w-56 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid of Candidates Real-Time Feed */}
      {filteredCandidates.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-40 text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Candidates Match Filter
          </h3>
          <p className="text-xs mt-1">
            There are currently no candidates matching the active filter or search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((sub) => {
            const incidents = sub.incidents || [];
            const hasHighSeverity = incidents.some((i) => i.severity === 'high');
            const isPaused = sub.isExamPaused;
            const isSitting = sub.status === 'in_progress';

            const answeredCount = Object.keys(sub.answers || {}).filter(
              (qId) =>
                sub.answers[qId]?.textAnswer ||
                sub.answers[qId]?.selectedOptionId ||
                (sub.answers[qId]?.selectedOptionIds && sub.answers[qId].selectedOptionIds!.length > 0)
            ).length;
            const totalQuestionsCount = exam.questions?.length || questions.length || 10;
            const progressPercent = Math.round((answeredCount / totalQuestionsCount) * 100);

            // Real-time current question title
            const currentQIndex = sub.currentQuestionIndex ?? 0;
            const currentQPrompt =
              sub.currentQuestionPrompt ||
              exam.questions?.[currentQIndex]?.prompt ||
              `Question ${currentQIndex + 1}`;

            return (
              <div
                key={sub.id}
                className={`rounded-3xl border overflow-hidden bg-white dark:bg-slate-900 shadow-md transition-all flex flex-col justify-between ${
                  isPaused
                    ? 'border-amber-500 ring-2 ring-amber-500/30'
                    : hasHighSeverity
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <div>
                  {/* Candidate Simulated Live Webcam Box */}
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {/* Simulated live video stream with raster scan */}
                    <div className="absolute inset-0 bg-radial from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4">
                      {sub.studentAvatar ? (
                        <img
                          src={sub.studentAvatar}
                          alt={sub.studentName}
                          className="w-20 h-20 rounded-full object-cover border-2 border-indigo-400 shadow-lg mb-1.5"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500 flex items-center justify-center mb-1.5 text-indigo-300 font-bold text-xl">
                          {sub.studentName?.[0] || 'S'}
                        </div>
                      )}

                      {/* Animated Bounding Box for Facial Detection */}
                      <div className="w-28 h-28 border border-emerald-400/80 rounded-2xl absolute flex items-start justify-between p-1 pointer-events-none">
                        <span className="w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
                        <span className="w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
                      </div>

                      <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 mt-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>LIVE 1080p HD FEED</span>
                      </div>
                    </div>

                    {/* Telemetry Overlays */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/85 backdrop-blur-xs rounded-lg text-[10px] text-white font-mono">
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>{sub.studentNumber || 'ADM-CS'}</span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/85 backdrop-blur-xs rounded-lg text-[10px] font-bold font-mono">
                      <span
                        className={
                          (sub.integrityScore ?? 100) >= 90
                            ? 'text-emerald-400'
                            : (sub.integrityScore ?? 100) >= 70
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }
                      >
                        {sub.integrityScore ?? 100}% INTEGRITY
                      </span>
                    </div>

                    {/* Status Pill in Video Bottom */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] text-slate-300 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-xl">
                      <span className="font-bold truncate text-white">{sub.studentName}</span>
                      <span
                        className={`capitalize font-bold px-1.5 py-0.5 rounded ${
                          isPaused
                            ? 'bg-amber-500/20 text-amber-400'
                            : isSitting
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isPaused ? 'PAUSED' : isSitting ? 'SITTING NOW' : 'SUBMITTED'}
                      </span>
                    </div>
                  </div>

                  {/* REAL-TIME CANDIDATE ACTIVITY SECTION ("What candidate is doing right now") */}
                  <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span>Real-Time Invigilator Tracker</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {sub.lastHeartbeatAt
                          ? `Heartbeat: ${new Date(sub.lastHeartbeatAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                          : 'Live pulse'}
                      </span>
                    </div>

                    {/* Active Question Banner */}
                    <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-bold">
                        <span>CURRENTLY SOLVING:</span>
                        <span>Question {currentQIndex + 1} of {totalQuestionsCount}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {currentQPrompt}
                      </div>
                    </div>

                    {/* Answer Progress & Keystroke Velocity */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Answer Progress:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {answeredCount} / {totalQuestionsCount} answered ({progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${progressPercent}%` }}
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>

                    {/* Live Physical Telemetry Badges */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-slate-400">Eye Gaze:</span>
                        <span
                          className={`font-bold ${
                            sub.activeGazeState === 'looking_away'
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {sub.activeGazeState === 'looking_away' ? 'Looking Away' : 'Centered'}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-slate-400">Window Focus:</span>
                        <span
                          className={`font-bold ${
                            sub.activeWindowFocus === 'tab_switched'
                              ? 'text-rose-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {sub.activeWindowFocus === 'tab_switched' ? 'Tab Switched' : 'In Fullscreen'}
                        </span>
                      </div>
                    </div>

                    {/* Inspect Live Draft Button */}
                    <button
                      type="button"
                      onClick={() => setInspectedCandidate(sub)}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Inspect Live Candidate Draft & Answers</span>
                    </button>
                  </div>

                  {/* Incidents Telemetry Log */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Proctor Security Flags
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          incidents.length > 0
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}
                      >
                        {incidents.length} Flagged
                      </span>
                    </div>

                    {incidents.length > 0 ? (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto">
                        {incidents.slice(0, 3).map((inc) => (
                          <div
                            key={inc.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] flex items-start justify-between gap-2"
                          >
                            <div className="flex items-start gap-1.5 min-w-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 text-slate-700 dark:text-slate-300">
                                {inc.description}
                              </span>
                            </div>
                            {onDismissIncident && (
                              <button
                                type="button"
                                onClick={() => onDismissIncident(sub.id, inc.id)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-center text-[11px] text-slate-400 italic">
                        Clean telemetry. No suspicious movements detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Invigilator Intervention Controls */}
                <div className="p-4 pt-0 space-y-2.5 border-t border-slate-100 dark:border-slate-800 mt-2">
                  {/* Real-time Action Feedback banner */}
                  {actionNotice[sub.studentId] && (
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>{actionNotice[sub.studentId]}</span>
                    </div>
                  )}

                  {/* Warning Input Box */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={warningText[sub.studentId] || ''}
                      onChange={(e) =>
                        setWarningText((prev) => ({ ...prev, [sub.studentId]: e.target.value }))
                      }
                      placeholder="Transmit direct warning directive..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendWarning(sub.studentId)}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors cursor-pointer"
                      title="Transmit urgent warning directive to candidate"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Preset Directive Chips */}
                  <div className="flex flex-wrap gap-1">
                    {WARNING_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendWarning(sub.studentId, preset)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                      >
                        {preset.slice(0, 24)}...
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons: Pause/Resume, 360 Verification, Force Submit */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePause(sub)}
                      className={`py-1.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        isPaused
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRequestEnvironmentCheck(sub)}
                      className="py-1.5 rounded-xl text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                      title="Request 360 physical room scan"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>360° Scan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onForceSubmit(sub.id)}
                      className="py-1.5 rounded-xl text-[10px] font-bold bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Submit</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: INSPECT LIVE CANDIDATE WORKSPACE & ANSWERS */}
      {inspectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <img
                  src={
                    inspectedCandidate.studentAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={inspectedCandidate.studentName}
                  className="w-10 h-10 rounded-full object-cover border border-indigo-400"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {inspectedCandidate.studentName} · Live Candidate Workspace
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {inspectedCandidate.studentNumber || 'Candidate ID'} · Attempt {inspectedCandidate.attemptNumber || 1}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              {/* Telemetry Summary Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Integrity Score</span>
                  <span className="text-lg font-bold font-mono text-emerald-500">
                    {inspectedCandidate.integrityScore ?? 100}%
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Keystrokes Typed</span>
                  <span className="text-lg font-bold font-mono text-indigo-500">
                    {inspectedCandidate.keystrokesCount ?? 142}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Active Focus</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-white capitalize">
                    {inspectedCandidate.activeWindowFocus || 'Focused'}
                  </span>
                </div>
              </div>

              {/* Real-time Draft Snippet */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Live Draft Response Preview (Current Question):
                </label>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 min-h-[90px]">
                  {inspectedCandidate.liveDraftPreview ||
                    'Candidate is currently formulating response or solving multiple-choice prompt.'}
                </div>
              </div>

              {/* Complete Answers Snapshot */}
              <div className="space-y-2 pt-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Draft Answer Sheet Snapshot:
                </label>
                <div className="space-y-2">
                  {Object.entries(inspectedCandidate.answers || {}).map(([qId, ans], idx) => (
                    <div
                      key={qId}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span>Question #{idx + 1}</span>
                        <span>{ans.timeSpentSeconds ? `${ans.timeSpentSeconds}s elapsed` : 'Recorded'}</span>
                      </div>
                      <div className="font-sans text-slate-800 dark:text-slate-200">
                        {ans.textAnswer || (ans.selectedOptionId ? `Selected option ID: ${ans.selectedOptionId}` : 'Answer draft stored')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedCandidate(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST ANNOUNCEMENT TO ALL CANDIDATES */}
      {isBroadcastOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Broadcast Announcement to Examination Cohort
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instantly transmits a high-priority alert to all candidates actively sitting for this paper
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsBroadcastOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-6 space-y-4 text-xs">
              {broadcastSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{broadcastSuccess}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Announcement Message
                </label>
                <textarea
                  required
                  rows={3}
                  value={broadcastDraft}
                  onChange={(e) => setBroadcastDraft(e.target.value)}
                  placeholder="e.g. Attention candidates: 30 minutes remaining. Please ensure all question parts are answered before submission..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
