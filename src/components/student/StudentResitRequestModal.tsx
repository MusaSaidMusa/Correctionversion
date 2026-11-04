import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Send,
  Upload,
  ShieldAlert,
  FileCheck,
  File,
  Eye,
  Trash2,
  Stethoscope,
  Building,
  UserCheck,
  Check,
  Download,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
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
  
  // Compulsory Medical Evidence State
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentFileUrl, setAttachmentFileUrl] = useState<string | null>(null);
  const [attachmentFileType, setAttachmentFileType] = useState('');
  const [attachmentFileSize, setAttachmentFileSize] = useState<number | null>(null);
  const [medicalFacility, setMedicalFacility] = useState('University Health Services Clinic');
  const [doctorName, setDoctorName] = useState('Dr. Kevin Patel, MD');
  const [medicalCertificateRef, setMedicalCertificateRef] = useState('UHS-MED-2026-9812');
  
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // In-modal preview of attached evidence
  const [previewEvidence, setPreviewEvidence] = useState<{
    fileName: string;
    fileUrl?: string;
    fileType?: string;
  } | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotate, setPreviewRotate] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Student's historical resit requests
  const myRequests = getStoredResitRequests().filter((r) => r.studentId === student.id);

  const processSelectedFile = (file: File) => {
    setFileUploadError(null);
    setErrorMsg(null);

    // Size limit: 16MB
    if (file.size > 16 * 1024 * 1024) {
      setFileUploadError('File size exceeds 16MB limit. Please upload a compressed document or photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        let detectedType = file.type;
        if (!detectedType) {
          if (fileExt === 'pdf') detectedType = 'application/pdf';
          else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(fileExt || '')) {
            detectedType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          } else {
            detectedType = 'application/octet-stream';
          }
        }
        setAttachmentFileUrl(reader.result);
        setAttachmentFileName(file.name);
        setAttachmentFileType(detectedType);
        setAttachmentFileSize(file.size);
        setFileUploadError(null);
        triggerFlash({
          type: 'success',
          text: 'Document Attached',
          subtext: `${file.name} (${(file.size / 1024).toFixed(0)} KB) successfully loaded.`,
        });
      }
    };
    reader.onerror = () => {
      setFileUploadError('Failed to read the file. Please try selecting again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFileName('');
    setAttachmentFileUrl(null);
    setAttachmentFileType('');
    setAttachmentFileSize(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!courseCode.trim() || !examTitle.trim() || !reasonDetails.trim()) {
      setErrorMsg('Please specify Course Code, Examination Title, and a comprehensive explanation.');
      return;
    }

    // STRICT COMPULSORY MEDICAL EVIDENCE VALIDATION
    if (reasonCategory === 'medical') {
      const hasAttachment = Boolean(attachmentFileName.trim() && attachmentFileUrl);
      if (!hasAttachment) {
        const errorText =
          'Compulsory Medical Evidence Required: You have specified Medical grounds as the reason for missing the examination. University & College Assessment Regulations strictly mandate that an official medical certificate, doctor note, or hospital discharge form must be attached to process a resit clearance request.';
        setErrorMsg(errorText);
        triggerFlash({
          type: 'error',
          text: 'Compulsory Medical Evidence Missing',
          subtext:
            'You must attach an official medical certificate or doctor note when submitting a medical resit application.',
        });
        return;
      }
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
        attachmentFileUrl: attachmentFileUrl || undefined,
        attachmentFileType: attachmentFileType || undefined,
        attachmentFileSize: attachmentFileSize || undefined,
        medicalFacility: reasonCategory === 'medical' ? medicalFacility.trim() || undefined : undefined,
        doctorName: reasonCategory === 'medical' ? doctorName.trim() || undefined : undefined,
        medicalCertificateRef: reasonCategory === 'medical' ? medicalCertificateRef.trim() || undefined : undefined,
        grounds: reasonCategory,
        explanation: reasonDetails.trim(),
        evidenceDocument: attachmentFileName.trim() || undefined,
      });

      setSuccessMsg(
        'Your Examination Resit & Clearance Request with verified attachments has been officially lodged. The Super Admin Directorate will review your case. Once cleared, candidate registration and examination room admission will be approved.'
      );
      triggerFlash({
        type: 'success',
        text: 'Resit Clearance Request Submitted',
        subtext: `Application for ${courseCode.trim().toUpperCase()} lodged with Super Admin Directorate for review and approval.`,
      });
      setErrorMsg(null);
      setReasonDetails('');
      setEvidenceNotes('');
      // Keep attachments clear
      handleRemoveAttachment();
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

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div className="text-xs leading-relaxed font-medium">
                    <strong className="block text-rose-900 dark:text-rose-100 font-bold mb-0.5">
                      Clearance Validation Error
                    </strong>
                    {errorMsg}
                  </div>
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
                    onChange={(e) => {
                      const newCategory = e.target.value as any;
                      setReasonCategory(newCategory);
                      setErrorMsg(null);
                    }}
                    className={`w-full p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-950 font-medium ${
                      reasonCategory === 'medical'
                        ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200 font-bold'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="medical">Medical Emergency / Acute Illness (Attachment Compulsory)</option>
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

              {/* COMPULSORY MEDICAL EVIDENCE ATTACHMENT SECTION */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  reasonCategory === 'medical'
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Stethoscope
                      className={`w-4 h-4 ${
                        reasonCategory === 'medical' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'
                      }`}
                    />
                    <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Medical Certificate &amp; Evidence Document
                    </span>
                  </div>

                  {reasonCategory === 'medical' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono font-bold text-[10px] tracking-wider uppercase animate-pulse">
                      * COMPULSORY REQUIREMENT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                      Optional Supporting Proof
                    </span>
                  )}
                </div>

                {reasonCategory === 'medical' && (
                  <div className="mb-3 p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-[11px] leading-relaxed flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Official Assessment Regulation:</strong>
                      If you state <strong>Medical Reason</strong> for missing an examination, college regulations mandate that you <strong>compulsorily attach</strong> an official medical certificate, doctor note, or clinic admission slip. Clearance will not be granted without verified documentation.
                    </div>
                  </div>
                )}

                {/* Upload Trigger / Dropzone */}
                {!attachmentFileUrl ? (
                  <div className="space-y-3">
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20'
                          : reasonCategory === 'medical'
                          ? 'border-rose-300 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/10 hover:border-rose-500 hover:bg-rose-50/70'
                          : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:border-indigo-400 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      </div>

                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                        {reasonCategory === 'medical'
                          ? 'Click or Drag & Drop Compulsory Medical Document (PDF or Photo)'
                          : 'Click or Drag & Drop Supporting Evidence Document'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-1">
                        Accepted formats: <strong>Photo Images (JPG, PNG, WEBP, HEIC)</strong> &bull; <strong>PDF Documents</strong> (Max: 16MB)
                      </p>
                    </div>

                    {/* Dual Action Buttons: File Picker & Camera Capture */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Browse File (PDF or Photo)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-indigo-200 dark:border-indigo-800"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Take Photo with Camera</span>
                      </button>
                    </div>

                    {fileUploadError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium text-center">
                        {fileUploadError}
                      </p>
                    )}
                  </div>
                ) : (
                  /* Attached Document Card */
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        {attachmentFileType.startsWith('image/') || attachmentFileName.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i) ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {attachmentFileName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-[10px] font-bold">
                            ✓ Attached
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-mono text-[10px] font-semibold">
                            {attachmentFileType.startsWith('image/') || attachmentFileName.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)
                              ? '🖼️ Photo Document'
                              : attachmentFileType.includes('pdf') || attachmentFileName.endsWith('.pdf')
                              ? '📄 PDF Document'
                              : '📁 Evidence File'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {formatFileSize(attachmentFileSize)} &bull; {attachmentFileType || 'Document Proof'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewZoom(1);
                          setPreviewRotate(0);
                          setPreviewEvidence({
                            fileName: attachmentFileName,
                            fileUrl: attachmentFileUrl,
                            fileType: attachmentFileType,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Preview attached document"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remove attached document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional Medical Verification Fields when Medical is Selected */}
                {reasonCategory === 'medical' && (
                  <div className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-rose-500" />
                        <span>Hospital / Clinic Name</span>
                      </label>
                      <input
                        type="text"
                        value={medicalFacility}
                        onChange={(e) => setMedicalFacility(e.target.value)}
                        placeholder="e.g. University Health Services Clinic"
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-rose-500" />
                        <span>Attending Doctor Name</span>
                      </label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="e.g. Dr. Kevin Patel, MD"
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-rose-500" />
                        <span>Certificate / Serial Ref #</span>
                      </label>
                      <input
                        type="text"
                        value={medicalCertificateRef}
                        onChange={(e) => setMedicalCertificateRef(e.target.value)}
                        placeholder="e.g. UHS-MED-2026-9812"
                        className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
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
                        <div className="flex flex-wrap items-center gap-2">
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

                          {req.reasonCategory === 'medical' && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                              <Stethoscope className="w-3 h-3 text-rose-600" />
                              <span>Medical Proof Attached</span>
                            </span>
                          )}
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 line-clamp-1">
                          Reason: {req.reasonDetails}
                        </p>

                        {(req.attachmentFileName || req.evidenceDocument) && (
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                            <File className="w-3.5 h-3.5" />
                            <span>Attached: {req.attachmentFileName || req.evidenceDocument}</span>
                            {req.attachmentFileUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewEvidence({
                                    fileName: req.attachmentFileName || req.evidenceDocument || 'Medical Document',
                                    fileUrl: req.attachmentFileUrl,
                                    fileType: req.attachmentFileType,
                                  })
                                }
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-1 cursor-pointer"
                              >
                                [View Attachment]
                              </button>
                            )}
                          </div>
                        )}

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

      {/* Document Preview Modal */}
      {previewEvidence && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2 min-w-0">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{previewEvidence.fileName}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {previewEvidence.fileUrl?.startsWith('data:image/') || previewEvidence.fileName.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)
                      ? '📸 High-Resolution Photo Document'
                      : '📄 Portable Document Format (PDF)'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Photo Zoom and Rotate Controls */}
                {(previewEvidence.fileUrl?.startsWith('data:image/') || previewEvidence.fileName.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) && (
                  <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-lg mr-2">
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.max(0.5, z - 0.2))}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold px-1 text-slate-700 dark:text-slate-300">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.2))}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewRotate((r) => (r + 90) % 360)}
                      className="p-1 rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer ml-1"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {previewEvidence.fileUrl && (
                  <a
                    href={previewEvidence.fileUrl}
                    download={previewEvidence.fileName}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    title="Download attached document"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewEvidence(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950 min-h-[350px]">
              {previewEvidence.fileUrl && (previewEvidence.fileUrl.startsWith('data:image/') || previewEvidence.fileName.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) ? (
                <div className="overflow-auto max-h-[68vh] max-w-full flex items-center justify-center p-2">
                  <img
                    src={previewEvidence.fileUrl}
                    alt={previewEvidence.fileName}
                    style={{
                      transform: `scale(${previewZoom}) rotate(${previewRotate}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                    className="max-h-[62vh] object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                  />
                </div>
              ) : previewEvidence.fileUrl && (previewEvidence.fileUrl.startsWith('data:application/pdf') || previewEvidence.fileName.endsWith('.pdf')) ? (
                <div className="w-full h-[68vh] rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-white shadow-xs">
                  <iframe
                    src={previewEvidence.fileUrl}
                    title={previewEvidence.fileName}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{previewEvidence.fileName}</p>
                    <p className="text-xs text-slate-500 mt-1">Institutional Document Stored in Registry</p>
                  </div>
                  {previewEvidence.fileUrl && (
                    <a
                      href={previewEvidence.fileUrl}
                      download={previewEvidence.fileName}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download / Open File</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                Rifkins Assessment &amp; Governance Archive
              </span>
              <button
                type="button"
                onClick={() => setPreviewEvidence(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
