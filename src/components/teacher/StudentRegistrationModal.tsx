import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckCircle2,
  Trash2,
  BookOpen,
  Search,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  targetExam: Exam | null;
  students: StudentProfile[];
  onEnrollExistingStudent: (studentId: string, examId: string) => boolean;
  onUnenrollStudent: (studentId: string, examId: string) => boolean;
  onRegisterStudent: (newStudent: StudentProfile, enrolledCodes: string[]) => void;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  isOpen,
  onClose,
  exams,
  targetExam,
  students,
  onEnrollExistingStudent,
  onUnenrollStudent,
  onRegisterStudent,
}) => {
  const [tab, setTab] = useState<'enroll' | 'new'>('enroll');
  const [selectedExamId, setSelectedExamId] = useState<string>(
    targetExam?.id || exams[0]?.id || ''
  );
  const [searchFilter, setSearchFilter] = useState('');

  // Form state for new candidate registration
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Software Engineering');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentExam = exams.find((e) => e.id === selectedExamId) || targetExam || exams[0];

  const handleRegisterNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newRegNo.trim()) return;

    const newStudent: StudentProfile = {
      id: `student-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      email: newEmail.trim(),
      studentNumber: newRegNo.trim().toUpperCase(),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      department: newDept,
      faculty: currentExam?.faculty || 'Faculty of Computing & Information Technologies',
      enrolledCourseCodes: selectedCourses.length > 0 ? selectedCourses : [currentExam?.courseCode || 'CS401'],
      accessStatus: 'active',
      academicStanding: 'Good Standing',
      gpa: '3.60',
      attendanceRate: '95%',
      clearanceStatus: 'Financial & Academic Cleared',
    };

    onRegisterStudent(newStudent, selectedCourses);
    setNewName('');
    setNewEmail('');
    setNewRegNo('');
    onClose();
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.studentNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Candidate Examination Enrollment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage registered candidate roll for institutional examination sitting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-950/50 gap-4 text-xs font-bold">
          <button
            onClick={() => setTab('enroll')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              tab === 'enroll'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Enroll Existing Candidates
          </button>
          <button
            onClick={() => setTab('new')}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
              tab === 'new'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Register New Candidate
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {tab === 'enroll' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Select Target Exam
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.courseCode} — {ex.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Search Candidate
                  </label>
                  <input
                    type="text"
                    placeholder="Name or Reg No..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="mt-4 border rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {filteredStudents.map((st) => {
                  const isEnrolled = currentExam?.registeredStudentIds?.includes(st.id);

                  return (
                    <div
                      key={st.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={st.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                          alt={st.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{st.name}</div>
                          <div className="text-[10px] text-slate-500">
                            Reg: {st.studentNumber} &bull; {st.department || 'Computing'}
                          </div>
                        </div>
                      </div>

                      {isEnrolled ? (
                        <button
                          onClick={() => currentExam && onUnenrollStudent(st.id, currentExam.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Unenroll</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => currentExam && onEnrollExistingStudent(st.id, currentExam.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enroll Candidate</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'new' && (
            <form onSubmit={handleRegisterNew} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full Candidate Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Mercer"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Student Registration No.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="STU-2026-XXXX"
                    value={newRegNo}
                    onChange={(e) => setNewRegNo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    University Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="j.mercer@student.edu"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer"
              >
                Register & Enroll Candidate
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
