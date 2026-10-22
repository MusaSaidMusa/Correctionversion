import React, { useState } from 'react';
import { FolderArchive, Search, BookOpen, CheckCircle2, Play, Lock, FileText, ArrowRight } from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';

export interface PastPapersSectionProps {
  exams: Exam[];
  onOpenQuestionPaper: (exam: Exam) => void;
  onOpenMarkingScheme: (exam: Exam) => void;
  onStartPractice?: (exam: Exam) => void;
  userRole?: 'student' | 'teacher' | 'admin';
  studentSubmissions?: ExamSubmission[];
}

export const PastPapersSection: React.FC<PastPapersSectionProps> = ({
  exams,
  onOpenQuestionPaper,
  onOpenMarkingScheme,
  onStartPractice,
  userRole = 'student',
  studentSubmissions = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = exams.filter((e) => {
    const term = searchTerm.toLowerCase();
    return (
      e.title.toLowerCase().includes(term) ||
      e.courseCode.toLowerCase().includes(term) ||
      (e.courseTitle && e.courseTitle.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <FolderArchive className="w-4 h-4" />
            <span>Academic Archive & Past Examination Papers</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">Past Papers & Marking Scheme Repository</h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Access previous examination papers, official solution schemes, and revision mock assessments.
          </p>
        </div>

        <div className="w-full md:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search course code or title..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 backdrop-blur-xs"
          />
        </div>
      </div>

      {/* Grid of Papers */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
          <FolderArchive className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">No past examination papers match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((exam) => {
            const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
            const canViewScheme = userRole !== 'student' || exam.isMarkingSchemeReleased;

            return (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-xs font-mono font-bold">
                      {exam.courseCode}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {exam.durationMinutes} Mins · {totalPoints} Pts
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {exam.description || exam.courseTitle}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenQuestionPaper(exam)}
                    className="flex-1 min-w-[110px] py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>View Paper</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenMarkingScheme(exam)}
                    disabled={!canViewScheme}
                    className={`flex-1 min-w-[110px] py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
                      canViewScheme
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer'
                        : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                    title={canViewScheme ? 'View Marking Scheme' : 'Marking scheme restricted by examiner'}
                  >
                    {canViewScheme ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Scheme</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Locked</span>
                      </>
                    )}
                  </button>

                  {userRole === 'student' && onStartPractice && (
                    <button
                      type="button"
                      onClick={() => onStartPractice(exam)}
                      className="w-full mt-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Take Practice Sitting</span>
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
