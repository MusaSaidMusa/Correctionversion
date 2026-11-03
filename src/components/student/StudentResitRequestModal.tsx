import React, { useState } from 'react';
import {
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Upload,
  Calendar,
  ShieldAlert,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { StudentProfile, Exam, ResitRequest } from '../../types';
import {
  submitResitRequest,
  getStoredResitRequests,
  getStoredMissedExams,
} from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';

interface StudentResitRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentProfile;
  exams: Exam[];
  preselectedExam?: Exam | null;
  onSubmitted?: () => void;
}

export const StudentResitRequestModal: React.FC<StudentResitRequestModalProps> = ({
  isOpen,
  onClose,
  student,
  exams,
  preselectedExam,
  onSubmitted,
}) => {
  const [courseCode, setCourseCode] = useState(preselectedExam?.courseCode || 'CS401');
  const [examTitle, setExamTitle] = useState(
    preselectedExam?.title || 'Midterm Examination: Distributed Systems Architecture'
  );
  const [missedDate, setMissedDate] = useState(
    preselectedExam?.scheduledDate || new Date().toISOString().split('T')[0]
  );
  const [reasonCategory, setReasonCategory] = useState<
    'medical' | 'technical' | 'compassionate' | 'academic_clash' | 'other'
  >('medical');
  const [reasonDetails, setReasonDetails] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Student's historical resit requests
  const myRequests = getStoredResitRequests().filter((r) => r.studentId === student.id);
  const myMissed = getStoredMissedExams().filter((m) => m.studentId === student.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !examTitle.trim() || !reasonDetails.trim()) {
      setErrorMsg('Please specify Course Code, Examination Title, and a comprehensive explanation.');
      return;
    }

    try {
      submitResitRequest({
        studentId: student.id,
        studentName: student.name,
        studentNumber: student.studentNumber,
        studentEmail: student.email,
        courseCode: courseCode.trim().toUpperCase(),
        examTitle: examTitle.trim(),
        examId: preselectedExam?.id,
        missedDate,
        reasonCategory,
        reasonDetails: reasonDetails.trim(),
        evidenceNotes: evidenceNotes.trim() || undefined,
        attachmentFileName: attachmentFileName.trim() || undefined,
      });

      setSuccessMsg(
        'Your Examination Resit & Clearance Request has been officially lodged. The Super Admin Directorate will review your case. Once cleared, candidate registration and examination room admission will be approved.'
      );
      triggerFlash({
        type: 'success',
        text: 'Resit Clearance Request Submitted',
        subtext: `Application for ${courseCode.trim().toUpperCase()} lodged with Super Admin Directorate for review and approval.`,
      });
      setErrorMsg(null);
      setReasonDetails('');
      setEvidenceNotes('');
      setAttachmentFileName('');
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to lodge resit request.');
      triggerFlash({
        type: 'error',
        text: 'Resit Submission Failed',
        subtext: err?.message || 'Could not lodge resit clearance application.',
      });
    }
  };

  const handleSelectExamPreset = (targetExam: Exam) => {
    setCourseCode(targetExam.courseCode);
    setExamTitle(targetExam.title);
    setMissedDate(targetExam.scheduledDate || new Date(targetExam.scheduledStartTime).toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Request Examination Resit &amp; Clearance
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Rifkins Education College &bull; Academic Assessment Directorate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Institutional Clearance Notice */}
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold text-sm flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Institutional Policy on Missed Examinations</span>
            </div>
            <p className="leading-relaxed">
              In accordance with college regulations, candidates who registered for an examination but missed connecting or sitting the session must seek official clearance from the Super Admin Directorate. Once your justification is reviewed and approved, your candidate registration will be accepted and exam room admission unblocked.
            </p>
          </div>

          {/* Candidate Bio-Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block">Candidate:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate block">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Registration No:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{student.studentNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Faculty:</span>
              <span className="truncate block">{student.faculty || 'Computing & IT'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Academic Standing:</span>
              <span className="text-emerald-600 font-bold">{student.academicStanding || 'Good Standing'}</span>
            </div>
          </div>

          {/* Quick Select from Enrolled / Missed Exams */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
              Select Missed Examination or Course:
            </label>
            <div className="flex flex-wrap gap-2">
              {exams.map((ex) => (
                <button
                  type="button"
                  key={ex.id}
                  onClick={() => handleSelectExamPreset(ex)}
                  className={`px-3 py-1.5 rounded-lg border text-left font-sans transition-all cursor-pointer ${
                    courseCode === ex.courseCode && examTitle === ex.title
                      ? 'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                  }`}
                >
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{ex.courseCode}</span>
                  <span className="ml-1.5 truncate max-w-[200px] inline-block align-bottom">{ex.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS401"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Examination Title *
                </label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination: Distributed Systems"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Missed Sitting Date *
                </label>
                <input
                  type="date"
                  required
                  value={missedDate}
                  onChange={(e) => setMissedDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Grounds for Absence *
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="medical">Medical Emergency / Acute Illness</option>
                  <option value="technical">Technical / Network Connectivity Outage</option>
                  <option value="compassionate">Compassionate / Family Bereavement</option>
                  <option value="academic_clash">Academic Timetable Clashing</option>
                  <option value="other">Other Extenuating Circumstances</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Circumstantial Explanation *
              </label>
              <textarea
                rows={3}
                required
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Provide complete explanation of what occurred, why you missed connecting or sitting the exam, and request authorization for resit registration..."
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Evidence / Medical Clinic Reference
                </label>
                <input
                  type="text"
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  placeholder="e.g. UHS Clinic Certificate Ref #8849-B"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attached Proof Document Name
                </label>
                <input
                  type="text"
                  value={attachmentFileName}
                  onChange={(e) => setAttachmentFileName(e.target.value)}
                  placeholder="e.g. Medical_Certificate_Doctor_Note.pdf"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2 shadow-md cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Submit Resit Clearance Request</span>
              </button>
            </div>
          </form>

          {/* Historical Student Requests Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              <span>Your Lodged Resit Requests &amp; Admin Clearance Decisions</span>
            </h4>

            {myRequests.length === 0 ? (
              <p className="text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-950 rounded-lg">
                No active or past resit requests recorded.
              </p>
            ) : (
              <div className="space-y-2.5">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      req.status === 'approved'
                        ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                        : req.status === 'declined'
                        ? 'bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800'
                        : 'bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{req.courseCode}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{req.examTitle}</span>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : req.status === 'declined'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-600 text-white animate-pulse'
                          }`}
                        >
                          {req.status === 'approved' ? '✓ Clearance Approved' : req.status === 'declined' ? '✗ Request Declined' : '⏳ Pending Admin Review'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 line-clamp-1">
                        Reason: {req.reasonDetails}
                      </p>
                      {req.adminDecisionNote && (
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-white bg-white/80 dark:bg-slate-900/80 p-2 rounded border border-slate-200 dark:border-slate-700 mt-1">
                          Admin Directorate Decision: "{req.adminDecisionNote}" (Reviewed by {req.reviewedBy || 'Super Admin'})
                        </p>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono shrink-0">
                      Submitted: {new Date(req.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
