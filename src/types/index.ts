// ─── Core Data Types for LearnMap ───────────────────────────────────────────

export type ID = string;

// ─── Project ────────────────────────────────────────────────────────────────

export interface Project {
  id: ID;
  title: string;
  description: string;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ─── Mindmap ─────────────────────────────────────────────────────────────────

export interface Mindmap {
  id: ID;
  projectId: ID;
  title: string;
  fontScale?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── MindmapNode ─────────────────────────────────────────────────────────────

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeAttachment {
  id: string;
  name: string;
  type: 'image' | 'file';
  size: number;
  mimeType: string;
  dataUrl?: string; // thumbnail or base64 preview
}

export interface PdfPageLink {
  id: string;
  documentId: ID;
  pageNumber: number;
  documentName?: string;
  label?: string;
}

export type NodeFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type NodeImageSize = 'sm' | 'md' | 'lg' | 'xl';

export interface MindmapNode {
  id: ID;
  mindmapId: ID;
  projectId: ID;
  title: string;
  content: string; // Plain text / rich text for inline notes
  parentId: ID | null;
  position: NodePosition;
  knowledgeNodeId: ID | null; // Link to the central Knowledge Graph Node
  linkedFlashcardIds: ID[];
  linkedTaskcardIds: ID[];
  linkedNoteIds: ID[];
  linkedPdfPages?: PdfPageLink[];
  attachments?: NodeAttachment[];
  fontSize?: NodeFontSize;
  imageSize?: NodeImageSize;
  createdAt: string;
  updatedAt: string;
}

// ─── MindmapEdge ─────────────────────────────────────────────────────────────

export interface MindmapEdge {
  id: ID;
  mindmapId: ID;
  sourceId: ID;
  targetId: ID;
  label?: string;
}

// ─── Note ────────────────────────────────────────────────────────────────────

export interface Note {
  id: ID;
  projectId: ID;
  title: string;
  content: string; // Tiptap JSON serialized as string
  linkedNodeIds: ID[];
  createdAt: string;
  updatedAt: string;
}

// ─── Flashcard ────────────────────────────────────────────────────────────────

export type FlashcardDifficulty = 'again' | 'hard' | 'good' | 'easy';
export type FlashcardType = 'standard' | 'occlusion';

export interface OcclusionBox {
  id: string;
  x: number;      // Prozent 0-100
  y: number;      // Prozent 0-100
  width: number;  // Prozent 0-100
  height: number; // Prozent 0-100
  label?: string; // Optionaler Name / Lösung
}

export interface Flashcard {
  id: ID;
  projectId: ID;
  front: string;
  back: string;
  cardType?: FlashcardType;
  imageUrl?: string;
  occlusionBoxes?: OcclusionBox[];
  tags?: string[];
  isReverse?: boolean; // Beidseitig abfragen
  linkedNodeIds: ID[];
  difficulty: FlashcardDifficulty | null;
  lastReviewed: string | null;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Taskcard ─────────────────────────────────────────────────────────────────

export type TaskcardColor = 'default' | 'yellow' | 'blue' | 'green' | 'red';

export interface Taskcard {
  id: ID;
  projectId: ID;
  title: string;
  content: string;
  position: NodePosition;
  color: TaskcardColor;
  width: number;
  height: number;
  linkedNodeIds: ID[];
  createdAt: string;
  updatedAt: string;
}

import type { DrawingStroke } from '../features/canvas/drawingTypes';

// ─── Knowledge Graph ──────────────────────────────────────────────────────────

export type MasteryLevel = 'NOT_LEARNED' | 'LEARNING' | 'WEAK' | 'KNOWN' | 'MASTERED';

export interface KnowledgeNode {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  parentId: ID | null;
  children: ID[]; // children node IDs
  relatedNodes: ID[]; // related node IDs
  
  // Linked items
  notes: ID[];
  sourceReferences: string[];
  flashcards: ID[];
  questions: ID[];
  taskcards: ID[];
  
  // Learning Status
  mastery: {
    understanding: number; // 0-100 (Verstehen)
    recall: number;        // 0-100 (Abrufen)
    application: number;   // 0-100 (Anwendung)
    exam: number;          // 0-100 (Klausur)
  };
  confidence: number;
  overallStatus: MasteryLevel;
  
  // Spaced Repetition
  lastReviewed: string | null;
  nextReview: string | null;
  interval: number;
  ease: number;
  repetitions: number;
  
