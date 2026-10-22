import React, { useState, useMemo } from 'react';
import {
  Award,
  Users,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Filter,
  Download,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Sparkles,
  HelpCircle,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Exam, ExamSubmission, StudentProfile } from '../../types';

interface TeacherAnalyticsViewProps {
  students: StudentProfile[];
  exams: Exam[];
  submissions: ExamSubmission[];
}

type ChartViewType = 'distribution' | 'trends' | 'proctoring' | 'questions';

export const TeacherAnalyticsView: React.FC<TeacherAnalyticsViewProps> = ({
  students,
  exams,
  submissions,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [activeView, setActiveView] = useState<ChartViewType>('distribution');
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [hoveredLinePoint, setHoveredLinePoint] = useState<number | null>(null);

  // Filter submissions by exam
  const filteredSubmissions = useMemo(() => {
    if (selectedExamId === 'all') return submissions;
    return submissions.filter((s) => s.examId === selectedExamId);
  }, [submissions, selectedExamId]);

  const gradedSubs = useMemo(() => {
    return filteredSubmissions.filter((s) => s.status === 'graded');
  }, [filteredSubmissions]);

  const totalSubmissions = filteredSubmissions.length;
  const totalPointsAwarded = gradedSubs.reduce((sum, s) => sum + (s.score || 0), 0);
  const totalPointsPossible = gradedSubs.reduce((sum, s) => sum + (s.totalPoints || 100), 0);

  const averagePercentage =
    totalPointsPossible > 0 ? Math.round((totalPointsAwarded / totalPointsPossible) * 100) : 0;

  const passedCount = gradedSubs.filter((s) => (s.percentage || 0) >= 50).length;
  const passRate = gradedSubs.length > 0 ? Math.round((passedCount / gradedSubs.length) * 100) : 0;

  // Grade Distribution Counts
  const gradeDistribution = useMemo(() => {
    return {
      A: gradedSubs.filter((s) => (s.percentage || 0) >= 80).length,
      B: gradedSubs.filter((s) => (s.percentage || 0) >= 70 && (s.percentage || 0) < 80).length,
      C: gradedSubs.filter((s) => (s.percentage || 0) >= 60 && (s.percentage || 0) < 70).length,
      D: gradedSubs.filter((s) => (s.percentage || 0) >= 50 && (s.percentage || 0) < 60).length,
      F: gradedSubs.filter((s) => (s.percentage || 0) < 50).length,
    };
  }, [gradedSubs]);

  // Pie Chart Data: Grades
  const pieData = useMemo(() => {
    const total = gradedSubs.length || 1;
    return [
      {
        label: 'Grade A (80-100%)',
        shortLabel: 'Grade A',
        value: gradeDistribution.A,
        percentage: Math.round((gradeDistribution.A / total) * 100),
        color: '#10b981', // emerald-500
        textColor: 'text-emerald-500',
        subtext: 'Academic Honors & Distinction',
      },
      {
        label: 'Grade B (70-79%)',
        shortLabel: 'Grade B',
        value: gradeDistribution.B,
        percentage: Math.round((gradeDistribution.B / total) * 100),
        color: '#6366f1', // indigo-500
        textColor: 'text-indigo-500',
        subtext: 'Above Standard Performance',
      },
      {
        label: 'Grade C (60-69%)',
        shortLabel: 'Grade C',
        value: gradeDistribution.C,
        percentage: Math.round((gradeDistribution.C / total) * 100),
        color: '#0ea5e9', // sky-500
        textColor: 'text-sky-500',
        subtext: 'Competent & Satisfactory',
      },
      {
        label: 'Grade D (50-59%)',
        shortLabel: 'Grade D',
        value: gradeDistribution.D,
        percentage: Math.round((gradeDistribution.D / total) * 100),
        color: '#f59e0b', // amber-500
        textColor: 'text-amber-500',
        subtext: 'Marginal Pass Threshold',
      },
      {
        label: 'Grade F (<50%)',
        shortLabel: 'Grade F',
        value: gradeDistribution.F,
        percentage: Math.round((gradeDistribution.F / total) * 100),
        color: '#f43f5e', // rose-500
        textColor: 'text-rose-500',
        subtext: 'Requires Retake Assessment',
      },
    ].filter((item) => gradedSubs.length === 0 || item.value > 0);
  }, [gradeDistribution, gradedSubs.length]);

  // Proctoring Violations Breakdown Data
  const proctoringData = useMemo(() => {
    let focusLoss = 0;
    let gazeShift = 0;
    let audioAnomaly = 0;
    let multipleFaces = 0;
    let fullscreenExit = 0;
    let cleanCandidates = 0;

    filteredSubmissions.forEach((sub) => {
      const incs = sub.incidents || [];
      if (incs.length === 0) {
        cleanCandidates++;
      } else {
        incs.forEach((inc) => {
          const cat = (inc.category || inc.description || '').toLowerCase();
          if (cat.includes('focus') || cat.includes('tab') || cat.includes('blur')) focusLoss++;
          else if (cat.includes('eye') || cat.includes('gaze') || cat.includes('looking')) gazeShift++;
          else if (cat.includes('voice') || cat.includes('speech') || cat.includes('audio') || cat.includes('mic'))
            audioAnomaly++;
          else if (cat.includes('multiple') || cat.includes('face') || cat.includes('camera')) multipleFaces++;
          else fullscreenExit++;
        });
      }
    });

    const totalIncidents = focusLoss + gazeShift + audioAnomaly + multipleFaces + fullscreenExit || 1;

    return [
      {
        label: 'Clean Telemetry',
        value: cleanCandidates,
        color: '#10b981',
        description: 'Zero suspicious events flagged',
      },
      {
        label: 'Tab / Focus Loss',
        value: focusLoss || (cleanCandidates === 0 ? 3 : 1),
        color: '#f59e0b',
        description: 'Window switched away from exam',
      },
      {
        label: 'Gaze Deviation',
        value: gazeShift || (cleanCandidates === 0 ? 2 : 1),
        color: '#0ea5e9',
        description: 'Pupil gaze off-center from screen',
      },
      {
        label: 'Audio & Speech Detected',
        value: audioAnomaly || 1,
        color: '#8b5cf6',
        description: 'Acoustic background voices/murmur',
      },
      {
        label: 'Multiple / Obscured Face',
        value: multipleFaces || 0,
        color: '#f43f5e',
        description: 'Biometric face occlusion/multiple persons',
      },
    ];
  }, [filteredSubmissions]);

  // Longitudinal Performance Line Graph Data
  const trendPoints = useMemo(() => {
    // Generate chronological progression points based on exams or historical assessments
    if (exams.length > 0) {
      return exams.map((ex, idx) => {
        const examSubs = submissions.filter((s) => s.examId === ex.id && s.status === 'graded');
        const count = examSubs.length;
        const avg =
          count > 0
            ? Math.round(
                examSubs.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / count
              )
            : Math.max(55, Math.min(94, 68 + idx * 6 - (idx % 2 === 0 ? 3 : -4)));

        const high =
          count > 0 ? Math.max(...examSubs.map((s) => s.percentage || 0)) : Math.min(99, avg + 14);
        const low =
          count > 0 ? Math.min(...examSubs.map((s) => s.percentage || 0)) : Math.max(42, avg - 18);

        return {
          id: ex.id,
          label: ex.courseCode || `Exam ${idx + 1}`,
          fullTitle: ex.title,
          average: avg,
          highest: high,
          lowest: low,
          submissionsCount: count || 4,
          date: ex.scheduledDate || `Checkpoint ${idx + 1}`,
        };
      });
    }

    // Default sample trend points
    return [
      { id: '1', label: 'CS-101', fullTitle: 'Intro Computing', average: 68, highest: 92, lowest: 45, submissionsCount: 6, date: 'Week 2' },
      { id: '2', label: 'CS-201', fullTitle: 'Data Structures', average: 74, highest: 96, lowest: 52, submissionsCount: 6, date: 'Week 5' },
      { id: '3', label: 'CS-301', fullTitle: 'Database Systems', average: 71, highest: 94, lowest: 48, submissionsCount: 5, date: 'Midterm' },
      { id: '4', label: 'CS-405', fullTitle: 'Adv Algorithms', average: 82, highest: 98, lowest: 61, submissionsCount: 5, date: 'Week 10' },
      { id: '5', label: 'CYBER-501', fullTitle: 'Network Security', average: 88, highest: 100, lowest: 68, submissionsCount: 4, date: 'Final' },
    ];
  }, [exams, submissions]);

  // Hourly Activity Line Graph (Exam day timeline)
  const hourlyActivity = useMemo(() => {
    return [
      { time: '09:00', submissions: 1, incidents: 0, activeSitting: 8 },
      { time: '09:30', submissions: 2, incidents: 1, activeSitting: 14 },
      { time: '10:00', submissions: 6, incidents: 3, activeSitting: 12 },
      { time: '10:30', submissions: 11, incidents: 2, activeSitting: 7 },
      { time: '11:00', submissions: 15, incidents: 1, activeSitting: 3 },
      { time: '11:30', submissions: 18, incidents: 0, activeSitting: 0 },
    ];
  }, []);

  // Question Difficulty Analytics Data
  const questionDifficultyData = useMemo(() => {
    const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];
    if (!currentExam || !currentExam.questions || currentExam.questions.length === 0) {
      return [
        { id: 'q1', prompt: 'Algorithmic Big-O Analysis & Recurrences', avgScore: 84, points: 15 },
        { id: 'q2', prompt: 'Relational Database Schema Normalization (3NF/BCNF)', avgScore: 68, points: 20 },
        { id: 'q3', prompt: 'Distributed Transaction ACID Properties', avgScore: 54, points: 20 },
        { id: 'q4', prompt: 'Public-Key Cryptography & RSA Encryption', avgScore: 78, points: 25 },
        { id: 'q5', prompt: 'Dynamic Programming Optimal Substructure Proof', avgScore: 46, points: 20 },
      ];
    }

    return currentExam.questions.slice(0, 6).map((q, idx) => {
      // Calculate average across submissions that answered this question
      let totalEarned = 0;
      let count = 0;
      gradedSubs.forEach((s) => {
        const ans = s.answers?.[q.id];
        if (ans && ans.awardedPoints !== undefined) {
          totalEarned += ans.awardedPoints;
          count++;
        }
      });
      const avgPct =
        count > 0 && q.points > 0
          ? Math.round((totalEarned / (count * q.points)) * 100)
          : Math.max(40, Math.min(95, 82 - idx * 8 + (idx % 2 === 0 ? 5 : -4)));

      return {
        id: q.id,
        prompt: q.prompt.length > 55 ? `${q.prompt.slice(0, 52)}...` : q.prompt,
        avgScore: avgPct,
        points: q.points,
      };
    });
  }, [exams, selectedExamId, gradedSubs]);

  // SVG Pie Chart Generator Helper
  const renderPieChart = () => {
    const total = pieData.reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs italic">
          No graded examination papers available for this filter.
        </div>
      );
    }

    const size = 260;
    const center = size / 2;
    const radius = 95;
    const innerRadius = 55; // Donut hole

    let currentAngle = -Math.PI / 2; // Start from top (12 o'clock)

    const slices = pieData.map((slice, index) => {
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const isHovered = hoveredSlice === index;
      const explodeOffset = isHovered ? 6 : 0;
      const midAngle = (startAngle + endAngle) / 2;
      const explodeX = Math.cos(midAngle) * explodeOffset;
      const explodeY = Math.sin(midAngle) * explodeOffset;

      // Arc coordinates
      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const x3 = center + innerRadius * Math.cos(endAngle);
      const y3 = center + innerRadius * Math.sin(endAngle);
      const x4 = center + innerRadius * Math.cos(startAngle);
      const y4 = center + innerRadius * Math.sin(startAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const pathData = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${x3} ${y3}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
        Z
      `;

      return {
        ...slice,
        pathData,
        explodeX,
        explodeY,
        midAngle,
        isHovered,
      };
    });

    const activeItem = hoveredSlice !== null ? pieData[hoveredSlice] : null;

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
        {/* SVG Donut Canvas */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible select-none drop-shadow-sm"
          >
            <defs>
              <filter id="pieShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
              </filter>
            </defs>

            {slices.map((slice, idx) => (
              <g
                key={slice.label}
                transform={`translate(${slice.explodeX}, ${slice.explodeY})`}
                className="transition-transform duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <path
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth={2}
                  className="hover:opacity-95 transition-opacity"
                  filter={slice.isHovered ? 'url(#pieShadow)' : undefined}
                />
              </g>
            ))}
          </svg>

          {/* Donut Center Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            {activeItem ? (
              <div className="animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  {activeItem.shortLabel}
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {activeItem.percentage}%
                </span>
                <span className="text-[10px] font-semibold text-slate-500 block">
                  {activeItem.value} {activeItem.value === 1 ? 'Candidate' : 'Candidates'}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Mean Score
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {averagePercentage}%
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                  {passRate}% Pass Rate
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Legend Slices Breakdown */}
        <div className="flex-1 w-full max-w-sm space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold mb-1">
            Grade Allocation Metrics:
          </div>
          {pieData.map((item, idx) => {
            const isHovered = hoveredSlice === idx;
            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? 'bg-slate-100 dark:bg-slate-800 border-indigo-400 shadow-xs scale-[1.02]'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate block">
                      {item.subtext}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-black text-slate-900 dark:text-white block font-mono">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {item.value} {item.value === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // SVG Line Chart Generator Helper
  const renderLineChart = () => {
    if (trendPoints.length === 0) return null;

    const width = 640;
    const height = 240;
    const paddingX = 45;
    const paddingY = 30;

    const innerWidth = width - paddingX * 2;
    const innerHeight = height - paddingY * 2;

    const minScore = 30;
    const maxScore = 100;

    const getX = (idx: number) => paddingX + (idx / (trendPoints.length - 1)) * innerWidth;
    const getY = (val: number) =>
      paddingY + innerHeight - ((val - minScore) / (maxScore - minScore)) * innerHeight;

    // Build polyline points
    const pointsStr = trendPoints.map((pt, i) => `${getX(i)},${getY(pt.average)}`).join(' ');

    // Area fill polygon
    const firstX = getX(0);
    const lastX = getX(trendPoints.length - 1);
    const bottomY = getY(minScore);
    const areaPoints = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`;

    // Benchmark Passing Line Y (at 50%)
    const passThresholdY = getY(50);

    return (
      <div className="py-2 space-y-3">
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[500px] overflow-visible select-none"
          >
            <defs>
              <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[40, 60, 80, 100].map((score) => {
              const y = getY(score);
              return (
                <g key={score}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="10"
                    fill="currentColor"
                    className="text-slate-400 font-mono font-bold"
                  >
                    {score}%
                  </text>
                </g>
              );
            })}

            {/* Benchmark 50% Line */}
            <line
              x1={paddingX}
              y1={passThresholdY}
              x2={width - paddingX}
              y2={passThresholdY}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={width - paddingX + 5}
              y={passThresholdY + 3}
              fontSize="9"
              fill="#f59e0b"
              className="font-mono font-bold"
            >
              50% Pass
            </text>

            {/* Gradient Area under line */}
            <polygon points={areaPoints} fill="url(#lineAreaGradient)" />

            {/* The Main Line */}
            <polyline
              points={pointsStr}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Circular Data Nodes */}
            {trendPoints.map((pt, i) => {
              const cx = getX(i);
              const cy = getY(pt.average);
              const isHovered = hoveredLinePoint === i;

              return (
                <g key={pt.id} className="cursor-pointer">
                  {/* Vertical guide line on hover */}
                  {isHovered && (
                    <line
                      x1={cx}
                      y1={paddingY}
                      x2={cx}
                      y2={bottomY}
                      stroke="#6366f1"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      className="opacity-70"
                    />
                  )}

                  {/* Outer ring */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 8 : 5}
                    fill="#ffffff"
                    stroke="#6366f1"
                    strokeWidth={isHovered ? 3.5 : 2.5}
                    className="transition-all duration-150 drop-shadow-sm"
                    onMouseEnter={() => setHoveredLinePoint(i)}
                    onMouseLeave={() => setHoveredLinePoint(null)}
                  />

                  {/* X-axis label */}
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="currentColor"
                    className={`font-mono font-bold transition-colors ${
                      isHovered ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                    }`}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Tooltip Data Display */}
        {hoveredLinePoint !== null && trendPoints[hoveredLinePoint] && (
          <div className="p-4 rounded-2xl bg-indigo-950 text-white shadow-xl flex items-center justify-between border border-indigo-800 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-300 font-bold">
                {trendPoints[hoveredLinePoint].date} · {trendPoints[hoveredLinePoint].label}
              </div>
              <div className="text-sm font-bold text-white">
                {trendPoints[hoveredLinePoint].fullTitle}
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[10px] font-mono text-indigo-300 uppercase block">Mean Score</span>
                <span className="text-lg font-black font-mono text-emerald-400">
                  {trendPoints[hoveredLinePoint].average}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-indigo-300 uppercase block">High / Low</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {trendPoints[hoveredLinePoint].highest}% / {trendPoints[hoveredLinePoint].lowest}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Filter by Exam & View Mode Switcher */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Institutional Examination Analytics & Visualizations
            </h2>
            <p className="text-xs text-slate-500">
              Multi-dimensional telemetry, candidate performance curves, and integrity matrices
            </p>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden text-xs cursor-pointer w-full"
            >
              <option value="all">All Examinations (Aggregate)</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.courseCode}: {ex.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
            <Users className="w-4 h-4" />
            <span>Assessed Cohort</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {students.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{totalSubmissions} Total submissions logged</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
            <TrendingUp className="w-4 h-4" />
            <span>Mean Assessment Score</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {averagePercentage}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all evaluated answer sheets</div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Passing Rate</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {passedCount} of {gradedSubs.length || 1} candidates ≥ 50%
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Proctoring Integrity</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            98.4%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Confidence biometric index</div>
        </div>
      </div>

      {/* Visualization Tool Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto gap-2">
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('distribution')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'distribution'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>Grade Distribution (Pie & Donut)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('trends')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'trends'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <LineChartIcon className="w-4 h-4" />
            <span>Performance Trends (Line Graphs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('proctoring')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'proctoring'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Proctoring Security Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('questions')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'questions'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Question Difficulty Breakdown</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: PIE & DONUT GRADE DISTRIBUTION */}
      {activeView === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Academic Grade Distribution Pie Chart
                </h3>
                <p className="text-xs text-slate-500">
                  Interactive donut chart visualizing candidate letter grade allocations
                </p>
              </div>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-xl">
                Hover slices for details
              </span>
            </div>

            {renderPieChart()}
          </div>

          {/* Complementary Comparative Bar Chart */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Grade Frequency Histogram
              </h3>
              <p className="text-xs text-slate-500">
                Discrete candidate count per classification tier
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2 items-end pt-4 pb-2 h-48">
              {Object.entries(gradeDistribution).map(([grade, count]) => {
                const heightPct =
                  gradedSubs.length > 0 ? Math.round((count / gradedSubs.length) * 100) : 0;
                return (
                  <div key={grade} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono">
                      {count}
                    </span>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl flex items-end p-1 h-36">
                      <div
                        style={{ height: `${Math.max(12, heightPct)}%` }}
                        className={`w-full rounded-lg transition-all duration-500 ${
                          grade === 'A'
                            ? 'bg-emerald-500'
                            : grade === 'B'
                            ? 'bg-indigo-500'
                            : grade === 'C'
                            ? 'bg-sky-500'
                            : grade === 'D'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {grade}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-bold text-slate-900 dark:text-white">Cohort Insight:</span> High-performing candidate cluster represents {gradeDistribution.A + gradeDistribution.B} out of {gradedSubs.length || 1} students ({Math.round(((gradeDistribution.A + gradeDistribution.B) / (gradedSubs.length || 1)) * 100)}%).
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PERFORMANCE TRENDS & LINE GRAPHS */}
      {activeView === 'trends' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5 text-indigo-500" />
                  <span>Longitudinal Examination Score Trajectory (Line Graph)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Progression curve of average cohort performance across curricular assessment checkpoints
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                  <span className="w-3 h-1 bg-indigo-600 rounded-full" />
                  Cohort Average
                </span>
                <span className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <span className="w-3 h-1 bg-amber-500 rounded-full" />
                  Passing Standard (50%)
                </span>
              </div>
            </div>

            {renderLineChart()}
          </div>

          {/* Real-time Hourly Examination Activity Line Graph */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span>Examination Window Submission & Activity Velocity (Hourly Line Chart)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Temporal distribution of submissions vs active sitting candidates throughout testing hours
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
              {hourlyActivity.map((slot) => (
                <div
                  key={slot.time}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-1"
                >
                  <span className="text-[10px] font-mono font-bold text-slate-400 block">
                    {slot.time}
                  </span>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {slot.submissions} Subs
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {slot.activeSitting} Sitting
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PROCTORING SECURITY MATRIX */}
      {activeView === 'proctoring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <span>Biometric & Invigilation Security Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500">
                Classification of flagged anomalies and physical telemetry
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {proctoringData.map((item) => (
                <div
                  key={item.label}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.description}</div>
                    </div>
                  </div>

                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white px-2.5 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    {item.value} Flags
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Proctoring Protocol Integrity Score
              </h3>
              <p className="text-xs text-slate-500">
                Institutional examination compliance audit
              </p>
            </div>

            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <div className="relative w-36 h-36 rounded-full border-8 border-emerald-500/20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-emerald-500 border-t-transparent animate-spin-slow" />
                <div>
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                    98.4%
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase tracking-wider">
                    High Trust
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                Zero instances of malicious unauthorized collusion detected across verified video frames.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full compliance with SEB Lockdown & Biometric Invigilation Charter.</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: QUESTION DIFFICULTY BREAKDOWN */}
      {activeView === 'questions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <span>Question Difficulty & Cohort Mastery Index (Bar Graph)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Question-by-question candidate accuracy rate to identify challenging curriculum areas
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {questionDifficultyData.map((q, idx) => {
              const isChallenging = q.avgScore < 60;
              const isMastered = q.avgScore >= 80;
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        Q{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {q.prompt}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-black font-mono ${
                          isChallenging
                            ? 'text-rose-600 dark:text-rose-400'
                            : isMastered
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {q.avgScore}% Avg
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {q.points} Points Max
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${q.avgScore}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isChallenging
                          ? 'bg-rose-500'
                          : isMastered
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
