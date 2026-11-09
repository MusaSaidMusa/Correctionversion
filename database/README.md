# Centralized App Database (`/database`)

This folder contains all application datasets for **ExamGuard Pro** at Rifkins Education College.

## Structure & Datasets

- **`superAdmin.json`**: Super Administrator credential record, profile, clearance level, and contact data (`Dr. Marcus Sterling`).
- **`teachers.json`**: Teaching faculty and invigilator profiles (`Prof. Evelyn Vance`, `Dr. David Chen`), department, assigned courses, and rights.
- **`students.json`**: Enrolled students with institutional admission numbers (`MSA-2026/8-2041`, `MSA-2026/7-1982`, `MSA-2026/6-3045`), GPA, academic standing, and cleared status.
- **`courses.json`**: Official course catalog (`CS401`, `CS302`, `CYBER201`), credits, levels, and department affiliations.
- **`questions.json`**: Institutional question bank with multiple-choice, essay, and true/false questions, scoring rubrics, and explanations.
- **`exams.json`**: Examination schedules, proctoring security protocols, Safe Exam Browser (SEB) configuration, and admitted student rosters.
- **`submissions.json`**: Examination candidate submissions, answers, scores, auto-graded integrity checks, and marker feedback.
- **`missedExams.json`**: Registry of students who missed exams with reasons and resit eligibility tracking.
- **`resitRequests.json`**: Resit appeals submitted by students with attached medical and technical evidence, along with Super Admin approval records.
- **`academicDatabase.json`**: Composite primary key records (`[AdmissionNumber#CourseCode]`) providing tamper-evident institutional marks audit.
- **`helpTickets.json`**: Technical support and SEB compatibility inquiry tickets.
- **`faculties.json`**: Faculties and academic departments within the institution.
- **`allData.json`**: Manifest referencing all dataset collections and metadata.

## Access & Synchronization
- Files can be seeded or retrieved programmatically via backend routes (`/api/database` and `/api/database/:collection`).
- Browser storage synchronizes with these models via `src/services/storageService.ts` and `src/database/index.ts`.
