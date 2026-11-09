import superAdminData from '../../database/superAdmin.json';
import teachersData from '../../database/teachers.json';
import studentsData from '../../database/students.json';
import coursesData from '../../database/courses.json';
import questionsData from '../../database/questions.json';
import examsData from '../../database/exams.json';
import submissionsData from '../../database/submissions.json';
import missedExamsData from '../../database/missedExams.json';
import resitRequestsData from '../../database/resitRequests.json';
import academicDatabaseData from '../../database/academicDatabase.json';
import helpTicketsData from '../../database/helpTickets.json';
import facultiesData from '../../database/faculties.json';

import {
  AuthUser,
  TeacherProfile,
  StudentProfile,
  Course,
  Question,
  Exam,
  ExamSubmission,
  MissedExamRecord,
  ResitRequest,
  AcademicRecord,
  HelpTicket,
} from '../types';

export const DB_SUPER_ADMIN: AuthUser = superAdminData as unknown as AuthUser;
export const DB_TEACHERS: TeacherProfile[] = teachersData as unknown as TeacherProfile[];
export const DB_STUDENTS: StudentProfile[] = studentsData as unknown as StudentProfile[];
export const DB_COURSES: Course[] = coursesData as unknown as Course[];
export const DB_QUESTIONS: Question[] = questionsData as unknown as Question[];
export const DB_EXAMS: Exam[] = examsData as unknown as Exam[];
export const DB_SUBMISSIONS: ExamSubmission[] = submissionsData as unknown as ExamSubmission[];
export const DB_MISSED_EXAMS: MissedExamRecord[] = missedExamsData as unknown as MissedExamRecord[];
export const DB_RESIT_REQUESTS: ResitRequest[] = resitRequestsData as unknown as ResitRequest[];
export const DB_ACADEMIC_RECORDS: AcademicRecord[] = academicDatabaseData as unknown as AcademicRecord[];
export const DB_HELP_TICKETS: HelpTicket[] = helpTicketsData as unknown as HelpTicket[];
export const DB_FACULTIES = facultiesData;

export const DATABASE = {
  superAdmin: DB_SUPER_ADMIN,
  teachers: DB_TEACHERS,
  students: DB_STUDENTS,
  courses: DB_COURSES,
  questions: DB_QUESTIONS,
  exams: DB_EXAMS,
  submissions: DB_SUBMISSIONS,
  missedExams: DB_MISSED_EXAMS,
  resitRequests: DB_RESIT_REQUESTS,
  academicRecords: DB_ACADEMIC_RECORDS,
  helpTickets: DB_HELP_TICKETS,
  faculties: DB_FACULTIES,
};

export default DATABASE;
