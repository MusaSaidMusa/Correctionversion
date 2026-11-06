import {
  Exam,
  Question,
  ExamSubmission,
  StudentProfile,
  TeacherProfile,
  HelpTicket,
  Course,
  AuthUser,
  MissedExamRecord,
  ResitRequest,
} from '../types';

export const SUPER_ADMIN: AuthUser = {
  id: 'admin-marcus',
  name: 'Dr. Marcus Sterling',
  email: 'admin@university.edu',
  role: 'admin',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  title: 'Institutional Examination Registrar & Super Administrator',
  department: 'Office of Academic Affairs & Examinations',
  faculty: 'Directorate of Academic Standards & Quality Assurance',
  accessStatus: 'active',
  phone: '+1 (555) 019-4820',
  bio: 'Oversees college-wide examination governance at Rifkins Education College, proctoring security protocols, academic integrity standards, and official marks audit.',
  officeLocation: 'Administration Complex, Senate Wing 4B',
};

export const CURRENT_TEACHER: TeacherProfile = {
  id: 'teacher-evelyn',
  name: 'Prof. Evelyn Vance',
  title: 'Professor & Chair of Computer Science',
  staffId: 'FAC-ENG-8492',
  email: 'e.vance@university.edu',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  department: 'Computer Science & Software Engineering',
  faculty: 'Faculty of Computing & Information Technologies',
  office: 'Turing Hall, Room 314',
  appointmentYear: '2016',
  assignedCourseCodes: ['CS401', 'CS302', 'CYBER201'],
  accessStatus: 'active',
  securityClearance: 'Level IV - Chief Examination Invigilator',
  rights: {
    canCreateExams: true,
    canGradeMarks: true,
    canAdmitStudents: true,
    canDeleteExams: false,
    canExportSubmissions: true,
  },
  phone: '+1 (555) 392-8814',
  bio: 'Specialist in distributed consensus algorithms, fault-tolerant network topologies, and algorithmic verification.',
  registeredAt: '2024-01-15T08:00:00.000Z',
};

export const INITIAL_TEACHERS: TeacherProfile[] = [
  CURRENT_TEACHER,
  {
    id: 'teacher-david',
    name: 'Dr. David Chen',
    title: 'Associate Professor of Cryptography',
    staffId: 'FAC-CIT-9104',
    email: 'd.chen@university.edu',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    office: 'Shannon Tower, Room 208',
    appointmentYear: '2019',
    assignedCourseCodes: ['CYBER201', 'CS302'],
    accessStatus: 'active',
    securityClearance: 'Level III - Senior Invigilator',
    rights: {
      canCreateExams: true,
      canGradeMarks: true,
      canAdmitStudents: true,
      canDeleteExams: false,
      canExportSubmissions: true,
    },
    phone: '+1 (555) 749-2041',
    bio: 'Researches zero-knowledge proofs, post-quantum asymmetric cryptography, and authentication protocols.',
    registeredAt: '2024-02-01T08:00:00.000Z',
  },
];

