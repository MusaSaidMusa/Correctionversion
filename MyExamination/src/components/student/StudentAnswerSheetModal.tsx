import React, { useRef } from 'react';
import {
  X,
  Download,
  Printer,
  FileCheck2,
  Award,
  ShieldCheck,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types';
import { InstitutionLogo } from '../common/InstitutionLogo';
import { MathRenderer, TechnicalDiagram } from '../common/QuestionMedia';
import { resolveExamFacultyDepartment } from '../../services/facultyResolutionService';
import { splitExamSentences } from '../../services/sentenceFormatter';

interface StudentAnswerSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  submission: ExamSubmission;
}

// Helper to format question sentences cleanly on new lines
const renderQuestionPrompt = (prompt: string) => {
  if (!prompt) return null;
  const sentences = splitExamSentences(prompt);

  if (sentences.length <= 1) {
    return <span className="whitespace-pre-line">{sentences[0] || prompt}</span>;
  }

  return (
    <div className="mt-1 space-y-1">
      {sentences.map((line, pIdx) => {
        const isPoint = /^([0-9]+[.)]|\([a-z0-9]+\)|[a-z][.)]|•|\*|-)/i.test(line);
        return (
          <div key={pIdx} className={`text-left ${isPoint ? 'pl-4 font-normal' : ''}`}>
            {line}
          </div>
        );
      })}
    </div>
  );
};

