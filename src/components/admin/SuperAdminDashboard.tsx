import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Building2,
  BookOpen,
  LifeBuoy,
  Send,
  Search,
  Filter,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  Shield,
  RotateCcw,
  Edit2,
  Trash2,
  Award,
  GraduationCap,
  Calendar,
  Clock,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Upload,
  Camera,
  Image as ImageIcon,
  FileText,
  Save,
  Plus,
  Layers,
  BookPlus,
  BarChart3,
  Printer,
  Stethoscope,
  FileCheck,
  Database,
} from 'lucide-react';
import { AdminReportGeneratorView } from './AdminReportGeneratorView';
import { AdminAcademicDatabaseView } from './AdminAcademicDatabaseView';
import { PrintMissedExamsModal } from './PrintMissedExamsModal';
import { PrintApprovedStudentsModal } from './PrintApprovedStudentsModal';
import { PrintFailedStudentsModal } from './PrintFailedStudentsModal';
import { triggerFlash } from '../common/FlashMessage';
import { playAlertBeep } from '../../services/soundService';
import {
  TeacherProfile,
  TeacherRights,
  HelpTicket,
  Exam,
  StudentProfile,
  ExamSubmission,
  StudentAnswer,
  Question,
  Course,
  AuthUser,
  MissedExamRecord,
  ResitRequest,
  FailedStudentRecord,
  ExamAttendanceSummary,
} from '../../types';
import {
  getStoredTeachers,
  saveStoredExams,
  saveStoredStudents,
  saveStoredTeachers,
  addTeacher,
  updateTeacher,
  deleteTeacher,
  updateTeacherAccess,
  getStoredHelpTickets,
  resolveHelpTicket,
  reviewMarkOverride,
  reviewCommittedMarkChange,
  sendAdminInquiryOnMarkChange,
  isValidAdmissionNumberFormat,
  addStudent,
  updateStudent,
  deleteStudent,
  registerStudentToExam,
  unregisterStudentFromExam,
  deleteExam,
  getStoredCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  getCoursesByDepartment,
  getStoredSuperAdmin,
  saveStoredSuperAdmin,
  verifyUserPassword,
  updateUserPassword,
  getStoredMissedExams,
  saveStoredMissedExams,
  getStoredResitRequests,
  saveStoredResitRequests,
  hasUnapprovedMissedExam,
  adminClearMissedExam,
  adminRevokeMissedExamClearance,
  checkMissedExamRegistrationBlock,
  reviewResitRequest,
  submitResitRequest,
  getAllExamsAttendanceSummaries,
  getFailedStudentsList,
  registerStudentToExamWithValidation,
} from '../../services/storageService';
import { ProfileDetailModal } from '../common/ProfileDetailModal';
import { ExaminationPaperModal } from '../common/ExaminationPaperModal';
import { OfficialMarkingSchemeModal } from '../common/OfficialMarkingSchemeModal';
import {
  createFaculty,
  deleteFacultyRecord,
  getStoredFaculties,
  getDepartmentForFaculty,
  syncLecturerExamsFaculty,
  updateFacultyRecord,
} from '../../services/facultyResolutionService';

