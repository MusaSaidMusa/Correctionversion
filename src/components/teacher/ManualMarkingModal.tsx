import React, { useState } from 'react';
import {
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Check,
  Plus,
  Minus,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import {
  manualGradeFullSubmission,
  requestCommittedMarkChange,
} from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';
import { cleanDisplayCaption } from '../../services/imageCompressionService';

interface ManualMarkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: ExamSubmission;
  exam: Exam;
  instructorName: string;
  onGradingCompleted: () => void;
}

interface QuestionGradeState {
  awardedPoints: number;
  feedback?: string;
  pointMarks?: Record<number, 'tick' | 'cross'>;
}

export const ManualMarkingModal: React.FC<ManualMarkingModalProps> = ({
  isOpen,
  onClose,
  submission,
  exam,
  instructorName,
  onGradingCompleted,
}) => {
  const isCommitted = Boolean(submission.isResultCommitted);

  // Initialize marks state for each question
  const [grades, setGrades] = useState<Record<string, QuestionGradeState>>(() => {
    const initial: Record<string, QuestionGradeState> = {};
    exam.questions.forEach((q) => {
      const ans = submission.answers?.[q.id];
      initial[q.id] = {
        awardedPoints: ans?.awardedPoints ?? 0,
        feedback: ans?.teacherFeedback || '',
        pointMarks: {},
      };
    });
    return initial;
  });

  const [overallRemarks, setOverallRemarks] = useState('');
  const [committedChangeReason, setCommittedChangeReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handlePointChange = (qId: string, val: number, maxPoints: number) => {
    const clamped = Math.max(0, Math.min(maxPoints, val));
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], awardedPoints: clamped },
    }));
  };

  const handleMarkFullCorrect = (qId: string, maxPoints: number) => {
    setGrades((prev) => {
      const current = prev[qId] || { awardedPoints: 0 };
      const newPointMarks: Record<number, 'tick' | 'cross'> = {};
      // Mark all points as ticks
      const ans = submission.answers?.[qId];
      const textPoints = (ans?.textAnswer || '')
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      textPoints.forEach((_, pIdx) => {
        newPointMarks[pIdx] = 'tick';
      });

      return {
        ...prev,
        [qId]: {
          ...current,
          awardedPoints: maxPoints,
          pointMarks: newPointMarks,
        },
      };
    });
  };

  const handleMarkUnright = (qId: string) => {
    setGrades((prev) => {
      const current = prev[qId] || { awardedPoints: 0 };
      const newPointMarks: Record<number, 'tick' | 'cross'> = {};
      // Mark all points as crosses
      const ans = submission.answers?.[qId];
      const textPoints = (ans?.textAnswer || '')
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      textPoints.forEach((_, pIdx) => {
        newPointMarks[pIdx] = 'cross';
      });

      return {
        ...prev,
        [qId]: {
          ...current,
          awardedPoints: 0,
          pointMarks: newPointMarks,
        },
      };
    });
  };

  const handleToggleLinePointMark = (qId: string, pIdx: number, markType: 'tick' | 'cross', maxPoints: number) => {
    setGrades((prev) => {
      const current = prev[qId] || { awardedPoints: 0, pointMarks: {} };
      const currentPointMarks = { ...(current.pointMarks || {}) };
      
      if (currentPointMarks[pIdx] === markType) {
        delete currentPointMarks[pIdx];
      } else {
        currentPointMarks[pIdx] = markType;
      }

      // Calculate points dynamically from ticks
      const tickCount = Object.values(currentPointMarks).filter((m) => m === 'tick').length;
      const totalPointsCount = (submission.answers?.[qId]?.textAnswer || '')
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean).length || 1;

      const calculated = Math.min(maxPoints, Math.round((tickCount / totalPointsCount) * maxPoints));

      return {
        ...prev,
        [qId]: {
          ...current,
          pointMarks: currentPointMarks,
          awardedPoints: calculated,
        },
      };
    });
  };

  const handleFeedbackChange = (qId: string, text: string) => {
    setGrades((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], feedback: text },
    }));
  };

  const currentTotalScore = Object.values(grades).reduce(
    (sum, g) => sum + (g.awardedPoints || 0),
    0
  );
  const totalPossible = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaving(true);

    try {
      if (isCommitted) {
        if (!committedChangeReason.trim()) {
          setErrorMessage('Written justification is mandatory for committed-mark alterations.');
          triggerFlash({
            type: 'error',
            text: 'Justification Required',
            subtext: 'Written justification is required before altering committed student results.',
          });
          setSaving(false);
          return;
        }

        const res = requestCommittedMarkChange(
          submission.id,
          grades,
          committedChangeReason.trim(),
          instructorName
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to submit mark-change request.');
          triggerFlash({
            type: 'error',
            text: 'Request Submission Failed',
            subtext: res.error || 'Could not record mark alteration request.',
          });
          setSaving(false);
          return;
        }

        triggerFlash({
          type: 'success',
          text: 'Mark Change Justification Submitted',
          subtext: `Adjustment request for ${submission.studentName || 'candidate'} forwarded to Super Admin Directorate.`,
        });
      } else {
        const res = manualGradeFullSubmission(
          submission.id,
          grades,
          overallRemarks.trim(),
          instructorName
        );

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to record manual marks.');
          triggerFlash({
            type: 'error',
            text: 'Marking Failed',
            subtext: res.error || 'Could not record candidate marks.',
          });
          setSaving(false);
          return;
        }

        triggerFlash({
          type: 'success',
          text: 'Evaluation Marks Published',
          subtext: `Candidate marks recorded: ${currentTotalScore} / ${totalPossible} Marks (${Math.round((currentTotalScore / (totalPossible || 1)) * 100)}%).`,
        });
      }

      onGradingCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving grades.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>Manual Exam Marking & Answer Sheet Evaluation</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluating candidate <strong>{submission.studentName || submission.studentId}</strong> &bull; {exam.courseCode} ({exam.title})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Institutional Mark Lock warning if already committed */}
          {isCommitted && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900 rounded-xl text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Institutional Mark Lock Active</span>
              </div>
              <p>
                This script has already been committed to the Student Portal. Any alterations will generate a formal audit change request for Super Admin Directorate approval.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200">
              {errorMessage}
            </div>
          )}

          {/* Current Score Summary & Global Marking Toolset Info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] text-slate-500 uppercase font-semibold font-mono">
                Total Evaluation Score
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {currentTotalScore} <span className="text-xs font-normal text-slate-500">/ {totalPossible} Marks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-slate-500 uppercase font-semibold font-mono">Percentage</div>
                <div className="text-xl font-bold font-mono">
                  {totalPossible > 0 ? Math.round((currentTotalScore / totalPossible) * 100) : 0}%
                </div>
              </div>

              {/* Status pill */}
              <div className="pl-3 border-l border-slate-300 dark:border-slate-700">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs ${
                  currentTotalScore >= totalPossible * 0.5
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                }`}>
                  {currentTotalScore >= totalPossible * 0.5 ? 'Passing Script' : 'Unsatisfactory'}
                </span>
              </div>
            </div>
          </div>

          {/* Question grading cards with Marking Toolset */}
          <div className="space-y-6">
            {exam.questions.map((q, idx) => {
              const ans = submission.answers?.[q.id];
              const grade = grades[q.id] || { awardedPoints: 0, pointMarks: {} };
              const maxPoints = q.points || 1;
              const isFullPoints = grade.awardedPoints === maxPoints;
              const isZeroPoints = grade.awardedPoints === 0;
              const isPartialPoints = grade.awardedPoints > 0 && grade.awardedPoints < maxPoints;

              const textLines = (ans?.textAnswer || '')
                .split(/\n+/)
                .map((p) => p.trim())
                .filter(Boolean);

              return (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 shadow-xs space-y-4"
                >
                  {/* Question Header & Max Marks */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          Question {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {q.type}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 mt-1 text-xs leading-relaxed font-serif">
                        {q.prompt}
                      </p>

                      {/* Attached Diagram / Illustration fitted properly below the question */}
                      {q.imageUrl && (
                        <div className="my-2.5 flex flex-col items-center justify-center w-full">
                          <div className="max-w-full overflow-hidden rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xs">
                            <img
                              src={q.imageUrl}
                              alt={cleanDisplayCaption(q.imageCaption, q.imageUrl) || `Question ${idx + 1} Figure`}
                              className="max-h-56 max-w-full w-auto object-contain mx-auto rounded block"
                              loading="lazy"
                            />
                          </div>
                          {cleanDisplayCaption(q.imageCaption, q.imageUrl) && (
                            <p className="mt-1 text-[11px] text-slate-500 italic text-center font-medium">
                              {cleanDisplayCaption(q.imageCaption, q.imageUrl)}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Official Marking Scheme & Solution Key Reference */}
                      {(q.sampleAnswer || q.explanation) && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-[11px] mb-1">
                            <Award className="w-3.5 h-3.5" />
                            <span>Official Marking Scheme & Criteria (Teacher Allocated: {maxPoints} Marks):</span>
                          </div>
                          <div className="whitespace-pre-wrap font-serif text-slate-800 dark:text-slate-200 leading-relaxed text-xs pl-1">
                            {q.sampleAnswer || q.explanation}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        Max: {maxPoints} Marks
                      </span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* MARKING TOOLSET BAR: GREEN BEAUTIFUL TICK & RED BEAUTIFUL X   */}
                  {/* ------------------------------------------------------------- */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                        Marking Toolset:
                      </span>

                      {/* 1. GREEN BEAUTIFUL TICK FOR RIGHT POINTS */}
                      <button
                        type="button"
                        onClick={() => handleMarkFullCorrect(q.id, maxPoints)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          isFullPoints
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md scale-105'
                            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                        }`}
                        title="Mark candidate answer as completely right (Award Full Points)"
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Mark Right (+{maxPoints} pts)</span>
                      </button>

                      {/* 2. RED BEAUTIFUL X FOR UNRIGHT / INCORRECT POINTS */}
                      <button
                        type="button"
                        onClick={() => handleMarkUnright(q.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          isZeroPoints
                            ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-md scale-105'
                            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 hover:bg-rose-100'
                        }`}
                        title="Mark candidate answer as unright (0 Points)"
                      >
                        <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>Mark Unright (0 pts)</span>
                      </button>
                    </div>

                    {/* Stepper & Direct Mark Allocation */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">Awarded:</span>
                      <button
                        type="button"
                        onClick={() => handlePointChange(q.id, grade.awardedPoints - 1, maxPoints)}
                        disabled={grade.awardedPoints <= 0}
                        className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                        title="Deduct 1 mark"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min={0}
                        max={maxPoints}
                        value={grade.awardedPoints}
                        onChange={(e) => handlePointChange(q.id, Number(e.target.value), maxPoints)}
                        className="w-14 px-2 py-1 text-center font-mono font-bold text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                      />

                      <button
                        type="button"
                        onClick={() => handlePointChange(q.id, grade.awardedPoints + 1, maxPoints)}
                        disabled={grade.awardedPoints >= maxPoints}
                        className="p-1 rounded-md bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer"
                        title="Add 1 mark"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-slate-500 font-mono">/ {maxPoints} pts</span>
                    </div>
                  </div>

                  {/* Candidate Script Box with Live Toolset Mark Stamp */}
                  <div className={`p-4 rounded-xl border transition-all space-y-3 font-sans ${
                    isFullPoints
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : isZeroPoints
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                      : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                  }`}>
                    {/* Live Evaluation Stamp Banner */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                        Candidate Answer Script:
                      </span>

                      {/* Beautiful Visual Stamp */}
                      {isFullPoints ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-bold border border-emerald-300 text-[11px] shadow-2xs">
                          <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                          <span>Evaluated Right &bull; Full Marks (+{maxPoints})</span>
                        </div>
                      ) : isZeroPoints ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-bold border border-rose-300 text-[11px] shadow-2xs">
                          <X className="w-4 h-4 text-rose-700 stroke-[3]" />
                          <span>Evaluated Unright &bull; 0 Marks</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold border border-amber-300 text-[11px] shadow-2xs">
                          <span>~ Partial Credit &bull; {grade.awardedPoints}/{maxPoints} Marks</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Written Content with Point-by-Point Ticking Tool */}
                    <div className="text-sm bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                      {textLines.length > 0 ? (
                        <div className="space-y-2.5">
                          {textLines.map((line, pIdx) => {
                            const pointMark = grade.pointMarks?.[pIdx];
                            return (
                              <div
                                key={pIdx}
                                className={`flex items-start justify-between gap-3 p-2 rounded-lg border transition-colors ${
                                  pointMark === 'tick'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
                                    : pointMark === 'cross'
                                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-100'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {pIdx + 1}
                                  </span>
                                  <span className="font-serif text-sm leading-relaxed whitespace-pre-wrap">
                                    {line}
                                  </span>
                                </div>

                                {/* Line-item Ticking Tool Buttons */}
                                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLinePointMark(q.id, pIdx, 'tick', maxPoints)}
                                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                                      pointMark === 'tick'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-emerald-600 hover:bg-emerald-100 border border-emerald-300'
                                    }`}
                                    title="Mark point right (Tick)"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLinePointMark(q.id, pIdx, 'cross', maxPoints)}
                                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                                      pointMark === 'cross'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-100 border border-rose-300'
                                    }`}
                                    title="Mark point unright (Cross)"
                                  >
                                    <X className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : ans?.selectedOptionId ? (
                        <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Selected Option: [{ans.selectedOptionId.toUpperCase()}]
                        </div>
                      ) : ans?.selectedOptionIds && ans.selectedOptionIds.length > 0 ? (
                        <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          Selected Multi-Options: {ans.selectedOptionIds.join(', ')}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No answer response submitted by candidate.</p>
                      )}
                    </div>

                    {/* Teacher Feedback Note on this question */}
                    <div>
                      <input
                        type="text"
                        placeholder="Instructor evaluation feedback or rubric note..."
                        value={grade.feedback || ''}
                        onChange={(e) => handleFeedbackChange(q.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Justification for committed mark change */}
          {isCommitted ? (
            <div>
              <label className="block font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                Mandatory Written Justification (for Super Admin Directorate Review)
              </label>
              <textarea
                rows={3}
                required
                value={committedChangeReason}
                onChange={(e) => setCommittedChangeReason(e.target.value)}
                placeholder="Detail reason for altering previously published student marks (e.g. recalculated essay points after re-evaluation of step 3)..."
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 font-mono">
                Overall Invigilator Remarks
              </label>
              <textarea
                rows={2}
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                placeholder="General comments on overall script performance..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-60"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isCommitted ? 'Submit Mark Change for Super Admin Approval' : 'Publish Graded Marks'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