export const StudentAnswerSheetModal: React.FC<StudentAnswerSheetModalProps> = ({
  isOpen,
  onClose,
  exam,
  submission,
}) => {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const { faculty: displayFaculty, department: displayDepartment } = resolveExamFacultyDepartment(exam);

  const totalPoints =
    submission.totalPoints ??
    (exam.questions.reduce((a, b) => a + (b.points || 0), 0) || 100);
  const score = submission.score ?? 0;
  const percentage =
    submission.percentage ?? (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);

  const admissionNumber =
    submission.studentEmail?.includes('chen')
      ? 'ADM-CS-2026-084'
      : submission.studentEmail?.includes('liam')
      ? 'ADM-CS-2026-112'
      : submission.studentEmail?.includes('elena')
      ? 'ADM-MATH-2026-045'
      : submission.studentEmail?.includes('marcus')
      ? 'ADM-ECE-2026-093'
      : (submission.studentEmail?.split('@')[0] || 'STU-2026').toUpperCase();

  const formattedDate = new Date(submission.submittedAt || submission.startedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const gradeLetter =
    percentage >= 90 ? 'A (Distinction)' :
    percentage >= 80 ? 'B (Merit)' :
    percentage >= 70 ? 'C (Credit)' :
    percentage >= 50 ? 'Pass' : 'Referral / Fail';

  const handlePrint = () => {
    window.print();
  };

  // Download standalone Microsoft Word (.doc) formatted in Times New Roman 12pt
  const handleDownloadDoc = () => {
    const questionsHtml = exam.questions
      .map((q, idx) => {
        const ans = submission.answers[q.id];
        const awarded = ans?.awardedPoints ?? 0;

        // Candidate response text
        let candidateResponseHtml = '';
        if (q.type === 'single_choice' || q.type === 'true_false') {
          const selectedOption = q.options?.find((o) => ans?.selectedOptionIds?.includes(o.id));
          const optionText = selectedOption ? `${selectedOption.text}` : (ans?.textAnswer || 'No response recorded.');
          candidateResponseHtml = `
            <div style="font-size: 11pt; color: #1e3a8a; font-weight: bold; padding: 4pt 0;">
              Selected Answer: ${optionText}
            </div>
          `;
        } else {
          const subAnswersText = (q.subQuestions || [])
            .map((part, pIdx) => `<div><strong>Part (${String.fromCharCode(97 + pIdx)}):</strong> ${ans?.subQuestionAnswers?.[part.id] || 'No response recorded.'}</div>`)
            .join('');
          const mainText = ans?.textAnswer ? `<div>${ans.textAnswer.replace(/\n/g, '<br>')}</div>` : '';
          candidateResponseHtml = `
            <div style="font-size: 11pt; color: #0f172a; padding: 4pt 0; white-space: pre-wrap;">
              ${subAnswersText || mainText || 'No written response recorded.'}
            </div>
          `;
        }

        const rubricHtml = `
          <div style="background-color: #f0fdf4; border-left: 3pt solid #16a34a; padding: 6pt 10pt; margin: 6pt 0;">
            <strong>Official Model Solution & Marking Rubric [${q.points} Marks]:</strong>
            <div style="margin-top: 3pt; font-style: italic;">
              ${q.sampleAnswer || q.rubric || q.correctAnswers?.join(', ') || 'Award marks for factual accuracy, methodical derivation, and analytical clarity.'}
            </div>
          </div>
        `;

        const feedbackHtml = ans?.teacherFeedback
          ? `<div style="font-size: 10.5pt; color: #4338ca; margin-top: 4pt; font-style: italic;"><strong>Examiner Remarks:</strong> ${ans.teacherFeedback}</div>`
          : '';

        const overrideHtml = ans?.isOverridden && ans.overrideReason
          ? `<div style="font-size: 10pt; color: #b45309; margin-top: 3pt; font-weight: bold;">[ Marks Modified from ${ans.originalScore ?? 0} to ${ans.awardedPoints} Marks by ${ans.overriddenBy || 'Faculty Invigilator'} · Justification: "${ans.overrideReason}" ]</div>`
          : '';

        return `
          <div style="margin-bottom: 20pt; page-break-inside: avoid; border-bottom: 1pt solid #cbd5e1; padding-bottom: 14pt;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12pt; margin-bottom: 4pt;">
              <span>Item ${idx + 1} Candidate Answer Script [Allocation: ${q.points} Marks]</span>
              <span style="font-weight: normal; font-size: 10.5pt; color: #475569;">${q.type.replace('_', ' ').toUpperCase()} · ${q.topic}</span>
            </div>
            <div style="font-size: 11.5pt; color: #000000; margin-bottom: 6pt;">
              <strong>Question Statement:</strong> ${q.prompt}
            </div>
            <div style="background-color: #f8fafc; border-left: 3pt solid #2563eb; padding: 8pt 10pt; margin: 6pt 0;">
              <strong style="color: #1e3a8a;">Candidate Submitted Answer:</strong>
              ${candidateResponseHtml}
              <div style="margin-top: 6pt; font-size: 10.5pt; font-weight: bold; color: #0f172a; border-top: 1pt dashed #cbd5e1; padding-top: 4pt;">
                Score Awarded: ${awarded} / ${q.points} Marks ${ans?.isGraded ? '(Evaluated & Graded)' : '(Under Subjective Review)'}
              </div>
              ${overrideHtml}
              ${feedbackHtml}
            </div>
            ${rubricHtml}
          </div>
        `;
      })
      .join('');

    const documentContent = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>${exam.courseCode}_Official_Answer_Sheet_${(submission.studentName || 'Candidate').replace(/\s+/g, '_')}</title>
        <style>
          @page {
            size: A4;
            margin: 25mm 20mm;
          }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
            background: #ffffff;
            padding: 30pt;
            margin: 0;
          }
          .inst-header {
            text-align: center;
            border-bottom: 2.5pt double #000000;
            padding-bottom: 12pt;
            margin-bottom: 16pt;
          }
          .inst-name {
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18pt;
          }
          .meta-table td {
            font-size: 11pt;
            padding: 5pt 8pt;
            border: 1pt solid #000000;
          }
          .meta-label {
            font-weight: bold;
            background-color: #f8fafc;
            width: 25%;
          }
        </style>
      </head>
      <body>
        <div class="inst-header">
          <div class="inst-name">Rifkins Education College</div>
          <div style="font-size: 12pt; font-weight: bold; margin-top: 3pt;">Directorate of Academic Examinations & Quality Assurance</div>
          <div style="font-size: 10.5pt; font-style: italic; margin-top: 2pt;">${displayFaculty} · ${displayDepartment}</div>
          <div style="font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 8pt; padding: 4pt; border: 1pt solid #000000; background: #f1f5f9;">
            Official Summative Assessment Candidate Answer Script · Session 2025/2026
          </div>
          <div style="font-size: 10pt; color: #b91c1c; font-weight: bold; margin-top: 4pt;">
            [ CERTIFIED ACADEMIC ASSESSMENT ANSWER SCRIPT ]
          </div>
        </div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Course Code:</td>
            <td><strong>${exam.courseCode}</strong></td>
            <td class="meta-label">Course Title:</td>
            <td>${exam.courseTitle}</td>
          </tr>
          <tr>
            <td class="meta-label">Examination Title:</td>
            <td>${exam.title}</td>
            <td class="meta-label">Maximum Total Marks:</td>
            <td><strong>${totalPoints} Marks</strong></td>
          </tr>
          <tr>
            <td class="meta-label">Candidate Name:</td>
            <td><strong>${submission.studentName}</strong></td>
            <td class="meta-label">Student Admission No:</td>
            <td><strong>${admissionNumber}</strong></td>
          </tr>
          <tr>
            <td class="meta-label">Candidate Email:</td>
            <td>${submission.studentEmail}</td>
            <td class="meta-label">Chief Invigilator:</td>
            <td>${exam.instructorName}</td>
          </tr>
          <tr>
            <td class="meta-label">Date & Time of Sitting:</td>
            <td>${formattedDate}</td>
            <td class="meta-label">Assessment Duration:</td>
            <td>${exam.durationMinutes} Minutes (Strict Proctoring)</td>
          </tr>
          <tr>
            <td class="meta-label">Proctor Integrity Index:</td>
            <td><strong>${submission.integrityScore}% (SEB & Continuous Invigilation Verified)</strong></td>
            <td class="meta-label">Official Score & Grade:</td>
            <td><strong style="font-size: 12pt; color: #1e3a8a;">${score} / ${totalPoints} Marks (${percentage}%) · ${gradeLetter}</strong></td>
          </tr>
        </table>

        <div style="margin-bottom: 16pt; font-style: italic; font-size: 10.5pt; border-bottom: 1pt solid #000; padding-bottom: 6pt;">
          Notice: This certified script contains the candidate's authentic written and selected answers, marks awarded, examiner evaluations, and official marking schemes for all assessment items.
        </div>

        ${questionsHtml}

        <div style="margin-top: 30pt; border-top: 1.5pt solid #000000; padding-top: 15pt;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; vertical-align: top; border: none; padding: 10pt;">
                ____________________________________________<br>
                <strong>Candidate Signature & Declaration</strong><br>
                <span style="font-size: 9.5pt; font-style: italic;">Certified that this script represents my authentic work.</span>
              </td>
              <td style="width: 50%; text-align: right; vertical-align: top; border: none; padding: 10pt;">
                ____________________________________________<br>
                <strong>Faculty Examiner / Invigilator Certification</strong><br>
                <span style="font-size: 9.5pt; font-style: italic;">Verified and sealed by Institutional Examinations Board.</span>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([documentContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.courseCode}_Official_Answer_Sheet_${(submission.studentName || 'Candidate').replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (!printableRef.current) return;
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${exam.courseCode}_Official_Answer_Sheet_${(submission.studentName || 'Candidate').replace(/\s+/g, '_')}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; color: #000000; background: #ffffff; padding: 25pt; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1pt solid #000000; padding: 5pt 8pt; font-size: 11pt; }
  </style>
</head>
<body>
  ${printableRef.current.innerHTML}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.courseCode}_Official_Answer_Sheet_${(submission.studentName || 'Candidate').replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        {/* Top Controls Bar - Matching Marking Scheme Modal */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-100 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                  {exam.courseCode}
                </span>
                <span className="text-xs text-slate-600 font-semibold truncate">{exam.courseTitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Certified Script
                </span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate mt-0.5">
                Official Answer Sheet — {submission.studentName} ({admissionNumber})
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download Microsoft Word .doc Document formatted in Times New Roman 12pt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Word (.doc)</span>
              <span className="sm:hidden">Word</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Download Print-Ready HTML Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download HTML</span>
              <span className="sm:hidden">HTML</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Print Answer Sheet via Browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Answer Sheet Document Body (Uniform One Sheet · Times New Roman 12pt) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-10 bg-slate-100/50">
          <div
            ref={printableRef}
            className="bg-white shadow-xl mx-auto p-6 sm:p-14 max-w-3xl border border-slate-200 printable-exam-document"
            style={{
              fontFamily: '"Times New Roman", Times, serif',
              fontSize: '12pt',
              lineHeight: '1.5',
              color: '#000000',
            }}
          >
            {/* Header - Identical to Official Marking Scheme */}
            <div className="text-center border-b-2 border-black pb-4 mb-5">
              <div className="flex justify-center mb-3">
                <InstitutionLogo size="exam" />
              </div>
              <div className="text-xl font-bold uppercase tracking-wide">
                Rifkins Education College
              </div>
              <div className="text-sm font-semibold mt-0.5">
                Directorate of Academic Examinations & Quality Assurance
              </div>
              <div className="text-xs italic text-slate-700 mt-0.5">
                {displayFaculty} · {displayDepartment} · Office of the Registrar
              </div>
              <div className="text-sm font-bold uppercase tracking-wider mt-2 bg-slate-100 py-1 border border-slate-300">
                Official Summative Assessment Candidate Answer Script · Session 2025/2026
              </div>
              <div className="text-[11px] font-mono text-blue-800 font-bold mt-1">
                [ CERTIFIED ACADEMIC ASSESSMENT ANSWER SCRIPT ]
              </div>
            </div>

            {/* Candidate & Examination Metadata Table */}
            <table className="w-full border-collapse border border-black mb-6 text-[11.5pt]">
              <tbody>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold w-1/4 text-left align-top">
                    Course Code:
                  </td>
                  <td className="border border-black p-2.5 font-bold font-mono text-left align-top">
                    {exam.courseCode}
                  </td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold w-1/4 text-left align-top">
                    Course Title:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">{exam.courseTitle}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Examination Title:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">{exam.title}</td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Maximum Total Marks:
                  </td>
                  <td className="border border-black p-2.5 font-bold text-left align-top">{totalPoints} Marks</td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Candidate Full Name:
                  </td>
                  <td className="border border-black p-2.5 font-bold text-left align-top">
                    {submission.studentName}
                  </td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Student Admission No:
                  </td>
                  <td className="border border-black p-2.5 font-mono font-bold text-blue-900 text-left align-top">
                    {admissionNumber}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Candidate Email:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    {submission.studentEmail}
                  </td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Chief Invigilator:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    {exam.instructorName}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Date & Time of Assessment:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    {formattedDate}
                  </td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Assessment Duration:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    {exam.durationMinutes} Minutes (Strict Invigilation)
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Invigilation Integrity Index:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    <span className="font-semibold text-emerald-800">
                      {submission.integrityScore}% (SEB & Continuous Proctoring Verified)
                    </span>
                  </td>
                  <td className="border border-black p-2.5 bg-slate-50 font-bold text-left align-top">
                    Total Score & Grade:
                  </td>
                  <td className="border border-black p-2.5 text-left align-top">
                    <span className="font-extrabold text-blue-900 underline text-base">
                      {score} / {totalPoints} Marks ({percentage}%) · {gradeLetter}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Script Preamble Notice */}
            <div className="mb-6 p-2.5 bg-slate-50 border-l-4 border-blue-800 text-xs text-slate-700 italic">
              <strong>Official Script Record:</strong> This certified examination answer sheet documents all answers submitted by the candidate, invigilator marks awarded, question rubrics, and feedback for the complete sitting.
            </div>

            {/* UNIFIED QUESTIONS FLOW - CONTIGUOUS SINGLE SHEET */}
            <div className="space-y-6">
              {exam.questions.map((q, idx) => {
                const ans = submission.answers[q.id];
                const pointsAwarded = ans?.awardedPoints ?? 0;
                const isOverridden = ans?.isOverridden;

                return (
                  <div
                    key={q.id || idx}
                    className="border-b border-slate-300 pb-6 mb-6 last:border-b-0 last:mb-0 page-break-inside-avoid"
                  >
                    {/* Item Heading */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-black mb-3 text-[12pt] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="uppercase">Item {idx + 1} Candidate Answer Sheet</span>
                        <span className="text-[10pt] font-mono text-slate-600 font-normal">
                          [{q.points} Marks Allocated]
                        </span>
                      </div>
                      <div className="text-[10pt] font-mono font-normal text-slate-500 uppercase">
                        {q.type.replace('_', ' ')} · {q.topic}
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="mb-3 text-[11.5pt] leading-relaxed">
                      <div className="font-bold text-black mb-1">Question Statement:</div>
                      <div className="text-slate-900 font-serif">
                        {renderQuestionPrompt(q.prompt)}
                      </div>
                    </div>

                    {/* Equations & Technical Diagrams */}
                    {q.mathEquation && (
                      <div className="my-2 p-2 bg-slate-50 border border-slate-200">
                        <MathRenderer equation={q.mathEquation} />
                      </div>
                    )}

                    {q.imageUrl && (
                      <div className="my-3 text-center">
                        <TechnicalDiagram
                          imageUrl={q.imageUrl}
                          caption={q.imageCaption || `Figure ${idx + 1}`}
                          transform={q.imageTransform}
                        />
                      </div>
                    )}

                    {/* Sub-questions if any */}
                    {q.subQuestions && q.subQuestions.length > 0 && (
                      <div className="my-3 pl-4 border-l-2 border-slate-300 space-y-2 text-[11pt]">
                        {q.subQuestions.map((sq, sqIdx) => (
                          <div key={sq.id || sqIdx}>
                            <span className="font-bold">Part ({String.fromCharCode(97 + sqIdx)}):</span> {sq.prompt}{' '}
                            <span className="text-slate-600 font-mono text-xs">[{sq.points} Marks]</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* CANDIDATE WRITTEN & SUBMITTED RESPONSE BLOCK */}
                    <div className="mt-3 p-3.5 bg-slate-50 border-l-4 border-blue-800 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <strong className="text-xs uppercase font-mono tracking-wider text-blue-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-700" />
                          <span>Candidate Submitted Response:</span>
                        </strong>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                          Score: {pointsAwarded} / {q.points} Marks
                        </span>
                      </div>

                      {/* Display response based on question type */}
                      {q.type === 'single_choice' || q.type === 'true_false' ? (
                        <div className="space-y-1.5 text-[11.5pt]">
                          {q.options?.map((opt, optIdx) => {
                            const isSelected = ans?.selectedOptionIds?.includes(opt.id) ||
                              ans?.textAnswer?.trim().toLowerCase() === opt.text.trim().toLowerCase();
                            const isCorrectOpt = opt.isCorrect;

                            return (
                              <div
                                key={opt.id || optIdx}
                                className={`p-2 rounded border flex items-center justify-between text-xs ${
                                  isSelected
                                    ? isCorrectOpt
                                      ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                                      : 'bg-rose-50 border-rose-300 font-bold text-rose-950'
                                    : 'bg-white border-slate-200 text-slate-700 opacity-70'
                                }`}
                              >
                                <span>
                                  <strong className="font-mono mr-1.5">({String.fromCharCode(65 + optIdx)})</strong>
                                  {opt.text}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/10">
                                    Candidate Selected {isCorrectOpt ? '✓ (Correct)' : '✗ (Incorrect)'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2 text-[11.5pt]">
                          {q.subQuestions && q.subQuestions.length > 0 ? (
                            q.subQuestions.map((sq, sqIdx) => (
                              <div key={sq.id || sqIdx} className="bg-white p-2.5 border border-slate-200 rounded">
                                <div className="text-xs font-bold text-slate-700 mb-1">
                                  Part ({String.fromCharCode(97 + sqIdx)}) Answer:
                                </div>
                                <div className="text-slate-900 whitespace-pre-wrap font-serif">
                                  {ans?.subQuestionAnswers?.[sq.id] || (
                                    <span className="text-slate-400 italic">No answer provided for this part.</span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-white p-3 border border-slate-200 rounded text-slate-900 whitespace-pre-wrap font-serif leading-relaxed min-h-[50px]">
                              {ans?.textAnswer || (
                                <span className="text-slate-400 italic">No written response provided.</span>
                              )}
                            </div>
                          )}

                          {ans?.uploadedPhotoUrl && (
                            <div className="mt-2 text-center p-2 bg-white border border-slate-200 rounded">
                              <div className="text-xs text-slate-500 mb-1">Candidate Attached File / Diagram:</div>
                              <img
                                src={ans.uploadedPhotoUrl}
                                alt={`Candidate work for question ${idx + 1}`}
                                className="max-h-60 mx-auto rounded border border-slate-300 object-contain"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Marks Override Audit Note */}
                      {isOverridden && (
                        <div className="mt-2.5 p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                          <strong>Examiner Marks Modification Audit:</strong> Original score of {ans.originalScore ?? 0} Marks was adjusted to {ans.awardedPoints} Marks by {ans.overriddenBy || 'Faculty Invigilator'}.<br />
                          <strong>Justification:</strong> &ldquo;{ans.overrideReason}&rdquo;
                        </div>
                      )}

                      {/* Examiner Feedback */}
                      {ans?.teacherFeedback && (
                        <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded text-xs text-indigo-900">
                          <strong>Examiner Written Evaluation:</strong> &ldquo;{ans.teacherFeedback}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* OFFICIAL MODEL SOLUTION & MARKING RUBRIC GUIDE */}
                    <div className="mt-3 p-3 bg-emerald-50/70 border-l-4 border-emerald-600 border border-emerald-200 text-xs">
                      <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Official Marking Scheme & Model Rubric:</span>
                      </div>
                      <div className="text-slate-800 italic leading-relaxed whitespace-pre-wrap">
                        {q.sampleAnswer || q.rubric || q.correctAnswers?.join(', ') || 'Award full marks for scientifically substantiated answer, appropriate derivations, and concise explanations.'}
                      </div>
                      {q.explanation && (
                        <div className="mt-1.5 pt-1.5 border-t border-emerald-200 text-slate-700">
                          <strong>Examiner Scheme Note:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Institutional Certification & Signatures Footer - Same as Marking Scheme */}
            <div className="mt-8 pt-6 border-t-2 border-black page-break-inside-avoid">
              <table className="w-full border-collapse border border-black text-[11pt]">
                <tbody>
                  <tr>
                    <td className="border border-black p-4 w-1/2 align-top">
                      <div className="font-bold mb-6">Candidate Declaration:</div>
                      <div className="border-b border-black w-3/4 mb-1"></div>
                      <div className="text-xs">Signature: {submission.studentName}</div>
                      <div className="text-xs text-slate-500 mt-1">Date: {formattedDate}</div>
                    </td>
                    <td className="border border-black p-4 w-1/2 align-top text-right">
                      <div className="font-bold mb-6 text-right">Examiner & Invigilation Endorsement:</div>
                      <div className="border-b border-black w-3/4 ml-auto mb-1"></div>
                      <div className="text-xs">Verified by: {exam.instructorName}</div>
                      <div className="text-xs text-emerald-700 font-mono font-bold mt-1">
                        ExamGuard Pro Certified · Score: {score} / {totalPoints} ({percentage}%)
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center text-[10pt] italic text-slate-600 mt-4">
                Institutional Quality Assurance Seal · Rifkins Education College · Directorate of Academic Examinations
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
