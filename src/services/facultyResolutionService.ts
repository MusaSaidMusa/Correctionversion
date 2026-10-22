import { Exam } from '../types';
import { getStoredExams, saveStoredExams } from './storageService';

export interface ExamFacultyDepartmentInfo {
  faculty: string;
  department: string;
  facultyCode: string;
}

export interface FacultyRecord {
  name: string;
  department: string;
  code?: string;
}

const STORAGE_KEY_FACULTIES = 'examguard_faculties_v1';

const INITIAL_FACULTIES: FacultyRecord[] = [
  {
    name: 'Faculty of Computing & Information Technologies',
    department: 'Computer Science & Software Engineering',
    code: 'CIT',
  },
  {
    name: 'Faculty of Natural & Applied Sciences',
    department: 'Department of Mathematics & Statistics',
    code: 'NAS',
  },
  {
    name: 'Faculty of Engineering & Architecture',
    department: 'School of Electronic & Computer Engineering',
    code: 'ENG',
  },
  {
    name: 'Faculty of Business & Administrative Sciences',
    department: 'Department of Information Systems & Management',
    code: 'BAS',
  },
];

export function getStoredFaculties(): FacultyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FACULTIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_FACULTIES, JSON.stringify(INITIAL_FACULTIES));
      return INITIAL_FACULTIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FACULTIES;
  } catch {
    return INITIAL_FACULTIES;
  }
}

export function saveStoredFaculties(faculties: FacultyRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FACULTIES, JSON.stringify(faculties));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('examguard_faculties_updated', { detail: { faculties } }));
    }
  } catch {}
}

export function createFaculty(record: FacultyRecord): { success: boolean; error?: string } {
  if (!record.name.trim() || !record.department.trim()) {
    return { success: false, error: 'Faculty name and department are required.' };
  }
  const faculties = getStoredFaculties();
  if (faculties.some((f) => f.name.trim().toLowerCase() === record.name.trim().toLowerCase())) {
    return { success: false, error: 'A faculty with this title already exists.' };
  }
  const updated = [
    ...faculties,
    {
      name: record.name.trim(),
      department: record.department.trim(),
      code: record.code || deriveFacultyCode(record.name.trim()),
    },
  ];
  saveStoredFaculties(updated);
  return { success: true };
}

export function updateFacultyRecord(
  originalName: string,
  record: FacultyRecord
): { success: boolean; error?: string } {
  const faculties = getStoredFaculties();
  const index = faculties.findIndex((f) => f.name.trim().toLowerCase() === originalName.trim().toLowerCase());
  if (index === -1) {
    return { success: false, error: `Faculty "${originalName}" not found.` };
  }
  faculties[index] = {
    ...faculties[index],
    name: record.name.trim(),
    department: record.department.trim(),
    code: record.code || deriveFacultyCode(record.name.trim()),
  };
  saveStoredFaculties(faculties);
  return { success: true };
}

export function deleteFacultyRecord(facultyName: string): boolean {
  const faculties = getStoredFaculties();
  const filtered = faculties.filter((f) => f.name.trim().toLowerCase() !== facultyName.trim().toLowerCase());
  if (filtered.length === faculties.length) return false;
  saveStoredFaculties(filtered);
  return true;
}

export function getDepartmentForFaculty(facultyName: string, courseCode?: string): string {
  const faculties = getStoredFaculties();
  const match = faculties.find((f) => f.name.trim().toLowerCase() === facultyName.trim().toLowerCase());
  if (match) return match.department;
  if (/computing|computer|it/i.test(facultyName) || /^CS|^CYBER/i.test(courseCode || '')) return 'Computer Science & Software Engineering';
  if (/math|statistics|science/i.test(facultyName) || /^MATH/i.test(courseCode || '')) return 'Department of Mathematics & Statistics';
  if (/engineering/i.test(facultyName) || /^ECE|^ENG/i.test(courseCode || '')) return 'School of Electronic & Computer Engineering';
  return 'Academic Department';
}

export function syncLecturerExamsFaculty(
  lecturerIdOrEmail: string,
  facultyName: string,
  departmentName?: string
): void {
  try {
    const exams = getStoredExams();
    let changed = false;
    const target = lecturerIdOrEmail.trim().toLowerCase();
    const updated = exams.map((exam) => {
      if (
        exam.instructorEmail.toLowerCase() === target ||
        exam.instructorName.toLowerCase().includes(target)
      ) {
        changed = true;
        return {
          ...exam,
          faculty: facultyName,
          department: departmentName || exam.department,
          facultyCode: deriveFacultyCode(facultyName),
        };
      }
      return exam;
    });

    if (changed) {
      saveStoredExams(updated);
    }
  } catch {}
}

export function resolveExamFacultyDepartment(exam?: Partial<Exam> | null): ExamFacultyDepartmentInfo {
  if (!exam) {
    return {
      faculty: 'Faculty of Computing & Information Technologies',
      department: 'Computer Science & Software Engineering',
      facultyCode: 'CIT',
    };
  }

  const courseCode = (exam.courseCode || '').toUpperCase();
  const explicitFaculty = exam.faculty;
  const explicitDept = exam.department;

  if (explicitFaculty && explicitDept) {
    return {
      faculty: explicitFaculty,
      department: explicitDept,
      facultyCode: exam.facultyCode || deriveFacultyCode(explicitFaculty),
    };
  }

  if (courseCode.startsWith('MATH') || courseCode.startsWith('STAT')) {
    return {
      faculty: explicitFaculty || 'Faculty of Natural & Applied Sciences',
      department: explicitDept || 'Department of Mathematics & Statistics',
      facultyCode: 'NAS',
    };
  }

  if (courseCode.startsWith('ECE') || courseCode.startsWith('EEE') || courseCode.startsWith('MECH')) {
    return {
      faculty: explicitFaculty || 'Faculty of Engineering & Architecture',
      department: explicitDept || 'School of Electronic & Computer Engineering',
      facultyCode: 'ENG',
    };
  }

  return {
    faculty: explicitFaculty || 'Faculty of Computing & Information Technologies',
    department: explicitDept || 'Computer Science & Software Engineering',
    facultyCode: exam.facultyCode || 'CIT',
  };
}

function deriveFacultyCode(faculty: string): string {
  return faculty
    .replace(/^Faculty of /i, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