export const INITIAL_STUDENTS: StudentProfile[] = [
  {
    id: 'student-alex',
    name: 'Alex Rivera',
    email: 'alex.rivera@student.edu',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    studentNumber: 'MSA-2026/8-2041',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Computer Science (Honours)',
    admissionYear: '2023',
    academicStanding: 'Dean’s Honor List',
    gpa: '3.88',
    creditsCompleted: 78,
    attendanceRate: '98.5%',
    clearanceStatus: 'Financial & Academic Cleared',
    enrolledCourseCodes: ['CS401', 'CS302', 'CYBER201'],
    accessStatus: 'active',
    phone: '+1 (555) 482-1983',
    bio: 'Junior undergraduate researching distributed systems and high-throughput databases.',
  },
  {
    id: 'student-maya',
    name: 'Maya Lin',
    email: 'maya.lin@student.edu',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    studentNumber: 'MSA-2026/7-1982',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Software Engineering',
    admissionYear: '2023',
    academicStanding: 'Good Standing',
    gpa: '3.72',
    creditsCompleted: 74,
    attendanceRate: '96.0%',
    clearanceStatus: 'Financial & Academic Cleared',
    enrolledCourseCodes: ['CS401', 'CS302'],
    accessStatus: 'active',
    phone: '+1 (555) 918-3829',
    bio: 'Passionate about secure software architecture and web applications.',
  },
  {
    id: 'student-sam',
    name: 'Samuel K. Ochieng',
    email: 'sam.ochieng@student.edu',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    studentNumber: 'MSA-2026/6-3045',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    program: 'B.Sc. Cybersecurity & Digital Forensics',
    admissionYear: '2022',
    academicStanding: 'Dean’s Honor List',
    gpa: '3.91',
    creditsCompleted: 92,
    attendanceRate: '99.0%',
    clearanceStatus: 'Financial & Academic Cleared',
    enrolledCourseCodes: ['CS401', 'CYBER201'],
    accessStatus: 'active',
    phone: '+1 (555) 203-9182',
    bio: 'Senior student focusing on offensive security, intrusion detection, and ethical hacking.',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-cs401',
    code: 'CS401',
    title: 'Advanced Distributed Systems & Consensus',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    credits: 4,
    level: 'Senior (400-Level)',
    description: 'Raft, Paxos, vector clocks, Byzantine fault tolerance, and eventual consistency paradigms.',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    id: 'course-cs302',
    code: 'CS302',
    title: 'Database Systems Architecture & Query Optimization',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    credits: 3,
    level: 'Junior (300-Level)',
    description: 'Relational algebra, B+ trees, ACID transaction semantics, WAL, and MVCC concurrency controls.',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
  {
    id: 'course-cyber201',
    code: 'CYBER201',
    title: 'Network Security, PKI & Applied Cryptography',
    department: 'Computer Science & Software Engineering',
    faculty: 'Faculty of Computing & Information Technologies',
    credits: 3,
    level: 'Sophomore (200-Level)',
    description: 'TLS 1.3 protocol handshake, AES-GCM, RSA, ECC, and zero-trust perimeter network security.',
    createdAt: '2024-01-10T08:00:00.000Z',
  },
];

export const INITIAL_QUESTION_BANK: Question[] = [
  {
    id: 'q-cs401-1',
    topic: 'Consensus Protocols',
    prompt: 'In the Raft consensus algorithm, which condition MUST be satisfied before a Leader can safely commit a log entry from its current term?',
    type: 'multiple_choice',
    points: 10,
    difficulty: 'medium',
    options: [
      { id: 'opt-a', text: 'The entry has been successfully duplicated on a strict majority (quorum) of cluster nodes.' },
      { id: 'opt-b', text: 'The entry is acknowledged by every single follower node in the cluster without exception.' },
      { id: 'opt-c', text: 'A subsequent election term has commenced and another leader has confirmed the term index.' },
      { id: 'opt-d', text: 'The client receives an HTTP 200 response prior to follower write acknowledgment.' },
    ],
    correctAnswers: ['opt-a'],
    rubric: 'Award 10 points for quorum majority acknowledgment.',
    explanation: 'Raft entries are committed once they are replicated on a majority of the servers by the leader of that term.',
  },
  {
    id: 'q-cs401-2',
    topic: 'CAP Theorem',
    prompt: 'State the CAP Theorem and explain why a distributed partition-tolerant data store cannot simultaneously guarantee strong consistency and total availability under network network partition.',
    type: 'essay',
    points: 15,
    difficulty: 'hard',
    sampleAnswer: 'The CAP theorem states that in the event of a network partition (P), a distributed system must choose between Consistency (C) and Availability (A). If nodes cannot communicate across a partition, writes accepted by one partition cannot immediately reach the other without violating consistency, while refusing writes violates availability.',
    rubric: '5 pts for exact statement of CAP; 5 pts for network partition scenario analysis; 5 pts for trade-off justification between C and A.',
  },
  {
    id: 'q-cs401-3',
    topic: 'Vector Clocks',
    prompt: 'True or False: If two events A and B in a distributed system have vector timestamps V(A) and V(B) such that neither V(A) < V(B) nor V(B) < V(A), the events are causally concurrent.',
    type: 'true_false',
    points: 5,
    difficulty: 'easy',
    options: [
      { id: 'tf-true', text: 'True' },
      { id: 'tf-false', text: 'False' },
    ],
    correctAnswers: ['tf-true'],
    explanation: 'Vector clocks strictly capture causality: non-comparable vector timestamps indicate concurrent events.',
  },
  {
    id: 'q-cs302-1',
    topic: 'Transaction Isolation',
    prompt: 'Under SQL standard isolation levels, which isolation level is vulnerable to Non-Repeatable Reads but immune to Dirty Reads?',
    type: 'single_choice',
    points: 10,
    difficulty: 'medium',
    options: [
      { id: 'opt-rc', text: 'Read Committed' },
      { id: 'opt-ru', text: 'Read Uncommitted' },
      { id: 'opt-rr', text: 'Repeatable Read' },
      { id: 'opt-ser', text: 'Serializable' },
    ],
    correctAnswers: ['opt-rc'],
    explanation: 'Read Committed prevents dirty reads by only reading committed data, but subsequent reads within the same transaction may see different values.',
  },
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-cs401-midterm',
    title: 'Midterm Examination: Distributed Systems Architecture',
    courseCode: 'CS401',
    courseTitle: 'Advanced Distributed Systems & Consensus',
    instructorName: 'Prof. Evelyn Vance',
    instructorEmail: 'e.vance@university.edu',
    description: 'Official proctored examination covering Raft consensus, vector clocks, and CAP theorem trade-offs.',
    durationMinutes: 75,
    scheduledStartTime: new Date(Date.now() - 3600000).toISOString(),
    scheduledEndTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    scheduledDate: new Date().toISOString().split('T')[0],
    passingScorePercentage: 50,
    maxAttempts: 1,
    status: 'ongoing',
    questions: INITIAL_QUESTION_BANK.slice(0, 3),
    securityProtocols: {
      requireCamera: true,
      requireMicrophone: true,
      requireSEB: false,
      blockVirtualMachine: true,
    },
    registeredStudentIds: ['student-alex', 'student-maya', 'student-sam'],
    admittedStudentIds: ['student-alex', 'student-maya'],
    isMarkingSchemeReleased: false,
    isLockedForEdits: false,
    faculty: 'Faculty of Computing & Information Technologies',
    facultyCode: 'CIT',
    department: 'Computer Science & Software Engineering',
    credits: 4,
    level: 'Senior (400-Level)',
    location: 'Alan Turing Hall, Lab 3A',
    sebConfig: {
      enabled: false,
      strictLockMode: false,
    },
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'exam-cs302-final',
    title: 'Final Examination: Database Systems & Transaction Engine',
    courseCode: 'CS302',
    courseTitle: 'Database Systems Architecture & Query Optimization',
    instructorName: 'Prof. Evelyn Vance',
    instructorEmail: 'e.vance@university.edu',
    description: 'Comprehensive exam on transaction isolation levels, write-ahead logging (WAL), and indexing.',
    durationMinutes: 90,
    scheduledStartTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    scheduledEndTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    scheduledDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    passingScorePercentage: 50,
    maxAttempts: 1,
    status: 'upcoming',
    questions: [INITIAL_QUESTION_BANK[3]],
    securityProtocols: {
      requireCamera: true,
      requireMicrophone: true,
      requireSEB: false,
      blockVirtualMachine: true,
    },
    registeredStudentIds: ['student-alex', 'student-maya'],
    admittedStudentIds: [],
    isMarkingSchemeReleased: false,
    isLockedForEdits: false,
    faculty: 'Faculty of Computing & Information Technologies',
    facultyCode: 'CIT',
    department: 'Computer Science & Software Engineering',
    credits: 3,
    level: 'Junior (300-Level)',
    location: 'Shannon Lecture Theatre 1',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'exam-past-2025',
    title: 'Archive 2025: Principles of Distributed Computing',
    courseCode: 'CS401',
    courseTitle: 'Advanced Distributed Systems & Consensus',
    instructorName: 'Prof. Evelyn Vance',
    instructorEmail: 'e.vance@university.edu',
    description: 'Archived institutional examination paper with released official marking scheme.',
    durationMinutes: 60,
    scheduledStartTime: '2025-11-15T09:00:00.000Z',
    scheduledEndTime: '2025-11-15T11:00:00.000Z',
    scheduledDate: '2025-11-15',
    passingScorePercentage: 50,
    maxAttempts: 2,
    status: 'archived',
    questions: INITIAL_QUESTION_BANK.slice(0, 2),
    securityProtocols: {
      requireCamera: false,
      requireMicrophone: false,
      requireSEB: false,
      blockVirtualMachine: false,
    },
    registeredStudentIds: ['student-alex', 'student-maya', 'student-sam'],
    admittedStudentIds: ['student-alex', 'student-maya', 'student-sam'],
    isMarkingSchemeReleased: true,
    isLockedForEdits: true,
    faculty: 'Faculty of Computing & Information Technologies',
    facultyCode: 'CIT',
    department: 'Computer Science & Software Engineering',
    credits: 4,
    createdAt: '2025-11-01T08:00:00.000Z',
  },
];

