import { Exam, Question, ExamSubmission, ProctorIncident, StudentProfile, TeacherProfile, HelpTicket, ThemeMode, Course, AuthUser, MissedExamRecord, ResitRequest, ExamAttendanceSummary, AcademicRecord } from '../types';
import { INITIAL_EXAMS, INITIAL_QUESTION_BANK, INITIAL_SUBMISSIONS, INITIAL_STUDENTS, CURRENT_TEACHER, INITIAL_TEACHERS, INITIAL_HELP_TICKETS, INITIAL_COURSES, SUPER_ADMIN, INITIAL_MISSED_EXAMS, INITIAL_RESIT_REQUESTS } from '../data/mockData';
import { triggerFlash } from '../components/common/FlashMessage';

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
  MISSED_EXAMS: 'examguard_missed_exams_v1',
  RESIT_REQUESTS: 'examguard_resit_requests_v1',
  ACADEMIC_DATABASE: 'examguard_academic_database_v2',
};

/**
 * Safe localStorage setter with QuotaExceededError protection and fallback handling.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.code === 1014) {
      console.warn(`[ExamGuard Pro] localStorage quota exceeded on key "${key}". Performing memory recovery...`);
      try {
        localStorage.removeItem('examguard_temp_cache');
        localStorage.removeItem('examguard_proctor_snapshots_cache');
        localStorage.setItem(key, value);
        return true;
      } catch (innerErr) {
        console.error(`[ExamGuard Pro] Critical: Storage full, could not persist key "${key}":`, innerErr);
        return false;
      }
    }
    console.error(`[ExamGuard Pro] Storage error on key "${key}":`, err);
    return false;
  }
}

/**
 * Uploads a document or photo file to the backend server.
 * Returns the hosted URL (/uploads/...), filename, and metadata.
 * If offline or backend is unreachable, gracefully falls back to a base64 Data URL.
 */
export async function uploadFileToServer(file: File): Promise<{
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: dataUrl,
            fileType: file.type || 'application/octet-stream',
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.url) {
            resolve({
              url: result.url,
              fileName: result.fileName || file.name,
              fileSize: result.size || file.size,
              fileType: result.fileType || file.type || 'application/octet-stream',
            });
            return;
          }
        }
      } catch (networkErr) {
        console.warn('[ExamGuard Pro] Upload API offline or failed, falling back to local Data URL:', networkErr);
      }

      // Safe fallback to base64 Data URL
      resolve({
        url: dataUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => {
      resolve({
        url: '',
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || 'application/octet-stream',
      });
    };
    reader.readAsDataURL(file);
  });
}

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
  safeLocalStorageSet(STORAGE_KEYS.TEACHER_PASSWORDS, JSON.stringify(passwords));
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
  safeLocalStorageSet(STORAGE_KEYS.ACCOUNT_PASSWORDS, JSON.stringify(passwords));
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

const syncChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('examguard_realtime_sync')
    : null;

export function broadcastSync(eventType: string, payload?: any): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventType, { detail: payload }));
    window.dispatchEvent(new CustomEvent('examguard_state_sync', { detail: { eventType, payload } }));
    if (syncChannel) {
      try {
        syncChannel.postMessage({ eventType, payload, timestamp: Date.now() });
      } catch (e) {
        console.warn('BroadcastChannel sync error:', e);
      }
    }
  }
}

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.eventType && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(event.data.eventType, { detail: event.data.payload }));
      window.dispatchEvent(new CustomEvent('examguard_state_sync', { detail: event.data }));
    }
  };
}

// Server-Sent Events listener for cross-browser & cross-device real-time synchronization
if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
  try {
    const sse = new EventSource('/api/realtime/stream');
    sse.addEventListener('admission_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        const exams = getStoredExams();
        const exam = exams.find((x) => x.id === data.examId);
        if (exam) {
          if (!exam.admittedStudentIds) exam.admittedStudentIds = [];
          let changed = false;
          if (data.admitted) {
            if (data.all && Array.isArray(data.studentIds)) {
              data.studentIds.forEach((sid: string) => {
                if (!exam.admittedStudentIds!.includes(sid)) {
                  exam.admittedStudentIds!.push(sid);
                  changed = true;
                }
              });
            } else if (data.studentId && !exam.admittedStudentIds.includes(data.studentId)) {
              exam.admittedStudentIds.push(data.studentId);
              changed = true;
            }
          } else if (data.revoked && data.studentId) {
            if (exam.admittedStudentIds.includes(data.studentId)) {
              exam.admittedStudentIds = exam.admittedStudentIds.filter((id) => id !== data.studentId);
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
            window.dispatchEvent(new CustomEvent('examguard_admission_updated', { detail: data }));
          }
        }
      } catch {}
    });

    sse.addEventListener('waiting_room_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        window.dispatchEvent(new CustomEvent('examguard_waiting_room_updated', { detail: data }));
      } catch {}
    });
  } catch (err) {
    console.warn('[SSE] Real-time event stream fallback:', err);
  }
}

