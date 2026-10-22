import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { createServer as createHttpServer } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function listenWithPortFallback(startPort: number) {
  return new Promise<{ server: ReturnType<typeof createHttpServer>; port: number }>((resolve, reject) => {
    const tryListen = (port: number) => {
      if (port > 65535) {
        reject(new Error('No available port found. Set PORT to an available port and try again.'));
        return;
      }

      const server = createHttpServer(app);
      const handleError = (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[ExamGuard Pro Server] Port ${port} is in use; trying port ${port + 1}.`);
          tryListen(port + 1);
          return;
        }
        reject(err);
      };

      server.once('error', handleError);
      server.listen(port, '0.0.0.0', () => {
        server.off('error', handleError);
        resolve({ server, port });
      });
    };

    tryListen(startPort);
  });
}

app.use(cors());
app.use(express.json());

// In-memory initial academic database for backend API
const BACKEND_STUDENTS = [
  {
    id: 'student-alex',
    name: 'Alex Chen',
    email: 'alex.chen@student.university.edu',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    studentNumber: 'ADM-CS-2026-084',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Computer Science (Honors)',
    admissionYear: '2023',
    academicStanding: 'Dean\'s Honor Roll · Academic Distinction',
    gpa: '3.92 / 4.00',
    creditsCompleted: 88,
    attendanceRate: '98.5%',
    clearanceStatus: 'Verified & Cleared for Invigilation',
    enrolledCourseCodes: ['CS-405', 'CS-301', 'CYBER-501'],
  },
  {
    id: 'student-liam',
    name: 'Liam Cooper',
    email: 'liam.cooper@student.university.edu',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    studentNumber: 'ADM-CS-2026-112',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Software Engineering',
    admissionYear: '2023',
    academicStanding: 'Good Standing',
    gpa: '3.65 / 4.00',
    creditsCompleted: 84,
    attendanceRate: '96.2%',
    clearanceStatus: 'Verified & Cleared for Invigilation',
    enrolledCourseCodes: ['CS-405', 'CS-301'],
  },
  {
    id: 'student-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@student.university.edu',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    studentNumber: 'ADM-MATH-2026-045',
    department: 'Department of Mathematics & Statistics',
    faculty: 'Faculty of Natural & Applied Sciences',
    program: 'B.Sc. Pure Mathematics & Computational Science',
    admissionYear: '2024',
    academicStanding: 'First Class Standing',
    gpa: '3.96 / 4.00',
    creditsCompleted: 60,
    attendanceRate: '99.1%',
    clearanceStatus: 'Verified & Cleared for Invigilation',
    enrolledCourseCodes: ['MATH-210'],
  },
  {
    id: 'student-marcus',
    name: 'Marcus Brody',
    email: 'marcus.brody@student.university.edu',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    studentNumber: 'ADM-ECE-2026-093',
    department: 'School of Electronic & Computer Engineering',
    faculty: 'Faculty of Engineering & Architecture',
    program: 'B.Eng. Computer Systems Engineering',
    admissionYear: '2023',
    academicStanding: 'Good Standing',
    gpa: '3.70 / 4.00',
    creditsCompleted: 92,
    attendanceRate: '97.0%',
    clearanceStatus: 'Verified & Cleared for Invigilation',
    enrolledCourseCodes: ['ECE-310'],
  },
];

const BACKEND_TEACHERS = [
  {
    id: 'teacher-1',
    name: 'Prof. Evelyn Vance',
    title: 'Professor of Computer Science & Information Security',
    staffId: 'FAC-CS-8902',
    email: 'e.vance@university.edu',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    office: 'Turing Hall, Room 412B',
    appointmentYear: '2016',
    assignedCourseCodes: ['CS-405', 'CS-301'],
    accessStatus: 'active',
    securityClearance: 'Level 4 · Chief Academic Invigilator',
    rights: {
      canCreateExams: true,
      canGradeMarks: true,
      canAdmitStudents: true,
      canDeleteExams: false,
      canExportSubmissions: true,
    },
  },
  {
    id: 'teacher-2',
    name: 'Dr. Arthur Pendelton',
    title: 'Senior Lecturer in Pure Mathematics & Formal Verification',
    staffId: 'FAC-MATH-6541',
    email: 'a.pendelton@university.edu',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    department: 'Department of Mathematics & Statistics',
    faculty: 'Faculty of Natural & Applied Sciences',
    office: 'Euler Science Building, Room 204',
    appointmentYear: '2019',
    assignedCourseCodes: ['MATH-210'],
    accessStatus: 'active',
    securityClearance: 'Level 3 · Academic Examiner',
    rights: {
      canCreateExams: true,
      canGradeMarks: true,
      canAdmitStudents: true,
      canDeleteExams: false,
      canExportSubmissions: true,
    },
  },
  {
    id: 'teacher-3',
    name: 'Dr. Sarah Lin',
    title: 'Associate Professor of Cybersecurity & Network Forensics',
    staffId: 'FAC-CYBER-7712',
    email: 's.lin@university.edu',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    office: 'Cyber Defence Laboratory, Suite 10',
    appointmentYear: '2021',
    assignedCourseCodes: ['CYBER-501', 'CS-405'],
    accessStatus: 'pending',
    securityClearance: 'Level 2 · Pending Security Audit',
    rights: {
      canCreateExams: false,
      canGradeMarks: false,
      canAdmitStudents: false,
      canDeleteExams: false,
      canExportSubmissions: false,
    },
  },
  {
    id: 'teacher-4',
    name: 'Dr. Tariq Al-Mansoor',
    title: 'Lecturer in Distributed Systems & VLSI Design',
    staffId: 'FAC-ECE-4180',
    email: 't.mansoor@university.edu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    department: 'School of Electronic & Computer Engineering',
    faculty: 'Faculty of Engineering & Architecture',
    office: 'Maxwell Engineering Complex, Lab 3',
    appointmentYear: '2022',
    assignedCourseCodes: ['ECE-310'],
    accessStatus: 'suspended',
    securityClearance: 'Suspended Access',
    rights: {
      canCreateExams: false,
      canGradeMarks: false,
      canAdmitStudents: false,
      canDeleteExams: false,
      canExportSubmissions: false,
    },
  },
];

// In-memory committed results map: submissionId -> commitment meta
interface CommittedResult {
  committedAt: string;
  committedBy: string;
  score: number;
  totalPoints: number;
  percentage: number;
}

const COMMITTED_RESULTS: Record<string, CommittedResult> = {};
const COMMITTED_MARK_CHANGE_AUDIT: Record<
  string,
  { requestId: string; action: 'approve' | 'reject'; reviewedBy: string; note: string; reviewedAt: string }[]
> = {};

interface BackendExamMetadata {
  faculty?: string;
  facultyCode: string;
  location?: string;
  roomNumber?: string;
}

const BACKEND_EXAMS: Record<string, BackendExamMetadata> = {};

// In-memory waiting rooms: examId -> candidate list
const EXAM_WAITING_ROOMS: Record<string, { studentId: string; studentName: string; studentNumber: string; enteredAt: string }[]> = {};
const EXAM_ADMITTED_STUDENTS: Record<string, string[]> = {};

function deriveFacultyCode(faculty: string): string {
  return faculty
    .replace(/^Faculty of /i, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function isValidCommittedScore(score: unknown, totalPoints: unknown, percentage: unknown): boolean {
  if (
    typeof score !== 'number' ||
    typeof totalPoints !== 'number' ||
    typeof percentage !== 'number' ||
    ![score, totalPoints, percentage].every(Number.isFinite) ||
    score < 0 ||
    totalPoints < 0 ||
    percentage < 0 ||
    percentage > 100 ||
    score > totalPoints
  ) {
    return false;
  }
  const expectedPercentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  return percentage === expectedPercentage;
}

// -------------------------------------------------------------
// BACKEND API ROUTES
// -------------------------------------------------------------

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ExamGuard Pro University Academic Assessment Backend API',
    serverTime: new Date().toISOString(),
  });
});

// 2. Students List & Profile
app.get('/api/students', (req: Request, res: Response) => {
  res.json({ success: true, data: BACKEND_STUDENTS });
});

app.get('/api/students/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const student = BACKEND_STUDENTS.find(
    (s) =>
      s.id.toLowerCase() === target ||
      s.studentNumber.toLowerCase() === target ||
      s.email.toLowerCase() === target ||
      s.name.toLowerCase() === target
  );
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student candidate not found in institutional registry.' });
  }
  res.json({ success: true, data: student });
});

// 3. Student Dashboard Backend Hue & Stats
app.get('/api/student-portal/stats/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const student =
    BACKEND_STUDENTS.find(
      (s) =>
        s.id.toLowerCase() === target ||
        s.studentNumber.toLowerCase() === target ||
        s.email.toLowerCase() === target ||
        s.name.toLowerCase() === target
    ) || BACKEND_STUDENTS[0];

  res.json({
    success: true,
    data: {
      studentId: student.id,
      name: student.name,
      studentNumber: student.studentNumber,
      department: student.department,
      faculty: student.faculty,
      program: student.program,
      academicStanding: student.academicStanding,
      gpa: student.gpa,
      creditsCompleted: student.creditsCompleted,
      attendanceRate: student.attendanceRate,
      clearanceStatus: student.clearanceStatus,
      enrolledCourseCodes: student.enrolledCourseCodes,
      serverTimestamp: new Date().toISOString(),
    },
  });
});

// 4. Teachers List & Profile
app.get('/api/teachers', (req: Request, res: Response) => {
  res.json({ success: true, data: BACKEND_TEACHERS });
});

app.post('/api/teachers', (req: Request, res: Response) => {
  const newTeacher = req.body;
  if (!newTeacher.id) {
    newTeacher.id = `teacher-${Date.now()}`;
  }
  const existingIdx = BACKEND_TEACHERS.findIndex(
    (t) => t.id === newTeacher.id || t.email?.toLowerCase() === newTeacher.email?.toLowerCase()
  );
  if (existingIdx !== -1) {
    BACKEND_TEACHERS[existingIdx] = { ...BACKEND_TEACHERS[existingIdx], ...newTeacher };
    return res.json({ success: true, message: 'Teacher updated', data: BACKEND_TEACHERS[existingIdx] });
  }
  BACKEND_TEACHERS.unshift(newTeacher);
  res.json({ success: true, message: 'Teacher created', data: newTeacher });
});

app.put('/api/teachers/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const index = BACKEND_TEACHERS.findIndex((t) => t.id.toLowerCase() === target);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Teacher not found' });
  }
  BACKEND_TEACHERS[index] = { ...BACKEND_TEACHERS[index], ...req.body };
  res.json({ success: true, message: 'Teacher updated successfully', data: BACKEND_TEACHERS[index] });
});

// Update or add student
app.post('/api/students', (req: Request, res: Response) => {
  const newStudent = req.body;
  if (!newStudent.id) {
    newStudent.id = `student-${Date.now()}`;
  }
  const existingIdx = BACKEND_STUDENTS.findIndex(
    (s) => s.id === newStudent.id || s.email?.toLowerCase() === newStudent.email?.toLowerCase()
  );
  if (existingIdx !== -1) {
    BACKEND_STUDENTS[existingIdx] = { ...BACKEND_STUDENTS[existingIdx], ...newStudent };
    return res.json({ success: true, message: 'Student updated', data: BACKEND_STUDENTS[existingIdx] });
  }
  BACKEND_STUDENTS.unshift(newStudent);
  res.json({ success: true, message: 'Student registered', data: newStudent });
});

app.put('/api/students/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const index = BACKEND_STUDENTS.findIndex((s) => s.id.toLowerCase() === target);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Student not found' });
  }
  BACKEND_STUDENTS[index] = { ...BACKEND_STUDENTS[index], ...req.body };
  res.json({ success: true, message: 'Student updated successfully', data: BACKEND_STUDENTS[index] });
});

// Update user password in institutional database
app.post('/api/users/change-password', (req: Request, res: Response) => {
  const { role, email, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Invalid password. Must be at least 6 characters.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (role === 'teacher') {
    const tIdx = BACKEND_TEACHERS.findIndex((t) => t.email.toLowerCase() === normalizedEmail);
    if (tIdx !== -1) {
      (BACKEND_TEACHERS[tIdx] as any).lastPasswordChangedAt = now;
    }
  } else if (role === 'student') {
    const sIdx = BACKEND_STUDENTS.findIndex((s) => s.email.toLowerCase() === normalizedEmail);
    if (sIdx !== -1) {
      (BACKEND_STUDENTS[sIdx] as any).lastPasswordChangedAt = now;
    }
  }

  res.json({
    success: true,
    message: 'Institutional password updated successfully.',
    data: { email: normalizedEmail, role, lastPasswordChangedAt: now },
  });
});

app.get('/api/teachers/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const teacher = BACKEND_TEACHERS.find(
    (t) =>
      t.id.toLowerCase() === target ||
      t.email.toLowerCase() === target ||
      t.staffId.toLowerCase() === target ||
      t.name.toLowerCase() === target
  );
  if (!teacher) {
    return res.status(404).json({ success: false, error: 'Faculty member not found in institutional directory.' });
  }
  res.json({ success: true, data: teacher });
});

// 5. Teacher Hue Section Info
app.get('/api/teacher-portal/info/:id', (req: Request, res: Response) => {
  const target = req.params.id.toLowerCase();
  const teacher =
    BACKEND_TEACHERS.find(
      (t) =>
        t.id.toLowerCase() === target ||
        t.email.toLowerCase() === target ||
        t.staffId.toLowerCase() === target ||
        t.name.toLowerCase() === target
    ) || BACKEND_TEACHERS[0];

  res.json({
    success: true,
    data: {
      teacherId: teacher.id,
      name: teacher.name,
      staffId: teacher.staffId,
      title: teacher.title,
      department: teacher.department,
      faculty: teacher.faculty,
      office: teacher.office,
      assignedCourseCodes: teacher.assignedCourseCodes,
      accessStatus: teacher.accessStatus,
      securityClearance: teacher.securityClearance,
      rights: teacher.rights,
      serverTimestamp: new Date().toISOString(),
    },
  });
});

// 6. Commit Result to Student Portal
app.post('/api/submissions/:id/commit-result', (req: Request, res: Response) => {
  const submissionId = req.params.id;
  const { instructorName = 'Faculty Invigilator', score, totalPoints, percentage } = req.body;
  if (!isValidCommittedScore(score, totalPoints, percentage)) {
    return res.status(400).json({ success: false, error: 'Valid score, total points, and percentage are required.' });
  }
  const committed = COMMITTED_RESULTS[submissionId];
  if (committed) {
    return res.json({
      success: true,
      message: 'Result was already committed.',
      data: { submissionId, isResultCommitted: true, ...committed },
    });
  }

  COMMITTED_RESULTS[submissionId] = {
    committedAt: new Date().toISOString(),
    committedBy: instructorName,
    score,
    totalPoints,
    percentage,
  };

  res.json({
    success: true,
    message: `Result committed to student portal successfully by ${instructorName}.`,
    data: {
      submissionId,
      isResultCommitted: true,
      committedAt: COMMITTED_RESULTS[submissionId].committedAt,
      committedBy: instructorName,
    },
  });
});

app.post('/api/exams/:examId/commit-results', (req: Request, res: Response) => {
  const { examId } = req.params;
  const { instructorName = 'Faculty Invigilator', submissions } = req.body;
  if (!Array.isArray(submissions)) {
    return res.status(400).json({ success: false, error: 'A list of graded submissions is required.' });
  }
  if (
    submissions.some(
      (submission: any) =>
        typeof submission.submissionId !== 'string' ||
        !isValidCommittedScore(submission.score, submission.totalPoints, submission.percentage)
    )
  ) {
    return res.status(400).json({ success: false, error: 'Every result must contain valid score values.' });
  }

  const committedAt = new Date().toISOString();
  submissions.forEach((submission: { submissionId: string; score: number; totalPoints: number; percentage: number }) => {
    if (!COMMITTED_RESULTS[submission.submissionId]) {
      COMMITTED_RESULTS[submission.submissionId] = {
        committedAt,
        committedBy: instructorName,
        score: submission.score,
        totalPoints: submission.totalPoints,
        percentage: submission.percentage,
      };
    }
  });
  res.json({ success: true, data: { examId, committedAt, count: submissions.length } });
});

// 7. Check Result Commitment Status
app.get('/api/submissions/:id/commitment-status', (req: Request, res: Response) => {
  const submissionId = req.params.id;
  const committed = COMMITTED_RESULTS[submissionId];
  res.json({
    success: true,
    data: {
      submissionId,
      isResultCommitted: Boolean(committed),
      committedAt: committed?.committedAt || null,
      committedBy: committed?.committedBy || null,
      score: committed?.score ?? null,
      totalPoints: committed?.totalPoints ?? null,
      percentage: committed?.percentage ?? null,
    },
  });
});

app.post('/api/submissions/:id/committed-mark-review', (req: Request, res: Response) => {
  const submissionId = req.params.id;
  const {
    requestId,
    action,
    reviewedBy,
    note,
    score,
    totalPoints,
    percentage,
  } = req.body;
  if (
    typeof requestId !== 'string' ||
    !requestId.trim() ||
    (action !== 'approve' && action !== 'reject') ||
    typeof reviewedBy !== 'string' ||
    !reviewedBy.trim() ||
    typeof note !== 'string' ||
    !note.trim()
  ) {
    return res.status(400).json({ success: false, error: 'A valid review action, reviewer, request ID, and written note are required.' });
  }
  if (action === 'approve' && !isValidCommittedScore(score, totalPoints, percentage)) {
    return res.status(400).json({ success: false, error: 'Approved score values are invalid.' });
  }

  const reviewedAt = new Date().toISOString();
  if (action === 'approve') {
    const previous = COMMITTED_RESULTS[submissionId];
    COMMITTED_RESULTS[submissionId] = {
      committedAt: previous?.committedAt || reviewedAt,
      committedBy: previous?.committedBy || reviewedBy,
      score,
      totalPoints,
      percentage,
    };
  }
  if (!COMMITTED_MARK_CHANGE_AUDIT[submissionId]) {
    COMMITTED_MARK_CHANGE_AUDIT[submissionId] = [];
  }
  COMMITTED_MARK_CHANGE_AUDIT[submissionId].push({
    requestId,
    action,
    reviewedBy,
    note: note.trim(),
    reviewedAt,
  });
  res.json({ success: true, data: { submissionId, action, reviewedAt } });
});

// Exam logistics are owned by the backend and returned to admission clients.
app.get('/api/exams/:examId', (req: Request, res: Response) => {
  const exam = BACKEND_EXAMS[req.params.examId];
  if (!exam) {
    return res.status(404).json({ success: false, error: 'Exam details not found.' });
  }
  res.json({ success: true, data: exam });
});

app.put('/api/exams/:examId', (req: Request, res: Response) => {
  const { examId } = req.params;
  const { faculty, facultyCode, location, roomNumber } = req.body;
  const existing = BACKEND_EXAMS[examId];
  const nextFaculty = typeof faculty === 'string' && faculty.trim() ? faculty.trim() : existing?.faculty;

  BACKEND_EXAMS[examId] = {
    faculty: nextFaculty,
    facultyCode:
      typeof facultyCode === 'string' && facultyCode.trim()
        ? facultyCode.trim().toUpperCase()
        : typeof faculty === 'string' && faculty.trim()
          ? deriveFacultyCode(nextFaculty || '')
          : existing?.facultyCode || deriveFacultyCode(nextFaculty || ''),
    location: typeof location === 'string' ? location.trim() : existing?.location,
    roomNumber: typeof roomNumber === 'string' ? roomNumber.trim() : existing?.roomNumber,
  };

  res.json({ success: true, data: { examId, ...BACKEND_EXAMS[examId] } });
});

// 8. Real-time Waiting Room: Student Joins Lobby after password verification
app.post('/api/exams/:examId/waiting-room', (req: Request, res: Response) => {
  const { examId } = req.params;
  const { studentId, studentName = 'Student Candidate', studentNumber = 'ADM-CS-2026' } = req.body;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return res.status(400).json({ success: false, error: 'A student ID is required.' });
  }
  if ((EXAM_ADMITTED_STUDENTS[examId] || []).includes(studentId)) {
    return res.json({ success: true, message: 'Candidate is already admitted.', data: { examId } });
  }

  if (!EXAM_WAITING_ROOMS[examId]) {
    EXAM_WAITING_ROOMS[examId] = [];
  }

  const existingIdx = EXAM_WAITING_ROOMS[examId].findIndex((c) => c.studentId === studentId);
  const entry = {
    studentId,
    studentName,
    studentNumber,
    enteredAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    EXAM_WAITING_ROOMS[examId][existingIdx] = entry;
  } else {
    EXAM_WAITING_ROOMS[examId].push(entry);
  }

  res.json({
    success: true,
    message: 'Candidate entered waiting room lobby.',
    data: {
      examId,
      waitingCount: EXAM_WAITING_ROOMS[examId].filter(
        (candidate) => !(EXAM_ADMITTED_STUDENTS[examId] || []).includes(candidate.studentId)
      ).length,
      candidates: EXAM_WAITING_ROOMS[examId].filter(
        (candidate) => !(EXAM_ADMITTED_STUDENTS[examId] || []).includes(candidate.studentId)
      ),
    },
  });
});

// 9. Real-time Waiting Room: Fetch Waiting Candidates and Admission Status
app.get('/api/exams/:examId/waiting-room', (req: Request, res: Response) => {
  const { examId } = req.params;
  const admitted = EXAM_ADMITTED_STUDENTS[examId] || [];
  const candidateRecords = EXAM_WAITING_ROOMS[examId] || [];
  const candidates = candidateRecords.filter(
    (candidate) => !admitted.includes(candidate.studentId)
  );

  res.json({
    success: true,
    data: {
      examId,
      waitingCandidates: candidates,
      candidateRecords,
      admittedStudentIds: admitted,
      serverTime: new Date().toISOString(),
    },
  });
});

// 10. Teacher Admits Candidate into Exam Room
app.post('/api/exams/:examId/admit', (req: Request, res: Response) => {
  const { examId } = req.params;
  const { studentId } = req.body;

  if (typeof studentId !== 'string' || !studentId.trim()) {
    return res.status(400).json({ success: false, error: 'A student ID is required.' });
  }
  if (!EXAM_ADMITTED_STUDENTS[examId]) {
    EXAM_ADMITTED_STUDENTS[examId] = [];
  }

  if (!EXAM_ADMITTED_STUDENTS[examId].includes(studentId)) {
    EXAM_ADMITTED_STUDENTS[examId].push(studentId);
  }
  res.json({
    success: true,
    message: `Candidate ${studentId} admitted to examination.`,
    data: {
      examId,
      admittedStudentIds: EXAM_ADMITTED_STUDENTS[examId],
    },
  });
});

// 11. Teacher Admits All Waiting Candidates
app.post('/api/exams/:examId/admit-all', (req: Request, res: Response) => {
  const { examId } = req.params;
  const requestedIds = Array.isArray(req.body.studentIds)
    ? req.body.studentIds.filter(
        (id: unknown): id is string => typeof id === 'string' && Boolean(id.trim())
      )
    : [];
  const waiting = (EXAM_WAITING_ROOMS[examId] || []).map((c) => c.studentId);
  const admittedNow = Array.from(new Set([...waiting, ...requestedIds]));

  if (!EXAM_ADMITTED_STUDENTS[examId]) {
    EXAM_ADMITTED_STUDENTS[examId] = [];
  }

  EXAM_ADMITTED_STUDENTS[examId] = Array.from(
    new Set([...EXAM_ADMITTED_STUDENTS[examId], ...admittedNow])
  );
  res.json({
    success: true,
    message: 'All waiting candidates admitted to examination.',
    data: {
      examId,
      admittedStudentIds: EXAM_ADMITTED_STUDENTS[examId],
    },
  });
});

app.delete('/api/exams/:examId/admit/:studentId', (req: Request, res: Response) => {
  const { examId, studentId } = req.params;
  EXAM_ADMITTED_STUDENTS[examId] = (EXAM_ADMITTED_STUDENTS[examId] || []).filter(
    (id) => id !== studentId
  );
  res.json({
    success: true,
    data: { examId, admittedStudentIds: EXAM_ADMITTED_STUDENTS[examId] },
  });
});

// -------------------------------------------------------------
// VITE MIDDLEWARE SETUP & SERVER BOOTSTRAP
// -------------------------------------------------------------
async function startServer() {
  const isStandaloneApi = process.env.STANDALONE_API === 'true';
  const isProd = process.env.NODE_ENV === 'production';
  const { server, port } = await listenWithPortFallback(PORT);

  if (isStandaloneApi) {
    console.log(`[ExamGuard Pro Server] Running in STANDALONE API mode on port ${port}`);
  } else if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port,
        ws: { server },
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  console.log(`[ExamGuard Pro Server] Running on http://localhost:${port} (${isStandaloneApi ? 'API Server' : 'Full-stack Express + Vite'})`);
}

startServer().catch((err) => {
  console.error('[ExamGuard Pro Server] Startup failed:', err);
  process.exit(1);
});
