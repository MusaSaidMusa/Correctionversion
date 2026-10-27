import React, { useState } from 'react';
import {
  FileText,
  Search,
  BookOpen,
  Award,
  Play,
  Lock,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';

interface PastPapersSectionProps {
  exams: Exam[];
  onOpenQuestionPaper: (exam: Exam) => void;
  onOpenMarkingScheme: (exam: Exam) => void;
  onStartPractice?: (exam: Exam) => void;
  userRole: 'student' | 'teacher' | 'admin';
  studentSubmissions?: ExamSubmission[];
}

export const PastPapersSection: React.FC<PastPapersSectionProps> = ({
  exams,
  onOpenQuestionPaper,
  onOpenMarkingScheme,
  onStartPractice,
  userRole,
  studentSubmissions = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  // Filter archived exams or exams marked as past papers
  const pastExams = exams.filter(
    (e) =>
      e.status === 'archived' ||
      e.status === 'completed' ||
      new Date(e.scheduledEndTime).getTime() < Date.now() ||
      e.isMarkingSchemeReleased
  );

  const courses = Array.from(new Set(pastExams.map((e) => e.courseCode)));

  const filtered = pastExams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.instructorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = selectedCourse === 'all' || exam.courseCode === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Institutional Past Papers & Marking Schemes Archive
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Access previous examination papers, grading criteria, and self-assessment practice
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search past papers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="all">All Course Codes</option>
            {courses.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Past Examination Papers */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No Past Papers Found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            There are currently no concluded examination papers matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => {
            const hasTaken = studentSubmissions.some((s) => s.examId === exam.id);
            const canViewScheme = userRole !== 'student' || exam.isMarkingSchemeReleased;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                      {exam.courseCode}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exam.durationMinutes}m
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-2">
                    {exam.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {exam.description || 'Institutional examination paper archive.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{exam.questions.length} Questions</span>
                    <span>{exam.instructorName}</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => onOpenQuestionPaper(exam)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Paper</span>
                  </button>

                  {canViewScheme ? (
                    <button
                      onClick={() => onOpenMarkingScheme(exam)}
                      className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Scheme</span>
                    </button>
                  ) : (
                    <div
                      className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-800/40 text-slate-400 rounded-xl text-xs flex items-center justify-center gap-1 cursor-not-allowed border border-slate-200/60 dark:border-slate-800"
                      title="Marking scheme is pending official instructor release"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Scheme Locked</span>
                    </div>
                  )}

                  {onStartPractice && userRole === 'student' && (
                    <button
                      onClick={() => onStartPractice(exam)}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Practice taking this exam"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