export const INITIAL_SUBMISSIONS: ExamSubmission[] = [
  {
    id: 'sub-alex-past',
    examId: 'exam-past-2025',
    studentId: 'student-alex',
    studentName: 'Alex Rivera',
    studentEmail: 'alex.rivera@student.edu',
    studentAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    studentNumber: 'STU-2024-8842',
    attemptNumber: 1,
    status: 'graded',
    startedAt: '2025-11-15T09:02:11.000Z',
    submittedAt: '2025-11-15T10:14:30.000Z',
    score: 22,
    totalPoints: 25,
    percentage: 88,
    integrityScore: 98,
    incidents: [],
    isResultCommitted: true,
    committedAt: '2025-11-16T14:00:00.000Z',
    committedBy: 'Prof. Evelyn Vance',
    answers: {
      'q-cs401-1': {
        questionId: 'q-cs401-1',
        selectedOptionIds: ['opt-a'],
        awardedPoints: 10,
        isGraded: true,
        timeSpentSeconds: 42,
      },
      'q-cs401-2': {
        questionId: 'q-cs401-2',
        textAnswer: 'CAP theorem proves that any networked shared-data system can have at most two of Consistency, Availability, and Partition tolerance.',
        awardedPoints: 12,
        isGraded: true,
        teacherFeedback: 'Excellent grasp of partition tolerance constraints.',
        timeSpentSeconds: 520,
      },
    },
  },
];

