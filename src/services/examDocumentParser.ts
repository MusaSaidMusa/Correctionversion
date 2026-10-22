import * as XLSX from 'xlsx';
import { Question, QuestionAnswerMapPair } from '../types';

export interface ComprehensiveParseResult {
  questions: Question[];
  stats: {
    total: number;
    mcq: number;
    essay: number;
    trueFalse: number;
    fillBlank: number;
    totalMarks: number;
    hasMarkingScheme: number;
  };
  warnings: string[];
  errors: string[];
}

export const SAMPLE_UNIFIED_EXAM_TEXT = `1. What is the fundamental property guaranteed by Paxos consensus? [5 marks]
A) Linearizability
B) Byzantine fault tolerance
C) Asynchronous clock skew
D) Eventual consistency
Correct Answer: A
Marking Scheme / Explanation: Paxos guarantees safety through single-decree synod consensus ensuring agreement on a single proposal.

2. True or False: In Raft, candidate nodes can be elected even if their log is missing committed entries from prior terms. [4 marks]
Correct Answer: False
Marking Scheme / Explanation: Raft uses the Election Restriction: a voter rejects a candidate whose log is less up-to-date than its own.

3. Fill in the blank: The CAP theorem states that a distributed data store can simultaneously provide at most two of Consistency, Availability, and ________ tolerance. [3 marks]
Correct Answer: Partition
Marking Scheme / Explanation: Brewer's theorem covers Consistency, Availability, and Partition tolerance.

4. Explain how two-phase locking (2PL) avoids cascading aborts in concurrent transaction execution. [8 marks]
Marking Scheme / Explanation: Strict 2PL requires holding exclusive locks until transaction commit or abort, preventing dirty reads and cascading aborts.

5. Given the distributed state machine replication model:
(a) Define state machine safety. [5 marks]
(b) Explain why deterministic execution is required across all replicas. [5 marks]
Marking Scheme / Explanation: Every non-faulty state machine executes the same sequence of commands and arrives at the same sequence of states.`;

export const SAMPLE_SEPARATE_QUESTIONS_TEXT = `1. Which consensus protocol uses leader election, log replication, and commitment terms? [5 marks]
A) Two-Phase Commit
B) Raft
C) Gossip Protocol
D) Epidemic Dissemination

2. State Eric Brewer's CAP theorem and explain why partition tolerance cannot be sacrificed in WAN networks. [10 marks]

3. In database systems, what is the role of Write-Ahead Logging (WAL) during crash recovery? [10 marks]

4. Explain the difference between optimistic concurrency control (OCC) and pessimistic lock-based protocols. [10 marks]`;

export const SAMPLE_SEPARATE_SCHEME_TEXT = `1. Correct Answer: B (Raft consensus algorithm uses randomized leader election and log terms)
2. In physical networks, network partitions are inevitable. Therefore a distributed system must choose between strict linearizable consistency and continuous availability.
3. WAL ensures atomicity and durability (ACID) by appending log records to persistent disk before flushing modified data pages.
4. Pessimistic concurrency control prevents conflicts by locking resources ahead of time, while OCC permits unrestricted access and checks for serialization violations during validation phase.`;

// Read text from uploaded file (.txt, .md, .csv, .json, .docx, .xlsx)
export async function readUploadedFileText(file: File): Promise<{ content: string; fileType: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    let text = '';
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      text += `--- Sheet: ${sheetName} ---\n`;
      text += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
    });
    return { content: text.trim(), fileType: ext.toUpperCase() };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ content: reader.result, fileType: ext.toUpperCase() || 'TXT' });
      } else {
        resolve({ content: new TextDecoder().decode(reader.result as ArrayBuffer), fileType: ext.toUpperCase() || 'TXT' });
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file content'));
    reader.readAsText(file);
  });
}

export async function parseMultiFormatExamFile(file: File): Promise<{ content: string; questions?: Question[] }> {
  const read = await readUploadedFileText(file);
  const parsed = parseExamDocumentQuestions(read.content);
  return { content: read.content, questions: parsed };
}

