import { jsPDF } from 'jspdf';
import { AcademicRecord, Exam, ExamSubmission, StudentProfile } from '../types';
import {
  calculateAcademicGrade,
  getStoredAcademicRecords,
  getStoredCourses,
} from './storageService';

export interface TranscriptUnitEntry {
  courseCode: string;
  courseTitle: string;
  examTitle: string;
  period: string;
  dateLabel: string;
  score: number;
  totalPoints: number;
  percentage: number;
  grade: string;
  status: 'approved' | 'modified' | 'provisional';
  credits: number;
}

export interface StudentAcademicSummary {
  units: TranscriptUnitEntry[];
  totalUnits: number;
  totalCredits: number;
  averagePercentage: number;
  gpa: string;
  standing: string;
  passCount: number;
}

function gradeToPoints(grade: string): number {
  const g = (grade || '').trim().toUpperCase();
  switch (g) {
    case 'A':
      return 4.0;
    case 'A-':
      return 3.7;
    case 'B+':
      return 3.3;
    case 'B':
      return 3.0;
    case 'B-':
      return 2.7;
    case 'C+':
      return 2.3;
    case 'C':
      return 2.0;
    case 'D':
      return 1.0;
    default:
      return 0.0;
  }
}

export function getStudentAcademicSummary(
  student: StudentProfile,
  exams: Exam[],
  submissions: ExamSubmission[]
): StudentAcademicSummary {
  const allAcademicRecords: AcademicRecord[] = getStoredAcademicRecords();
  const courses = getStoredCourses();

  const normStudentAdm = (student.studentNumber || '').trim().toUpperCase();
  const normStudentName = (student.name || '').trim().toLowerCase();

  // Map keyed by normalized courseCode so each unit appears cleanly without duplicates
  const unitMap = new Map<string, TranscriptUnitEntry>();

  // 1. Pull matching records from Academic Database
  const matchingAcademic = allAcademicRecords.filter((rec) => {
    const recAdm = (rec.studentAdmission || '').trim().toUpperCase();
    const recName = (rec.studentName || '').trim().toLowerCase();
    return (
      (normStudentAdm && recAdm === normStudentAdm) ||
      (normStudentName && recName === normStudentName)
    );
  });

  matchingAcademic.forEach((rec) => {
    const code = (rec.course || 'UNIT').trim().toUpperCase();
    const matchedCourse = courses.find((c) => c.code.toUpperCase() === code);
    const matchedExam = rec.examId
      ? exams.find((e) => e.id === rec.examId)
      : exams.find((e) => e.courseCode.toUpperCase() === code);

    const courseTitle =
      matchedCourse?.title || matchedExam?.courseTitle || rec.unitName || code;
    const examTitle = rec.unitName || matchedExam?.title || courseTitle;

    unitMap.set(code, {
      courseCode: code,
      courseTitle,
      examTitle,
      period: rec.period || '2025/2026 Academic Session',
      dateLabel: rec.recordedAt
        ? new Date(rec.recordedAt).toLocaleDateString()
        : new Date().toLocaleDateString(),
      score: rec.score ?? 0,
      totalPoints: rec.totalPoints || 100,
      percentage: rec.percentage ?? 0,
      grade: rec.grade || calculateAcademicGrade(rec.percentage ?? 0),
      status: rec.status || 'approved',
      credits: matchedCourse?.credits || 3,
    });
  });

  // 2. Merge all completed/submitted/graded examinations for this student
  const studentCompletedSubs = submissions.filter(
    (s) =>
      (s.studentId === student.id ||
        (normStudentAdm &&
          (s.studentNumber || '').trim().toUpperCase() === normStudentAdm)) &&
      (s.status === 'submitted' || s.status === 'graded')
  );

  studentCompletedSubs.forEach((sub) => {
    const exam = exams.find((e) => e.id === sub.examId);
    const code = (exam?.courseCode || 'EXAM').trim().toUpperCase();
    const matchedCourse = courses.find((c) => c.code.toUpperCase() === code);

    const totalPoints =
      sub.totalPoints ||
      exam?.questions.reduce((sum, q) => sum + (q.points || 0), 0) ||
      100;
    const score = sub.score ?? 0;
    const percentage =
      sub.percentage ??
      (totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0);
    const grade = calculateAcademicGrade(percentage);
    const status: 'approved' | 'modified' | 'provisional' =
      sub.isResultCommitted || sub.status === 'graded'
        ? 'approved'
        : 'provisional';

    const courseTitle =
      exam?.courseTitle?.trim() || matchedCourse?.title || exam?.title || code;
    const examTitle = exam?.title?.trim() || courseTitle;

    // Prefer fresh submission data if not already present or if submission is newer/committed
    const existing = unitMap.get(code);
    if (!existing || sub.isResultCommitted || sub.status === 'graded') {
      unitMap.set(code, {
        courseCode: code,
        courseTitle,
        examTitle,
        period: exam?.scheduledDate
          ? `Session (${exam.scheduledDate})`
          : '2025/2026 Academic Session',
        dateLabel: sub.submittedAt
          ? new Date(sub.submittedAt).toLocaleDateString()
          : new Date().toLocaleDateString(),
        score,
        totalPoints,
        percentage,
        grade,
        status: existing?.status === 'modified' ? 'modified' : status,
        credits: matchedCourse?.credits || 3,
      });
    }
  });

  const units = Array.from(unitMap.values());
  const totalUnits = units.length;
  const totalCredits = units.reduce((sum, u) => sum + u.credits, 0);
  const averagePercentage =
    totalUnits > 0
      ? Math.round(units.reduce((sum, u) => sum + u.percentage, 0) / totalUnits)
      : 0;

  let gpaValue = 0;
  if (totalUnits > 0 && totalCredits > 0) {
    const weightedPoints = units.reduce(
      (sum, u) => sum + gradeToPoints(u.grade) * u.credits,
      0
    );
    gpaValue = weightedPoints / totalCredits;
  } else if (student.gpa) {
    const parsed = parseFloat(student.gpa);
    if (!isNaN(parsed)) gpaValue = parsed;
  }

  const gpaStr =
    totalUnits > 0
      ? `${gpaValue.toFixed(2)} / 4.00`
      : student.gpa
      ? `${student.gpa} / 4.00`
      : '0.00 / 4.00';

  let standing = student.academicStanding || 'Good Academic Standing';
  if (totalUnits > 0) {
    if (gpaValue >= 3.7) standing = "Dean's Honor List · First Class Standing";
    else if (gpaValue >= 3.0) standing = 'Second Class Upper · Good Standing';
    else if (gpaValue >= 2.0) standing = 'Satisfactory Academic Standing';
    else standing = 'Academic Probation / Resit Review';
  }

  const passCount = units.filter((u) => u.percentage >= 50).length;

  return {
    units,
    totalUnits,
    totalCredits: totalCredits || student.creditsCompleted || 0,
    averagePercentage,
    gpa: gpaStr,
    standing,
    passCount,
  };
}

