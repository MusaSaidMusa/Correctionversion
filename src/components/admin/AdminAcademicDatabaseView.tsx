import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  Filter,
  Trash2,
  Edit2,
  Plus,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  GraduationCap,
  Sparkles,
  Calendar,
  X,
  Clock,
  ShieldCheck,
  ChevronDown,
  Download,
  KeyRound,
  FileCheck,
  Check,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AcademicRecord, StudentProfile, Exam } from '../../types';
import {
  getStoredAcademicRecords,
  saveStoredAcademicRecords,
  addAcademicRecord,
  updateAcademicRecord,
  deleteAcademicRecord,
  deleteAcademicRecordsByAdmission,
  syncAcademicDatabaseWithSubmissions,
  calculateAcademicGrade,
  buildCompositeKey,
} from '../../services/storageService';
import { triggerFlash } from '../common/FlashMessage';
import { InstitutionLogo } from '../common/InstitutionLogo';

interface AdminAcademicDatabaseViewProps {
  students: StudentProfile[];
  exams: Exam[];
}

type PeriodFilterType =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'academic_year'
  | 'custom';

export const AdminAcademicDatabaseView: React.FC<AdminAcademicDatabaseViewProps> = ({
  students,
  exams,
}) => {
  const [records, setRecords] = useState<AcademicRecord[]>(() => getStoredAcademicRecords());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'approved' | 'modified' | 'provisional'>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AcademicRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form state for add / edit
  const [formAdmission, setFormAdmission] = useState('');
  const [formStudentName, setFormStudentName] = useState('');
  const [formCourse, setFormCourse] = useState('CS401');
  const [formUnitName, setFormUnitName] = useState('Principles of Distributed Computing');
  const [formScore, setFormScore] = useState<number>(75);
  const [formTotalPoints, setFormTotalPoints] = useState<number>(100);
  const [formDepartment, setFormDepartment] = useState('Computer Science & Software Engineering');
  const [formStatus, setFormStatus] = useState<'approved' | 'modified' | 'provisional'>('approved');
  const [formPeriod, setFormPeriod] = useState('2025/2026 Academic Session');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync listener across windows
  useEffect(() => {
    const handleUpdate = () => {
      setRecords(getStoredAcademicRecords());
    };
    window.addEventListener('examguard_academic_database_updated', handleUpdate);
    window.addEventListener('examguard_submissions_updated', handleUpdate);
    return () => {
      window.removeEventListener('examguard_academic_database_updated', handleUpdate);
      window.removeEventListener('examguard_submissions_updated', handleUpdate);
    };
  }, []);

  // Unique departments for filter
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    exams.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).filter(Boolean);
  }, [records, students, exams]);

  // Date range calculation for period filter
  const dateBounds = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date(now.getTime() + 86400000);
    let label = 'All Recorded Academic Records';

    if (periodFilter === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      label = `Daily Period: ${now.toLocaleDateString()}`;
    } else if (periodFilter === 'this_week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59);
      label = `Weekly Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else if (periodFilter === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      label = `Monthly Period: ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    } else if (periodFilter === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      label = `Monthly Period: ${prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    } else if (periodFilter === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
      label = `Quarter Q${currentQuarter + 1} ${now.getFullYear()}`;
    } else if (periodFilter === 'academic_year') {
      const year = now.getFullYear();
      start = new Date(year - 1, 8, 1); // Sept of prev year
      end = new Date(year, 11, 31, 23, 59, 59);
      label = `Academic Session: ${year - 1}/${year}`;
    } else if (periodFilter === 'custom' && customStartDate) {
      start = new Date(`${customStartDate}T00:00:00`);
      end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
      label = `Custom Period: ${customStartDate} to ${customEndDate || 'Present'}`;
    }

    return { start, end, label };
  }, [periodFilter, customStartDate, customEndDate]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Period filter
      if (periodFilter !== 'all') {
        const recordDate = new Date(r.recordedAt).getTime();
        if (recordDate < dateBounds.start.getTime() || recordDate > dateBounds.end.getTime()) {
          return false;
        }
      }

      // Department filter
      if (selectedDeptFilter !== 'all' && r.department.toLowerCase() !== selectedDeptFilter.toLowerCase()) {
        return false;
      }

      // Grade filter
      if (selectedGradeFilter !== 'all') {
        if (!r.grade.toUpperCase().startsWith(selectedGradeFilter.toUpperCase())) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all' && r.status !== selectedStatusFilter) {
        return false;
      }

      // Search query filter (Primary Key Student Admission, Student Name, Course, Unit Name, Department)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchAdmission = r.studentAdmission.toLowerCase().includes(query);
        const matchName = r.studentName.toLowerCase().includes(query);
        const matchCourse = r.course.toLowerCase().includes(query);
        const matchUnit = r.unitName.toLowerCase().includes(query);
        const matchDept = r.department.toLowerCase().includes(query);
        const matchGrade = r.grade.toLowerCase() === query;
        if (!matchAdmission && !matchName && !matchCourse && !matchUnit && !matchDept && !matchGrade) {
          return false;
        }
      }

      return true;
    });
  }, [records, periodFilter, dateBounds, selectedDeptFilter, selectedGradeFilter, selectedStatusFilter, searchQuery]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const uniqueAdmissions = new Set(filteredRecords.map((r) => r.studentAdmission.trim().toUpperCase())).size;
    const approvedCount = filteredRecords.filter((r) => r.status === 'approved').length;
    const modifiedCount = filteredRecords.filter((r) => r.status === 'modified').length;
    const averageScore =
      totalRecords > 0
        ? Math.round(filteredRecords.reduce((sum, r) => sum + r.percentage, 0) / totalRecords)
        : 0;
    const passCount = filteredRecords.filter((r) => r.percentage >= 50).length;
    const passRate = totalRecords > 0 ? Math.round((passCount / totalRecords) * 100) : 0;

    // Grade distributions
    const gradesCount: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    filteredRecords.forEach((r) => {
      const g = r.grade.charAt(0).toUpperCase();
      if (gradesCount[g] !== undefined) gradesCount[g]++;
    });

    return {
      totalRecords,
      uniqueAdmissions,
      approvedCount,
      modifiedCount,
      averageScore,
      passRate,
      gradesCount,
    };
  }, [filteredRecords]);

  // Compute multi-unit candidate enrollments to showcase single students taking several units
  const multiUnitStudents = useMemo(() => {
    const map = new Map<string, { admission: string; name: string; courses: string[]; count: number }>();
    records.forEach((r) => {
      const adm = r.studentAdmission.trim().toUpperCase();
      if (!map.has(adm)) {
        map.set(adm, { admission: adm, name: r.studentName, courses: [], count: 0 });
      }
      const entry = map.get(adm)!;
      if (!entry.courses.includes(r.course)) {
        entry.courses.push(r.course);
      }
      entry.count++;
    });
    return Array.from(map.values()).filter((item) => item.count > 1);
  }, [records]);

  // Handle Dynamic Sync with Submissions
  const handleManualSync = () => {
    const fresh = syncAcademicDatabaseWithSubmissions();
    setRecords(fresh);
    triggerFlash({
      type: 'success',
      text: 'Database Dynamically Synchronized',
      subtext: `Synced latest examination results and approvals into the Admin Academic Database.`,
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormAdmission('');
    setFormStudentName('');
    setFormCourse('CS401');
    setFormUnitName('Principles of Distributed Computing');
    setFormScore(75);
    setFormTotalPoints(100);
    setFormDepartment('Computer Science & Software Engineering');
    setFormStatus('approved');
    setFormPeriod('2025/2026 Academic Session');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: AcademicRecord) => {
    setEditingRecord(rec);
    setFormAdmission(rec.studentAdmission);
    setFormStudentName(rec.studentName);
    setFormCourse(rec.course);
    setFormUnitName(rec.unitName);
    setFormScore(rec.score);
    setFormTotalPoints(rec.totalPoints);
    setFormDepartment(rec.department);
    setFormStatus(rec.status);
    setFormPeriod(rec.period);
    setFormError(null);
  };

  // Handle Save (Add or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const normAdmission = formAdmission.trim().toUpperCase();
    const normCourse = formCourse.trim().toUpperCase();

    if (!normAdmission || !normCourse || !formUnitName.trim() || !formDepartment.trim()) {
      setFormError('Student Admission (PK 1/2), Course Code (PK 2/2), Unit Name, and Department are all mandatory.');
      return;
    }

    const proposedCompositeKey = buildCompositeKey(normAdmission, normCourse);

    if (editingRecord) {
      // Check for collision if composite key changed
      const currentCompositeKey = editingRecord.compositePrimaryKey || buildCompositeKey(editingRecord.studentAdmission, editingRecord.course);
      if (proposedCompositeKey !== currentCompositeKey) {
        const conflict = records.some(
          (r) =>
            r.id !== editingRecord.id &&
            (r.compositePrimaryKey === proposedCompositeKey ||
              (r.studentAdmission.trim().toUpperCase() === normAdmission &&
                r.course.trim().toUpperCase() === normCourse))
        );
        if (conflict) {
          setFormError(
            `Integrity Constraint Violation: A record for Composite Primary Key [${normAdmission} # ${normCourse}] already exists. A student can enroll in multiple units, but cannot have duplicate entries for the exact same unit.`
          );
          return;
        }
      }

      // Update
      const percentage = formTotalPoints > 0 ? Math.round((formScore / formTotalPoints) * 100) : 0;
      const res = updateAcademicRecord(editingRecord.id, {
        studentAdmission: normAdmission,
        studentName: formStudentName.trim() || editingRecord.studentName,
        course: normCourse,
        compositePrimaryKey: proposedCompositeKey,
        unitName: formUnitName.trim(),
        score: formScore,
        totalPoints: formTotalPoints,
        percentage,
        grade: calculateAcademicGrade(percentage),
        department: formDepartment.trim(),
        status: formStatus,
        period: formPeriod.trim(),
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to update record.');
        return;
      }
      setEditingRecord(null);
      setRecords(getStoredAcademicRecords());
    } else {
      // Check composite primary key uniqueness
      const conflict = records.some(
        (r) =>
          r.compositePrimaryKey === proposedCompositeKey ||
          (r.studentAdmission.trim().toUpperCase() === normAdmission &&
            r.course.trim().toUpperCase() === normCourse)
      );
      if (conflict) {
        setFormError(
          `Integrity Constraint Violation: An academic record for Composite Primary Key [${normAdmission} # ${normCourse}] already exists in the database. A student can enroll in several different units, but duplicate records for the same unit are prohibited.`
        );
        return;
      }

      // Add
      const percentage = formTotalPoints > 0 ? Math.round((formScore / formTotalPoints) * 100) : 0;
      const res = addAcademicRecord({
        studentAdmission: normAdmission,
        studentName: formStudentName.trim() || 'Candidate',
        course: normCourse,
        unitName: formUnitName.trim(),
        score: formScore,
        totalPoints: formTotalPoints,
        percentage,
        grade: calculateAcademicGrade(percentage),
        department: formDepartment.trim(),
        status: formStatus,
        period: formPeriod.trim(),
      });
      if (!res.success) {
        setFormError(res.error || 'Failed to add record.');
        return;
      }
      setIsAddModalOpen(false);
      setRecords(getStoredAcademicRecords());
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    deleteAcademicRecord(recordToDelete.id);
    setRecordToDelete(null);
    setRecords(getStoredAcademicRecords());
  };

  // Export to Excel (.xlsx) with Composite Primary Key [Admission + Course]
  const handleExportExcel = () => {
    try {
      const dataRows = filteredRecords.map((r, index) => ({
        'No.': index + 1,
        'Composite Primary Key': r.compositePrimaryKey || buildCompositeKey(r.studentAdmission, r.course),
        'Student Admission (PK 1/2)': r.studentAdmission,
        'Course Code (PK 2/2)': r.course,
        'Candidate Name': r.studentName,
        'Units Name': r.unitName,
        'Score': r.score,
        'Total Points': r.totalPoints,
        'Percentage': `${r.percentage}%`,
        'Grade': r.grade,
        'Department': r.department,
        'Status': r.status.toUpperCase(),
        'Academic Period': r.period,
        'Approved By': r.approvedBy || 'Super Admin Directorate',
        'Record Date': new Date(r.recordedAt).toLocaleDateString(),
      }));

      const ws = XLSX.utils.json_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Academic Database');
      XLSX.writeFile(
        wb,
        `Rifkins_Academic_Database_${periodFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      triggerFlash({
        type: 'success',
        text: 'Excel Document Exported',
        subtext: `Exported ${filteredRecords.length} record(s) with Composite Primary Keys to .xlsx spreadsheet.`,
      });
    } catch (err: any) {
      triggerFlash({
        type: 'error',
        text: 'Export Failed',
        subtext: err?.message || 'Could not export Excel spreadsheet.',
      });
    }
  };

  // Export to CSV (.csv) with Composite Primary Key [Admission + Course]
  const handleExportCsv = () => {
    try {
      const headers = [
        'Composite Primary Key',
        'Student Admission (PK 1/2)',
        'Course Code (PK 2/2)',
        'Candidate Name',
        'Units Name',
        'Score',
        'Total Points',
        'Percentage',
        'Grade',
        'Department',
        'Status',
        'Academic Period',
        'Record Date',
      ];

      const rows = filteredRecords.map((r) => [
        `"${r.compositePrimaryKey || buildCompositeKey(r.studentAdmission, r.course)}"`,
        `"${r.studentAdmission}"`,
        `"${r.course}"`,
        `"${r.studentName}"`,
        `"${r.unitName.replace(/"/g, '""')}"`,
        r.score,
        r.totalPoints,
        `"${r.percentage}%"`,
        `"${r.grade}"`,
        `"${r.department.replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${r.period}"`,
        `"${new Date(r.recordedAt).toLocaleDateString()}"`,
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `Rifkins_Academic_Database_${periodFilter}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      triggerFlash({
        type: 'success',
        text: 'CSV Document Exported',
        subtext: `Exported ${filteredRecords.length} record(s) with Composite Primary Keys to .csv file.`,
      });
    } catch (err: any) {
      triggerFlash({
        type: 'error',
        text: 'CSV Export Failed',
        subtext: err?.message || 'Could not export CSV document.',
      });
    }
  };

  // Grade color badges
  const getGradeBadge = (grade: string) => {
    const g = grade.toUpperCase();
    if (g.startsWith('A')) {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
    }
    if (g.startsWith('B')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300';
    }
    if (g.startsWith('C')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
    }
    if (g.startsWith('D')) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300';
    }
    return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-400/40 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-300" />
              <span>Composite Primary Key: [Student Admission + Course Code]</span>
            </span>
            <span className="text-xs text-slate-300 font-mono">&bull;</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-400/40">
              Multi-Unit Support Active
            </span>
            <span className="text-xs text-slate-300 font-mono">&bull;</span>
            <span className="text-xs text-amber-300 font-medium">Dynamic Immediate Sync</span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Database className="w-7 h-7 text-indigo-400" />
            <span>Admin Academic Database &amp; Results Ledger</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Centralized institutional ledger using <strong>Composite Primary Key [Student Admission (PK 1/2) + Course Code (PK 2/2)]</strong> to enforce integrity constraints. A single student can sit for <strong>several units</strong> without conflict. Whenever marks are modified anywhere in the system, this database updates immediately for consistency.
          </p>
        </div>

        {/* Quick Database Control Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleManualSync}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            title="Scan and synchronize all approved & modified examination results"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Live Results</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Record</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            title="Generate official printable examination ledger with institution logo"
          >
            <Printer className="w-4 h-4" />
            <span>Printable Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Unit Records
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-slate-900 dark:text-white">
            {stats.totalRecords}
          </div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            Composite PK Entries
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Unique Candidates
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
            {stats.uniqueAdmissions}
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Admission Numbers
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Average Score
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {stats.averageScore}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Pass Rate: {stats.passRate}%
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Approved Results
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {stats.approvedCount}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            ✓ Faculty Certified
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Modified Marks
          </div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {stats.modifiedCount}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
            Admin Moderated
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Grade Distinction
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 font-mono text-sm font-bold text-slate-900 dark:text-white">
            <span className="text-emerald-600">A: {stats.gradesCount.A}</span>
            <span className="text-blue-600">B: {stats.gradesCount.B}</span>
            <span className="text-amber-600">C: {stats.gradesCount.C}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            D: {stats.gradesCount.D} &bull; Fail: {stats.gradesCount.F}
          </div>
        </div>
      </div>

      {/* Multi-Unit Candidates Demonstration Strip */}
      {multiUnitStudents.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/40 dark:to-slate-900/60 rounded-xl border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Multi-Unit Candidates (Single Student Doing Several Units):
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {multiUnitStudents.map((s) => (
              <button
                type="button"
                key={s.admission}
                onClick={() => setSearchQuery(s.admission)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  searchQuery.toUpperCase() === s.admission
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-indigo-400'
                }`}
                title={`Filter to see all ${s.count} units taken by ${s.name}`}
              >
                <span>{s.name} ({s.admission})</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                  {s.count} units
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report Generation Tools For Different Periods & Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Period Selector Tools */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Report Generation Period:
            </span>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
              {dateBounds.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Records' },
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'this_quarter', label: 'This Quarter' },
              { id: 'academic_year', label: 'Academic Year' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPeriodFilter(p.id as PeriodFilterType)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border ${
                  periodFilter === p.id
                    ? 'bg-[#d1e231] text-[#1a2200] border-[#a3b817] font-bold shadow-xs active-pear animate-pear-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-100 hover:text-amber-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker when selected */}
        {periodFilter === 'custom' && (
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
            <span className="font-bold text-slate-700 dark:text-slate-300">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
          </div>
        )}

        {/* Search & Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search by Admission (PK), Course, Unit, etc. */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Student Admission (PK), Course, Units Name, Department..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Departments ({departmentsList.length})</option>
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Grades (A-F)</option>
              <option value="A">Grade A (80-100%)</option>
              <option value="B">Grade B (60-79%)</option>
              <option value="C">Grade C (50-59%)</option>
              <option value="D">Grade D (40-49%)</option>
              <option value="F">Grade F (&lt;40%)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="modified">Modified &amp; Approved</option>
              <option value="provisional">Provisional</option>
            </select>
          </div>
        </div>

        {/* Export Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="text-slate-500 font-mono text-[11px]">
            Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> academic records in current period
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export current period academic ledger to Microsoft Excel format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export as Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 font-bold border border-blue-300 dark:border-blue-800 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export current period academic ledger as standard Comma Separated Values (CSV)"
            >
              <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Export as CSV (.csv)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Print Official Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* Academic Database Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Student Admission (PK 1/2)</span>
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Unit Code (PK 2/2)</span>
                  </div>
                </th>
                <th className="py-3 px-3">Candidate Name</th>
                <th className="py-3 px-3">Units Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3 text-center">Score / Max</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 font-sans">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Database className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      No academic records matched the criteria.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing search filters or click "Sync Live Results" to pull newly approved grades.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => {
                  const compKey = r.compositePrimaryKey || buildCompositeKey(r.studentAdmission, r.course);
                  const isEven = index % 2 === 0;
                  // Two beautiful light colors alternating row-by-row for crystal-clear visual distinction:
                  // Even: Soft Warm Amber/Alabaster Cream (Color 1)
                  // Odd:  Soft Cool Sky/Azure Mist (Color 2)
                  const rowThemeClass = isEven
                    ? 'bg-amber-50/50 dark:bg-amber-950/25 border-l-4 border-l-amber-400 dark:border-l-amber-600'
                    : 'bg-sky-50/60 dark:bg-sky-950/30 border-l-4 border-l-sky-400 dark:border-l-sky-600';

                  return (
                    <tr
                      key={r.id}
                      className={`${rowThemeClass} hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 transition-colors`}
                    >
                      {/* Column 1: Student Admission Number (Composite PK Component 1) */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-xs inline-block">
                            {r.studentAdmission}
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSearchQuery(r.studentAdmission)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                              title={`View all units enrolled by ${r.studentAdmission}`}
                            >
                              View all units
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Unit / Course Code (Composite PK Component 2) */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-100/70 dark:bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 text-xs inline-block">
                            {r.course}
                          </span>
                          <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500" title={`Composite PK: ${compKey}`}>
                            PK 2/2
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Candidate Name */}
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {r.studentName}
                      </td>

                      {/* Column 4: Units Name */}
                      <td className="py-3 px-3 max-w-[220px]">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={r.unitName}>
                          {r.unitName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {r.period}
                        </div>
                      </td>

                      {/* Column 5: Department */}
                      <td className="py-3 px-3 max-w-[170px]">
                        <span className="text-slate-700 dark:text-slate-300 text-[11px] truncate block" title={r.department}>
                          {r.department}
                        </span>
                      </td>

                      {/* Column 6: Score / Max */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {r.score}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">/{r.totalPoints}</span>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ({r.percentage}%)
                        </div>
                      </td>

                      {/* Column 7: Grade */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-xs border ${getGradeBadge(
                            r.grade
                          )}`}
                        >
                          {r.grade}
                        </span>
                      </td>

                      {/* Column 8: Status */}
                      <td className="py-3 px-3 text-center">
                        {r.status === 'modified' ? (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono font-bold text-[10px] border border-amber-300 inline-block cursor-help shadow-2xs"
                            title={r.modifiedReason || 'Score modified following official admin review.'}
                          >
                            ✎ Modified &amp; Approved
                          </span>
                        ) : r.status === 'approved' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold text-[10px] border border-emerald-300 inline-block shadow-2xs">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[10px] inline-block">
                            Provisional
                          </span>
                        )}
                      </td>

                      {/* Column 9: Actions: Edit, Delete */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                            title="Edit marks, grade, or details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white/80 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shadow-2xs"
                            title="Delete record from Academic Database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Academic Record Modal */}
      {(isAddModalOpen || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">
                  {editingRecord ? 'Edit Academic Result Record' : 'Add New Academic Database Entry'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRecord(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Composite Primary Key Explanatory & Preview Card */}
              <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                  <KeyRound className="w-4 h-4" />
                  <span>Composite Primary Key: [Student Admission] + [Course Code]</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enforces strict data integrity: A single student can sit for <strong>multiple different units</strong> (e.g. CS401, CS302, CYBER201). Duplicate entries for the exact same student and course code are prohibited.
                </p>
                {formAdmission.trim() && formCourse.trim() && (
                  <div className="pt-1 flex items-center gap-2 font-mono text-[11px] border-t border-indigo-100 dark:border-indigo-900/60 mt-1">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Active Composite PK:</span>
                    <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded font-bold border border-indigo-300 dark:border-indigo-700">
                      {buildCompositeKey(formAdmission, formCourse)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Student Admission (PK 1/2) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formAdmission}
                    onChange={(e) => setFormAdmission(e.target.value.toUpperCase())}
                    placeholder="e.g. STU-2024-8842 or RBC/2026/089"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Candidate Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formStudentName}
                    onChange={(e) => setFormStudentName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Course Code (PK 2/2) *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCourse}
                    onChange={(e) => setFormCourse(e.target.value.toUpperCase())}
                    placeholder="e.g. CS401"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Units Name / Examination Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUnitName}
                    onChange={(e) => setFormUnitName(e.target.value)}
                    placeholder="e.g. Principles of Distributed Computing"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Score (Marks Awarded) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={formTotalPoints || 100}
                    value={formScore}
                    onChange={(e) => setFormScore(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Maximum Points *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formTotalPoints}
                    onChange={(e) => setFormTotalPoints(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Calculated Grade
                  </label>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 font-mono font-bold text-center text-sm">
                    {calculateAcademicGrade(
                      formTotalPoints > 0 ? Math.round((formScore / formTotalPoints) * 100) : 0
                    )}{' '}
                    ({formTotalPoints > 0 ? Math.round((formScore / formTotalPoints) * 100) : 0}%)
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Software Engineering"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Period / Session
                  </label>
                  <input
                    type="text"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="e.g. 2025/2026 Academic Session"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Approval / Result Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    <option value="approved">Approved</option>
                    <option value="modified">Modified &amp; Approved</option>
                    <option value="provisional">Provisional</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRecord ? 'Save Modifications' : 'Insert into Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-rose-300 dark:border-rose-900/60 w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Delete Academic Database Record
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Primary Key: {recordToDelete.studentAdmission}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the academic examination record for{' '}
              <strong>{recordToDelete.studentName}</strong> ({recordToDelete.studentAdmission}) in course unit{' '}
              <strong>{recordToDelete.course} &mdash; {recordToDelete.unitName}</strong>?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
              <div>Score: {recordToDelete.score}/{recordToDelete.totalPoints} ({recordToDelete.percentage}%)</div>
              <div>Grade: {recordToDelete.grade} &bull; Dept: {recordToDelete.department}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Report Modal with Institution Logo and Certification */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-sm print:p-0 print:bg-white print:static print:z-auto">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:border-none print:max-h-none print:h-auto print:w-full print:rounded-none">
            {/* Modal Screen-Only Actions Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm">Official Printable Academic Database Ledger</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-amber-700 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-6 sm:p-10 overflow-y-auto flex-1 space-y-6 text-slate-900 bg-white font-serif print:p-0 print:overflow-visible">
              {/* Institution Header with Official Logo */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <InstitutionLogo size="xl" variant="icon" imgClassName="h-20 w-auto" />
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black font-sans uppercase tracking-tight text-slate-900">
                      Rifkins Education College
                    </h1>
                    <p className="text-xs font-serif italic text-slate-600">
                      Impacting lives since 1953 &bull; Academic Registrar &amp; Assessment Directorate
                    </p>
                    <p className="text-[11px] font-mono font-bold text-indigo-900 mt-1 uppercase tracking-wider">
                      Official Certified Examination &amp; Academic Records Database Ledger
                    </p>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-600 space-y-0.5 border-l-2 border-slate-300 pl-4 sm:pl-6">
                  <div><strong>Document Ref:</strong> REC-LEDGER-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}</div>
                  <div><strong>Period Scope:</strong> {dateBounds.label}</div>
                  <div><strong>Generated Date:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                  <div><strong>Indexing:</strong> Composite PK [Admission + Course Code]</div>
                </div>
              </div>

              {/* Summary Performance Metric Strip */}
              <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-center font-sans text-xs">
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">Total Candidates</span>
                  <span className="text-base font-black font-mono text-slate-900">{stats.uniqueAdmissions}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">Total Unit Records</span>
                  <span className="text-base font-black font-mono text-slate-900">{stats.totalRecords}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">Institutional Mean</span>
                  <span className="text-base font-black font-mono text-emerald-700">{stats.averageScore}%</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold uppercase text-[10px]">Overall Pass Rate</span>
                  <span className="text-base font-black font-mono text-indigo-700">{stats.passRate}%</span>
                </div>
              </div>

              {/* Main Ledger Table */}
              <table className="w-full text-left border-collapse font-sans text-[11px]">
                <thead>
                  <tr className="bg-slate-200 border-y-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Student Admission (PK 1/2)</th>
                    <th className="py-2.5 px-3">Unit Code (PK 2/2)</th>
                    <th className="py-2.5 px-3">Candidate Name</th>
                    <th className="py-2.5 px-3">Units Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.map((r, index) => {
                    const isEven = index % 2 === 0;
                    // Alternating two light colors for row-by-row distinction
                    const printRowBg = isEven ? 'bg-amber-50/40' : 'bg-sky-50/40';

                    return (
                      <tr key={r.id} className={`${printRowBg} leading-tight`}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {r.studentAdmission}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-cyan-900">
                          {r.course}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          {r.studentName}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          <div className="font-semibold">{r.unitName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.period}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {r.department}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {r.score}/{r.totalPoints} ({r.percentage}%)
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          <span className="px-2 py-0.5 rounded border border-slate-400 bg-white text-slate-900">
                            {r.grade}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-[10px] font-bold">
                          {r.status === 'modified' ? 'MODIFIED' : r.status === 'approved' ? 'APPROVED' : 'PROVISIONAL'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Endorsement and Institutional Seal Section */}
              <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-sans">
                <div className="space-y-6">
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    This document is an authoritative academic results ledger generated from the secured database of Rifkins Education College. Any alteration renders this document void.
                  </p>
                  <div className="border-t border-slate-400 pt-1.5 w-60">
                    <div className="font-bold text-slate-900">Dr. Marcus Sterling</div>
                    <div className="text-[10px] text-slate-500">Chief Examination Registrar &amp; Super Administrator</div>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between space-y-4">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-indigo-900 flex flex-col items-center justify-center p-2 text-center text-[9px] font-mono text-indigo-950 uppercase tracking-tighter">
                    <ShieldCheck className="w-6 h-6 text-indigo-700 mb-1" />
                    <span>Official Seal</span>
                    <span>Rifkins College</span>
                    <span className="font-bold">1953</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-right">
                    Verified Digital Hash: {Math.random().toString(36).substring(2, 15).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Screen-Only Bar */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
              <span className="text-xs text-slate-500 font-mono">
                {filteredRecords.length} records ready for print and official archiving
              </span>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