// Parses numbered questions from text
export function parseExamDocumentQuestions(text: string): Question[] {
  if (!text || !text.trim()) return [];

  const lines = text.split(/\r?\n/);
  const questions: Question[] = [];
  let currentPrompt = '';
  let currentNumber = 1;
  let currentPoints = 5;
  let currentOptions: { id: string; text: string; isCorrect?: boolean }[] = [];
  let currentCorrectAnswer = '';
  let currentSampleAnswer = '';
  let currentType = 'essay';

  const flushQuestion = () => {
    if (!currentPrompt.trim()) return;

    // Detect question type
    if (currentOptions.length >= 2) {
      currentType = 'multiple_choice';
    } else if (/\btrue\s+or\s+false\b/i.test(currentPrompt)) {
      currentType = 'true_false';
    } else if (/\bfill\s+in\s+the\s+blank\b/i.test(currentPrompt)) {
      currentType = 'fill_blank';
    }

    questions.push({
      id: `q-doc-${Date.now()}-${questions.length + 1}-${Math.random().toString(36).substring(2, 6)}`,
      prompt: currentPrompt.trim(),
      points: currentPoints,
      type: currentType,
      topic: 'Curriculum Subject',
      options: currentOptions.length > 0 ? currentOptions : undefined,
      correctAnswers: currentCorrectAnswer ? [currentCorrectAnswer] : undefined,
      sampleAnswer: currentSampleAnswer || currentCorrectAnswer || undefined,
      explanation: currentSampleAnswer || undefined,
    });

    currentPrompt = '';
    currentPoints = 5;
    currentOptions = [];
    currentCorrectAnswer = '';
    currentSampleAnswer = '';
    currentType = 'essay';
  };

  const questionStartRegex = /^(?:Question\s+)?(\d+)[\.\:\)]\s*(.*)/i;
  const marksRegex = /\[(\d+)\s*(?:marks?|pts?|points?)\]/i;
  const optionRegex = /^([A-D])[\.\:\)]\s*(.*)/i;
  const answerRegex = /^(?:Correct\s+Answer|Answer|Ans)[\:\-]?\s*(.*)/i;
  const schemeRegex = /^(?:Marking\s+Scheme|Scheme|Explanation)[\:\-]?\s*(.*)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const qMatch = trimmed.match(questionStartRegex);
    if (qMatch) {
      flushQuestion();
      currentNumber = parseInt(qMatch[1], 10);
      let content = qMatch[2];
      const mMatch = content.match(marksRegex);
      if (mMatch) {
        currentPoints = parseInt(mMatch[1], 10);
        content = content.replace(marksRegex, '').trim();
      }
      currentPrompt = content;
      continue;
    }

    const optMatch = trimmed.match(optionRegex);
    if (optMatch && currentPrompt) {
      currentOptions.push({
        id: optMatch[1].toUpperCase(),
        text: optMatch[2].trim(),
      });
      continue;
    }

    const ansMatch = trimmed.match(answerRegex);
    if (ansMatch && currentPrompt) {
      currentCorrectAnswer = ansMatch[1].trim();
      // Match option letter if applicable
      const letter = currentCorrectAnswer.charAt(0).toUpperCase();
      currentOptions = currentOptions.map((opt) => ({
        ...opt,
        isCorrect: opt.id === letter,
      }));
      continue;
    }

    const schemeMatch = trimmed.match(schemeRegex);
    if (schemeMatch && currentPrompt) {
      currentSampleAnswer = schemeMatch[1].trim();
      continue;
    }

    // Accumulate into current prompt
    if (currentPrompt) {
      currentPrompt += '\n' + trimmed;
    }
  }

  flushQuestion();
  return questions;
}

// Parses answer keys or marking schemes into a map of questionIndex -> answer/scheme
export function parseAnswerKeySheet(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!text || !text.trim()) return result;

  const lines = text.split(/\r?\n/);
  const keyRegex = /^(?:Question\s+)?(\d+)[\.\:\)]\s*(.*)/i;
  let currentKey = '';
  let currentContent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(keyRegex);
    if (match) {
      if (currentKey) {
        result[currentKey] = currentContent.trim();
      }
      currentKey = match[1];
      currentContent = match[2];
    } else if (currentKey) {
      currentContent += ' ' + trimmed;
    }
  }

  if (currentKey) {
    result[currentKey] = currentContent.trim();
  }

  return result;
}