export function saveStoredExams(exams: Exam[]): void {
  safeLocalStorageSet(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  broadcastSync('examguard_exams_updated', { exams });
}

export function getStoredQuestions(): Question[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!data) {
      safeLocalStorageSet(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTION_BANK));
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
  safeLocalStorageSet(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  broadcastSync('examguard_questions_updated', { questions });
}

export function getStoredSubmissions(): ExamSubmission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
    let subs: ExamSubmission[] = data ? JSON.parse(data) : INITIAL_SUBMISSIONS;
    if (!data) {
      safeLocalStorageSet(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
      return INITIAL_SUBMISSIONS;
    }

    // Enforce SEB continuous sitting: if an in-progress exam exceeded its duration,
    // it was abandoned and cannot be resumed at a later time. Auto-transition to submitted.
    let modified = false;
    const now = Date.now();
    const exams = getStoredExams();
    subs = subs.map((s) => {
      if (s.status === 'in_progress' && s.startedAt) {
        const exam = exams.find((e) => e.id === s.examId);
        const durationMinutes = exam?.durationMinutes || 60;
        const elapsedMs = now - new Date(s.startedAt).getTime();
        if (elapsedMs >= durationMinutes * 60 * 1000) {
          modified = true;
          return {
            ...s,
            status: 'submitted',
            submittedAt: new Date(new Date(s.startedAt).getTime() + durationMinutes * 60 * 1000).toISOString(),
            isExamPaused: false,
            pauseReason: undefined,
          };
        }
      }
      return s;
    });

    if (modified) {
      safeLocalStorageSet(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs));
    }

    return subs;
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveStoredSubmissions(submissions: ExamSubmission[]): void {
  safeLocalStorageSet(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  broadcastSync('examguard_submissions_updated', { submissions });
}

export function getStoredStudents(): StudentProfile[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!data) {
      safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
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
  safeLocalStorageSet(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  broadcastSync('examguard_students_updated', { students });
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

  // If specific exams were selected, also register candidate into those exams after validating missed exam block
  if (enrolledExamIds.length > 0) {
    const exams = getStoredExams();
    exams.forEach((ex) => {
      if (enrolledExamIds.includes(ex.id) || enrolledExamIds.includes(ex.courseCode)) {
        const blockCheck = checkMissedExamRegistrationBlock(newStudent.studentNumber, ex.courseCode, ex.title);
        if (!blockCheck.isBlocked) {
          if (!ex.registeredStudentIds) ex.registeredStudentIds = [];
          if (!ex.registeredStudentIds.includes(newStudent.id)) {
            ex.registeredStudentIds.push(newStudent.id);
          }
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

export function registerStudentToExamWithValidation(
  studentId: string,
  examId: string
): { success: boolean; error?: string } {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId || e.courseCode === examId);
  if (!exam) return { success: false, error: 'Examination not found.' };
  const student = getStoredStudents().find(
    (item) => item.id === studentId || normalizeAdmission(item.studentNumber) === normalizeAdmission(studentId)
  );
  if (!student || (student.accessStatus && student.accessStatus !== 'active')) {
    return { success: false, error: 'Student candidate profile is inactive or not found.' };
  }

  // Check if candidate previously missed this examination based on Student Admission number, Examination code, and Title
  const blockCheck = checkMissedExamRegistrationBlock(student.studentNumber, exam.courseCode, exam.title);
  if (blockCheck.isBlocked) {
    const statusNote = blockCheck.resitRequest?.status === 'pending'
      ? 'Resit clearance request is currently pending Administrator review.'
      : 'No approved Administrator clearance on record.';
    triggerFlash({
      type: 'error',
      text: 'Candidate Registration Rejected',
      subtext: `Candidate ${student.name} (${student.studentNumber}) missed ${exam.courseCode}. Resit application & Admin approval required before re-registration.`,
    });
    return {
      success: false,
      error: `Re-registration Blocked: Candidate (Admission: ${student.studentNumber}) was previously registered to sit examination [Code: ${exam.courseCode} | Title: "${exam.title}"] but missed the session. ${statusNote} Student must apply for a resit and wait for approval from the Admin Directorate.`,
    };
  }

  if (!exam.registeredStudentIds) exam.registeredStudentIds = [];
  if (!exam.registeredStudentIds.includes(student.id)) {
    exam.registeredStudentIds.push(student.id);
    saveStoredExams(exams);
  }
  triggerFlash({
    type: 'success',
    text: 'Candidate Enrolled Successfully',
    subtext: `${student.name} (${student.studentNumber}) registered for ${exam.courseCode}.`,
  });
  return { success: true };
}

export function registerStudentToExam(studentId: string, examId: string): boolean {
  return registerStudentToExamWithValidation(studentId, examId).success;
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

// -------------------------------------------------------------
// MISSED EXAMINATIONS & RESIT CLEARANCES MANAGEMENT
// -------------------------------------------------------------
export function getStoredMissedExams(): MissedExamRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MISSED_EXAMS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.MISSED_EXAMS, JSON.stringify(INITIAL_MISSED_EXAMS));
      return INITIAL_MISSED_EXAMS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_MISSED_EXAMS;
  } catch {
    return INITIAL_MISSED_EXAMS;
  }
}

export function saveStoredMissedExams(records: MissedExamRecord[]): void {
  safeLocalStorageSet(STORAGE_KEYS.MISSED_EXAMS, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_missed_exams_updated', { detail: { records } }));
  }
}

export function getStoredResitRequests(): ResitRequest[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RESIT_REQUESTS);
    if (!data) {
      safeLocalStorageSet(STORAGE_KEYS.RESIT_REQUESTS, JSON.stringify(INITIAL_RESIT_REQUESTS));
      return INITIAL_RESIT_REQUESTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_RESIT_REQUESTS;
  } catch {
    return INITIAL_RESIT_REQUESTS;
  }
}

export function saveStoredResitRequests(requests: ResitRequest[]): void {
  safeLocalStorageSet(STORAGE_KEYS.RESIT_REQUESTS, JSON.stringify(requests));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_resit_requests_updated', { detail: { requests } }));
  }
}

export function normalizeCourseCode(code: string): string {
  return (code || '').toUpperCase().replace(/[\s\-_]/g, '');
}

export function normalizeExamTitle(title: string): string {
  return (title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

export function normalizeAdmission(admission: string): string {
  return (admission || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
}

/**
 * Checks if a candidate previously registered to sit an examination but missed it.
 * Uses Student Admission number (studentNumber), Examination code (courseCode), and Title (examTitle)
 * to identify and enforce logic preventing re-registration unless cleared by the Administrator.
 */
export function checkMissedExamRegistrationBlock(
  studentIdentifier: string,
  examCodeOrIdentifier: string,
  examTitleOverride?: string
): {
  isBlocked: boolean;
  isCleared?: boolean;
  studentAdmission: string;
  studentName?: string;
  examCode: string;
  examTitle: string;
  record?: MissedExamRecord;
  resitRequest?: ResitRequest;
  reason?: string;
} {
  const normAdmission = normalizeAdmission(studentIdentifier);

  const students = getStoredStudents();
  const student = students.find(
    (s) =>
      normalizeAdmission(s.studentNumber) === normAdmission ||
      s.id === studentIdentifier ||
      normalizeAdmission(s.id) === normAdmission
  );

  const exams = getStoredExams();
  // Find exam matching code, id, or title
  const exam = exams.find(
    (e) =>
      (examTitleOverride && (normalizeCourseCode(e.courseCode) === normalizeCourseCode(examCodeOrIdentifier) || normalizeExamTitle(e.title) === normalizeExamTitle(examTitleOverride))) ||
      e.id === examCodeOrIdentifier ||
      normalizeCourseCode(e.courseCode) === normalizeCourseCode(examCodeOrIdentifier) ||
      normalizeExamTitle(e.title) === normalizeExamTitle(examCodeOrIdentifier) ||
      e.title.toLowerCase().includes(examCodeOrIdentifier.toLowerCase())
  );

  const studentAdmission = student ? student.studentNumber : studentIdentifier;
  const studentName = student ? student.name : undefined;
  const examCode = exam ? exam.courseCode : (examTitleOverride ? examCodeOrIdentifier : '');
  const examTitle = exam ? exam.title : (examTitleOverride ? examTitleOverride : examCodeOrIdentifier);

  const normCode = normalizeCourseCode(examCode);
  const normTitle = normalizeExamTitle(examTitle);

  const missedRecords = getStoredMissedExams();
  const resitRequests = getStoredResitRequests();

  // Find missed exam record matching student admission number, examination code, and title
  const record = missedRecords.find((m) => {
    const studentMatch =
      normalizeAdmission(m.studentNumber) === normAdmission ||
      (student && (normalizeAdmission(m.studentNumber) === normalizeAdmission(student.studentNumber) || m.studentId === student.id)) ||
      m.studentId === studentIdentifier;

    const codeMatch =
      !normCode ||
      normalizeCourseCode(m.courseCode) === normCode ||
      (exam && normalizeCourseCode(m.courseCode) === normalizeCourseCode(exam.courseCode));

    const titleMatch =
      !normTitle ||
      normalizeExamTitle(m.examTitle) === normTitle ||
      (exam && normalizeExamTitle(m.examTitle) === normalizeExamTitle(exam.title)) ||
      m.examTitle.toLowerCase().includes(examTitle.toLowerCase()) ||
      examTitle.toLowerCase().includes(m.examTitle.toLowerCase());

    return studentMatch && (codeMatch || titleMatch);
  });

  if (!record) {
    return {
      isBlocked: false,
      studentAdmission,
      studentName,
      examCode,
      examTitle,
    };
  }

  // Check if cleared by Admin (either direct clearance flag or cleared status)
  if (record.isCleared === true || record.status === 'cleared') {
    return {
      isBlocked: false,
      isCleared: true,
      studentAdmission,
      studentName,
      examCode: record.courseCode || examCode,
      examTitle: record.examTitle || examTitle,
      record,
    };
  }

  // Check if resit clearance was approved by Admin matching admission, code, and title
  const approvedResit = resitRequests.find((r) => {
    const studentMatch =
      normalizeAdmission(r.studentNumber) === normAdmission ||
      (student && (normalizeAdmission(r.studentNumber) === normalizeAdmission(student.studentNumber) || r.studentId === student.id)) ||
      r.studentId === studentIdentifier;

    const codeMatch =
      !normCode ||
      normalizeCourseCode(r.courseCode) === normCode ||
      (record && normalizeCourseCode(r.courseCode) === normalizeCourseCode(record.courseCode));

    const titleMatch =
      !normTitle ||
      normalizeExamTitle(r.examTitle) === normTitle ||
      (record && normalizeExamTitle(r.examTitle) === normalizeExamTitle(record.examTitle)) ||
      r.examTitle.toLowerCase().includes(examTitle.toLowerCase()) ||
      examTitle.toLowerCase().includes(r.examTitle.toLowerCase());

    return studentMatch && (codeMatch || titleMatch) && r.status === 'approved';
  });

  if (approvedResit) {
    return {
      isBlocked: false,
      isCleared: true,
      studentAdmission,
      studentName,
      examCode: approvedResit.courseCode || record.courseCode || examCode,
      examTitle: approvedResit.examTitle || record.examTitle || examTitle,
      record,
      resitRequest: approvedResit,
    };
  }

  const pendingOrDeclinedReq = resitRequests.find((r) => {
    const studentMatch =
      normalizeAdmission(r.studentNumber) === normAdmission ||
      (student && (normalizeAdmission(r.studentNumber) === normalizeAdmission(student.studentNumber) || r.studentId === student.id)) ||
      r.studentId === studentIdentifier;

    const codeMatch =
      !normCode ||
      normalizeCourseCode(r.courseCode) === normCode ||
      (record && normalizeCourseCode(r.courseCode) === normalizeCourseCode(record.courseCode));

    const titleMatch =
      !normTitle ||
      normalizeExamTitle(r.examTitle) === normTitle ||
      (record && normalizeExamTitle(r.examTitle) === normalizeExamTitle(record.examTitle)) ||
      r.examTitle.toLowerCase().includes(examTitle.toLowerCase()) ||
      examTitle.toLowerCase().includes(r.examTitle.toLowerCase());

    return studentMatch && (codeMatch || titleMatch);
  });

  return {
    isBlocked: true,
    isCleared: false,
    studentAdmission,
    studentName,
    examCode: record.courseCode || examCode,
    examTitle: record.examTitle || examTitle,
    record,
    resitRequest: pendingOrDeclinedReq,
    reason: `Candidate (Admission: ${studentAdmission}) was previously registered to sit examination [Code: ${record.courseCode || examCode} | Title: "${record.examTitle || examTitle}"] but missed the session. Re-registration is strictly prevented until cleared by the Administrator.`,
  };
}

/**
 * Validates if candidate previously missed an examination based on Student Admission number,
 * Examination code, and Title, and checks if Administrator clearance has been granted.
 */
export function hasUnapprovedMissedExam(
  studentIdOrAdmission: string,
  courseCode: string,
  examTitle: string
): { isBlocked: boolean; record?: MissedExamRecord; resitRequest?: ResitRequest } {
  const result = checkMissedExamRegistrationBlock(studentIdOrAdmission, courseCode, examTitle);
  return {
    isBlocked: result.isBlocked,
    record: result.record,
    resitRequest: result.resitRequest,
  };
}

/**
 * Allows the Administrator to clear a student who missed an examination using:
 * 1. Student Admission number (studentNumber)
 * 2. Examination code (courseCode)
 * 3. Title (examTitle)
 * Once cleared, re-registration to sit the examination is permitted.
 */
export function adminClearMissedExam(
  studentAdmission: string,
  examCodeOrTitle: string,
  examTitleOrAdmin?: string,
  adminNameParam?: string
): { success: boolean; message: string; error?: string; record?: MissedExamRecord } {
  let examCode = '';
  let examTitle = '';
  let adminName = 'Dr. Marcus Sterling (Super Admin)';

  if (adminNameParam) {
    examCode = examCodeOrTitle;
    examTitle = examTitleOrAdmin || '';
    adminName = adminNameParam;
  } else if (examTitleOrAdmin && (examTitleOrAdmin.includes('Admin') || examTitleOrAdmin.includes('Dr.') || examTitleOrAdmin.includes('Super'))) {
    examTitle = examCodeOrTitle;
    adminName = examTitleOrAdmin;
  } else if (examTitleOrAdmin) {
    examCode = examCodeOrTitle;
    examTitle = examTitleOrAdmin;
  } else {
    examTitle = examCodeOrTitle;
  }

  const normAdmission = normalizeAdmission(studentAdmission);
  const students = getStoredStudents();
  const student = students.find(
    (s) =>
      normalizeAdmission(s.studentNumber) === normAdmission ||
      s.id === studentAdmission ||
      normalizeAdmission(s.id) === normAdmission
  );

  const exams = getStoredExams();
  const exam = exams.find(
    (e) =>
      (examCode && normalizeCourseCode(e.courseCode) === normalizeCourseCode(examCode)) ||
      (examTitle && normalizeExamTitle(e.title) === normalizeExamTitle(examTitle)) ||
      e.id === examCode ||
      e.id === examTitle
  );

  const finalAdmission = student?.studentNumber || studentAdmission;
  const finalCode = exam?.courseCode || examCode || 'EXAM';
  const finalTitle = exam?.title || examTitle;

  const normCode = normalizeCourseCode(finalCode);
  const normTitle = normalizeExamTitle(finalTitle);

  const missed = getStoredMissedExams();
  const now = new Date().toISOString();

  let target = missed.find((m) => {
    const studentMatch =
      normalizeAdmission(m.studentNumber) === normAdmission ||
      (student && normalizeAdmission(m.studentNumber) === normalizeAdmission(student.studentNumber)) ||
      m.studentId === studentAdmission;

    const codeMatch = !normCode || normalizeCourseCode(m.courseCode) === normCode;
    const titleMatch =
      !normTitle ||
      normalizeExamTitle(m.examTitle) === normTitle ||
      m.examTitle.toLowerCase().includes(finalTitle.toLowerCase()) ||
      finalTitle.toLowerCase().includes(m.examTitle.toLowerCase());

    return studentMatch && (codeMatch || titleMatch);
  });

  if (target) {
    target.isCleared = true;
    target.status = 'cleared';
    target.clearedAt = now;
    target.clearedBy = adminName;
    if (finalCode && target.courseCode !== finalCode) target.courseCode = finalCode;
    if (finalTitle && target.examTitle !== finalTitle) target.examTitle = finalTitle;
  } else {
    target = {
      id: `cleared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      studentId: student?.id || `student-${studentAdmission}`,
      studentName: student?.name || `Candidate (${finalAdmission})`,
      studentNumber: finalAdmission,
      studentEmail: student?.email || 'student@university.edu',
      courseCode: finalCode,
      examTitle: finalTitle,
      examId: exam?.id || `exam-${Date.now()}`,
      scheduledDate: new Date().toISOString().split('T')[0],
      missedReason: 'Administrative clearance granted by Assessment Directorate.',
      status: 'cleared',
      isCleared: true,
      clearedAt: now,
      clearedBy: adminName,
      recordedAt: now,
    };
    missed.unshift(target);
  }

  saveStoredMissedExams(missed);

  // Synchronize matching resit requests to approved
  const resitRequests = getStoredResitRequests();
  let resitUpdated = false;
  resitRequests.forEach((req) => {
    const studentMatch =
      normalizeAdmission(req.studentNumber) === normAdmission ||
      (student && req.studentId === student.id) ||
      req.studentId === studentAdmission;

    const codeMatch = !normCode || normalizeCourseCode(req.courseCode) === normCode;
    const titleMatch =
      !normTitle ||
      normalizeExamTitle(req.examTitle) === normTitle ||
      req.examTitle.toLowerCase().includes(finalTitle.toLowerCase());

    if (studentMatch && (codeMatch || titleMatch)) {
      req.status = 'approved';
      req.reviewedBy = adminName;
      req.reviewedAt = now;
      req.adminDecisionNote = `Administrative clearance granted: Candidate (Admission: ${finalAdmission}) cleared for [Code: ${finalCode} | Title: "${finalTitle}"]. Re-registration is authorized.`;
      req.adminNotes = req.adminDecisionNote;
      resitUpdated = true;
    }
  });

  if (resitUpdated) {
    saveStoredResitRequests(resitRequests);
  }

  // Ensure course enrollment if student and exam found
  if (student && finalCode && !student.enrolledCourseCodes.includes(finalCode)) {
    student.enrolledCourseCodes.push(finalCode);
    saveStoredStudents(students);
  }

  broadcastSync('examguard_missed_exams_updated', { record: target });
  broadcastSync('examguard_resit_requests_updated', { requests: resitRequests });
  broadcastSync('examguard_state_sync');

  return {
    success: true,
    message: `Clearance successfully granted for Candidate (Admission: "${finalAdmission}") on Examination [Code: ${target.courseCode} | Title: "${target.examTitle}"]. Re-registration is now permitted.`,
    record: target,
  };
}

/**
 * Revokes Administrator clearance for a missed examination using Student Admission number,
 * Examination code, and Title.
 */
export function adminRevokeMissedExamClearance(
  studentAdmission: string,
  examCodeOrTitle: string,
  examTitleParam?: string
): { success: boolean; message: string; error?: string; record?: MissedExamRecord } {
  const normAdmission = normalizeAdmission(studentAdmission);
  const examCode = examTitleParam ? examCodeOrTitle : '';
  const examTitle = examTitleParam || examCodeOrTitle;
  const normCode = normalizeCourseCode(examCode);
  const normTitle = normalizeExamTitle(examTitle);

  const missed = getStoredMissedExams();
  const target = missed.find((m) => {
    const studentMatch =
      normalizeAdmission(m.studentNumber) === normAdmission ||
      m.studentId === studentAdmission;

    const codeMatch = !normCode || normalizeCourseCode(m.courseCode) === normCode;
    const titleMatch =
      !normTitle ||
      normalizeExamTitle(m.examTitle) === normTitle ||
      m.examTitle.toLowerCase().includes(examTitle.toLowerCase());

    return studentMatch && (codeMatch || titleMatch);
  });

  if (!target) {
    return { success: false, message: 'Missed examination record not found.' };
  }

  target.isCleared = false;
  target.status = 'uncleared';
  target.clearedAt = undefined;
  target.clearedBy = undefined;
  saveStoredMissedExams(missed);

  broadcastSync('examguard_missed_exams_updated', { record: target });
  broadcastSync('examguard_state_sync');

  return {
    success: true,
    message: `Clearance revoked for Candidate (Admission: "${studentAdmission}") on Examination [Code: ${target.courseCode} | Title: "${target.examTitle}"]. Re-registration is blocked.`,
    record: target,
  };
}


export function submitResitRequest(data: {
  studentId: string;
  studentName: string;
  studentNumber: string;
  studentEmail: string;
  courseCode: string;
  examTitle: string;
  examId?: string;
  missedDate: string;
  reasonCategory: 'medical' | 'technical' | 'compassionate' | 'academic_clash' | 'other';
  reasonDetails: string;
  evidenceNotes?: string;
  attachmentFileName?: string;
  attachmentFileUrl?: string;
  attachmentFileType?: string;
  attachmentFileSize?: number;
  medicalFacility?: string;
  doctorName?: string;
  medicalCertificateRef?: string;
  grounds?: string;
  explanation?: string;
  evidenceDocument?: string;
}): ResitRequest {
  // If the reason category is medical, ensure that medical evidence is compulsory attached
  if (data.reasonCategory === 'medical') {
    const hasEvidence = Boolean(
      (data.attachmentFileName && data.attachmentFileName.trim()) ||
      (data.attachmentFileUrl && data.attachmentFileUrl.trim())
    );
    if (!hasEvidence) {
      throw new Error(
        'Compulsory Requirement: Medical evidence documentation must be attached when selecting Medical reason for missed examination resit.'
      );
    }
  }

  const requests = getStoredResitRequests();
  const newReq: ResitRequest = {
    id: `resit-${Date.now()}`,
    ...data,
    grounds: data.grounds || data.reasonCategory,
    explanation: data.explanation || data.reasonDetails,
    evidenceDocument: data.evidenceDocument || data.attachmentFileName,
    isMedicalCompulsoryMet: data.reasonCategory === 'medical' ? true : undefined,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  requests.unshift(newReq);
  saveStoredResitRequests(requests);

  // Mark status in missed exam record
  const missed = getStoredMissedExams();
  const normCode = normalizeCourseCode(data.courseCode);
  const match = missed.find(
    (m) => m.studentId === data.studentId && normalizeCourseCode(m.courseCode) === normCode
  );
  if (match) {
    match.status = 'resit_pending';
    saveStoredMissedExams(missed);
  }

  return newReq;
}

export function reviewResitRequest(
  requestId: string,
  action: 'approve' | 'declined' | 'approved' | 'decline',
  adminNote: string,
  adminName = 'Dr. Marcus Sterling (Super Admin)'
): { success: boolean; error?: string } {
  const requests = getStoredResitRequests();
  const req = requests.find((r) => r.id === requestId);
  if (!req) return { success: false, error: 'Resit clearance request record not found.' };

  const isApp = action === 'approve' || action === 'approved';
  req.status = isApp ? 'approved' : 'declined';
  req.adminDecisionNote = adminNote.trim() || (isApp ? 'Cleared by Admin Directorate.' : 'Declined.');
  req.adminNotes = req.adminDecisionNote;
  req.reviewedBy = adminName;
  req.reviewedAt = new Date().toISOString();

  saveStoredResitRequests(requests);

  // Update Missed Exam Record status
  const missed = getStoredMissedExams();
  const normCode = normalizeCourseCode(req.courseCode);
  const mMatch = missed.find(
    (m) => m.studentId === req.studentId && normalizeCourseCode(m.courseCode) === normCode
  );
  if (mMatch) {
    mMatch.status = isApp ? 'cleared' : 'resit_declined';
    mMatch.isCleared = isApp;
    mMatch.clearedAt = isApp ? new Date().toISOString() : undefined;
    mMatch.clearedBy = isApp ? adminName : undefined;
    saveStoredMissedExams(missed);
  }

  // If approved, ensure student enrollment has this course code
  if (isApp) {
    const students = getStoredStudents();
    const st = students.find((s) => s.id === req.studentId);
    if (st && !st.enrolledCourseCodes.includes(req.courseCode)) {
      st.enrolledCourseCodes.push(req.courseCode);
      saveStoredStudents(students);
    }
  }

  if (isApp) {
    triggerFlash({
      type: 'success',
      text: 'Student Resit Clearance Approved',
      subtext: `${req.studentName} (${req.studentNumber}) approved by Super Admin for ${req.courseCode} resit.`,
    });
  } else {
    triggerFlash({
      type: 'error',
      text: 'Student Resit Clearance Declined',
      subtext: `Resit clearance for ${req.studentName} (${req.courseCode}) was declined.`,
    });
  }

  return { success: true };
}

/**
 * Calculates attendance summary for an examination:
 * Total Registered, Sat, and Missed (with detailed list and clearance status)
 */
export function getExamAttendanceSummary(examId: string): ExamAttendanceSummary | null {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return null;

  const students = getStoredStudents();
  const submissions = getStoredSubmissions();

  // All students registered for this course/exam
  const registered = students.filter(
    (s) =>
      (exam.registeredStudentIds && exam.registeredStudentIds.includes(s.id)) ||
      (s.enrolledCourseCodes && s.enrolledCourseCodes.includes(exam.courseCode))
  );

  const satSubmissions = submissions.filter((s) => s.examId === examId);
  const satStudentIds = new Set(satSubmissions.map((s) => s.studentId));

  const missedStudentsList: ExamAttendanceSummary['missedStudents'] = [];

  registered.forEach((student) => {
    if (!satStudentIds.has(student.id)) {
      const { isBlocked, record, resitRequest } = hasUnapprovedMissedExam(
        student.id,
        exam.courseCode,
        exam.title
      );

      let clearanceStatus: 'uncleared' | 'resit_pending' | 'cleared' | 'resit_declined' = 'uncleared';
      if (!isBlocked && (record || resitRequest)) {
        clearanceStatus = 'cleared';
      } else if (resitRequest?.status === 'pending') {
        clearanceStatus = 'resit_pending';
      } else if (resitRequest?.status === 'declined') {
        clearanceStatus = 'resit_declined';
      }

      missedStudentsList.push({
        student,
        missedDate: record?.scheduledDate || exam.scheduledDate || new Date(exam.scheduledStartTime).toLocaleDateString(),
        clearanceStatus,
      });
    }
  });

  const rate = registered.length > 0 ? Math.round((satStudentIds.size / registered.length) * 100) : 100;

  return {
    examId: exam.id,
    courseCode: exam.courseCode,
    examTitle: exam.title,
    title: exam.title,
    instructorName: exam.instructorName,
    department: exam.department,
    faculty: exam.faculty,
    totalRegistered: registered.length,
    totalSat: satStudentIds.size,
    totalMissed: missedStudentsList.length,
    attendanceRate: rate,
    missedStudents: missedStudentsList,
  };
}

export function getAllExamsAttendanceSummaries(examsOverride?: Exam[]): ExamAttendanceSummary[] {
  const exams = examsOverride && examsOverride.length > 0 ? examsOverride : getStoredExams();
  return exams.map((e) => getExamAttendanceSummary(e.id)).filter(Boolean) as ExamAttendanceSummary[];
}

// Student Admission Control for Exam Room with Strict Course Registration & Missed Exam Clearance Enforced
export function admitStudentToExamWithValidation(
  examId: string,
  studentId: string
): { success: boolean; error?: string } {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return { success: false, error: 'Examination record not found.' };

  const students = getStoredStudents();
  const student = students.find((s) => s.id === studentId);
  if (!student) return { success: false, error: 'Candidate profile record not found.' };

  // Rule: A student that is not registered to a course cannot be admitted into the examination room for that course.
  const isRegisteredForCourse =
    student.enrolledCourseCodes?.includes(exam.courseCode) ||
    exam.registeredStudentIds?.includes(studentId) ||
    exam.courseCode === 'ALL';

  if (!isRegisteredForCourse) {
    const errorMsg = `Admission Denied: Candidate ${student.name} (${student.studentNumber}) is NOT registered for course ${exam.courseCode}. Unregistered candidates cannot be admitted into the examination room.`;
    triggerFlash({
      type: 'error',
      text: 'Admission Denied: Not Enrolled',
      subtext: `${student.name} (${student.studentNumber}) is not enrolled for ${exam.courseCode}.`,
    });
    return {
      success: false,
      error: errorMsg,
    };
  }

  // Rule: Student previously registered for exam who missed must seek clearance from admin before admission.
  const missedCheck = hasUnapprovedMissedExam(studentId, exam.courseCode, exam.title);
  if (missedCheck.isBlocked) {
    const note = missedCheck.resitRequest?.status === 'pending'
      ? 'Resit clearance request is currently pending Admin review.'
      : 'No approved Super Admin clearance found.';
    const errorMsg = `Missed Examination Clearance Required: Candidate previously missed ${exam.courseCode} — ${exam.title}. ${note} Clearance must be granted by the Super Admin Directorate before room admission.`;
    triggerFlash({
      type: 'error',
      text: 'Admission Blocked: Missed Exam',
      subtext: `Candidate ${student.name} previously missed ${exam.courseCode}. Admin clearance required.`,
    });
    return {
      success: false,
      error: errorMsg,
    };
  }

  if (!exam.admittedStudentIds) exam.admittedStudentIds = [];
  if (!exam.admittedStudentIds.includes(studentId)) {
    exam.admittedStudentIds.push(studentId);
    saveStoredExams(exams);
  }

  // Synchronously remove from waiting room to prevent button jitter/flicker
  removeStudentFromWaitingRoom(examId, studentId);

  // Instant broadcast across local window and cross-tab BroadcastChannel
  broadcastSync('examguard_admission_updated', {
    examId,
    studentId,
    admitted: true,
    timestamp: Date.now(),
  });

  triggerFlash({
    type: 'success',
    text: 'Candidate Admitted into Exam Room',
    subtext: `${student.name} (${student.studentNumber}) is cleared and admitted into ${exam.courseCode}.`,
  });

  // Post to backend for real-time multi-browser / cross-device SSE synchronization
  try {
    fetch(`/api/exams/${encodeURIComponent(examId)}/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    }).catch(() => {});
  } catch {}

  return { success: true };
}

export function admitStudentToExam(examId: string, studentId: string): boolean {
  return admitStudentToExamWithValidation(examId, studentId).success;
}

export function admitAllStudentsToExam(examId: string): { success: boolean; admittedCount: number; rejectedCount: number } {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return { success: false, admittedCount: 0, rejectedCount: 0 };
  const students = getStoredStudents();

  if (!exam.admittedStudentIds) exam.admittedStudentIds = [];

  let admittedCount = 0;
  let rejectedCount = 0;

  students.forEach((student) => {
    const isRegistered =
      student.enrolledCourseCodes?.includes(exam.courseCode) ||
      exam.registeredStudentIds?.includes(student.id) ||
      exam.courseCode === 'ALL';

    if (!isRegistered) {
      rejectedCount++;
      return;
    }

    const missedCheck = hasUnapprovedMissedExam(student.id, exam.courseCode, exam.title);
    if (missedCheck.isBlocked) {
      rejectedCount++;
      return;
    }

    if (!exam.admittedStudentIds.includes(student.id)) {
      exam.admittedStudentIds.push(student.id);
      admittedCount++;
    }
    // Remove from waiting room synchronously
    removeStudentFromWaitingRoom(examId, student.id);
  });

  saveStoredExams(exams);

  // Instant broadcast across window and BroadcastChannel
  broadcastSync('examguard_admission_updated', {
    examId,
    all: true,
    admitted: true,
    studentIds: exam.admittedStudentIds,
    timestamp: Date.now(),
  });

  triggerFlash({
    type: 'success',
    text: 'Candidate Admissions Approved',
    subtext: `Admitted ${admittedCount} cleared candidate(s) into examination room.`,
  });

  // Post to backend for multi-browser & device sync
  try {
    fetch(`/api/exams/${encodeURIComponent(examId)}/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true, studentIds: exam.admittedStudentIds }),
    }).catch(() => {});
  } catch {}

  return { success: true, admittedCount, rejectedCount };
}

export function revokeStudentAdmission(examId: string, studentId: string): boolean {
  const exams = getStoredExams();
  const exam = exams.find((e) => e.id === examId);
  if (!exam || !exam.admittedStudentIds) return false;
  exam.admittedStudentIds = exam.admittedStudentIds.filter((id) => id !== studentId);
  saveStoredExams(exams);

  broadcastSync('examguard_admission_updated', {
    examId,
    studentId,
    revoked: true,
    admitted: false,
    timestamp: Date.now(),
  });

  try {
    fetch(`/api/exams/${encodeURIComponent(examId)}/revoke-admission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    }).catch(() => {});
  } catch {}

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

      broadcastSync('examguard_waiting_room_updated', {
        examId,
        studentId,
        action: 'join',
        timestamp: Date.now(),
      });

      try {
        fetch(`/api/exams/${encodeURIComponent(examId)}/waiting-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, action: 'join' }),
        }).catch(() => {});
      } catch {}
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

    broadcastSync('examguard_waiting_room_updated', {
      examId,
      studentId,
      action: 'leave',
      timestamp: Date.now(),
    });

    try {
      fetch(`/api/exams/${encodeURIComponent(examId)}/waiting-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'leave' }),
      }).catch(() => {});
    } catch {}
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

  // Immediately update academic database for consistency when marks exist or status is graded
  if (submission.status === 'graded' || submission.score != null || submission.isResultCommitted) {
    syncSubmissionToAcademicDatabase(submission);
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

  // Immediately update academic database for consistency upon mark modification
  syncSubmissionToAcademicDatabase(
    sub,
    `Faculty mark override by ${instructorName} on Question ${questionId}: ${reason.trim()}`
  );

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

      // Immediately synchronize into the Admin Academic Database
      syncSubmissionToAcademicDatabase(sub, `Official result committed by ${instructorName}.`);

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
        // Immediately sync each committed submission to academic database
        syncSubmissionToAcademicDatabase(submission, `Batch result committed by ${instructorName}.`);
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
  broadcastSync('examguard_teachers_updated', { teachers });
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
  syncAcademicDatabaseWithSubmissions();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_submissions_updated', { detail: { submission: sub } }));
    window.dispatchEvent(new CustomEvent('examguard_state_sync'));
  }
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

  // Immediately update academic database for consistency upon manual mark evaluation
  syncSubmissionToAcademicDatabase(
    sub,
    overallRemarks || `Manual grading evaluation conducted by ${instructorName}.`
  );

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
  saveStoredSubmissions(subs);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('examguard_submissions_updated', { detail: { submission: sub } }));
    window.dispatchEvent(new CustomEvent('examguard_state_sync'));
  }

  // Best-effort sync to backend API
  try {
    fetch(
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
    ).catch(() => {});
  } catch {}

  // Dynamically sync academic database so modified results reflect immediately
  syncAcademicDatabaseWithSubmissions();

  return { success: true, updatedSubmission: sub };
}

