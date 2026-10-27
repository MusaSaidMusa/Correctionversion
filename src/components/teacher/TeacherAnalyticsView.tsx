import React, { useState } from 'react';
import {
  BarChart2,
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { Exam, ExamSubmission, StudentProfile } from '../../types';

interface TeacherAnalyticsViewProps {
  students: StudentProfile[];
  exams: Exam[];
  submissions: ExamSubmission[];
}

export const TeacherAnalyticsView: React.FC<TeacherAnalyticsViewProps> = ({
  students,
  exams,
  submissions,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  const filteredSubs =
    selectedExamId === 'all'
      ? submissions
      : submissions.filter((s) => s.examId === selectedExamId);

  const gradedSubs = filteredSubs.filter((s) => s.score !== undefined);
  const totalSubmissions = filteredSubs.length;

  const avgPercentage =
    gradedSubs.length > 0
      ? Math.round(
          gradedSubs.reduce((sum, s) => {
            const tot = s.totalPoints || 100;
            const pct = s.percentage ?? ((s.score || 0) / tot) * 100;
            return sum + pct;
          }, 0) / gradedSubs.length
        )
      : 0;

  const avgIntegrity =
    filteredSubs.length > 0
      ? Math.round(
          filteredSubs.reduce((sum, s) => sum + (s.integrityScore ?? 100), 0) / filteredSubs.length
        )
      : 100;

  const passedCount = gradedSubs.filter((s) => {
    const tot = s.totalPoints || 100;
    const pct = s.percentage ?? ((s.score || 0) / tot) * 100;
    return pct >= 50;
  }).length;

  const passRate = gradedSubs.length > 0 ? Math.round((passedCount / gradedSubs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Exam filter */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Examinations Academic Analytics & Performance Directorate
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Statistical breakdown of grades, passing rates, and proctoring integrity metrics
          </p>
        </div>

        <select
          value={selectedExamId}
          onChange={(e) => setSelectedExamId(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer"
        >
          <option value="all">All Examinations Aggregated</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.courseCode} — {ex.title}
            </option>
          ))}
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" /> Total Scripts
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {totalSubmissions}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{gradedSubs.length} graded scripts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" /> Average Score
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {avgPercentage}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Class Average</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Pass Rate
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{passedCount} of {gradedSubs.length} passing</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Avg Integrity
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
            {avgIntegrity}%
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Proctor Compliance</div>
        </div>
      </div>

      {/* Submissions Performance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Candidate Submissions Performance Log
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 rounded-l-xl">Candidate</th>
                <th className="p-3">Exam Course</th>
                <th className="p-3">Status</th>
                <th className="p-3">Awarded Mark</th>
                <th className="p-3">Percentage</th>
                <th className="p-3 rounded-r-xl">Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubs.map((sub) => {
                const ex = exams.find((e) => e.id === sub.examId);
                const tot = sub.totalPoints || 100;
                const score = sub.score ?? 0;
                const pct = sub.percentage ?? Math.round((score / tot) * 100);

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {sub.studentName || sub.studentId}
                      <div className="text-[10px] text-slate-500 font-normal">{sub.studentNumber}</div>
                    </td>
                    <td className="p-3">{ex?.courseCode || sub.examId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] bg-slate-100 dark:bg-slate-800">
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{score} / {tot}</td>
                    <td className="p-3 font-semibold">{pct}%</td>
                    <td className="p-3">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {sub.integrityScore ?? 100}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
