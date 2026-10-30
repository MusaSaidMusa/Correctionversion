import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  ShieldCheck,
  Eye,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Users,
  BarChart3,
  BookOpen,
  Camera,
  FileSpreadsheet,
  FileText,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Key,
  ShieldAlert,
  Edit3,
  ExternalLink,
  ChevronRight,
  Filter,
  DoorOpen,
  Sparkles,
  Award,
  Upload,
  Send,
  CheckCheck,
  BadgeCheck,
  User,
  Building2,
  Printer,
  FileCheck,
  GraduationCap,
  FolderArchive,
} from 'lucide-react';
import {
  Exam,
  Question,
  ExamSubmission,
  StudentProfile,
  TeacherProfile,
} from '../../types';
import { ExamCreatorModal } from './ExamCreatorModal';
import { ExamQuestionsManagerModal } from './ExamQuestionsManagerModal';
import { LiveProctorRoom } from './LiveProctorRoom';
import { TeacherAnalyticsView } from './TeacherAnalyticsView';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { SubmissionDetailModal } from './SubmissionDetailModal';
import { ManualMarkingModal } from './ManualMarkingModal';
import { ExamAdmissionModal } from './ExamAdmissionModal';
import { downloadSebConfigFile } from '../../services/sebService';
import {
  commitSubmissionResult,
  commitAllExamResults,
  getWaitingRoomStudents,
  registerStudentToWaitingRoom,
} from '../../services/storageService';
import { StudentAnswerSheetModal } from '../student/StudentAnswerSheetModal';
import { ProfileDetailModal } from '../common/ProfileDetailModal';
import { ExaminationPaperModal } from '../common/ExaminationPaperModal';
import { OfficialMarkingSchemeModal } from '../common/OfficialMarkingSchemeModal';
import { UploadMarkingSchemeModal } from './UploadMarkingSchemeModal';
import { PastPapersSection } from '../common/PastPapersSection';