// -------------------------------------------------------------
// INSTITUTIONAL ACADEMIC RECORDS DATABASE (COMPOSITE PRIMARY KEY: [Student Admission + Course Code])
// -------------------------------------------------------------
export function calculateAcademicGrade(percentage: number): string {
  const p = Math.round(percentage);
  if (p >= 80) return 'A';
  if (p >= 75) return 'A-';
  if (p >= 70) return 'B+';
  if (p >= 65) return 'B';
  if (p >= 60) return 'B-';
  if (p >= 55) return 'C+';
  if (p >= 50) return 'C';
  if (p >= 40) return 'D';
  return 'F';
}

/**
 * Builds the composite primary key string from student admission number and course code.
 * Format: "${studentAdmission}#${course}"
 * Enforces database integrity: A single student can take multiple different units (e.g. CS401, CS302, CYBER201),
 * while preventing duplicate entries for the exact same unit.
 */
export function buildCompositeKey(studentAdmission: string, course: string): string {
  const normAdmission = (studentAdmission || '').trim().toUpperCase();
  const normCourse = (course || '').trim().toUpperCase();
  return `${normAdmission}#${normCourse}`;
}

export const INITIAL_ACADEMIC_RECORDS: AcademicRecord[] = [
  // Student Alex Rivera (STU-2024-8842) taking 3 distinct units
  {
    id: 'acad-stu-2024-8842-cs401',
    compositePrimaryKey: 'STU-2024-8842#CS401',
    studentAdmission: 'STU-2024-8842',
    studentName: 'Alex Rivera',
    course: 'CS401',
    unitName: 'Principles of Distributed Computing & Consensus',
    score: 88,
    totalPoints: 100,
    percentage: 88,
    grade: 'A',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2025-11-16T14:30:00.000Z',
    approvedAt: '2025-11-16T15:00:00.000Z',
    approvedBy: 'Prof. Evelyn Vance (Chair)',
    examId: 'exam-past-2025',
    submissionId: 'sub-alex-past',
  },
  {
    id: 'acad-stu-2024-8842-cs302',
    compositePrimaryKey: 'STU-2024-8842#CS302',
    studentAdmission: 'STU-2024-8842',
    studentName: 'Alex Rivera',
    course: 'CS302',
    unitName: 'Database Systems Architecture & Query Optimization',
    score: 91,
    totalPoints: 100,
    percentage: 91,
    grade: 'A',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2025-12-04T11:00:00.000Z',
    approvedAt: '2025-12-05T09:00:00.000Z',
    approvedBy: 'Prof. Evelyn Vance',
  },
  {
    id: 'acad-stu-2024-8842-cyber201',
    compositePrimaryKey: 'STU-2024-8842#CYBER201',
    studentAdmission: 'STU-2024-8842',
    studentName: 'Alex Rivera',
    course: 'CYBER201',
    unitName: 'Applied Cryptography & Zero-Knowledge Verification',
    score: 85,
    totalPoints: 100,
    percentage: 85,
    grade: 'A',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-01-10T12:00:00.000Z',
    approvedAt: '2026-01-10T14:00:00.000Z',
    approvedBy: 'Dr. David Chen',
  },
  // Student Maya Lin (STU-2024-7721) taking 2 distinct units
  {
    id: 'acad-stu-2024-7721-cs302',
    compositePrimaryKey: 'STU-2024-7721#CS302',
    studentAdmission: 'STU-2024-7721',
    studentName: 'Maya Lin',
    course: 'CS302',
    unitName: 'Database Systems Architecture & Query Optimization',
    score: 92,
    totalPoints: 100,
    percentage: 92,
    grade: 'A',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2025-12-04T10:15:00.000Z',
    approvedAt: '2025-12-05T09:00:00.000Z',
    approvedBy: 'Prof. Evelyn Vance',
  },
  {
    id: 'acad-stu-2024-7721-cs401',
    compositePrimaryKey: 'STU-2024-7721#CS401',
    studentAdmission: 'STU-2024-7721',
    studentName: 'Maya Lin',
    course: 'CS401',
    unitName: 'Principles of Distributed Computing & Consensus',
    score: 84,
    totalPoints: 100,
    percentage: 84,
    grade: 'A',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-01-08T15:00:00.000Z',
    approvedAt: '2026-01-09T10:00:00.000Z',
    approvedBy: 'Prof. Evelyn Vance',
  },
  // Student Samuel K. Ochieng (STU-2024-9031) taking 2 distinct units
  {
    id: 'acad-stu-2024-9031-cyber201',
    compositePrimaryKey: 'STU-2024-9031#CYBER201',
    studentAdmission: 'STU-2024-9031',
    studentName: 'Samuel K. Ochieng',
    course: 'CYBER201',
    unitName: 'Applied Cryptography & Zero-Knowledge Verification',
    score: 78,
    totalPoints: 100,
    percentage: 78,
    grade: 'A-',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-01-10T11:45:00.000Z',
    approvedAt: '2026-01-10T14:00:00.000Z',
    approvedBy: 'Dr. David Chen',
  },
  {
    id: 'acad-stu-2024-9031-cs401',
    compositePrimaryKey: 'STU-2024-9031#CS401',
    studentAdmission: 'STU-2024-9031',
    studentName: 'Samuel K. Ochieng',
    course: 'CS401',
    unitName: 'Principles of Distributed Computing & Consensus',
    score: 82,
    totalPoints: 100,
    percentage: 82,
    grade: 'A-',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-01-15T09:30:00.000Z',
    approvedAt: '2026-01-15T12:00:00.000Z',
    approvedBy: 'Dr. Marcus Sterling',
  },
  // Student David Kiprono (RBC/2026/014) taking 2 distinct units
  {
    id: 'acad-rbc-2026-014-bus205',
    compositePrimaryKey: 'RBC/2026/014#BUS205',
    studentAdmission: 'RBC/2026/014',
    studentName: 'David Kiprono',
    course: 'BUS205',
    unitName: 'Quantitative Business Analytics & Financial Auditing',
    score: 84,
    totalPoints: 100,
    percentage: 84,
    grade: 'A',
    department: 'Business Administration & Accounting',
    faculty: 'Faculty of Commerce & Management',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-02-14T09:20:00.000Z',
    approvedAt: '2026-02-14T12:00:00.000Z',
    approvedBy: 'Dr. Marcus Sterling (Super Admin)',
  },
  {
    id: 'acad-rbc-2026-014-eng101',
    compositePrimaryKey: 'RBC/2026/014#ENG101',
    studentAdmission: 'RBC/2026/014',
    studentName: 'David Kiprono',
    course: 'ENG101',
    unitName: 'Discrete Mathematics & Digital Logic Circuit Design',
    score: 74,
    totalPoints: 100,
    percentage: 74,
    grade: 'B+',
    department: 'Electrical & Electronic Engineering',
    faculty: 'Faculty of Engineering & Built Environment',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-02-18T10:00:00.000Z',
    approvedAt: '2026-02-19T11:00:00.000Z',
    approvedBy: 'Dr. Marcus Sterling',
  },
  // Student Faith Chebet (RBC/2026/028)
  {
    id: 'acad-rbc-2026-028-eng101',
    compositePrimaryKey: 'RBC/2026/028#ENG101',
    studentAdmission: 'RBC/2026/028',
    studentName: 'Faith Chebet',
    course: 'ENG101',
    unitName: 'Discrete Mathematics & Digital Logic Circuit Design',
    score: 71,
    totalPoints: 100,
    percentage: 71,
    grade: 'B+',
    department: 'Electrical & Electronic Engineering',
    faculty: 'Faculty of Engineering & Built Environment',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-02-20T16:00:00.000Z',
    approvedAt: '2026-02-21T08:30:00.000Z',
    approvedBy: 'Dr. Marcus Sterling',
  },
  // Student Brian Mwangi (RBC/2026/045)
  {
    id: 'acad-rbc-2026-045-cs401',
    compositePrimaryKey: 'RBC/2026/045#CS401',
    studentAdmission: 'RBC/2026/045',
    studentName: 'Brian Mwangi',
    course: 'CS401',
    unitName: 'Principles of Distributed Computing & Consensus',
    score: 64,
    totalPoints: 100,
    percentage: 64,
    grade: 'B-',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    status: 'modified',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-02-22T13:00:00.000Z',
    lastModifiedAt: '2026-02-25T11:00:00.000Z',
    approvedAt: '2026-02-25T11:00:00.000Z',
    approvedBy: 'Dr. Marcus Sterling (Super Admin)',
    modifiedReason: 'Super Admin Directorate approved mark adjustment following second-marker moderation audit.',
  },
  // Student Esther Wanjiku (RBC/2026/052)
  {
    id: 'acad-rbc-2026-052-law301',
    compositePrimaryKey: 'RBC/2026/052#LAW301',
    studentAdmission: 'RBC/2026/052',
    studentName: 'Esther Wanjiku',
    course: 'LAW301',
    unitName: 'Jurisprudence & Intellectual Property In Cyberspace',
    score: 89,
    totalPoints: 100,
    percentage: 89,
    grade: 'A',
    department: 'Law & Legal Studies',
    faculty: 'Faculty of Law',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-03-01T14:10:00.000Z',
    approvedAt: '2026-03-02T10:00:00.000Z',
    approvedBy: 'Academic Registrar',
  },
  // Student Kevin Omondi (RBC/2026/063)
  {
    id: 'acad-rbc-2026-063-med204',
    compositePrimaryKey: 'RBC/2026/063#MED204',
    studentAdmission: 'RBC/2026/063',
    studentName: 'Kevin Omondi',
    course: 'MED204',
    unitName: 'Clinical Pharmacology & Diagnostic Pathology',
    score: 76,
    totalPoints: 100,
    percentage: 76,
    grade: 'A-',
    department: 'Health Sciences & Clinical Medicine',
    faculty: 'Faculty of Health Sciences',
    status: 'approved',
    period: '2025/2026 Academic Session',
    recordedAt: '2026-03-05T08:45:00.000Z',
    approvedAt: '2026-03-05T12:00:00.000Z',
    approvedBy: 'Dean of Health Sciences',
  },
];