export const INITIAL_HELP_TICKETS: HelpTicket[] = [
  {
    id: 'TICK-1042',
    userId: 'student-alex',
    userName: 'Alex Rivera',
    userEmail: 'alex.rivera@student.edu',
    userRole: 'student',
    subject: 'SEB Browser Lockdown Verification Help',
    message: 'Could you confirm whether Safe Exam Browser version 3.4 is required for tomorrow’s CS401 examination?',
    category: 'system_compatibility',
    severity: 'medium',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000).toISOString(),
    adminReply: 'Standard browser proctoring is enabled with webcam and mic verification. SEB is optional for this session.',
  },
];

export const INITIAL_MISSED_EXAMS: MissedExamRecord[] = [
  {
    id: 'missed-sam-cs401',
    studentId: 'student-sam',
    studentName: 'Samuel K. Ochieng',
    studentNumber: 'MSA-2026/6-3045',
    studentEmail: 'sam.ochieng@student.edu',
    courseCode: 'CS401',
    examTitle: 'Midterm Examination: Distributed Systems Architecture',
    examId: 'exam-cs401-midterm',
    scheduledDate: new Date().toISOString().split('T')[0],
    missedReason: 'Candidate experienced sudden power grid outage & ISP fiber disruption during live examination window.',
    status: 'resit_pending',
    recordedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'missed-maya-cs401',
    studentId: 'student-maya',
    studentName: 'Maya Lin',
    studentNumber: 'MSA-2026/7-1982',
    studentEmail: 'maya.lin@student.edu',
    courseCode: 'CS401',
    examTitle: 'Archive 2025: Principles of Distributed Computing',
    examId: 'exam-past-2025',
    scheduledDate: '2025-11-15',
    missedReason: 'Documented sudden medical acute illness preventing attendance at scheduled examination.',
    status: 'resit_pending',
    recordedAt: '2025-11-15T12:00:00.000Z',
  },
];

