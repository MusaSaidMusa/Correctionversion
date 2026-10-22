import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { HelpSupportModal } from './components/common/HelpSupportModal';
import { FlashMessage, FlashMessageData } from './components/common/FlashMessage';
import { AuthView } from './components/auth/AuthView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { ExamRunner } from './components/student/ExamRunner';
import { ExamResultsModal } from './components/student/ExamResultsModal';
import {
  getStoredExams,
  saveStoredExams,
  getStoredQuestions,
  saveStoredQuestions,
  getStoredSubmissions,
  saveStoredSubmissions,
  getStoredStudents,
  getStoredTeachers,
  getStoredTheme,
  saveStoredTheme,
  getActiveInProgressExamForStudent,
  addExam,
  updateExam,
  deleteExam,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  saveSubmission,
  overrideQuestionMark,
  getStudentAttemptCount,
  hasExceededAttempts,
  addStudent,
  registerStudentToExam,
  unregisterStudentFromExam,
  toggleMarkingSchemeRelease,
  updateTeacher,
  resetToDefaults,
  getStoredSuperAdmin,
} from './services/storageService';
import { CURRENT_TEACHER } from './data/mockData';
import { Exam, Question, ExamSubmission, StudentProfile, TeacherProfile, AuthUser, ThemeMode } from './types';