/**
 * Immediately synchronizes an exam submission result into the institutional academic database.
 * Uses Composite Primary Key: [Student Admission Number + Course Code].
 * Enforces consistency immediately whenever marks are created or modified.
 */
export function syncSubmissionToAcademicDatabase(
  submission: ExamSubmission,
  reason?: string
): AcademicRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACADEMIC_DATABASE);
    let records: AcademicRecord[] = raw ? JSON.parse(raw) : [...INITIAL_ACADEMIC_RECORDS];

    const exams = getStoredExams();
    const students = getStoredStudents();

    const exam = exams.find((e) => e.id === submission.examId);
    const student = students.find(
      (s) => s.id === submission.studentId || (submission.studentNumber && s.studentNumber === submission.studentNumber)
    );

    const studentAdmission = (
      student?.studentNumber || submission.studentNumber || submission.studentId || 'UNKNOWN_ADMISSION'
    ).trim().toUpperCase();
    const studentName = student?.name || submission.studentName || 'Enrolled Candidate';
    const course = (exam?.courseCode || 'GENERAL').trim().toUpperCase();
    const unitName = exam?.title || exam?.courseTitle || 'Curriculum Examination Unit';
    const department = exam?.department || student?.department || 'Computer Science & Software Engineering';
    const faculty = exam?.faculty || student?.faculty || 'Faculty of Academic Studies';

    const compositeKey = buildCompositeKey(studentAdmission, course);

    const totalPoints =
      submission.totalPoints || exam?.questions.reduce((sum, q) => sum + q.points, 0) || 100;
    const score = submission.score != null ? submission.score : 0;
    const percentage =
      submission.percentage != null
        ? submission.percentage
        : totalPoints > 0
        ? Math.round((score / totalPoints) * 100)
        : 0;
    const grade = calculateAcademicGrade(percentage);

    // Determine approval / modification status
    const isCommittedApproved = submission.committedMarkChangeRequest?.status === 'approved';
    const hasApprovedOverride = Object.values(submission.answers || {}).some(
      (a) => a.overrideStatus === 'approved'
    );
    const hasAnyOverride = Object.values(submission.answers || {}).some(
      (a) => a.isOverridden
    );
    const isModified = isCommittedApproved || hasApprovedOverride || hasAnyOverride || !!reason;

    const status: 'approved' | 'modified' | 'provisional' = isModified
      ? 'modified'
      : submission.isResultCommitted || submission.status === 'graded'
      ? 'approved'
      : 'provisional';

    const modifiedReason =
      reason ||
      (isCommittedApproved
        ? submission.committedMarkChangeRequest?.adminReviewNote || submission.committedMarkChangeRequest?.explanation
        : hasApprovedOverride
        ? 'Audited mark override approved by Super Administrator.'
        : hasAnyOverride
        ? 'Faculty mark override recorded in system.'
        : undefined);

    const recordId = `acad-${studentAdmission.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${course.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const existingIndex = records.findIndex(
      (r) =>
        r.compositePrimaryKey === compositeKey ||
        (r.studentAdmission.trim().toUpperCase() === studentAdmission &&
          r.course.trim().toUpperCase() === course) ||
        (submission.id && r.submissionId === submission.id)
    );

    const now = new Date().toISOString();
    const submissionDate = submission.submittedAt || submission.startedAt || now;
    const periodYear = new Date(submissionDate).getFullYear();
    const period = `${periodYear}/${periodYear + 1} Academic Session`;

    let resultingRecord: AcademicRecord;

    if (existingIndex !== -1) {
      const existing = records[existingIndex];
      resultingRecord = {
        ...existing,
        compositePrimaryKey: compositeKey,
        studentAdmission,
        studentName,
        course,
        unitName,
        score,
        totalPoints,
        percentage,
        grade,
        department,
        faculty,
        status,
        period: existing.period || period,
        lastModifiedAt: now,
        modifiedReason: modifiedReason || existing.modifiedReason,
        submissionId: submission.id,
        examId: submission.examId,
        approvedAt: existing.approvedAt || now,
        approvedBy:
          existing.approvedBy ||
          (submission.committedBy ? `${submission.committedBy} (Approved)` : 'Super Admin Directorate'),
      };
      records[existingIndex] = resultingRecord;
    } else {
      resultingRecord = {
        id: recordId,
        compositePrimaryKey: compositeKey,
        studentAdmission,
        studentName,
        course,
        unitName,
        score,
        totalPoints,
        percentage,
        grade,
        department,
        faculty,
        status,
        period,
        recordedAt: submission.submittedAt || now,
        approvedAt: now,
        approvedBy: submission.committedBy ? `${submission.committedBy} (Approved)` : 'Super Admin Directorate',
        submissionId: submission.id,
        examId: submission.examId,
        modifiedReason,
      };
      records.unshift(resultingRecord);
    }

    safeLocalStorageSet(STORAGE_KEYS.ACADEMIC_DATABASE, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examguard_academic_database_updated', {
          detail: { records, updatedRecord: resultingRecord },
        })
      );
    }

    return resultingRecord;
  } catch (err) {
    console.error('[storageService] Failed to sync submission to academic database:', err);
    return null;
  }
}

export function syncAcademicDatabaseWithSubmissions(): AcademicRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACADEMIC_DATABASE);
    let records: AcademicRecord[] = raw ? JSON.parse(raw) : [...INITIAL_ACADEMIC_RECORDS];

    // Ensure all existing records have compositePrimaryKey populated
    let hasKeysPopulated = false;
    records = records.map((r) => {
      if (!r.compositePrimaryKey) {
        hasKeysPopulated = true;
        return {
          ...r,
          compositePrimaryKey: buildCompositeKey(r.studentAdmission, r.course),
        };
      }
      return r;
    });

    const submissions = getStoredSubmissions();
    const students = getStoredStudents();
    const exams = getStoredExams();

    let hasChanges = hasKeysPopulated;

    submissions.forEach((sub) => {
      // Only process submissions that have reached graded/committed status or have final scores
      if (sub.status !== 'graded' && !sub.isResultCommitted && sub.score == null) {
        return;
      }

      const exam = exams.find((e) => e.id === sub.examId);
      const student = students.find(
        (s) => s.id === sub.studentId || (sub.studentNumber && s.studentNumber === sub.studentNumber)
      );

      const studentAdmission = (
        student?.studentNumber || sub.studentNumber || sub.studentId || 'UNKNOWN_ADMISSION'
      ).trim().toUpperCase();
      const studentName = student?.name || sub.studentName || 'Enrolled Candidate';
      const course = (exam?.courseCode || 'GENERAL').trim().toUpperCase();
      const unitName = exam?.title || exam?.courseTitle || 'Curriculum Examination Unit';
      const department =
        exam?.department ||
        student?.department ||
        'Computer Science & Software Engineering';
      const faculty = exam?.faculty || student?.faculty || 'Faculty of Academic Studies';

      const compositeKey = buildCompositeKey(studentAdmission, course);

      const totalPoints = sub.totalPoints || 100;
      const score = sub.score != null ? sub.score : 0;
      const percentage = sub.percentage != null
        ? sub.percentage
        : totalPoints > 0
        ? Math.round((score / totalPoints) * 100)
        : 0;
      const grade = calculateAcademicGrade(percentage);

      // Determine approval / modification status
      const isCommittedApproved = sub.committedMarkChangeRequest?.status === 'approved';
      const hasApprovedOverride = Object.values(sub.answers || {}).some(
        (a) => a.overrideStatus === 'approved'
      );
      const hasAnyOverride = Object.values(sub.answers || {}).some(
        (a) => a.isOverridden
      );
      const status: 'approved' | 'modified' | 'provisional' =
        isCommittedApproved || hasApprovedOverride || hasAnyOverride
          ? 'modified'
          : sub.isResultCommitted || sub.status === 'graded'
          ? 'approved'
          : 'provisional';

      const modifiedReason = isCommittedApproved
        ? sub.committedMarkChangeRequest?.adminReviewNote || sub.committedMarkChangeRequest?.explanation
        : hasApprovedOverride
        ? 'Audited mark override approved by Super Administrator.'
        : hasAnyOverride
        ? 'Faculty mark override recorded in system.'
        : undefined;

      const recordId = `acad-${studentAdmission.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${course.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      const existingIndex = records.findIndex(
        (r) =>
          r.compositePrimaryKey === compositeKey ||
          (r.studentAdmission.trim().toUpperCase() === studentAdmission &&
            r.course.trim().toUpperCase() === course) ||
          (sub.id && r.submissionId === sub.id)
      );

      const now = new Date().toISOString();
      const submissionDate = sub.submittedAt || sub.startedAt || now;
      const periodYear = new Date(submissionDate).getFullYear();
      const period = `${periodYear}/${periodYear + 1} Academic Session`;

      if (existingIndex !== -1) {
        // Update existing record dynamically
        const existing = records[existingIndex];
        const isDifferent =
          existing.score !== score ||
          existing.percentage !== percentage ||
          existing.grade !== grade ||
          existing.status !== status ||
          existing.compositePrimaryKey !== compositeKey;

        if (isDifferent) {
          records[existingIndex] = {
            ...existing,
            compositePrimaryKey: compositeKey,
            studentAdmission,
            studentName,
            course,
            unitName,
            score,
            totalPoints,
            percentage,
            grade,
            department,
            faculty,
            status,
            period: existing.period || period,
            lastModifiedAt: now,
            modifiedReason: modifiedReason || existing.modifiedReason,
            submissionId: sub.id,
            examId: sub.examId,
            approvedAt: existing.approvedAt || now,
            approvedBy: existing.approvedBy || (sub.committedBy ? `${sub.committedBy} (Approved)` : 'Super Admin Directorate'),
          };
          hasChanges = true;
        }
      } else {
        // Insert new record dynamically into the database
        records.push({
          id: recordId,
          compositePrimaryKey: compositeKey,
          studentAdmission,
          studentName,
          course,
          unitName,
          score,
          totalPoints,
          percentage,
          grade,
          department,
          faculty,
          status,
          period,
          recordedAt: sub.submittedAt || now,
          approvedAt: now,
          approvedBy: sub.committedBy ? `${sub.committedBy} (Approved)` : 'Super Admin Directorate',
          submissionId: sub.id,
          examId: sub.examId,
          modifiedReason,
        });
        hasChanges = true;
      }
    });

    if (hasChanges || !raw) {
      safeLocalStorageSet(STORAGE_KEYS.ACADEMIC_DATABASE, JSON.stringify(records));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('examguard_academic_database_updated', { detail: { records } })
        );
      }
    }

    return records;
  } catch {
    return INITIAL_ACADEMIC_RECORDS;
  }
}

