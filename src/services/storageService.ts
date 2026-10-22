import { Exam, Question, ExamSubmission, ProctorIncident, StudentProfile, TeacherProfile, HelpTicket, ThemeMode, Course, AuthUser } from '../types';
import { INITIAL_EXAMS, INITIAL_QUESTION_BANK, INITIAL_SUBMISSIONS, INITIAL_STUDENTS, CURRENT_TEACHER, INITIAL_TEACHERS, INITIAL_HELP_TICKETS, INITIAL_COURSES, SUPER_ADMIN } from '../data/mockData';

const STORAGE_KEYS = {
  EXAMS: 'examguard_exams_v1',
  QUESTIONS: 'examguard_questions_v1',
  SUBMISSIONS: 'examguard_submissions_v1',
  STUDENTS: 'examguard_students_v1',
  TEACHERS: 'examguard_teachers_v1',
  HELP_TICKETS: 'examguard_help_tickets_v1',
  THEME_MODE: 'examguard_theme_mode_v1',
  ACTIVE_USER: 'examguard_active_user_v1',
  ACTIVE_ROLE: 'examguard_active_role_v1',
  TEACHER_PASSWORDS: 'examguard_teacher_passwords_v1',
  ACCOUNT_PASSWORDS: 'examguard_account_passwords_v1',
  COURSES: 'examguard_courses_v1',
  SUPER_ADMIN: 'examguard_super_admin_v1',
};

export function getTeacherPasswordHash(email: string): string | null {
  try {
    const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHER_PASSWORDS) || '{}');
    return passwords[email.trim().toLowerCase()] || null;
  } catch {
    return null;
  }
}

export function saveTeacherPasswordHash(email: string, hash: string): void {
  const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHER_PASSWORDS) || '{}');
  passwords[email.trim().toLowerCase()] = hash;
  localStorage.setItem(STORAGE_KEYS.TEACHER_PASSWORDS, JSON.stringify(passwords));
}

export function getAccountPasswordHash(role: 'student' | 'admin', email: string): string | null {
  try {
    const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNT_PASSWORDS) || '{}');
    return passwords[`${role}:${email.trim().toLowerCase()}`] || null;
  } catch {
    return null;
  }
}

export function saveAccountPasswordHash(role: 'student' | 'admin', email: string, hash: string): void {
  const passwords = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNT_PASSWORDS) || '{}');
  passwords[`${role}:${email.trim().toLowerCase()}`] = hash;
  localStorage.setItem(STORAGE_KEYS.ACCOUNT_PASSWORDS, JSON.stringify(passwords));
}

export function verifyUserPassword(
  role: 'student' | 'teacher' | 'admin',
  email: string,
  candidate: string
): boolean {
  if (!candidate || !email) return false;
  const trimmed = candidate.trim();
  const normalizedEmail = email.trim().toLowerCase();

  let stored: string | null = null;
  if (role === 'teacher') {
    stored = getTeacherPasswordHash(normalizedEmail);
  } else {
    stored = getAccountPasswordHash(role, normalizedEmail);
  }

  if (stored) {
    return stored === trimmed;
  }

  // Institutional default passwords permitted before initial user change
  const candidateLower = trimmed.toLowerCase();
  const validDefaults = [
    'password',
    'password123',
    'examguard2026',
    'rifkins2026',
    'admin123',
    '123456',
    'student123',
    'teacher123',
  ];
  return validDefaults.includes(candidateLower);
}

export function updateUserPassword(
  role: 'student' | 'teacher' | 'admin',
  email: string,
  newPassword: string
): { success: boolean; error?: string } {
  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: 'New password must be at least 6 characters in length.' };
  }
  const trimmedPass = newPassword.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (role === 'teacher') {
    saveTeacherPasswordHash(normalizedEmail, trimmedPass);
    const teachers = getStoredTeachers();
    const tIdx = teachers.findIndex((t) => t.email.toLowerCase() === normalizedEmail);
    if (tIdx !== -1) {
      teachers[tIdx] = {
        ...teachers[tIdx],
        lastPasswordChangedAt: now,
      };
      saveStoredTeachers(teachers);
    }
  } else if (role === 'student') {
    saveAccountPasswordHash('student', normalizedEmail, trimmedPass);
    const students = getStoredStudents();
    const sIdx = students.findIndex((s) => s.email.toLowerCase() === normalizedEmail);
    if (sIdx !== -1) {
      students[sIdx] = {
        ...students[sIdx],
        lastPasswordChangedAt: now,
      };
      saveStoredStudents(students);
    }
  } else if (role === 'admin') {
    saveAccountPasswordHash('admin', normalizedEmail, trimmedPass);
    saveStoredSuperAdmin({ lastPasswordChangedAt: now });
  }

  // Fire synchronization event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('examguard_password_updated', {
        detail: { role, email: normalizedEmail, timestamp: now },
      })
    );
  }

  // Also best-effort update to backend API
  try {
    fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, email: normalizedEmail, newPassword: trimmedPass }),
    }).catch(() => {});
  } catch {}

  return { success: true };
}

function normalizeNonChoiceQuestion(question: Question): Question {
  return question;
}

// Seed or load data
export function getStoredExams(): Exam[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
      return INITIAL_EXAMS;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return INITIAL_EXAMS;
    return parsed.map((e: any) => ({
      ...e,
      questions: Array.isArray(e.questions) ? e.questions.map(normalizeNonChoiceQuestion) : [],
      securityProtocols: {
        requireCamera: true,
        requireMicrophone: true,
        requireSEB: false,
        blockVirtualMachine: true,
        ...(e.securityProtocols || {}),
      },
      registeredStudentIds: e.registeredStudentIds || [],
      admittedStudentIds: e.admittedStudentIds || [],
      isMarkingSchemeReleased: e.isMarkingSchemeReleased ?? false,
    }));
  } catch {
    return INITIAL_EXAMS;
  }
}

