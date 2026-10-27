import React, { useState } from 'react';
import {
  X,
  Eye,
  Shuffle,
  Shield,
  Clock,
  Key,
  Layers,
  CheckCircle,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  Lock,
  Camera,
  Mic,
  FileSpreadsheet,
  FileText,
  Upload,
  Sparkles,
  Link,
  ShieldAlert,
  Building2,
  Printer,
  FileCheck,
  ClipboardPaste,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Image as ImageIcon,
  FileImage,
} from 'lucide-react';
import {
  Exam,
  Question,
  QuestionType,
  ExamRule,
  DifficultyLevel,
  AnswerSheetConfig,
  SEBConfig,
  SecurityProtocols,
  QuestionAnswerMapPair,
  TeacherProfile,
  ImageTransform,
} from '../../types';
import { generateBrowserExamKey, downloadSebConfigFile } from '../../services/sebService';
import {
  parseExamDocumentQuestions,
  parseAnswerKeySheet,
  parseExcelAnswerSheet,
  mapExamAndAnswerSheet,
  convertMappedPairsToQuestions,
  downloadSampleExamDocument,
  downloadSampleAnswerKeySheet,
  parseMultiFormatExamFile,
  parseComprehensiveExamContent,
  readUploadedFileText,
  SAMPLE_UNIFIED_EXAM_TEXT,
  SAMPLE_SEPARATE_QUESTIONS_TEXT,
  SAMPLE_SEPARATE_SCHEME_TEXT,
  ComprehensiveParseResult,
} from '../../services/examDocumentParser';
import { parseUniversalExamDocument } from '../../services/universalDocumentService';
import { getDepartmentForFaculty, getStoredFaculties } from '../../services/facultyResolutionService';
import { ExaminationPaperModal } from '../common/ExaminationPaperModal';
import { OfficialMarkingSchemeModal } from '../common/OfficialMarkingSchemeModal';
import { MathRenderer, DiagramAttachmentField, TechnicalDiagram } from '../common/QuestionMedia';
import { PromptedQuestionBatchBuilder } from './PromptedQuestionBatchBuilder';

// Format date safely for HTML input type="datetime-local" (YYYY-MM-DDTHH:mm)
const toDatetimeLocal = (val?: string, defaultOffsetHours = 1): string => {
  try {
    const d = val ? new Date(val) : new Date(Date.now() + defaultOffsetHours * 3600 * 1000);
    if (isNaN(d.getTime())) {
      return new Date(Date.now() + defaultOffsetHours * 3600 * 1000).toISOString().slice(0, 16);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return new Date(Date.now() + defaultOffsetHours * 3600 * 1000).toISOString().slice(0, 16);
  }
};

// Ensure ISO string output never throws RangeError: Invalid time value
const safeIso = (dateStr: string, fallbackOffsetHours: number): string => {
  try {
    if (!dateStr || !dateStr.trim()) {
      return new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString();
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString();
    }
    return d.toISOString();
  } catch {
    return new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString();
  }
};

interface ExamCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExam: (exam: Exam) => void;
  questionBank: Question[];
  existingExam?: Exam | null;
  currentTeacher?: TeacherProfile;
}