async function loadInstitutionLogoForPdf(): Promise<{
  dataUrl: string;
  aspectRatio: number;
} | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const aspectRatio =
          img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 2.5;
        resolve({ dataUrl, aspectRatio });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/institution-logo.jpg';
  });
}

export async function downloadProvisionalTranscriptPdf(
  student: StudentProfile,
  summary: StudentAcademicSummary
): Promise<{ success: boolean; fileName: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 12;

  // Top-Centered Institution Logo
  const logo = await loadInstitutionLogoForPdf();
  if (logo) {
    const logoHeight = 16;
    const logoWidth = Math.min(contentWidth * 0.45, logoHeight * logo.aspectRatio);
    const logoX = (pageWidth - logoWidth) / 2;
    doc.addImage(logo.dataUrl, 'JPEG', logoX, y, logoWidth, logoHeight);
    y += logoHeight + 3;
  }

  // Institutional Header Banner (Centered beneath logo)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 23, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RIFKINS EDUCATION COLLEGE', pageWidth / 2, y + 7.5, { align: 'center' });

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text('"Impacting lives since 1953"  |  Office of the Academic Registrar', pageWidth / 2, y + 13, {
    align: 'center',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(94, 234, 212); // teal-300
  doc.text('PROVISIONAL ACADEMIC TRANSCRIPT', pageWidth / 2, y + 19.5, { align: 'center' });

  y += 28;

  // Candidate Metadata Box
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);

  const leftColX = margin + 4;
  const rightColX = margin + contentWidth / 2 + 4;

  const drawField = (x: number, fy: number, label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, x, fy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + 33, fy);
  };

  drawField(leftColX, y + 7, 'Candidate Name:', student.name);
  drawField(rightColX, y + 7, 'Admission No:', student.studentNumber || student.id);

  drawField(
    leftColX,
    y + 14,
    'Faculty:',
    (student.faculty || 'Faculty of Computing & Information Technologies').slice(0, 36)
  );
  drawField(
    rightColX,
    y + 14,
    'Department:',
    (student.department || 'Computer Science & Software Engineering').slice(0, 34)
  );

  drawField(
    leftColX,
    y + 21,
    'Course / Program:',
    `${student.programCode ? `${student.programCode} - ` : ''}${student.program || 'B.Sc. Computer Science (Honours)'}`.slice(0, 36)
  );
  drawField(rightColX, y + 21, 'Date Issued:', new Date().toLocaleDateString());

  drawField(leftColX, y + 28, 'Provisional GPA:', summary.gpa);
  drawField(rightColX, y + 28, 'Standing:', summary.standing.slice(0, 34));

  y += 39;

  // Section Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `EXAMINED UNITS & ACADEMIC PERFORMANCE RECORD (${summary.totalUnits} UNIT${summary.totalUnits === 1 ? '' : 'S'})`,
    margin,
    y
  );
  y += 4;

  // Table Column Configuration
  const cols = [
    { label: '#', width: 8, align: 'center' as const },
    { label: 'Code', width: 22, align: 'left' as const },
    { label: 'Course Title & Examination Unit', width: 76, align: 'left' as const },
    { label: 'Date / Session', width: 24, align: 'left' as const },
    { label: 'Score', width: 18, align: 'center' as const },
    { label: '%', width: 12, align: 'center' as const },
    { label: 'Grade', width: 14, align: 'center' as const },
    { label: 'Status', width: 16, align: 'center' as const },
  ];

  const drawTableHeader = (hy: number) => {
    doc.setFillColor(85, 107, 47); // Green Olive header accent
    doc.rect(margin, hy, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    let cx = margin;
    cols.forEach((col) => {
      const tx =
        col.align === 'center' ? cx + col.width / 2 : cx + 2;
      doc.text(col.label, tx, hy + 5.3, {
        align: col.align === 'center' ? 'center' : 'left',
      });
      cx += col.width;
    });
    return hy + 8;
  };

  y = drawTableHeader(y);

  if (summary.units.length === 0) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 14, 'D');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(
      'No completed examination records found for this candidate yet.',
      pageWidth / 2,
      y + 8.5,
      { align: 'center' }
    );
    y += 18;
  } else {
    summary.units.forEach((u, idx) => {
      const titleLines = doc.splitTextToSize(
        `${u.courseTitle}${u.examTitle && u.examTitle !== u.courseTitle ? `\nUnit: ${u.examTitle}` : ''}`,
        cols[2].width - 4
      );
      const rowHeight = Math.max(10, titleLines.length * 4 + 4);

      // Page break if needed
      if (y + rowHeight > pageHeight - 36) {
        doc.addPage();
        y = 16;
        y = drawTableHeader(y);
      }

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, rowHeight, 'D');

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8);

      let cx = margin;
      const midY = y + rowHeight / 2 + 1;

      // #
      doc.setFont('helvetica', 'normal');
      doc.text(String(idx + 1), cx + cols[0].width / 2, midY, { align: 'center' });
      cx += cols[0].width;

      // Code
      doc.setFont('helvetica', 'bold');
      doc.text(u.courseCode, cx + 2, midY);
      cx += cols[1].width;

      // Course Title & Unit
      doc.setFont('helvetica', 'normal');
      doc.text(titleLines, cx + 2, y + 4.5);
      cx += cols[2].width;

      // Date
      doc.setFontSize(7.5);
      doc.text(u.dateLabel, cx + 2, midY);
      cx += cols[3].width;

      // Score
      doc.setFontSize(8);
      doc.text(`${u.score}/${u.totalPoints}`, cx + cols[4].width / 2, midY, {
        align: 'center',
      });
      cx += cols[4].width;

      // %
      doc.text(`${u.percentage}%`, cx + cols[5].width / 2, midY, {
        align: 'center',
      });
      cx += cols[5].width;

      // Grade
      doc.setFont('helvetica', 'bold');
      doc.text(u.grade, cx + cols[6].width / 2, midY, { align: 'center' });
      cx += cols[6].width;

      // Status
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(u.status.toUpperCase(), cx + cols[7].width / 2, midY, {
        align: 'center',
      });

      y += rowHeight;
    });
  }

  // Summary Block
  y += 6;
  if (y + 34 > pageHeight - 15) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(20, 184, 166); // teal-500
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 94, 89); // teal-800
  doc.text(`Total Units Examined: ${summary.totalUnits}`, margin + 5, y + 7);
  doc.text(`Mean Percentage: ${summary.averagePercentage}%`, margin + 55, y + 7);
  doc.text(`Provisional GPA: ${summary.gpa}`, margin + 105, y + 7);
  doc.text(`Credits: ${summary.totalCredits}`, margin + 155, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Academic Standing: ${summary.standing}`, margin + 5, y + 13.5);

  // Footer Verification Notice
  y += 26;
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'PROVISIONAL TRANSCRIPT NOTICE: This document reflects verified examination results recorded in ExamGuard Pro for Rifkins Education College.',
    pageWidth / 2,
    y + 5,
    { align: 'center' }
  );
  doc.text(
    `Verification Ref: REC-TR-${new Date().getFullYear()}-${(student.studentNumber || student.id).replace(/[^A-Z0-9]/gi, '')}`,
    pageWidth / 2,
    y + 10,
    { align: 'center' }
  );

  const safeAdmission = (student.studentNumber || student.name || 'Student')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Provisional_Transcript_${safeAdmission}.pdf`;
  doc.save(fileName);

  return { success: true, fileName };
}