export function saveStoredExams(exams: Exam[]): void {
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
}

export function getStoredQuestions(): Question[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTION_BANK));
      return INITIAL_QUESTION_BANK;
    }
    const questions: Question[] = JSON.parse(data);
    const normalized = questions.map(normalizeNonChoiceQuestion);
    if (normalized.some((question, index) => question !== questions[index])) {
      saveStoredQuestions(normalized);
    }
    return normalized;
  } catch {
    return INITIAL_QUESTION_BANK;
  }
}

export function saveStoredQuestions(questions: Question[]): void {
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}

export function getStoredSubmissions(): ExamSubmission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
      return INITIAL_SUBMISSIONS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveStoredSubmissions(submissions: ExamSubmission[]): void {
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
}

export function getStoredStudents(): StudentProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    const students: StudentProfile[] = JSON.parse(data);
    return students.map((student) => ({
      ...student,
      accessStatus: student.accessStatus || 'active',
    }));
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function saveStoredStudents(students: StudentProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

// ---------------------------------------------------------------------------
// Course Management & Department Assignment
// ---------------------------------------------------------------------------
export function getStoredCourses(): Course[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
      return INITIAL_COURSES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_COURSES;
  } catch {
    return INITIAL_COURSES;
  }
}

export function saveStoredCourses(courses: Course[]): void {
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_courses_updated', { detail: { courses } }));
  }
}

