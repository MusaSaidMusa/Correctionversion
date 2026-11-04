import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Users,
  CheckCircle2,
  Trash2,
  BookOpen,
  Search,
  AlertTriangle,
  ShieldAlert,
  Camera,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';
import { checkMissedExamRegistrationBlock, uploadFileToServer } from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  targetExam: Exam | null;
  students: StudentProfile[];
  onEnrollExistingStudent: (studentId: string, examId: string) => { success: boolean; error?: string } | boolean;
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
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  // Form state for new candidate registration
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Software Engineering');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [newAvatar, setNewAvatar] = useState<string>('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const res = await uploadFileToServer(file);
      if (res.url) {
        setNewAvatar(res.url);
        triggerFlash({
          type: 'success',
          text: 'Candidate Photo Uploaded',
          subtext: `Uploaded and attached candidate portrait.`,
        });
      }
    } catch {
      // safe fallback
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const currentExam = exams.find((e) => e.id === selectedExamId) || targetExam || exams[0];

  const handleRegisterNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newRegNo.trim()) return;

    const formattedRegNo = newRegNo.trim().toUpperCase();
    if (currentExam) {
      const blockCheck = checkMissedExamRegistrationBlock(formattedRegNo, currentExam.courseCode, currentExam.title);
      if (blockCheck.isBlocked) {
        setEnrollmentError(
          `Re-registration Rejected: Candidate with Admission (${formattedRegNo}) was registered for examination [Code: ${currentExam.courseCode} | Title: "${currentExam.title}"] but missed the session. Candidate details rejected until cleared by Administrator.`
        );
        triggerFlash({
          type: 'error',
          text: 'Registration Rejected (Missed Exam)',
          subtext: `Candidate (${formattedRegNo}) has uncleared missed exam for ${currentExam.courseCode}. Resit approval required.`,
        });
        return;
      }
    }

    const newStudent: StudentProfile = {
      id: `student-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      email: newEmail.trim(),
      studentNumber: formattedRegNo,
      avatar: newAvatar,
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
    triggerFlash({
      type: 'success',
      text: 'Candidate Registered Successfully',
      subtext: `${newName.trim()} (${formattedRegNo}) registered for examination session.`,
    });
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

              {enrollmentError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <div className="font-bold">Administrative Clearance Required</div>
                    <div>{enrollmentError}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnrollmentError(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="mt-4 border rounded-xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                {filteredStudents.map((st) => {
                  const isEnrolled = currentExam?.registeredStudentIds?.includes(st.id);
                  const blockCheck = currentExam
                    ? checkMissedExamRegistrationBlock(st.studentNumber, currentExam.courseCode, currentExam.title)
                    : { isBlocked: false };

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
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{st.name}</span>
                            {blockCheck.isBlocked && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>Missed Exam · Admin Clearance Required</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Admission / Reg: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{st.studentNumber}</span> &bull; {st.department || 'Computing'}
                          </div>
                        </div>
                      </div>

                      {isEnrolled ? (
                        <button
                          type="button"
                          onClick={() => currentExam && onUnenrollStudent(st.id, currentExam.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-semibold hover:bg-rose-100 cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Unenroll</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentExam) return;
                            if (blockCheck.isBlocked) {
                              const err = `Re-registration Blocked: Candidate ${st.name} (Admission: ${st.studentNumber}) was previously registered for examination [Code: ${currentExam.courseCode} | Title: "${currentExam.title}"] but missed the session. Re-registration is strictly prevented until cleared by the Administrator.`;
                              setEnrollmentError(err);
                              triggerFlash({
                                type: 'error',
                                text: 'Re-registration Rejected (Missed Exam)',
                                subtext: `Candidate (${st.studentNumber}) missed ${currentExam.courseCode}. Administrator clearance is required before re-registration.`,
                              });
                              return;
                            }
                            setEnrollmentError(null);
                            const res = onEnrollExistingStudent(st.id, currentExam.id);
                            if (typeof res === 'object' && !res.success && res.error) {
                              setEnrollmentError(res.error);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer flex items-center gap-1 transition-colors ${
                            blockCheck.isBlocked
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 hover:bg-rose-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title={blockCheck.isBlocked ? 'Admin clearance required for missed exam' : 'Enroll candidate into exam'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{blockCheck.isBlocked ? 'Blocked (Missed Exam)' : 'Enroll Candidate'}</span>
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
              {/* Candidate Photo / Avatar Upload */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <img
                    src={newAvatar}
                    alt="Candidate portrait"
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400 shadow-sm"
                  />
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Candidate Portrait Photo
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Upload official examination identification photo (.jpg, .png)
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isUploadingPhoto ? 'Uploading...' : 'Choose / Take Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

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
