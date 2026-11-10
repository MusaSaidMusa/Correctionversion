import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  FileCheck2,
  Plus,
} from 'lucide-react';
import { Exam, ResitRequest, TeacherProfile } from '../../types';
import { reRegisterStudentForResitExam } from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';

interface ReRegisterStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resitRequest: ResitRequest;
  exams: Exam[];
  teacher: TeacherProfile;
  onSuccess?: () => void;
  onCreateNewExam?: (resitRequest: ResitRequest) => void;
}

export const ReRegisterStudentModal: React.FC<ReRegisterStudentModalProps> = ({
  isOpen,
  onClose,
  resitRequest,
  exams,
  teacher,
  onSuccess,
  onCreateNewExam,
}) => {
  if (!isOpen || !resitRequest) return null;

  // Find original exam record if present
  const originalExam = exams.find(
    (e) =>
      e.id === resitRequest.examId ||
      e.courseCode.toUpperCase() === resitRequest.courseCode.toUpperCase() ||
      e.title.toLowerCase() === resitRequest.examTitle.toLowerCase()
  );

  const isOriginalSchemeReleased = Boolean(
    originalExam?.isMarkingSchemeReleased || originalExam?.status === 'completed'
  );

  // Find examinations matching the approved resit course code
  const requiredCode = (resitRequest.courseCode || '').trim().toUpperCase();

  const matchingCodeExams = exams.filter(
    (e) => (e.courseCode || '').trim().toUpperCase() === requiredCode
  );

  const nonMatchingCodeExams = exams.filter(
    (e) => (e.courseCode || '').trim().toUpperCase() !== requiredCode
  );

  // Default selection: first matching exam, or original exam if match
  const defaultExamId =
    matchingCodeExams.length > 0
      ? matchingCodeExams[0].id
      : '';

  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const isCodeMatch = Boolean(
    selectedExam && (selectedExam.courseCode || '').trim().toUpperCase() === requiredCode
  );
  const isSelectedSchemeReleased = Boolean(selectedExam?.isMarkingSchemeReleased);

  const handleConfirmReRegistration = async () => {
    if (!selectedExamId || !selectedExam) {
      triggerFlash({
        type: 'error',
        text: 'Selection Required',
        subtext: 'Please select an authorized examination session to re-register the candidate.',
      });
      return;
    }

    // Strict Rule: Teacher cannot re-register student to examination with different examination code
    if (!isCodeMatch) {
      triggerFlash({
        type: 'error',
        text: 'Examination Code Mismatch',
        subtext: `Institutional Rule: Candidate can only be re-registered to an examination matching course code [${requiredCode}]. Re-registering to [${selectedExam.courseCode}] is strictly prohibited.`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = reRegisterStudentForResitExam(
        resitRequest.id,
        selectedExamId,
        teacher.name || 'Course Instructor'
      );

      if (res.success) {
        triggerFlash({
          type: 'success',
          text: 'Candidate Re-Registered Successfully',
          subtext: `${resitRequest.studentName} is now enrolled for ${res.exam?.courseCode} - "${res.exam?.title}". Session is actively available for sitting.`,
        });
        onSuccess?.();
        onClose();
      } else {
        triggerFlash({
          type: 'error',
          text: 'Re-Registration Failed',
          subtext: res.error || 'Could not complete candidate examination re-registration.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-400 dark:border-emerald-500 overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white flex items-start justify-between gap-4 border-b border-emerald-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <UserCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  Re-Register Cleared Candidate for Examination
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950">
                  Approved Resit
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Assign {resitRequest.studentName} ({resitRequest.studentNumber}) to an authorized examination session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Candidate Particulars & Senate Clearance Docket */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {resitRequest.studentName}
                </span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {resitRequest.studentNumber}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Senate Clearance Approved</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200 dark:border-slate-700/60 font-mono">
              <div>
                <span className="text-slate-500 block">Original Missed Unit:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {resitRequest.courseCode} &mdash; {resitRequest.examTitle}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Approval Authority / Note:</span>
                <span className="text-slate-700 dark:text-slate-300 italic">
                  {resitRequest.adminNotes || resitRequest.adminDecisionNote || 'Approved for exam resit.'}
                </span>
              </div>
            </div>

            {resitRequest.reasonCategory === 'medical' && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
                <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Medical grounds verified: {resitRequest.medicalFacility || 'University Clinic'} (Ref: {resitRequest.medicalCertificateRef || 'Verified'})
                </span>
              </div>
            )}
          </div>

          {/* Marking Scheme Alert / Notice */}
          {isOriginalSchemeReleased && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Original Examination Scheme Has Been Released to Candidates</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The marking scheme for <strong>{resitRequest.courseCode}</strong> was already released to students. Under assessment governance regulations, <strong>you can register the student to any other similar unit exam</strong> or create a fresh examination sitting where the scheme remains confidential.
              </p>
              {onCreateNewExam && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateNewExam(resitRequest);
                    }}
                    className="w-full py-2 px-3.5 bg-[#d1e231] hover:bg-[#c0d725] text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs border border-[#a3b817] cursor-pointer active-pear animate-pear-pulse"
                  >
                    <Plus className="w-4 h-4 text-slate-950" />
                    <span>Create New Resit Examination &amp; Enroll Candidate Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Examination Session Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Select Target Examination Session (Required Code: {requiredCode}):</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {matchingCodeExams.length} matching session{matchingCodeExams.length === 1 ? '' : 's'} available
              </span>
            </div>

            {/* Matching Course Code Examinations Section */}
            {matchingCodeExams.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Eligible Examination Sessions (Matching Course Code {requiredCode}):</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {matchingCodeExams.map((ex) => {
                    const isSelected = selectedExamId === ex.id;
                    const hasSchemeReleased = Boolean(ex.isMarkingSchemeReleased);
                    return (
                      <label
                        key={ex.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-400/40 shadow-xs'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="targetExam"
                            value={ex.id}
                            checked={isSelected}
                            onChange={() => setSelectedExamId(ex.id)}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {ex.courseCode} &mdash; {ex.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                Code Verified
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {ex.scheduledDate || 'Active Session'}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {ex.durationMinutes} Mins
                              </span>
                              <span>·</span>
                              <span>{ex.questions?.length || 0} Questions</span>
                              <span>·</span>
                              <span className={hasSchemeReleased ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                                {hasSchemeReleased ? '⚠️ Scheme Released' : '✓ Scheme Confidential'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>No Active Examination Session Found with Course Code {requiredCode}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Institutional regulations require that re-registration matches the approved missed course code (<strong>{requiredCode}</strong>). You cannot re-register the candidate under a different examination code.
                </p>
                {onCreateNewExam && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCreateNewExam(resitRequest);
                    }}
                    className="mt-1 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Fresh Resit Examination for {requiredCode} Now</span>
                  </button>
                )}
              </div>
            )}

            {/* Ineligible Different Code Examinations (Disabled from Re-registration) */}
            {nonMatchingCodeExams.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Other Examinations (Disabled &mdash; Code Mismatch with {requiredCode}):</span>
                  </span>
                  <span className="text-[10px] text-rose-500 font-mono font-semibold">
                    Re-registration strictly prohibited
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 opacity-60">
                  {nonMatchingCodeExams.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between gap-3 cursor-not-allowed select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full border border-slate-300 bg-slate-200 dark:bg-slate-700" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 line-through">
                              {ex.courseCode}
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">&mdash; {ex.title}</span>
                          </div>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                            Cannot re-register: code does not match {requiredCode}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 shrink-0">
                        Code Mismatch
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Exam Integrity Summary */}
          {selectedExam && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                !isCodeMatch
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-900 dark:text-rose-200'
                  : isSelectedSchemeReleased
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 shrink-0" />
                <span className="text-[11px] font-semibold">
                  Selected Session: <strong>{selectedExam.courseCode}</strong> ({selectedExam.title})
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold">
                {!isCodeMatch
                  ? '❌ Code Mismatch Blocked'
                  : isSelectedSchemeReleased
                  ? '⚠️ Scheme Released'
                  : '✓ Eligible Session'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedExamId || !isCodeMatch || isSubmitting}
            onClick={handleConfirmReRegistration}
            className={`px-5 py-2.5 rounded-xl text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-md transition-all border ${
              !selectedExamId || !isCodeMatch || isSubmitting
                ? 'opacity-50 cursor-not-allowed bg-slate-200 border-slate-300 text-slate-500'
                : 'bg-[#d1e231] hover:bg-[#c0d725] border-[#a3b817] hover:scale-105 active:scale-95 cursor-pointer'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Re-Registering Candidate...'
                : !isCodeMatch
                ? `Code Mismatch (Must match ${requiredCode})`
                : `Confirm Re-Registration (${selectedExam?.courseCode})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
