import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  Lock,
  Unlock,
  AlertCircle,
  Save,
} from 'lucide-react';
import { Exam } from '../../types';

interface UploadMarkingSchemeModalProps {
  exam: Exam | null;
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
    exam?.markingSchemeNotes || ''
  );
  const [isReleased, setIsReleased] = useState(exam?.isMarkingSchemeReleased ?? false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    exam?.officialMarkingSchemeUrl ? 'Official_Marking_Scheme.pdf' : null
  );

  if (!isOpen || !exam) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  const handleSave = () => {
    const updatedExam: Exam = {
      ...exam,
      markingSchemeNotes: markingSchemeNotes.trim() || undefined,
      isMarkingSchemeReleased: isReleased,
      officialMarkingSchemeUrl: uploadedFileName
        ? `/documents/${exam.courseCode}_MarkingScheme.pdf`
        : exam.officialMarkingSchemeUrl,
    };

    onSaveExam(updatedExam);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Official Marking Scheme Repository
              </h3>
              <p className="text-xs text-slate-500">
                {exam.courseCode} · {exam.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Attach Official Assessment Rubric / PDF
            </label>
            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {uploadedFileName || 'Click to select PDF or Document'}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                PDF, DOCX, XLSX (Max 15MB)
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Scheme notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Examiner Rubric Guidelines & Grading Criteria
            </label>
            <textarea
              value={markingSchemeNotes}
              onChange={(e) => setMarkingSchemeNotes(e.target.value)}
              rows={4}
              placeholder="Detail benchmark requirements, partial credit rules, or alternative acceptable answers..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Student Release Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isReleased
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {isReleased ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Candidate Portal Visibility
                </span>
                <span className="text-[11px] text-slate-500">
                  {isReleased
                    ? 'Marking scheme is publicly accessible to candidates.'
                    : 'Marking scheme is restricted to faculty invigilators.'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReleased(!isReleased)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                isReleased
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isReleased ? 'Released' : 'Withhold'}
            </button>
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Marking Scheme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