interface TeacherDashboardProps {
  teacher: TeacherProfile;
  exams: Exam[];
  questionBank: Question[];
  submissions: ExamSubmission[];
  students: StudentProfile[];
  onAddExam: (exam: Exam) => void;
  onUpdateExam: (exam: Exam) => { success: boolean; error?: string };
  onDeleteExam: (id: string) => void;
  onAddQuestion: (q: Question) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkImportQuestions: (qs: Question[]) => void;
  onDismissIncident: (submissionId: string, incidentId: string) => void;
  onSendStudentWarning: (studentId: string, text: string) => void;
  onForceSubmit: (subId: string) => void;
  onSaveOverride: (
    submissionId: string,
    questionId: string,
    newPoints: number,
    reason: string
  ) => { success: boolean; error?: string };
  onRegisterStudent: (newStudent: StudentProfile, enrolledExamIds: string[]) => void;
  onToggleMarkingScheme: (examId: string, released: boolean) => void;
  onRegisterStudentToExam: (studentId: string, examId: string) => boolean;
  onUnregisterStudentFromExam: (studentId: string, examId: string) => void;
  onUpdateTeacher?: (updated: TeacherProfile) => void;
  onDataChanged?: () => void;
  resetKey?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacher,
  exams,
  questionBank,
  submissions,
  students,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onBulkImportQuestions,
  onDismissIncident,
  onSendStudentWarning,
  onForceSubmit,
  onSaveOverride,
  onRegisterStudent,
  onToggleMarkingScheme,
  onRegisterStudentToExam,
  onUnregisterStudentFromExam,
  onUpdateTeacher,
  onDataChanged,
  resetKey,
}) => {
  const [activeTab, setActiveTab] = useState<
    'exams' | 'submissions' | 'candidates' | 'proctor' | 'analytics' | 'pastpapers'
  >('exams');

  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [managingQuestionsExam, setManagingQuestionsExam] = useState<Exam | null>(null);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedProctorExam, setSelectedProctorExam] = useState<Exam>(exams[0] || null);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Admission & Room Gate Modal state
  const [admissionExamTarget, setAdmissionExamTarget] = useState<Exam | null>(null);

  // Official Examination Paper and Marking Scheme Modals
  const [viewingQuestionPaperExam, setViewingQuestionPaperExam] = useState<Exam | null>(null);
  const [viewingMarkingSchemeExam, setViewingMarkingSchemeExam] = useState<Exam | null>(null);
  const [uploadingSchemeExam, setUploadingSchemeExam] = useState<Exam | null>(null);

  // Real-time waiting room counter tick
  const [, setWaitingRoomTick] = useState<number>(0);

  useEffect(() => {
    const handleWaitingRoomUpdate = () => setWaitingRoomTick((t) => t + 1);
    window.addEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
    window.addEventListener('examguard_admission_updated', handleWaitingRoomUpdate);

    // Periodic check to sync with backend waiting rooms
    const interval = setInterval(() => {
      exams.forEach((ex) => {
        fetch(`/api/exams/${encodeURIComponent(ex.id)}/waiting-room`)
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => {
            if (json?.success && json?.data?.waitingCandidates) {
              json.data.waitingCandidates.forEach((c: any) => {
                registerStudentToWaitingRoom(ex.id, c.studentId);
              });
              setWaitingRoomTick((t) => t + 1);
            }
          })
          .catch(() => {});
      });
    }, 1200);

    return () => {
      window.removeEventListener('examguard_waiting_room_updated', handleWaitingRoomUpdate);
      window.removeEventListener('examguard_admission_updated', handleWaitingRoomUpdate);
      clearInterval(interval);
    };
  }, [exams]);

  // When resetKey changes (e.g. clicking the brand logo), reset all views to default with no option selected
  useEffect(() => {
    setActiveTab('exams');
    setIsCreatorOpen(false);
    setManagingQuestionsExam(null);
    setIsRegistrationModalOpen(false);
    setEditingExam(null);
    setAdmissionExamTarget(null);
    setViewingQuestionPaperExam(null);
    setViewingMarkingSchemeExam(null);
    setManualMarkingModalTarget(null);
    setSelectedExamFilter('all');
    setSubmissionSearch('');
    setInspectingSubmission(null);
    setOverrideModalData(null);
    setEnrollExamTarget(null);
    setSelectedProfileModal(null);
    setViewingAnswerSheetTarget(null);
  }, [resetKey]);

  // Manual Exam Marking Target state
  const [manualMarkingModalTarget, setManualMarkingModalTarget] = useState<{
    submission: ExamSubmission;
    exam: Exam;
  } | null>(null);

  // Submissions & Candidates Tab Filters
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>('all');
  const [submissionSearch, setSubmissionSearch] = useState<string>('');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState<string>('');

  // Modals for inspecting submission & manual marking override
  const [inspectingSubmission, setInspectingSubmission] = useState<{
    submission: ExamSubmission;
    exam: Exam;
  } | null>(null);

  const [overrideModalData, setOverrideModalData] = useState<{
    submission: ExamSubmission;
    question: Question;
  } | null>(null);

  // Candidate enrollment modal state
  const [enrollExamTarget, setEnrollExamTarget] = useState<Exam | null>(null);

  // Backend Synchronized Teacher Information for Hue Section
  const [teacherBackendInfo, setTeacherBackendInfo] = useState<{
    staffId: string;
    department: string;
    faculty: string;
    title: string;
    office: string;
    securityClearance: string;
    assignedCourseCodes: string[];
  }>({
    staffId: teacher.staffId || 'FAC-CS-8902',
    department: teacher.department || 'Computer Science & Software Engineering',
    faculty: teacher.faculty || 'Faculty of Computing & Information Technologies',
    title: teacher.title || 'Professor of Computer Science & Information Security',
    office: 'Turing Hall, Room 412B',
    securityClearance: 'Level 4 · Chief Academic Invigilator',
    assignedCourseCodes: teacher.assignedCourseCodes || ['CS-405', 'CS-301'],
  });
  const [isBackendSynced, setIsBackendSynced] = useState(false);

  // Profile modal and answer sheet modal states
  const [selectedProfileModal, setSelectedProfileModal] = useState<{
    type: 'student' | 'teacher';
    id: string;
  } | null>(null);

  const [viewingAnswerSheetTarget, setViewingAnswerSheetTarget] = useState<{
    exam: Exam;
    submission: ExamSubmission;
  } | null>(null);

  // Fetch verified teacher information from backend API for hue section
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/teacher-portal/info/${encodeURIComponent(teacher.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Backend fetch error');
        return res.json();
      })
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setTeacherBackendInfo(json.data);
          setIsBackendSynced(true);
        }
      })
      .catch((err) => {
        console.warn('[TeacherDashboard] Backend info fetch fallback:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [teacher.id]);

  // Real-time synchronization of submissions and admissions across dashboard
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      onDataChanged?.();
    };
    window.addEventListener('examguard_submissions_updated', handleRealtimeUpdate);
    window.addEventListener('examguard_admissions_updated', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('examguard_submissions_updated', handleRealtimeUpdate);
      window.removeEventListener('examguard_admissions_updated', handleRealtimeUpdate);
    };
  }, [onDataChanged]);

  // Result Commitment Handlers
  const handleCommitSingleResult = async (submissionId: string) => {
    const res = await commitSubmissionResult(submissionId, teacher.name);
    if (res.success) {
      setInspectingSubmission(null);
      setManualMarkingModalTarget(null);
      setViewingAnswerSheetTarget(null);
      setSubmissionSearch('');
      setSelectedExamFilter('all');
      showToast('Result committed to Student Portal! Submission tab information updated and reset.');
      onDataChanged?.();
      window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
    } else {
      showToast(res.error || 'Failed to commit result.', true);
    }
  };

  const handleBulkCommitAll = async (examId: string) => {
    const res = await commitAllExamResults(examId, teacher.name);
    if (res.success) {
      setInspectingSubmission(null);
      setManualMarkingModalTarget(null);
      setViewingAnswerSheetTarget(null);
      setSubmissionSearch('');
      setSelectedExamFilter('all');
      showToast(`Committed ${res.count} graded student results! Submission tab information updated and reset.`);
      onDataChanged?.();
      window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
    } else {
      showToast(res.error || 'Failed to commit examination results.', true);
    }
  };

  // Department & Course Scoping: Teacher can only view exams, submissions, and reports for their assigned courses in their department
  const authorizedCourses = teacher.assignedCourseCodes?.length
    ? teacher.assignedCourseCodes
    : ['CS-405', 'CS-301'];

  const scopedExams = exams.filter(
    (e) =>
      authorizedCourses.includes(e.courseCode) ||
      e.instructorEmail === teacher.email ||
      e.courseCode === 'ALL'
  );

  const scopedSubmissions = submissions.filter((s) =>
    scopedExams.some((e) => e.id === s.examId)
  );

  const scopedStudents = students.filter((s) =>
    scopedExams.some(
      (e) =>
        e.registeredStudentIds?.includes(s.id) ||
        s.enrolledCourseCodes?.includes(e.courseCode)
    )
  );

  // Helper notification
  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setIsCreatorOpen(true);
  };

  const handleSaveExam = (exam: Exam) => {
    if (editingExam) {
      const res = onUpdateExam(exam);
      if (!res.success && res.error) {
        showToast(res.error, true);
      } else {
        showToast(`Examination "${exam.title}" updated successfully.`);
      }
    } else {
      onAddExam(exam);
      // Ensure all questions on this new examination sheet are also populated into the questions bank
      if (exam.questions && exam.questions.length > 0) {
        onBulkImportQuestions(exam.questions);
      }
      showToast(`New examination "${exam.title}" published with official question sheet.`);
    }

    fetch(`/api/exams/${encodeURIComponent(exam.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exam),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || `Backend exam update failed (${res.status}).`);
        }
      })
      .catch((err: unknown) => {
        showToast(
          err instanceof Error ? `Exam saved locally, but backend sync failed: ${err.message}` : 'Exam saved locally, but backend sync failed.',
          true
        );
      });
  };

  const handleLaunchProctoring = (exam: Exam) => {
    setSelectedProctorExam(exam);
    setActiveTab('proctor');
  };

  const handleToggleScheme = (exam: Exam) => {
    const nextState = !exam.isMarkingSchemeReleased;
    onToggleMarkingScheme(exam.id, nextState);
    const isConcluded = new Date().getTime() >= new Date(exam.scheduledEndTime).getTime();
    if (nextState) {
      if (isConcluded) {
        showToast(`Marking scheme officially released for "${exam.courseCode}". Candidates can now inspect answer keys.`);
      } else {
        showToast(`Marking scheme flagged as released for "${exam.courseCode}". Note: candidates will only be able to view it once the examination period concludes.`);
      }
    } else {
      showToast(`Marking scheme restricted for "${exam.courseCode}".`);
    }
  };

  // Filtered submissions
  const filteredSubmissions = scopedSubmissions.filter((sub) => {
    const matchExam = selectedExamFilter === 'all' || sub.examId === selectedExamFilter;
    const matchSearch =
      (sub.studentName || '').toLowerCase().includes(submissionSearch.toLowerCase()) ||
      (sub.studentEmail || '').toLowerCase().includes(submissionSearch.toLowerCase());
    return matchExam && matchSearch;
  });

  // Calculate global metrics
  const totalBankPoints = questionBank.reduce((sum, q) => sum + q.points, 0);
  const avgIntegrity =
    scopedSubmissions.length > 0
      ? Math.round(
          scopedSubmissions.reduce((sum, s) => sum + (s.integrityScore ?? 100), 0) /
            scopedSubmissions.length
        )
      : 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn border ${
            toastMessage.isError
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="underline text-[11px] cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Teacher Profile & Departmental Scoping Banner (Hue Section) */}
      <div
        className="relative rounded-2xl p-6 md:p-8 text-white border border-indigo-900/60 flex flex-col md:flex-row md:items-end justify-between gap-6 shadow-md overflow-hidden bg-slate-900 min-h-[220px] md:min-h-[250px]"
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
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 text-amber-300 font-bold border border-indigo-700/80 shadow-xs backdrop-blur-xs">
              <Building2 className="w-3.5 h-3.5 text-orange-400" />
              <span>{teacherBackendInfo.faculty || teacher.faculty || 'Faculty of Computing & Information Technologies'}</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-indigo-200 font-bold drop-shadow-xs">{teacherBackendInfo.staffId}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-300 font-medium drop-shadow-xs italic">"Impacting lives since 1953"</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
              Faculty Invigilator:
            </h1>
            <button
              type="button"
              onClick={() => setSelectedProfileModal({ type: 'teacher', id: teacher.id })}
              className="text-2xl md:text-3xl font-extrabold tracking-tight text-white hover:text-orange-300 underline underline-offset-4 decoration-indigo-400 cursor-pointer flex items-center gap-1.5 transition-colors drop-shadow-md"
              title="Click to fetch and inspect verified faculty appointment & rights from backend"
            >
              <span>{teacher.name}</span>
              <User className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-200 pt-0.5 drop-shadow-xs">
            <span className="text-indigo-200 font-semibold">{teacherBackendInfo.title}</span>
            <span className="text-slate-400">·</span>
            <span className="text-orange-300 font-mono font-bold">
              Clearance: {teacherBackendInfo.securityClearance}
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-white-300 font-extrabold">
              Authorized Courses: {authorizedCourses.join(', ')}
            </span>
          </div>
        </div>

        {/* Action Buttons adjusted to smaller size and positioned slightly at the bottom of the Hue */}
        <div className="relative z-10 md:absolute md:bottom-4 md:right-6 flex flex-wrap sm:flex-nowrap items-center gap-2 mt-4 md:mt-0 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEnrollExamTarget(null);
              setIsRegistrationModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-700/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-indigo-500/50 backdrop-blur-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Candidate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingExam(null);
              setIsCreatorOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700/90 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-blue-500/50 backdrop-blur-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {/* 4 INDEPENDENT ACTIONABLE HUE CARDS WITH SPACE BETWEEN THEM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Hue Card 1: Total Examinations (Indigo Hue) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('exams');
            showToast(`Retrieved ${scopedExams.length} examinations for ${teacher.department}.`);
          }}
          className="group relative p-5 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
              Total Examination
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {scopedExams.length}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
              Course Exams
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{scopedExams.filter((e) => e.status === 'active' || e.status === 'ongoing').length} in active window</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              View bank <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Hue Card 2: Examination Questions (Emerald Hue) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('exams');
            showToast(`Exam questions and document imports are integrated in Examination Bank.`);
          }}
          className="group relative p-5 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-100/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-emerald-950/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              Exam Questions
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {scopedExams.reduce((acc, e) => acc + (e.questions?.length || 0), 0)}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              Questions
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>In Examination Bank</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Manage in Exams <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Hue Card 3: Candidates (Indigo Hue) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('candidates');
            showToast(`Retrieved ${scopedStudents.length} candidate rosters for enrolled courses.`);
          }}
          className="group relative p-5 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/40 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
              Candidates
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {scopedStudents.length}
            </span>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
              Enrolled
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Candidates & registrations</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              View roster <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>

        {/* Hue Card 4: Submissions (Cyan Hue) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('submissions');
            showToast(`Retrieved ${scopedSubmissions.length} submissions in departmental gradebook.`);
          }}
          className="group relative p-5 bg-gradient-to-br from-cyan-50/90 via-white to-cyan-100/40 dark:from-cyan-950/40 dark:via-slate-900 dark:to-cyan-950/20 rounded-2xl border-2 border-cyan-200 dark:border-cyan-800/70 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider font-mono">
              Submissions
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
              {scopedSubmissions.length}
            </span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold font-mono">
              Submitted
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{scopedSubmissions.filter((s) => s.status !== 'graded').length} pending marking</span>
            <span className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Manual mark <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Main Teacher Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('exams')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'exams'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Calendar className={`w-4 h-4 ${activeTab === 'exams' ? 'text-[#1a2200]' : 'text-indigo-600'}`} />
          <span>Exams Bank ({exams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'submissions'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'submissions' ? 'text-[#1a2200]' : 'text-emerald-600'}`} />
          <span>Submissions ({submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('candidates')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'candidates'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <UserPlus className={`w-4 h-4 ${activeTab === 'candidates' ? 'text-[#1a2200]' : 'text-indigo-600'}`} />
          <span>Candidates ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('proctor')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'proctor'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Camera className={`w-4 h-4 ${activeTab === 'proctor' ? 'text-[#1a2200]' : 'text-rose-600'}`} />
          <span>Live Proctor Grid</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'analytics'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'analytics' ? 'text-[#1a2200]' : 'text-cyan-600'}`} />
          <span>Analytics & Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pastpapers')}
          className={`flex-1 min-w-[140px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'pastpapers'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <FolderArchive className={`w-4 h-4 ${activeTab === 'pastpapers' ? 'text-[#1a2200]' : 'text-amber-600'}`} />
          <span>Past Papers</span>
        </button>
      </div>

      {/* TAB 1: EXAMS OVERVIEW & BANK DETAILS */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Examination Bank Master Schedule
                </h2>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded font-bold border border-indigo-200">
                  {scopedExams.length} Scoped Exams ({teacher.department})
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Notice: Questions are locked from modification once an examination has commenced. Candidates can only view marking schemes after the examination period concludes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEnrollExamTarget(null);
                  setIsRegistrationModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Candidate</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingExam(null);
                  setIsCreatorOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Exam</span>
              </button>
            </div>
          </div>

          {/* Exam Cards List */}
          <div className="grid grid-cols-1 gap-5">
            {scopedExams.map((exam) => {
              const start = new Date(exam.scheduledStartTime);
              const end = new Date(exam.scheduledEndTime);
              const now = new Date().getTime();
              const isPeriodConcluded = now >= end.getTime();
              const isPeriodOngoing = now >= start.getTime() && now <= end.getTime();

              const examSubs = submissions.filter((s) => s.examId === exam.id);
              const totalPoints = exam.questions.reduce((sum, q) => sum + q.points, 0);

              // Candidates registered
              const registeredCount = exam.registeredStudentIds?.length ?? (
                students.filter((s) => s.enrolledCourseCodes.includes(exam.courseCode)).length
              );

              return (
                <div
                  key={exam.id}
                  data-exam-card="true"
                  className="exam-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 hover:shadow-md transition-all flex flex-col gap-4 sm:gap-5 border-l-4 border-l-indigo-600 dark:border-l-indigo-500"
                >
                  {/* Top Bar: Metadata Badges & Utility Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs shadow-2xs">
                        {exam.courseCode}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold text-xs">{exam.courseTitle}</span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 text-xs font-mono font-medium">
                        {exam.durationMinutes} Mins
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-md text-xs font-mono font-bold">
                        Set Out Of: {totalPoints} Total Marks ({exam.questions.length} Questions)
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      {exam.isLockedForEdits ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900 text-xs">
                          <Lock className="w-3.5 h-3.5" /> Commenced (Locked)
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900 text-xs">
                          <Unlock className="w-3.5 h-3.5" /> Modifiable
                        </span>
                      )}
                    </div>

                    {/* Top Right Quick Utility Tools */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        onClick={() =>
                          downloadSebConfigFile(exam.title, window.location.origin, exam.sebConfig)
                        }
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Download Safe Exam Browser (.seb) config"
                      >
                        <span>.seb Config</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditExam(exam)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={exam.isLockedForEdits ? 'Exam commenced: questions locked' : 'Edit Examination Parameters'}
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteExam(exam.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete Examination"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Examination Title (Styled Prominently Across Card Width) */}
                  <div className="w-full">
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug break-words">
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed max-w-5xl">
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Horizontal Content Grid (Properly Distributed Horizontally, Maintaining Order) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-50/90 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                    {/* Order 1: Examination Sitting Window */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider font-mono">Exam Sitting Window</div>
                        <div className="text-slate-800 dark:text-slate-200 font-medium truncate">
                          {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {/* Order 2: Registered Candidates */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider font-mono">Candidate Enrollment</div>
                        <div className="text-indigo-700 dark:text-indigo-300 font-bold font-mono">
                          {registeredCount} Registered Candidates
                        </div>
                      </div>
                    </div>

                    {/* Order 3: Submissions Received */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider font-mono">Gradebook Submissions</div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExamFilter(exam.id);
                            setActiveTab('submissions');
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold font-mono text-left cursor-pointer flex items-center gap-1"
                          title="Filter submissions for this exam"
                        >
                          <span>{examSubs.length} Received</span>
                          <span className="text-[10px] text-slate-400 font-normal">({examSubs.filter(s => s.status === 'graded').length} Graded)</span>
                        </button>
                      </div>
                    </div>

                    {/* Order 4: Invigilation & Security Protocols */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider font-mono">Security Invigilation</div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium truncate font-mono text-[11px]">
                          {exam.securityProtocols?.requireCamera ? 'Webcam' : 'No Cam'} · {exam.securityProtocols?.requireMicrophone ? 'Mic' : 'No Mic'} · {exam.securityProtocols?.requireSEB ? 'SEB Enforced' : 'Browser'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Marking Scheme Status & Room Passcode Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Scheme Governance:</span>
                      {isPeriodOngoing ? (
                        <span className="text-[11px] font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1 font-semibold" title="Marking scheme cannot be viewed by students while examination period is active">
                          <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Sealed (Exam Window Active)</span>
                        </span>
                      ) : exam.isMarkingSchemeReleased ? (
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Officially Released to Candidates</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Restricted Confidential</span>
                        </span>
                      )}
                    </div>

                    {exam.accessPassword && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Examination Passcode: <strong>{exam.accessPassword}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar: Adjusted Padding for Live Proctor, Release Scheme, and Enroll Students */}
                  <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full">
                      {/* 1. Questions & Import */}
                      <button
                        type="button"
                        onClick={() => setManagingQuestionsExam(exam)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                        title="Manage questions, add questions, or import documents into this specific exam"
                      >
                        <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Questions ({exam.questions.length}) & Import</span>
                      </button>

                      {/* 2. Official Question Paper Modal (.doc & Print) */}
                      <button
                        type="button"
                        onClick={() => setViewingQuestionPaperExam(exam)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-2 transition-colors cursor-pointer shrink-0"
                        title="View, download (.doc/HTML), and print official examination paper in Times New Roman 12pt format"
                      >
                        <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Print Exam Paper</span>
                      </button>

                      {/* 3. Official Marking Scheme Modal (.doc & Print) */}
                      <button
                        type="button"
                        onClick={() => setViewingMarkingSchemeExam(exam)}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                        title="View, download (.doc/HTML), and print official marking scheme with rubrics in Times New Roman 12pt format"
                      >
                        <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Print Marking Scheme</span>
                      </button>

                      {/* 3b. Upload Lecturer Marking Scheme */}
                      <button
                        type="button"
                        onClick={() => setUploadingSchemeExam(exam)}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
                        title="Upload official lecturer marking scheme document (.docx, .pdf, .xlsx, .txt) for this examination"
                      >
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Upload Marking Scheme</span>
                      </button>

                      {/* 4. Release / Revoke Scheme */}
                      <button
                        type="button"
                        onClick={() => handleToggleScheme(exam)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                          exam.isMarkingSchemeReleased
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800'
                        }`}
                        title={
                          exam.isMarkingSchemeReleased
                            ? 'Lock marking scheme'
                            : 'Make marking scheme available to students (accessible after exam period concludes)'
                        }
                      >
                        <Key className="w-4 h-4" />
                        <span>{exam.isMarkingSchemeReleased ? 'Revoke Scheme' : 'Release Scheme'}</span>
                      </button>

                      {/* 5. Enroll Students */}
                      <button
                        type="button"
                        onClick={() => {
                          setEnrollExamTarget(exam);
                          setIsRegistrationModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Enroll or register student candidates for this examination"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Enroll Students</span>
                      </button>

                      {/* 6. Admissions Gate */}
                      <button
                        type="button"
                        onClick={() => setAdmissionExamTarget(exam)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Admit waiting candidates and view/copy examination passcode"
                      >
                        <DoorOpen className="w-4 h-4" />
                        <span>Admissions ({exam.admittedStudentIds?.length || 0})</span>
                        {getWaitingRoomStudents(exam.id).length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 font-bold text-[10px] animate-pulse">
                            {getWaitingRoomStudents(exam.id).length} waiting
                          </span>
                        )}
                      </button>

                      {/* 7. Live Proctor Room */}
                      <button
                        type="button"
                        onClick={() => handleLaunchProctoring(exam)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                        title="Launch Live Webcam Proctoring Room for this examination"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Live Proctor Room</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT SUBMISSIONS & GRADEBOOK */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Student Examination Submissions & Gradebook
                </h2>
                <span className="text-xs bg-emerald-50 text-emerald-700 font-mono px-2 py-0.5 rounded font-bold border border-emerald-200">
                  {filteredSubmissions.length} Submissions
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Inspect candidate answers and uploaded drawings, review webcam proctor audits, and apply score adjustments with mandatory justification.
              </p>
            </div>

            {/* Filter controls & Bulk Commit Action */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetExamId = selectedExamFilter === 'all' ? scopedExams[0]?.id : selectedExamFilter;
                  if (targetExamId) {
                    void handleBulkCommitAll(targetExamId);
                  } else {
                    showToast('Please select an examination first.', true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Commit and release all graded submissions to student portals"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Commit All Graded to Student Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetExam = selectedExamFilter === 'all'
                    ? scopedExams[0]
                    : scopedExams.find((e) => e.id === selectedExamFilter);
                  if (targetExam) {
                    handleToggleScheme(targetExam);
                  } else {
                    showToast('Please select an examination first.', true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Toggle official marking scheme release to students after marking"
              >
                <Award className="w-3.5 h-3.5" />
                <span>
                  {(() => {
                    const targetExam = selectedExamFilter === 'all'
                      ? scopedExams[0]
                      : scopedExams.find((e) => e.id === selectedExamFilter);
                    return targetExam?.isMarkingSchemeReleased
                      ? 'Scheme Released (Revoke)'
                      : 'Release Marking Scheme to Students';
                  })()}
                </span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  placeholder="Search student or email..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedExamFilter}
                onChange={(e) => setSelectedExamFilter(e.target.value)}
                className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">All Examinations in Bank</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.courseCode}: {ex.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions Table */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">No submissions matching criteria</div>
              <div className="text-xs">
                Candidate submissions will automatically appear here once students submit tests.
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Examination</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Attempt</th>
                      <th className="px-4 py-3">Score & Grade</th>
                      <th className="px-4 py-3">Integrity Rating</th>
                      <th className="px-4 py-3">Submitted At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const exam = exams.find((e) => e.id === sub.examId);
                      const score = sub.score ?? 0;
                      const total = sub.totalPoints ?? (exam?.questions.reduce((a, b) => a + b.points, 0) || 100);
                      const pct = sub.percentage ?? Math.round((score / total) * 100);
                      const passPct = exam?.passingScorePercentage ?? 60;
                      const isPassed = pct >= passPct;

                      return (
                        <tr
                          key={sub.id}
                          className={`transition-colors hover:bg-indigo-50/50 ${
                            sub.isResultCommitted
                              ? 'bg-emerald-50/45'
                              : sub.committedMarkChangeRequest?.status === 'pending_admin_approval'
                                ? 'bg-amber-50/55'
                                : 'odd:bg-slate-50/35'
                          }`}
                        >
                          {/* Student */}
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={sub.studentAvatar}
                                alt={sub.studentName}
                                className="w-7 h-7 rounded-full object-cover border border-slate-300"
                              />
                              <div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedProfileModal({ type: 'student', id: sub.studentId })}
                                  className="font-bold text-slate-900 hover:text-indigo-600 underline underline-offset-2 decoration-slate-300 text-left cursor-pointer transition-colors flex items-center gap-1"
                                  title="Click to view candidate academic profile from backend"
                                >
                                  <span>{sub.studentName}</span>
                                  <User className="w-3 h-3 text-indigo-500" />
                                </button>
                                <div className="text-[11px] text-slate-400 font-mono">{sub.studentEmail}</div>
                              </div>
                            </div>
                          </td>

                          {/* Exam */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{exam?.courseCode || 'EXAM'}</div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 max-w-[180px]">
                              {exam?.title || sub.examId}
                            </div>
                          </td>

                          {/* Status & Portal Commitment */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                                sub.status === 'graded'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : sub.status === 'submitted'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sub.status}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                                  sub.isResultCommitted
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {sub.isResultCommitted ? '✓ Committed' : 'Uncommitted'}
                              </span>
                            </div>
                          </td>

                          {/* Attempt */}
                          <td className="px-4 py-3 font-mono">#{sub.attemptNumber || 1}</td>

                          {/* Score */}
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-900">
                              {score} / {total} Marks
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className={`font-semibold ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {pct}% ({isPassed ? 'Passed' : 'Failed'})
                              </span>
                            </div>
                          </td>

                          {/* Integrity */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className={`font-bold ${
                                (sub.integrityScore ?? 100) >= 90
                                  ? 'text-emerald-600'
                                  : (sub.integrityScore ?? 100) >= 70
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                              }`}>
                                {sub.integrityScore ?? 100}%
                              </span>
                              {sub.incidents?.length ? (
                                <span className="text-[10px] text-rose-700 bg-rose-50 px-1 py-0.5 rounded font-bold border border-rose-200">
                                  {sub.incidents.length} flags
                                </span>
                              ) : null}
                            </div>
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                            {new Date(sub.submittedAt || sub.startedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!sub.isResultCommitted && (
                                <button
                                  type="button"
                                  onClick={() => void handleCommitSingleResult(sub.id)}
                                  className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs"
                                  title="Commit this result to student portal"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Commit</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (exam) {
                                    setViewingAnswerSheetTarget({ exam, submission: sub });
                                  }
                                }}
                                className="px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="View official Times New Roman 12pt downloadable answer sheet"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Answer Sheet</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (exam) {
                                    setManualMarkingModalTarget({ submission: sub, exam });
                                  }
                                }}
                                className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="Open manual examination marking desk to evaluate student answers & rubric"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{sub.isResultCommitted ? 'Request Mark Change' : 'Manual Mark'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (exam) {
                                    setInspectingSubmission({ submission: sub, exam });
                                  }
                                }}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors inline-flex items-center gap-1"
                                title="Inspect submission answer sheet and logs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTERED CANDIDATES & ENROLLMENT */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Official Candidate Registration Section:
                </h2>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded font-bold border border-indigo-200">
                  {scopedStudents.length} Department Candidates
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Enroll students into upcoming examinations, register new candidates into the database, and verify candidate access credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEnrollExamTarget(null);
                setIsRegistrationModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Candidate</span>
            </button>
          </div>

          {/* Search by Student Admission Number or Name */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                placeholder="Search candidates by Admission Number (e.g. STU-2024-8841), name, or email..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {
                  students.filter(
                    (s) =>
                      !candidateSearchQuery.trim() ||
                      s.studentNumber.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
                      s.name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
                      s.email.toLowerCase().includes(candidateSearchQuery.toLowerCase())
                  ).length
                }
              </span>
              <span>of {students.length} Candidates Available</span>
            </div>
          </div>

          {/* Students Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students
              .filter(
                (s) =>
                  !candidateSearchQuery.trim() ||
                  s.studentNumber.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
                  s.name.toLowerCase().includes(candidateSearchQuery.toLowerCase()) ||
                  s.email.toLowerCase().includes(candidateSearchQuery.toLowerCase())
              )
              .map((student) => {
              // Find which exams this student is enrolled in
              const enrolledExams = exams.filter(
                (ex) =>
                  student.enrolledCourseCodes.includes(ex.courseCode) ||
                  ex.registeredStudentIds?.includes(student.id)
              );
              const studentSubs = submissions.filter((s) => s.studentId === student.id);

              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
                      />
                      <div>
                        <button
                          type="button"
                          onClick={() => setSelectedProfileModal({ type: 'student', id: student.id })}
                          className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 underline underline-offset-2 decoration-slate-300 text-left cursor-pointer transition-colors flex items-center gap-1"
                          title="Click to view full verified candidate profile from backend"
                        >
                          <span>{student.name}</span>
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                        </button>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{student.email}</div>
                        {/* Prominent Student Admission Number Badge */}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-mono font-black text-xs flex items-center gap-1 shadow-2xs">
                            <GraduationCap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>ADM NO: {student.studentNumber}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">· {student.department}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {studentSubs.length} Tests Taken
                    </span>
                  </div>

                  {/* Enrolled Examinations in Bank */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                      <span>Registered Examinations ({enrolledExams.length}):</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {enrolledExams.map((ex) => (
                        <span
                          key={ex.id}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-mono flex items-center gap-1 border border-slate-200"
                        >
                          <span className="font-bold text-indigo-600">{ex.courseCode}</span>
                          <span className="truncate max-w-[120px]">{ex.title}</span>
                          <button
                            type="button"
                            onClick={() => onUnregisterStudentFromExam(student.id, ex.id)}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                            title="Unenroll candidate from this exam"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {enrolledExams.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No exams enrolled currently.</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Assign Dropdown */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px]">Enroll into exam:</span>
                    <select
                      className="p-1 bg-slate-50 border border-slate-300 rounded text-xs flex-1"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          const enrolled = onRegisterStudentToExam(student.id, e.target.value);
                          if (enrolled) {
                            showToast(`Enrolled ${student.name} into examination.`);
                          } else {
                            showToast(`${student.name} must have an active account to be enrolled.`);
                          }
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>Select exam from bank...</option>
                      {exams
                        .filter((ex) => !enrolledExams.some((e) => e.id === ex.id))
                        .map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.courseCode} - {ex.title}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: LIVE PROCTORING ROOM */}
      {activeTab === 'proctor' && (
        <LiveProctorRoom
          exam={selectedProctorExam || exams[0]}
          submissions={submissions}
          questions={questionBank}
          onDismissIncident={onDismissIncident}
          onSendStudentWarning={onSendStudentWarning}
          onForceSubmit={onForceSubmit}
          onSaveOverride={onSaveOverride}
          onDataChanged={onDataChanged}
        />
      )}

      {/* TAB 6: TEACHER ANALYTICS & REPORTS */}
      {activeTab === 'analytics' && (
        <TeacherAnalyticsView
          students={scopedStudents}
          exams={scopedExams}
          submissions={scopedSubmissions}
        />
      )}

      {/* TAB 7: PAST PAPERS & ARCHIVES GROUPED BY EXAM CODE */}
      {activeTab === 'pastpapers' && (
        <PastPapersSection
          exams={exams}
          onOpenQuestionPaper={(exam) => setViewingQuestionPaperExam(exam)}
          onOpenMarkingScheme={(exam) => setViewingMarkingSchemeExam(exam)}
          userRole="teacher"
        />
      )}

      {/* Exam Creator Modal */}
      {isCreatorOpen && (
        <ExamCreatorModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          onSaveExam={handleSaveExam}
          questionBank={questionBank}
          existingExam={editingExam}
          currentTeacher={teacher}
        />
      )}

      {/* Student Candidate Registration Modal */}
      {isRegistrationModalOpen && (
        <StudentRegistrationModal
          isOpen={isRegistrationModalOpen}
          onClose={() => {
            setIsRegistrationModalOpen(false);
            setEnrollExamTarget(null);
          }}
          exams={scopedExams}
          targetExam={enrollExamTarget}
          students={students}
          onEnrollExistingStudent={(studentId, examId) => {
            const enrolled = onRegisterStudentToExam(studentId, examId);
            if (!enrolled) return false;
            const foundStudent = students.find((s) => s.id === studentId);
            showToast(`Candidate ${foundStudent ? `${foundStudent.name} (Admission No: ${foundStudent.studentNumber})` : 'Student'} enrolled into examination.`);
            return true;
          }}
          onUnenrollStudent={(studentId, examId) => {
            onUnregisterStudentFromExam(studentId, examId);
            const foundStudent = students.find((s) => s.id === studentId);
            showToast(`Candidate ${foundStudent ? `${foundStudent.name} (Admission No: ${foundStudent.studentNumber})` : 'Student'} unassigned from examination.`);
            return true;
          }}
          onRegisterStudent={(newStudent, enrolledCodes) => {
            onRegisterStudent(newStudent, enrolledCodes);
            showToast(`Candidate ${newStudent.name} (Admission No: ${newStudent.studentNumber}) registered and enrolled successfully.`);
          }}
        />
      )}

      {/* Submission Answer Sheet Review Modal */}
      {inspectingSubmission && (
        <SubmissionDetailModal
          isOpen={true}
          onClose={() => setInspectingSubmission(null)}
          submission={inspectingSubmission.submission}
          exam={inspectingSubmission.exam}
          instructorName={teacher.name}
          onCommitResult={() => {
            setInspectingSubmission(null);
            setSubmissionSearch('');
            setSelectedExamFilter('all');
            showToast('Result committed to Student Portal! Submission tab information updated and reset.');
            onDataChanged?.();
            window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
          }}
          onDataChanged={() => {
            onDataChanged?.();
            window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
          }}
          onSaveOverride={(studentId, examId, newScore, reason) => {
            onSaveOverride?.(studentId, examId, newScore, reason);
            setInspectingSubmission(null);
            onDataChanged?.();
            window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
          }}
        />
      )}

      {/* Comprehensive Manual Exam Marking Modal */}
      {manualMarkingModalTarget && (
        <ManualMarkingModal
          isOpen={true}
          onClose={() => setManualMarkingModalTarget(null)}
          submission={manualMarkingModalTarget.submission}
          exam={manualMarkingModalTarget.exam}
          instructorName={teacher.name}
          onGradingCompleted={() => {
            const wasCommitted = manualMarkingModalTarget.submission.isResultCommitted;
            setManualMarkingModalTarget(null);
            setSubmissionSearch('');
            setSelectedExamFilter('all');
            onDataChanged?.();
            window.dispatchEvent(new CustomEvent('examguard_submissions_updated'));
            if (wasCommitted) {
              showToast('Written mark-change request submitted for Super Admin approval.');
            } else {
              showToast('Manual marks committed and published! Submission tab information updated and reset.');
            }
          }}
        />
      )}

      {/* Room Admission Control Modal */}
      {admissionExamTarget && (
        <ExamAdmissionModal
          exam={admissionExamTarget}
          isOpen={true}
          students={students}
          submissions={submissions}
          onClose={() => setAdmissionExamTarget(null)}
          onAdmissionsUpdated={() => {
            showToast('Exam room candidate admissions refreshed.');
          }}
        />
      )}

      {/* Specific Examination Questions & Imports Manager Modal */}
      {managingQuestionsExam && (
        <ExamQuestionsManagerModal
          exam={managingQuestionsExam}
          isOpen={true}
          onClose={() => setManagingQuestionsExam(null)}
          onSaveQuestions={(updatedQuestions) => {
            const updated = { ...managingQuestionsExam, questions: updatedQuestions };
            onUpdateExam(updated);
            setManagingQuestionsExam(updated);
            showToast(`Saved ${updatedQuestions.length} questions to ${managingQuestionsExam.courseCode}.`);
          }}
        />
      )}

      {/* Official Times New Roman 12pt Student Answer Sheet Modal */}
      {viewingAnswerSheetTarget && (
        <StudentAnswerSheetModal
          isOpen={true}
          onClose={() => setViewingAnswerSheetTarget(null)}
          exam={viewingAnswerSheetTarget.exam}
          submission={viewingAnswerSheetTarget.submission}
        />
      )}

      {/* Official Times New Roman 12pt Examination Paper Modal */}
      {viewingQuestionPaperExam && (
        <ExaminationPaperModal
          isOpen={true}
          onClose={() => setViewingQuestionPaperExam(null)}
          exam={viewingQuestionPaperExam}
          userRole="teacher"
          canDownload={true}
          faculty={teacher.faculty}
          department={teacher.department}
        />
      )}

      {/* Official Times New Roman 12pt Marking Scheme Modal */}
      {viewingMarkingSchemeExam && (
        <OfficialMarkingSchemeModal
          isOpen={true}
          onClose={() => setViewingMarkingSchemeExam(null)}
          exam={viewingMarkingSchemeExam}
          userRole="teacher"
          canDownload={true}
          faculty={teacher.faculty}
          department={teacher.department}
        />
      )}

      {/* Lecturer Upload Marking Scheme Modal */}
      {uploadingSchemeExam && (
        <UploadMarkingSchemeModal
          exam={uploadingSchemeExam}
          isOpen={true}
          instructorName={teacher.name}
          onClose={() => setUploadingSchemeExam(null)}
          onSaveExam={(updatedExam) => {
            onUpdateExam(updatedExam);
            setUploadingSchemeExam(null);
            showToast(`Marking scheme document uploaded and applied to ${updatedExam.courseCode}.`);
          }}
        />
      )}

      {/* Verified Academic Profile Modal (Teacher or Student) */}
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
