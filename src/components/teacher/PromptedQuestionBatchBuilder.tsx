import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  Layers,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  ListFilter,
  HelpCircle,
} from 'lucide-react';
import { Question, QuestionType } from '../../types';

interface PromptedQuestionBatchBuilderProps {
  initialQuestions: Question[];
  defaultTopic: string;
  courseTitle: string;
  isLocked: boolean;
  targetQuestionCount: number;
  onTargetQuestionCountChange: (count: number) => void;
  onBatchProcessed: (batch: Question[]) => void;
  onRequestReviewAndPublish?: () => void;
}

export const PromptedQuestionBatchBuilder: React.FC<PromptedQuestionBatchBuilderProps> = ({
  initialQuestions,
  defaultTopic,
  courseTitle,
  isLocked,
  targetQuestionCount,
  onTargetQuestionCountChange,
  onBatchProcessed,
  onRequestReviewAndPublish,
}) => {
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return [...initialQuestions];
    }
    const count = Math.max(1, targetQuestionCount || 5);
    return Array.from({ length: count }, (_, idx) => ({
      id: `q-seq-${Date.now()}-${idx + 1}`,
      prompt: `Question ${idx + 1}: Analyze and explain the fundamental concepts, theoretical models, and practical implementations relevant to ${courseTitle || defaultTopic || 'the course material'}.`,
      points: 10,
      type: 'essay' as QuestionType,
      topic: defaultTopic || 'Core Subject',
      sampleAnswer: `Official Marking Scheme & Model Rubric for Question ${idx + 1}:\n- Theoretical Definition & Core Concepts (4 Marks)\n- Architectural Analysis & Derivation (4 Marks)\n- Practical Evaluation & Synthesis (2 Marks)`,
      explanation: `Verified grading criteria for Question ${idx + 1}`,
    }));
  });

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'step_by_step' | 'list'>('step_by_step');

  // Initialize and synchronize with parent
  useEffect(() => {
    if (!initialQuestions || initialQuestions.length === 0) {
      onBatchProcessed(questions);
      onTargetQuestionCountChange(questions.length);
    }
  }, []);

  // Sync if initialQuestions changes from outside
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0 && initialQuestions !== questions) {
      const currentIds = questions
        .map((q) => `${q.id}-${q.prompt}-${q.sampleAnswer}-${q.points}-${q.type}`)
        .join(';;');
      const newIds = initialQuestions
        .map((q) => `${q.id}-${q.prompt}-${q.sampleAnswer}-${q.points}-${q.type}`)
        .join(';;');
      if (currentIds !== newIds) {
        setQuestions([...initialQuestions]);
        if (currentStep >= initialQuestions.length) {
          setCurrentStep(Math.max(0, initialQuestions.length - 1));
        }
      }
    }
  }, [initialQuestions]);

  // Adjust number of questions when target question count changes
  const handleTargetCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(100, newCount));
    onTargetQuestionCountChange(validCount);

    setQuestions((prev) => {
      let next: Question[];
      if (validCount > prev.length) {
        const added: Question[] = Array.from(
          { length: validCount - prev.length },
          (_, idx) => {
            const num = prev.length + idx + 1;
            return {
              id: `q-seq-${Date.now()}-${num}`,
              prompt: `Question ${num}: Analyze and explain the core principles, analytical methods, and problem formulations for ${courseTitle || defaultTopic}.`,
              points: 10,
              type: 'essay' as QuestionType,
              topic: defaultTopic || 'Core Subject',
              sampleAnswer: `Official Marking Scheme & Model Answer for Q${num}:\n- Core Principles & Definitions (5 Marks)\n- Analytical Explanation & Working (5 Marks)`,
              explanation: `Official marking rubric for Question ${num}`,
            };
          }
        );
        next = [...prev, ...added];
      } else {
        next = prev.slice(0, validCount);
      }
      onBatchProcessed(next);
      return next;
    });

    if (currentStep >= validCount) {
      setCurrentStep(validCount - 1);
    }
  };

  const handleUpdateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      onBatchProcessed(next);
      return next;
    });
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: Question = {
      id: `q-seq-${Date.now()}-${nextNum}`,
      prompt: `Question ${nextNum}: Provide a detailed technical explanation and comparative evaluation...`,
      points: 10,
      type: 'essay',
      topic: defaultTopic || 'Core Subject',
      sampleAnswer: `Official Marking Scheme for Question ${nextNum}:\n- Core Principles & Formulation (5 Marks)\n- Technical Discussion & Proof (5 Marks)`,
      explanation: `Grading rubric for Question ${nextNum}`,
    };
    const nextList = [...questions, newQ];
    setQuestions(nextList);
    onTargetQuestionCountChange(nextList.length);
    onBatchProcessed(nextList);
    setCurrentStep(nextList.length - 1);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const nextList = questions.filter((_, i) => i !== index);
    setQuestions(nextList);
    onTargetQuestionCountChange(nextList.length);
    onBatchProcessed(nextList);
    if (currentStep >= nextList.length) {
      setCurrentStep(Math.max(0, nextList.length - 1));
    }
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const nextList = [...questions];
    const temp = nextList[index];
    nextList[index] = nextList[targetIdx];
    nextList[targetIdx] = temp;
    setQuestions(nextList);
    onBatchProcessed(nextList);
    setCurrentStep(targetIdx);
  };

  const handleApplyBatch = () => {
    onBatchProcessed(questions);
    onTargetQuestionCountChange(questions.length);
    if (onRequestReviewAndPublish) {
      onRequestReviewAndPublish();
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const questionsWithScheme = questions.filter(
    (q) => Boolean(q.sampleAnswer?.trim() || q.explanation?.trim() || q.rubric?.trim())
  ).length;

  const activeQ = questions[currentStep] || questions[0];
  const isLastQuestion = currentStep === questions.length - 1;
  const isFirstQuestion = currentStep === 0;

  return (
    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-slate-900/40 space-y-4">
      {/* Top Header: Quota & Mode Configuration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Step-by-Step Question & Marking Scheme Prompt Engine</span>
              <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold">
                {questionsWithScheme}/{questions.length} Answers / Schemes Set
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Set each question and its answer, review step-by-step, then review all questions before publishing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* User enters the number of questions to set */}
          <div className="flex items-center gap-2 text-xs bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-slate-700 shadow-2xs">
            <span className="font-bold text-indigo-950 dark:text-indigo-200">Questions to Set:</span>
            <input
              type="number"
              min={1}
              max={100}
              disabled={isLocked}
              value={targetQuestionCount}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                handleTargetCountChange(val);
              }}
              className="w-14 px-2 py-0.5 rounded border border-indigo-300 dark:border-slate-600 bg-indigo-50/70 dark:bg-slate-900 text-center font-bold text-xs text-indigo-950 dark:text-indigo-200"
              title="Enter total number of questions to set for this examination"
            />
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs font-bold font-mono">
            {totalPoints} Marks Total
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('step_by_step')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer ${
                viewMode === 'step_by_step'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Step-by-Step Flow
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List Matrix View
            </button>
          </div>
        </div>
      </div>

      {/* Step Navigator: Interactive Question Bubbles */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
        {questions.map((q, idx) => {
          const hasPrompt = Boolean(q.prompt?.trim());
          const hasScheme = Boolean(q.sampleAnswer?.trim() || q.explanation?.trim() || q.rubric?.trim());
          const isComplete = hasPrompt && hasScheme;
          const isActive = idx === currentStep;

          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => {
                setCurrentStep(idx);
                if (viewMode !== 'step_by_step') setViewMode('step_by_step');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 shadow-xs'
                  : isComplete
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
              title={`Question ${idx + 1}: ${isComplete ? 'Prompt & Scheme Ready' : 'Pending content'}`}
            >
              <span>Q{idx + 1}</span>
              {isComplete ? (
                <CheckCircle2 className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`} />
              ) : (
                <AlertCircle className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
              )}
            </button>
          );
        })}

        <button
          type="button"
          disabled={isLocked}
          onClick={handleAddQuestion}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-colors cursor-pointer shrink-0"
          title="Add another question to set"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Q{questions.length + 1}</span>
        </button>
      </div>

      {/* MODE 1: STEP-BY-STEP GUIDED FLOW (User enters question, answer, reviews or moves to next until final question) */}
      {viewMode === 'step_by_step' && activeQ && (
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-indigo-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          {/* Header of Active Step */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {currentStep + 1}
              </span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                  Question {currentStep + 1} of {questions.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  ({activeQ.points || 10} Marks Allocated)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                disabled={isLocked}
                value={activeQ.type || 'essay'}
                onChange={(e) => handleUpdateQuestion(currentStep, { type: e.target.value as QuestionType })}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="essay">Essay / Long Answer</option>
                <option value="short_answer">Short Answer</option>
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="coding">Code Implementation</option>
              </select>

              <div className="flex items-center gap-1 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] font-mono">Marks:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  disabled={isLocked}
                  value={activeQ.points || 10}
                  onChange={(e) =>
                    handleUpdateQuestion(currentStep, { points: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-12 px-1 text-center font-bold text-xs rounded border border-slate-300 bg-white"
                />
              </div>

              {questions.length > 1 && (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleRemoveQuestion(currentStep)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  title="Delete this question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>


          {/* Question Prompt Field */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Question Statement / Problem Prompt #{currentStep + 1}:
            </label>
            <textarea
              disabled={isLocked}
              rows={3}
              value={activeQ.prompt}
              placeholder={`Enter the full question statement, analytical scenario, or problem description for Question ${currentStep + 1}...`}
              onChange={(e) => handleUpdateQuestion(currentStep, { prompt: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 leading-relaxed font-normal focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Dedicated Official Marking Scheme & Model Answer Field */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/60 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Official Answer, Model Solution & Marking Scheme for Q{currentStep + 1}:</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                Max Marks: {activeQ.points || 10}
              </span>
            </div>
            <textarea
              disabled={isLocked}
              rows={3}
              value={activeQ.sampleAnswer || ''}
              placeholder={`Provide the official model answer, grading breakdown, and rubric criteria for Question ${currentStep + 1}...\nExample:\n- Concept formulation & definitions (4 Marks)\n- Step-by-step mathematical working or technical architecture (4 Marks)\n- Final evaluation and synthesis (2 Marks)`}
              onChange={(e) =>
                handleUpdateQuestion(currentStep, {
                  sampleAnswer: e.target.value,
                  explanation: e.target.value,
                  rubric: e.target.value,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 italic">
              This answer & marking scheme is automatically linked to the official examination key and used for student answer grading.
            </p>
          </div>

          {/* STEP NAVIGATION PROMPT CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              {!isFirstQuestion ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Review Previous Question (Q{currentStep})</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium italic">
                  First Question in Examination
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isLastQuestion ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs hover:scale-101 cursor-pointer transition-all"
                >
                  <span>Save & Move to Next Question (Q{currentStep + 2} of {questions.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                /* FINAL QUESTION REACHED: Prompted to review all questions and answers and publish or edit */
                <button
                  type="button"
                  onClick={handleApplyBatch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md hover:scale-102 cursor-pointer transition-all"
                  title="Review all questions and answers in full examination paper before publishing"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Review All Questions & Answers & Publish ({questions.length} Set)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: LIST MATRIX VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const hasScheme = Boolean(q.sampleAnswer?.trim() || q.explanation?.trim() || q.rubric?.trim());
            return (
              <div
                key={q.id || idx}
                className="p-3.5 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      disabled={isLocked}
                      placeholder="Topic / Module"
                      value={q.topic || ''}
                      onChange={(e) => handleUpdateQuestion(idx, { topic: e.target.value })}
                      className="px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 font-medium text-slate-800"
                    />
                    <select
                      disabled={isLocked}
                      value={q.type || 'essay'}
                      onChange={(e) => handleUpdateQuestion(idx, { type: e.target.value as QuestionType })}
                      className="px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50 font-medium text-slate-800"
                    >
                      <option value="essay">Essay / Long Answer</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="fill_blank">Fill in the Blank</option>
                      <option value="coding">Code Implementation</option>
                    </select>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                        hasScheme
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {hasScheme ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      <span>{hasScheme ? 'Scheme Defined' : 'Scheme Pending'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-slate-500 text-[11px] font-mono">Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        disabled={isLocked}
                        value={q.points || 10}
                        onChange={(e) =>
                          handleUpdateQuestion(idx, { points: Math.max(1, parseInt(e.target.value, 10) || 1) })
                        }
                        className="w-12 px-1.5 py-0.5 rounded border border-slate-200 text-center font-bold text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={isLocked || idx === 0}
                      onClick={() => handleMoveQuestion(idx, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked || idx === questions.length - 1}
                      onClick={() => handleMoveQuestion(idx, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLocked || questions.length <= 1}
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <textarea
                    disabled={isLocked}
                    rows={2}
                    value={q.prompt}
                    placeholder={`Enter question prompt statement for item #${idx + 1}...`}
                    onChange={(e) => handleUpdateQuestion(idx, { prompt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-normal focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Marking Scheme & Model Answer for Q{idx + 1}:</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                      Allocated: {q.points || 10} Marks
                    </span>
                  </div>
                  <textarea
                    disabled={isLocked}
                    rows={2}
                    value={q.sampleAnswer || ''}
                    placeholder={`Detail model solution, key evaluation criteria, and mark distribution breakdown for Question ${idx + 1}...`}
                    onChange={(e) =>
                      handleUpdateQuestion(idx, { sampleAnswer: e.target.value, explanation: e.target.value, rubric: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-emerald-300 bg-white text-xs text-slate-800 font-sans leading-relaxed focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Global Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          type="button"
          disabled={isLocked}
          onClick={handleAddQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Another Question & Scheme (Q{questions.length + 1})</span>
        </button>

        <button
          type="button"
          disabled={isLocked || questions.length === 0}
          onClick={handleApplyBatch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all hover:scale-101 cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          <span>Review All {questions.length} Questions & Answers in Exam Paper</span>
        </button>
      </div>
    </div>
  );
};