  // Statistics
  mistakes: ID[];
  statistics: {
    timesReviewed: number;
    correctAnswers: number;
    incorrectAnswers: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ─── Learning Events & Statistics ─────────────────────────────────────────────

export type LearningEventType = 'flashcard' | 'quiz' | 'question' | 'exam' | 'free_recall';
export type LearningEventResult = 'correct' | 'incorrect' | 'partial';
export type LearningEventDifficulty = 'easy' | 'medium' | 'hard';

export interface LearningEvent {
  id: ID;
  projectId: ID;
  knowledgeNodeId: ID;
  type: LearningEventType;
  result: LearningEventResult;
  difficulty: LearningEventDifficulty;
  timestamp: string;
}

// ─── Questions (Aufgabenbank) ─────────────────────────────────────────────────

export type QuestionType = 'Definition' | 'Erklärung' | 'Vergleich' | 'Ursache/Wirkung' | 'Reihenfolge' | 'Anwendung' | 'Transfer' | 'Multiple Choice' | 'offene Frage';

export interface Question {
  id: ID;
  projectId: ID;
  knowledgeNodeId: ID;
  type: QuestionType;
  difficulty: LearningEventDifficulty;
  question: string;
  answer: string; // The correct answer / model answer
  explanation?: string;
  source?: string;
  isOriginalExamQuestion?: boolean;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Mistakes (Fehlerprotokoll) ───────────────────────────────────────────────

export type MistakeCategory = 'Fachwissen' | 'Verständnis' | 'Anwendung' | 'Flüchtigkeit';

export interface Mistake {
  id: ID;
  projectId: ID;
  knowledgeNodeId: ID;
  questionId?: ID;
  flashcardId?: ID;
  description: string;
  category: MistakeCategory;
  timestamp: string;
}

// ─── Exams (Klausuren) ────────────────────────────────────────────────────────

export interface Exam {
  id: ID;
  projectId: ID;
  title: string;
  date: string; // ISO 8601 date
  subject: string;
  topicIds: ID[]; // KnowledgeNode IDs
  durationMinutes: number;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResult {
  id: ID;
  projectId: ID;
  examId: ID;
  score: number;
  maxScore: number;
  topicScores: Record<ID, number>; // node id -> percentage
  problematicNodes: ID[];
  timestamp: string;
}

// ─── Timelines (Zeitstrahl) ──────────────────────────────────────────────────

export type TimelineEventImportance = 'low' | 'medium' | 'high';

export interface TimelineEvent {
  id: ID;
  timelineId: ID;
  projectId: ID;
  title: string;
  description: string;
  date: string; // e.g. "1789", "14.07.1789", "1789-07-14", "44 v. Chr."
  endDate?: string; // Optional end date for periods / eras
  category?: string; // e.g. "Politik", "Wissenschaft", "Kultur", "Entdeckung"
  color?: string; // e.g. "blue", "emerald", "amber", "rose", "purple", "indigo"
  importance?: TimelineEventImportance;
  linkedNodeIds?: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface Timeline {
  id: ID;
  projectId: ID;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

export type GlossarySourceType = 'knowledgeNode' | 'flashcard' | 'mindmapNode' | 'note' | 'custom';

export interface GlossaryTerm {
  id: ID;
  projectId: ID;
  term: string;
  definition: string;
  sourceType: GlossarySourceType;
  sourceTitle?: string;
  sourceId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Documents & Folders ──────────────────────────────────────────────────────

export interface DocumentFolder {
  id: ID;
  projectId: ID;
  name: string;
  parentId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFile {
  id: ID;
  projectId: ID;
  folderId: ID | null;
  name: string;
  size: number;
  pageCount?: number;
  storageKey: string;
  downloadUrl?: string; // If uploaded to Firebase Storage
  createdAt: string;
  updatedAt: string;
}

// ─── Vocabulary Trainer (Vokabeltrainer & Leitner-System) ──────────────────────

export interface VocabDeck {
  id: ID;
  title: string;
  description?: string;
  language: string; // e.g. "Englisch", "Spanisch", "Französisch", "Latein"
  langCode: string; // e.g. "en-US", "es-ES", "fr-FR", "it-IT", "la"
  color?: string;   // e.g. "indigo", "emerald", "amber", "rose", "sky"
  createdAt: string;
  updatedAt: string;
}

export interface VocabItem {
  id: ID;
  deckId: ID;
  foreignWord: string;         // Fremdwort (z. B. "ubiquitous")
  germanWord: string;          // Deutsche Übersetzung (z. B. "allgegenwärtig, überall vorkommend")
  phonetic?: string;           // Aussprache / Lautschrift
  exampleSentence?: string;    // Beispielsatz Fremdsprache
  exampleTranslation?: string; // Übersetzung Beispielsatz
  notes?: string;              // Wortart, Synonyme, grammatikalische Notiz

  // Leitner Repetitive Learning (Box 1 - 5)
  box: number;                 // 1 bis 5 (1 = Neu/Täglich, 2 = 2 Tage, 3 = 7 Tage, 4 = 14 Tage, 5 = 30 Tage)
  nextReview: string;          // ISO Datum ab wann wieder fällig
  lastReviewed: string | null;
  timesCorrect: number;
  timesIncorrect: number;

  createdAt: string;
  updatedAt: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  projects: Record<ID, Project>;
  mindmaps: Record<ID, Mindmap>;
  mindmapNodes: Record<ID, MindmapNode>;
  mindmapEdges: Record<ID, MindmapEdge>;
  notes: Record<ID, Note>;
  flashcards: Record<ID, Flashcard>;
  taskcards: Record<ID, Taskcard>;
  drawings: Record<string, DrawingStroke[]>;
  knowledgeNodes: Record<ID, KnowledgeNode>;
  learningEvents: Record<ID, LearningEvent>;
  questions: Record<ID, Question>;
  mistakes: Record<ID, Mistake>;
  exams: Record<ID, Exam>;
  examResults: Record<ID, ExamResult>;
  timelines: Record<ID, Timeline>;
  timelineEvents: Record<ID, TimelineEvent>;
  glossaryTerms?: Record<ID, GlossaryTerm>;
  folders?: Record<ID, DocumentFolder>;
  documents?: Record<ID, DocumentFile>;
  vocabDecks?: Record<ID, VocabDeck>;
  vocabItems?: Record<ID, VocabItem>;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type SearchResultType =
  | 'project'
  | 'mindmap'
  | 'node'
  | 'note'
  | 'flashcard'
  | 'taskcard'
  | 'knowledgeNode'
  | 'question'
  | 'exam'
  | 'timeline'
  | 'timelineEvent'
  | 'glossary'
  | 'document'
  | 'folder'
  | 'vocabDeck'
  | 'vocabItem';

export interface SearchResult {
  id: ID;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  projectId?: ID;
}

