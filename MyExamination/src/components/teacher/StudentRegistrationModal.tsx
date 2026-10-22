import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  targetExam: Exam | null;
  students: StudentProfile[];
  onRegisterStudent: (student: StudentProfile, enrolledExamIds: string[]) => void;
  onRegisterStudentToExam?: (studentId: string, examId: string) => boolean;
  onUnregisterStudentFromExam?: (studentId: string, examId: string) => void;
  onEnrollExistingStudent?: (studentId: string, examId: string) => boolean;
  onUnenrollStudent?: (studentId: string, examId: string) => boolean | void;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  onClose,
  exams,
  targetExam,
  students,
  onRegisterStudent,
  onRegisterStudentToExam,
  onUnregisterStudentFromExam,
  onEnrollExistingStudent,
  onUnenrollStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'enroll' | 'create'>('enroll');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>(targetExam?.id || exams[0]?.id || '');

  // Form state for creating a new student
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [department, setDepartment] = useState('Computer Science & Software Engineering');
  const [program, setProgram] = useState('B.Sc. Computer Science');

  if (!isOpen) return null;

  const currentExam = exams.find((e) => e.id === selectedExamId) || targetExam || exams[0];

  const handleToggleEnrollment = (studentId: string) => {
    if (!currentExam) return;
    const isEnrolled = currentExam.registeredStudentIds?.includes(studentId);
    if (isEnrolled) {
      if (onUnenrollStudent) {
        onUnenrollStudent(studentId, currentExam.id);
      } else if (onUnregisterStudentFromExam) {
        onUnregisterStudentFromExam(studentId, currentExam.id);
      }
    } else {
      if (onEnrollExistingStudent) {
        onEnrollExistingStudent(studentId, currentExam.id);
      } else if (onRegisterStudentToExam) {
        onRegisterStudentToExam(studentId, currentExam.id);
      }
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !studentNumber.trim()) return;

    const newStudent: StudentProfile = {
      id: `student-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      studentNumber: studentNumber.trim().toUpperCase(),
      department,
      faculty: currentExam?.faculty || 'Faculty of Computing & Information Technologies',
      program,
      admissionYear: new Date().getFullYear().toString(),
      academicStanding: 'Good Standing',
      gpa: '3.75 / 4.00',
      creditsCompleted: 60,
      attendanceRate: '98%',
      clearanceStatus: 'Verified & Cleared for Invigilation',
      enrolledCourseCodes: currentExam ? [currentExam.courseCode] : [],
      accessStatus: 'active',
    };

    onRegisterStudent(newStudent, currentExam ? [currentExam.id] : []);
    onClose();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Candidate Enrollment & Registration
              </h3>
              <p className="text-xs text-slate-500">
                Manage exam roster or admit new candidates to the university
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('enroll')}
              className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'enroll'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Enroll Existing Candidates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register New Candidate Profile
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'enroll' ? (
            <div className="space-y-4">
              {/* Target Exam selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selected Examination Roster
                </label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {exams.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.courseCode} - {e.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter candidate name or admission number..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Student list */}
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredStudents.map((s) => {
                  const isEnrolled = currentExam?.registeredStudentIds?.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-9 h-9 rounded-full object-cover border border-indigo-400"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                          <div className="text-[11px] text-slate-500">{s.studentNumber} · {s.department}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleEnrollment(s.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                          isEnrolled
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        {isEnrolled ? 'Enrolled ✓' : '+ Enroll Candidate'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Candidate Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Kiprono"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. d.kiprono@student.university.edu"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="e.g. ADM-CS-2026-150"
                    className="w-full px-3.5 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Register & Enroll
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