export async function parseExcelAnswerSheet(fileOrBuffer: any): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    let workbook: XLSX.WorkBook;
    if (fileOrBuffer instanceof ArrayBuffer) {
      workbook = XLSX.read(fileOrBuffer, { type: 'array' });
    } else {
      const buf = await fileOrBuffer.arrayBuffer();
      workbook = XLSX.read(buf, { type: 'array' });
    }
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(firstSheet, { header: 1 });
    rows.forEach((row, idx) => {
      if (Array.isArray(row) && row.length >= 2) {
        const qNum = String(row[0]).replace(/\D/g, '') || String(idx + 1);
        map[qNum] = String(row[1]);
      }
    });
  } catch (e) {
    console.error('Failed to parse Excel answer sheet', e);
  }
  return map;
}

// Map parsed questions and marking keys together
export function mapExamAndAnswerSheet(
  questions: Question[],
  answerKeys: Record<string, string>,
  defaultTopic = 'Curriculum Subject'
): { mappedPairs: QuestionAnswerMapPair[]; errors: string[] } {
  const mappedPairs: QuestionAnswerMapPair[] = [];
  const errors: string[] = [];

  questions.forEach((q, idx) => {
    const key = String(idx + 1);
    const answer = answerKeys[key] || answerKeys[String(idx)] || q.sampleAnswer || '';

    mappedPairs.push({
      questionIndex: idx + 1,
      prompt: q.prompt,
      type: q.type,
      points: q.points || 5,
      topic: q.topic || defaultTopic,
      options: q.options,
      sampleAnswer: answer,
      correctAnswer: q.correctAnswers?.[0] || answer,
      explanation: answer,
      matched: Boolean(answer),
    });
  });

  return { mappedPairs, errors };
}

export function convertMappedPairsToQuestions(mappedPairs: QuestionAnswerMapPair[]): Question[] {
  return mappedPairs.map((pair, idx) => ({
    id: `q-mapped-${Date.now()}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
    prompt: pair.prompt,
    points: pair.points || 5,
    type: pair.type || 'essay',
    topic: pair.topic || 'Curriculum Subject',
    options: pair.options,
    correctAnswers: pair.correctAnswer ? [pair.correctAnswer] : undefined,
    sampleAnswer: pair.sampleAnswer || pair.correctAnswer || undefined,
    explanation: pair.explanation || pair.sampleAnswer || undefined,
  }));
}

export function parseComprehensiveExamContent(
  qText: string,
  schemeText?: string,
  defaultTopic = 'Curriculum Subject'
): ComprehensiveParseResult {
  const questions = parseExamDocumentQuestions(qText);
  const schemeKeys = schemeText?.trim() ? parseAnswerKeySheet(schemeText) : {};

  // If separate scheme provided, merge
  questions.forEach((q, idx) => {
    const key = String(idx + 1);
    if (schemeKeys[key] && !q.sampleAnswer) {
      q.sampleAnswer = schemeKeys[key];
      q.explanation = schemeKeys[key];
    }
  });

  let mcq = 0;
  let essay = 0;
  let trueFalse = 0;
  let fillBlank = 0;
  let totalMarks = 0;
  let hasMarkingScheme = 0;

  questions.forEach((q) => {
    totalMarks += q.points || 0;
    if (q.sampleAnswer) hasMarkingScheme++;
    if (q.type === 'multiple_choice' || q.type === 'single_choice') mcq++;
    else if (q.type === 'true_false') trueFalse++;
    else if (q.type === 'fill_blank') fillBlank++;
    else essay++;
  });

  return {
    questions,
    stats: {
      total: questions.length,
      mcq,
      essay,
      trueFalse,
      fillBlank,
      totalMarks,
      hasMarkingScheme,
    },
    warnings: questions.length === 0 ? ['No questions found. Check numbering format.'] : [],
    errors: [],
  };
}

export function downloadSampleExamDocument(): void {
  const blob = new Blob([SAMPLE_UNIFIED_EXAM_TEXT], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sample_Examination_Paper.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSampleAnswerKeySheet(): void {
  const blob = new Blob([SAMPLE_SEPARATE_SCHEME_TEXT], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Sample_Marking_Scheme.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