export function addCourse(newCourse: Course): { success: boolean; error?: string; course?: Course } {
  const courses = getStoredCourses();
  const normalizedCode = newCourse.code.trim().toUpperCase();
  if (courses.some((c) => c.code.trim().toUpperCase() === normalizedCode)) {
    return { success: false, error: `Course with code "${normalizedCode}" already exists.` };
  }
  const courseWithDefaults: Course = {
    ...newCourse,
    id: newCourse.id || `course-${normalizedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
    code: normalizedCode,
    createdAt: newCourse.createdAt || new Date().toISOString(),
  };
  const updated = [courseWithDefaults, ...courses];
  saveStoredCourses(updated);
  return { success: true, course: courseWithDefaults };
}

export function updateCourse(originalCode: string, updated: Partial<Course>): { success: boolean; error?: string } {
  const courses = getStoredCourses();
  const normalizedOriginal = originalCode.trim().toUpperCase();
  const index = courses.findIndex((c) => c.code.trim().toUpperCase() === normalizedOriginal);
  if (index === -1) {
    return { success: false, error: `Course "${originalCode}" not found.` };
  }
  if (updated.code && updated.code.trim().toUpperCase() !== normalizedOriginal) {
    const newCode = updated.code.trim().toUpperCase();
    if (courses.some((c, i) => i !== index && c.code.trim().toUpperCase() === newCode)) {
      return { success: false, error: `Course code "${newCode}" is already in use by another course.` };
    }
  }
  courses[index] = {
    ...courses[index],
    ...updated,
    code: updated.code ? updated.code.trim().toUpperCase() : courses[index].code,
  };
  saveStoredCourses(courses);
  return { success: true };
}

export function deleteCourse(code: string): boolean {
  const courses = getStoredCourses();
  const normalized = code.trim().toUpperCase();
  const filtered = courses.filter((c) => c.code.trim().toUpperCase() !== normalized);
  if (filtered.length === courses.length) return false;
  saveStoredCourses(filtered);
  return true;
}

export function getCoursesByDepartment(department: string): Course[] {
  const courses = getStoredCourses();
  if (!department || department === 'all') return courses;
  const deptNorm = department.trim().toLowerCase();
  return courses.filter((c) => c.department.trim().toLowerCase() === deptNorm);
}

// ---------------------------------------------------------------------------
// Super Admin Profile Management
// ---------------------------------------------------------------------------
export function getStoredSuperAdmin(): AuthUser {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN, JSON.stringify(SUPER_ADMIN));
      return SUPER_ADMIN;
    }
    const parsed = JSON.parse(data);
    return {
      ...SUPER_ADMIN,
      ...parsed,
      role: 'admin',
    };
  } catch {
    return SUPER_ADMIN;
  }
}

export function saveStoredSuperAdmin(updates: Partial<AuthUser>): AuthUser {
  const current = getStoredSuperAdmin();
  const updated: AuthUser = {
    ...current,
    ...updates,
    role: 'admin', // Role is locked
  };
  localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_super_admin_updated', { detail: { admin: updated } }));
  }
  return updated;
}

export function addStudent(newStudent: StudentProfile, enrolledExamIds: string[] = []): StudentProfile {
  const students = getStoredStudents();
  // Check if exists
  const existingIdx = students.findIndex((s) => s.id === newStudent.id || s.email.toLowerCase() === newStudent.email.toLowerCase());
  if (existingIdx !== -1) {
    students[existingIdx] = newStudent;
  } else {
    students.push(newStudent);
  }
  saveStoredStudents(students);

  // If specific exams were selected, also register candidate into those exams
  if (enrolledExamIds.length > 0) {
    const exams = getStoredExams();
    exams.forEach((ex) => {
      if (enrolledExamIds.includes(ex.id) || enrolledExamIds.includes(ex.courseCode)) {
        if (!ex.registeredStudentIds) ex.registeredStudentIds = [];
        if (!ex.registeredStudentIds.includes(newStudent.id)) {
          ex.registeredStudentIds.push(newStudent.id);
        }
      }
    });
    saveStoredExams(exams);
  }

  return newStudent;
}

export function updateStudent(updatedStudent: StudentProfile): { success: boolean; error?: string } {
  const students = getStoredStudents();
  const index = students.findIndex((s) => s.id === updatedStudent.id);
  if (index === -1) {
    return { success: false, error: 'Student candidate record not found' };
  }

  students[index] = {
    ...students[index],
    ...updatedStudent,
  };
  saveStoredStudents(students);
  return { success: true };
}

export function registerStudentToExam(studentId: string, examId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return false;
  const student = getStoredStudents().find((item) => item.id === studentId);
  if (!student || (student.accessStatus && student.accessStatus !== 'active')) return false;
  if (!exam.registeredStudentIds) exam.registeredStudentIds = [];
  if (!exam.registeredStudentIds.includes(studentId)) {
    exam.registeredStudentIds.push(studentId);
    saveStoredExams(exams);
  }
  return true;
}

export function unregisterStudentFromExam(studentId: string, examId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || !exam.registeredStudentIds) return false;
  exam.registeredStudentIds = exam.registeredStudentIds.filter((id) => id !== studentId);
  saveStoredExams(exams);
  return true;
}

// Per-student single question assignment (Assign questions one by one)
export function assignQuestionToStudent(examId: string, studentId: string, questionId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return false;
  if (!exam.studentAssignedQuestions) {
    exam.studentAssignedQuestions = {};
  }
  const current = exam.studentAssignedQuestions[studentId] || [];
  if (!current.includes(questionId)) {
    exam.studentAssignedQuestions[studentId] = [...current, questionId];
    if (!exam.registeredStudentIds) exam.registeredStudentIds = [];
    if (!exam.registeredStudentIds.includes(studentId)) {
      exam.registeredStudentIds.push(studentId);
    }
    saveStoredExams(exams);
  }
  return true;
}

export function unassignQuestionFromStudent(examId: string, studentId: string, questionId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || !exam.studentAssignedQuestions) return false;
  const current = exam.studentAssignedQuestions[studentId] || [];
  exam.studentAssignedQuestions[studentId] = current.filter((qid) => qid !== questionId);
  saveStoredExams(exams);
  return true;
}

export function getStudentAssignedQuestions(examId: string, studentId: string): string[] {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || !exam.studentAssignedQuestions) return [];
  return exam.studentAssignedQuestions[studentId] || [];
}

export function toggleMarkingSchemeRelease(examId: string, released: boolean): { success: boolean; exam?: Exam } {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return { success: false };
  exam.isMarkingSchemeReleased = released;
  saveStoredExams(exams);
  return { success: true, exam };
}

// Student Admission Control for Exam Room
export function admitStudentToExam(examId: string, studentId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return false;
  if (!exam.admittedStudentIds) exam.admittedStudentIds = [];
  if (!exam.admittedStudentIds.includes(studentId)) {
    exam.admittedStudentIds.push(studentId);
    saveStoredExams(exams);
  }

  // Dispatch custom real-time event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('examguard_admission_updated', { detail: { examId, studentId } })
    );
  }

  return true;
}

export function admitAllStudentsToExam(examId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return false;
  const students = getStoredStudents();
  const targetIds = (exam.registeredStudentIds && exam.registeredStudentIds.length > 0)
    ? exam.registeredStudentIds
    : students.map((s) => s.id);

  exam.admittedStudentIds = Array.from(new Set([...(exam.admittedStudentIds || []), ...targetIds]));
  saveStoredExams(exams);

  // Dispatch custom real-time event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('examguard_admission_updated', { detail: { examId, all: true } })
    );
  }

  return true;
}

export function revokeStudentAdmission(examId: string, studentId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || !exam.admittedStudentIds) return false;
  exam.admittedStudentIds = exam.admittedStudentIds.filter((id) => id !== studentId);
  saveStoredExams(exams);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('examguard_admission_updated', { detail: { examId, studentId, revoked: true } })
    );
  }

  return true;
}

export function isStudentAdmittedToExam(examId: string, studentId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return false;
  return Boolean(exam.admittedStudentIds && exam.admittedStudentIds.includes(studentId));
}

// Waiting Room tracking
const STORAGE_WAITING_ROOM = 'examguard_waiting_room_v1';
export function registerStudentToWaitingRoom(examId: string, studentId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_WAITING_ROOM);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[examId]) map[examId] = [];
    if (!map[examId].includes(studentId)) {
      map[examId].push(studentId);
      localStorage.setItem(STORAGE_WAITING_ROOM, JSON.stringify(map));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('examguard_waiting_room_updated', { detail: { examId, studentId } })
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export function removeStudentFromWaitingRoom(examId: string, studentId: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_WAITING_ROOM);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    map[examId] = (map[examId] || []).filter((id) => id !== studentId);
    localStorage.setItem(STORAGE_WAITING_ROOM, JSON.stringify(map));
    window.dispatchEvent(
      new CustomEvent('examguard_waiting_room_updated', { detail: { examId, studentId } })
    );
  } catch (error) {
    console.error('Failed to remove candidate from the local waiting room:', error);
  }
}

export function getWaitingRoomStudents(examId: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_WAITING_ROOM);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    return map[examId] || [];
  } catch {
    return [];
  }
}

// Exam helpers
export function addExam(exam: Exam): Exam {
  const exams = getStoredExams();
  exams.unshift(exam);
  saveStoredExams(exams);

  // Ensure questions from this exam are populated in the question bank
  if (exam.questions && exam.questions.length > 0) {
    const questions = getStoredQuestions();
    let updated = false;
    exam.questions.forEach((q) => {
      if (!questions.some((existing) => existing.id === q.id)) {
        questions.unshift(q);
        updated = true;
      }
    });
    if (updated) {
      saveStoredQuestions(questions);
    }
  }

  return exam;
}

export function updateExam(updated: Exam): { success: boolean; error?: string } {
  const exams = getStoredExams();
  const index = exams.findIndex((e) => e.id === updated.id);
  if (index === -1) return { success: false, error: 'Exam not found' };

  // Strict rule: check if questions were altered when exam is locked
  const existing = exams[index];
  if (existing.isLockedForEdits && JSON.stringify(existing.questions) !== JSON.stringify(updated.questions)) {
    return {
      success: false,
      error: 'Questions cannot be modified once the examination has commenced or received submissions.',
    };
  }

  exams[index] = updated;
  saveStoredExams(exams);
  return { success: true };
}

export function deleteExam(examId: string): boolean {
  const exams = getStoredExams();
  const filtered = exams.filter((e) => e.id !== examId);
  saveStoredExams(filtered);
  return true;
}

// Question Bank helpers
export function addQuestion(question: Question): Question {
  const list = getStoredQuestions();
  list.unshift(question);
  saveStoredQuestions(list);
  return question;
}

export function updateQuestion(question: Question): void {
  const list = getStoredQuestions();
  const index = list.findIndex((q) => q.id === question.id);
  if (index !== -1) {
    list[index] = question;
    saveStoredQuestions(list);
  }
}

export function deleteQuestion(questionId: string): void {
  const list = getStoredQuestions();
  saveStoredQuestions(list.filter((q) => q.id !== questionId));
}

// Submission & Proctoring helpers
export function getStudentSubmission(examId: string, studentId: string): ExamSubmission | undefined {
  const subs = getStoredSubmissions();
  return subs.find((s) => s.examId === examId && s.studentId === studentId);
}

export function saveSubmission(submission: ExamSubmission): void {
  const subs = getStoredSubmissions();
  const index = subs.findIndex((s) => s.id === submission.id || (s.examId === submission.examId && s.studentId === submission.studentId));
  if (index !== -1) {
    subs[index] = submission;
  } else {
    subs.unshift(submission);
  }
  saveStoredSubmissions(subs);

  // If a student starts an exam, lock the exam questions from further modifications
  const exams = getStoredExams();
  const examIndex = exams.findIndex((e) => e.id === submission.examId);
  if (examIndex !== -1 && !exams[examIndex].isLockedForEdits) {
    exams[examIndex].isLockedForEdits = true;
    saveStoredExams(exams);
  }

  // Real-time broadcast for gradebook, submissions, and admissions updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_submissions_updated', { detail: { submission } }));
    window.dispatchEvent(new CustomEvent('examguard_admissions_updated', { detail: { examId: submission.examId, studentId: submission.studentId, status: submission.status } }));
  }
}

export function addProctorIncidentToSubmission(examId: string, studentId: string, incident: ProctorIncident): void {
  const subs = getStoredSubmissions();
  const sub = subs.find((s) => s.examId === examId && s.studentId === studentId);
  if (sub) {
    sub.incidents = sub.incidents || [];
    sub.incidents.unshift(incident);
    // Deduct integrity score appropriately
    const penalty = incident.severity === 'high' ? 12 : incident.severity === 'medium' ? 6 : 2;
    sub.integrityScore = Math.max(0, (sub.integrityScore ?? 100) - penalty);
    saveStoredSubmissions(subs);
  }
}

// Analytics calculations
export interface StudentAnalyticsReport {
  student: StudentProfile;
  totalExamsTaken: number;
  averageScorePercentage: number;
  averageIntegrityScore: number;
  totalIncidentsFlagged: number;
  topicMastery: Record<string, { totalPossible: number; earned: number; percentage: number }>;
  examHistory: {
    examId: string;
    examTitle: string;
    date: string;
    score: number;
    total: number;
    percentage: number;
    integrityScore: number;
    status: string;
  }[];
  timeEfficiency: {
    averageSecondsPerQuestion: number;
    fastestAnswerSeconds: number;
    longestAnswerSeconds: number;
  };
}

export function calculateStudentAnalytics(studentId: string): StudentAnalyticsReport | null {
  const students = getStoredStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return null;

  const exams = getStoredExams();
  const submissions = getStoredSubmissions().filter((s) => s.studentId === studentId);

  const topicMastery: Record<string, { totalPossible: number; earned: number; percentage: number }> = {};
  const examHistory: StudentAnalyticsReport['examHistory'] = [];
  let totalTimeSpent = 0;
  let totalQuestionsAnswered = 0;
  let fastest = 999999;
  let longest = 0;
  let totalIntegritySum = 0;
  let totalPercentageSum = 0;
  let totalIncidents = 0;

  submissions.forEach((sub) => {
    const exam = exams.find((e) => e.id === sub.examId);
    const examTitle = exam ? exam.title : 'Examination';
    const total = sub.totalPoints || 100;
    const score = sub.score || 0;
    const percentage = sub.percentage ?? Math.round((score / total) * 100);

    totalIntegritySum += sub.integrityScore ?? 100;
    totalPercentageSum += percentage;
    totalIncidents += (sub.incidents || []).length;

    examHistory.push({
      examId: sub.examId,
      examTitle,
      date: sub.submittedAt || sub.startedAt,
      score,
      total,
      percentage,
      integrityScore: sub.integrityScore ?? 100,
      status: sub.status,
    });

    // Topic mastery
    if (exam) {
      exam.questions.forEach((q) => {
        const topic = q.topic || 'General';
        if (!topicMastery[topic]) {
          topicMastery[topic] = { totalPossible: 0, earned: 0, percentage: 0 };
        }
        topicMastery[topic].totalPossible += q.points;
        const answer = sub.answers?.[q.id];
        if (answer) {
          totalQuestionsAnswered++;
          const t = answer.timeSpentSeconds || 30;
          totalTimeSpent += t;
          if (t < fastest) fastest = t;
          if (t > longest) longest = t;
          if (answer.awardedPoints != null) {
            topicMastery[topic].earned += answer.awardedPoints;
          }
        }
      });
    }
  });

  // finalize topic percentages
  Object.keys(topicMastery).forEach((topic) => {
    const item = topicMastery[topic];
    item.percentage = item.totalPossible > 0 ? Math.round((item.earned / item.totalPossible) * 100) : 0;
  });

  const count = submissions.length || 1;

  return {
    student,
    totalExamsTaken: submissions.length,
    averageScorePercentage: Math.round(totalPercentageSum / count),
    averageIntegrityScore: Math.round(totalIntegritySum / count),
    totalIncidentsFlagged: totalIncidents,
    topicMastery,
    examHistory,
    timeEfficiency: {
      averageSecondsPerQuestion: totalQuestionsAnswered > 0 ? Math.round(totalTimeSpent / totalQuestionsAnswered) : 45,
      fastestAnswerSeconds: fastest === 999999 ? 20 : fastest,
      longestAnswerSeconds: longest || 180,
    },
  };
}

// Manual Marking Override with Mandatory Justification Reason
export function overrideQuestionMark(
  submissionId: string,
  questionId: string,
  newPoints: number,
  reason: string,
  instructorName: string
): { success: boolean; error?: string; updatedSubmission?: ExamSubmission } {
  if (!reason || !reason.trim()) {
    return {
      success: false,
      error: 'Institutional integrity rule: A valid justification reason is mandatory to override awarded marks.',
    };
  }

  const subs = getStoredSubmissions();
  const sub = subs.find((s) => s.id === submissionId);
  if (!sub) return { success: false, error: 'Submission not found' };
  if (sub.isResultCommitted) {
    return {
      success: false,
      error: 'This result is committed. Submit a written mark-change request for Super Admin approval.',
    };
  }

  if (!sub.answers[questionId]) {
    sub.answers[questionId] = {
      questionId,
      timeSpentSeconds: 0,
      isFlaggedForReview: false,
    };
  }

  const ans = sub.answers[questionId];
  const original = ans.awardedPoints ?? 0;

  ans.originalScore = ans.originalScore ?? original;
  ans.awardedPoints = newPoints;
  ans.isOverridden = true;
  ans.overrideReason = reason.trim();
  ans.overriddenBy = instructorName;
  ans.overriddenAt = new Date().toISOString();
  ans.overrideStatus = 'pending_admin_review';
  ans.isGraded = true;

  // Recalculate total submission score
  let totalScore = 0;
  Object.values(sub.answers).forEach((a) => {
    if (a.awardedPoints != null) {
      totalScore += a.awardedPoints;
    }
  });

  sub.score = totalScore;
  sub.percentage = sub.totalPoints ? Math.round((totalScore / sub.totalPoints) * 100) : sub.percentage;
  sub.status = 'graded';

  saveStoredSubmissions(subs);
  return { success: true, updatedSubmission: sub };
}

// Commit Submission Result to Student Portal (Allows teacher to officially release result)
export function commitSubmissionResult(
  submissionId: string,
  instructorName = 'Faculty Invigilator'
): Promise<{ success: boolean; error?: string; updatedSubmission?: ExamSubmission }> {
  const subs = getStoredSubmissions();
  const sub = subs.find((s) => s.id === submissionId);
  if (!sub) return Promise.resolve({ success: false, error: 'Submission record not found.' });
  if (sub.isResultCommitted) {
    return Promise.resolve({ success: true, updatedSubmission: sub });
  }
  if (sub.status !== 'graded' && sub.status !== 'submitted') {
    return Promise.resolve({ success: false, error: 'Only submitted or graded results can be committed.' });
  }
  const exam = getStoredExams().find((item) => item.id === sub.examId);
  const score = sub.score ?? 0;
  const totalPoints =
    sub.totalPoints ?? exam?.questions.reduce((sum, question) => sum + question.points, 0) ?? 0;
  const percentage =
    sub.percentage ??
    (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);

  return fetch(`/api/submissions/${encodeURIComponent(submissionId)}/commit-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instructorName,
      score,
      totalPoints,
      percentage,
    }),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Backend commit failed (${response.status}).`);
      }
      sub.isResultCommitted = true;
      sub.committedAt = result.data?.committedAt || new Date().toISOString();
      sub.committedBy = instructorName;
      saveStoredSubmissions(subs);
      return { success: true, updatedSubmission: sub };
    })
    .catch((error: unknown) => ({
      success: false,
      error: error instanceof Error ? error.message : 'Could not commit this result.',
    }));
}

// Bulk Commit All Exam Results to Student Portal
export function commitAllExamResults(
  examId: string,
  instructorName = 'Faculty Invigilator'
): Promise<{ success: boolean; count: number; error?: string }> {
  const subs = getStoredSubmissions();
  const eligible = subs.filter(
    (submission) =>
      submission.examId === examId &&
      !submission.isResultCommitted &&
      (submission.status === 'submitted' || submission.status === 'graded')
  );
  if (eligible.length === 0) return Promise.resolve({ success: true, count: 0 });
  const exam = getStoredExams().find((item) => item.id === examId);

  return fetch(`/api/exams/${encodeURIComponent(examId)}/commit-results`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instructorName,
      submissions: eligible.map((submission) => {
        const score = submission.score ?? 0;
        const totalPoints =
          submission.totalPoints ??
          exam?.questions.reduce((sum, question) => sum + question.points, 0) ??
          0;
        return {
          submissionId: submission.id,
          score,
          totalPoints,
          percentage:
            submission.percentage ??
            (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0),
        };
      }),
    }),
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Backend bulk commit failed (${response.status}).`);
      }
      const committedAt = result.data?.committedAt || new Date().toISOString();
      eligible.forEach((submission) => {
        submission.isResultCommitted = true;
        submission.committedAt = committedAt;
        submission.committedBy = instructorName;
      });
      saveStoredSubmissions(subs);
      return { success: true, count: eligible.length };
    })
    .catch((error: unknown) => ({
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Could not commit exam results.',
    }));
}