export const ExamCreatorModal: React.FC<ExamCreatorModalProps> = ({
  isOpen,
  onClose,
  onSaveExam,
  questionBank,
  existingExam,
  currentTeacher,
}) => {
  const isLocked = existingExam?.isLockedForEdits ?? false;

  const [title, setTitle] = useState(existingExam?.title || '');
  const [courseCode, setCourseCode] = useState(existingExam?.courseCode || 'CS-405');
  const [courseTitle, setCourseTitle] = useState(existingExam?.courseTitle || 'Network Security & Protocol Forensics');
  const [faculty, setFaculty] = useState<string>(
    currentTeacher?.faculty || existingExam?.faculty || 'Faculty of Computing & Information Technologies'
  );
  const [facultyCode, setFacultyCode] = useState(
    existingExam?.facultyCode ||
      (currentTeacher?.faculty || existingExam?.faculty || 'Faculty of Computing & Information Technologies')
        .replace(/^Faculty of /i, '')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
  );
  const [department, setDepartment] = useState<string>(
    currentTeacher?.department || existingExam?.department || 'Computer Science & Software Engineering'
  );
  const [location, setLocation] = useState(existingExam?.location || '');
  const [roomNumber, setRoomNumber] = useState(existingExam?.roomNumber || '');
  const [description, setDescription] = useState(existingExam?.description || '');
  const [durationMinutes, setDurationMinutes] = useState(existingExam?.durationMinutes || 60);

  // Default times: Start in 1 hour, end in 8 hours (properly formatted for datetime-local)
  const [startTime, setStartTime] = useState(() =>
    toDatetimeLocal(existingExam?.scheduledStartTime, 1)
  );
  const [endTime, setEndTime] = useState(() =>
    toDatetimeLocal(existingExam?.scheduledEndTime, 8)
  );
  const [accessPassword, setAccessPassword] = useState(existingExam?.accessPassword || '');
  const [shuffleQuestions, setShuffleQuestions] = useState(existingExam?.shuffleQuestions ?? true);
  const [shuffleOptions, setShuffleOptions] = useState(existingExam?.shuffleOptions ?? true);
  const [shuffleMode, setShuffleMode] = useState<'full_random' | 'by_topic' | 'none'>(
    existingExam?.shuffleMode === 'random'
      ? 'full_random'
      : (existingExam?.shuffleMode as 'full_random' | 'by_topic' | 'none') ||
        (existingExam?.shuffleQuestions === false ? 'none' : 'full_random')
  );
  const [questionBehavior, setQuestionBehavior] = useState<'free_navigation' | 'sequential_only'>(
    (existingExam?.questionBehavior as 'free_navigation' | 'sequential_only') || 'free_navigation'
  );
  const [maxAttempts, setMaxAttempts] = useState<number>(existingExam?.maxAttempts ?? 1);
  const [passingScorePercentage, setPassingScorePercentage] = useState(
    existingExam?.passingScorePercentage || 60
  );

  // Document Import state & Feedback
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const [docImportMessage, setDocImportMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [markingSchemeText, setMarkingSchemeText] = useState('');
  const [markingSchemeFileName, setMarkingSchemeFileName] = useState('');

  // Mandatory Security Protocols configured by Teacher
  const [securityProtocols, setSecurityProtocols] = useState<SecurityProtocols>({
    requireCamera: true,
    requireMicrophone: true,
    requireSEB: true,
    blockVirtualMachine: true,
    ...(existingExam?.securityProtocols || {}),
  });

  // Selected questions
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>(
    existingExam?.questions || []
  );

  // Generation mode: 'prompt_sequential' | 'create_custom'
  const [selectionMode, setSelectionMode] = useState<'prompt_sequential' | 'create_custom'>('prompt_sequential');

  // Custom Question Form State
  const [customPrompt, setCustomPrompt] = useState('');
  const [customType, setCustomType] = useState<QuestionType>('essay');
  const [customTopic, setCustomTopic] = useState('Core Subject');
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyLevel>('medium');
  const [customPoints, setCustomPoints] = useState(5);
  const [customSampleAnswer, setCustomSampleAnswer] = useState('');
  const [customExplanation, setCustomExplanation] = useState('');
  const [customSubQuestionText, setCustomSubQuestionText] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState<string | undefined>(undefined);
  const [customImageCaption, setCustomImageCaption] = useState<string>('');
  const [customImageTransform, setCustomImageTransform] = useState<ImageTransform | undefined>(undefined);

  // Diagram Attachment Editor Modal State (available for any question across all Question Matrix tabs)
  const [diagramModalTargetQuestion, setDiagramModalTargetQuestion] = useState<Question | null>(null);
  const [diagramModalDraftUrl, setDiagramModalDraftUrl] = useState<string | undefined>(undefined);
  const [diagramModalDraftCaption, setDiagramModalDraftCaption] = useState<string>('');
  const [diagramModalDraftTransform, setDiagramModalDraftTransform] = useState<ImageTransform | undefined>(undefined);

  const handleOpenDiagramModal = (question: Question) => {
    setDiagramModalTargetQuestion(question);
    setDiagramModalDraftUrl(question.imageUrl);
    setDiagramModalDraftCaption(question.imageCaption || '');
    setDiagramModalDraftTransform(question.imageTransform);
  };

  const handleSaveDiagramToQuestion = () => {
    if (!diagramModalTargetQuestion) return;
    const targetId = diagramModalTargetQuestion.id;
    const newImageUrl = diagramModalDraftUrl;
    const newCaption = diagramModalDraftCaption.trim() || undefined;
    const newTransform = diagramModalDraftTransform;

    setSelectedQuestions((prev) =>
      prev.map((q) =>
        q.id === targetId ? { ...q, imageUrl: newImageUrl, imageCaption: newCaption, imageTransform: newTransform } : q
      )
    );

    setDiagramModalTargetQuestion(null);
  };

  const handleAddCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    const subQuestions = customSubQuestionText
      .split(/\r?\n/)
      .map((prompt, index) => ({ id: `part-${Date.now()}-${index}`, prompt: prompt.trim() }))
      .filter((part) => part.prompt);

    const newQ: Question = {
      id: `q-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: customType,
      topic: customTopic.trim() || 'Core Curriculum',
      difficulty: customDifficulty,
      prompt: customPrompt.trim(),
      points: Number(customPoints) || 5,
      subQuestions: customType === 'sub_question' ? subQuestions : undefined,
      sampleAnswer: customSampleAnswer.trim() || undefined,
      explanation: customExplanation.trim() || undefined,
      imageUrl: customImageUrl,
      imageCaption: customImageCaption.trim() || undefined,
      imageTransform: customImageTransform,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSelectedQuestions((prev) => {
      const next = [...prev, newQ];
      setTargetQuestionCount(next.length);
      return next;
    });
    setCustomPrompt('');
    setCustomSampleAnswer('');
    setCustomExplanation('');
    setCustomSubQuestionText('');
    setCustomImageUrl(undefined);
    setCustomImageCaption('');
    setCustomImageTransform(undefined);
  };

  // Rule-based generation rules
  const [rules, setRules] = useState<ExamRule[]>(
    existingExam?.rules || [
      { id: 'r1', topic: 'Network Security', difficulty: 'easy', count: 2 },
      { id: 'r2', topic: 'Network Security', difficulty: 'medium', count: 2 },
      { id: 'r3', topic: 'Algorithms', difficulty: 'hard', count: 1 },
    ]
  );

  // SEB Config
  const [sebConfig, setSebConfig] = useState<SEBConfig>(
    existingExam?.sebConfig || {
      enabled: true,
      strictLockMode: true,
      browserExamKey: generateBrowserExamKey(),
      configKey: generateBrowserExamKey().substring(0, 32),
      allowQuitSEB: false,
      detectVirtualMachine: true,
    }
  );

  // Answer Sheet Setting & Formatting
  const [answerSheetConfig, setAnswerSheetConfig] = useState<AnswerSheetConfig>(
    existingExam?.answerSheetConfig || {
      layout: 'standard',
      allowNegativeMarking: true,
      negativeMarkRatio: 0.25,
      allowReviewAfterSubmission: true,
      showExplanations: true,
    }
  );

  const [activeTab, setActiveTab] = useState<'basics' | 'questions' | 'security' | 'answer_sheet'>('basics');
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);

  // Specified number of questions required for this examination (publishing allowed only when exact quota is entered)
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(() => {
    if (existingExam?.questions?.length && existingExam.questions.length > 0) {
      return existingExam.questions.length;
    }
    return 5;
  });

  // Auto-Map & Paste State
  const [pasteMode, setPasteMode] = useState<'unified' | 'separate'>('unified');
  const [examDocText, setExamDocText] = useState('');
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [mappedPairs, setMappedPairs] = useState<QuestionAnswerMapPair[]>([]);
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [mappingAppliedSuccess, setMappingAppliedSuccess] = useState(false);
  const [isPreviewPaperOpen, setIsPreviewPaperOpen] = useState(false);
  const [isPreviewSchemeOpen, setIsPreviewSchemeOpen] = useState(false);
  const [isPublishPreviewOpen, setIsPublishPreviewOpen] = useState(false);
  const [parseStats, setParseStats] = useState<{
    total: number;
    mcq: number;
    essay: number;
    trueFalse: number;
    fillBlank: number;
    totalMarks: number;
    hasMarkingScheme: number;
  } | null>(null);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  if (!isOpen) return null;

  const topics = Array.from(new Set(questionBank.map((q) => q.topic))).filter(Boolean);

  // Dynamic Comprehensive Parser Trigger
  const triggerComprehensiveParse = (
    qText: string,
    schemeText: string,
    mode: 'unified' | 'separate'
  ) => {
    if (!qText.trim()) {
      setSelectedQuestions([]);
      setMappedPairs([]);
      setParseStats(null);
      setMappingErrors([]);
      setParseWarnings([]);
      return;
    }

    const result = parseComprehensiveExamContent(
      qText,
      mode === 'separate' ? schemeText : undefined,
      courseTitle || title || 'Curriculum Subject'
    );

    if (result.questions.length > 0) {
      setSelectedQuestions(result.questions);
      setTargetQuestionCount(result.questions.length);
      setParseStats(result.stats);
      setParseWarnings(result.warnings);
      setMappingErrors(result.errors);
      setMappingAppliedSuccess(true);
      setDocImportMessage({
        text: `Dynamically populated ${result.questions.length} questions into official examination paper (${result.stats.totalMarks} Total Marks).`,
        isError: false,
      });

      const autoPairs: QuestionAnswerMapPair[] = result.questions.map((q: Question, idx: number) => ({
        questionIndex: idx + 1,
        prompt: q.prompt,
        type: q.type,
        points: q.points,
        topic: q.topic || 'Curriculum Subject',
        explanation: q.explanation || 'Extracted directly from examination paper document.',
      }));
      setMappedPairs(autoPairs);
    } else if (result.errors.length > 0) {
      setSelectedQuestions([]);
      setMappedPairs([]);
      setParseStats(result.stats);
      setParseWarnings(result.warnings);
      setMappingErrors(result.errors);
    }
  };

  const handleQuestionsTextChange = (text: string) => {
    setExamDocText(text);
    triggerComprehensiveParse(text, answerKeyText, pasteMode);
  };

  const handleSchemeTextChange = (text: string) => {
    setAnswerKeyText(text);
    triggerComprehensiveParse(examDocText, text, 'separate');
  };

  const handleUploadQuestionsFile = async (file: File) => {
    setIsImportingDoc(true);
    setDocImportMessage(null);
    try {
      const read = await readUploadedFileText(file);
      setExamDocText(read.content);
      triggerComprehensiveParse(read.content, answerKeyText, pasteMode);
      setDocImportMessage({
        text: `Uploaded "${file.name}" (${read.fileType}). Populated questions dynamically into examination!`,
        isError: false,
      });
    } catch (e: any) {
      setDocImportMessage({ text: `Failed to read document: ${e.message}`, isError: true });
    } finally {
      setIsImportingDoc(false);
    }
  };

  const handleUploadSchemeFile = async (file: File) => {
    setIsImportingDoc(true);
    setDocImportMessage(null);
    try {
      const read = await readUploadedFileText(file);
      setAnswerKeyText(read.content);
      setPasteMode('separate');
      triggerComprehensiveParse(examDocText, read.content, 'separate');
      setDocImportMessage({
        text: `Uploaded marking scheme "${file.name}". Questions and schemes dynamically mapped!`,
        isError: false,
      });
    } catch (e: any) {
      setDocImportMessage({ text: `Failed to read marking scheme: ${e.message}`, isError: true });
    } finally {
      setIsImportingDoc(false);
    }
  };

  const handleLoadSampleExam = () => {
    if (pasteMode === 'unified') {
      setExamDocText(SAMPLE_UNIFIED_EXAM_TEXT);
      triggerComprehensiveParse(SAMPLE_UNIFIED_EXAM_TEXT, '', 'unified');
    } else {
      setExamDocText(SAMPLE_SEPARATE_QUESTIONS_TEXT);
      setAnswerKeyText(SAMPLE_SEPARATE_SCHEME_TEXT);
      triggerComprehensiveParse(SAMPLE_SEPARATE_QUESTIONS_TEXT, SAMPLE_SEPARATE_SCHEME_TEXT, 'separate');
    }
  };

  const handleClearExamText = () => {
    setExamDocText('');
    setAnswerKeyText('');
    setSelectedQuestions([]);
    setMappedPairs([]);
    setParseStats(null);
    setMappingErrors([]);
    setParseWarnings([]);
    setDocImportMessage(null);
  };

  // Execute Rule-Based Generation
  const handleApplyRules = () => {
    if (isLocked) return;

    let picked: Question[] = [];
    const usedIds = new Set<string>();

    rules.forEach((rule) => {
      const matching = questionBank.filter(
        (q) =>
          Boolean(q.topic && q.topic.toLowerCase() === rule.topic.toLowerCase()) &&
          q.difficulty === rule.difficulty &&
          !usedIds.has(q.id)
      );

      // Shuffle matching pool
      const pool = [...matching].sort(() => 0.5 - Math.random());
      const selected = pool.slice(0, rule.count);
      selected.forEach((q) => {
        usedIds.add(q.id);
        picked.push(q);
      });
    });

    if (picked.length === 0) {
      picked = questionBank.slice(0, 5);
      setRuleMessage('Selected 5 general questions from bank matching available pool.');
    } else {
      setRuleMessage(`Successfully generated ${picked.length} questions conforming to your curriculum rules.`);
    }

    setSelectedQuestions(picked);
    setTargetQuestionCount(picked.length);
  };

  const handleToggleQuestion = (q: Question) => {
    if (isLocked) return;
    if (selectedQuestions.some((item) => item.id === q.id)) {
      const filtered = selectedQuestions.filter((item) => item.id !== q.id);
      setSelectedQuestions(filtered);
      setTargetQuestionCount(Math.max(1, filtered.length));
    } else {
      const added = [...selectedQuestions, q];
      setSelectedQuestions(added);
      setTargetQuestionCount(added.length);
    }
  };

  const handleAddRule = () => {
    if (isLocked) return;
    setRules([
      ...rules,
      {
        id: `r-${Date.now()}`,
        topic: topics[0] || 'General',
        difficulty: 'medium',
        count: 2,
      },
    ]);
  };

  const handleRemoveRule = (id: string) => {
    if (isLocked) return;
    setRules(rules.filter((r) => r.id !== id));
  };

  // Direct Universal Document Importer: Extracts questions and populates official exam paper
  const handleImportQuestionDocument = async (file: File) => {
    setIsImportingDoc(true);
    setDocImportMessage(null);
    setMappingErrors([]);

    try {
      const result = await parseUniversalExamDocument(file);
      const cleanQuestions = result.questions;
      if (cleanQuestions && cleanQuestions.length > 0) {
        setSelectedQuestions(cleanQuestions);
        setTargetQuestionCount(cleanQuestions.length);

        if (result.examData) {
          if (result.examData.title && !title) setTitle(result.examData.title);
          if (result.examData.courseCode && (!courseCode || courseCode === 'CS-405')) setCourseCode(result.examData.courseCode);
          if (result.examData.durationMinutes) setDurationMinutes(result.examData.durationMinutes);
          if (result.examData.description && !description) setDescription(result.examData.description);
        } else if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        }

        const multiFormat = await parseMultiFormatExamFile(file).catch(() => null);
        if (multiFormat?.content) {
          setExamDocText(multiFormat.content);
        }

        const autoPairs: QuestionAnswerMapPair[] = cleanQuestions.map((q: Question, idx: number) => ({
          questionIndex: idx + 1,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          topic: q.topic || 'Curriculum Subject',
          explanation: q.explanation || 'Extracted directly from examination paper document.',
        }));
        setMappedPairs(autoPairs);
        setMappingAppliedSuccess(true);

        setDocImportMessage({
          text: `Successfully extracted ${cleanQuestions.length} questions from "${file.name}" (${result.detectedType}). The official examination paper is now populated dynamically with all imported questions.`,
          isError: false,
        });
        setActiveTab('questions');
      } else {
        setDocImportMessage({
          text: result.errors[0] || `No supported questions could be extracted from "${file.name}". Ensure the document contains numbered questions and marks.`,
          isError: true,
        });
      }
    } catch (err: any) {
      setDocImportMessage({
        text: `Error parsing document: ${err.message || 'Unable to parse file.'}`,
        isError: true,
      });
    } finally {
      setIsImportingDoc(false);
    }
  };

  // Handle Auto-Mapping between Exam Doc and Answer Key Sheet
  const handleProcessAutoMap = () => {
    if (!examDocText.trim()) {
      setMappingErrors(['Please provide or paste the examination questions document text.']);
      return;
    }

    const parsedQuestions = parseExamDocumentQuestions(examDocText);
    if (parsedQuestions.length === 0) {
      setMappingErrors([
        'Could not detect numbered questions in the provided text. Ensure questions start with numbers like "1.", "2.", "Question 1:", etc.',
      ]);
      return;
    }

    const parsedKeys = answerKeyText.trim() ? parseAnswerKeySheet(answerKeyText) : {};
    const result = mapExamAndAnswerSheet(parsedQuestions, parsedKeys, title || 'Course Examination');

    setMappedPairs(result.mappedPairs);
    setMappingErrors(result.errors);

    // DIRECTLY APPLY extracted questions to official paper!
    const newQuestions = convertMappedPairsToQuestions(result.mappedPairs);
    if (newQuestions.length > 0) {
      setSelectedQuestions(newQuestions);
      setTargetQuestionCount(newQuestions.length);
      setMappingAppliedSuccess(true);
      setDocImportMessage({
        text: `Successfully extracted and loaded ${newQuestions.length} questions into official examination paper!`,
        isError: false,
      });
    }
  };

  const handleApplyMappedQuestions = () => {
    if (mappedPairs.length === 0) return;
    const newQuestions = convertMappedPairsToQuestions(mappedPairs);
    setSelectedQuestions(newQuestions);
    setTargetQuestionCount(newQuestions.length);
    setMappingAppliedSuccess(true);
    setTimeout(() => setMappingAppliedSuccess(false), 3000);
  };

  const isAllPredefinedQuestionsSet =
    targetQuestionCount > 0 &&
    selectedQuestions.length === targetQuestionCount &&
    selectedQuestions.every(
      (question) =>
        String(question.prompt || '').trim().length > 0 &&
        Number.isFinite(Number(question.points)) &&
        Number(question.points) > 0
    );

  // Prepare the question set and show its marks for a final review before publishing.
  const handleSave = () => {
    setValidationError(null);

    // Form validations with immediate user feedback
    if (!title.trim()) {
      setValidationError('Examination Title is required. Please specify a title to publish the examination.');
      setActiveTab('basics');
      return;
    }

    if (!courseCode.trim()) {
      setValidationError('Course Code is required (e.g. CS-405).');
      setActiveTab('basics');
      return;
    }

    if (selectedQuestions.length === 0) {
      setValidationError('Add or prompt questions before reviewing and publishing.');
      setActiveTab('questions');
      return;
    }

    if (selectedQuestions.length !== targetQuestionCount) {
      setValidationError(
        `Publishing is activated only when all ${targetQuestionCount} predefined questions are set. Currently ${selectedQuestions.length} of ${targetQuestionCount} questions are set.`
      );
      setActiveTab('questions');
      return;
    }

    const incompleteQuestion = selectedQuestions.find(
      (question) =>
        !String(question.prompt || '').trim() ||
        !Number.isFinite(Number(question.points)) ||
        Number(question.points) <= 0
    );
    if (incompleteQuestion) {
      setValidationError(
        'Every question requires a problem prompt statement and a mark allocation greater than zero before publishing.'
      );
      setActiveTab('questions');
      return;
    }

    setIsPublishPreviewOpen(true);
  };

  const handleConfirmPublish = () => {
    if (!isAllPredefinedQuestionsSet) {
      setValidationError(
        `Publishing is only permitted when all ${targetQuestionCount} predefined questions are fully set.`
      );
      setIsPublishPreviewOpen(false);
      setActiveTab('questions');
      return;
    }

    const exam: Exam = {
      id: existingExam?.id || `exam-${Date.now()}`,
      title: title.trim(),
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim() || 'Curriculum Subject',
      instructorName: existingExam?.instructorName || currentTeacher?.name || 'Prof. Evelyn Vance',
      instructorEmail: existingExam?.instructorEmail || currentTeacher?.email || 'e.vance@university.edu',
      faculty: faculty.trim() || currentTeacher?.faculty || existingExam?.faculty || 'Faculty of Computing & Information Technologies',
      facultyCode: facultyCode.trim().toUpperCase(),
      department: department.trim() || currentTeacher?.department || existingExam?.department || 'Computer Science & Software Engineering',
      location: location.trim(),
      roomNumber: roomNumber.trim(),
      description: description.trim(),
      durationMinutes: Math.max(10, Number(durationMinutes) || 60),
      scheduledStartTime: safeIso(startTime, 1),
      scheduledEndTime: safeIso(endTime, 8),
      accessPassword: accessPassword.trim() || undefined,
      status: existingExam?.status || 'active',
      questions: selectedQuestions,
      rules,
      shuffleQuestions,
      shuffleOptions,
      shuffleMode,
      questionBehavior,
      maxAttempts: Math.max(1, Number(maxAttempts) || 1),
      passingScorePercentage: Math.max(1, Number(passingScorePercentage) || 50),
      securityProtocols,
      sebConfig: {
        ...sebConfig,
        enabled: securityProtocols.requireSEB,
      },
      answerSheetConfig,
      isMarkingSchemeReleased: existingExam?.isMarkingSchemeReleased ?? false,
      registeredStudentIds: existingExam?.registeredStudentIds || [],
      admittedStudentIds: existingExam?.admittedStudentIds || [],
      isLockedForEdits: isLocked,
      createdAt: existingExam?.createdAt || new Date().toISOString(),
    };

    onSaveExam(exam);
    setIsPublishPreviewOpen(false);
    onClose();
  };

  const previewExam: Exam = {
    id: existingExam?.id || `preview-exam-${Date.now()}`,
    title: title.trim() || 'Comprehensive Examination Paper',
    courseCode: courseCode.trim().toUpperCase() || 'EXAM-101',
    courseTitle: courseTitle.trim() || 'Curriculum Subject Assessment',
    instructorName: currentTeacher?.name || existingExam?.instructorName || 'Chief Academic Invigilator',
    instructorEmail: currentTeacher?.email || existingExam?.instructorEmail || 'e.vance@university.edu',
    faculty: faculty.trim() || currentTeacher?.faculty || existingExam?.faculty || 'Faculty of Computing & Information Technologies',
    facultyCode: facultyCode.trim().toUpperCase(),
    department: department.trim() || currentTeacher?.department || existingExam?.department || 'Computer Science & Software Engineering',
    location: location.trim(),
    roomNumber: roomNumber.trim(),
    description: description.trim() || 'Academic examination paper.',
    durationMinutes: Math.max(10, Number(durationMinutes) || 60),
    scheduledStartTime: safeIso(startTime, 1),
    scheduledEndTime: safeIso(endTime, 8),
    accessPassword: accessPassword.trim() || undefined,
    status: existingExam?.status || 'active',
    questions: selectedQuestions,
    rules,
    shuffleQuestions,
    shuffleOptions,
    maxAttempts: Math.max(1, Number(maxAttempts) || 1),
    passingScorePercentage: Math.max(1, Number(passingScorePercentage) || 50),
    securityProtocols,
    sebConfig,
    answerSheetConfig,
    registeredStudentIds: existingExam?.registeredStudentIds || [],
    admittedStudentIds: existingExam?.admittedStudentIds || [],
    isMarkingSchemeReleased: true,
    isLockedForEdits: isLocked,
    createdAt: existingExam?.createdAt || new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
              <span>
                {currentTeacher?.faculty || existingExam?.faculty || 'Faculty of Computing & Information Technologies'} · Examination Setup
              </span>
              {isLocked && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Exam Commenced (Questions Locked)
                  </span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {existingExam ? `Configure: ${existingExam.title}` : 'Schedule And Create Examination'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-6 text-xs font-medium shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('basics')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'basics'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Schedules & Timetable
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Questions & Answers Matrix ({selectedQuestions.length}) {isLocked ? '🔒' : ''}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Mandatory Security Protocols (Camera/Mic/SEB)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answer_sheet')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'answer_sheet'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Answer Sheet Layout & Grading
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* TAB 1: Basics & Timetable */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Examination Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Midterm Assessment: Network Security"
                    className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Course Code</label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. CS-405"
                      className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Questions to Set</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={targetQuestionCount}
                      disabled={isLocked}
                      onChange={(e) => setTargetQuestionCount(Math.max(1, Number(e.target.value)))}
                      className="w-full p-2.5 border-2 border-indigo-300 rounded bg-indigo-50/70 text-xs font-mono font-bold text-indigo-950 focus:ring-1 focus:ring-indigo-500"
                      title="Specified number of questions: publishing is only allowed once all specified questions are entered"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Max Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description & Student Instructions</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions displayed to students before starting..."
                  className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs"
                />
              </div>

              {/* Faculty & Department Information Capture */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-700" />
                    <span className="font-bold text-slate-900 text-xs">
                      Faculty & Department Information Capture
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-800 font-semibold bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-300">
                    Examination created by Lecturer: {currentTeacher?.name || 'Assigned Faculty'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Academic Faculty
                    </label>
                    <select
                      value={faculty}
                      onChange={(e) => {
                        const newFac = e.target.value;
                        setFaculty(newFac);
                        setDepartment(getDepartmentForFaculty(newFac, courseCode));
                        setFacultyCode(
                          newFac
                            .replace(/^Faculty of /i, '')
                            .split(/[^A-Za-z0-9]+/)
                            .filter(Boolean)
                            .map((word) => word[0])
                            .join('')
                            .toUpperCase()
                        );
                      }}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      {getStoredFaculties().map((faculty) => (
                        <option key={faculty.name} value={faculty.name}>
                          {faculty.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Academic Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Software Engineering"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Faculty Code</label>
                    <input
                      type="text"
                      value={facultyCode}
                      onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CIT"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Examination Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Main Campus"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. B-204"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 italic">
                  Dynamic binding: Automatically mapped onto official examination papers, marking schemes, and candidate answer scripts in Times New Roman 12pt format.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Strict Start Window</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Strict Deadline / End Window</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Invigilator Password Protection
                  </label>
                  <input
                    type="text"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Leave empty for open access or enter passcode (e.g. SECURE-2026)"
                    className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Passing Threshold Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={passingScorePercentage}
                    onChange={(e) => setPassingScorePercentage(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded bg-slate-50 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Question Shuffling Mechanisms & Navigation Behavior Controls */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Shuffle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-indigo-950">Question Shuffling & Progression Behavior</h4>
                      <p className="text-[11px] text-indigo-700">Configure how questions are randomized and how candidates can navigate during the exam.</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs hover:border-indigo-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShuffleQuestions(val);
                        if (!val) setShuffleMode('none');
                        else if (shuffleMode === 'none') setShuffleMode('full_random');
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-indigo-900">Shuffle Questions Active</span>
                  </label>
                </div>

                {shuffleQuestions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Shuffling Mechanism / Scope
                      </label>
                      <select
                        value={shuffleMode}
                        onChange={(e) => setShuffleMode(e.target.value as any)}
                        className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs text-slate-800 font-semibold focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="full_random">Full Randomization (Individualized per student)</option>
                        <option value="by_topic">By Topic / Section (Shuffle questions within each topic)</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">Each candidate receives an individualized Fisher-Yates shuffled sequence based on their candidate ID.</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Multiple-Choice Options Shuffling
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer mt-2 bg-white p-2 rounded-lg border border-indigo-200/70">
                        <input
                          type="checkbox"
                          checked={shuffleOptions}
                          onChange={(e) => setShuffleOptions(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs text-slate-800 font-medium">Randomize sub-options and answer choices</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-indigo-200/60">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Question Answering & Navigation Behavior
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setQuestionBehavior('free_navigation')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        questionBehavior === 'free_navigation'
                          ? 'border-indigo-600 bg-white ring-1 ring-indigo-500 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs mb-0.5 flex items-center justify-between">
                        <span>Free Navigation Mode</span>
                        {questionBehavior === 'free_navigation' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Candidates can jump between questions in any order, revisit previous answers, and review anytime before final submission.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionBehavior('sequential_only')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        questionBehavior === 'sequential_only'
                          ? 'border-rose-600 bg-white ring-1 ring-rose-500 text-rose-950 shadow-xs'
                          : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs mb-0.5 flex items-center justify-between">
                        <span>Strict Sequential Progression</span>
                        {questionBehavior === 'sequential_only' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Forward-only progression. Once a question is answered or skipped, the candidate cannot navigate back to modify answers.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Questions & Auto-Map */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {isLocked && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                  <Lock className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <div className="font-semibold text-xs">Question Modifications Strictly Locked</div>
                    <div className="text-[11px] text-amber-800 mt-0.5">
                      As per institutional examination integrity protocols, questions cannot be added, removed, or
                      re-ordered once an examination has commenced or received active student submissions.
                    </div>
                  </div>
                </div>
              )}

              {/* PRIMARY COMMAND HUB: LIVE STATUS & DIRECT PRINT ACTIONS */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-slate-50 to-emerald-50 border-2 border-indigo-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ClipboardPaste className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Examination Questions & Marking Scheme Engine
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold">
                        {selectedQuestions.length} Questions Active · {selectedQuestions.reduce((a, b) => a + (b.points || 0), 0)} Total Marks
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Paste or upload questions and marking schemes from text documents. Questions immediately and dynamically populate the examination paper for academic printing and automated grading.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPreviewPaperOpen(true)}
                    disabled={selectedQuestions.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Preview and print official examination paper formatted in Times New Roman 12pt"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Exam Paper</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPreviewSchemeOpen(true)}
                    disabled={selectedQuestions.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    title="Preview and print official marking scheme and evaluation rubrics"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Print Marking Scheme</span>
                  </button>
                </div>
              </div>

              {/* Document Import Notification Message */}
              {docImportMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    docImportMessage.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {docImportMessage.isError ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span className="font-semibold">{docImportMessage.text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocImportMessage(null)}
                    className="text-[11px] underline hover:opacity-80 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Question Creation Mode tabs */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSelectionMode('prompt_sequential')}
                  className={`flex-1 min-w-[170px] py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectionMode === 'prompt_sequential'
                      ? 'bg-emerald-600 text-white shadow-xs active-green'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Prompt Question by Question & Marks</span>
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setSelectionMode('create_custom')}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectionMode === 'create_custom'
                      ? 'bg-emerald-600 text-white shadow-xs active-green'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Set Variety of Questions</span>
                </button>
              </div>

              {/* SEQUENTIAL QUESTION PROMPT ENGINE TAB */}
              {selectionMode === 'prompt_sequential' && (
                <PromptedQuestionBatchBuilder
                  initialQuestions={selectedQuestions}
                  defaultTopic={courseTitle || 'Core Subject'}
                  courseTitle={courseTitle || title}
                  isLocked={isLocked}
                  targetQuestionCount={targetQuestionCount}
                  onTargetQuestionCountChange={setTargetQuestionCount}
                  onBatchProcessed={(batch: Question[]) => {
                    setSelectedQuestions(batch);
                    setTargetQuestionCount(batch.length);
                    setDocImportMessage({
                      text: `Processed batch of ${batch.length} questions (${batch.reduce((a: number, b: Question) => a + (b.points || 0), 0)} Total Marks). Populated into examination paper!`,
                      isError: false,
                    });
                  }}
                  onRequestReviewAndPublish={handleSave}
                />
              )}


              {/* CREATE VARIETY OF QUESTIONS TAB (Essay, Multichoice, etc.) */}
              {selectionMode === 'create_custom' && (
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 space-y-4">
                  <div className="border-b border-indigo-100 pb-2">
                    <h4 className="font-bold text-slate-900 text-xs">
                      Add Written, File-Upload, or Multi-Part Questions
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Draft questions directly for this exam with custom marks and rubrics.
                    </p>
                  </div>

                  <form onSubmit={handleAddCustomQuestion} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Question Type
                        </label>
                        <select
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value as QuestionType)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                        >
                          <option value="essay">Essay / Long Answer / Exposition</option>
                          <option value="fill_blank">Fill in the Blank</option>
                          <option value="file_upload">File Upload</option>
                          <option value="sub_question">Multi-Part Written Response</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Subject / Topic
                        </label>
                        <input
                          type="text"
                          required
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          placeholder="e.g. Asymmetric Encryption"
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Allocated Marks
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={customPoints}
                          onChange={(e) => setCustomPoints(parseInt(e.target.value, 10) || 5)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Question Prompt / Problem Statement:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Type question prompt, analytical problem statement, or essay topic..."
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 leading-relaxed"
                      />
                    </div>

                    {customType === 'sub_question' && (
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Sub-questions (one per line)
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={customSubQuestionText}
                          onChange={(e) => setCustomSubQuestionText(e.target.value)}
                          placeholder={'a) Explain the first part.\nb) Analyze the second part.'}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    )}

                    {/* Essay Rubric */}
                    {customType === 'essay' && (
                      <div className="space-y-1">
                        <label className="block font-semibold text-slate-700">
                          Sample Answer & Evaluation Rubric:
                        </label>
                        <textarea
                          rows={2}
                          value={customSampleAnswer}
                          onChange={(e) => setCustomSampleAnswer(e.target.value)}
                          placeholder="Provide model solution, key theoretical criteria, and marks distribution breakdown..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    )}

                    {/* Diagram / Illustration Attachment for Custom Question */}
                    <div className="pt-1">
                      <DiagramAttachmentField
                        imageUrl={customImageUrl}
                        imageCaption={customImageCaption}
                        imageTransform={customImageTransform}
                        onChange={(url: string, cap: string, transform: any) => {
                          setCustomImageUrl(url);
                          setCustomImageCaption(cap || '');
                          setCustomImageTransform(transform);
                        }}
                        label="Attach Diagram / Illustration / Technical Figure to this Question (Optional):"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question to Exam ({customPoints} Marks)</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Selected Questions Review */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-800">
                    Included Questions ({selectedQuestions.length} selected ·{' '}
                    {selectedQuestions.reduce((a, b) => a + b.points, 0)} total Marks)
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    All question matrix tabs support attaching diagrams & figures
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {selectedQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-xs truncate">
                            {q.prompt}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono uppercase bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                              {q.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {q.topic}
                            </span>
                            {q.imageUrl ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                                <ImageIcon className="w-3 h-3 text-emerald-600" />
                                <span>Diagram Attached: {q.imageCaption || 'Figure'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                No diagram
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDiagramModal(q)}
                          className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Attach or modify diagram / illustration for this question"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{q.imageUrl ? 'Edit Diagram' : '+ Diagram'}</span>
                        </button>

                        <span className="text-xs font-mono font-bold text-slate-700 px-2 py-1 bg-white rounded border border-slate-200">
                          {q.points} Marks
                        </span>

                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => handleToggleQuestion(q)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                            title="Remove question from exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Mandatory Security Protocols (Camera, Mic, SEB) */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Notice Banner */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs">Mandatory Hardware & Environment Protocol Rules</div>
                  <div className="text-[11px] text-amber-800 leading-relaxed">
                    When you activate these security protocols, they are <strong>automatically forced ON for all student candidates</strong>.
                    Students will have <strong>no choice or option to disable or fail to activate</strong> their camera or microphone.
                    If a student turns off their webcam or microphone mid-test, the session is terminated and the student is logged out for integrity violation.
                  </div>
                </div>
              </div>

              {/* Protocol Toggle Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Camera Protocol */}
                <div
                  onClick={() =>
                    setSecurityProtocols({
                      ...securityProtocols,
                      requireCamera: !securityProtocols.requireCamera,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    securityProtocols.requireCamera
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={securityProtocols.requireCamera}
                      onChange={() => {}} // handled by parent div
                      className="rounded"
                    />
                  </div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    Mandatory Webcam Stream
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Forces student webcam ON automatically. Continuous optical video feed is streamed directly to teacher proctor room.
                  </p>
                </div>

                {/* Microphone Protocol */}
                <div
                  onClick={() =>
                    setSecurityProtocols({
                      ...securityProtocols,
                      requireMicrophone: !securityProtocols.requireMicrophone,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    securityProtocols.requireMicrophone
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                      <Mic className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={securityProtocols.requireMicrophone}
                      onChange={() => {}}
                      className="rounded"
                    />
                  </div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    Mandatory Microphone Audio
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Forces student mic ON automatically. Enables real-time teacher audio monitoring & acoustic anomaly detection.
                  </p>
                </div>

                {/* Safe Exam Browser (SEB) */}
                <div
                  onClick={() =>
                    setSecurityProtocols({
                      ...securityProtocols,
                      requireSEB: !securityProtocols.requireSEB,
                    })
                  }
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    securityProtocols.requireSEB
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Shield className="w-5 h-5" />
                    </div>
                    <input
                      type="checkbox"
                      checked={securityProtocols.requireSEB}
                      onChange={() => {}}
                      className="rounded"
                    />
                  </div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    Safe Exam Browser (SEB)
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Validates BEK cryptographic hash, preventing tab switches, secondary monitors, and non-SEB clients.
                  </p>
                </div>
              </div>

              {/* SEB Configuration Details if enabled */}
              {securityProtocols.requireSEB && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-slate-500 text-xs">
                      Cryptographic Browser Exam Key (BEK Digest):
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        downloadSebConfigFile(title || 'Exam', window.location.origin, sebConfig)
                      }
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .seb File</span>
                    </button>
                  </div>
                  <div className="p-2 bg-slate-900 text-cyan-300 font-mono text-[11px] rounded break-all select-all">
                    {sebConfig.browserExamKey}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Answer Sheet Layout & Formatting */}
          {activeTab === 'answer_sheet' && (
            <div className="space-y-4">
              {/* Layout Picker */}
              <div>
                <label className="block font-medium text-slate-700 mb-2">Answer Sheet Display Architecture</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'standard', label: 'Standard Digital', desc: 'Integrated Answer Sheet directly beneath each question' },
                    { id: 'omr_grid', label: 'OMR Bubble Matrix', desc: 'Dense optical bubble sheet below question stem' },
                    { id: 'two_column', label: 'Two-Column Split', desc: 'Simultaneous prompt & answer space' },
                    { id: 'compact', label: 'Compact Paperless', desc: 'Optimized for smaller laptop screens' },
                  ].map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() =>
                        setAnswerSheetConfig({
                          ...answerSheetConfig,
                          layout: layout.id as any,
                        })
                      }
                      className={`p-3 rounded-lg border text-left transition-all ${
                        answerSheetConfig.layout === layout.id
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs mb-1">{layout.label}</div>
                      <div className="text-[11px] text-slate-500 leading-snug">{layout.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grading Options */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <span className="font-semibold text-slate-800">Scoring & Automated Grading Protocols</span>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">Negative Marking</div>
                      <div className="text-[11px] text-slate-500">
                        Penalize wrong answers to discourage blind guessing
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={answerSheetConfig.allowNegativeMarking}
                        onChange={(e) =>
                          setAnswerSheetConfig({
                            ...answerSheetConfig,
                            allowNegativeMarking: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div>
                      <div className="font-medium text-slate-800">Side-by-Side Answer Key Access</div>
                      <div className="text-[11px] text-slate-500">
                        Allow students to inspect correct answers and explanations immediately after submission
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={answerSheetConfig.allowReviewAfterSubmission}
                        onChange={(e) =>
                          setAnswerSheetConfig({
                            ...answerSheetConfig,
                            allowReviewAfterSubmission: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>Permit</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div>
                      <div className="font-medium text-slate-800">Partial Credit for Multi-Select Questions</div>
                      <div className="text-[11px] text-slate-500">
                        Award fractional points proportional to correctly selected options
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="rounded"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Error Banner if form requirements are missing */}
        {validationError && (
          <div className="px-6 py-2.5 bg-rose-50 border-t border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-[11px] underline hover:text-rose-950 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-slate-700 font-mono">
            <span className="font-bold px-2.5 py-1 rounded-md border text-xs bg-emerald-50 text-emerald-800 border-emerald-300">
              {selectedQuestions.length} Questions Set
            </span>
            <span>·</span>
            <span className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md text-xs">
              Exam Set Out Of: {selectedQuestions.reduce((sum, q) => sum + (Number(q.points) || 0), 0)} Total Marks
            </span>
            <span>·</span>
            <span className="text-slate-500">Duration: {durationMinutes} mins</span>
            {selectedQuestions.length > 0 && selectedQuestions.length !== targetQuestionCount && (
              <button
                type="button"
                onClick={() => setTargetQuestionCount(selectedQuestions.length)}
                className="text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 text-[11px] cursor-pointer"
                title="Synchronize planned target quota with active question count"
              >
                <span>Planned Quota: {targetQuestionCount} (Click to Sync)</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isImportingDoc || !isAllPredefinedQuestionsSet}
              className={`px-5 py-2.5 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 text-xs ${
                isAllPredefinedQuestionsSet
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-600/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              }`}
              title={
                !isAllPredefinedQuestionsSet
                  ? `Publishing locked: All ${targetQuestionCount} predefined questions must be set (${selectedQuestions.length}/${targetQuestionCount} ready with valid marks)`
                  : 'Review questions, marks, and publish examination'
              }
            >
              <Eye className="w-4 h-4" />
              <span>
                {isAllPredefinedQuestionsSet
                  ? `Review & Publish Examination (${selectedQuestions.length} Questions)`
                  : `Publish Locked (${selectedQuestions.length}/${targetQuestionCount} Questions)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {isPublishPreviewOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publish-review-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 p-5">
              <div>
                <h2 id="publish-review-title" className="text-lg font-bold text-slate-900">
                  Review Questions & Marks
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Verify the imported question text and mark allocation. Missing marks must be entered before publishing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublishPreviewOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                aria-label="Close question and marks review"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50 px-5 py-3 text-sm">
              <span className="font-semibold text-indigo-950">
                {selectedQuestions.length} {selectedQuestions.length === 1 ? 'question' : 'questions'}
              </span>
              <span className="font-mono font-bold text-indigo-800">
                Total: {selectedQuestions.reduce((total, question) => total + (Number(question.points) || 0), 0)} marks
              </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {selectedQuestions.map((question, index) => {
                const hasValidPrompt = Boolean(String(question.prompt || '').trim());
                const hasValidMarks = Number.isFinite(Number(question.points)) && Number(question.points) > 0;
                const hasScheme = Boolean(String(question.sampleAnswer || question.rubric || question.explanation || '').trim());
                return (
                  <div
                    key={question.id || index}
                    className={`rounded-xl border p-4.5 space-y-3 shadow-2xs ${
                      hasValidMarks && hasValidPrompt ? 'border-slate-200 bg-white' : 'border-amber-300 bg-amber-50/60'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-800">
                            Question {index + 1}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            {question.type.replace('_', ' ')}
                          </span>
                          {question.topic && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Topic: {question.topic}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                              hasScheme
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <Key className="w-3 h-3 text-emerald-600" />
                            <span>{hasScheme ? 'Marking Scheme Defined' : 'Marking Scheme Pending'}</span>
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Question Statement:
                          </label>
                          <textarea
                            rows={2}
                            value={question.prompt}
                            disabled={isLocked}
                            onChange={(e) => {
                              const newPrompt = e.target.value;
                              setSelectedQuestions((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, prompt: newPrompt } : item
                                )
                              );
                            }}
                            className="w-full rounded-lg border border-slate-300 bg-slate-50/40 p-2 text-xs text-slate-900 leading-relaxed font-medium focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            placeholder="Enter question statement..."
                          />
                        </div>

                        {/* Choice options preview if applicable */}
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2 space-y-1.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-700 block">
                              Options & Key:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                              {question.options.map((opt, optIdx) => {
                                const isCorrect =
                                  question.correctAnswers?.includes(opt.id) ||
                                  question.correctAnswers?.includes(opt.text) ||
                                  (opt as any).isCorrect;
                                return (
                                  <div
                                    key={opt.id || optIdx}
                                    className={`p-1.5 rounded flex items-center gap-2 border text-[11px] ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                        : 'bg-white border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className="font-mono font-bold">{String.fromCharCode(65 + optIdx)})</span>
                                    <span>{opt.text}</span>
                                    {isCorrect && (
                                      <span className="ml-auto text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                                        Correct Key
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {question.subQuestions && question.subQuestions.length > 0 && (
                          <ol className="mt-2 list-[lower-alpha] space-y-1 pl-6 text-xs text-slate-700">
                            {question.subQuestions.map((part) => (
                              <li key={part.id}>{part.prompt}</li>
                            ))}
                          </ol>
                        )}

                        {/* Diagram thumbnail */}
                        {question.imageUrl && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50/50 border border-indigo-200 text-xs">
                            <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-medium text-indigo-900 truncate">
                              Diagram Attached: {question.imageCaption || question.imageUrl}
                            </span>
                          </div>
                        )}

                        {!hasValidMarks && (
                          <p className="mt-1 text-xs font-semibold text-amber-800">
                            Marks were not detected. Enter the intended allocation to enable publishing.
                          </p>
                        )}
                        {!hasValidPrompt && (
                          <p className="mt-1 text-xs font-semibold text-rose-700">
                            Question text is missing. Return to editing and provide the complete prompt.
                          </p>
                        )}
                      </div>

                      <label className="w-full shrink-0 text-xs font-semibold text-slate-700 sm:w-36">
                        Allocated Marks
                        <input
                          type="number"
                          min="0.01"
                          step="0.25"
                          value={question.points}
                          disabled={isLocked}
                          onChange={(event) => {
                            const points = Number(event.target.value);
                            setSelectedQuestions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, points } : item
                              )
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold text-indigo-950 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                          aria-label={`Marks for question ${index + 1}`}
                        />
                      </label>
                    </div>

                    {/* Dedicated Official Marking Scheme & Model Answer */}
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Official Marking Scheme, Key Criteria & Model Answer:</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                          Award: {question.points} Marks Max
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        value={question.sampleAnswer || question.rubric || question.explanation || ''}
                        disabled={isLocked}
                        placeholder={`Enter official model solution, grading rubric points, and evaluation criteria for Question ${index + 1}...`}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedQuestions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, sampleAnswer: val, explanation: val, rubric: val }
                                : item
                            )
                          );
                        }}
                        className="w-full rounded-lg border border-emerald-300 bg-white p-2 text-xs text-slate-800 leading-relaxed font-sans focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIsPublishPreviewOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Back to editing
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={!isAllPredefinedQuestionsSet}
                className={`rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-all shadow-md ${
                  isAllPredefinedQuestionsSet
                    ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer shadow-emerald-600/20'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                title={
                  !isAllPredefinedQuestionsSet
                    ? `Cannot publish: Requires all ${targetQuestionCount} questions to be defined with positive marks.`
                    : 'Publish examination'
                }
              >
                {existingExam ? 'Confirm & Update Examination' : `Confirm & Publish Examination (${selectedQuestions.length}/${targetQuestionCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Times New Roman 12pt Examination Paper Modal */}
      {isPreviewPaperOpen && (
        <ExaminationPaperModal
          isOpen={true}
          onClose={() => setIsPreviewPaperOpen(false)}
          exam={previewExam}
          userRole="teacher"
          canDownload={true}
          faculty={faculty}
          department={department}
        />
      )}

      {/* Official Times New Roman 12pt Marking Scheme Modal */}
      {isPreviewSchemeOpen && (
        <OfficialMarkingSchemeModal
          isOpen={true}
          onClose={() => setIsPreviewSchemeOpen(false)}
          exam={previewExam}
          userRole="teacher"
          canDownload={true}
          faculty={faculty}
          department={department}
        />
      )}

      {/* UNIVERSAL QUESTION DIAGRAM ATTACHMENT MODAL (AVAILABLE FOR ANY QUESTION IN THE MATRIX) */}
      {diagramModalTargetQuestion && (
        <div
          onClick={() => setDiagramModalTargetQuestion(null)}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 cursor-default animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                  Question Media Matrix
                </span>
                <h4 className="text-base font-bold text-slate-900">
                  Attach Diagram / Illustration to Question
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setDiagramModalTargetQuestion(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold block text-slate-900 mb-0.5">
                Target Question Stem:
              </span>
              <p className="font-medium italic leading-relaxed">
                "{diagramModalTargetQuestion.prompt}"
              </p>
            </div>

            <DiagramAttachmentField
              imageUrl={diagramModalDraftUrl}
              imageCaption={diagramModalDraftCaption}
              imageTransform={diagramModalDraftTransform}
              onChange={(url: string, cap: string, transform: any) => {
                setDiagramModalDraftUrl(url);
                setDiagramModalDraftCaption(cap || '');
                setDiagramModalDraftTransform(transform);
              }}
              label="Diagram / Technical Schematic / Image Figure:"
            />

            {/* Live Examination Paper Centered Preview */}
            {diagramModalDraftUrl && (
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-500 block mb-1">
                  Examination Paper  Editing (Mapped Neatly in Middle):
                </span>
                <div className="flex flex-col items-center justify-center w-full">
                  <TechnicalDiagram
                    imageUrl={diagramModalDraftUrl}
                    caption={diagramModalDraftCaption}
                    type={diagramModalDraftUrl}
                    transform={diagramModalDraftTransform}
                    inExamPaper={true}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDiagramModalTargetQuestion(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDiagramToQuestion}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Save Diagram to Question</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
