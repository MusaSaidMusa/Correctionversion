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
} from 'lucide-react';
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
    'all_exams' | 'teachers' | 'mark_overrides' | 'student_registrations' | 'tickets' | 'departments'
  >('all_exams');

  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => getStoredTeachers());
  const [tickets, setTickets] = useState<HelpTicket[]>(() => getStoredHelpTickets());
  const [faculties, setFaculties] = useState(() => getStoredFaculties());

  // Real-time synchronization of submissions and admissions across Super Admin Directorate
  useEffect(() => {
    const handleRealtimeUpdate = () => {
      onDataRefresh();
    };
    window.addEventListener('examguard_submissions_updated', handleRealtimeUpdate);
    window.addEventListener('examguard_admissions_updated', handleRealtimeUpdate);
    return () => {
      window.removeEventListener('examguard_submissions_updated', handleRealtimeUpdate);
      window.removeEventListener('examguard_admissions_updated', handleRealtimeUpdate);
    };
  }, [onDataRefresh]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [examStatusFilter, setExamStatusFilter] = useState<string>('all');
  const [overrideStatusFilter, setOverrideStatusFilter] = useState<string>('all');

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
  const [newStudentNumber, setNewStudentNumber] = useState(`STU-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newStudentDept, setNewStudentDept] = useState('Computer Science');
  const [newStudentCourses, setNewStudentCourses] = useState('CS-405, CS-301');
  const [studentAvatar, setStudentAvatar] = useState('');
  const [selectedExamEnrollments, setSelectedExamEnrollments] = useState<string[]>([]);
  const [studentModalError, setStudentModalError] = useState<string | null>(null);

  // Inspect Exam Questions Modal State
  const [inspectingExam, setInspectingExam] = useState<Exam | null>(null);

  // Ticket reply modal state
  const [activeTicket, setActiveTicket] = useState<HelpTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
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
      alert('Please select an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAdminAvatarDraft(reader.result);
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
    if (window.confirm(`Are you sure you want to delete course ${code} ("${title}")? This action cannot be undone.`)) {
      deleteCourse(code);
      setCourses(getStoredCourses());
      showToast(`Course ${code} deleted.`);
    }
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
      if (ans.isOverridden) {
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
    if (confirm(`Institutional Security Confirmation: Are you sure you want to permanently delete ${name} and revoke all faculty privileges?`)) {
      deleteTeacher(id);
      showToast(`Deleted faculty member ${name}.`);
      refreshData();
    }
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
    if (!confirm(`Delete ${facultyName}? This cannot be undone.`)) return;
    if (deleteFacultyRecord(facultyName)) {
      setFaculties(getStoredFaculties());
      showToast(`Deleted ${facultyName}.`);
    }
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
    setNewStudentNumber(`STU-2026-${Math.floor(1000 + Math.random() * 9000)}`);
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

      // Synchronize student exam enrollments
      exams.forEach((ex) => {
        if (selectedExamEnrollments.includes(ex.id)) {
          registerStudentToExam(editingStudentId, ex.id);
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

      addStudent(newCandidate, selectedExamEnrollments);
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
    if (confirm(`Remove candidate ${name} from institutional registry?`)) {
      deleteStudent(id);
      showToast(`Removed candidate ${name}.`);
      refreshData();
    }
  };

  const handleDeleteExamAction = (examId: string, title: string) => {
    if (confirm(`Super Admin Security Action: Permanently delete examination "${title}"?`)) {
      deleteExam(examId);
      showToast(`Deleted examination ${title}.`);
      refreshData();
    }
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
          <div className="flex items-center gap-2 text-rose-300 text-xs font-mono font-bold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 text-rose-300 border border-rose-800/80 backdrop-blur-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Super Administrator Directorate</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-slate-200 drop-shadow-xs">Institutional Governance & Examinations Board</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
            Institutional Academic Assessment Authority
          </h1>
          <p className="text-xs md:text-sm text-slate-100 max-w-2xl leading-relaxed drop-shadow-xs">
            Consolidated oversight across all the college departments. Inspect accumulated examinations, manage faculty clearance and access rights, audit and decide on marks modifications, and register candidates.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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
          onClick={() => setActiveTab('all_exams')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'all_exams'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeTab === 'all_exams' ? 'text-white' : 'text-blue-500'}`} />
          <span>All Accumulated Examinations ({exams.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teachers')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'teachers'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'teachers' ? 'text-white' : 'text-indigo-500'}`} />
          <span>Faculty Directory & Rights ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('departments')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'departments'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <Building2 className={`w-4 h-4 ${activeTab === 'departments' ? 'text-white' : 'text-orange-500'}`} />
          <span>Faculties, Departments & Courses ({courses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mark_overrides')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'mark_overrides'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <Award className={`w-4 h-4 ${activeTab === 'mark_overrides' ? 'text-white' : 'text-amber-500'}`} />
          <span>Modified Marks & Justifications ({allModifiedMarks.length + committedMarkChangeRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('student_registrations')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'student_registrations'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <GraduationCap className={`w-4 h-4 ${activeTab === 'student_registrations' ? 'text-white' : 'text-indigo-500'}`} />
          <span>Candidate Registrations ({students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all cursor-pointer border ${
            activeTab === 'tickets'
              ? 'bg-emerald-600 text-white shadow-xs border-emerald-500 font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 border-transparent'
          }`}
        >
          <LifeBuoy className={`w-4 h-4 ${activeTab === 'tickets' ? 'text-white' : 'text-rose-500'}`} />
          <span>Incident Inquiries ({tickets.length})</span>
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
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {exam.courseCode}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {exam.title}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              exam.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {exam.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                          <span>Instructor: <strong className="text-slate-700 dark:text-slate-200">{exam.instructorName}</strong></span>
                          <span>·</span>
                          <span>Duration: <strong>{exam.durationMinutes} mins</strong></span>
                          <span>·</span>
                          <span>Questions: <strong>{exam.questions.length} ({totalPoints} pts)</strong></span>
                          <span>·</span>
                          <span>Submissions: <strong className="text-indigo-600 dark:text-indigo-400">{examSubs.length}</strong></span>
                          <span>·</span>
                          <span>Enrolled: <strong>{enrolledCount} Candidates</strong></span>
                        </div>

                        {/* Security Protocols Bar */}
                        <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" /> Camera Locked
                          </span>
                          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" /> Microphone Active
                          </span>
                          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            <Check className="w-3 h-3" /> SEB Handshake Verified
                          </span>
                        </div>
                      </div>

                      {/* Super Admin Exam Actions */}
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        <button
                          type="button"
                          onClick={() => setViewingPaperExam(exam)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                          title="View official examination paper formatted in Times New Roman 12pt"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Exam Paper</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewingSchemeExam(exam)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs border border-indigo-200 dark:border-indigo-800"
                          title="View official marking scheme formatted in Times New Roman 12pt"
                        >
                          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Marking Scheme</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectingExam(exam)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          <span>Inspect ({exam.questions.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteExamAction(exam.id, exam.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
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

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <img
                          src={teacher.avatar}
                          alt={teacher.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedProfileModal({ type: 'teacher', id: teacher.id })}
                              className="font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 underline underline-offset-2 decoration-slate-300 text-left cursor-pointer transition-colors"
                              title="Click to fetch faculty profile and clearance record from backend"
                            >
                              {teacher.name}
                            </button>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 font-medium">
                              {teacher.title}
                            </span>
                          </div>
                          <div className="text-slate-500 font-mono">{teacher.email}</div>
                          <div className="text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="font-semibold">{teacher.department}</span>
                            <span>·</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                              Assigned Courses: {teacher.assignedCourseCodes?.join(', ') || 'None assigned'}
                            </span>
                          </div>

                          {/* Specific Faculty Rights Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                rights.canCreateExams
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : 'bg-slate-100 text-slate-400 line-through'
                              }`}
                            >
                              Create Exams
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                rights.canGradeMarks
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-400 line-through'
                              }`}
                            >
                              Grade / Override Marks
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                rights.canAdmitStudents
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-400 line-through'
                              }`}
                            >
                              Admit Students
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                rights.canDeleteExams
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {rights.canDeleteExams ? 'Delete Exam Privileges' : 'No Delete Privileges'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Edit Details & Rights, Toggle Clearance, Delete */}
                      <div className="flex items-center gap-2 self-end lg:self-center">
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
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                          title="Modify Teacher Details & Rights"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Modify & Rights</span>
                        </button>

                        {teacher.accessStatus !== 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleToggleAccess(teacher.id, 'active')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Grant</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleAccess(teacher.id, 'suspended')}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
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
                      key={request.id}
                      className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
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
                      {/* Requirement: Once admin approves the marks modification, the button becomes inactive */}
                      {/* Hover: Dark Orange | Clicked/Active: Green */}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => !isApproved && handleOpenReviewOverride(submission, questionId, answer, exam, 'enquiry')}
                          className={`px-3.5 py-1.5 border rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                            isApproved
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 pointer-events-none'
                              : 'bg-indigo-50 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-xs'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Send Enquiry for Explanation</span>
                        </button>

                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => !isApproved && handleOpenReviewOverride(submission, questionId, answer, exam, 'decline')}
                          className={`px-3.5 py-1.5 border rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                            isApproved
                              ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 pointer-events-none'
                              : 'bg-rose-50 hover:bg-orange-600 hover:text-white hover:border-orange-500 active:bg-emerald-600 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800 cursor-pointer shadow-xs'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Decline Modification & Revert</span>
                        </button>

                        <button
                          type="button"
                          disabled={isApproved}
                          onClick={() => !isApproved && handleOpenReviewOverride(submission, questionId, answer, exam, 'approve')}
                          className={`px-4 py-1.5 rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                            isApproved
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60 pointer-events-none'
                              : 'bg-emerald-600 hover:bg-orange-600 active:bg-emerald-700 text-white cursor-pointer border border-emerald-500 hover:border-orange-500'
                          }`}
                          title={isApproved ? 'Modification has already been approved by Administrator' : 'Approve Modification'}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${isApproved ? 'text-emerald-500' : 'text-white'}`} />
                          <span>{isApproved ? 'Modification Approved (Inactive)' : 'Approve Modification'}</span>
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
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{student.name}</h4>
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
                        if (e.target.value) {
                          registerStudentToExam(student.id, e.target.value);
                          showToast(`Enrolled ${student.name} into examination.`);
                          e.target.value = '';
                          refreshData();
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
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {faculties.map((faculty) => (
                  <div key={faculty.name} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{faculty.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{faculty.department}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditFaculty(faculty.name, faculty.department)}
                        className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                        title={`Edit ${faculty.name}`}
                        aria-label={`Edit ${faculty.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteFaculty(faculty.name)}
                        className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title={`Delete ${faculty.name}`}
                        aria-label={`Delete ${faculty.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                className={`w-full py-2.5 text-white rounded-xl font-bold shadow-md cursor-pointer transition-all hover:bg-orange-600 active:bg-emerald-700 border border-transparent hover:border-orange-500 ${
                  adminReviewAction === 'approve'
                    ? 'bg-emerald-600'
                    : adminReviewAction === 'decline'
                    ? 'bg-rose-600'
                    : 'bg-indigo-600'
                }`}
              >
                {adminReviewAction === 'approve'
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
    </div>
  );
};