// Student Attempts Checker
export function getStudentAttemptCount(examId: string, studentId: string): number {
  const subs = getStoredSubmissions();
  return subs.filter(
    (s) => s.examId === examId && s.studentId === studentId && (s.status === 'submitted' || s.status === 'graded')
  ).length;
}

export function hasExceededAttempts(exam: Exam, studentId: string): boolean {
  const attempts = getStudentAttemptCount(exam.id, studentId);
  return attempts >= (exam.maxAttempts || 1);
}

/**
 * Enforces rule: "A Student cannot take more than one examination at ago within the same period."
 * Returns details of the existing active examination if student currently has one in progress.
 */
export function getActiveInProgressExamForStudent(
  studentId: string,
  excludeExamId?: string
): { examId: string; courseCode: string; examTitle: string } | null {
  const subs = getStoredSubmissions();
  const exams = getStoredExams();
  
  const activeSub = subs.find(
    (s) => s.studentId === studentId && s.status === 'in_progress' && (!excludeExamId || s.examId !== excludeExamId)
  );

  if (!activeSub) return null;

  const exam = exams.find((e) => e.id === activeSub.examId);
  return {
    examId: activeSub.examId,
    courseCode: exam?.courseCode || 'EXAM',
    examTitle: exam?.title || 'Active Examination',
  };
}

