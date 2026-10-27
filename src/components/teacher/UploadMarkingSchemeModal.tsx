import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Award,
  CheckCircle2,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { Exam } from '../../types';

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

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setMarkingSchemeNotes((prev) =>
        prev
          ? `${prev}\n\n[Uploaded Document: ${file.name}]`
          : `[Official Institutional Marking Guide: ${file.name}]`
      );
    }
  };

  const handleSave = () => {
    const updated: Exam = {
      ...exam,
      markingSchemeNotes: markingSchemeNotes.trim(),
      isMarkingSchemeReleased: isReleased,
      officialMarkingSchemeUrl: uploadedFileName
        ? `/schemes/${exam.courseCode.toLowerCase()}-marking-scheme.pdf`
        : exam.officialMarkingSchemeUrl,
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
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {uploadedFileName || 'Drag and drop marking scheme or click to browse'}
              </div>
              <p className="text-[11px] text-slate-400 mb-3">Institutional marking rubrics & solutions</p>
              <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer inline-block">
                Choose Document
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Marking Guidelines & Grading Criteria Notes
            </label>
            <textarea
              rows={4}
              value={markingSchemeNotes}
              onChange={(e) => setMarkingSchemeNotes(e.target.value)}
              placeholder="Enter special scoring criteria, partial credit allowances, or question steps..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
