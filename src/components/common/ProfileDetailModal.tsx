import React from 'react';
import {
  X,
  User,
  GraduationCap,
  Building,
  Mail,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Phone,
  FileText,
} from 'lucide-react';
import { StudentProfile, TeacherProfile } from '../../types';
import { getStoredStudents, getStoredTeachers } from '../../services/storageService';

interface ProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'teacher' | 'student' | string;
  targetId: string;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
}) => {
  if (!isOpen) return null;

  const students = getStoredStudents();
  const teachers = getStoredTeachers();

  const student = targetType === 'student' ? students.find((s) => s.id === targetId) : null;
  const teacher = targetType === 'teacher' ? teachers.find((t) => t.id === targetId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              {targetType === 'teacher' ? (
                <GraduationCap className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base">
                Verified Academic Profile ({targetType === 'teacher' ? 'Faculty Invigilator' : 'Student Candidate'})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Institutional Directorate of Academic Affairs & Records
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

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {student && (
            <>
              <div className="flex items-center gap-4">
                <img
                  src={student.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
                  alt={student.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-900"
                />
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{student.name}</h4>
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Registration No: {student.studentNumber}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{student.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Department</div>
                  <div className="font-semibold text-xs mt-0.5">{student.department || 'Computer Science'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Faculty</div>
                  <div className="font-semibold text-xs mt-0.5">{student.faculty || 'Faculty of Computing & Information Technologies'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative GPA</div>
                  <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-0.5">{student.gpa || '3.80'} / 4.00</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Attendance Rate</div>
                  <div className="font-semibold text-xs text-emerald-600 mt-0.5">{student.attendanceRate || '98%'}</div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Enrolled Course Codes
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {(student.enrolledCourseCodes || []).map((code) => (
                    <span
                      key={code}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {teacher && (
            <>
              <div className="flex items-center gap-4">
                <img
                  src={teacher.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'}
                  alt={teacher.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-900"
                />
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{teacher.name}</h4>
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {teacher.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{teacher.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Staff Appointment ID</div>
                  <div className="font-semibold text-xs mt-0.5">{teacher.staffId || 'FAC-CIT-8021'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Security Clearance</div>
                  <div className="font-semibold text-xs text-emerald-600 mt-0.5">{teacher.securityClearance || 'Level IV Invigilator'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Faculty</div>
                  <div className="font-semibold text-xs mt-0.5">{teacher.faculty}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Department</div>
                  <div className="font-semibold text-xs mt-0.5">{teacher.department}</div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Assigned Teaching & Examination Modules
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {(teacher.assignedCourseCodes || []).map((code) => (
                    <span
                      key={code}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {!student && !teacher && (
            <div className="text-center py-8 text-slate-500">Academic profile record not found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