// -------------------------------------------------------------
// TEACHER REGISTRATION & ACCESS MANAGEMENT (SUPER ADMIN)
// -------------------------------------------------------------
export function getStoredTeachers(): TeacherProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TEACHERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
      return INITIAL_TEACHERS;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed) || parsed.length === 0) return INITIAL_TEACHERS;
    return parsed.map((t: TeacherProfile) => ({
      ...t,
      rights: t.rights || {
        canCreateExams: t.accessStatus === 'active',
        canGradeMarks: t.accessStatus === 'active',
        canAdmitStudents: t.accessStatus === 'active',
        canDeleteExams: false,
        canExportSubmissions: t.accessStatus === 'active',
      },
    }));
  } catch {
    return INITIAL_TEACHERS;
  }
}

export function saveStoredTeachers(teachers: TeacherProfile[]): void {
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(teachers));
}

export function addTeacher(newTeacher: TeacherProfile): { success: boolean; teacher?: TeacherProfile; error?: string } {
  const teachers = getStoredTeachers();
  const existing = teachers.find((t) => t.email.toLowerCase() === newTeacher.email.toLowerCase());
  if (existing) {
    return { success: false, error: `A faculty member with email "${newTeacher.email}" already exists.` };
  }
  const teacherWithRights: TeacherProfile = {
    ...newTeacher,
    rights: newTeacher.rights || {
      canCreateExams: newTeacher.accessStatus === 'active',
      canGradeMarks: newTeacher.accessStatus === 'active',
      canAdmitStudents: newTeacher.accessStatus === 'active',
      canDeleteExams: false,
      canExportSubmissions: newTeacher.accessStatus === 'active',
    },
  };
  const updated = [teacherWithRights, ...teachers];
  saveStoredTeachers(updated);
  return { success: true, teacher: teacherWithRights };
}

