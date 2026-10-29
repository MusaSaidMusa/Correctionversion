import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  FileText,
  Search,
  ChevronRight,
  Sparkles,
  BookOpen,
  Award,
  DoorOpen,
  AlertTriangle,
  Lock,
  LifeBuoy,
  User,
  GraduationCap,
  Building2,
  CheckCheck,
  FolderArchive,
} from 'lucide-react';
import { Exam, ExamSubmission, StudentProfile } from '../../types';
import { PreExamDiagnosticModal } from './PreExamDiagnosticModal';
import { ExamResultsModal } from './ExamResultsModal';
import { ExamWaitingRoomModal } from './ExamWaitingRoomModal';
import { StudentAnswerSheetModal } from './StudentAnswerSheetModal';
import { ProfileDetailModal } from '../common/ProfileDetailModal';
import { ExaminationPaperModal } from '../common/ExaminationPaperModal';
import { OfficialMarkingSchemeModal } from '../common/OfficialMarkingSchemeModal';
import { PastPapersSection } from '../common/PastPapersSection';
import { getActiveInProgressExamForStudent } from '../../services/storageService';

interface StudentDashboardProps {
  student: StudentProfile;
  exams: Exam[];
  submissions: ExamSubmission[];
  onStartExam: (exam: Exam) => void;
  onResumeExam: (exam: Exam, submission: ExamSubmission) => void;
  onOpenHelp?: () => void;
  resetKey?: number;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  student,
  exams,
  submissions,
  onStartExam,
  onResumeExam,
  onOpenHelp,
  resetKey,
}) => {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'upcoming' | 'completed' | 'pastpapers'>('all');
  const [selectedDiagnosticExam, setSelectedDiagnosticExam] = useState<Exam | null>(null);
  const [waitingRoomExam, setWaitingRoomExam] = useState<Exam | null>(null);
  const [selectedResultExam, setSelectedResultExam] = useState<{
    exam: Exam;
    submission: ExamSubmission;
  } | null>(null);

  // Times New Roman Answer Sheet modal state
  const [viewingAnswerSheetTarget, setViewingAnswerSheetTarget] = useState<{
    exam: Exam;
    submission: ExamSubmission;
  } | null>(null);

  // Official Examination Paper and Marking Scheme Modals
  const [viewingQuestionPaperExam, setViewingQuestionPaperExam] = useState<Exam | null>(null);
  const [viewingMarkingSchemeExam, setViewingMarkingSchemeExam] = useState<Exam | null>(null);

  // Profile modal state for candidate or invigilator click
  const [selectedProfileModal, setSelectedProfileModal] = useState<{
    type: 'student' | 'teacher';
    id: string;
  } | null>(null);

  // Selected Examination state to sit for
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Reset all selections and modals when resetKey changes (e.g. logo clicked)
  useEffect(() => {
    setSelectedExamId(null);
    setSelectedDiagnosticExam(null);
    setWaitingRoomExam(null);
    setSelectedResultExam(null);
    setViewingAnswerSheetTarget(null);
    setViewingQuestionPaperExam(null);
    setViewingMarkingSchemeExam(null);
    setSelectedProfileModal(null);
    setFilter('all');
  }, [resetKey]);

  // Backend Synchronized Student Portal Information for Hue Section & Interactive Cards
  const [studentBackendStats, setStudentBackendStats] = useState<{
    studentNumber: string;
    department: string;
    faculty: string;
    program: string;
    academicStanding: string;
    gpa: string;
    creditsCompleted: number;
    attendanceRate: string;
    clearanceStatus: string;
    enrolledCourseCodes: string[];
  }>({
    studentNumber: student.studentNumber || 'ADM-CS-2026-084',
    department: student.department || 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Computer Science (Honors)',
    academicStanding: "Dean's Honor Roll · Academic Distinction",
    gpa: '3.92 / 4.00',
    creditsCompleted: 88,
    attendanceRate: '98.5%',
    clearanceStatus: 'Verified & Cleared for Invigilation',
    enrolledCourseCodes: student.enrolledCourseCodes,
  });
  const [isBackendLoaded, setIsBackendLoaded] = useState(false);

  // Fetch verified academic credentials & stats from backend API
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/student-portal/stats/${encodeURIComponent(student.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Backend stats fetch failed');
        return res.json();
      })
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setStudentBackendStats(json.data);
          setIsBackendLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('[StudentDashboard] Backend stats fetch fallback note:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [student.id]);

  // Active exam concurrency restriction conflict state
  const [conflictNotice, setConflictNotice] = useState<{
    courseCode: string;
    examTitle: string;
    existingExam?: Exam;
    existingSub?: ExamSubmission;
  } | null>(null);

  // Filter exams enrolled by student (via course code or explicit registration)
  const studentExams = exams.filter(
    (e) =>
      student.enrolledCourseCodes.includes(e.courseCode) ||
      e.registeredStudentIds?.includes(student.id) ||
      e.courseCode === 'ALL'
  );

  // Categorize
  const categorized = studentExams.map((exam) => {
    const sub = submissions.find((s) => s.examId === exam.id && s.studentId === student.id);
    const now = new Date().getTime();
    const start = new Date(exam.scheduledStartTime).getTime();
    const end = new Date(exam.scheduledEndTime).getTime();

    let statusType: 'in_progress' | 'completed' | 'active_now' | 'upcoming' | 'expired' =
      'upcoming';

    if (sub?.status === 'submitted' || sub?.status === 'graded') {
      statusType = 'completed';
    } else if (sub?.status === 'in_progress') {
      statusType = 'in_progress';
    } else if (now >= start && now <= end) {
      statusType = 'active_now';
    } else if (now < start) {
      statusType = 'upcoming';
    } else {
      statusType = 'expired';
    }

    return {
      exam,
      sub,
      statusType,
    };
  });

  const filteredExams = categorized.filter((item) => {
    if (filter === 'ongoing')
      return item.statusType === 'active_now' || item.statusType === 'in_progress';
    if (filter === 'upcoming') return item.statusType === 'upcoming';
    if (filter === 'completed') return item.statusType === 'completed';
    return true;
  });

  const selectedExamForSitting = studentExams.find((e) => e.id === selectedExamId);

  // Flow: Check conflict -> Hardware diagnostics / Waiting Room
  const handleInitiateExam = (exam: Exam) => {
    // ENFORCE: "A Student cannot take more than one examination at ago within the same period."
    const conflict = getActiveInProgressExamForStudent(student.id, exam.id);
    if (conflict) {
      const existingExam = exams.find((e) => e.id === conflict.examId);
      const existingSub = submissions.find(
        (s) => s.examId === conflict.examId && s.studentId === student.id
      );
      setConflictNotice({
        courseCode: conflict.courseCode,
        examTitle: conflict.examTitle,
        existingExam,
        existingSub,
      });
      return;
    }

    // Open Pre-Exam Check first, which then transitions to Waiting Room
    setSelectedDiagnosticExam(exam);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Student Welcome Banner (Hue Section) */}
      <div
        className="relative rounded-2xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row md:items-end justify-between gap-6 border border-indigo-700/60 overflow-hidden bg-slate-900 min-h-[220px] md:min-h-[250px]"
        style={{
          backgroundImage: "url('/campus-hero-banner.jpg')",
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Subtle foreground gradient on the left, keeping celebration students in clear visibility */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-blue-950/40 via-40% to-transparent to-65% pointer-events-none z-0"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-2.5 max-w-xl pb-1 md:pb-3">
          <div className="flex flex-wrap items-center gap-2 text-indigo-300 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-cyan-300 font-semibold border border-indigo-700/80 backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{studentBackendStats.faculty}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-cyan-300 font-bold drop-shadow-xs">{studentBackendStats.studentNumber}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-300 font-medium drop-shadow-xs italic">"Impacting lives since 1953"</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
              Candidate Portal:
            </h1>
            <button
              type="button"
              onClick={() => setSelectedProfileModal({ type: 'student', id: student.id })}
              className="text-2xl md:text-3xl font-extrabold tracking-tight text-white hover:text-cyan-300 underline underline-offset-4 decoration-indigo-400 cursor-pointer flex items-center gap-1.5 transition-colors drop-shadow-md"
              title="Click to fetch and inspect verified candidate profile from backend"
            >
              <span>{student.name}</span>
              <User className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          <p className="text-xs md:text-sm text-slate-100 max-w-xl leading-relaxed drop-shadow-xs">
            Welcome back, {student.name}. Your enrolled examination sessions, real-time proctoring clearances, and certified academic results are maintained by the Institutional Assessment Directorate.
          </p>
        </div>

        {/* Quick summary metric cards positioned slightly at the bottom of the Hue */}
        <div className="relative z-10 md:absolute md:bottom-4 md:right-6 flex items-center gap-2.5 mt-4 md:mt-0 shrink-0">
          <div className="p-2.5 bg-slate-900/75 backdrop-blur-md rounded-xl border border-white/20 text-center min-w-[85px] shadow-sm">
            <div className="text-lg font-bold font-mono text-cyan-300">
              {
                categorized.filter(
                  (c) => c.statusType === 'active_now' || c.statusType === 'in_progress'
                ).length
              }
            </div>
            <div className="text-[10px] text-slate-200 font-medium">Active Now</div>
          </div>
          <div className="p-2.5 bg-slate-900/75 backdrop-blur-md rounded-xl border border-white/20 text-center min-w-[85px] shadow-sm">
            <div className="text-lg font-bold font-mono text-emerald-300">
              {categorized.filter((c) => c.statusType === 'completed').length}
            </div>
            <div className="text-[10px] text-slate-200 font-medium">Completed</div>
          </div>
          <div className="p-2.5 bg-slate-900/75 backdrop-blur-md rounded-xl border border-white/20 text-center min-w-[85px] shadow-sm">
            <div className="text-lg font-bold font-mono text-amber-300">
              {categorized.filter((c) => c.statusType === 'upcoming').length}
            </div>
            <div className="text-[10px] text-slate-200 font-medium">Upcoming</div>
          </div>
        </div>
      </div>

      {/* 4 INTERACTIVE STUDENT INFORMATION CARDS (Fetchable from Backend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Academic Standing & Cumulative GPA */}
        <button
          type="button"
          onClick={() => setSelectedProfileModal({ type: 'student', id: student.id })}
          className="group p-5 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
          title="Click to view full verified academic transcript and honors breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
              Academic Standing
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              {studentBackendStats.gpa}
            </span>
          </div>
          <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-300 font-semibold truncate">
            {studentBackendStats.academicStanding}
          </div>
          <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{studentBackendStats.creditsCompleted} ECTS Earned</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 2: Institutional Registry & Degree Program */}
        <button
          type="button"
          onClick={() => setSelectedProfileModal({ type: 'student', id: student.id })}
          className="group p-5 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
          title="Click to inspect verified departmental enrollment and degree program"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
              Admission Registry
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
              {studentBackendStats.studentNumber}
            </span>
          </div>
          <div className="mt-1 text-xs text-indigo-700 dark:text-indigo-300 font-medium truncate">
            {studentBackendStats.program}
          </div>
          <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{student.enrolledCourseCodes.length} Enrolled Courses</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Registry <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 3: Invigilation Clearance & Attendance Rate */}
        <button
          type="button"
          onClick={() => {
            const firstExam = studentExams[0];
            if (firstExam) {
              setSelectedDiagnosticExam(firstExam);
            }
          }}
          className="group p-5 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-100/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
          title="Click to test camera, microphone, and Safe Exam Browser diagnostics"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              Proctor Clearance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-900 dark:text-emerald-300">
              {studentBackendStats.attendanceRate}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Attendance
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 font-medium truncate flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>{studentBackendStats.clearanceStatus}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Hardware SEB Guard Active</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Test your systems compabililty and sit this Examination <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Card 4: Examination Results & Portal Releases */}
        <button
          type="button"
          onClick={() => {
            const completedItem = categorized.find((c) => c.statusType === 'completed' && c.sub);
            if (completedItem && completedItem.sub) {
              setSelectedResultExam({ exam: completedItem.exam, submission: completedItem.sub });
            } else {
              setFilter('completed');
            }
          }}
          className="group p-5 bg-gradient-to-br from-cyan-50/90 via-white to-cyan-100/40 dark:from-cyan-950/40 dark:via-slate-900 dark:to-cyan-950/20 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
          title="Click to view certified results and official protected Times New Roman answer sheets"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider font-mono">
              Committed Results
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white">
              {submissions.filter((s) => s.studentId === student.id && s.isResultCommitted).length}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
              of {categorized.filter((c) => c.statusType === 'completed').length} Completed
            </span>
          </div>
          <div className="mt-1 text-xs text-cyan-700 dark:text-cyan-300 font-medium truncate">
            {submissions.some((s) => s.studentId === student.id && s.isResultCommitted)
              ? 'Results Officially Released by Faculty'
              : 'Awaiting Faculty Commitment'}
          </div>
          <div className="mt-2 pt-2 border-t border-cyan-100 dark:border-cyan-900 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Official Answer Sheets</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Centralized Exam Schedule (The Hub) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Centralized Exam Schedule
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an examination below to sit for your test. You will wait in the lobby until your instructor admits you and provides your exam passcode.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 border-transparent'
              }`}
            >
              All Enrolled ({studentExams.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('ongoing')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                filter === 'ongoing'
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 border-transparent'
              }`}
            >
              Active / Ready
            </button>
            <button
              type="button"
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                filter === 'upcoming'
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 border-transparent'
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                filter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 border-transparent'
              }`}
            >
              Completed
            </button>
            <button
              type="button"
              onClick={() => setFilter('pastpapers')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border ${
                filter === 'pastpapers'
                  ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200 border-transparent'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Past Papers ({exams.length})</span>
            </button>
          </div>
        </div>

        {/* Selected Examination Sitting Panel */}
        {selectedExamForSitting && (
          <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-2xl border-2 border-indigo-500 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 border border-indigo-400/40 flex items-center justify-center font-black font-mono text-base text-white shadow-sm shrink-0">
                {selectedExamForSitting.courseCode.slice(0, 4)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Selected to Sit</span>
                  </span>
                  <span className="text-indigo-300 font-bold">{selectedExamForSitting.courseCode}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300 font-medium">{selectedExamForSitting.durationMinutes} Minutes</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-cyan-300">Passing: {selectedExamForSitting.passingScorePercentage}%</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1">
                  {selectedExamForSitting.title}
                </h3>
                <p className="text-xs text-indigo-200 line-clamp-1 mt-0.5">
                  Invigilator: {selectedExamForSitting.instructorName} · Strict Automated Proctoring (Camera · Mic · SEB)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleInitiateExam(selectedExamForSitting)}
                className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                <span>Test your systems compabililty and sit this Examination</span>
              </button>
            </div>
          </div>
        )}

        {/* Exams List or Past Papers Archive */}
        {filter === 'pastpapers' ? (
          <PastPapersSection
            exams={exams}
            onOpenQuestionPaper={(exam) => setViewingQuestionPaperExam(exam)}
            onOpenMarkingScheme={(exam) => setViewingMarkingSchemeExam(exam)}
            onStartPractice={(exam) => handleInitiateExam(exam)}
            userRole="student"
            studentSubmissions={submissions.filter((s) => s.studentId === student.id)}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExams.map(({ exam, sub, statusType }) => {
            const startDate = new Date(exam.scheduledStartTime);
            const endDate = new Date(exam.scheduledEndTime);
            const isSelected = selectedExamId === exam.id;

            return (
              <div
                key={exam.id}
                onClick={() => setSelectedExamId(isSelected ? null : exam.id)}
                className={`rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-2 border-emerald-500 dark:border-emerald-400 ring-4 ring-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md'
                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/25 dark:hover:bg-sky-950/20 hover:shadow-md'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {/* Exam Selection Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(isSelected ? null : exam.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-sky-100 hover:text-sky-900 hover:border-sky-300 dark:hover:bg-sky-950/50 dark:hover:text-sky-200'
                      }`}
                      title="Click to select this examination"
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-white bg-emerald-600' : 'border-slate-400'}`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span>{isSelected ? 'Selected Examination' : 'Select Examination'}</span>
                    </button>

                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {exam.courseCode}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-600 dark:text-slate-400">{exam.courseTitle}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-500 font-semibold">{exam.durationMinutes} Mins</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold font-mono">
                      Set Out Of: {exam.questions.reduce((s, q) => s + (q.points || 0), 0)} Marks ({exam.questions.length} Questions)
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <div className="flex items-center gap-1 text-slate-500 font-medium">
                      <span>Invigilator:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProfileModal({
                            type: 'teacher',
                            id: exam.instructorEmail || exam.instructorName,
                          });
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold underline underline-offset-2 decoration-slate-300 cursor-pointer transition-colors"
                        title="Click to fetch instructor profile & appointment from backend"
                      >
                        {exam.instructorName}
                      </button>
                    </div>
                    {exam.securityProtocols?.requireSEB && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> SEB Browser Required
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {exam.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Window: {startDate.toLocaleDateString()}{' '}
                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Pass: {exam.passingScorePercentage}% · Max Attempts: {exam.maxAttempts || 1}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded font-semibold border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>Mandatory Strict Proctoring: Camera · Microphone · SEB</span>
                    </span>
                  </div>
                </div>

                {/* Right Status Badge & Primary Action Button */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800"
                >
                  {/* Status indicator & Portal Commitment Badge */}
                  {statusType === 'completed' && (
                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {sub?.status === 'graded'
                            ? `Graded: ${sub?.score ?? 0} / ${sub?.totalPoints ?? 100} Marks`
                            : `Submitted (${sub?.score ?? 0}/${sub?.totalPoints ?? 100} Marks)`}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono">
                        {sub?.isResultCommitted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 justify-end">
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Certified by Faculty</span>
                          </span>
                        ) : sub?.status === 'graded' ? (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 justify-end">
                            <Award className="w-3.5 h-3.5" />
                            <span>Graded by Instructor</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Pending Faculty Marking
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {statusType === 'in_progress' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 animate-pulse">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>In Progress · Saved</span>
                    </div>
                  )}

                  {statusType === 'active_now' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Active · Ready to Sit</span>
                    </div>
                  )}

                  {statusType === 'upcoming' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span>Scheduled for {startDate.toLocaleDateString()}</span>
                    </div>
                  )}

                  {statusType === 'expired' && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Exam Window Closed</span>
                    </div>
                  )}

                  {/* Functional Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {statusType === 'completed' && sub && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedResultExam({ exam, submission: sub })}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Scorecard</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingAnswerSheetTarget({ exam, submission: sub })}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          title="Open official Times New Roman 12pt answer sheet (Protected Candidate View)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Answer Sheet</span>
                        </button>
                      </>
                    )}

                    {/* Question Paper in Times New Roman 12pt format - STRICTLY INVISIBLE until student submits work */}
                    {sub && (sub.status === 'submitted' || sub.status === 'graded') && (
                      <button
                        type="button"
                        onClick={() => setViewingQuestionPaperExam(exam)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                        title="View & download official examination paper in Times New Roman 12pt format (.doc/print)"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Question Paper (.doc)</span>
                      </button>
                    )}

                    {/* Marking Scheme button (only visible if released by teacher AND student has submitted work) */}
                    {exam.isMarkingSchemeReleased && sub && (sub.status === 'submitted' || sub.status === 'graded') && (
                      <button
                        type="button"
                        onClick={() => setViewingMarkingSchemeExam(exam)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700 transition-colors cursor-pointer"
                        title="View & download official marking scheme in Times New Roman 12pt format (.doc/print)"
                      >
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Marking Scheme</span>
                      </button>
                    )}

                    {statusType === 'in_progress' && sub && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExamId(exam.id);
                          onResumeExam(exam, sub);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Resume Examination</span>
                      </button>
                    )}

                    {(statusType === 'active_now' || statusType === 'upcoming') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExamId(exam.id);
                          handleInitiateExam(exam);
                        }}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Test your systems compabililty and sit this Examination</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Pre-Exam Diagnostic Modal */}
      {selectedDiagnosticExam && (
        <PreExamDiagnosticModal
          exam={selectedDiagnosticExam}
          student={student}
          isOpen={true}
          onClose={() => setSelectedDiagnosticExam(null)}
          onReadyToStart={() => {
            const examToEnter = selectedDiagnosticExam;
            setSelectedDiagnosticExam(null);

            // Re-verify no concurrent exam conflict before entering waiting room
            const conflict = getActiveInProgressExamForStudent(student.id, examToEnter.id);
            if (conflict) {
              const existingExam = exams.find((e) => e.id === conflict.examId);
              const existingSub = submissions.find(
                (s) => s.examId === conflict.examId && s.studentId === student.id
              );
              setConflictNotice({
                courseCode: conflict.courseCode,
                examTitle: conflict.examTitle,
                existingExam,
                existingSub,
              });
              return;
            }

            // Successfully open waiting room
            setWaitingRoomExam(examToEnter);
          }}
        />
      )}

      {/* Exam Waiting Room Modal (Waiting for teacher admission + password verification) */}
      {waitingRoomExam && (
        <ExamWaitingRoomModal
          exam={waitingRoomExam}
          student={student}
          isOpen={true}
          onClose={() => setWaitingRoomExam(null)}
          onAdmittedAndUnlocked={() => {
            const examToStart = waitingRoomExam;
            setWaitingRoomExam(null);
            onStartExam(examToStart);
          }}
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* Results Modal */}
      {selectedResultExam && (
        <ExamResultsModal
          exam={selectedResultExam.exam}
          submission={selectedResultExam.submission}
          isOpen={true}
          onClose={() => setSelectedResultExam(null)}
        />
      )}

      {/* MODAL: CONCURRENT EXAM RESTRICTION CONFLICT */}
      {conflictNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Active Examination Restriction
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Under strict institutional testing policy, a student{' '}
                <strong className="text-rose-600 dark:text-rose-400">
                  cannot take more than one examination at once within the same period
                </strong>
                .
              </p>
            </div>

            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1 text-left font-mono">
              <div className="text-[11px] text-rose-700 dark:text-rose-300 font-bold uppercase">
                Active Session Detected:
              </div>
              <div className="font-bold text-slate-900 dark:text-white">
                {conflictNotice.courseCode} · {conflictNotice.examTitle}
              </div>
              <div className="text-[11px] text-slate-500">Status: In Progress / Unsubmitted</div>
            </div>

            <div className="space-y-2 pt-2">
              {conflictNotice.existingExam && conflictNotice.existingSub && (
                <button
                  type="button"
                  onClick={() => {
                    const ex = conflictNotice.existingExam!;
                    const sub = conflictNotice.existingSub!;
                    setConflictNotice(null);
                    onResumeExam(ex, sub);
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Resume Active Exam ({conflictNotice.courseCode})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setConflictNotice(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Dismiss & Stay on Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Times New Roman 12pt Answer Sheet Modal */}
      {viewingAnswerSheetTarget && (
        <StudentAnswerSheetModal
          isOpen={true}
          onClose={() => setViewingAnswerSheetTarget(null)}
          exam={viewingAnswerSheetTarget.exam}
          submission={viewingAnswerSheetTarget.submission}
          isStudent={true}
        />
      )}

      {/* Official Times New Roman 12pt Examination Paper Modal */}
      {viewingQuestionPaperExam && (
        <ExaminationPaperModal
          isOpen={true}
          onClose={() => setViewingQuestionPaperExam(null)}
          exam={viewingQuestionPaperExam}
          userRole="student"
          canDownload={false}
        />
      )}

      {/* Official Times New Roman 12pt Marking Scheme Modal */}
      {viewingMarkingSchemeExam && (
        <OfficialMarkingSchemeModal
          isOpen={true}
          onClose={() => setViewingMarkingSchemeExam(null)}
          exam={viewingMarkingSchemeExam}
          userRole="student"
          canDownload={false}
        />
      )}

      {/* Verified Academic Profile Modal (Candidate or Invigilator) */}
      {selectedProfileModal && (
        <ProfileDetailModal
          isOpen={true}
          onClose={() => setSelectedProfileModal(null)}
          targetType={selectedProfileModal.type}
          targetId={selectedProfileModal.id}
        />
      )}
    </div>
  );
};
