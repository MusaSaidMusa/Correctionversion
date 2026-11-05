import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Award,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Exam } from '../../types';
import { uploadFileToServer } from '../../services/storageService';
import { readUploadedFileText } from '../../services/examDocumentParser';

interface UploadMarkingSchemeModalProps {
  exam: Exam;
  isOpen: boolean;
  instructorName: string;
  onClose: () => void;
  onSaveExam: (updatedExam: Exam) => void;
}

export const UploadMarkingSchemeModal: React.FC<UploadMarkingSchemeModalProps> = ({
  exam,
  isOpen,
  instructorName,
  onClose,
  onSaveExam,
}) => {
  const [markingSchemeNotes, setMarkingSchemeNotes] = useState(
    exam.markingSchemeNotes || ''
  );
  const [isReleased, setIsReleased] = useState(exam.isMarkingSchemeReleased || false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(exam.officialMarkingSchemeUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadedFileName(file.name);

    try {
      // 1. Upload to backend server
      const uploadRes = await uploadFileToServer(file);
      setUploadedUrl(uploadRes.url);

      // 2. Try to extract textual rubrics if it is text/csv/xlsx/doc
      try {
        const textExtract = await readUploadedFileText(file);
        if (textExtract.content && textExtract.content.trim()) {
          setMarkingSchemeNotes((prev) => {
            const heading = `=== OFFICIAL MARKING CRITERIA: ${file.name} ===\n`;
            if (!prev.trim()) return heading + textExtract.content.slice(0, 5000);
            return `${prev}\n\n${heading}${textExtract.content.slice(0, 5000)}`;
          });
        }
      } catch (extractErr) {
        // Non-fatal text extraction error (e.g. binary PDF)
        setMarkingSchemeNotes((prev) =>
          prev
            ? `${prev}\n\n[Uploaded Official Guide Document: ${file.name}]`
            : `[Official Institutional Marking Guide: ${file.name}]`
        );
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    const updated: Exam = {
      ...exam,
      markingSchemeNotes: markingSchemeNotes.trim(),
      isMarkingSchemeReleased: isReleased,
      officialMarkingSchemeUrl: uploadedUrl || exam.officialMarkingSchemeUrl,
    };
    onSaveExam(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Upload Official Marking Scheme</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {exam.courseCode} — {exam.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Attach Scheme Document (.PDF, .DOCX, .XLSX)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
              {isUploading ? (
                <div className="py-2 space-y-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                  <p className="font-semibold text-indigo-600">Uploading and saving document to server...</p>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {uploadedFileName || (uploadedUrl ? 'Document currently attached' : 'Drag and drop marking scheme or click to browse')}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">Institutional marking rubrics &amp; solutions (.pdf, .docx, .xlsx, .txt)</p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadedFileName || uploadedUrl ? 'Replace Document' : 'Choose Document'}</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.xlsx,.csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {uploadedUrl && (
                      <a
                        href={uploadedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg font-bold inline-flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View / Download Attachment</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>

                  {uploadError && (
                    <div className="mt-3 p-2 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadedUrl && !uploadError && (
                    <div className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Stored persistently on server ({uploadedUrl})</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Marking Guidelines & Grading Criteria Notes
              </label>
              <span className="text-[10px] font-mono text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                15 lines view
              </span>
            </div>
            <textarea
              rows={15}
              value={markingSchemeNotes}
              onChange={(e) => setMarkingSchemeNotes(e.target.value)}
              placeholder="Enter special scoring criteria, partial credit allowances, step-by-step marks allocation, or model solutions..."
              className="w-full min-h-[300px] px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed font-sans focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Release Marking Scheme to Candidates
              </div>
              <div className="text-[10px] text-slate-500">
                If enabled, candidates can inspect the official answers from their Past Papers section.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isReleased}
              onChange={(e) => setIsReleased(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer"
            >
              Save & Attach Marking Scheme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