export const SAMPLE_MEDICAL_CERT_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <rect x="25" y="25" width="750" height="1000" fill="#fafafa" stroke="#1e3a8a" stroke-width="3" stroke-dasharray="8,4" rx="12"/>
  
  <circle cx="400" cy="90" r="36" fill="#1e3a8a"/>
  <path d="M400 68 L400 112 M378 90 L422 90" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
  
  <text x="400" y="150" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">UNIVERSITY HEALTH SERVICES CLINIC</text>
  <text x="400" y="174" font-family="Arial, sans-serif" font-size="13" fill="#475569" text-anchor="middle">Division of Student Health &amp; Clinical Medical Governance</text>
  <text x="400" y="194" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Campus Medical Complex · Emergency &amp; Inpatient Admissions Wing · Tel: +1 (555) 019-4820</text>
  <line x1="80" y1="210" x2="720" y2="210" stroke="#1e3a8a" stroke-width="2"/>

  <rect x="230" y="225" width="340" height="36" rx="6" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5"/>
  <text x="400" y="249" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#312e81" text-anchor="middle">OFFICIAL MEDICAL SICK CERTIFICATE</text>
  
  <text x="80" y="295" font-family="Arial, sans-serif" font-size="12" fill="#334155">Certificate Ref: UHS-MED-CERT-2025-9981</text>
  <text x="520" y="295" font-family="Arial, sans-serif" font-size="12" fill="#334155">Issue Date: 15 Nov 2025</text>
  <line x1="80" y1="308" x2="720" y2="308" stroke="#e2e8f0" stroke-width="1"/>

  <rect x="80" y="325" width="640" height="110" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="100" y="352" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">PATIENT IDENTITY &amp; ACADEMIC RECORD:</text>
  <text x="100" y="380" font-family="Arial, sans-serif" font-size="12" fill="#334155">Patient Name: Maya Lin (MSA-2026/7-1982)</text>
  <text x="420" y="380" font-family="Arial, sans-serif" font-size="12" fill="#334155">Course: CS401 (Principles of Distributed Computing)</text>
  <text x="100" y="410" font-family="Arial, sans-serif" font-size="12" fill="#334155">Department: Computer Science</text>
  <text x="420" y="410" font-family="Arial, sans-serif" font-size="12" fill="#334155">Clearance Reason: Acute Medical Ground</text>

  <text x="80" y="475" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">CLINICAL EVALUATION &amp; MEDICAL CERTIFICATION:</text>
  <text x="80" y="505" font-family="Arial, sans-serif" font-size="12" fill="#334155">This is to certify that the student was clinically examined at UHS presenting with severe acute</text>
  <text x="80" y="525" font-family="Arial, sans-serif" font-size="12" fill="#334155">migraine and acute hyperpyrexia, verified incapacitating attendance at the examination.</text>
  <text x="80" y="555" font-family="Arial, sans-serif" font-size="12" fill="#334155">Clinical rest and medical observation were prescribed. Student is recommended for resit clearance.</text>

  <rect x="80" y="660" width="640" height="230" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  
  <circle cx="230" cy="775" r="60" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,3"/>
  <text x="230" y="755" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#dc2626" text-anchor="middle">UNIVERSITY HEALTH SERVICES</text>
  <text x="230" y="778" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626" text-anchor="middle">★ CLINIC APPROVED ★</text>
  <text x="230" y="796" font-family="Arial, sans-serif" font-size="9" fill="#dc2626" text-anchor="middle">OFFICIALLY VERIFIED</text>

  <text x="420" y="720" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Attending Medical Practitioner:</text>
  <path d="M420 755 Q460 725 490 765 T550 735 T600 760" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>
  <text x="420" y="785" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">Dr. Kevin Patel, MD, MBBS</text>
  <text x="420" y="805" font-family="Arial, sans-serif" font-size="11" fill="#475569">Senior Physician · License # KMPDC-449102</text>

  <text x="400" y="980" font-family="Arial, sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">Official Institutional Health Record - AI Studio ExamGuard Pro</text>