export function updateTeacher(updatedTeacher: TeacherProfile): { success: boolean; error?: string } {
  const teachers = getStoredTeachers();
  const index = teachers.findIndex((t) => t.id === updatedTeacher.id);
  if (index === -1) return { success: false, error: 'Teacher not found' };

  teachers[index] = {
    ...teachers[index],
    ...updatedTeacher,
    rights: updatedTeacher.rights || teachers[index].rights || {
      canCreateExams: updatedTeacher.accessStatus === 'active',
      canGradeMarks: updatedTeacher.accessStatus === 'active',
      canAdmitStudents: updatedTeacher.accessStatus === 'active',
      canDeleteExams: false,
      canExportSubmissions: updatedTeacher.accessStatus === 'active',
    },
  };
  saveStoredTeachers(teachers);
  return { success: true };
}

export function deleteTeacher(teacherId: string): { success: boolean; error?: string } {
  const teachers = getStoredTeachers();
  const filtered = teachers.filter((t) => t.id !== teacherId);
  if (filtered.length === teachers.length) {
    return { success: false, error: 'Teacher profile not found' };
  }
  saveStoredTeachers(filtered);
  return { success: true };
}

export function deleteStudent(studentId: string): boolean {
  const students = getStoredStudents();
  const filtered = students.filter((s) => s.id !== studentId);
  saveStoredStudents(filtered);

  // Also remove student from any registered exams
  const exams = getStoredExams();
  let examModified = false;
  exams.forEach((ex) => {
    if (ex.registeredStudentIds?.includes(studentId)) {
      ex.registeredStudentIds = ex.registeredStudentIds.filter((id) => id !== studentId);
      examModified = true;
    }
    if (ex.admittedStudentIds?.includes(studentId)) {
      ex.admittedStudentIds = ex.admittedStudentIds.filter((id) => id !== studentId);
      examModified = true;
    }
  });
  if (examModified) {
    saveStoredExams(exams);
  }
  return true;
}

export function updateTeacherAccess(
  teacherId: string,
  status: 'active' | 'pending' | 'suspended'
): boolean {
  const teachers = getStoredTeachers();
  const index = teachers.findIndex((t) => t.id === teacherId);
  if (index === -1) return false;
  teachers[index].accessStatus = status;
  saveStoredTeachers(teachers);
  return true;
}

