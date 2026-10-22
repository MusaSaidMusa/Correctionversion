export type ThemeMode = 'light' | 'dark' | 'system';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  faculty?: string;
  studentNumber?: string;
  assignedCourseCodes?: string[];
  accessStatus?: 'active' | 'pending' | 'suspended';
  phone?: string;
  bio?: string;
  officeLocation?: string;
  lastPasswordChangedAt?: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  studentNumber: string;
  department?: string;
  faculty?: string;
  program?: string;
  admissionYear?: string;
  academicStanding?: string;
  gpa?: string;
  creditsCompleted?: number;
  attendanceRate?: string;
  clearanceStatus?: string;
  enrolledCourseCodes: string[];
  accessStatus?: 'active' | 'pending' | 'suspended';
  phone?: string;
  bio?: string;
  lastPasswordChangedAt?: string;
}

export interface TeacherRights {
  canCreateExams: boolean;
  canGradeMarks: boolean;
  canAdmitStudents: boolean;
  canDeleteExams: boolean;
  canExportSubmissions: boolean;
}

export interface TeacherProfile {
  id: string;
  name: string;
  title: string;
  staffId?: string;
  email: string;
  avatar: string;
  department: string;
  faculty: string;
  office?: string;
  appointmentYear?: string;
  assignedCourseCodes: string[];
  accessStatus: 'active' | 'pending' | 'suspended';
  securityClearance?: string;
  rights: TeacherRights;
  phone?: string;
  bio?: string;
  registeredAt?: string;
  lastPasswordChangedAt?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  faculty?: string;
  credits: number;
  level: string;
  description?: string;
  createdAt?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface SubQuestion {
  id: string;
  label?: string;
  prompt: string;
  points: number;
  sampleAnswer?: string;
}

export interface Question {
  id: string;
  topic?: string;
  prompt: string;
  type: string;
  points: number;
  options?: QuestionOption[];
  correctAnswers?: string[];
  sampleAnswer?: string;
  subQuestions?: SubQuestion[];
  formula?: string;
  mathEquation?: string;
  diagramUrl?: string;
  imageUrl?: string;
  imageCaption?: string;
  imageTransform?: any;
  audioPromptUrl?: string;
  audioTitle?: string;
  rubric?: string;
  explanation?: string;
  difficulty?: string;
  allowPhotoUpload?: boolean;
}

export interface SecurityProtocols {
  requireCamera: boolean;
  requireMicrophone: boolean;
  requireSEB: boolean;
  blockVirtualMachine: boolean;
  lockdownBrowser?: boolean;
}

export interface Exam {
  id: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  instructorName: string;
  instructorEmail: string;
  description?: string;
  durationMinutes: number;
  scheduledStartTime: string;
  scheduledEndTime: string;
  scheduledDate?: string;
  passingScorePercentage?: number;
  maxAttempts?: number;
  accessPassword?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'archived' | 'active';
  questions: Question[];
  securityProtocols: SecurityProtocols;
  registeredStudentIds: string[];
  admittedStudentIds: string[];
  studentAssignedQuestions?: Record<string, string[]>;
  isMarkingSchemeReleased?: boolean;
  isLockedForEdits?: boolean;
  shuffleQuestions?: boolean;
  shuffleMode?: 'random' | 'none' | 'by_topic';
  questionBehavior?: string;
  faculty?: string;
  facultyCode?: string;
  location?: string;
  roomNumber?: string;
  department?: string;
  credits?: number;
  level?: string;
  officialMarkingSchemeUrl?: string;
  markingSchemeNotes?: string;
  sebConfig?: any;
}

export interface StudentAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  selectedOptionId?: string;
  textAnswer?: string;
  subQuestionAnswers?: Record<string, string>;
  uploadedPhotoUrl?: string;
  uploadedFileUrl?: string;
  uploadedFileName?: string;
  timeSpentSeconds?: number;
  isFlaggedForReview?: boolean;
  awardedPoints?: number;
  originalScore?: number;
  teacherFeedback?: string;
  isGraded?: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  overrideStatus?: 'pending_admin_approval' | 'approved' | 'rejected' | 'pending_admin_review' | 'declined';
  adminDecisionReason?: string;
  adminReviewedBy?: string;
  adminReviewedAt?: string;
  adminEnquirySent?: string | boolean;
}

export interface ProctorIncident {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  timestamp: string;
  type: 'tab_switch' | 'window_blur' | 'face_lost' | 'multiple_faces' | 'audio_spike' | 'device_turned_off' | 'fullscreen_exit' | 'copy_paste' | string;
  category?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  snapshotUrl?: string;
  reviewed?: boolean;
}

export interface CommittedMarkChangeRequest {
  id: string;
  requestedBy: string;
  requestedAt: string;
  previousScore: number;
  proposedScore: number;
  explanation: string;
  status: 'pending_admin_approval' | 'approved' | 'rejected';
  previousQuestionGrades?: Record<string, { awardedPoints: number; feedback?: string }>;
  proposedQuestionGrades?: Record<string, { awardedPoints: number; feedback?: string }>;
  reviewedQuestionGrades?: Record<string, { awardedPoints: number; feedback?: string }>;
  adminReviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  studentAvatar?: string;
  studentNumber?: string;
  attemptNumber?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string;
  submittedAt?: string;
  score?: number;
  totalPoints?: number;
  percentage?: number;
  integrityScore?: number;
  incidents: ProctorIncident[];
  answers: Record<string, StudentAnswer>;
  isResultCommitted?: boolean;
  committedAt?: string;
  committedBy?: string;
  committedMarkChangeRequest?: CommittedMarkChangeRequest;
  diagnosticCheckPassed?: boolean;
  isTerminatedForBreach?: boolean;
  terminationReason?: string;
  currentQuestionIndex?: number;
  currentQuestionPrompt?: string;
  lastHeartbeatAt?: string;
  latestSnapshot?: string;
  activeWindowFocus?: 'focused' | 'tab_switched' | 'blurred';
  activeGazeState?: 'centered' | 'looking_away' | 'no_face' | 'multiple_faces';
  activeAudioLevel?: number;
  isExamPaused?: boolean;
  pauseReason?: string;
  environmentCheckRequested?: boolean;
  activeWarnings?: string[];
  keystrokesCount?: number;
  liveDraftPreview?: string;
}

export interface HelpTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  subject: string;
  message: string;
  category?: string;
  severity?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
  adminResponse?: string;
  adminReply?: string;
  activeExamId?: string;
}