</svg>
`)}`;

export const INITIAL_RESIT_REQUESTS: ResitRequest[] = [
  {
    id: 'resit-sam-002',
    studentId: 'student-sam',
    studentName: 'Samuel K. Ochieng',
    studentNumber: 'MSA-2026/6-3045',
    studentEmail: 'sam.ochieng@student.edu',
    courseCode: 'CS401',
    examTitle: 'Midterm Examination: Distributed Systems Architecture',
    examId: 'exam-cs401-midterm',
    missedDate: new Date().toISOString().split('T')[0],
    reasonCategory: 'technical',
    reasonDetails: 'Severe municipal grid outage and ISP trunk cut during live session. ISP incident ticket #ISP-99412 attached.',
    evidenceNotes: 'Telecommunications ISP incident ticket #ISP-99412 verified with campus network operations.',
    status: 'pending',
    submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    reRegistered: false,
  },
  {
    id: 'resit-maya-001',
    studentId: 'student-maya',
    studentName: 'Maya Lin',
    studentNumber: 'MSA-2026/7-1982',
    studentEmail: 'maya.lin@student.edu',
    courseCode: 'CS401',
    examTitle: 'Archive 2025: Principles of Distributed Computing',
    examId: 'exam-past-2025',
    missedDate: '2025-11-15',
    reasonCategory: 'medical',
    reasonDetails: 'Severe migraine and fever verified by University Health Services Clinic (Dr. K. Patel). Attached medical certificate.',
    evidenceNotes: 'UHS-MED-CERT-2025-9981 officially stamped by College Clinic.',
    attachmentFileName: 'Medical_Certificate_UHS_MayaLin.svg',
    attachmentFileUrl: SAMPLE_MEDICAL_CERT_DATA_URL,
    attachmentFileType: 'image/svg+xml',
    medicalFacility: 'University Health Services Clinic',
    doctorName: 'Dr. Kevin Patel, MD, MBBS',
    medicalCertificateRef: 'UHS-MED-CERT-2025-9981',
    isMedicalCompulsoryMet: true,
    status: 'approved',
    submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    reviewedBy: 'Dr. Marcus Sterling (Super Admin Directorate)',
    reviewedAt: new Date(Date.now() - 86400000).toISOString(),
    adminDecisionNote: 'Approved by Institutional Senate & Super Admin for exam resit. Medical evidence verified.',
    adminNotes: 'Approved by Institutional Senate & Super Admin for exam resit. Medical evidence verified.',
    reRegistered: false,
  },
];