export function getStoredAcademicRecords(): AcademicRecord[] {
  try {
    return syncAcademicDatabaseWithSubmissions();
  } catch {
    return INITIAL_ACADEMIC_RECORDS;
  }
}

export function saveStoredAcademicRecords(records: AcademicRecord[]): void {
  try {
    safeLocalStorageSet(STORAGE_KEYS.ACADEMIC_DATABASE, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examguard_academic_database_updated', { detail: { records } })
      );
    }
  } catch (e) {
    console.error('[storageService] Failed to save academic records:', e);
  }
}

export function addAcademicRecord(
  data: Omit<AcademicRecord, 'id' | 'recordedAt' | 'compositePrimaryKey'>
): { success: boolean; record?: AcademicRecord; error?: string } {
  if (!data.studentAdmission || !data.studentAdmission.trim()) {
    return { success: false, error: 'Student Admission Number (Primary Key 1/2) is strictly required.' };
  }
  if (!data.course || !data.course.trim()) {
    return { success: false, error: 'Course Code (Primary Key 2/2) is strictly required.' };
  }
  if (!data.unitName || !data.unitName.trim()) {
    return { success: false, error: 'Units Name is required.' };
  }
  if (!data.department || !data.department.trim()) {
    return { success: false, error: 'Department is required.' };
  }

  const records = getStoredAcademicRecords();
  const normAdmission = data.studentAdmission.trim().toUpperCase();
  const normCourse = data.course.trim().toUpperCase();
  const compositeKey = buildCompositeKey(normAdmission, normCourse);

  // Enforce Composite Primary Key Integrity Constraint:
  // A single student can sit for several different units (different course codes),
  // but CANNOT have duplicate records for the exact same unit.
  const exists = records.some(
    (r) =>
      r.compositePrimaryKey === compositeKey ||
      (r.studentAdmission.trim().toUpperCase() === normAdmission &&
        r.course.trim().toUpperCase() === normCourse)
  );
  if (exists) {
    return {
      success: false,
      error: `Integrity Constraint Violation: An academic record for Composite Primary Key [${normAdmission} # ${normCourse}] already exists. A student can enroll in multiple units, but cannot have duplicate entries for the exact same unit.`,
    };
  }

  const totalPoints = data.totalPoints || 100;
  const score = Number(data.score) || 0;
  const percentage = data.percentage != null
    ? data.percentage
    : totalPoints > 0
    ? Math.round((score / totalPoints) * 100)
    : 0;
  const grade = data.grade || calculateAcademicGrade(percentage);

  const newRecord: AcademicRecord = {
    ...data,
    id: `acad-${normAdmission.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${normCourse.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
    compositePrimaryKey: compositeKey,
    studentAdmission: normAdmission,
    course: normCourse,
    unitName: data.unitName.trim(),
    score,
    totalPoints,
    percentage,
    grade,
    department: data.department.trim(),
    status: data.status || 'approved',
    period: data.period || '2025/2026 Academic Session',
    recordedAt: new Date().toISOString(),
    approvedAt: data.approvedAt || new Date().toISOString(),
    approvedBy: data.approvedBy || 'Super Admin Directorate',
  };

  const updated = [newRecord, ...records];
  saveStoredAcademicRecords(updated);

  triggerFlash({
    type: 'success',
    text: 'Academic Record Created',
    subtext: `Composite PK [${normAdmission} # ${normCourse}] registered in Admin Database.`,
  });

  return { success: true, record: newRecord };
}

