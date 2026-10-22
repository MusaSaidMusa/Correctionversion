import { Question } from '../types';
import { readUploadedFileText, parseExamDocumentQuestions } from './examDocumentParser';

export interface UniversalParseResult {
  questions: Question[];
  examData?: {
    title?: string;
    courseCode?: string;
    durationMinutes?: number;
    description?: string;
  };
  detectedType: string;
  errors: string[];
}

export async function parseUniversalExamDocument(file: File): Promise<UniversalParseResult> {
  const errors: string[] = [];
  try {
    const { content, fileType } = await readUploadedFileText(file);

    // Check for JSON format first
    if (fileType === 'JSON' || file.name.endsWith('.json')) {
      try {
        const parsedJson = JSON.parse(content);
        if (Array.isArray(parsedJson)) {
          return {
            questions: parsedJson.map((q, idx) => ({
              id: q.id || `q-imported-${Date.now()}-${idx}`,
              prompt: q.prompt || q.question || '',
              type: q.type || 'essay',
              points: q.points || 5,
              topic: q.topic || 'Curriculum Subject',
              options: q.options,
              sampleAnswer: q.sampleAnswer || q.answer,
              explanation: q.explanation,
            })),
            detectedType: 'JSON Exam Schema',
            errors: [],
          };
        } else if (parsedJson && typeof parsedJson === 'object') {
          const rawQuestions = Array.isArray(parsedJson.questions) ? parsedJson.questions : [];
          return {
            questions: rawQuestions.map((q: any, idx: number) => ({
              id: q.id || `q-imported-${Date.now()}-${idx}`,
              prompt: q.prompt || q.question || '',
              type: q.type || 'essay',
              points: q.points || 5,
              topic: q.topic || 'Curriculum Subject',
              options: q.options,
              sampleAnswer: q.sampleAnswer || q.answer,
              explanation: q.explanation,
            })),
            examData: {
              title: parsedJson.title,
              courseCode: parsedJson.courseCode,
              durationMinutes: parsedJson.durationMinutes,
              description: parsedJson.description,
            },
            detectedType: 'JSON Institutional Exam',
            errors: [],
          };
        }
      } catch {
        // Fall back to text parsing if JSON parse fails
      }
    }

    // Try text line-based parsing for question patterns
    const questions = parseExamDocumentQuestions(content);

    // Extract potential title / metadata from first few lines if available
    let extractedTitle: string | undefined;
    let extractedCourseCode: string | undefined;

    const firstLines = content.split(/\r?\n/).slice(0, 5);
    for (const line of firstLines) {
      const codeMatch = line.match(/\b([A-Z]{2,5}[-\s]?\d{3,4})\b/);
      if (codeMatch && !extractedCourseCode) {
        extractedCourseCode = codeMatch[1].replace(' ', '-');
      }
      if (/examination|midterm|final|assessment/i.test(line) && !extractedTitle) {
        extractedTitle = line.replace(/^[#\*\-=\s]+/, '').trim();
      }
    }

    if (questions.length === 0) {
      errors.push(`No recognized questions could be parsed from ${file.name}. Ensure questions are numbered (e.g. "1. Question text").`);
    }

    return {
      questions,
      examData: extractedTitle || extractedCourseCode ? {
        title: extractedTitle,
        courseCode: extractedCourseCode,
      } : undefined,
      detectedType: `${fileType} Document`,
      errors,
    };
  } catch (err: any) {
    return {
      questions: [],
      detectedType: 'Unknown',
      errors: [err.message || 'Failed to parse document'],
    };
  }
}