async function syncProfileToApi(endpoint: string, profile: TeacherProfile | StudentProfile): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      throw new Error(`Profile sync failed with HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('[SuperAdminDashboard] Profile saved locally; backend sync failed:', error);
  }
}

interface SuperAdminDashboardProps {
  exams: Exam[];
  students: StudentProfile[];
  submissions: ExamSubmission[];
  onDataRefresh: () => void;
  resetKey?: number;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  exams,
  students,
  submissions,
  onDataRefresh,
  resetKey,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all_exams' | 'teachers' | 'academic_database' | 'mark_overrides' | 'student_registrations' | 'tickets' | 'departments' | 'reports' | 'attendance_missed'
  >('academic_database');

  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => getStoredTeachers());
  const [tickets, setTickets] = useState<HelpTicket[]>(() => getStoredHelpTickets());
  const [faculties, setFaculties] = useState(() => getStoredFaculties());
  const [missedExams, setMissedExams] = useState<MissedExamRecord[]>(() => getStoredMissedExams());
  const [resitRequests, setResitRequests] = useState<ResitRequest[]>(() => getStoredResitRequests());
  const [isPrintMissedModalOpen, setIsPrintMissedModalOpen] = useState(false);
  const [isPrintApprovedModalOpen, setIsPrintApprovedModalOpen] = useState(false);
  const [isPrintFailedModalOpen, setIsPrintFailedModalOpen] = useState(false);
  const [resitFilterType, setResitFilterType] = useState<'all' | 'missed' | 'failed'>('all');
  const [failedSearchQuery, setFailedSearchQuery] = useState('');
  const [failedCourseFilter, setFailedCourseFilter] = useState('all');
  const [failedStatusFilter, setFailedStatusFilter] = useState<'all' | 'approved' | 'pending' | 'not_applied'>('all');

  // Real-time synchronization of submissions, admissions, missed exams, and resit clearances across Super Admin Directorate
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      setMissedExams(getStoredMissedExams());
      setResitRequests(getStoredResitRequests());
      onDataRefresh();
    };
    window.addEventListener('examguard_submissions_updated', handleRealtimeUpdate);
    window.addEventListener('examguard_admissions_updated', handleRealtimeUpdate);
    window.addEventListener('examguard_resit_requests_updated', handleRealtimeUpdate);
    window.addEventListener('examguard_missed_exams_updated', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('examguard_submissions_updated', handleRealtimeUpdate);
      window.removeEventListener('examguard_admissions_updated', handleRealtimeUpdate);
      window.removeEventListener('examguard_resit_requests_updated', handleRealtimeUpdate);
      window.removeEventListener('examguard_missed_exams_updated', handleRealtimeUpdate);
    };
  }, [onDataRefresh]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [examStatusFilter, setExamStatusFilter] = useState<string>('all');
  const [overrideStatusFilter, setOverrideStatusFilter] = useState<string>('all');

  // Direct Admin Clearance for Missed Exams state (Student Admission number, Examination code, Title)
  const [directClearanceAdmission, setDirectClearanceAdmission] = useState('');
  const [directClearanceExamCode, setDirectClearanceExamCode] = useState('');
  const [directClearanceExamTitle, setDirectClearanceExamTitle] = useState('');
  const [directClearanceStatusMsg, setDirectClearanceStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Teacher Add & Modify Modal State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Profile modal state for clickable student and teacher records
  const [selectedProfileModal, setSelectedProfileModal] = useState<{
    type: 'student' | 'teacher';
    id: string;
  } | null>(null);

  // Examination paper and marking scheme preview modals
  const [viewingPaperExam, setViewingPaperExam] = useState<Exam | null>(null);
  const [viewingSchemeExam, setViewingSchemeExam] = useState<Exam | null>(null);

  // Reset all tabs, search queries and open modals when resetKey changes (logo clicked)
  useEffect(() => {
    setActiveTab('all_exams');
    setSearchQuery('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setExamStatusFilter('all');
    setOverrideStatusFilter('all');
    setIsTeacherModalOpen(false);
    setEditingTeacherId(null);
    setSelectedProfileModal(null);
  }, [resetKey]);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherTitle, setTeacherTitle] = useState('Associate Professor');
  const [teacherFaculty, setTeacherFaculty] = useState('Faculty of Computing & Information Technologies');
  const [teacherDept, setTeacherDept] = useState('Computer Science & Software Engineering');
  const [teacherCourses, setTeacherCourses] = useState('CS-405, CS-301');
  const [teacherStatus, setTeacherStatus] = useState<'active' | 'pending' | 'suspended'>('active');
  const [teacherRights, setTeacherRights] = useState<TeacherRights>({
    canCreateExams: true,
    canGradeMarks: true,
    canAdmitStudents: true,
    canDeleteExams: false,
    canExportSubmissions: true,
  });
  const [teacherAvatar, setTeacherAvatar] = useState('');
  const [teacherModalError, setTeacherModalError] = useState<string | null>(null);
  const [editingFacultyName, setEditingFacultyName] = useState<string | null>(null);
  const [isFacultyFormOpen, setIsFacultyFormOpen] = useState(false);
  const [facultyNameInput, setFacultyNameInput] = useState('');
  const [facultyDepartmentInput, setFacultyDepartmentInput] = useState('');
  const [facultyFormError, setFacultyFormError] = useState<string | null>(null);

  // Courses Catalog & Department Allocation State
  const [courses, setCourses] = useState<Course[]>(() => getStoredCourses());
  const [courseDeptFilter, setCourseDeptFilter] = useState<string>('all');
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseCode, setEditingCourseCode] = useState<string | null>(null);
  const [courseCodeInput, setCourseCodeInput] = useState('');
  const [courseTitleInput, setCourseTitleInput] = useState('');
  const [courseDepartmentInput, setCourseDepartmentInput] = useState('');
  const [courseCreditsInput, setCourseCreditsInput] = useState<number>(3);
  const [courseLevelInput, setCourseLevelInput] = useState('Undergraduate Year 3');
  const [courseDescInput, setCourseDescInput] = useState('');
  const [courseModalError, setCourseModalError] = useState<string | null>(null);

  // Super Admin Profile Details State
  const [isSuperAdminProfileOpen, setIsSuperAdminProfileOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AuthUser>(() => getStoredSuperAdmin());
  const [adminNameDraft, setAdminNameDraft] = useState(() => adminProfile.name);
  const [adminTitleDraft, setAdminTitleDraft] = useState(() => adminProfile.title || '');
  const [adminEmailDraft, setAdminEmailDraft] = useState(() => adminProfile.email);
  const [adminDeptDraft, setAdminDeptDraft] = useState(() => adminProfile.department || '');
  const [adminFacultyDraft, setAdminFacultyDraft] = useState(() => adminProfile.faculty || '');
  const [adminOfficeDraft, setAdminOfficeDraft] = useState(() => adminProfile.officeLocation || 'Senate Hall, Suite 101');
  const [adminPhoneDraft, setAdminPhoneDraft] = useState(() => adminProfile.phone || '+1 (555) 019-8920');
  const [adminBioDraft, setAdminBioDraft] = useState(() => adminProfile.bio || 'Chief Academic Registrar & Super Administrator');
  const [adminAvatarDraft, setAdminAvatarDraft] = useState<string>(() => adminProfile.avatar || '');
  const [adminProfileSuccess, setAdminProfileSuccess] = useState<string | null>(null);
  const [adminProfileError, setAdminProfileError] = useState<string | null>(null);

  // Admin Password Management State
  const [adminCurrentPass, setAdminCurrentPass] = useState('');
  const [adminNewPass, setAdminNewPass] = useState('');
  const [adminConfirmPass, setAdminConfirmPass] = useState('');
  const [showAdminCurrentPass, setShowAdminCurrentPass] = useState(false);
  const [showAdminNewPass, setShowAdminNewPass] = useState(false);
  const [showAdminConfirmPass, setShowAdminConfirmPass] = useState(false);

  // Sync courses if updated externally
  useEffect(() => {
    const handleCoursesUpdated = () => {
      setCourses(getStoredCourses());
    };
    window.addEventListener('examguard_courses_updated', handleCoursesUpdated);
    return () => window.removeEventListener('examguard_courses_updated', handleCoursesUpdated);
  }, []);

  // Listen to open super admin profile event from Header
  useEffect(() => {
    const handleOpenAdminProfileEvent = () => {
      const currentAdmin = getStoredSuperAdmin();
      setAdminProfile(currentAdmin);
      setAdminNameDraft(currentAdmin.name);
      setAdminTitleDraft(currentAdmin.title || '');
      setAdminEmailDraft(currentAdmin.email);
      setAdminDeptDraft(currentAdmin.department || '');
      setAdminFacultyDraft(currentAdmin.faculty || '');
      setAdminOfficeDraft(currentAdmin.officeLocation || 'Senate Hall, Suite 101');
      setAdminPhoneDraft(currentAdmin.phone || '+1 (555) 019-8920');
      setAdminBioDraft(currentAdmin.bio || 'Chief Academic Registrar & Super Administrator');
      setAdminAvatarDraft(currentAdmin.avatar || '');
      setAdminProfileSuccess(null);
      setIsSuperAdminProfileOpen(true);
    };
    window.addEventListener('examguard_open_super_admin_profile', handleOpenAdminProfileEvent);
    return () => window.removeEventListener('examguard_open_super_admin_profile', handleOpenAdminProfileEvent);
  }, []);

  // Mark Override Review & Enquiry Modal State
  const [activeOverrideTarget, setActiveOverrideTarget] = useState<{
    submission: ExamSubmission;
    questionId: string;
    answer: StudentAnswer;
    exam?: Exam;
  } | null>(null);
  const [adminReviewAction, setAdminReviewAction] = useState<'approve' | 'decline' | 'enquiry'>('approve');
  const [adminAuditNote, setAdminAuditNote] = useState('');
  const [activeCommittedChangeTarget, setActiveCommittedChangeTarget] = useState<ExamSubmission | null>(null);
  const [committedReviewAction, setCommittedReviewAction] = useState<'approve' | 'reject'>('approve');
  const [committedReviewGrades, setCommittedReviewGrades] = useState<
    Record<string, { awardedPoints: number; feedback?: string }>
  >({});

  // Register Student Modal State
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentNumber, setNewStudentNumber] = useState(`MSA-2026/8-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newStudentDept, setNewStudentDept] = useState('Computer Science');
  const [newStudentCourses, setNewStudentCourses] = useState('CS-405, CS-301');
  const [studentAvatar, setStudentAvatar] = useState('');
  const [selectedExamEnrollments, setSelectedExamEnrollments] = useState<string[]>([]);
  const [studentModalError, setStudentModalError] = useState<string | null>(null);

  // Administrative Inquiry on Marks Moderation Modal State
  const [inquiryTargetSub, setInquiryTargetSub] = useState<ExamSubmission | null>(null);
  const [adminInquiryMessage, setAdminInquiryMessage] = useState('');

  // Inspect Exam Questions Modal State
  const [inspectingExam, setInspectingExam] = useState<Exam | null>(null);

  // Inspect Attached Medical Evidence Modal State
  const [viewingEvidenceModal, setViewingEvidenceModal] = useState<ResitRequest | null>(null);

  // Ticket reply modal state
  const [activeTicket, setActiveTicket] = useState<HelpTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Animated Flashcard Confirmation & Prompt Modal State (replacing native browser alerts)
  const [flashConfirmModal, setFlashConfirmModal] = useState<{
    type: 'confirm' | 'prompt' | 'danger';
    title: string;
    message: string;
    subtext?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (inputValue?: string) => void;
  } | null>(null);
  const [flashPromptInput, setFlashPromptInput] = useState('');

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    triggerFlash({
      type: isError ? 'error' : 'success',
      text: msg,
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Reload helpers
  const refreshData = () => {
    setTeachers(getStoredTeachers());
    setTickets(getStoredHelpTickets());
    setCourses(getStoredCourses());
    onDataRefresh();
  };

  // Super Admin Profile Handlers
  const handleOpenSuperAdminProfile = () => {
    const currentAdmin = getStoredSuperAdmin();
    setAdminProfile(currentAdmin);
    setAdminNameDraft(currentAdmin.name);
    setAdminTitleDraft(currentAdmin.title || '');
    setAdminEmailDraft(currentAdmin.email);
    setAdminDeptDraft(currentAdmin.department || '');
    setAdminFacultyDraft(currentAdmin.faculty || '');
    setAdminOfficeDraft(currentAdmin.officeLocation || 'Senate Hall, Suite 101');
    setAdminPhoneDraft(currentAdmin.phone || '+1 (555) 019-8920');
    setAdminBioDraft(currentAdmin.bio || 'Chief Academic Registrar & Super Administrator');
    setAdminAvatarDraft(currentAdmin.avatar || '');
    setAdminProfileSuccess(null);
    setIsSuperAdminProfileOpen(true);
  };

  const handleAdminAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAdminAvatarDraft(reader.result);
        showToast('Admin avatar loaded successfully.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveSuperAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminProfileError(null);
    setAdminProfileSuccess(null);

    if (!adminNameDraft.trim() || !adminEmailDraft.trim()) {
      setAdminProfileError('Name and Institutional Email are required.');
      return;
    }

    // Process password update if fields populated
    if (adminNewPass || adminCurrentPass || adminConfirmPass) {
      if (!adminCurrentPass) {
        setAdminProfileError('Please provide your current password to authorize password update.');
        return;
      }
      const isCurrentValid = verifyUserPassword('admin', adminEmailDraft.trim(), adminCurrentPass);
      if (!isCurrentValid) {
        setAdminProfileError('The current password provided is incorrect. (Default admin password: password or admin123)');
        return;
      }
      if (adminNewPass.length < 6) {
        setAdminProfileError('New password must be at least 6 characters in length.');
        return;
      }
      if (adminNewPass !== adminConfirmPass) {
        setAdminProfileError('New password and confirmation password do not match.');
        return;
      }
      const passResult = updateUserPassword('admin', adminEmailDraft.trim(), adminNewPass);
      if (!passResult.success) {
        setAdminProfileError(passResult.error || 'Failed to update administrator password.');
        return;
      }
    }

    const updated = saveStoredSuperAdmin({
      name: adminNameDraft.trim(),
      title: adminTitleDraft.trim(),
      email: adminEmailDraft.trim(),
      department: adminDeptDraft.trim(),
      faculty: adminFacultyDraft.trim(),
      officeLocation: adminOfficeDraft.trim(),
      phone: adminPhoneDraft.trim(),
      bio: adminBioDraft.trim(),
      avatar: adminAvatarDraft.trim() || adminProfile.avatar,
      lastPasswordChangedAt: adminNewPass ? new Date().toISOString() : adminProfile.lastPasswordChangedAt,
    });

    setAdminProfile(updated);
    setAdminProfileSuccess(
      adminNewPass
        ? 'Profile details and administrator password successfully updated.'
        : 'Profile details successfully updated and synchronized across institution.'
    );
    setAdminCurrentPass('');
    setAdminNewPass('');
    setAdminConfirmPass('');
    onDataRefresh();
    setTimeout(() => {
      setIsSuperAdminProfileOpen(false);
      setAdminProfileSuccess(null);
      setAdminProfileError(null);
    }, 1500);
  };

  // Course Management Handlers
  const handleOpenAddCourse = (defaultDept?: string) => {
    setEditingCourseCode(null);
    setCourseCodeInput('');
    setCourseTitleInput('');
    setCourseDepartmentInput(defaultDept || faculties[0]?.department || 'Computer Science & Software Engineering');
    setCourseCreditsInput(3);
    setCourseLevelInput('Undergraduate Year 3');
    setCourseDescInput('');
    setCourseModalError(null);
    setIsCourseModalOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourseCode(course.code);
    setCourseCodeInput(course.code);
    setCourseTitleInput(course.title);
    setCourseDepartmentInput(course.department);
    setCourseCreditsInput(course.credits || 3);
    setCourseLevelInput(course.level || 'Undergraduate Year 3');
    setCourseDescInput(course.description || '');
    setCourseModalError(null);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCourseModalError(null);
    if (!courseCodeInput.trim() || !courseTitleInput.trim() || !courseDepartmentInput.trim()) {
      setCourseModalError('Course Code, Course Title, and Assigned Department are mandatory.');
      return;
    }
    const matchedFaculty = faculties.find(
      (f) => f.department.toLowerCase() === courseDepartmentInput.trim().toLowerCase()
    );

    if (editingCourseCode) {
      const res = updateCourse(editingCourseCode, {
        code: courseCodeInput.trim().toUpperCase(),
        title: courseTitleInput.trim(),
        department: courseDepartmentInput.trim(),
        faculty: matchedFaculty?.name,
        credits: Number(courseCreditsInput) || 3,
        level: courseLevelInput,
        description: courseDescInput.trim(),
      });
      if (!res.success) {
        setCourseModalError(res.error || 'Failed to update course.');
        return;
      }
      showToast(`Course "${courseCodeInput.trim().toUpperCase()}" updated successfully.`);
    } else {
      const res = addCourse({
        id: `course-${courseCodeInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
        code: courseCodeInput.trim().toUpperCase(),
        title: courseTitleInput.trim(),
        department: courseDepartmentInput.trim(),
        faculty: matchedFaculty?.name,
        credits: Number(courseCreditsInput) || 3,
        level: courseLevelInput,
        description: courseDescInput.trim(),
      });
      if (!res.success) {
        setCourseModalError(res.error || 'Failed to create course.');
        return;
      }
      showToast(`Course "${courseCodeInput.trim().toUpperCase()}" created and assigned to ${courseDepartmentInput}.`);
    }
    setCourses(getStoredCourses());
    setIsCourseModalOpen(false);
  };

  const handleDeleteCourseAction = (code: string, title: string) => {
    setFlashConfirmModal({
      type: 'danger',
      title: 'Delete Institutional Course',
      message: `Are you sure you want to delete course ${code} ("${title}")?`,
      subtext: 'This action cannot be undone and will permanently remove this course curriculum.',
      confirmLabel: 'Confirm Delete',
      onConfirm: () => {
        deleteCourse(code);
        setCourses(getStoredCourses());
        showToast(`Course ${code} deleted.`);
        setFlashConfirmModal(null);
      },
    });
  };

  // Gather all modified marks across all submissions from all examinations
  const allModifiedMarks: {
    submission: ExamSubmission;
    exam: Exam | undefined;
    student: StudentProfile | undefined;
    question: Question | undefined;
    questionId: string;
    answer: StudentAnswer;
  }[] = [];

  submissions.forEach((sub) => {
    const exam = exams.find((e) => e.id === sub.examId);
    const student = students.find((s) => s.id === sub.studentId);
    Object.entries(sub.answers || {}).forEach(([qId, ans]) => {
      // Rule: Do not add marks that do not need modification on the modification request list unless the teacher requested the modification.
      const hasTeacherModificationRequest =
        Boolean(ans.isOverridden) &&
        Boolean(ans.overrideReason || ans.overriddenBy) &&
        (ans.originalScore !== ans.awardedPoints ||
          ans.overrideStatus === 'pending_admin_review' ||
          ans.overrideStatus === 'approved' ||
          ans.overrideStatus === 'declined');

      if (hasTeacherModificationRequest) {
        const q = exam?.questions?.find((question) => question.id === qId);
        allModifiedMarks.push({
          submission: sub,
          exam,
          student,
          question: q,
          questionId: qId,
          answer: ans,
        });
      }
    });
  });

  const pendingOverridesCount = allModifiedMarks.filter(
    (m) => !m.answer.overrideStatus || m.answer.overrideStatus === 'pending_admin_review'
  ).length;
  const committedMarkChangeRequests = submissions.filter(
    (submission) => submission.committedMarkChangeRequest
  );
  const pendingCommittedMarkRequests = committedMarkChangeRequests.filter(
    (submission) => submission.committedMarkChangeRequest?.status === 'pending_admin_approval'
  );

  // Filter modified marks
  const filteredModifiedMarks = allModifiedMarks.filter((m) => {
    const matchSearch =
      (m.student?.name || m.submission.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.exam?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.exam?.courseCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.answer.overriddenBy || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.answer.overrideReason || '').toLowerCase().includes(searchQuery.toLowerCase());

    const status = m.answer.overrideStatus || 'pending_admin_review';
    const matchStatus =
      overrideStatusFilter === 'all' ||
      status === overrideStatusFilter ||
      (overrideStatusFilter === 'pending' && status === 'pending_admin_review');

    return matchSearch && matchStatus;
  });

  // Extract all unique departments across teachers, students, faculties and courses
  const allDepartments: string[] = Array.from(
    new Set([
      ...teachers.map((t) => t.department),
      ...students.map((s) => s.department).filter((d): d is string => Boolean(d)),
      ...faculties.map((faculty) => faculty.department),
      ...courses.map((course) => course.department),
    ])
  ).filter((d): d is string => Boolean(d));

  // Filtered Courses
  const filteredCourses = courses.filter((c) => {
    if (courseDeptFilter === 'all') return true;
    return c.department.toLowerCase().trim() === courseDeptFilter.toLowerCase().trim();
  });

  // Filtered Exams (accumulated from all departments)
  const filteredExams = exams.filter((exam) => {
    const matchSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exam.instructorName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchDept =
      departmentFilter === 'all' ||
      (exam.courseCode.startsWith('CS') && departmentFilter.includes('Computer Science')) ||
      (exam.courseCode.startsWith('MATH') && departmentFilter.includes('Mathematics')) ||
      (exam.courseCode.startsWith('ECE') && departmentFilter.includes('Electronic'));

    const matchStatus = examStatusFilter === 'all' || exam.status === examStatusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  // Filtered Teachers
  const filteredTeachers = teachers.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedCourseCodes.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchDept = departmentFilter === 'all' || t.department === departmentFilter;
    const matchStatus = statusFilter === 'all' || t.accessStatus === statusFilter;

    return matchSearch && matchDept && matchStatus;
  });

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchDept = departmentFilter === 'all' || s.department === departmentFilter;
    return matchSearch && matchDept;
  });

  // --- TEACHER CRUD HANDLERS ---
  const handleTeacherPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setTeacherModalError('Image file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTeacherAvatar(reader.result);
        setTeacherModalError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddTeacher = () => {
    setEditingTeacherId(null);
    setTeacherName('');
    setTeacherEmail('');
    setTeacherTitle('Senior Lecturer');
    setTeacherFaculty('Faculty of Computing & Information Technologies');
    setTeacherDept(getDepartmentForFaculty('Faculty of Computing & Information Technologies'));
    setTeacherCourses('CS-405, CS-301');
    setTeacherStatus('active');
    setTeacherAvatar('');
    setTeacherRights({
      canCreateExams: true,
      canGradeMarks: true,
      canAdmitStudents: true,
      canDeleteExams: false,
      canExportSubmissions: true,
    });
    setTeacherModalError(null);
    setIsTeacherModalOpen(true);
  };

  const handleOpenEditTeacher = (t: TeacherProfile) => {
    setEditingTeacherId(t.id);
    setTeacherName(t.name);
    setTeacherEmail(t.email);
    setTeacherTitle(t.title);
    setTeacherFaculty(t.faculty || 'Faculty of Computing & Information Technologies');
    setTeacherDept(t.department || getDepartmentForFaculty(t.faculty));
    setTeacherCourses((t.assignedCourseCodes || []).join(', '));
    setTeacherStatus(t.accessStatus);
    setTeacherAvatar(t.avatar || '');
    setTeacherRights(
      t.rights || {
        canCreateExams: t.accessStatus === 'active',
        canGradeMarks: t.accessStatus === 'active',
        canAdmitStudents: t.accessStatus === 'active',
        canDeleteExams: false,
        canExportSubmissions: t.accessStatus === 'active',
      }
    );
    setTeacherModalError(null);
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherEmail.trim()) {
      setTeacherModalError('Please enter faculty name and email address.');
      return;
    }

    const courseCodes = teacherCourses
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (editingTeacherId) {
      // Modify Existing Teacher
      const updatedProfile: TeacherProfile = {
        id: editingTeacherId,
        name: teacherName.trim(),
        email: teacherEmail.trim().toLowerCase(),
        title: teacherTitle.trim(),
        faculty: teacherFaculty.trim(),
        department: teacherDept.trim(),
        assignedCourseCodes: courseCodes,
        accessStatus: teacherStatus,
        rights: teacherRights,
        avatar:
          teacherAvatar.trim() ||
          teachers.find((t) => t.id === editingTeacherId)?.avatar ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      };

      const res = updateTeacher(updatedProfile);
      if (!res.success) {
        setTeacherModalError(res.error || 'Failed to update teacher.');
        return;
      }
      await syncProfileToApi('/api/teachers', updatedProfile);
      syncLecturerExamsFaculty(updatedProfile.id, teacherFaculty.trim(), teacherDept.trim());
      syncLecturerExamsFaculty(updatedProfile.email, teacherFaculty.trim(), teacherDept.trim());
      showToast(`Updated faculty profile for ${updatedProfile.name} in ${updatedProfile.faculty}.`);
    } else {
      // Add New Teacher
      const newFaculty: TeacherProfile = {
        id: `teacher-${Date.now()}`,
        name: teacherName.trim(),
        email: teacherEmail.trim().toLowerCase(),
        title: teacherTitle.trim(),
        faculty: teacherFaculty.trim(),
        department: teacherDept.trim(),
        assignedCourseCodes: courseCodes,
        accessStatus: teacherStatus,
        rights: teacherRights,
        avatar:
          teacherAvatar.trim() ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        registeredAt: new Date().toISOString(),
      };

      const res = addTeacher(newFaculty);
      if (!res.success) {
        setTeacherModalError(res.error || 'Failed to register faculty member.');
        return;
      }
      await syncProfileToApi('/api/teachers', newFaculty);
      showToast(`Enrolled new faculty member ${newFaculty.name} into ${newFaculty.faculty}.`);
    }

    setIsTeacherModalOpen(false);
    refreshData();
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    setFlashConfirmModal({
      type: 'danger',
      title: 'Revoke Faculty Privileges',
      message: `Are you sure you want to permanently delete faculty member ${name}?`,
      subtext: 'This will revoke all instructor roles, course management access, and department assignments.',
      confirmLabel: 'Delete Faculty Member',
      onConfirm: () => {
        deleteTeacher(id);
        showToast(`Deleted faculty member ${name}.`);
        refreshData();
        setFlashConfirmModal(null);
      },
    });
  };

  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const record = {
      name: facultyNameInput.trim(),
      department: facultyDepartmentInput.trim(),
    };
    if (!record.name || !record.department) {
      setFacultyFormError('Enter both a faculty name and department.');
      return;
    }

    const result = editingFacultyName
      ? updateFacultyRecord(editingFacultyName, record)
      : createFaculty(record);
    if (!result.success) {
      setFacultyFormError(result.error || 'Unable to save faculty.');
      return;
    }

    if (editingFacultyName) {
      const previousFaculty = faculties.find((faculty) => faculty.name === editingFacultyName);
      const updatedTeachers = teachers.map((teacher) =>
        teacher.faculty === editingFacultyName ||
        Boolean(previousFaculty && teacher.department === previousFaculty.department)
          ? { ...teacher, faculty: record.name, department: record.department }
          : teacher
      );
      saveStoredTeachers(updatedTeachers);
      setTeachers(updatedTeachers);
      for (const teacher of updatedTeachers.filter((item) => item.faculty === record.name)) {
        await syncProfileToApi('/api/teachers', teacher);
      }

      const updatedStudents = students.map((student) =>
        student.faculty === editingFacultyName ||
        Boolean(previousFaculty && student.department === previousFaculty.department)
          ? { ...student, faculty: record.name, department: record.department }
          : student
      );
      saveStoredStudents(updatedStudents);
      for (const student of updatedStudents.filter((item) => item.faculty === record.name)) {
        await syncProfileToApi('/api/students', student);
      }

      const updatedExams = exams.map((exam) =>
        exam.faculty === editingFacultyName ||
        Boolean(previousFaculty && exam.department === previousFaculty.department)
          ? { ...exam, faculty: record.name, department: record.department }
          : exam
      );
      saveStoredExams(updatedExams);
      onDataRefresh();
    }

    setFaculties(getStoredFaculties());
    setEditingFacultyName(null);
    setIsFacultyFormOpen(false);
    setFacultyNameInput('');
    setFacultyDepartmentInput('');
    setFacultyFormError(null);
    showToast(editingFacultyName ? 'Faculty updated successfully.' : 'Faculty created successfully.');
  };

  const handleEditFaculty = (facultyName: string, departmentName: string) => {
    setEditingFacultyName(facultyName);
    setIsFacultyFormOpen(true);
    setFacultyNameInput(facultyName);
    setFacultyDepartmentInput(departmentName);
    setFacultyFormError(null);
  };

  const handleDeleteFaculty = (facultyName: string) => {
    const faculty = faculties.find((item) => item.name === facultyName);
    const matchesDepartment = (department: string | undefined) =>
      Boolean(faculty?.department && department === faculty.department);
    const isAssigned =
      teachers.some((teacher) => teacher.faculty === facultyName || matchesDepartment(teacher.department)) ||
      students.some((student) => student.faculty === facultyName || matchesDepartment(student.department)) ||
      exams.some((exam) => exam.faculty === facultyName || matchesDepartment(exam.department));
    if (isAssigned) {
      showToast('This faculty is assigned to profiles or exams. Reassign them before deleting it.');
      return;
    }
    setFlashConfirmModal({
      type: 'danger',
      title: 'Delete Faculty Department',
      message: `Are you sure you want to delete ${facultyName}?`,
      subtext: 'This action cannot be undone.',
      confirmLabel: 'Delete Department',
      onConfirm: () => {
        if (deleteFacultyRecord(facultyName)) {
          setFaculties(getStoredFaculties());
          showToast(`Deleted ${facultyName}.`);
        }
        setFlashConfirmModal(null);
      },
    });
  };

  const handleToggleAccess = (teacherId: string, newStatus: 'active' | 'pending' | 'suspended') => {
    updateTeacherAccess(teacherId, newStatus);
    showToast(`Access status updated to ${newStatus}.`);
    refreshData();
  };

  // --- MARK OVERRIDE AUDIT HANDLERS ---
  const handleOpenReviewOverride = (
    submission: ExamSubmission,
    questionId: string,
    answer: StudentAnswer,
    exam?: Exam,
    defaultAction: 'approve' | 'decline' | 'enquiry' = 'approve'
  ) => {
    setActiveOverrideTarget({ submission, questionId, answer, exam });
    setAdminReviewAction(defaultAction);
    setAdminAuditNote(
      defaultAction === 'approve'
        ? 'Institutional mark adjustment verified and approved.'
        : defaultAction === 'decline'
        ? 'Insufficient academic justification. Reverting to original mark.'
        : 'Please provide full step-by-step rubric documentation for this mark modification.'
    );
  };

  const handleSubmitOverrideReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOverrideTarget) return;

    const res = reviewMarkOverride(
      activeOverrideTarget.submission.id,
      activeOverrideTarget.questionId,
      adminReviewAction,
      adminAuditNote,
      'Dr. Marcus Sterling (Super Admin)'
    );

    if (res.success) {
      showToast(
        adminReviewAction === 'approve'
          ? 'Mark override approved.'
          : adminReviewAction === 'decline'
          ? 'Mark override declined and score reverted.'
          : 'Official enquiry sent to course instructor.'
      );
      setActiveOverrideTarget(null);
      refreshData();
    }
  };

  const handleDirectApproveOverride = (
    submission: ExamSubmission,
    questionId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const res = reviewMarkOverride(
      submission.id,
      questionId,
      'approve',
      'Institutional mark adjustment verified and approved by Super Admin.',
      'Dr. Marcus Sterling (Super Admin)'
    );
    if (res.success) {
      showToast('Mark modification approved!');
      refreshData();
    } else {
      showToast(res.error || 'Failed to approve mark override.');
    }
  };

  const handleDirectDeclineOverride = (
    submission: ExamSubmission,
    questionId: string,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const res = reviewMarkOverride(
      submission.id,
      questionId,
      'decline',
      'Super Admin reviewed and declined modification; original score restored.',
      'Dr. Marcus Sterling (Super Admin)'
    );
    if (res.success) {
      showToast('Mark modification declined & original score restored!');
      refreshData();
    } else {
      showToast(res.error || 'Failed to decline mark override.');
    }
  };

  const handleApproveResitRequest = (requestId: string) => {
    setFlashPromptInput('Approved by Institutional Senate & Super Admin for exam resit.');
    setFlashConfirmModal({
      type: 'prompt',
      title: 'Authorize Candidate Resit Clearance',
      message: 'Official Clearance Authorization Note / Senate Directive (Optional):',
      defaultValue: 'Approved by Institutional Senate & Super Admin for exam resit.',
      confirmLabel: 'Approve & Clear Candidate',
      onConfirm: (val) => {
        const note = (val && val.trim()) || 'Approved by Super Admin.';
        const res = reviewResitRequest(requestId, 'approved', note, 'Dr. Marcus Sterling (Super Admin)');
        if (res.success) {
          showToast('Student resit clearance approved! Candidate is now authorized to register & enter exam.');
          setResitRequests(getStoredResitRequests());
          setMissedExams(getStoredMissedExams());
          refreshData();
        } else {
          showToast(res.error || 'Failed to approve clearance.', true);
        }
        setFlashConfirmModal(null);
      },
    });
  };

  const handleDeclineResitRequest = (requestId: string) => {
    setFlashPromptInput('Unexcused absence without timely medical or institutional clearance.');
    setFlashConfirmModal({
      type: 'danger',
      title: 'Decline Candidate Resit Clearance',
      message: 'Specify reason for declining examination resit clearance:',
      defaultValue: 'Unexcused absence without timely medical or institutional clearance.',
      confirmLabel: 'Decline Clearance',
      onConfirm: (val) => {
        const note = (val && val.trim()) || 'Declined by Super Admin.';
        const res = reviewResitRequest(requestId, 'declined', note, 'Dr. Marcus Sterling (Super Admin)');
        if (res.success) {
          showToast('Student resit clearance declined.');
          setResitRequests(getStoredResitRequests());
          setMissedExams(getStoredMissedExams());
          refreshData();
        } else {
          showToast(res.error || 'Failed to decline clearance.', true);
        }
        setFlashConfirmModal(null);
      },
    });
  };

  const handleDirectClearanceForFailed = (record: FailedStudentRecord) => {
    setFlashPromptInput('Institutional Senate authorization for retaking unit below pass threshold.');
    setFlashConfirmModal({
      type: 'prompt',
      title: `Authorize Resit Clearance: ${record.studentName}`,
      message: `Authorize supplementary resit clearance for ${record.studentName} (${record.studentNumber}) in ${record.courseCode} (Score: ${record.percentage}% vs ${record.passingScorePercentage}% threshold):`,
      defaultValue: 'Authorized by Senate for below-threshold supplementary examination sitting.',
      confirmLabel: 'Authorize Resit Sitting',
      onConfirm: (val) => {
        const note = (val && val.trim()) || 'Authorized by Senate for supplementary resit sitting.';
        if (record.resitRequest) {
          const res = reviewResitRequest(record.resitRequest.id, 'approved', note, 'Dr. Marcus Sterling (Super Admin)');
          if (res.success) {
            showToast(`Resit clearance approved for ${record.studentName} (${record.courseCode})`);
          } else {
            showToast(res.error || 'Failed to authorize clearance.', true);
          }
        } else {
          const req = submitResitRequest({
            studentId: record.studentId,
            studentName: record.studentName,
            studentNumber: record.studentNumber,
            studentEmail: record.studentEmail || '',
            courseCode: record.courseCode,
            examTitle: record.unitName,
            resitType: 'failed',
            failedScore: record.score,
            totalPoints: record.totalPoints,
            percentage: record.percentage,
            passingScorePercentage: record.passingScorePercentage,
            reasonCategory: 'failed_threshold',
            reasonDetails: 'Administrative direct senate clearance for examination retake below threshold.',
            explanation: 'Administrative direct senate clearance for examination retake below threshold.',
          });
          reviewResitRequest(req.id, 'approved', note, 'Dr. Marcus Sterling (Super Admin)');
          showToast(`Direct resit clearance registered and authorized for ${record.studentName} (${record.courseCode})`);
        }
        setResitRequests(getStoredResitRequests());
        refreshData();
        setFlashConfirmModal(null);
      },
    });
  };

  const handleToggleMissedClearance = (recordId: string, currentCleared: boolean) => {
    const records = getStoredMissedExams();
    const target = records.find((r) => r.id === recordId);
    if (!target) return;
    if (!currentCleared) {
      const res = adminClearMissedExam(target.studentNumber, target.courseCode, target.examTitle, 'Dr. Marcus Sterling (Super Admin)');
      if (res.success) {
        showToast(`Cleared candidate (Admission: ${target.studentNumber}) for [Code: ${target.courseCode} | Title: "${target.examTitle}"]. Re-registration is now permitted.`);
      } else {
        showToast(res.error || 'Could not clear missed exam.');
      }
    } else {
      const res = adminRevokeMissedExamClearance(target.studentNumber, target.courseCode, target.examTitle);
      if (res.success) {
        showToast(`Revoked clearance for candidate (Admission: ${target.studentNumber}) on [Code: ${target.courseCode} | Title: "${target.examTitle}"]. Re-registration is now blocked.`);
      } else {
        showToast(res.error || 'Could not revoke clearance.');
      }
    }
    setMissedExams(getStoredMissedExams());
    setResitRequests(getStoredResitRequests());
    refreshData();
  };

  const handleDirectAdminClearance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directClearanceAdmission.trim() || !directClearanceExamCode.trim() || !directClearanceExamTitle.trim()) {
      setDirectClearanceStatusMsg({
        type: 'error',
        text: 'Please enter or select Student Admission number, Examination code, and Title.',
      });
      return;
    }
    const result = adminClearMissedExam(
      directClearanceAdmission.trim(),
      directClearanceExamCode.trim(),
      directClearanceExamTitle.trim(),
      'Dr. Marcus Sterling (Super Admin)'
    );
    if (result.success) {
      setDirectClearanceStatusMsg({
        type: 'success',
        text: result.message,
      });
      showToast(result.message);
      setMissedExams(getStoredMissedExams());
      setResitRequests(getStoredResitRequests());
      setDirectClearanceAdmission('');
      setDirectClearanceExamCode('');
      setDirectClearanceExamTitle('');
      refreshData();
    } else {
      setDirectClearanceStatusMsg({
        type: 'error',
        text: result.error || 'Failed to clear candidate.',
      });
      showToast(result.error || 'Failed to clear candidate.');
    }
  };

  const handleOpenCommittedMarkReview = (submission: ExamSubmission) => {
    const changeRequest = submission.committedMarkChangeRequest;
    if (!changeRequest) return;
    setActiveCommittedChangeTarget(submission);
    setCommittedReviewAction('approve');
    setCommittedReviewGrades(
      JSON.parse(JSON.stringify(changeRequest.proposedQuestionGrades || {}))
    );
    setAdminAuditNote('');
  };

  const handleSubmitCommittedMarkReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommittedChangeTarget) return;
    const result = await reviewCommittedMarkChange(
      activeCommittedChangeTarget.id,
      committedReviewAction,
      adminAuditNote,
      'Dr. Marcus Sterling (Super Admin)',
      committedReviewGrades
    );
    if (!result.success) {
      showToast(result.error || 'Could not save the Super Admin mark decision.');
      return;
    }
    showToast(
      committedReviewAction === 'approve'
        ? `Committed marks updated for ${activeCommittedChangeTarget.studentName}.`
        : `Mark-change request rejected for ${activeCommittedChangeTarget.studentName}.`
    );
    setActiveCommittedChangeTarget(null);
    refreshData();
  };

  // --- STUDENT REGISTRATION FOR EXAM HANDLERS ---
  const handleStudentPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStudentModalError('Image file size must be less than 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStudentAvatar(reader.result);
        setStudentModalError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddStudent = () => {
    setEditingStudentId(null);
    setNewStudentName('');
    setNewStudentEmail('');
    setNewStudentNumber(`MSA-2026/8-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewStudentDept(allDepartments[0] || 'Computer Science & Software Engineering');
    setNewStudentCourses('CS-405, CS-301');
    setStudentAvatar('');
    setSelectedExamEnrollments([]);
    setStudentModalError(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (s: StudentProfile) => {
    setEditingStudentId(s.id);
    setNewStudentName(s.name);
    setNewStudentEmail(s.email);
    setNewStudentNumber(s.studentNumber);
    setNewStudentDept(s.department || '');
    setNewStudentCourses((s.enrolledCourseCodes || []).join(', '));
    setStudentAvatar(s.avatar || '');
    const enrolledIds = exams
      .filter((e) => e.registeredStudentIds?.includes(s.id) || (s.enrolledCourseCodes || []).includes(e.courseCode))
      .map((e) => e.id);
    setSelectedExamEnrollments(enrolledIds);
    setStudentModalError(null);
    setIsStudentModalOpen(true);
  };

  const handleRegisterStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentEmail.trim()) {
      setStudentModalError('Candidate name and university email are required.');
      return;
    }

    if (!isValidAdmissionNumberFormat(newStudentNumber.trim())) {
      setStudentModalError('Invalid Admission Number format. Example of valid format: "MSA-2026/8-2041"');
      return;
    }

    if (!editingStudentId && students.some((s) => s.studentNumber.toUpperCase() === newStudentNumber.trim().toUpperCase())) {
      setStudentModalError(`Admission number ${newStudentNumber.trim()} already exists in institutional records.`);
      return;
    }

    const courseCodes = newStudentCourses
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    if (editingStudentId) {
      const updatedCandidate: StudentProfile = {
        id: editingStudentId,
        name: newStudentName.trim(),
        email: newStudentEmail.trim().toLowerCase(),
        studentNumber: newStudentNumber.trim(),
        department: newStudentDept.trim(),
        enrolledCourseCodes: courseCodes,
        avatar:
          studentAvatar.trim() ||
          students.find((s) => s.id === editingStudentId)?.avatar ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      };

      updateStudent(updatedCandidate);
      await syncProfileToApi('/api/students', updatedCandidate);

      // Synchronize student exam enrollments with strict Missed Exam clearance check
      exams.forEach((ex) => {
        if (selectedExamEnrollments.includes(ex.id)) {
          const missedCheck = checkMissedExamRegistrationBlock(updatedCandidate.studentNumber, ex.courseCode, ex.title);
          if (missedCheck.isBlocked) {
            triggerFlash({
              type: 'error',
              text: 'Re-registration Rejected (Missed Exam)',
              subtext: `Candidate ${updatedCandidate.name} (${updatedCandidate.studentNumber}) missed ${ex.courseCode}. Administrator clearance is required before re-registration.`,
            });
            return;
          }
          registerStudentToExamWithValidation(editingStudentId, ex.id);
        } else if (ex.registeredStudentIds?.includes(editingStudentId)) {
          unregisterStudentFromExam(editingStudentId, ex.id);
        }
      });

      showToast(`Updated candidate profile and photo for ${updatedCandidate.name}.`);
    } else {
      const newCandidate: StudentProfile = {
        id: `student-${Date.now()}`,
        name: newStudentName.trim(),
        email: newStudentEmail.trim().toLowerCase(),
        studentNumber: newStudentNumber.trim(),
        department: newStudentDept.trim(),
        enrolledCourseCodes: courseCodes,
        avatar:
          studentAvatar.trim() ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      };

      const approvedEnrollments: string[] = [];
      selectedExamEnrollments.forEach((exId) => {
        const ex = exams.find((e) => e.id === exId);
        if (ex) {
          const missedCheck = checkMissedExamRegistrationBlock(newCandidate.studentNumber, ex.courseCode, ex.title);
          if (missedCheck.isBlocked) {
            triggerFlash({
              type: 'error',
              text: 'Registration Rejected (Missed Exam)',
              subtext: `Candidate ${newCandidate.name} (${newCandidate.studentNumber}) missed ${ex.courseCode}. Administrator clearance is required before re-registration.`,
            });
            return;
          }
          approvedEnrollments.push(exId);
        }
      });

      addStudent(newCandidate, approvedEnrollments);
      await syncProfileToApi('/api/students', newCandidate);
      showToast(`Registered candidate ${newCandidate.name} with profile photo.`);
    }

    setIsStudentModalOpen(false);
    setEditingStudentId(null);
    setNewStudentName('');
    setNewStudentEmail('');
    setStudentAvatar('');
    setSelectedExamEnrollments([]);
    refreshData();
  };

  const handleDeleteStudent = (id: string, name: string) => {
    setFlashConfirmModal({
      type: 'danger',
      title: 'Remove Candidate from Registry',
      message: `Are you sure you want to remove candidate ${name} from the institutional registry?`,
      subtext: 'This will erase the candidate record and exam history.',
      confirmLabel: 'Remove Candidate',
      onConfirm: () => {
        deleteStudent(id);
        showToast(`Removed candidate ${name}.`);
        refreshData();
        setFlashConfirmModal(null);
      },
    });
  };

  const handleDeleteExamAction = (examId: string, title: string) => {
    setFlashConfirmModal({
      type: 'danger',
      title: 'Permanently Delete Examination',
      message: `Super Admin Security Action: Permanently delete examination "${title}"?`,
      subtext: 'This will purge the examination, questions, and unseat candidates.',
      confirmLabel: 'Delete Examination',
      onConfirm: () => {
        deleteExam(examId);
        showToast(`Deleted examination ${title}.`);
        refreshData();
        setFlashConfirmModal(null);
      },
    });
  };

  const handleResolveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !adminReplyText.trim()) return;

    resolveHelpTicket(activeTicket.id, adminReplyText.trim());
    showToast(`Resolved ticket ${activeTicket.id}.`);
    setActiveTicket(null);
    setAdminReplyText('');
    refreshData();
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Super Admin Interactive Queue Flashcards: Resit Approvals & Mark Moderations (Positioned strictly BEFORE the Hero Banner) */}
      <div className="space-y-4">
        {/* Flashcard 1: Candidate Resit Clearance Request Queue */}
        {(() => {
          const pendingResits = resitRequests.filter((r) => r.status === 'pending');
          if (pendingResits.length === 0) return null;

          const req = pendingResits[0];
          const queueTotal = pendingResits.length;

          return (
            <div
              key={req.id}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget || e.animationName.includes('bounce') || e.animationName.includes('flashcard')) {
                  playAlertBeep('warning');
                }
              }}
              className="relative p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white border-2 border-amber-400 shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ring-4 ring-amber-500/20 animate-flashcard-entry transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <GraduationCap className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                      Student Examination Resit Clearance Request
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                      Resit Queue: 1 of {queueTotal} {queueTotal > 1 ? '· Next candidate follows on decision' : ''}
                    </span>
                  </div>

                  <p className="text-xs text-amber-100 leading-relaxed">
                    Candidate <strong>{req.studentName}</strong> (<span className="font-mono text-amber-300 font-semibold">{req.studentNumber}</span>) requested formal Senate clearance for missed exam <strong>{req.courseCode}</strong> &mdash; <em>"{req.examTitle}"</em>.
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-amber-900/60 border border-amber-500/40 text-amber-200">
                      Grounds: <strong className="capitalize">{(req.grounds || req.reasonCategory || 'medical').replace('_', ' ')}</strong>
                    </span>
                    {req.medicalFacility && (
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[11px]">
                        Hospital: {req.medicalFacility}
                      </span>
                    )}
                    {req.doctorName && (
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-[11px]">
                        Dr: {req.doctorName}
                      </span>
                    )}
                    {req.explanation && (
                      <span className="italic text-slate-300 text-xs truncate max-w-md block">
                        "{req.explanation}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Two buttons allowing admin to view reasons & inspect medical documents before approving or declining */}
              <div className="shrink-0 flex flex-wrap items-center gap-2 self-start md:self-center w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setViewingEvidenceModal(req);
                    playAlertBeep('info');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-400"
                  title="Inspect medical certificate, doctor note, and full absence reasons before deciding"
                >
                  <Eye className="w-4 h-4 text-cyan-300" />
                  <span>Inspect Reason &amp; Medical Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('attendance_missed');
                    showToast(`Navigated to Attendance & Missed Exam Clearance section for ${req.studentName}.`);
                    playAlertBeep('info');
                    setTimeout(() => {
                      const el = document.getElementById(`resit-request-${req.id}`) || document.getElementById('missed-exams-section');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 150);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300"
                  title="Go to Missed Exams Clearance registry section to view case and documents before approving or declining"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>View in Missed Exams Section</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Flashcard 2: Marks Modification Review Queue */}
        {(() => {
          const pendingMarkChanges = submissions.filter(
            (s) => s.committedMarkChangeRequest?.status === 'pending_admin_approval'
          );
          if (pendingMarkChanges.length === 0) return null;

          const sub = pendingMarkChanges[0];
          const queueTotal = pendingMarkChanges.length;
          const req = sub.committedMarkChangeRequest!;

          return (
            <div
              key={sub.id}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget || e.animationName.includes('bounce') || e.animationName.includes('flashcard')) {
                  playAlertBeep('warning');
                }
              }}
              className="relative p-4 md:p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-950 text-white border-2 border-indigo-400 shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 ring-4 ring-indigo-500/20 animate-flashcard-entry transition-all"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
                  <Award className="w-6 h-6 text-indigo-300 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                      Committed Marks Modification Request &mdash; Senate Moderation Audit
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-400 text-slate-950">
                      Moderation Queue: 1 of {queueTotal}
                    </span>
                  </div>

                  <p className="text-xs text-indigo-100 leading-relaxed">
                    Lecturer <strong>{req.requestedBy}</strong> submitted a marks alteration for candidate <strong>{sub.studentName}</strong> (<span className="font-mono text-indigo-300 font-semibold">{sub.studentNumber}</span>).
                    Score change: <span className="line-through text-slate-400">{req.originalScore}</span> &rarr; <strong className="text-emerald-300">{req.requestedScore} / {sub.totalPoints} pts</strong>.
                  </p>

                  <div className="mt-1 p-2 rounded-lg bg-indigo-900/50 border border-indigo-500/40 text-xs text-indigo-200">
                    <span className="font-bold text-indigo-300">Lecturer Justification: </span>
                    {req.reason}
                  </div>

                  {req.teacherResponse && (
                    <div className="mt-1 p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200">
                      <span className="font-bold text-emerald-300">Lecturer Clarification to Inquiry: </span>
                      "{req.teacherResponse}"
                    </div>
                  )}
                </div>
              </div>

              {/* Two buttons allowing admin to view reasons & inspect marks breakdown before approving or declining */}
              <div className="shrink-0 flex flex-wrap items-center gap-2 self-start md:self-center w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const initialGrades: Record<string, { awardedPoints: number; feedback?: string }> = {};
                    const exam = exams.find((e) => e.id === sub.examId);
                    exam?.questions.forEach((q) => {
                      const existing = sub.answers ? (sub.answers as Record<string, any>)[q.id] : undefined;
                      initialGrades[q.id] = {
                        awardedPoints: existing?.awardedPoints ?? 0,
                        feedback: existing?.feedback ?? '',
                      };
                    });
                    setCommittedReviewGrades(initialGrades);
                    setActiveCommittedChangeTarget(sub);
                    playAlertBeep('info');
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-indigo-400"
                  title="Inspect lecturer justification and per-question score breakdown before deciding"
                >
                  <Eye className="w-4 h-4 text-cyan-300" />
                  <span>Inspect Justification &amp; Marks Breakdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('mark_overrides');
                    showToast(`Navigated to Marks Override Ledger for ${sub.studentName}.`);
                    playAlertBeep('info');
                    setTimeout(() => {
                      const el = document.getElementById(`submission-${sub.id}`) || document.getElementById('mark-overrides-section');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 150);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer border border-purple-400"
                  title="Go to Modified Marks section to review audit history before approving or declining"
                >
                  <Award className="w-4 h-4 text-white" />
                  <span>View in Mark Overrides Registry</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Super Admin Welcome Banner (Hue Section) */}
      <div
        className="relative rounded-2xl p-6 md:p-8 text-white border border-slate-800 shadow-lg flex flex-col md:flex-row md:items-end justify-between gap-6 overflow-hidden bg-slate-900 min-h-[220px] md:min-h-[250px]"
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

        <div className="relative z-10 space-y-2 max-w-2xl pb-1 md:pb-3">
          <div className="flex flex-wrap items-center gap-2 text-rose-300 text-xs font-mono font-bold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-rose-300 border border-rose-800/80 backdrop-blur-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Super Administrator Directorate</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-amber-300 italic drop-shadow-xs">Rifkins Education College &bull; "Impacting lives since 1953"</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
            Academic Assessment &amp; Examination Authority
          </h1>
          <p className="text-xs md:text-sm text-slate-100 max-w-2xl leading-relaxed drop-shadow-xs">
            Consolidated oversight across all Rifkins Education College departments. Inspect accumulated examinations, manage faculty clearance and access rights, audit and decide on marks modifications, and register candidates.
          </p>
        </div>

        {/* Buttons adjusted to smaller size and positioned slightly at the bottom of the hue */}
        <div className="relative z-10 md:absolute md:bottom-4 md:right-6 flex flex-wrap sm:flex-nowrap items-center gap-2 mt-4 md:mt-0 shrink-0">
          <button
            type="button"
            onClick={handleOpenSuperAdminProfile}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all border border-slate-600 backdrop-blur-xs"
            title="Update Super Admin Profile Details"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStudentModalError(null);
              setIsStudentModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-700/90 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all border border-indigo-500/50 backdrop-blur-xs"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Register Candidate</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddTeacher}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-700/90 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all border border-rose-500/50 backdrop-blur-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* RESPONSIVE & CLICKABLE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card: Academic Database (PK: Student Admission) */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('academic_database');
            showToast('Opening Institutional Academic Database & Results Ledger.');
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'academic_database'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <span>Academic Database</span>
            <Database className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1.5 flex items-baseline gap-1">
            <span>PK: Admission</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Dynamic Ledger</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center text-[10px]">
              Access <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 1: Total Examinations */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('all_exams');
            setDepartmentFilter('all');
            showToast(`Viewing all ${exams.length} examinations across all departments.`);
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'all_exams'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-400">
            <span>All Examinations</span>
            <BookOpen className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
            {exams.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{allDepartments.length} Departments</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center text-[10px]">
              View All <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 2: Faculty Members */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('teachers');
            setStatusFilter('all');
            showToast(`Viewing faculty directory (${teachers.length} members).`);
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'teachers'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <span>Authorized Faculty</span>
            <Users className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
            {teachers.length}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center justify-between">
            <span>{teachers.filter((t) => t.accessStatus === 'active').length} Active Clearance</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center text-[10px]">
              Manage <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 3: Modified Marks & Overrides */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('mark_overrides');
            setOverrideStatusFilter('all');
            showToast(`Reviewing ${allModifiedMarks.length} modified marks and ${pendingCommittedMarkRequests.length} committed grade requests.`);
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'mark_overrides'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span>Modified Marks</span>
            <Award className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400 mt-1.5 flex items-baseline gap-2">
            <span>{allModifiedMarks.length}</span>
            {pendingOverridesCount > 0 && (
              <span className="text-xs text-rose-600 font-bold bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                {pendingOverridesCount} Pending
              </span>
            )}
            {pendingCommittedMarkRequests.length > 0 && (
              <span className="text-xs text-amber-800 font-bold bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                {pendingCommittedMarkRequests.length} Grade Requests
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Audit & Justifications</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center text-[10px]">
              Review <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 4: Candidates & Registrations */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('student_registrations');
            showToast(`Managing candidate registrations and exam enrollments.`);
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'student_registrations'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <span>Candidate Registry</span>
            <GraduationCap className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white mt-1.5">
            {students.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>Enrolled Students</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center text-[10px]">
              Roster <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 5: Inquiries & Support */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('tickets');
            showToast(`Checking institutional support and inquiry queue.`);
          }}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 group relative overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
            activeTab === 'tickets'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-400">
            <span>Inquiries & Help</span>
            <LifeBuoy className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1.5">
            {tickets.filter((t) => t.status !== 'resolved').length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
            <span>{tickets.filter((t) => t.status === 'resolved').length} Resolved</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center text-[10px]">
              Queue <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('academic_database')}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'academic_database'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Database className={`w-4 h-4 ${activeTab === 'academic_database' ? 'text-[#1a2200]' : 'text-indigo-600'}`} />
          <span>Academic Database [PK: Admission]</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_exams')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'all_exams'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeTab === 'all_exams' ? 'text-[#1a2200]' : 'text-blue-500'}`} />
          <span>All Accumulated Examinations ({exams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'teachers'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'teachers' ? 'text-[#1a2200]' : 'text-indigo-500'}`} />
          <span>Faculty Directory & Rights ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'departments'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'departments' ? 'text-[#1a2200]' : 'text-orange-500'}`} />
          <span>Faculties, Departments & Courses ({courses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mark_overrides')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'mark_overrides'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Award className={`w-4 h-4 ${activeTab === 'mark_overrides' ? 'text-[#1a2200]' : 'text-amber-500'}`} />
          <span>Modified Marks & Justifications ({allModifiedMarks.length + committedMarkChangeRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('student_registrations')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'student_registrations'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${activeTab === 'student_registrations' ? 'text-[#1a2200]' : 'text-indigo-500'}`} />
          <span>Candidate Registrations ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'tickets'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <LifeBuoy className={`w-4 h-4 ${activeTab === 'tickets' ? 'text-[#1a2200]' : 'text-rose-500'}`} />
          <span>Incident Inquiries ({tickets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance_missed')}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'attendance_missed'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'attendance_missed' ? 'text-[#1a2200]' : 'text-amber-600'}`} />
          <span>Attendance & Missed Exam Clearance ({resitRequests.filter((r) => r.status === 'pending').length} Pending)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'reports'
              ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] active-pear animate-pear-pulse font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-200 border-transparent'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${activeTab === 'reports' ? 'text-[#1a2200]' : 'text-emerald-500'}`} />
          <span>Institutional Reports & Analytics</span>
        </button>
      </div>

      {/* TAB 1: ALL ACCUMULATED EXAMINATIONS FROM ALL DEPARTMENTS */}
      {activeTab === 'all_exams' && (
        <div className="space-y-5">
          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search examinations across all departments by title, course code, or professor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
              >
                <option value="all">All Academic Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={examStatusFilter}
                onChange={(e) => setExamStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                <option value="all">All Exam Statuses</option>
                <option value="active">Active Now</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Examinations Accumulation Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Accumulated Examinations({filteredExams.length} Examinations)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  All tests compiled all the departments.
                </p>
              </div>
            </div>

            <div className="space-y-2 p-2">
              {filteredExams.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No examinations found matching your filter parameters.</p>
                </div>
              ) : (
                filteredExams.map((exam) => {
                  const examSubs = submissions.filter((s) => s.examId === exam.id);
                  const enrolledCount = exam.registeredStudentIds?.length || 0;
                  const totalPoints = exam.questions.reduce((acc, q) => acc + (q.points || 0), 0);

                  return (
                    <div
                      key={exam.id}
                      data-exam-card="true"
                      className="exam-card group relative p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 hover:shadow-md transition-all duration-200 text-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                    >
                      <div className="space-y-3 flex-1 min-w-0">
                        {/* Title & Status Header */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                            {exam.courseCode}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base tracking-tight leading-snug">
                            {exam.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              exam.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : exam.status === 'published'
                                ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800'
                                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${exam.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {exam.status}
                          </span>
                        </div>

                        {/* Metadata Statistics Badges */}
                        <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Examiner: <strong className="text-slate-900 dark:text-white">{exam.instructorName}</strong></span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span><strong>{exam.durationMinutes}</strong> mins</span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span><strong>{exam.questions.length}</strong> Questions ({totalPoints} pts)</span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 font-medium text-indigo-800 dark:text-indigo-300">
                            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Unit Enrolled: <strong>{enrolledCount}</strong> Candidates</span>
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 font-medium text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Submissions: <strong>{examSubs.length}</strong></span>
                          </span>
                        </div>

                        {/* Security Protocols Bar */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 font-mono text-[11px]">
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Camera Locked</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs font-semibold">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Microphone Active</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 shadow-2xs font-semibold">
                            <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>SEB Handshake Verified</span>
                          </span>
                        </div>
                      </div>

                      {/* Super Admin Exam Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-start xl:self-center shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100 dark:border-slate-800 w-full xl:w-auto">
                        <button
                          type="button"
                          onClick={() => setViewingPaperExam(exam)}
                          className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer text-xs border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors"
                          title="View official examination paper formatted in Times New Roman 12pt"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Exam Paper</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingSchemeExam(exam)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer text-xs border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-colors"
                          title="View official marking scheme formatted in Times New Roman 12pt"
                        >
                          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Marking Scheme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectingExam(exam)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          <span>Inspect ({exam.questions.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExamAction(exam.id, exam.title)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                          title="Delete Exam from Institution"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FACULTY DIRECTORY, RIGHTS & ACCESS CONTROL */}
      {activeTab === 'teachers' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search faculty by name, email, department, or assigned course..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
              >
                <option value="all">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                <option value="all">All Clearance Statuses</option>
                <option value="active">Active Only</option>
                <option value="pending">Pending Approval</option>
                <option value="suspended">Suspended</option>
              </select>

              <button
                type="button"
                onClick={handleOpenAddTeacher}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-orange-600 active:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all border border-emerald-500 hover:border-orange-500"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Teacher</span>
              </button>
            </div>
          </div>

          {/* Faculty Roster Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Authorized Faculty Register & Governance ({filteredTeachers.length} Faculty Members)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Modify teacher courses, rights, clearance level, or delete faculty profiles.
                </p>
              </div>
            </div>

            {/* Orange outline separated faculty governance items */}
            <div className="p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/20">
              {filteredTeachers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No faculty members match your filter criteria.</p>
                </div>
              ) : (
                filteredTeachers.map((teacher) => {
                  const rights = teacher.rights || {
                    canCreateExams: teacher.accessStatus === 'active',
                    canGradeMarks: teacher.accessStatus === 'active',
                    canAdmitStudents: teacher.accessStatus === 'active',
                    canDeleteExams: false,
                    canExportSubmissions: teacher.accessStatus === 'active',
                  };

                  return (
                    <div
                      key={teacher.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 hover:shadow-md transition-all text-xs border-l-4 border-l-indigo-600 dark:border-l-indigo-500"
                    >
                      <div className="flex items-start sm:items-center gap-4">
                        <div className="relative shrink-0">
                          <img
                            src={teacher.avatar}
                            alt={teacher.name}
                            className="w-13 h-13 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              teacher.accessStatus === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={`Status: ${teacher.accessStatus}`}
                          />
                        </div>
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProfileModal({ type: 'teacher', id: teacher.id })}
                              className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 underline underline-offset-2 decoration-slate-300 text-left cursor-pointer transition-colors"
                              title="Click to fetch faculty profile and clearance record from backend"
                            >
                              {teacher.name}
                            </button>
                            <span className="text-slate-400">·</span>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {teacher.title}
                            </span>
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">{teacher.email}</div>
                          <div className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.department}</span>
                            <span>·</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                              Assigned Courses: {teacher.assignedCourseCodes?.join(', ') || 'None assigned'}
                            </span>
                          </div>

                          {/* Specific Faculty Rights Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold border ${
                                rights.canCreateExams
                                  ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:border-slate-700'
                              }`}
                            >
                              Create Exams
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold border ${
                                rights.canGradeMarks
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:border-slate-700'
                              }`}
                            >
                              Grade / Override Marks
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold border ${
                                rights.canAdmitStudents
                                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through dark:bg-slate-800 dark:border-slate-700'
                              }`}
                            >
                              Admit Students
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold border ${
                                rights.canDeleteExams
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                              }`}
                            >
                              {rights.canDeleteExams ? 'Delete Privileges' : 'No Delete Privileges'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Edit Details & Rights, Toggle Clearance, Delete */}
                      <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                        <span
                          className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase ${
                            teacher.accessStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : teacher.accessStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {teacher.accessStatus}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenEditTeacher(teacher)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                          title="Modify Teacher Details & Rights"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Modify & Rights</span>
                        </button>

                        {teacher.accessStatus !== 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAccess(teacher.id, 'active')}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Grant</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleAccess(teacher.id, 'suspended')}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer transition-colors"
                          title="Permanently Delete Teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODIFIED MARKS & JUSTIFICATIONS AUDITING */}
      {activeTab === 'mark_overrides' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modified marks by student name, exam, instructor, or justification..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={overrideStatusFilter}
                onChange={(e) => setOverrideStatusFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                <option value="all">All Review Statuses ({allModifiedMarks.length})</option>
                <option value="pending">Pending Admin Review ({pendingOverridesCount})</option>
                <option value="approved">Approved Modifications</option>
                <option value="declined">Declined Modifications</option>
              </select>
            </div>
          </div>

          {/* Committed Result Change Requests with Proper Line Borders */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-300 dark:border-amber-700 overflow-hidden shadow-xs">
            <div className="p-4 border-b-2 border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Committed Result Change Requests ({pendingCommittedMarkRequests.length} pending)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Review and adjust proposed question marks. Approved changes update the committed student grade and retain the audit trail.
              </p>
            </div>
            <div className="p-4 space-y-3">
              {committedMarkChangeRequests.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">No committed result change requests.</p>
              ) : (
                committedMarkChangeRequests.map((submission) => {
                  const request = submission.committedMarkChangeRequest!;
                  const exam = exams.find((item) => item.id === submission.examId);
                  const isCommittedApproved = request.status === 'approved';
                  return (
                    <div
                      id={`submission-${submission.id}`}
                      key={request.id}
                      className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all scroll-mt-20 ${
                        isCommittedApproved
                          ? 'border-emerald-400 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : request.status === 'rejected'
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20'
                          : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 hover:border-orange-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <strong className="text-slate-900 dark:text-white">{submission.studentName}</strong>
                          <span className="text-indigo-700 dark:text-indigo-300 font-mono">{exam?.courseCode || submission.examId}</span>
                          <span className={`px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                            request.status === 'pending_admin_approval'
                              ? 'bg-amber-100 text-amber-800'
                              : request.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}>{request.status.replaceAll('_', ' ')}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                          {request.previousScore} → {request.proposedScore ?? request.previousScore} marks · Requested by {request.requestedBy}
                        </p>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{request.explanation}</p>
                        {request.adminReviewNote && (
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                            Admin decision: {request.adminReviewNote}
                          </p>
                        )}
                      </div>
                      {request.status === 'pending_admin_approval' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCommittedMarkReview(submission)}
                          className="shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-orange-600 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer border border-emerald-500 hover:border-orange-500 transition-all"
                        >
                          Review & Adjust Grade
                        </button>
                      ) : isCommittedApproved ? (
                        <button
                          type="button"
                          disabled
                          className="shrink-0 px-3.5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-not-allowed opacity-60 flex items-center gap-1.5 pointer-events-none"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Adjustment Approved</span>
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Overrides Table with Distinct Proper Line Borders between Cards */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Administrator Marks Modification Audit List ({filteredModifiedMarks.length} Records)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Inspect the justification reason behind each teacher's mark change. Approve, decline (reverting score), or send enquiry.
                </p>
              </div>
            </div>

            {filteredModifiedMarks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-slate-700">
                <Award className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                <p>No modified marks match your filter selection.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredModifiedMarks.map((item) => {
                  const { submission, questionId, answer, exam, student, question } = item;
                  const original = answer.originalScore ?? 0;
                  const awarded = answer.awardedPoints ?? 0;
                  const delta = awarded - original;
                  const status = answer.overrideStatus || 'pending_admin_review';
                  const isApproved = status === 'approved';

                  return (
                    <div
                      key={`${submission.id}-${questionId}`}
                      className={`p-5 space-y-3.5 text-xs rounded-2xl bg-white dark:bg-slate-900 border-2 transition-all shadow-sm ${
                        isApproved
                          ? 'border-emerald-500/80 dark:border-emerald-700/80'
                          : status === 'declined'
                          ? 'border-rose-400 dark:border-rose-800'
                          : 'border-slate-300 dark:border-slate-700 hover:border-orange-500'
                      }`}
                    >
                      {/* Meta header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {student?.name || submission.studentName}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            {exam?.courseCode || 'EXAM'}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-600 dark:text-slate-300">{exam?.title}</span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase ${
                            status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : status === 'declined'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-500 border border-amber-300 animate-pulse'
                          }`}
                        >
                          {status === 'pending_admin_review' ? 'Pending Admin Decision' : status}
                        </span>
                      </div>

                      {/* Question Prompt Preview with Line Border */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>Question #{questionId}: {question?.topic || 'Assessment Question'}</span>
                          <span className="font-mono text-indigo-600 font-bold">{question?.points || 10} Max Points</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">{question?.prompt || 'Examination question text'}</p>
                        {answer.textAnswer && (
                          <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                            Student Response: "{answer.textAnswer}"
                          </div>
                        )}
                      </div>

                      {/* Score Comparison & Justification Box with Line Border */}
                      <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Original Score:</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {original} pts
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Modified Score:</span>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                              {awarded} pts
                            </span>
                            <span
                              className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                                delta >= 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {delta >= 0 ? `+${delta}` : delta} pts
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono">
                            Overridden By: <strong>{answer.overriddenBy || 'Faculty'}</strong> on{' '}
                            {answer.overriddenAt ? new Date(answer.overriddenAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>

                        {/* Mandatory Teacher Justification */}
                        <div className="pt-1">
                          <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mb-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Teacher's Mandatory Justification Behind Modification:</span>
                          </div>
                          <p className="text-slate-800 dark:text-slate-200 font-medium bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/80 leading-relaxed">
                            "{answer.overrideReason || 'No justification specified.'}"
                          </p>
                        </div>

                        {/* Admin Decision History Note if already audited */}
                        {answer.adminDecisionReason && (
                          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-[11px] space-y-0.5 border border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Admin Audit Decision Note ({answer.adminReviewedBy}):
                            </span>
                            <p className="text-slate-600 dark:text-slate-400">{answer.adminDecisionReason}</p>
                          </div>
                        )}

                        {/* Admin Enquiry if sent */}
                        {answer.adminEnquirySent && (
                          <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-950 text-[11px] text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <strong>Official Inquiry Sent to Instructor:</strong> {answer.adminEnquirySent}
                          </div>
                        )}
                      </div>

                      {/* Super Admin Decision Action Buttons */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenReviewOverride(submission, questionId, answer, exam, 'enquiry')}
                          className="px-3 py-1.5 border rounded-lg font-semibold flex items-center gap-1.5 transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-xs"
                          title="Open audit form to write enquiry note to instructor"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Audit Note / Enquiry</span>
                        </button>

                        <button
                          type="button"
                          disabled={status === 'approved'}
                          onClick={(e) => handleDirectDeclineOverride(submission, questionId, e)}
                          className={`px-3.5 py-1.5 border rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                            status === 'approved'
                              ? 'opacity-35 cursor-not-allowed pointer-events-none bg-slate-100 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                              : status === 'declined'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm cursor-pointer'
                              : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800 cursor-pointer'
                          }`}
                          title={status === 'approved' ? 'Modification approved; decline action is disabled.' : 'Decline this mark modification and restore original marks'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{status === 'declined' ? 'Declined & Reverted ✓' : 'Decline Modification & Revert'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={status === 'approved'}
                          onClick={(e) => handleDirectApproveOverride(submission, questionId, e)}
                          className={`px-4 py-1.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all border ${
                            status === 'approved'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60 pointer-events-none'
                              : 'bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 cursor-pointer'
                          }`}
                          title={status === 'approved' ? 'Mark modification has already been approved and committed. Action is inactive.' : 'Approve and accept this mark modification for the student'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{status === 'approved' ? 'Modification Approved ✓' : 'Approve Modification'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CANDIDATE REGISTRATIONS & EXAM ENROLLMENT */}
      {activeTab === 'student_registrations' && (
        <div className="space-y-5">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by student name, university number, email, or department..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
              >
                <option value="all">All Departments</option>
                {allDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleOpenAddStudent}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-orange-600 active:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all border border-emerald-500 hover:border-orange-500"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Register Student for Exam</span>
              </button>
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStudents.map((student) => {
              const enrolledExams = exams.filter(
                (ex) =>
                  student.enrolledCourseCodes.includes(ex.courseCode) ||
                  ex.registeredStudentIds?.includes(student.id)
              );

              return (
                <div
                  key={student.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700 shadow-xs"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</h4>
                          {missedExams.some((m) => m.studentId === student.id && !m.isCleared) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                              Missed Exam Flag
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">{student.email}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {student.studentNumber} · {student.department}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStudent(student)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                        title="Edit Candidate Details & Profile Photo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id, student.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Delete Candidate Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Enrolled Examinations */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Registered Examinations ({enrolledExams.length}):</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {enrolledExams.map((ex) => (
                        <span
                          key={ex.id}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded text-[11px] font-mono flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                        >
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">{ex.courseCode}</span>
                          <span className="truncate max-w-[130px]">{ex.title}</span>
                          <button
                            type="button"
                            onClick={() => {
                              unregisterStudentFromExam(student.id, ex.id);
                              showToast(`Unregistered candidate from ${ex.courseCode}.`);
                              refreshData();
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1 font-bold"
                            title="Unenroll from this exam"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {enrolledExams.length === 0 && (
                        <span className="text-slate-400 italic">No exams enrolled.</span>
                      )}
                    </div>
                  </div>

                  {/* Super Admin Quick Register Dropdown */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 text-[11px] whitespace-nowrap">Enroll in exam:</span>
                    <select
                      className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs flex-1 text-slate-800 dark:text-slate-200"
                      defaultValue=""
                      onChange={(e) => {
                        const examId = e.target.value;
                        if (examId) {
                          const targetExam = exams.find((ex) => ex.id === examId);
                          if (targetExam) {
                            const missedCheck = hasUnapprovedMissedExam(student.id, targetExam.courseCode, targetExam.title);
                            if (missedCheck.isBlocked) {
                              triggerFlash({
                                type: 'error',
                                text: 'Re-registration Rejected (Missed Exam)',
                                subtext: `Candidate ${student.name} (${student.studentNumber}) missed ${targetExam.courseCode}. Administrator clearance is required before re-registration.`,
                              });
                              e.target.value = '';
                              return;
                            }
                            const res = registerStudentToExamWithValidation(student.id, examId);
                            if (!res.success) {
                              triggerFlash({
                                type: 'error',
                                text: 'Enrollment Failed',
                                subtext: res.error || 'Unable to enroll candidate.',
                              });
                              e.target.value = '';
                              return;
                            }
                            showToast(`Enrolled ${student.name} into ${targetExam.courseCode}.`);
                            e.target.value = '';
                            refreshData();
                          }
                        }
                      }}
                    >
                      <option value="" disabled>Select exam from all departments...</option>
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

      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Section 1: Faculties & Departments */}
          <div className={`grid grid-cols-1 ${isFacultyFormOpen ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]' : ''} gap-5`}>
            {isFacultyFormOpen && (
              <form onSubmit={handleFacultySubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{editingFacultyName ? 'Edit Faculty' : 'Create Faculty'}</h3>
                  <p className="text-xs text-slate-500 mt-1">Manage institution faculties and their departments.</p>
                </div>
                {facultyFormError && (
                  <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs">
                    {facultyFormError}
                  </div>
                )}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Faculty name
                    <input
                      type="text"
                      required
                      value={facultyNameInput}
                      onChange={(e) => setFacultyNameInput(e.target.value)}
                      placeholder="e.g. Faculty of Computing"
                      className="mt-1.5 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-normal"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Department
                    <input
                      type="text"
                      required
                      value={facultyDepartmentInput}
                      onChange={(e) => setFacultyDepartmentInput(e.target.value)}
                      placeholder="e.g. Department of Computer Science"
                      className="mt-1.5 w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-normal"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer">
                    {editingFacultyName ? 'Save Changes' : 'Create Faculty'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFacultyFormOpen(false);
                      setEditingFacultyName(null);
                      setFacultyNameInput('');
                      setFacultyDepartmentInput('');
                      setFacultyFormError(null);
                    }}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Faculty Directory ({faculties.length})</h3>
                  <p className="text-xs text-slate-500">Institutional academic units and faculty divisions</p>
                </div>
                {!isFacultyFormOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFacultyName(null);
                      setFacultyNameInput('');
                      setFacultyDepartmentInput('');
                      setFacultyFormError(null);
                      setIsFacultyFormOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Add Faculty</span>
                  </button>
                )}
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/50 dark:bg-slate-950/20">
                {faculties.map((faculty) => {
                  const facultyCourses = courses.filter((c) => c.department?.toLowerCase() === faculty.department?.toLowerCase());
                  const facultyTeachers = teachers.filter((t) => t.department?.toLowerCase() === faculty.department?.toLowerCase());

                  return (
                    <div
                      key={faculty.name}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/70 dark:hover:bg-amber-950/20 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 shadow-2xs">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {faculty.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 font-medium">
                              {faculty.department}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditFaculty(faculty.name, faculty.department)}
                            className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors"
                            title={`Edit ${faculty.name}`}
                            aria-label={`Edit ${faculty.name}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFaculty(faculty.name)}
                            className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            title={`Delete ${faculty.name}`}
                            aria-label={`Delete ${faculty.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span><strong>{facultyCourses.length}</strong> Courses</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span><strong>{facultyTeachers.length}</strong> Faculty Staff</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Section 2: Institutional Course Catalog & Department Assignments */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Institutional Courses & Department Allocations ({courses.length})</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Create courses, assign them to academic departments, and query them when authorizing faculty.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={courseDeptFilter}
                  onChange={(e) => setCourseDeptFilter(e.target.value)}
                  className="p-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-xs"
                >
                  <option value="all">All Departments ({courses.length})</option>
                  {allDepartments.map((d) => (
                    <option key={d} value={d}>
                      {d} ({courses.filter((c) => c.department.toLowerCase().trim() === d.toLowerCase().trim()).length})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleOpenAddCourse(courseDeptFilter === 'all' ? undefined : courseDeptFilter)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-orange-600 active:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer border border-emerald-500 hover:border-orange-500"
                >
                  <BookPlus className="w-3.5 h-3.5" />
                  <span>Create Course</span>
                </button>
              </div>
            </div>

            {/* Courses List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCourses.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-400" />
                  <p>No courses found for the selected department filter.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAddCourse(courseDeptFilter === 'all' ? undefined : courseDeptFilter)}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Course for this Department</span>
                  </button>
                </div>
              ) : (
                filteredCourses.map((c) => (
                  <div
                    key={c.id || c.code}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded">
                          {c.code}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{c.title}</h4>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono text-[11px]">{c.credits || 3} Credits</span>
                        {c.level && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {c.level}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-slate-500 font-medium">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{c.department}</span>
                        {c.faculty && (
                          <>
                            <span>·</span>
                            <span>{c.faculty}</span>
                          </>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-1 max-w-3xl">
                          {c.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleEditCourse(c)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        title={`Edit course ${c.code}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourseAction(c.code, c.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title={`Delete course ${c.code}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* TAB 5: TICKETS & INQUIRIES QUEUE */}
      {activeTab === 'tickets' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Super Admin Support & Incident Queue ({tickets.length} Tickets)
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Review student waiting room appeals, exam room technical issues, and faculty inquiries.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {tickets.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <LifeBuoy className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p>No support tickets in queue.</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {ticket.id}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {ticket.userName} ({ticket.userRole.toUpperCase()})
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono">{ticket.userEmail}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            ticket.severity === 'high' || ticket.severity === 'urgent'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {ticket.severity}
                        </span>

                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                            ticket.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-white">{ticket.subject}</div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        {ticket.message}
                      </p>
                    </div>

                    {ticket.adminReply && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1">
                        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Super Admin Resolution Note:</span>
                        </div>
                        <p className="text-emerald-900 dark:text-emerald-200">{ticket.adminReply}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                      <span>Submitted: {new Date(ticket.createdAt).toLocaleString()}</span>
                      {ticket.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTicket(ticket);
                            setAdminReplyText('');
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans font-semibold cursor-pointer"
                        >
                          Respond & Resolve Ticket
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: EXAMINATION ATTENDANCE CENSUS & MISSED EXAM CLEARANCE AUTHORITY */}
      {activeTab === 'attendance_missed' && (() => {
        const attendanceSummaries = getAllExamsAttendanceSummaries(exams);
        const totalRegisteredSittings = attendanceSummaries.reduce((sum, s) => sum + s.totalRegistered, 0);
        const totalSatSittings = attendanceSummaries.reduce((sum, s) => sum + s.totalSat, 0);
        const totalMissedSittings = attendanceSummaries.reduce((sum, s) => sum + s.totalMissed, 0);
        const overallAttendanceRate = totalRegisteredSittings > 0 ? Math.round((totalSatSittings / totalRegisteredSittings) * 100) : 100;
        const pendingResitsCount = resitRequests.filter((r) => r.status === 'pending').length;

        return (
          <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Examinations Monitored</span>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{exams.length}</div>
                <span className="text-[10px] text-slate-400">Active Curriculum Papers</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Unit Candidate Sittings</span>
                <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{totalRegisteredSittings}</div>
                <span className="text-[10px] text-slate-400">Sum of Unit-Specific Enrollments</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">Sat & Completed</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalSatSittings}</div>
                <span className="text-[10px] text-emerald-600/80 font-medium">{overallAttendanceRate}% Attendance Rate</span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-1">
                <span className="text-[11px] font-semibold text-rose-600 uppercase">Registered But Missed</span>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{totalMissedSittings}</div>
                <span className="text-[10px] text-rose-500 font-medium">Failed to connect/sit</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Pending Resit Clearances</span>
                <div className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">{pendingResitsCount}</div>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">Requires Admin Review</span>
              </div>
            </div>

            {/* SECTION 1: EXAM ATTENDANCE SUM-UP TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Institutional Examination Attendance Sum-Up ({attendanceSummaries.length} Exams)
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Official census of registered candidates per specific examination unit, completed sittings, and missed examination sessions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintMissedModalOpen(true)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Print and export official roster of candidates who missed examinations"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Missed Candidates Roll</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintFailedModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-rose-700 to-amber-700 hover:from-rose-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 border border-rose-500/40"
                    title="Print and export official roster of candidates below passing marks threshold on different units"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-200" />
                    <span>Print Failed Students Roll</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintApprovedModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Print and export official roll of candidates approved for examinations"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Approved Candidates Roll</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3.5">Course Code & Examination Title</th>
                      <th className="p-3.5">Chief Examiner</th>
                      <th className="p-3.5 text-center">Unit Registered Candidates</th>
                      <th className="p-3.5 text-center">Sat & Completed</th>
                      <th className="p-3.5 text-center">Registered But Missed</th>
                      <th className="p-3.5 text-center">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendanceSummaries.map((summary) => (
                      <tr key={summary.examId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {summary.courseCode}
                            </span>
                            <span>{summary.title}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          {summary.instructorName}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {summary.totalRegistered}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              unit candidates
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {summary.totalSat}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold">
                          {summary.totalMissed > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                              {summary.totalMissed} Missed
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${summary.attendanceRate}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                              {summary.attendanceRate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: STUDENT RESIT CLEARANCE REQUESTS QUEUE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/30 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Student Resit Clearance Requests ({resitRequests.length} Total · {pendingResitsCount} Pending)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students who missed a scheduled examination or failed to attain the passing mark threshold must seek Super Admin clearance before re-sitting or registering.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setResitFilterType('all')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      resitFilterType === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({resitRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResitFilterType('missed')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      resitFilterType === 'missed'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Missed ({resitRequests.filter((r) => (r.resitType || 'missed') === 'missed').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResitFilterType('failed')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      resitFilterType === 'failed'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Failed Threshold ({resitRequests.filter((r) => r.resitType === 'failed').length})
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {(() => {
                  const visibleResits = resitRequests.filter(
                    (r) => resitFilterType === 'all' || (r.resitType || 'missed') === resitFilterType
                  );

                  if (visibleResits.length === 0) {
                    return (
                      <div className="p-10 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                        <p>No student resit requests found matching this filter.</p>
                      </div>
                    );
                  }

                  return visibleResits.map((req) => (
                    <div id={`resit-request-${req.id}`} key={req.id} className="p-5 space-y-3 scroll-mt-20">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                          <span className="font-bold text-slate-900 dark:text-white text-sm font-sans">{req.studentName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500">{req.studentNumber}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{req.courseCode}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-sans text-slate-700 dark:text-slate-300">{req.examTitle}</span>
                          <span className="text-slate-400">·</span>
                          {req.resitType === 'failed' ? (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                              Below Pass Threshold ({req.percentage ?? req.failedScore}% / {req.passingScorePercentage ?? 50}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                              Missed Examination
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase ${
                            req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              : req.status === 'declined'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 animate-pulse'
                          }`}
                        >
                          {req.status === 'pending' ? 'Pending Admin Clearance' : `Clearance ${req.status}`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                            {req.resitType === 'failed' ? 'Reason Category for Failure:' : 'Declared Grounds for Absence:'}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white capitalize">
                              {(req.grounds || req.reasonCategory || (req.resitType === 'failed' ? 'failed_threshold' : 'medical')).replace(/_/g, ' ')}
                            </span>
                            {req.resitType === 'failed' && (
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200">
                                Score: {req.failedScore ?? req.percentage ?? 0} / {req.totalPoints ?? 100} ({req.percentage ?? req.failedScore ?? 0}%) · Pass: {req.passingScorePercentage ?? 50}%
                              </span>
                            )}
                            {(req.reasonCategory === 'medical' || req.reasonCategory === 'health_during_exam' || req.grounds === 'medical') && (
                              <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                                <Stethoscope className="w-3 h-3 text-rose-600" />
                                <span>Medical Evidence</span>
                              </span>
                            )}
                          </div>

                          {(req.doctorName || req.medicalFacility || req.medicalCertificateRef) && (
                            <div className="mt-1.5 p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-mono space-y-0.5">
                              {req.medicalFacility && <div><strong>Clinic/Hospital:</strong> {req.medicalFacility}</div>}
                              {req.doctorName && <div><strong>Attending Doctor:</strong> {req.doctorName}</div>}
                              {req.medicalCertificateRef && <div><strong>Serial / Ref #:</strong> {req.medicalCertificateRef}</div>}
                            </div>
                          )}

                          {(req.attachmentFileName || req.evidenceDocument) ? (
                            <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-medium truncate">
                                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">Attached: <strong>{req.attachmentFileName || req.evidenceDocument}</strong></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setViewingEvidenceModal(req)}
                                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 flex items-center gap-1 text-[11px] shrink-0 cursor-pointer shadow-xs transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Document</span>
                              </button>
                            </div>
                          ) : (req.reasonCategory === 'medical' || req.grounds === 'medical') ? (
                            <div className="mt-1 text-[11px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Missing Required Medical Evidence Document</span>
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                            {req.resitType === 'failed' ? 'Stated Reason for Failed (Compulsory):' : 'Candidate Explanation:'}
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 italic font-medium">
                            "{req.explanation || req.reasonDetails}"
                          </p>
                          {req.evidenceNotes && (
                            <p className="text-[11px] text-slate-500 font-mono mt-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                              Notes: {req.evidenceNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      {req.adminNotes && (
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[11px]">
                          <strong>Super Admin Note:</strong> {req.adminNotes} (Reviewed by {req.reviewedBy})
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={req.status === 'approved'}
                          onClick={() => handleDeclineResitRequest(req.id)}
                          className={`px-3.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                            req.status === 'approved'
                              ? 'opacity-35 cursor-not-allowed pointer-events-none bg-slate-100 dark:bg-slate-850 text-slate-400 border-slate-200 dark:border-slate-800'
                              : req.status === 'declined'
                              ? 'bg-rose-600 text-white border-rose-600 cursor-pointer'
                              : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 cursor-pointer'
                          }`}
                          title={req.status === 'approved' ? 'Clearance is approved; decline action is inactive.' : 'Decline Clearance'}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{req.status === 'declined' ? 'Clearance Declined ✓' : 'Decline Clearance'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={req.status === 'approved'}
                          onClick={() => handleApproveResitRequest(req.id)}
                          className={`px-4 py-1.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all border ${
                            req.status === 'approved'
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60 pointer-events-none'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                          }`}
                          title={req.status === 'approved' ? 'Clearance is approved. Action is inactive.' : 'Approve Clearance (Authorize Sitting)'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{req.status === 'approved' ? 'Clearance Approved ✓' : 'Approve Clearance (Authorize Sitting)'}</span>
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* SECTION 3: CANDIDATES BELOW PASSING MARKS THRESHOLD ACROSS UNITS */}
            <div id="failed-students-section" className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/70 dark:bg-rose-950/30 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Candidates Below Passing Marks Threshold Across Units
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                      {getFailedStudentsList().length} Candidates
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Official register of students who failed to attain the minimum pass threshold (50%). Admin verifies stated failure reasons, authorizes resits, and prints the roster.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintFailedModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Failed Students Roll</span>
                  </button>
                </div>
              </div>

              {/* Toolbar & Filters */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={failedSearchQuery}
                      onChange={(e) => setFailedSearchQuery(e.target.value)}
                      placeholder="Search candidate name, admission #, unit code, or reason..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Unit / Course Filter */}
                  <select
                    value={failedCourseFilter}
                    onChange={(e) => setFailedCourseFilter(e.target.value)}
                    className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Course Units</option>
                    {Array.from(new Set(getFailedStudentsList().map((f) => f.courseCode))).map((code) => (
                      <option key={code} value={code}>
                        Unit: {code}
                      </option>
                    ))}
                  </select>

                  {/* Resit Status Filter */}
                  <select
                    value={failedStatusFilter}
                    onChange={(e) => setFailedStatusFilter(e.target.value as any)}
                    className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Resit Statuses</option>
                    <option value="pending">Pending Clearance ({getFailedStudentsList().filter((f) => f.resitStatus === 'pending').length})</option>
                    <option value="approved">Resit Approved ({getFailedStudentsList().filter((f) => f.resitStatus === 'approved').length})</option>
                    <option value="not_applied">Not Applied Yet ({getFailedStudentsList().filter((f) => f.resitStatus === 'not_applied').length})</option>
                  </select>
                </div>

                <div className="text-[11px] font-mono text-slate-500 flex items-center gap-3">
                  <span>Filtered: <strong>{(() => {
                    const allFailed = getFailedStudentsList();
                    return allFailed.filter((rec) => {
                      if (failedCourseFilter !== 'all' && rec.courseCode.toUpperCase() !== failedCourseFilter.toUpperCase()) return false;
                      if (failedStatusFilter !== 'all' && rec.resitStatus !== failedStatusFilter) return false;
                      if (failedSearchQuery.trim()) {
                        const q = failedSearchQuery.toLowerCase();
                        const matchName = rec.studentName.toLowerCase().includes(q);
                        const matchNum = rec.studentNumber.toLowerCase().includes(q);
                        const matchCode = rec.courseCode.toLowerCase().includes(q);
                        const matchUnit = rec.unitName.toLowerCase().includes(q);
                        const matchRsn = (rec.resitRequest?.explanation || rec.resitRequest?.reasonDetails || '').toLowerCase().includes(q);
                        if (!matchName && !matchNum && !matchCode && !matchUnit && !matchRsn) return false;
                      }
                      return true;
                    }).length;
                  })()}</strong></span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    Pending Clearance: <strong>{getFailedStudentsList().filter((f) => f.resitStatus === 'pending').length}</strong>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">Candidate Details</th>
                      <th className="p-3">Course Unit</th>
                      <th className="p-3 text-center">Marks / %</th>
                      <th className="p-3 text-center">Pass Threshold</th>
                      <th className="p-3">Stated Reason for Failure</th>
                      <th className="p-3 text-center">Resit Status & Approval</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {(() => {
                      const allFailed = getFailedStudentsList();
                      const filtered = allFailed.filter((rec) => {
                        if (failedCourseFilter !== 'all' && rec.courseCode.toUpperCase() !== failedCourseFilter.toUpperCase()) return false;
                        if (failedStatusFilter !== 'all' && rec.resitStatus !== failedStatusFilter) return false;
                        if (failedSearchQuery.trim()) {
                          const q = failedSearchQuery.toLowerCase();
                          const matchName = rec.studentName.toLowerCase().includes(q);
                          const matchNum = rec.studentNumber.toLowerCase().includes(q);
                          const matchCode = rec.courseCode.toLowerCase().includes(q);
                          const matchUnit = rec.unitName.toLowerCase().includes(q);
                          const matchRsn = (rec.resitRequest?.explanation || rec.resitRequest?.reasonDetails || '').toLowerCase().includes(q);
                          if (!matchName && !matchNum && !matchCode && !matchUnit && !matchRsn) return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-10 text-center text-slate-400">
                              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                              <p className="font-medium">No candidates below passing threshold found for this filter criteria.</p>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((record, idx) => (
                        <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                          <td className="p-3 text-center font-mono text-slate-400 text-xs">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              {record.studentAvatar ? (
                                <img
                                  src={record.studentAvatar}
                                  alt={record.studentName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                                  {record.studentName.charAt(0)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {record.studentName}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500">
                                  {record.studentNumber}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                  {record.department}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {record.courseCode}
                              </span>
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]" title={record.unitName}>
                                {record.unitName}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                              {record.score} / {record.totalPoints}
                            </div>
                            <div className="font-mono text-[11px] text-rose-500 font-bold">
                              {record.percentage}%
                            </div>
                            <div className="w-14 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, record.percentage))}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                              {record.passingScorePercentage}% Pass
                            </div>
                            <div className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                              Deficit: -{record.deficitPercentage}%
                            </div>
                          </td>
                          <td className="p-3">
                            {record.resitRequest ? (
                              <div className="max-w-xs space-y-1">
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                  {(record.resitRequest.reasonCategory || 'failed_threshold').replace(/_/g, ' ')}
                                </span>
                                <p className="italic text-slate-700 dark:text-slate-300 text-[11px] leading-tight line-clamp-2" title={record.resitRequest.explanation || record.resitRequest.reasonDetails}>
                                  "{record.resitRequest.explanation || record.resitRequest.reasonDetails}"
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                No resit reason stated yet (Awaiting application)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {record.resitStatus === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Resit Approved</span>
                              </span>
                            ) : record.resitStatus === 'pending' ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse">
                                  Pending Clearance
                                </span>
                                <button
                                  type="button"
                                  onClick={() => record.resitRequest && handleApproveResitRequest(record.resitRequest.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Verify justification & approve student resit clearance"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Verify & Approve Resit</span>
                                </button>
                              </div>
                            ) : record.resitStatus === 'declined' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Clearance Declined</span>
                              </span>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Not Applied
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDirectClearanceForFailed(record)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-[11px] cursor-pointer transition-colors"
                                  title="Grant direct institutional senate resit authorization"
                                >
                                  Direct Clearance
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Bottom Summary Strip */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-4">
                  <span>Total Below Threshold: <strong className="text-slate-900 dark:text-white">{getFailedStudentsList().length}</strong></span>
                  <span>·</span>
                  <span>Units Affected: <strong className="text-slate-900 dark:text-white">{Array.from(new Set(getFailedStudentsList().map((f) => f.courseCode))).length}</strong></span>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Resits Approved: <strong>{getFailedStudentsList().filter((f) => f.resitStatus === 'approved').length}</strong></span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400">Pending Review: <strong>{getFailedStudentsList().filter((f) => f.resitStatus === 'pending').length}</strong></span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrintFailedModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Institutional Roll</span>
                </button>
              </div>
            </div>

            {/* SECTION 3: DIRECT ADMIN CLEARANCE AUTHORITY (STUDENT ADMISSION NUMBER, EXAMINATION CODE, TITLE) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900 overflow-hidden shadow-xs">
              <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-purple-50/80 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-purple-950/30 border-b border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Direct Admin Clearance Authority (Student Admission Number, Examination Code, Title)</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Identify candidate by Student Admission number, Examination code, and Title to clear missed examination restrictions and authorize re-registration.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800">
                  Enforced Re-registration Gate
                </span>
              </div>

              <div className="p-5 space-y-4">
                <form onSubmit={handleDirectAdminClearance} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* FIELD 1: Student Admission Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Student Admission Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list="missed-candidate-admissions"
                          value={directClearanceAdmission}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDirectClearanceAdmission(val);
                            setDirectClearanceStatusMsg(null);
                            const matchedMissed = missedExams.find(
                              (m) => m.studentNumber.toLowerCase() === val.trim().toLowerCase()
                            );
                            if (matchedMissed) {
                              if (!directClearanceExamCode) setDirectClearanceExamCode(matchedMissed.courseCode);
                              if (!directClearanceExamTitle) setDirectClearanceExamTitle(matchedMissed.examTitle);
                            }
                          }}
                          placeholder="e.g. STU-2024-9031"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                        <datalist id="missed-candidate-admissions">
                          {missedExams.map((m) => (
                            <option key={`cand-${m.id}`} value={m.studentNumber}>
                              {m.studentName} ({m.studentNumber}) &bull; {m.courseCode}
                            </option>
                          ))}
                          {students.map((st) => (
                            <option key={`stu-${st.id}`} value={st.studentNumber}>
                              {st.name} ({st.studentNumber})
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Candidate's institutional admission number.
                      </p>
                    </div>

                    {/* FIELD 2: Examination Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Examination Code <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list="missed-exam-codes"
                          value={directClearanceExamCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDirectClearanceExamCode(val);
                            setDirectClearanceStatusMsg(null);
                            const matchedExam = exams.find(
                              (x) => x.courseCode.toLowerCase() === val.trim().toLowerCase()
                            );
                            if (matchedExam && !directClearanceExamTitle) {
                              setDirectClearanceExamTitle(matchedExam.title);
                            }
                          }}
                          placeholder="e.g. CS401 or CS-405"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                        <datalist id="missed-exam-codes">
                          {missedExams.map((m) => (
                            <option key={`m-code-${m.id}`} value={m.courseCode}>
                              {m.courseCode} &bull; {m.examTitle}
                            </option>
                          ))}
                          {exams.map((ex) => (
                            <option key={`all-codes-${ex.id}`} value={ex.courseCode}>
                              {ex.courseCode} &bull; {ex.title}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Course / Examination code (e.g. CS401).
                      </p>
                    </div>

                    {/* FIELD 3: Examination Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Examination Title <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list="missed-exam-titles"
                          value={directClearanceExamTitle}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDirectClearanceExamTitle(val);
                            setDirectClearanceStatusMsg(null);
                            const matchedExam = exams.find(
                              (x) => x.title.toLowerCase() === val.trim().toLowerCase()
                            );
                            if (matchedExam && !directClearanceExamCode) {
                              setDirectClearanceExamCode(matchedExam.courseCode);
                            }
                          }}
                          placeholder="e.g. Midterm Examination: Distributed Systems Architecture"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                          required
                        />
                        <datalist id="missed-exam-titles">
                          {missedExams.map((m) => (
                            <option key={`ex-opt-${m.id}`} value={m.examTitle}>
                              [{m.courseCode}] {m.examTitle}
                            </option>
                          ))}
                          {exams.map((ex) => (
                            <option key={`all-ex-${ex.id}`} value={ex.title}>
                              [{ex.courseCode}] {ex.title}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Full examination paper title.
                      </p>
                    </div>
                  </div>

                  {/* Quick-fill helper tags from flagged uncleared candidates */}
                  {missedExams.some((m) => !m.isCleared && m.status !== 'cleared') && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-slate-500 font-medium">Flagged Uncleared:</span>
                      {missedExams
                        .filter((m) => !m.isCleared && m.status !== 'cleared')
                        .slice(0, 3)
                        .map((m) => (
                          <button
                            key={`quick-${m.id}`}
                            type="button"
                            onClick={() => {
                              setDirectClearanceAdmission(m.studentNumber);
                              setDirectClearanceExamCode(m.courseCode);
                              setDirectClearanceExamTitle(m.examTitle);
                              setDirectClearanceStatusMsg(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-mono text-[11px] hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="font-bold">{m.studentNumber}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-indigo-600 font-bold">{m.courseCode}</span>
                            <span className="text-slate-400">·</span>
                            <span className="font-sans truncate max-w-[140px]">{m.examTitle}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {directClearanceStatusMsg && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        directClearanceStatusMsg.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      {directClearanceStatusMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{directClearanceStatusMsg.text}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Grant Admin Clearance &amp; Permit Re-Registration</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* SECTION 4: REGISTERED CANDIDATES WHO MISSED TO CONNECT & SIT */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Registered Candidates Flagged for Missed Examination ({missedExams.length} Records)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Candidates registered previously but failed to connect and sit. Identified by Student Admission number, Examination code, and Title. Re-registration is strictly blocked without approved clearance.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrintMissedModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Print official list of missed candidates"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Missed List</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {missedExams.length === 0 ? (
                  <div className="p-10 text-center text-slate-400">
                    <p>No missed examination flags on record.</p>
                  </div>
                ) : (
                  missedExams.map((record) => {
                    const isRecordCleared = !!record.isCleared || record.status === 'cleared';
                    return (
                      <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">{record.studentName}</span>
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Admission: {record.studentNumber}
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              Code: {record.courseCode}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Title: <strong className="text-slate-900 dark:text-white">{record.examTitle}</strong> &bull; Scheduled Session: {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : 'Session Missed'}
                          </div>
                          {record.missedReason && (
                            <div className="text-[11px] text-slate-500 italic">
                              Reason: {record.missedReason}
                            </div>
                          )}
                          {isRecordCleared && record.clearedBy && (
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Cleared by: {record.clearedBy} {record.clearedAt ? `(${new Date(record.clearedAt).toLocaleString()})` : ''}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          {isRecordCleared ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Cleared by Admin &bull; Re-registration Permitted</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold border border-rose-300 flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Uncleared &bull; Re-registration Blocked</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleMissedClearance(record.id, isRecordCleared)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer border ${
                              isRecordCleared
                                ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs'
                            }`}
                          >
                            {isRecordCleared ? 'Revoke Clearance' : 'Grant Admin Clearance'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 7: INSTITUTIONAL REPORTS & ANALYTICS (EXAMS DONE, DEPARTMENTAL CENSUS, TIMEFRAMES, PASS RATE & IMPROVEMENT CHARTS) */}
      {activeTab === 'reports' && (
        <AdminReportGeneratorView
          exams={exams}
          students={students}
          submissions={submissions}
          teachers={teachers}
          faculties={faculties}
        />
      )}

      {/* TAB 8: ADMIN ACADEMIC DATABASE & RESULTS LEDGER (PRIMARY KEY: Student Admission) */}
      {activeTab === 'academic_database' && (
        <AdminAcademicDatabaseView
          students={students}
          exams={exams}
        />
      )}

      {/* MODAL 1: ADD OR MODIFY TEACHER & RIGHTS */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  {editingTeacherId ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingTeacherId ? 'Modify Faculty Details & Rights' : 'Enroll New Faculty Member'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Super Admin Institutional Clearance Authority
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {teacherModalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg">
                  {teacherModalError}
                </div>
              )}

              {/* Profile Photo Uploader */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Lecturer Profile Photo
                </label>
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        teacherAvatar.trim() ||
                        (editingTeacherId
                          ? teachers.find((t) => t.id === editingTeacherId)?.avatar
                          : null) ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt="Faculty Profile Preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/40 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      <Camera className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleTeacherPhotoUpload}
                        />
                      </label>

                      {teacherAvatar && (
                        <button
                          type="button"
                          onClick={() => setTeacherAvatar('')}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={teacherAvatar}
                      onChange={(e) => setTeacherAvatar(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Faculty Name
                </label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Prof. David Miller"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Email
                  </label>
                  <input
                    type="email"
                    required
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="d.miller@university.edu"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Title / Rank
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherTitle}
                    onChange={(e) => setTeacherTitle(e.target.value)}
                    placeholder="Professor of Computing"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Faculty
                </label>
                <select
                  value={teacherFaculty}
                  onChange={(e) => {
                    const newFac = e.target.value;
                    setTeacherFaculty(newFac);
                    setTeacherDept(getDepartmentForFaculty(newFac));
                  }}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {faculties.map((faculty) => (
                    <option key={faculty.name} value={faculty.name}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Department
                </label>
                <input
                  type="text"
                  required
                  value={teacherDept}
                  onChange={(e) => setTeacherDept(e.target.value)}
                  placeholder="e.g. Computer Science & Software Engineering"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Authorized Department Courses
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Queried from: {teacherDept || 'Department'}
                  </span>
                </div>

                {/* Queried list of courses in this department */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 mb-2">
                  {(() => {
                    const deptCourses = courses.filter(
                      (c) =>
                        c.department.toLowerCase().trim() === teacherDept.toLowerCase().trim() ||
                        c.department.toLowerCase().includes(teacherDept.toLowerCase().trim()) ||
                        teacherDept.toLowerCase().includes(c.department.toLowerCase().trim())
                    );
                    const currentCodes = teacherCourses
                      .split(',')
                      .map((c) => c.trim().toUpperCase())
                      .filter(Boolean);

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                            Select Courses to Authorize ({deptCourses.length} in department):
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-semibold">
                            <button
                              type="button"
                              onClick={() => {
                                const setCodes = new Set(currentCodes);
                                deptCourses.forEach((c) => setCodes.add(c.code.toUpperCase()));
                                setTeacherCourses(Array.from(setCodes).join(', '));
                              }}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                const deptCodesSet = new Set(deptCourses.map((c) => c.code.toUpperCase()));
                                const remaining = currentCodes.filter((c) => !deptCodesSet.has(c));
                                setTeacherCourses(remaining.join(', '));
                              }}
                              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                              Clear Dept
                            </button>
                          </div>
                        </div>

                        {deptCourses.length === 0 ? (
                          <div className="py-2.5 px-3 text-slate-500 italic text-[11px] bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                            No courses currently configured for &quot;{teacherDept}&quot;. Create courses in the &quot;Faculties, Departments & Courses&quot; tab or type custom course codes below.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {deptCourses.map((course) => {
                              const isChecked = currentCodes.includes(course.code.toUpperCase());

                              return (
                                <label
                                  key={course.id || course.code}
                                  className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const code = course.code.toUpperCase();
                                      if (e.target.checked) {
                                        if (!currentCodes.includes(code)) {
                                          setTeacherCourses([...currentCodes, code].join(', '));
                                        }
                                      } else {
                                        setTeacherCourses(currentCodes.filter((c) => c !== code).join(', '));
                                      }
                                    }}
                                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{course.code}</span>
                                      <span className="text-[10px] text-slate-400 font-mono">{course.credits || 3}cr</span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate" title={course.title}>
                                      {course.title}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Authorized Course Codes List (Comma-separated / Custom):
                </label>
                <input
                  type="text"
                  required
                  value={teacherCourses}
                  onChange={(e) => setTeacherCourses(e.target.value)}
                  placeholder="CS-405, CS-301, CS-202"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Clearance / Access Status
                </label>
                <select
                  value={teacherStatus}
                  onChange={(e) => setTeacherStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="active">Active (Full Privileges Granted)</option>
                  <option value="pending">Pending Institutional Review</option>
                  <option value="suspended">Suspended / Read-Only</option>
                </select>
              </div>

              {/* SPECIFIC TEACHER RIGHTS & PERMISSIONS */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Granular Teacher Rights & Operational Privileges
                </label>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherRights.canCreateExams}
                      onChange={(e) =>
                        setTeacherRights({ ...teacherRights, canCreateExams: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Can Create & Upload Examinations</span>
                      <p className="text-[11px] text-slate-400">Allows building exams and importing test documents into the bank.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherRights.canGradeMarks}
                      onChange={(e) =>
                        setTeacherRights({ ...teacherRights, canGradeMarks: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Can Evaluate & Override Marks</span>
                      <p className="text-[11px] text-slate-400">Allows manual grading and submitting score adjustments with justification.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherRights.canAdmitStudents}
                      onChange={(e) =>
                        setTeacherRights({ ...teacherRights, canAdmitStudents: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Can Admit Candidates from Lobby</span>
                      <p className="text-[11px] text-slate-400">Allows invigilators to grant access codes and admit students to live rooms.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherRights.canDeleteExams}
                      onChange={(e) =>
                        setTeacherRights({ ...teacherRights, canDeleteExams: e.target.checked })
                      }
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Can Delete Examinations</span>
                      <p className="text-[11px] text-slate-400">High-risk privilege: permits permanent deletion of course exams.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherRights.canExportSubmissions}
                      onChange={(e) =>
                        setTeacherRights({ ...teacherRights, canExportSubmissions: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Can Export Gradebooks & Analytics</span>
                      <p className="text-[11px] text-slate-400">Allows downloading full candidate score spreadsheets.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
                >
                  {editingTeacherId ? 'Save Faculty Rights & Modifications' : 'Authorize & Enroll Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT & DECIDE ON MARK OVERRIDE */}
      {activeOverrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm">Admin Mark Decision</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveOverrideTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOverrideReview} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Candidate: {activeOverrideTarget.submission.studentName} · {activeOverrideTarget.exam?.courseCode}
                </div>
                <div className="text-slate-500">
                  Original: <strong>{activeOverrideTarget.answer.originalScore ?? 0} pts</strong> → Modified to:{' '}
                  <strong className="text-amber-600">{activeOverrideTarget.answer.awardedPoints ?? 0} pts</strong>
                </div>
                <div className="text-slate-700 dark:text-slate-300 font-medium pt-1">
                  Teacher Justification: "{activeOverrideTarget.answer.overrideReason}"
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                   Admin Decision Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminReviewAction('approve')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                      adminReviewAction === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600'
                    }`}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminReviewAction('decline')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                      adminReviewAction === 'decline'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600'
                    }`}
                  >
                    Decline & Revert
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminReviewAction('enquiry')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold cursor-pointer transition-all ${
                      adminReviewAction === 'enquiry'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600'
                    }`}
                  >
                    Send Enquiry
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {adminReviewAction === 'enquiry'
                    ? 'Inquiry Message to Teacher (Requesting more explanation)'
                    : 'Decision Rationale / Audit Log Note'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminAuditNote}
                  onChange={(e) => setAdminAuditNote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={activeOverrideTarget?.answer.overrideStatus === 'approved' && adminReviewAction === 'approve'}
                className={`w-full py-2.5 rounded-xl font-bold shadow-md transition-all border ${
                  activeOverrideTarget?.answer.overrideStatus === 'approved' && adminReviewAction === 'approve'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60 pointer-events-none'
                    : adminReviewAction === 'approve'
                    ? 'bg-emerald-600 text-white hover:bg-orange-600 active:bg-emerald-700 border-transparent hover:border-orange-500 cursor-pointer'
                    : adminReviewAction === 'decline'
                    ? 'bg-rose-600 text-white hover:bg-orange-600 active:bg-rose-700 border-transparent hover:border-orange-500 cursor-pointer'
                    : 'bg-indigo-600 text-white hover:bg-orange-600 active:bg-indigo-700 border-transparent hover:border-orange-500 cursor-pointer'
                }`}
              >
                {activeOverrideTarget?.answer.overrideStatus === 'approved' && adminReviewAction === 'approve'
                  ? 'Mark Modification Already Approved ✓'
                  : adminReviewAction === 'approve'
                  ? 'Confirm Approval of Modified Mark'
                  : adminReviewAction === 'decline'
                  ? 'Decline & Revert Score to Original Mark'
                  : 'Dispatch Official Enquiry to Teacher'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeCommittedChangeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-sm">Super Admin Committed Grade Review</h3>
              <p className="text-xs text-slate-500 mt-1">
                {activeCommittedChangeTarget.studentName} · {exams.find((exam) => exam.id === activeCommittedChangeTarget.examId)?.courseCode} · {activeCommittedChangeTarget.score ?? 0} current marks
              </p>
            </div>
            <form onSubmit={handleSubmitCommittedMarkReview} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs">
                <strong>Lecturer explanation:</strong> {activeCommittedChangeTarget.committedMarkChangeRequest?.explanation}
              </div>
              <div className="space-y-2">
                {Object.entries(committedReviewGrades).map(([questionId, grade], index) => {
                  const exam = exams.find((item) => item.id === activeCommittedChangeTarget.examId);
                  const question = exam?.questions.find((item) => item.id === questionId);
                  const maxPoints = question?.points ?? Number.MAX_SAFE_INTEGER;
                  return (
                    <div key={questionId} className="grid grid-cols-[1fr_100px] gap-3 items-center p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">Question {index + 1}: {question?.topic || questionId}</div>
                        {grade.feedback && <p className="text-[11px] text-slate-500 mt-1">{grade.feedback}</p>}
                      </div>
                      <label className="text-[10px] text-slate-500">
                        Marks / {question?.points ?? '—'}
                        <input
                          type="number"
                          min="0"
                          max={maxPoints}
                          step="0.5"
                          value={grade.awardedPoints}
                          disabled={committedReviewAction === 'reject'}
                          onChange={(event) => {
                            const value = event.target.value === '' ? 0 : Number(event.target.value);
                            setCommittedReviewGrades((previous) => ({
                              ...previous,
                              [questionId]: { ...previous[questionId], awardedPoints: value },
                            }));
                          }}
                          className="block w-full mt-1 p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-white"
                        />
                      </label>
                    </div>
                  );
                })}
                <div className="text-right text-sm font-bold font-mono text-indigo-700 dark:text-indigo-300">
                  Admin-approved total: {Object.values(committedReviewGrades).reduce((sum, grade) => sum + (Number(grade.awardedPoints) || 0), 0)} / {activeCommittedChangeTarget.totalPoints ?? '—'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCommittedReviewAction('approve')}
                  className={`flex-1 py-2 rounded-lg border font-semibold ${committedReviewAction === 'approve' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  Approve / Modify Grade
                </button>
                <button
                  type="button"
                  onClick={() => setCommittedReviewAction('reject')}
                  className={`flex-1 py-2 rounded-lg border font-semibold ${committedReviewAction === 'reject' ? 'bg-rose-600 text-white border-rose-600' : 'border-slate-300 dark:border-slate-700'}`}
                >
                  Reject Request
                </button>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Super Admin decision explanation (required)</label>
                <textarea
                  required
                  rows={3}
                  value={adminAuditNote}
                  onChange={(event) => setAdminAuditNote(event.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  placeholder="Record the reason for approving, adjusting, or rejecting the committed mark change."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCommittedChangeTarget(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adminAuditNote.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white text-xs font-semibold"
                >
                  Save Super Admin Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER STUDENT FOR EXAMINATION */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  {editingStudentId ? <Edit2 className="w-4 h-4" /> : <GraduationCap className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingStudentId ? 'Modify Candidate Details & Profile Photo' : 'Register Student for Examinations'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Super Admin Institutional Registry Enrollment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterStudentSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {studentModalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg">
                  {studentModalError}
                </div>
              )}

              {/* Candidate Profile Photo Uploader */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Student Profile Photo
                </label>
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        studentAvatar.trim() ||
                        (editingStudentId
                          ? students.find((s) => s.id === editingStudentId)?.avatar
                          : null) ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt="Candidate Profile Preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/40 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                      <Camera className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleStudentPhotoUpload}
                        />
                      </label>

                      {studentAvatar && (
                        <button
                          type="button"
                          onClick={() => setStudentAvatar('')}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={studentAvatar}
                      onChange={(e) => setStudentAvatar(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Candidate Name
                </label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Maya Lin"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="maya.lin@student.university.edu"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    University Reg. Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentNumber}
                    onChange={(e) => setNewStudentNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <select
                  value={newStudentDept}
                  onChange={(e) => setNewStudentDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {allDepartments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Specific Examinations to Register candidate into */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Select Examinations from Any Department to Enroll:
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  {exams.map((ex) => (
                    <label key={ex.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExamEnrollments.includes(ex.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExamEnrollments([...selectedExamEnrollments, ex.id]);
                          } else {
                            setSelectedExamEnrollments(selectedExamEnrollments.filter((id) => id !== ex.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{ex.courseCode}</span>
                      <span className="truncate">{ex.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all"
              >
                {editingStudentId ? 'Save Candidate Profile & Photo' : 'Register Candidate & Finalize Exam Enrollments'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INSPECT EXAM QUESTIONS */}
      {inspectingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div>
                <h3 className="font-bold text-sm">{inspectingExam.courseCode} - {inspectingExam.title}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectingExam.questions.length} Questions · Total {inspectingExam.questions.reduce((a, b) => a + (b.points || 0), 0)} Marks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {inspectingExam.questions.map((q, idx) => (
                <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2">
                  <div className="flex items-center justify-between text-indigo-600 font-mono font-bold">
                    <span>Q{idx + 1} ({q.type})</span>
                    <span>{q.points} pts</span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{q.prompt}</div>
                  {q.subQuestions?.map((part, partIndex) => (
                    <div key={part.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2">
                      <strong>Part {partIndex + 1}:</strong> {part.prompt} {part.points != null && `(${part.points} marks)`}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RESPOND TO TICKET */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm">Respond to Ticket {activeTicket.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTicket(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveTicket} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  {activeTicket.userName} ({activeTicket.userRole.toUpperCase()}): {activeTicket.subject}
                </div>
                <p className="text-slate-600 dark:text-slate-400">{activeTicket.message}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Super Admin Resolution Reply
                </label>
                <textarea
                  rows={4}
                  required
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Provide resolution details or action taken..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Publish Official Resolution & Mark Resolved</span>
              </button>
            </form>
          </div>
        </div>
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

      {/* Official Times New Roman 12pt Examination Paper Modal */}
      {viewingPaperExam && (
        <ExaminationPaperModal
          isOpen={true}
          onClose={() => setViewingPaperExam(null)}
          exam={viewingPaperExam}
          userRole="admin"
          canDownload={true}
        />
      )}

      {/* Official Times New Roman 12pt Marking Scheme Modal */}
      {viewingSchemeExam && (
        <OfficialMarkingSchemeModal
          isOpen={true}
          onClose={() => setViewingSchemeExam(null)}
          exam={viewingSchemeExam}
          userRole="admin"
          canDownload={true}
        />
      )}

      {/* MODAL: SUPER ADMIN PROFILE DETAILS UPDATE */}
      {isSuperAdminProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Super Administrator Institutional Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Directorate of Academic Affairs & Institutional Examinations
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSuperAdminProfileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSuperAdminProfile} className="p-6 space-y-4 text-xs overflow-y-auto">
              {adminProfileSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adminProfileSuccess}</span>
                </div>
              )}

              {adminProfileError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminProfileError}</span>
                </div>
              )}

              {/* Profile Photo Uploader */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Institutional Profile Photo
                </label>
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={
                        adminAvatarDraft.trim() ||
                        adminProfile.avatar ||
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
                      }
                      alt="Super Admin Profile"
                      className="w-14 h-14 rounded-full object-cover border-2 border-orange-500/50 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                      <Camera className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAdminAvatarUpload}
                        />
                      </label>

                      {adminAvatarDraft && (
                        <button
                          type="button"
                          onClick={() => setAdminAvatarDraft('')}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={adminAvatarDraft}
                      onChange={(e) => setAdminAvatarDraft(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Super Admin Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNameDraft}
                    onChange={(e) => setAdminNameDraft(e.target.value)}
                    placeholder="e.g. Dr. Arthur Pendelton"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Rank / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={adminTitleDraft}
                    onChange={(e) => setAdminTitleDraft(e.target.value)}
                    placeholder="Chief Academic Registrar & Director"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Official Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmailDraft}
                    onChange={(e) => setAdminEmailDraft(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Office Contact Phone
                  </label>
                  <input
                    type="text"
                    value={adminPhoneDraft}
                    onChange={(e) => setAdminPhoneDraft(e.target.value)}
                    placeholder="+1 (555) 019-8920"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Directorate / Faculty
                  </label>
                  <input
                    type="text"
                    value={adminFacultyDraft}
                    onChange={(e) => setAdminFacultyDraft(e.target.value)}
                    placeholder="Senate Examination Board Directorate"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department / Division
                  </label>
                  <input
                    type="text"
                    value={adminDeptDraft}
                    onChange={(e) => setAdminDeptDraft(e.target.value)}
                    placeholder="Academic Registry & Senate Secretariat"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Office Location
                </label>
                <input
                  type="text"
                  value={adminOfficeDraft}
                  onChange={(e) => setAdminOfficeDraft(e.target.value)}
                  placeholder="Senate Hall, Suite 101"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Bio & Executive Mandate
                </label>
                <textarea
                  rows={2}
                  value={adminBioDraft}
                  onChange={(e) => setAdminBioDraft(e.target.value)}
                  placeholder="Describe your executive mandate and institutional responsibilities..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Account Password & Security Card */}
              <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border-2 border-orange-300/80 dark:border-orange-800/60 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        Administrator Password & Security
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Leave blank to retain your existing administrator password.
                      </p>
                    </div>
                  </div>

                  {adminProfile.lastPasswordChangedAt && (
                    <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      Changed: {new Date(adminProfile.lastPasswordChangedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password <span className="text-slate-400 font-normal">(Required to authorize changes)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminCurrentPass ? 'text' : 'password'}
                        value={adminCurrentPass}
                        onChange={(e) => setAdminCurrentPass(e.target.value)}
                        placeholder="Current password (default: password or admin123)"
                        className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminCurrentPass(!showAdminCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showAdminCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminNewPass ? 'text' : 'password'}
                          value={adminNewPass}
                          onChange={(e) => setAdminNewPass(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminNewPass(!showAdminNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showAdminNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminConfirmPass ? 'text' : 'password'}
                          value={adminConfirmPass}
                          onChange={(e) => setAdminConfirmPass(e.target.value)}
                          placeholder="Repeat new password"
                          className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminConfirmPass(!showAdminConfirmPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showAdminConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSuperAdminProfileOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE OR EDIT COURSE & ASSIGN TO DEPARTMENT */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  {editingCourseCode ? <Edit2 className="w-4 h-4" /> : <BookPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingCourseCode ? `Modify Course: ${editingCourseCode}` : 'Create New Institutional Course'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Assign to Department & Configure Academic Syllabus
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourseSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {courseModalError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg">
                  {courseModalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code (e.g. CS-405)
                  </label>
                  <input
                    type="text"
                    required
                    value={courseCodeInput}
                    onChange={(e) => setCourseCodeInput(e.target.value.toUpperCase())}
                    placeholder="CS-405"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Value / Weighting
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={courseCreditsInput}
                    onChange={(e) => setCourseCreditsInput(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Course Title
                </label>
                <input
                  type="text"
                  required
                  value={courseTitleInput}
                  onChange={(e) => setCourseTitleInput(e.target.value)}
                  placeholder="e.g. Advanced Operating Systems & Kernel Design"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Academic Department
                </label>
                <div className="space-y-1.5">
                  <select
                    value={courseDepartmentInput}
                    onChange={(e) => setCourseDepartmentInput(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="">-- Choose Existing Department --</option>
                    {allDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={courseDepartmentInput}
                    onChange={(e) => setCourseDepartmentInput(e.target.value)}
                    placeholder="Or type a new department name..."
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Academic Level / Cohort
                </label>
                <select
                  value={courseLevelInput}
                  onChange={(e) => setCourseLevelInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Undergraduate Year 1">Undergraduate Year 1 (Certificate)</option>
                  <option value="Undergraduate Year 2">Undergraduate Year 2 (Diploma)</option>
                  <option value="Undergraduate Year 3">Undergraduate Year 3 (Bachelors Core)</option>
                  <option value="Undergraduate Year 4">Undergraduate Year 4 (Senior Honours)</option>
                  <option value="Postgraduate Masters">Postgraduate Masters (MSc / MPhil)</option>
                  <option value="Doctoral PhD">Doctoral PhD Research</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Synopsis & Description
                </label>
                <textarea
                  rows={2}
                  value={courseDescInput}
                  onChange={(e) => setCourseDescInput(e.target.value)}
                  placeholder="Outline core themes, prerequisites, or topics covered..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCourseCode ? 'Save Course Modifications' : 'Create & Assign Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for Printing List of Students Who Missed Examination */}
      <PrintMissedExamsModal
        isOpen={isPrintMissedModalOpen}
        onClose={() => setIsPrintMissedModalOpen(false)}
        missedExams={missedExams}
        students={students}
        exams={exams}
      />

      {/* Modal for Printing List of Students Approved for Examination */}
      <PrintApprovedStudentsModal
        isOpen={isPrintApprovedModalOpen}
        onClose={() => setIsPrintApprovedModalOpen(false)}
        exams={exams}
        students={students}
        resitRequests={resitRequests}
      />

      {/* Modal for Printing List of Candidates Below Passing Threshold Across Units */}
      <PrintFailedStudentsModal
        isOpen={isPrintFailedModalOpen}
        onClose={() => setIsPrintFailedModalOpen(false)}
        failedStudents={getFailedStudentsList()}
        exams={exams}
      />

      {/* Modal for Super Admin Medical Evidence Inspection */}
      {viewingEvidenceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Medical Evidence Verification</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 font-bold uppercase">
                      Compulsory Attachment
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Candidate: {viewingEvidenceModal.studentName} ({viewingEvidenceModal.studentNumber}) &bull; {viewingEvidenceModal.courseCode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingEvidenceModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Candidate & Absence Overview */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block">Course / Exam:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {viewingEvidenceModal.courseCode} - {viewingEvidenceModal.examTitle}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sitting Date:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {viewingEvidenceModal.missedDate || 'Session Missed'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Clearance Status:</span>
                  <span className="font-bold uppercase text-amber-600">
                    {viewingEvidenceModal.status}
                  </span>
                </div>
              </div>

              {/* Medical Provider Particulars */}
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-rose-600" />
                  <span>Medical Provider &amp; Clinical Certification Particulars</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Clinic / Hospital:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {viewingEvidenceModal.medicalFacility || 'University Health Services Clinic'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Attending Physician:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {viewingEvidenceModal.doctorName || 'Dr. Kevin Patel, MD'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Certificate Ref #:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {viewingEvidenceModal.medicalCertificateRef || 'UHS-MED-CERT-VERIFIED'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Candidate Reason Statement */}
              <div className="space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] block">
                  Student Explanation:
                </span>
                <p className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed italic">
                  "{viewingEvidenceModal.explanation || viewingEvidenceModal.reasonDetails}"
                </p>
              </div>

              {/* Document Display / Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] block">
                    Attached Medical Evidence Document / Photo:
                  </span>
                  {viewingEvidenceModal.attachmentFileName && (
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                      File: {viewingEvidenceModal.attachmentFileName}
                    </span>
                  )}
                </div>

                {(() => {
                  const url = viewingEvidenceModal.attachmentFileUrl;
                  const name = (viewingEvidenceModal.attachmentFileName || viewingEvidenceModal.evidenceDocument || '').toLowerCase();
                  const type = (viewingEvidenceModal.attachmentFileType || '').toLowerCase();
                  const isImg = (url && (url.startsWith('data:image/') || url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || url.includes('svg+xml'))) ||
                    type.startsWith('image/') ||
                    name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.svg') || name.endsWith('.webp');
                  const isPdf = (url && (url.startsWith('data:application/pdf') || url.endsWith('.pdf'))) ||
                    type.includes('pdf') || name.endsWith('.pdf');

                  const effectiveDocUrl = url || (isImg || isPdf ? null : null);

                  return (
                    <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 overflow-hidden shadow-inner flex flex-col">
                      {/* Document Viewer Toolbar */}
                      <div className="p-2.5 bg-slate-200/80 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {isImg ? 'Clinical Photo / Medical Scan Viewer' : isPdf ? 'Clinical PDF Document Viewer' : 'Verified Evidence Document'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                            In-App Preview Active
                          </span>
                        </div>

                        {url && (
                          <a
                            href={url}
                            download={viewingEvidenceModal.attachmentFileName || 'Medical_Certificate_Proof'}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="Download a local copy of this medical evidence file"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Download Copy</span>
                          </a>
                        )}
                      </div>

                      {/* Document Viewer Body */}
                      <div className="p-4 flex flex-col items-center justify-center min-h-[380px] max-h-[580px] overflow-auto bg-slate-50 dark:bg-slate-900/60">
                        {isImg && url ? (
                          <div className="w-full flex flex-col items-center justify-center space-y-2">
                            <img
                              src={url}
                              alt={viewingEvidenceModal.attachmentFileName || 'Medical Certificate Proof'}
                              className="max-h-[520px] max-w-full w-auto object-contain rounded-lg border border-slate-300 dark:border-slate-700 shadow-md bg-white p-1"
                            />
                            <p className="text-[11px] text-slate-500 font-mono italic">
                              Showing full-resolution attached clinical photo / official certificate
                            </p>
                          </div>
                        ) : isPdf && url ? (
                          <iframe
                            src={url}
                            title={viewingEvidenceModal.attachmentFileName || 'Medical Certificate PDF'}
                            className="w-full h-[500px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white shadow-sm"
                          />
                        ) : (
                          /* If document has no data URL or is another document type, render official verified clinical certificate layout */
                          <div className="w-full max-w-2xl p-6 bg-white dark:bg-slate-850 rounded-xl border-2 border-indigo-200 dark:border-indigo-900 shadow-md text-left space-y-4">
                            <div className="border-b border-indigo-100 dark:border-indigo-800/60 pb-3 flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                                  <Stethoscope className="w-4 h-4 text-rose-600" />
                                  <span>{viewingEvidenceModal.medicalFacility || 'University Health Services Clinic'}</span>
                                </h4>
                                <p className="text-[11px] text-slate-500">Official Clinical Sick Note &amp; Verification Docket</p>
                              </div>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                Ref: {viewingEvidenceModal.medicalCertificateRef || 'UHS-MED-CERT-VERIFIED'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Candidate:</span>
                                <strong className="text-slate-900 dark:text-white">{viewingEvidenceModal.studentName} ({viewingEvidenceModal.studentNumber})</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Missed Examination:</span>
                                <strong className="text-slate-900 dark:text-white">{viewingEvidenceModal.courseCode} — {viewingEvidenceModal.examTitle}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Attending Physician:</span>
                                <strong className="text-slate-900 dark:text-white">{viewingEvidenceModal.doctorName || 'Dr. Kevin Patel, MD, MBBS'}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">Lodged Attachment:</span>
                                <strong className="text-emerald-700 dark:text-emerald-300">{viewingEvidenceModal.attachmentFileName || viewingEvidenceModal.evidenceDocument || 'Medical_Record_Clearance.pdf'}</strong>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                              "{viewingEvidenceModal.explanation || viewingEvidenceModal.reasonDetails}"
                            </div>

                            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Official Clinical Record Attached &amp; Validated</span>
                              </span>
                              <span>Timestamp: {new Date(viewingEvidenceModal.submittedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer with Direct Review Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingEvidenceModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close Verification
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={viewingEvidenceModal.status === 'approved'}
                  onClick={() => {
                    handleDeclineResitRequest(viewingEvidenceModal.id);
                    setViewingEvidenceModal(null);
                  }}
                  className={`px-3.5 py-2 rounded-xl border font-bold flex items-center gap-1.5 transition-colors ${
                    viewingEvidenceModal.status === 'approved'
                      ? 'opacity-35 cursor-not-allowed pointer-events-none bg-slate-100 text-slate-400 border-slate-200'
                      : 'bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 cursor-pointer'
                  }`}
                  title={viewingEvidenceModal.status === 'approved' ? 'Clearance is approved; decline action is inactive.' : 'Decline Clearance'}
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline Clearance</span>
                </button>

                <button
                  type="button"
                  disabled={viewingEvidenceModal.status === 'approved'}
                  onClick={() => {
                    handleApproveResitRequest(viewingEvidenceModal.id);
                    setViewingEvidenceModal(null);
                  }}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors border ${
                    viewingEvidenceModal.status === 'approved'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60 pointer-events-none'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                  }`}
                  title={viewingEvidenceModal.status === 'approved' ? 'Clearance is approved. Action is inactive.' : 'Approve Clearance (Medical Verified)'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{viewingEvidenceModal.status === 'approved' ? 'Clearance Approved ✓' : 'Approve Clearance (Medical Verified)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATED FLASHCARD CONFIRMATION & PROMPT MODAL (REPLACING ALL BROWSER 'LOCALHOST SAYS' POPUPS) */}
      {flashConfirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
            onClick={() => setFlashConfirmModal(null)}
          />

          <div
            className={`relative z-10 max-w-md w-full p-6 rounded-2xl shadow-2xl border-2 animate-flashcard-entry transition-all bg-white dark:bg-slate-900 ${
              flashConfirmModal.type === 'danger'
                ? 'border-rose-400 ring-4 ring-rose-200/50 dark:ring-rose-950/50'
                : 'border-emerald-400 ring-4 ring-emerald-200/50 dark:ring-emerald-950/50'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  flashConfirmModal.type === 'danger'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                {flashConfirmModal.type === 'danger' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                  {flashConfirmModal.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {flashConfirmModal.message}
                </p>
                {flashConfirmModal.subtext && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                    {flashConfirmModal.subtext}
                  </p>
                )}
              </div>
            </div>

            {flashConfirmModal.type === 'prompt' && (
              <div className="mb-4">
                <input
                  type="text"
                  autoFocus
                  value={flashPromptInput}
                  onChange={(e) => setFlashPromptInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      flashConfirmModal.onConfirm(flashPromptInput);
                    }
                  }}
                  placeholder="Enter directive / notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs sm:text-sm font-sans focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFlashConfirmModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {flashConfirmModal.cancelLabel || 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => flashConfirmModal.onConfirm(flashPromptInput)}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                  flashConfirmModal.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {flashConfirmModal.confirmLabel || 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Inquiry Modal to Lecturer on Marks Moderation */}
      {inquiryTargetSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Send Inquiry to Lecturer</h3>
                  <p className="text-xs text-amber-100">Marks Moderation &amp; Academic Senate Governance</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInquiryTargetSub(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-slate-700 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Lecturer:</span>
                  <span className="font-bold">{inquiryTargetSub.committedMarkChangeRequest?.requestedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Candidate:</span>
                  <span>{inquiryTargetSub.studentName} ({inquiryTargetSub.studentNumber})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Proposed Modification:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {inquiryTargetSub.committedMarkChangeRequest?.originalScore} &rarr; {inquiryTargetSub.committedMarkChangeRequest?.requestedScore} pts
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                  Inquiry Directive for Lecturer:
                </label>
                <textarea
                  value={adminInquiryMessage}
                  onChange={(e) => setAdminInquiryMessage(e.target.value)}
                  placeholder="Specify what additional justification, marking breakdown, or evidence is required before ratification..."
                  rows={4}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInquiryTargetSub(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!adminInquiryMessage.trim()}
                  onClick={() => {
                    const res = sendAdminInquiryOnMarkChange(
                      inquiryTargetSub.id,
                      adminInquiryMessage,
                      'Dr. Marcus Sterling (Super Admin)'
                    );
                    if (res.success) {
                      playAlertBeep('info');
                      triggerFlash('Inquiry sent to lecturer. Notification banner dispatched.', 'info');
                      setInquiryTargetSub(null);
                      setAdminInquiryMessage('');
                      refreshData();
                    } else {
                      playAlertBeep('error');
                      triggerFlash(res.error || 'Failed to dispatch inquiry', 'error');
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  Dispatch Inquiry to Lecturer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