export function updateAcademicRecord(
  id: string,
  updates: Partial<AcademicRecord>
): { success: boolean; record?: AcademicRecord; error?: string } {
  const records = getStoredAcademicRecords();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return { success: false, error: 'Academic record not found in database.' };
  }

  const existing = records[index];
  const newAdmission = (updates.studentAdmission || existing.studentAdmission).trim().toUpperCase();
  const newCourse = (updates.course || existing.course).trim().toUpperCase();
  const newCompositeKey = buildCompositeKey(newAdmission, newCourse);

  // If changing admission or course, ensure no collision with another record's composite key
  if (newCompositeKey !== existing.compositePrimaryKey) {
    const collision = records.some(
      (r) =>
        r.id !== id &&
        (r.compositePrimaryKey === newCompositeKey ||
          (r.studentAdmission.trim().toUpperCase() === newAdmission &&
            r.course.trim().toUpperCase() === newCourse))
    );
    if (collision) {
      return {
        success: false,
        error: `Integrity Constraint Violation: Cannot update to [${newAdmission} # ${newCourse}] because another record already exists with this Composite Primary Key.`,
      };
    }
  }

  const totalPoints = updates.totalPoints != null ? updates.totalPoints : existing.totalPoints;
  const score = updates.score != null ? Number(updates.score) : existing.score;
  const percentage = updates.percentage != null
    ? updates.percentage
    : totalPoints > 0
    ? Math.round((score / totalPoints) * 100)
    : existing.percentage;
  const grade = updates.grade || calculateAcademicGrade(percentage);

  const updatedRecord: AcademicRecord = {
    ...existing,
    ...updates,
    studentAdmission: newAdmission,
    course: newCourse,
    compositePrimaryKey: newCompositeKey,
    score,
    totalPoints,
    percentage,
    grade,
    lastModifiedAt: new Date().toISOString(),
    status: updates.status || (score !== existing.score ? 'modified' : existing.status),
  };

  records[index] = updatedRecord;
  saveStoredAcademicRecords(records);

  triggerFlash({
    type: 'success',
    text: 'Academic Record Updated',
    subtext: `Result for Composite PK [${newCompositeKey}] modified and updated immediately.`,
  });

  return { success: true, record: updatedRecord };
}

