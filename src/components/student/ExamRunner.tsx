import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Bookmark,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Send,
  Eye,
  Camera,
  Mic,
  Maximize2,
  Volume2,
  Save,
  Check,
  Flag,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  FileText,
  Sliders,
  CameraOff,
} from 'lucide-react';
import { Exam, ExamSubmission, Question, StudentAnswer, ProctorIncident } from '../../types';
import { useProctoring } from '../../hooks/useProctoring';
import { MathRenderer, AudioPromptPlayer, TechnicalDiagram } from '../common/QuestionMedia';
import { CameraSettingsModal } from '../common/CameraSettingsModal';
import { ExamSentencesRenderer } from '../../services/sentenceFormatter';
import { InstitutionLogo } from '../common/InstitutionLogo';

interface ExamRunnerProps {
  exam: Exam;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentAvatar: string;
  attemptNumber?: number;
  existingSubmission?: ExamSubmission;
  onSaveProgress: (submission: ExamSubmission) => void;
  onSubmitExam: (submission: ExamSubmission) => void;
  onExit: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  studentId,
  studentName,
  studentEmail,
  studentAvatar,
  attemptNumber = 1,
  existingSubmission,
  onSaveProgress,
  onSubmitExam,
  onExit,
}) => {
  // Examination questions (with optional question shuffling mechanism)
  const [questions, setQuestions] = useState<Question[]>(() => {
    let sourceQuestions = exam.questions;

    if (exam.shuffleQuestions) {
      if (exam.shuffleMode === 'by_topic') {
        const topicsMap: Record<string, Question[]> = {};
        sourceQuestions.forEach((q) => {
          const t = q.topic || 'General';
          if (!topicsMap[t]) topicsMap[t] = [];
          topicsMap[t].push(q);
        });
        const result: Question[] = [];
        Object.keys(topicsMap).forEach((t, tIdx) => {
          const group = [...topicsMap[t]];
          for (let i = group.length - 1; i > 0; i--) {
            const j = (studentId.charCodeAt((i + tIdx) % studentId.length) + i) % (i + 1);
            [group[i], group[j]] = [group[j], group[i]];
          }
          result.push(...group);
        });
        return result;
      } else {
        const shuffled = [...sourceQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = (studentId.charCodeAt(i % studentId.length) + i) % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }
    }
    return sourceQuestions;
  });

  const isSequentialOnly = exam.questionBehavior === 'sequential_only';

  // Current active question index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>(() => {
    return existingSubmission?.answers || {};
  });
  const [incidents, setIncidents] = useState<ProctorIncident[]>(() => {
    return existingSubmission?.incidents || [];
  });
  const [integrityScore, setIntegrityScore] = useState<number>(() => {
    return existingSubmission?.integrityScore ?? 100;
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<ExamSubmission | null>(null);
  const [lockoutBreachReason, setLockoutBreachReason] = useState<string | null>(null);
  const [answerUploadError, setAnswerUploadError] = useState<string | null>(null);

  // Timer: Duration in seconds
  const totalSeconds = exam.durationMinutes * 60;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (existingSubmission?.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(existingSubmission.startedAt).getTime()) / 1000);
      return Math.max(0, totalSeconds - elapsed);
    }
    return totalSeconds;
  });

  const [gentleAlert, setGentleAlert] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'flagged' | 'unanswered'>('all');

  // Real-Time Invigilator Actions & Telemetry State
  const [isExamPaused, setIsExamPaused] = useState<boolean>(() => existingSubmission?.isExamPaused || false);
  const [pauseReason, setPauseReason] = useState<string | null>(() => existingSubmission?.pauseReason || null);
  const [teacherUrgentWarning, setTeacherUrgentWarning] = useState<string | null>(null);
  const [isEnvironmentCheckOpen, setIsEnvironmentCheckOpen] = useState<boolean>(() => existingSubmission?.environmentCheckRequested || false);
  const [keystrokesCount, setKeystrokesCount] = useState<number>(() => existingSubmission?.keystrokesCount || 0);

  // Question timing tracker
  const questionStartTimeRef = useRef<number>(Date.now());

  const handleIncidentCallback = useCallback((incident: ProctorIncident) => {
    setIncidents((prev) => [incident, ...prev]);
    const penalty = incident.severity === 'high' ? 12 : incident.severity === 'medium' ? 6 : 2;
    setIntegrityScore((prev) => Math.max(0, prev - penalty));
  }, []);

  const handleDisconnectionLockoutCallback = useCallback((reason: string) => {
    setLockoutBreachReason(reason);
    setIsSubmitted(true);
  }, []);

  // Proctoring Hook with Mandatory Camera and Microphone Enforced by Teacher
  const {
    videoRef,
    stream,
    cameraActive,
    micActive,
    audioLevel,
    isFullscreen,
    activeWarning,
    dismissWarning,
    requestFullscreenMode,
    switchCameraDevice,
    turnCameraOff,
    isCameraTurnedOff,
  } = useProctoring({
    examId: exam.id,
    studentId,
    studentName,
    enabled: true,
    strictSEB: exam.securityProtocols?.requireSEB || exam.sebConfig.strictLockMode,
    requireCamera: exam.securityProtocols?.requireCamera ?? true,
    requireMicrophone: exam.securityProtocols?.requireMicrophone ?? true,
    isSubmitted,
    onIncident: handleIncidentCallback,
    onDisconnectionLockout: handleDisconnectionLockoutCallback,
  });

  const [isCameraSettingsOpen, setIsCameraSettingsOpen] = useState(false);

  // Audio Chime notification for Invigilator actions
  const playProctorChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    } catch {}
  };

  // Listen for real-time Invigilator actions across tabs & rooms
  useEffect(() => {
    const handleStudentWarning = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.studentId === studentId || detail.studentId === 'all')) {
        playProctorChime();
        setTeacherUrgentWarning(detail.text);
      }
    };

    const handlePauseExam = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.studentId === studentId || detail.studentId === 'all')) {
        playProctorChime();
        setIsExamPaused(true);
        setPauseReason(detail.reason || 'Invigilator has temporarily paused your examination session.');
      }
    };

    const handleResumeExam = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.studentId === studentId || detail.studentId === 'all')) {
        playProctorChime();
        setIsExamPaused(false);
        setPauseReason(null);
      }
    };

    const handleEnvironmentCheck = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.studentId === studentId || detail.studentId === 'all')) {
        playProctorChime();
        setIsEnvironmentCheckOpen(true);
      }
    };

    const handleForceSubmitEvent = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.studentId === studentId || detail.submissionId === existingSubmission?.id)) {
        handleAutoSubmit('Examination terminated by Invigilator for proctoring compliance.');
      }
    };

    window.addEventListener('examguard_student_warning', handleStudentWarning);
    window.addEventListener('examguard_pause_exam', handlePauseExam);
    window.addEventListener('examguard_resume_exam', handleResumeExam);
    window.addEventListener('examguard_environment_check', handleEnvironmentCheck);
    window.addEventListener('examguard_force_submit', handleForceSubmitEvent);

    return () => {
      window.removeEventListener('examguard_student_warning', handleStudentWarning);
      window.removeEventListener('examguard_pause_exam', handlePauseExam);
      window.removeEventListener('examguard_resume_exam', handleResumeExam);
      window.removeEventListener('examguard_environment_check', handleEnvironmentCheck);
      window.removeEventListener('examguard_force_submit', handleForceSubmitEvent);
    };
  }, [studentId, existingSubmission?.id]);

  // Countdown Timer & Gentle Warnings (15m, 5m), plus AUTOMATIC SUBMISSION when time elapses
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (isExamPaused) {
          return prev; // Timer paused while exam is paused by teacher!
        }

        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('Time limit reached. Auto-submitting all saved answers.');
          return 0;
        }

        // 15-minute gentle warning
        if (prev === 15 * 60) {
          setGentleAlert('15 minutes remaining. You are well on track! Take a steady breath.');
        }
        // 5-minute gentle warning
        if (prev === 5 * 60) {
          setGentleAlert('5 minutes remaining. Please finalize and review your answer sheet before automatic submission.');
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamPaused]);

  // Synchronize proctoring webcam element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [stream]);

  // Auto-Save progress every 3 seconds to broadcast real-time telemetry to Invigilator
  useEffect(() => {
    if (isSubmitted || lockoutBreachReason) return;

    const autoSaveTimer = setInterval(() => {
      setSaveStatus('saving');
      const currentQ = questions[currentIndex];
      const liveAnswer = currentQ ? answers[currentQ.id]?.textAnswer || '' : '';

      const submission: ExamSubmission = {
        id: existingSubmission?.id || `sub-${studentId}-${exam.id}-${Date.now()}`,
        examId: exam.id,
        studentId,
        studentName,
        studentEmail,
        studentAvatar,
        attemptNumber,
        startedAt: existingSubmission?.startedAt || new Date().toISOString(),
        status: 'in_progress',
        answers,
        integrityScore,
        incidents,
        diagnosticCheckPassed: true,
        currentQuestionIndex: currentIndex,
        currentQuestionPrompt: currentQ?.prompt || '',
        lastHeartbeatAt: new Date().toISOString(),
        activeWindowFocus: isFullscreen ? 'focused' : 'tab_switched',
        activeAudioLevel: audioLevel,
        activeGazeState: incidents.some(
          (i) => i.category === 'inattention' && Date.now() - new Date(i.timestamp).getTime() < 12000
        )
          ? 'looking_away'
          : 'centered',
        isExamPaused,
        pauseReason: pauseReason || undefined,
        environmentCheckRequested: isEnvironmentCheckOpen,
        keystrokesCount,
        liveDraftPreview: liveAnswer.slice(0, 350),
      };

      onSaveProgress(submission);
      setTimeout(() => setSaveStatus('saved'), 400);
    }, 3000);

    return () => clearInterval(autoSaveTimer);
  }, [
    answers,
    incidents,
    integrityScore,
    isSubmitted,
    lockoutBreachReason,
    currentIndex,
    isFullscreen,
    audioLevel,
    isExamPaused,
    pauseReason,
    isEnvironmentCheckOpen,
    keystrokesCount,
    questions,
  ]);

  // Track time spent per question
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentIndex]);

  const recordTimeSpent = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const elapsedSeconds = Math.floor((Date.now() - questionStartTimeRef.current) / 1000);
    setAnswers((prev) => {
      const existing = prev[currentQ.id] || { questionId: currentQ.id, isFlaggedForReview: false, timeSpentSeconds: 0 };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          timeSpentSeconds: (existing.timeSpentSeconds || 0) + elapsedSeconds,
        },
      };
    });
    questionStartTimeRef.current = Date.now();
  };

  const handleTextAnswerChange = (val: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setKeystrokesCount((c) => c + 1);

    setAnswers((prev) => {
      const existing = prev[currentQ.id] || { questionId: currentQ.id, isFlaggedForReview: false, timeSpentSeconds: 0 };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          textAnswer: val,
        },
      };
    });
  };

  const handleSelectOption = (optId: string, optText?: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setKeystrokesCount((c) => c + 1);

    setAnswers((prev) => {
      const existing = prev[currentQ.id] || { questionId: currentQ.id, isFlaggedForReview: false, timeSpentSeconds: 0 };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          selectedOptionIds: [optId],
          selectedOptionId: optId,
          textAnswer: optText || optId,
        },
      };
    });
  };

  const handleSubQuestionAnswerChange = (subQuestionId: string, value: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setAnswers((prev) => {
      const existing = prev[currentQ.id] || {
        questionId: currentQ.id,
        isFlaggedForReview: false,
        timeSpentSeconds: 0,
      };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          subQuestionAnswers: {
            ...existing.subQuestionAnswers,
            [subQuestionId]: value,
          },
        },
      };
    });
  };

  const handleAnswerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentQ = questions[currentIndex];
    if (!file || !currentQ) return;

    setAnswerUploadError(null);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const fileUrl = uploadEvent.target?.result;
      if (typeof fileUrl !== 'string') return;
      setAnswers((prev) => {
        const existing = prev[currentQ.id] || { questionId: currentQ.id, isFlaggedForReview: false, timeSpentSeconds: 0 };
        return {
          ...prev,
          [currentQ.id]: {
            ...existing,
            ...(file.type.startsWith('image/')
              ? { uploadedPhotoUrl: fileUrl }
              : {
                  uploadedFileUrl: fileUrl,
                  uploadedFileName: file.name,
                  uploadedFileType: file.type || 'application/octet-stream',
                }),
          },
        };
      });
    };
    reader.onerror = () => {
      setAnswerUploadError(`Could not read "${file.name}". Select the file again or choose another file.`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setAnswerUploadError(null);
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      if (!existing) return prev;
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          uploadedPhotoUrl: undefined,
          uploadedFileUrl: undefined,
          uploadedFileName: undefined,
          uploadedFileType: undefined,
        },
      };
    });
  };

  const toggleFlagCurrentQuestion = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setAnswers((prev) => {
      const existing = prev[currentQ.id] || { questionId: currentQ.id, isFlaggedForReview: false, timeSpentSeconds: 0 };
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          isFlaggedForReview: !existing.isFlaggedForReview,
        },
      };
    });
  };

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;

  // Question navigation counts
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return Boolean(
      a &&
        ((a.textAnswer && a.textAnswer.trim().length > 0) ||
          (a.selectedOptionIds && a.selectedOptionIds.length > 0) ||
          Boolean(a.selectedOptionId) ||
          Object.values(a.subQuestionAnswers || {}).some((text) => text.trim().length > 0) ||
          a.uploadedPhotoUrl ||
          a.uploadedFileUrl)
    );
  }).length;

  const flaggedCount = questions.filter((q) => answers[q.id]?.isFlaggedForReview).length;
  const unansweredCount = questions.length - answeredCount;

  // Format countdown clock
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isTimeCritical = secondsRemaining <= 300;

  // Conclude Exam (Manual or Automatic)
  const handleAutoSubmit = (reason?: string, isBreach = false) => {
    setIsSubmitted(true);
    recordTimeSpent();

    // Auto-calculate score for objective questions and prepare submission
    let score = 0;
    let totalPoints = 0;

    questions.forEach((q) => {
      totalPoints += q.points;
      const ans = answers[q.id];
      if (!ans) return;

      if (q.type === 'single_choice' || q.type === 'true_false') {
        const correctOpt = q.options?.find((o) => o.isCorrect);
        const selectedId = ans.selectedOptionIds?.[0];
        const selectedOpt = q.options?.find((o) => o.id === selectedId);
        const hasMatchingKey = q.correctAnswers && q.correctAnswers.some(
          (k) =>
            (selectedOpt && selectedOpt.text.trim().toLowerCase() === k.trim().toLowerCase()) ||
            (ans.textAnswer && ans.textAnswer.trim().toLowerCase() === k.trim().toLowerCase())
        );
        const isCorrect = Boolean(
          (correctOpt && selectedId === correctOpt.id) ||
          (correctOpt && ans.textAnswer?.trim().toLowerCase() === correctOpt.text.trim().toLowerCase()) ||
          hasMatchingKey
        );

        if (isCorrect) {
          ans.awardedPoints = q.points;
          ans.isGraded = true;
          score += q.points;
        } else {
          ans.awardedPoints = 0;
          ans.isGraded = true;
        }
      } else if (q.type === 'fill_blank') {
        const userVal = (ans.textAnswer || '').trim().toLowerCase();
        const acceptable = (q.correctAnswers || []).map((a: string) => a.trim().toLowerCase());
        if (userVal && acceptable.includes(userVal)) {
          ans.awardedPoints = q.points;
          ans.isGraded = true;
          score += q.points;
        } else {
          ans.awardedPoints = 0;
          ans.isGraded = true;
        }
      } else {
        // Essay / open-ended
        ans.isGraded = false;
        ans.awardedPoints = ans.awardedPoints ?? 0;
      }
    });

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    const submission: ExamSubmission = {
      id: existingSubmission?.id || `sub-${studentId}-${exam.id}-${Date.now()}`,
      examId: exam.id,
      studentId,
      studentName,
      studentEmail,
      studentAvatar,
      attemptNumber,
      startedAt: existingSubmission?.startedAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      status: 'submitted',
      answers,
      score,
      totalPoints,
      percentage,
      integrityScore: isBreach ? 0 : integrityScore,
      incidents,
      diagnosticCheckPassed: true,
      isTerminatedForBreach: isBreach,
      terminationReason: reason,
    };

    // Save submission immediately to persistent store & gradebook
    onSaveProgress(submission);
    setCompletedSubmission(submission);

    // Immediately notify parent component to refresh admissions, gradebook, and submissions in real time
    onSubmitExam(submission);
  };

  // If candidate was locked out for severing camera/mic
  if (lockoutBreachReason) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-rose-950 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-800 animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-white">Security Protocol Breach</h2>
            <p className="text-xs text-rose-300 leading-relaxed font-mono">
              {lockoutBreachReason}
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Per examination regulations, camera and microphone hardware streams must remain active throughout the sitting until final submission. Your answers have been locked and transmitted to the instructor.
          </p>
          <button
            type="button"
            onClick={onExit}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Acknowledge & Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If exam has been successfully submitted, display dedicated Post-Submit Screen with CAMERA OFF button
  if (isSubmitted && completedSubmission) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95">
          <div className="flex justify-center mb-1">
            <InstitutionLogo size="lg" variant="badge" />
          </div>

          <div className="w-16 h-16 bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-800 shadow-md">
            <CheckCircle className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              {exam.courseCode} · EXAMINATION CONCLUDED
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Answer Sheet Submitted Successfully
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your examination responses have been locked and safely committed to the faculty invigilator gradebook for marking.
            </p>
          </div>

          {/* Camera Proctor Status & Post-Submission Privacy Control */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Webcam Proctor Status</span>
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                  isCameraTurnedOff
                    ? 'bg-slate-900 text-slate-400 border-slate-700'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                }`}
              >
                {isCameraTurnedOff ? 'CAMERA OFF' : 'STREAM ACTIVE'}
              </span>
            </div>

            {/* Video preview / Off state */}
            {!isCameraTurnedOff ? (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror-mode"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] text-slate-300">
                  Candidate: {studentName} ({studentId})
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-slate-900/60 rounded-lg border border-dashed border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center">
                  <CameraOff className="w-6 h-6 text-rose-400" />
                </div>
                <div className="text-xs font-semibold text-slate-300">
                  Webcam Hardware Disconnected
                </div>
                <div className="text-[11px] text-slate-500">
                  Camera feed has been turned off. Your privacy is fully secured.
                </div>
              </div>
            )}

            {/* Dedicated Camera Off Action Button */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 leading-snug">
                {!isCameraTurnedOff
                  ? 'Examination completed. You can now power off your camera hardware.'
                  : 'Webcam powered off. Proctoring feed successfully terminated.'}
              </p>
              {!isCameraTurnedOff ? (
                <button
                  type="button"
                  onClick={turnCameraOff}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  title="Turn off webcam hardware stream"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Turn Camera Off</span>
                </button>
              ) : (
                <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>Camera is OFF</span>
                </div>
              )}
            </div>
          </div>

          {/* Action to proceed to results */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => onSubmitExam(completedSubmission)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Examination Scorecard & Conclude</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Return to Student Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Real-time Invigilator Urgent Warning Banner */}
      {teacherUrgentWarning && (
        <div className="bg-rose-600 text-white px-4 py-3 text-xs flex items-center justify-between font-bold shadow-lg animate-bounce z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
              <span>🚨 Live Invigilator Directive: {teacherUrgentWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setTeacherUrgentWarning(null)}
              className="px-3 py-1 bg-white text-rose-600 rounded-lg text-xs font-black shadow-xs hover:bg-rose-100 cursor-pointer ml-3 shrink-0"
            >
              Acknowledge Directive
            </button>
          </div>
        </div>
      )}

      {/* Real-time Invigilator Pause Overlay */}
      {isExamPaused && (
        <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border-2 border-amber-500 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                Examination Session Paused
              </h3>
              <p className="text-xs text-amber-400 font-mono mt-1">
                Your examination countdown timer is temporarily halted.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300">
              {pauseReason ||
                'The invigilator has paused your session to inspect physical telemetry. All answered questions are safely stored.'}
            </div>
            <p className="text-[11px] text-slate-400">
              Please remain calm and seated facing the camera. The test window will resume as soon as the invigilator releases your session.
            </p>
          </div>
        </div>
      )}

      {/* 360° Environment Verification Modal */}
      {isEnvironmentCheckOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border-2 border-indigo-500 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                360° Physical Workspace Scan Requested
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                The chief invigilator has requested a live verification of your desk and room surroundings.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 text-left space-y-1 font-mono">
              <div>1. Pan your webcam slowly across your desk surface.</div>
              <div>2. Ensure no unauthorized notes or devices are present.</div>
              <div>3. Re-align webcam with your face and click Confirm below.</div>
            </div>
            <button
              type="button"
              onClick={() => setIsEnvironmentCheckOpen(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
            >
              Confirm 360° Verification Completed
            </button>
          </div>
        </div>
      )}

      {/* Top Warning Alert Banner */}
      {activeWarning && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs flex items-center justify-between font-medium shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{activeWarning}</span>
          </div>
          <button
            type="button"
            onClick={dismissWarning}
            className="text-[11px] underline hover:text-rose-100 cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Gentle Anxiety-Reducing Alert (15m / 5m marks) */}
      {gentleAlert && (
        <div className="bg-indigo-900/90 border-b border-indigo-700 text-indigo-100 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{gentleAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setGentleAlert(null)}
            className="text-xs text-indigo-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Examination Navigation Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="shrink-0 flex items-center">
            <InstitutionLogo size="sm" variant="badge" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">{exam.courseCode}</span>
            <span className="text-slate-600">·</span>
            <h1 className="text-xs font-medium text-slate-100 truncate max-w-xs md:max-w-md">
              {exam.title}
            </h1>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-[11px] text-cyan-400 font-mono hidden sm:inline">
              Attempt #{attemptNumber} of {exam.maxAttempts || 1}
            </span>
          </div>
        </div>

        {/* Auto-save pulse & Timers */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <Save className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Auto-saving answer sheet...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Answer sheet synchronized</span>
              </>
            )}
          </div>

          {/* Visible Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-md font-mono text-xs font-medium transition-colors ${
              isTimeCritical
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse'
                : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-slate-400">left</span>
          </div>

          {!isFullscreen && (
            <button
              type="button"
              onClick={requestFullscreenMode}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-900/60 text-amber-200 border border-amber-700/60 rounded hover:bg-amber-800/80"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Fullscreen</span>
            </button>
          )}

          {/* Manual Submit Exam Button */}
          <button
            type="button"
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Manual Submit</span>
          </button>
        </div>
      </header>

      {/* Main Examination Viewport: Split Layout with Persistent Left Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Persistent Sidebar (Question Palette allowing starting with ANY question) */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
          {/* Live Proctor Mini-Cam Widget */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative aspect-4/3 bg-slate-900 rounded overflow-hidden border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SECURE PROCTOR</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraSettingsOpen(true)}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white rounded text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                title="Camera Settings & Device Selection"
              >
                <Sliders className="w-3 h-3 text-cyan-400" />
              </button>
              <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                <Mic className="w-3 h-3 text-cyan-400" />
                <span>{audioLevel}% dB</span>
              </div>
            </div>

            <div className="mt-2.5 p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Camera className="w-3 h-3" />
                  <span>Camera: {isCameraTurnedOff ? 'OFF' : isSubmitted ? 'Post-Submit' : 'Always ON'}</span>
                </span>
                {isSubmitted ? (
                  !isCameraTurnedOff ? (
                    <button
                      type="button"
                      onClick={turnCameraOff}
                      className="text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Turn Camera Off"
                    >
                      <CameraOff className="w-3 h-3" />
                      <span>Camera OFF</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      OFF
                    </span>
                  )
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                    LOCKED
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Mic className="w-3 h-3" />
                  <span>Microphone: Always ON</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                  LOCKED
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-indigo-400">
                  <ShieldCheck className="w-3 h-3" />
                  <span>SEB Browser: Enforced</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800">
                  LOCKED
                </span>
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 italic">
                Device controls cannot be turned off. Continuous monitoring active.
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Proctor Integrity:</span>
              <span className="text-emerald-400 font-mono font-bold">{integrityScore}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-500 ${
                  integrityScore >= 90 ? 'bg-emerald-500' : integrityScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${integrityScore}%` }}
              />
            </div>
          </div>

          {/* Question Palette Filter Tabs */}
          <div className="px-3 pt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Select Question to Begin</span>
              <span className="font-mono">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="flex gap-1 bg-slate-900 p-1 rounded-md border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setSidebarFilter('all')}
                className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                  sidebarFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilter('unanswered')}
                className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                  sidebarFilter === 'unanswered' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Left ({unansweredCount})
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilter('flagged')}
                className={`flex-1 py-1 rounded text-center font-medium transition-colors ${
                  sidebarFilter === 'flagged' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Flagged ({flaggedCount})
              </button>
            </div>
          </div>

          {/* Question Grid - Starting with any question is enabled */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAns =
                  ans &&
                  (                  (ans.textAnswer && ans.textAnswer.trim().length > 0) ||
                  Object.values(ans.subQuestionAnswers || {}).some((text) => text.trim().length > 0) ||
                  ans.uploadedPhotoUrl ||
                  ans.uploadedFileUrl);
                const isFlagged = ans?.isFlaggedForReview;
                const isCurrent = idx === currentIndex;

                const isPastQuestion = isSequentialOnly && idx < currentIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isPastQuestion}
                    onClick={() => {
                      if (isPastQuestion) return;
                      recordTimeSpent();
                      setCurrentIndex(idx);
                    }}
                    title={isPastQuestion ? 'Sequential exam progression: Previous questions cannot be revisited' : undefined}
                    className={`relative h-10 rounded text-xs font-mono font-medium flex items-center justify-center transition-all ${
                      isPastQuestion
                        ? 'opacity-35 cursor-not-allowed bg-slate-950/90 border border-slate-900 text-slate-600 line-through'
                        : isCurrent
                        ? 'ring-2 ring-emerald-400 bg-emerald-800 text-white font-bold shadow-xs cursor-pointer'
                        : isAns
                        ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-sky-950/40 hover:border-sky-400 hover:text-sky-100 cursor-pointer'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-sky-950/40 hover:border-sky-400 hover:text-sky-100 cursor-pointer'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/80" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Flagged for Review</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Question Canvas */}
        <main className="flex-1 flex flex-col bg-slate-900 overflow-y-auto">
          {currentQ ? (
            <div className="max-w-3xl mx-auto w-full p-6 md:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Question Metadata Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-slate-200">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{currentQ.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{currentQ.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentQ.points} Marks</span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFlagCurrentQuestion}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                      currentAnswer?.isFlaggedForReview
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        currentAnswer?.isFlaggedForReview ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                    <span>{currentAnswer?.isFlaggedForReview ? 'Flagged for Review' : 'Flag for Review'}</span>
                  </button>
                </div>

                {/* Question Prompt - Every sentence rendered on new line for optimal readability */}
                <div className="text-base md:text-lg font-medium text-slate-100 leading-relaxed mb-4">
                  <ExamSentencesRenderer
                    text={currentQ.prompt}
                    className="space-y-2.5"
                    sentenceClassName="block text-slate-100 leading-relaxed"
                  />
                </div>

                {/* Math Equation Formula if present */}
                {currentQ.mathEquation && (
                  <MathRenderer equation={currentQ.mathEquation} />
                )}

                {/* Audio prompt player if present */}
                {currentQ.audioPromptUrl && (
                  <AudioPromptPlayer
                    title={currentQ.audioTitle || 'Listening Comprehension Prompt'}
                    audioUrl={currentQ.audioPromptUrl}
                  />
                )}

                {/* Diagram graphic if present (mapped neatly in middle below question) */}
                {currentQ.imageUrl && (
                  <div className="my-4 flex flex-col items-center justify-center w-full">
                    <TechnicalDiagram
                      imageUrl={currentQ.imageUrl}
                      caption={currentQ.imageCaption}
                      type={currentQ.imageUrl}
                      transform={currentQ.imageTransform}
                      inExamPaper={true}
                    />
                  </div>
                )}

                {/* DEDICATED ANSWER SHEET SECTION DIRECTLY FOR THIS QUESTION */}
                <div className="mt-8 pt-5 border-t-2 border-indigo-500/40 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-950/80 rounded-xl border border-indigo-700/60 shadow-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-bold text-xs uppercase tracking-wider text-white">
                        Official Candidate Answer Sheet — Question #{currentIndex + 1} of {questions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        Total Marks: {currentQ.points}
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono">
                        · Individual Question Sheet
                      </span>
                    </div>
                  </div>

                  {/* Objective Multiple-Choice / True-False Options */}
                  {!currentQ.subQuestions?.length && currentQ.options && currentQ.options.length > 0 && (
                    <div className="p-4 bg-slate-950/90 rounded-xl border border-indigo-900/60 shadow-inner space-y-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label className="font-semibold text-indigo-300">
                          Select your answer choice:
                        </label>
                        {currentAnswer?.selectedOptionId && (
                          <span className="text-emerald-400 font-mono text-[11px] font-bold">
                            Selected Option: {currentAnswer.selectedOptionId}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {currentQ.options.map((opt, optIdx) => {
                          const isSelected =
                            currentAnswer?.selectedOptionIds?.includes(opt.id) ||
                            currentAnswer?.selectedOptionId === opt.id ||
                            currentAnswer?.textAnswer === opt.text;
                          return (
                            <button
                              key={opt.id || optIdx}
                              type="button"
                              onClick={() => handleSelectOption(opt.id, opt.text)}
                              className={`w-full p-3 rounded-lg border text-left text-sm flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs font-semibold'
                                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-sky-950/40 hover:border-sky-400 hover:text-sky-100'
                              }`}
                            >
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                  isSelected ? 'bg-white text-emerald-800 font-bold' : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {opt.id || String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="flex-1 font-medium text-xs sm:text-sm">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fill in Blank Answer Field */}
                  {!currentQ.subQuestions?.length && currentQ.type === 'fill_blank' && (!currentQ.options || currentQ.options.length === 0) && (
                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                      <label className="block text-xs font-medium text-slate-300 mb-2">
                        Enter your concise answer directly into the sheet:
                      </label>
                      <input
                        type="text"
                        value={currentAnswer?.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(e.target.value)}
                        placeholder="Type answer here..."
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  )}

                  {/* Essay / Free Written Response Sheet (Times New Roman 12pt Standard) */}
                  {!currentQ.subQuestions?.length &&
                    (!currentQ.options || currentQ.options.length === 0) &&
                    currentQ.type !== 'fill_blank' && (
                    <div className="p-5 bg-slate-950/90 rounded-xl border border-indigo-900/60 shadow-inner">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Candidate Written Response Sheet</span>
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800">
                            Times New Roman 12pt
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-400">
                          {(currentAnswer?.textAnswer || '').trim().split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <textarea
                        rows={9}
                        value={currentAnswer?.textAnswer || ''}
                        onChange={(e) => handleTextAnswerChange(e.target.value)}
                        placeholder="Write your comprehensive examination response here (Times New Roman 12pt)..."
                        className="w-full p-4 bg-slate-900 border border-slate-700 rounded-md text-[12pt] text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-['Times_New_Roman',serif] leading-relaxed resize-y"
                        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}
                      />
                    </div>
                  )}

                  {currentQ.subQuestions && currentQ.subQuestions.length > 0 && (
                    <div className="space-y-4">
                      {currentQ.subQuestions.map((subQuestion, subIndex) => (
                        <section
                          key={subQuestion.id}
                          className="rounded-xl border border-indigo-900/60 bg-slate-950/70 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-100 flex-1">
                              <div className="flex items-start gap-2">
                                <span className="font-bold shrink-0 text-indigo-300">
                                  {String.fromCharCode(97 + subIndex)})
                                </span>
                                <ExamSentencesRenderer
                                  text={subQuestion.prompt}
                                  className="space-y-1.5 flex-1"
                                  sentenceClassName="block text-slate-100 leading-relaxed font-semibold"
                                />
                              </div>
                            </div>
                            {subQuestion.points != null && (
                              <span className="shrink-0 text-xs text-slate-400 font-mono">
                                {subQuestion.points} marks
                              </span>
                            )}
                          </div>
                          <label className="block text-xs font-medium text-indigo-300">
                            Answer for part {String.fromCharCode(97 + subIndex)}
                          </label>
                          <textarea
                            rows={5}
                            value={currentAnswer?.subQuestionAnswers?.[subQuestion.id] || ''}
                            onChange={(e) =>
                              handleSubQuestionAnswerChange(subQuestion.id, e.target.value)
                            }
                            placeholder={`Write your answer for part ${String.fromCharCode(97 + subIndex)}...`}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm leading-relaxed text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                          />
                        </section>
                      ))}
                    </div>
                  )}

                  {/* Drawing/photo uploads are available when mandated or for file-upload questions. */}
                  {currentQ.allowPhotoUpload || currentQ.type === 'file_upload' ? (
                    <div className="p-4 bg-slate-950/90 rounded-xl border border-indigo-500/40 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                          <Camera className="w-4 h-4 text-indigo-400" />
                          <span>Drawing / Diagram Scratchwork Photo Upload (Mandated)</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                          Photo Required for this Item
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        The instructor has mandated an attached photo/drawing for this question (circuit schematics, graph plots, or handwritten proofs).
                      </p>

                      {currentAnswer?.uploadedPhotoUrl || currentAnswer?.uploadedFileUrl ? (
                        <div className="space-y-2">
                          <div className="relative max-w-sm rounded-lg border border-slate-700 bg-black p-2">
                            {currentAnswer.uploadedPhotoUrl ? (
                              <img
                                src={currentAnswer.uploadedPhotoUrl}
                                alt="Attached Work"
                                className="w-full max-h-56 object-contain"
                              />
                            ) : (
                              <a
                                href={currentAnswer.uploadedFileUrl}
                                download={currentAnswer.uploadedFileName}
                                className="text-sm text-indigo-300 underline"
                              >
                                {currentAnswer.uploadedFileName}
                              </a>
                            )}
                            {answerUploadError && (
                              <p className="text-xs font-medium text-rose-400" role="alert">
                                {answerUploadError}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="absolute top-2 right-2 px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold shadow-xs"
                            >
                              Remove Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-indigo-500/40 rounded-lg p-5 text-center bg-indigo-950/10 hover:bg-indigo-950/20 transition-colors">
                          <label className="cursor-pointer inline-flex flex-col items-center gap-2 text-xs text-slate-300 hover:text-white">
                            <Camera className="w-6 h-6 text-indigo-400 animate-pulse" />
                            <span className="font-semibold text-indigo-300">Capture or Upload Diagram Photo</span>
                            <span className="text-[10px] text-slate-500">Supports JPG, PNG, WEBP from phone or webcam camera</span>
                            <input
                              type="file"
                              capture="environment"
                              className="hidden"
                              accept="image/*,application/pdf"
                              onChange={handleAnswerFileUpload}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Direct Answer Sheet Enforced: Photo upload is disabled for this question. Candidates must write answers directly into the system answer sheet above.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Navigation controls */}
              <div className="flex items-center justify-between pt-8 border-t border-slate-800 mt-10">
                <button
                  type="button"
                  disabled={currentIndex === 0 || isSequentialOnly}
                  onClick={() => {
                    recordTimeSpent();
                    setCurrentIndex((prev) => Math.max(0, prev - 1));
                  }}
                  title={isSequentialOnly ? 'Strict sequential mode active: Previous questions cannot be revisited' : undefined}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium transition-colors ${
                    currentIndex === 0 || isSequentialOnly
                      ? 'text-slate-600 bg-slate-900 cursor-not-allowed opacity-50'
                      : 'text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white cursor-pointer'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Question</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      recordTimeSpent();
                      setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSubmitConfirmOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Review & Conclude Exam</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Manual Submit Confirmation Dialog */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-100">
            <h3 className="text-base font-semibold text-white mb-2">Final Examination Submission</h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to conclude and submit your answer sheet? Once submitted, your webcam and microphone streams will power off, and your responses will be locked for grading.
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs mb-6 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Questions:</span>
                <span className="font-semibold text-slate-200">{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Answered:</span>
                <span className="font-semibold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unanswered Questions:</span>
                <span className="font-semibold text-amber-400">{unansweredCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flagged for Review:</span>
                <span className="font-semibold text-cyan-400">{flaggedCount}</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-950/60 border border-amber-800 text-amber-200 text-xs rounded mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Warning: You still have {unansweredCount} unanswered question(s).</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                Back to Exam
              </button>
              <button
                type="button"
                onClick={() => handleAutoSubmit()}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-md shadow-xs cursor-pointer"
              >
                Confirm & Submit Answer Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proctor Camera & Audio Calibration Settings Modal */}
      {isCameraSettingsOpen && (
        <CameraSettingsModal
          isOpen={true}
          onClose={() => setIsCameraSettingsOpen(false)}
          candidateName={studentName}
          candidateNumber={studentId}
          onDeviceSelected={(devId) => {
            if (switchCameraDevice) {
              switchCameraDevice(devId);
            }
          }}
        />
      )}
    </div>
  );
};