// Super Admin Mark Override Audit Action
export function reviewMarkOverride(
  submissionId: string,
  questionId: string,
  action: 'approve' | 'decline' | 'enquiry',
  note: string,
  adminName = 'Super Administrator'
): { success: boolean; error?: string; updatedSubmission?: ExamSubmission } {
  const subs = getStoredSubmissions();
  const sub = subs.find((s) => s.id === submissionId);
  if (!sub || !sub.answers[questionId]) {
    return { success: false, error: 'Submission or question answer record not found.' };
  }

  const ans = sub.answers[questionId];
  const now = new Date().toISOString();

  if (action === 'approve') {
    ans.overrideStatus = 'approved';
    ans.adminDecisionReason = note.trim() || 'Approved by Institutional Super Admin.';
    ans.adminReviewedBy = adminName;
    ans.adminReviewedAt = now;
  } else if (action === 'decline') {
    ans.overrideStatus = 'declined';
    ans.adminDecisionReason = note.trim() || 'Mark override declined by Institutional Super Admin.';
    ans.adminReviewedBy = adminName;
    ans.adminReviewedAt = now;

    // REVERT score back to original score!
    if (ans.originalScore !== undefined) {
      ans.awardedPoints = ans.originalScore;
    }

    // Recalculate total score
    let totalScore = 0;
    Object.values(sub.answers).forEach((a) => {
      if (a.awardedPoints != null) {
        totalScore += a.awardedPoints;
      }
    });
    sub.score = totalScore;
    sub.percentage = sub.totalPoints ? Math.round((totalScore / sub.totalPoints) * 100) : sub.percentage;
  } else if (action === 'enquiry') {
    ans.overrideStatus = 'pending_admin_review';
    ans.adminEnquirySent = note.trim();
    ans.adminReviewedBy = adminName;
    ans.adminReviewedAt = now;

    // Automatically file a high-priority help/audit inquiry ticket so instructor receives it
    const newTicket: HelpTicket = {
      id: `ENQ-${Date.now().toString().slice(-4)}`,
      userId: ans.overriddenBy || 'teacher',
      userName: ans.overriddenBy || 'Faculty Invigilator',
      userEmail: 'faculty@university.edu',
      userRole: 'teacher',
      category: 'grading_appeal',
      severity: 'high',
      subject: `Admin Mark Modification Inquiry: Question ${questionId} in Sub ${submissionId}`,
      message: `Super Admin Directorate Enquiry: ${note.trim()}. Original Score: ${ans.originalScore}, Modified: ${ans.awardedPoints}. Justification was: "${ans.overrideReason}". Please provide detailed clarification.`,
      status: 'open',
      createdAt: now,
    };
    const tickets = getStoredHelpTickets();
    saveStoredHelpTickets([newTicket, ...tickets]);
  }

  saveStoredSubmissions(subs);
  return { success: true, updatedSubmission: sub };
}

// -------------------------------------------------------------
// HELP TICKETS MANAGEMENT
// -------------------------------------------------------------
export function getStoredHelpTickets(): HelpTicket[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HELP_TICKETS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(INITIAL_HELP_TICKETS));
      return INITIAL_HELP_TICKETS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_HELP_TICKETS;
  } catch {
    return INITIAL_HELP_TICKETS;
  }
}

export function saveStoredHelpTickets(tickets: HelpTicket[]): void {
  localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(tickets));
}

export function addHelpTicket(ticket: HelpTicket): HelpTicket {
  const tickets = getStoredHelpTickets();
  const updated = [ticket, ...tickets];
  saveStoredHelpTickets(updated);
  return ticket;
}

export function resolveHelpTicket(ticketId: string, adminReply: string): boolean {
  const tickets = getStoredHelpTickets();
  const index = tickets.findIndex((t) => t.id === ticketId);
  if (index === -1) return false;
  tickets[index].status = 'resolved';
  tickets[index].adminReply = adminReply;
  tickets[index].resolvedAt = new Date().toISOString();
  saveStoredHelpTickets(tickets);
  return true;
}

// -------------------------------------------------------------
// THEME / DISPLAY MODE MANAGEMENT
// -------------------------------------------------------------
export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export function saveStoredTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEYS.THEME_MODE, theme);
}

// -------------------------------------------------------------
// MANUAL EXAM MARKING / GRADING WORKFLOW
// -------------------------------------------------------------
export function manualGradeFullSubmission(
  submissionId: string,
  questionGrades: Record<string, { awardedPoints: number; feedback?: string }>,
  overallRemarks?: string,
  instructorName = 'Faculty Invigilator'
): { success: boolean; submission?: ExamSubmission; error?: string } {
  const subs = getStoredSubmissions();
  const sub = subs.find((s) => s.id === submissionId);
  if (!sub) return { success: false, error: 'Submission record not found.' };
  if (sub.isResultCommitted) {
    return {
      success: false,
      error: 'This result is committed. Submit a written mark-change request for Super Admin approval.',
    };
  }

  let totalScore = 0;
  Object.entries(questionGrades).forEach(([qId, grade]) => {
    if (!sub.answers[qId]) {
      sub.answers[qId] = {
        questionId: qId,
        timeSpentSeconds: 0,
        isFlaggedForReview: false,
      };
    }
    const ans = sub.answers[qId];
    ans.originalScore = ans.originalScore ?? ans.awardedPoints ?? 0;
    ans.awardedPoints = grade.awardedPoints;
    ans.teacherFeedback = grade.feedback || ans.teacherFeedback;
    ans.isGraded = true;
    ans.isOverridden = true;
    ans.overriddenBy = instructorName;
    ans.overriddenAt = new Date().toISOString();
    ans.overrideReason = overallRemarks || 'Official manual evaluation by course instructor.';
  });

  // Calculate final score
  Object.values(sub.answers).forEach((a) => {
    if (a.awardedPoints != null) {
      totalScore += a.awardedPoints;
    }
  });

  sub.score = totalScore;
  sub.percentage = sub.totalPoints ? Math.round((totalScore / sub.totalPoints) * 100) : sub.percentage;
  sub.status = 'graded';

  saveStoredSubmissions(subs);
  return { success: true, submission: sub };
}