export function deleteAcademicRecord(id: string): { success: boolean; error?: string } {
  const records = getStoredAcademicRecords();
  const target = records.find((r) => r.id === id);
  if (!target) {
    return { success: false, error: 'Record not found in academic database.' };
  }

  const filtered = records.filter((r) => r.id !== id);
  saveStoredAcademicRecords(filtered);

  triggerFlash({
    type: 'info',
    text: 'Academic Record Deleted',
    subtext: `Record for Admission ${target.studentAdmission} (${target.course}) removed from database.`,
  });

  return { success: true };
}

export function deleteAcademicRecordsByAdmission(
  studentAdmission: string
): { success: boolean; deletedCount: number } {
  const records = getStoredAcademicRecords();
  const normAdmission = studentAdmission.trim().toUpperCase();
  const beforeCount = records.length;
  const filtered = records.filter(
    (r) => r.studentAdmission.trim().toUpperCase() !== normAdmission
  );
  const deletedCount = beforeCount - filtered.length;

  if (deletedCount > 0) {
    saveStoredAcademicRecords(filtered);
    triggerFlash({
      type: 'info',
      text: 'Student Admission Records Cleared',
      subtext: `Deleted ${deletedCount} record(s) associated with Admission ${normAdmission}.`,
    });
  }

  return { success: true, deletedCount };
}

export function resetToDefaults(): void {
  localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTION_BANK));
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(INITIAL_TEACHERS));
  localStorage.setItem(STORAGE_KEYS.HELP_TICKETS, JSON.stringify(INITIAL_HELP_TICKETS));
  localStorage.setItem(STORAGE_KEYS.MISSED_EXAMS, JSON.stringify(INITIAL_MISSED_EXAMS));
  localStorage.setItem(STORAGE_KEYS.RESIT_REQUESTS, JSON.stringify(INITIAL_RESIT_REQUESTS));
  localStorage.setItem(STORAGE_KEYS.ACADEMIC_DATABASE, JSON.stringify(INITIAL_ACADEMIC_RECORDS));
}