export default function App() {
  const [students, setStudents] = useState<StudentProfile[]>(() => getStoredStudents());
  const [exams, setExams] = useState<Exam[]>(() => getStoredExams());
  const [questionBank, setQuestionBank] = useState<Question[]>(() => getStoredQuestions());
  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => getStoredSubmissions());
  const [teachers, setTeachers] = useState<TeacherProfile[]>(() => getStoredTeachers());

  // Display Mode / Theme
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Sync theme with document class for Tailwind dark variant
  useEffect(() => {
    if (theme === 'dark' || theme === 'system') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveStoredTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  // Role-Based Authenticated User
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    // Default logged in as Teacher Prof. Evelyn Vance for exploration
    const defaultTeacher = getStoredTeachers()[0] || CURRENT_TEACHER;
    return {
      id: defaultTeacher.id,
      name: defaultTeacher.name,
      email: defaultTeacher.email,
      role: 'teacher',
      avatar: defaultTeacher.avatar,
      title: defaultTeacher.title,
      department: defaultTeacher.department,
      faculty: defaultTeacher.faculty || 'Faculty of Computing & Information Technologies',
      assignedCourseCodes: defaultTeacher.assignedCourseCodes,
      accessStatus: defaultTeacher.accessStatus,
    };
  });

  const [currentStudentId, setCurrentStudentId] = useState<string>('student-alex');

  // Active taking exam runner state
  const [activeRunningExam, setActiveRunningExam] = useState<Exam | null>(null);
  const [activeExistingSub, setActiveExistingSub] = useState<ExamSubmission | undefined>(undefined);
  const [activeAttemptNumber, setActiveAttemptNumber] = useState<number>(1);

  // Student post-submit results modal
  const [postSubmitResult, setPostSubmitResult] = useState<{ exam: Exam; submission: ExamSubmission } | null>(null);

  // Student notification banner for warnings sent by teacher
  const [studentBroadcastNotice, setStudentBroadcastNotice] = useState<string | null>(null);

  // Flash Notification Message (Login, Logout, etc.)
  const [flashMessage, setFlashMessage] = useState<FlashMessageData | null>(null);

  const showFlash = (data: FlashMessageData) => {
    setFlashMessage(data);
  };

  const currentStudent = students.find((s) => s.id === currentStudentId) || students[0];
  const activeTeacherProfile: TeacherProfile =
    teachers.find((t) => t.id === currentUser?.id || t.email === currentUser?.email) ||
    teachers[0] ||
    CURRENT_TEACHER;

  // Refresh helper
  const reloadState = () => {
    setExams(getStoredExams());
    setQuestionBank(getStoredQuestions());
    setSubmissions(getStoredSubmissions());
    setStudents(getStoredStudents());
    setTeachers(getStoredTeachers());
  };

  // Synchronize currentUser profile details (such as uploaded photos or name changes)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'teacher' && activeTeacherProfile) {
      if (
        currentUser.avatar !== activeTeacherProfile.avatar ||
        currentUser.name !== activeTeacherProfile.name ||
        currentUser.faculty !== activeTeacherProfile.faculty
      ) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                avatar: activeTeacherProfile.avatar,
                name: activeTeacherProfile.name,
                faculty: activeTeacherProfile.faculty || prev.faculty,
              }
            : null
        );
      }
    } else if (currentUser.role === 'student' && currentStudent) {
      if (currentUser.avatar !== currentStudent.avatar || currentUser.name !== currentStudent.name) {
        setCurrentUser((prev) =>
          prev ? { ...prev, avatar: currentStudent.avatar, name: currentStudent.name } : null
        );
      }
    } else if (currentUser.role === 'admin') {
      const storedAdmin = getStoredSuperAdmin();
      if (
        currentUser.avatar !== storedAdmin.avatar ||
        currentUser.name !== storedAdmin.name ||
        currentUser.title !== storedAdmin.title ||
        currentUser.department !== storedAdmin.department
      ) {
        setCurrentUser(storedAdmin);
      }
    }
  }, [activeTeacherProfile, currentStudent, currentUser?.role]);

  // Listen for Super Admin updates dispatched across components
  useEffect(() => {
    const handleAdminUpdated = (e: any) => {
      const updated = e.detail?.admin || getStoredSuperAdmin();
      if (currentUser?.role === 'admin') {
        setCurrentUser(updated);
      }
    };
    window.addEventListener('examguard_super_admin_updated', handleAdminUpdated);
    return () => window.removeEventListener('examguard_super_admin_updated', handleAdminUpdated);
  }, [currentUser?.role]);

  // Real-time synchronization for submissions, admissions, and exam status across tabs and components
  useEffect(() => {
    const handleSyncUpdate = () => {
      reloadState();
    };

    window.addEventListener('examguard_submissions_updated', handleSyncUpdate);
    window.addEventListener('examguard_admissions_updated', handleSyncUpdate);
    window.addEventListener('examguard_exams_updated', handleSyncUpdate);
    window.addEventListener('storage', handleSyncUpdate);

    return () => {
      window.removeEventListener('examguard_submissions_updated', handleSyncUpdate);
      window.removeEventListener('examguard_admissions_updated', handleSyncUpdate);
      window.removeEventListener('examguard_exams_updated', handleSyncUpdate);
      window.removeEventListener('storage', handleSyncUpdate);
    };
  }, []);

  // Fetch and verify teacher faculty from backend API whenever teacher is authenticated
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') return;
    const teacherId = currentUser.id;
    fetch(`/api/teachers/${encodeURIComponent(teacherId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json?.data?.faculty) {
          const verifiedFaculty = json.data.faculty;
          setCurrentUser((prev) =>
            prev && prev.faculty !== verifiedFaculty ? { ...prev, faculty: verifiedFaculty } : prev
          );
          setTeachers((prev) =>
            prev.map((t) => (t.id === teacherId ? { ...t, faculty: verifiedFaculty } : t))
          );
        }
      })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.role]);

  // Exam operations
  const handleAddExam = (newExam: Exam) => {
    addExam(newExam);
    reloadState();
  };

  const handleUpdateExam = (updated: Exam) => {
    const res = updateExam(updated);
    if (res.success) {
      reloadState();
    }
    return res;
  };

  const handleDeleteExam = (id: string) => {
    deleteExam(id);
    reloadState();
  };

  // Question operations
  const handleAddQuestion = (q: Question) => {
    addQuestion(q);
    reloadState();
  };

  const handleUpdateQuestion = (q: Question) => {
    updateQuestion(q);
    reloadState();
  };

  const handleDeleteQuestion = (id: string) => {
    deleteQuestion(id);
    reloadState();
  };

  const handleBulkImportQuestions = (qs: Question[]) => {
    const current = getStoredQuestions();
    const updated = [...qs, ...current];
    saveStoredQuestions(updated);
    reloadState();
  };

  // Manual Marking Score Override with Mandatory Reason
  const handleSaveOverride = (
    submissionId: string,
    questionId: string,
    newPoints: number,
    reason: string
  ) => {
    const instructorName = currentUser?.name || CURRENT_TEACHER.name;
    const res = overrideQuestionMark(submissionId, questionId, newPoints, reason, instructorName);
    if (res.success) {
      reloadState();
    }
    return res;
  };

  // Student Registration & Candidate Enrollments
  const handleRegisterStudent = (newStudent: StudentProfile, enrolledExamIds: string[]) => {
    addStudent(newStudent, enrolledExamIds);
    reloadState();
  };

  const handleToggleMarkingScheme = (examId: string, released: boolean) => {
    toggleMarkingSchemeRelease(examId, released);
    reloadState();
  };

  const handleRegisterStudentToExam = (studentId: string, examId: string) => {
    const enrolled = registerStudentToExam(studentId, examId);
    if (enrolled) reloadState();
    return enrolled;
  };

  const handleUnregisterStudentFromExam = (studentId: string, examId: string) => {
    unregisterStudentFromExam(studentId, examId);
    reloadState();
  };

  // Proctor operations
  const handleDismissIncident = (subId: string, incidentId: string) => {
    const subs = getStoredSubmissions();
    const sub = subs.find((s) => s.id === subId);
    if (sub && sub.incidents) {
      sub.incidents = sub.incidents.filter((i) => i.id !== incidentId);
      saveStoredSubmissions(subs);
      reloadState();
    }
  };

  const handleSendStudentWarning = (studentId: string, text: string) => {
    if (currentStudentId === studentId || studentId === 'all') {
      setStudentBroadcastNotice(text);
      setTimeout(() => setStudentBroadcastNotice(null), 8000);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examguard_student_warning', {
          detail: { studentId, text, timestamp: new Date().toISOString() },
        })
      );
    }
  };

  const handleForceSubmit = (subId: string) => {
    const subs = getStoredSubmissions();
    const sub = subs.find((s) => s.id === subId);
    if (sub) {
      sub.status = 'submitted';
      sub.submittedAt = new Date().toISOString();
      sub.isTerminatedForBreach = true;
      sub.terminationReason = 'Terminated by Invigilator for Proctored Security Protocol Violation';
      saveStoredSubmissions(subs);
      reloadState();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('examguard_force_submit', {
            detail: { submissionId: sub.id, studentId: sub.studentId, examId: sub.examId },
          })
        );
      }
    }
  };

  // Student taking examination flows
  const handleStartExam = (exam: Exam) => {
    // Check max attempts
    const attempts = getStudentAttemptCount(exam.id, currentStudent.id);
    if (attempts >= (exam.maxAttempts || 1)) {
      showFlash({
        type: 'warning',
        text: 'Maximum Examination Attempts Reached',
        subtext: `You have already completed the maximum allowed attempt (${exam.maxAttempts || 1}) for this examination.`,
      });
      return;
    }

    // STRICT CHECK: "A Student cannot take more than one examination at ago within the same period."
    const conflict = getActiveInProgressExamForStudent(currentStudent.id, exam.id);
    if (conflict) {
      showFlash({
        type: 'error',
        text: 'Active Examination Restriction',
        subtext: `You are already actively sitting for ${conflict.courseCode} - ${conflict.examTitle}. You cannot sit for more than one examination simultaneously.`,
      });
      return;
    }

    setActiveRunningExam(exam);
    setActiveAttemptNumber(attempts + 1);
    const existing = submissions.find(
      (s) => s.examId === exam.id && s.studentId === currentStudent.id && s.status === 'in_progress'
    );
    setActiveExistingSub(existing);
  };

  const handleResumeExam = (exam: Exam, submission: ExamSubmission) => {
    setActiveRunningExam(exam);
    setActiveAttemptNumber(submission.attemptNumber || 1);
    setActiveExistingSub(submission);
  };

  const handleSaveProgress = (sub: ExamSubmission) => {
    saveSubmission(sub);
    reloadState();
  };

  const handleSubmitExam = (finalSub: ExamSubmission) => {
    saveSubmission(finalSub);
    reloadState();
    setActiveRunningExam(null);
    if (activeRunningExam) {
      setPostSubmitResult({ exam: activeRunningExam, submission: finalSub });
    }
  };

  const handleResetData = () => {
    resetToDefaults();
    reloadState();
    showFlash({
      type: 'success',
      text: 'System Database Synchronized',
      subtext: 'Reset entire system to initial university examination and candidate records.',
    });
  };

  // Dashboard reset key to clear options/modals on logo click without signing out
  const [dashboardResetKey, setDashboardResetKey] = useState<number>(0);

  const handleNavigateHome = () => {
    setActiveRunningExam(null);
    setActiveExistingSub(undefined);
    setIsHelpModalOpen(false);
    setPostSubmitResult(null);
    setStudentBroadcastNotice(null);
    // Increment reset key to clear all selected options across dashboards
    setDashboardResetKey((prev) => prev + 1);
  };

  // If user is not authenticated, render Login Gate
  if (!currentUser) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
        {/* Flash Message Notification (e.g. You have logged out) */}
        <FlashMessage message={flashMessage} onClose={() => setFlashMessage(null)} />

        <AuthView
          onLogin={(user) => {
            setCurrentUser(user);
            showFlash({
              text: 'You have successfully logged in',
              subtext: `Welcome back, ${user.name} (${user.role.toUpperCase()})`,
              type: 'success',
            });
            if (user.role === 'student') {
              setCurrentStudentId(user.id);
            } else if (user.role === 'teacher') {
              // Immediately fetch verified teacher faculty from backend API
              fetch(`/api/teachers/${encodeURIComponent(user.id)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((json) => {
                  if (json?.success && json?.data?.faculty) {
                    const verifiedFaculty = json.data.faculty;
                    setCurrentUser((prev) =>
                      prev ? { ...prev, faculty: verifiedFaculty } : null
                    );
                    setTeachers((prev) =>
                      prev.map((t) => (t.id === user.id ? { ...t, faculty: verifiedFaculty } : t))
                    );
                  }
                })
                .catch(() => {});
            }
          }}
          teacher={activeTeacherProfile}
          students={students}
          onOpenHelp={() => setIsHelpModalOpen(true)}
        />
        {/* Help Modal in Auth */}
        <HelpSupportModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          currentUser={{
            id: 'unauthenticated',
            name: 'Academic Guest',
            email: 'guest@university.edu',
            role: 'student',
            avatar: '',
          }}
        />
        {/* Persistent Constant Footer */}
        <Footer
          currentUser={null}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          onOpenHelp={() => setIsHelpModalOpen(true)}
        />
      </div>
    );
  }

  // If student is currently taking an exam, show distraction-free ExamRunner fullscreen
  if (activeRunningExam) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <ExamRunner
          exam={activeRunningExam}
          studentId={currentStudent.id}
          studentName={currentStudent.name}
          studentEmail={currentStudent.email}
          studentAvatar={currentStudent.avatar}
          attemptNumber={activeAttemptNumber}
          existingSubmission={activeExistingSub}
          onSaveProgress={handleSaveProgress}
          onSubmitExam={handleSubmitExam}
          onExit={() => {
            setActiveRunningExam(null);
            reloadState();
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark'
          ? 'dark bg-slate-950 text-slate-100'
          : theme === 'system'
          ? 'dark bg-slate-900 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      } flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-150`}
    >
      {/* Flash Message Notification (e.g. You have successfully logged in) */}
      <FlashMessage message={flashMessage} onClose={() => setFlashMessage(null)} />

      {/* Top Header with strict role badge, profile, and Sign Out */}
      <Header
        currentUser={currentUser}
        teacher={activeTeacherProfile}
        students={students}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onSignOut={() => {
          setCurrentUser(null);
          showFlash({
            text: 'You have logged out',
            subtext: 'Your academic session has been safely closed.',
            type: 'info',
          });
        }}
        onResetData={handleResetData}
        onNavigateHome={handleNavigateHome}
        onOpenSuperAdminProfile={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('examguard_open_super_admin_profile'));
          }
        }}
      />

      {/* Real-Time Teacher Warning Notice received by student */}
      {studentBroadcastNotice && currentUser.role === 'student' && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs flex items-center justify-between font-semibold shadow-md animate-pulse">
          <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
            <span>🚨 Proctor Urgent Notice: {studentBroadcastNotice}</span>
            <button
              type="button"
              onClick={() => setStudentBroadcastNotice(null)}
              className="text-[11px] underline hover:text-amber-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 md:py-8 pb-20 overflow-x-hidden">
        {currentUser.role === 'admin' ? (
          <SuperAdminDashboard
            exams={exams}
            students={students}
            submissions={submissions}
            onDataRefresh={reloadState}
            resetKey={dashboardResetKey}
          />
        ) : currentUser.role === 'teacher' ? (
          <TeacherDashboard
            teacher={activeTeacherProfile}
            exams={exams}
            questionBank={questionBank}
            submissions={submissions}
            students={students}
            onAddExam={handleAddExam}
            onUpdateExam={handleUpdateExam}
            onDeleteExam={handleDeleteExam}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onBulkImportQuestions={handleBulkImportQuestions}
            onDismissIncident={handleDismissIncident}
            onSendStudentWarning={handleSendStudentWarning}
            onForceSubmit={handleForceSubmit}
            onSaveOverride={handleSaveOverride}
            onRegisterStudent={handleRegisterStudent}
            onToggleMarkingScheme={handleToggleMarkingScheme}
            onRegisterStudentToExam={handleRegisterStudentToExam}
            onUnregisterStudentFromExam={handleUnregisterStudentFromExam}
            onUpdateTeacher={(updated: TeacherProfile) => {
              updateTeacher(updated);
              reloadState();
            }}
            onDataChanged={reloadState}
            resetKey={dashboardResetKey}
          />
        ) : (
          <StudentDashboard
            student={currentStudent}
            exams={exams}
            submissions={submissions}
            onStartExam={handleStartExam}
            onResumeExam={handleResumeExam}
            onOpenHelp={() => setIsHelpModalOpen(true)}
            resetKey={dashboardResetKey}
          />
        )}
      </main>

      {/* Post Submission Results Modal */}
      {postSubmitResult && (
        <ExamResultsModal
          exam={postSubmitResult.exam}
          submission={postSubmitResult.submission}
          isOpen={true}
          onClose={() => setPostSubmitResult(null)}
        />
      )}

      {/* Help & Support Modal */}
      <HelpSupportModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        currentUser={currentUser}
        activeExam={activeRunningExam}
      />

      {/* Constant Persistent Sticky Footer */}
      <Footer
        currentUser={currentUser}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        onOpenHelp={() => setIsHelpModalOpen(true)}
      />
    </div>
  );
}