export function requestCommittedMarkChange(
  submissionId: string,
  questionGrades: Record<string, { awardedPoints: number; feedback?: string }>,
  explanation: string,
  instructorName: string
): { success: boolean; error?: string } {
  if (!explanation.trim()) {
    return { success: false, error: 'A written explanation is required for a committed-mark change request.' };
  }
  const subs = getStoredSubmissions();
  const sub = subs.find((submission) => submission.id === submissionId);
  if (!sub) return { success: false, error: 'Submission record not found.' };
  if (!sub.isResultCommitted) {
    return { success: false, error: 'This result is not committed; use the normal grading workflow.' };
  }
  if (sub.committedMarkChangeRequest?.status === 'pending_admin_approval') {
    return { success: false, error: 'A mark-change request is already awaiting Super Admin review.' };
  }
  const exam = getStoredExams().find((item) => item.id === sub.examId);
  if (
    Object.values(questionGrades).some(
      (grade) => !Number.isFinite(grade.awardedPoints) || grade.awardedPoints < 0
    ) ||
    Object.entries(questionGrades).some(([questionId, grade]) => {
      const question = exam?.questions.find((item) => item.id === questionId);
      return question ? grade.awardedPoints > question.points : true;
    })
  ) {
    return { success: false, error: 'Proposed marks must be valid and cannot exceed each question’s maximum.' };
  }

  const proposedScore = Object.values(questionGrades).reduce(
    (total, grade) => total + grade.awardedPoints,
    0
  );
  sub.committedMarkChangeRequest = {
    id: `mark-change-${Date.now()}`,
    requestedBy: instructorName,
    requestedAt: new Date().toISOString(),
    previousScore: sub.score ?? 0,
    proposedScore,
    explanation: explanation.trim(),
    status: 'pending_admin_approval',
    previousQuestionGrades: JSON.parse(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(sub.answers).map(([questionId, answer]) => [
            questionId,
            { awardedPoints: answer.awardedPoints ?? 0, feedback: answer.teacherFeedback },
          ])
        )
      )
    ),
    proposedQuestionGrades: JSON.parse(JSON.stringify(questionGrades)),
  };
  saveStoredSubmissions(subs);
  return { success: true };
}

export async function reviewCommittedMarkChange(
  submissionId: string,
  action: 'approve' | 'reject',
  adminReviewNote: string,
  adminName: string,
  approvedGrades?: Record<string, { awardedPoints: number; feedback?: string }>
): Promise<{ success: boolean; error?: string; updatedSubmission?: ExamSubmission }> {
  if (!adminReviewNote.trim()) {
    return { success: false, error: 'A written Super Admin decision note is required.' };
  }
  const subs = getStoredSubmissions();
  const sub = subs.find((submission) => submission.id === submissionId);
  const changeRequest = sub?.committedMarkChangeRequest;
  if (!sub || !changeRequest) {
    return { success: false, error: 'Committed result change request not found.' };
  }
  if (!sub.isResultCommitted) {
    return { success: false, error: 'The result is not committed and cannot use this review workflow.' };
  }
  if (changeRequest.status !== 'pending_admin_approval') {
    return { success: false, error: 'This committed result change request has already been reviewed.' };
  }

  const now = new Date().toISOString();
  if (action === 'approve') {
    const grades = approvedGrades || changeRequest.proposedQuestionGrades;
    const exam = getStoredExams().find((item) => item.id === sub.examId);
    if (
      !grades ||
      Object.values(grades).some((grade) => !Number.isFinite(grade.awardedPoints) || grade.awardedPoints < 0) ||
      Object.entries(grades).some(([questionId, grade]) => {
        const question = exam?.questions.find((item) => item.id === questionId);
        return question ? grade.awardedPoints > question.points : true;
      })
    ) {
      return { success: false, error: 'Approved marks must be valid and cannot exceed each question’s maximum.' };
    }
    Object.entries(grades).forEach(([questionId, grade]) => {
      const answer = sub.answers[questionId] || {
        questionId,
        timeSpentSeconds: 0,
        isFlaggedForReview: false,
      };
      answer.originalScore = answer.originalScore ?? answer.awardedPoints ?? 0;
      answer.awardedPoints = grade.awardedPoints;
      answer.teacherFeedback = grade.feedback ?? answer.teacherFeedback;
      answer.isGraded = true;
      answer.isOverridden = true;
      answer.overrideReason = changeRequest.explanation;
      answer.overriddenBy = changeRequest.requestedBy;
      answer.overriddenAt = changeRequest.requestedAt;
      answer.overrideStatus = 'approved';
      answer.adminDecisionReason = adminReviewNote.trim();
      answer.adminReviewedBy = adminName;
      answer.adminReviewedAt = now;
      sub.answers[questionId] = answer;
    });
    sub.score = Object.values(sub.answers).reduce(
      (sum, answer) => sum + (answer.awardedPoints ?? 0),
      0
    );
    sub.totalPoints =
      sub.totalPoints ?? exam?.questions.reduce((sum, question) => sum + question.points, 0);
    sub.percentage = sub.totalPoints
      ? Math.round((sub.score / sub.totalPoints) * 100)
      : sub.percentage;
    sub.status = 'graded';
    changeRequest.proposedScore = sub.score;
    changeRequest.reviewedQuestionGrades = JSON.parse(JSON.stringify(grades));
    changeRequest.status = 'approved';
  } else {
    changeRequest.status = 'rejected';
  }
  changeRequest.adminReviewNote = adminReviewNote.trim();
  changeRequest.reviewedAt = now;
  changeRequest.reviewedBy = adminName;
  const currentExam = getStoredExams().find((item) => item.id === sub.examId);
  const totalPoints =
    sub.totalPoints ??
    currentExam?.questions.reduce((sum, question) => sum + question.points, 0) ??
    0;
  const score = sub.score ?? 0;
  const percentage =
    sub.percentage ?? (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);
  try {
    const response = await fetch(
      `/api/submissions/${encodeURIComponent(submissionId)}/committed-mark-review`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: changeRequest.id,
          action,
          reviewedBy: adminName,
          note: adminReviewNote.trim(),
          score,
          totalPoints,
          percentage,
        }),
      }
    );
    const result = await response.json();
    if (!response.ok || !result?.success) {
      return {
        success: false,
        error: result?.error || `Backend review sync failed (${response.status}).`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not sync the Super Admin decision.',
    };
  }
  saveStoredSubmissions(subs);
  return { success: true, updatedSubmission: sub };
}

export function resetToDefaults(): void {
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTION_BANK));
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
  localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(INITIAL_HELP_TICKETS));
}
