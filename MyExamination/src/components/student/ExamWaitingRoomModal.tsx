import React, { useState, useEffect } from 'react';
import {
  X,
  DoorOpen,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Users,
  AlertCircle,
  Play,
  RotateCcw,
  LifeBuoy,
} from 'lucide-react';
import { Exam, StudentProfile } from '../../types';

interface ExamWaitingRoomModalProps {
  exam: Exam | null;
  student: StudentProfile;
  isOpen: boolean;
  onClose: () => void;
  onAdmittedAndUnlocked: () => void;
  onOpenHelp?: () => void;
}

export const ExamWaitingRoomModal: React.FC<ExamWaitingRoomModalProps> = ({
  exam,
  student,
  isOpen,
  onClose,
  onAdmittedAndUnlocked,
  onOpenHelp,
}) => {
  const [isAdmitted, setIsAdmitted] = useState<boolean>(false);
  const [waitingCount, setWaitingCount] = useState<number>(1);

  useEffect(() => {
    if (!isOpen || !exam) return;

    // 1. Join waiting room lobby via backend API
    fetch(`/api/exams/${encodeURIComponent(exam.id)}/waiting-room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        studentName: student.name,
        studentNumber: student.studentNumber,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.waitingCount) {
          setWaitingCount(data.data.waitingCount);
        }
      })
      .catch(() => {});

    // 2. Poll for admission status every 2 seconds
    const interval = setInterval(() => {
      fetch(`/api/exams/${encodeURIComponent(exam.id)}/waiting-room`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data?.admittedStudentIds?.includes(student.id)) {
            setIsAdmitted(true);
          }
          if (json?.data?.waitingCandidates?.length) {
            setWaitingCount(json.data.waitingCandidates.length);
          }
        })
        .catch(() => {});

      // Also check if already admitted locally in exam object
      if (exam.admittedStudentIds?.includes(student.id)) {
        setIsAdmitted(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, exam, student.id, student.name, student.studentNumber]);

  if (!isOpen || !exam) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Invigilator Waiting Room Lobby
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="p-1.5 text-slate-500 hover:text-orange-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Seek Help"
              >
                <LifeBuoy className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            {isAdmitted ? (
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 animate-spin" />
                <Clock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </>
            )}
          </div>

          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">
              {isAdmitted ? 'Admission Approved by Invigilator!' : 'Waiting for Invigilator Admission'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {isAdmitted
                ? `Prof. ${exam.instructorName} has granted you entrance. Click below to begin your examination.`
                : `Your credentials and diagnostic status have been broadcasted to Chief Invigilator Prof. ${exam.instructorName}. You will be admitted momentarily.`}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate:</span>
              <span className="font-bold text-slate-900 dark:text-white">{student.name} ({student.studentNumber})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assessment:</span>
              <span className="font-bold text-slate-900 dark:text-white">{exam.courseCode} - {exam.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Waiting Queue:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{waitingCount} Candidate(s) in Lobby</span>
            </div>
          </div>

          {/* Action */}
          <div className="pt-2">
            {isAdmitted ? (
              <button
                type="button"
                onClick={onAdmittedAndUnlocked}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span>Enter & Start Examination</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Synchronizing live with faculty invigilation terminal...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
