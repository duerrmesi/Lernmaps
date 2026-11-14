import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { diskAndLocalStorage, saveToDisk, loadFromDisk, setSyncPaused } from '../services/storageSync';
import type {
  AppState,
  Project,
  Mindmap,
  MindmapNode,
  MindmapEdge,
  Note,
  Flashcard,
  Taskcard,
  KnowledgeNode,
  Timeline,
  TimelineEvent,
  ID,
  NodePosition,
  NodeAttachment,
  NodeFontSize,
  NodeImageSize,
} from '../types';
import { generateId, now } from '../utils';

interface Actions {
  // Projects
  createProject: (title: string, description?: string) => Project;
  updateProject: (id: ID, updates: Partial<Pick<Project, 'title' | 'description'>>) => void;
  deleteProject: (id: ID) => void;

  // Mindmaps
  createMindmap: (projectId: ID, title: string) => Mindmap;
  updateMindmap: (id: ID, updates: Partial<Omit<Mindmap, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteMindmap: (id: ID) => void;

  // MindmapNodes
  createNode: (
    mindmapId: ID,
    projectId: ID,
    title: string,
    parentId?: ID | null,
    position?: NodePosition,
    attachments?: NodeAttachment[],
    fontSize?: NodeFontSize,
    imageSize?: NodeImageSize
  ) => MindmapNode;
  updateNode: (id: ID, updates: Partial<Omit<MindmapNode, 'id' | 'mindmapId' | 'projectId' | 'createdAt'>>) => void;
  deleteNode: (id: ID) => void;
  moveNode: (id: ID, position: NodePosition) => void;
  batchMoveNodes: (updates: { id: ID; position: NodePosition }[]) => void;

  // MindmapEdges
  createEdge: (mindmapId: ID, sourceId: ID, targetId: ID, label?: string) => MindmapEdge;
  updateEdge: (id: ID, updates: Partial<Omit<MindmapEdge, 'id' | 'mindmapId'>>) => void;
  deleteEdge: (id: ID) => void;
  deleteEdgesForNode: (nodeId: ID) => void;

  // Notes
  createNote: (projectId: ID, title?: string) => Note;
  updateNote: (id: ID, updates: Partial<Pick<Note, 'title' | 'content' | 'linkedNodeIds'>>) => void;
  deleteNote: (id: ID) => void;

  // Flashcards
  createFlashcard: (projectId: ID, front: string, back: string) => Flashcard;
  updateFlashcard: (id: ID, updates: Partial<Omit<Flashcard, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteFlashcard: (id: ID) => void;

  // Taskcards
  createTaskcard: (projectId: ID, title?: string, position?: NodePosition) => Taskcard;
  updateTaskcard: (id: ID, updates: Partial<Omit<Taskcard, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteTaskcard: (id: ID) => void;

  // Linking
  linkNoteToNode: (noteId: ID, nodeId: ID) => void;
  unlinkNoteFromNode: (noteId: ID, nodeId: ID) => void;
  linkFlashcardToNode: (flashcardId: ID, nodeId: ID) => void;
  unlinkFlashcardFromNode: (flashcardId: ID, nodeId: ID) => void;
  linkTaskcardToNode: (taskcardId: ID, nodeId: ID) => void;
  unlinkTaskcardFromNode: (taskcardId: ID, nodeId: ID) => void;

  // Drawings
  setDrawings: (canvasId: string, strokes: import('../features/canvas/drawingTypes').DrawingStroke[]) => void;
  clearDrawings: (canvasId: string) => void;

  // Knowledge Graph
  createKnowledgeNode: (projectId: ID, title: string, description?: string, parentId?: ID | null) => KnowledgeNode;
  updateKnowledgeNode: (id: ID, updates: Partial<Omit<KnowledgeNode, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteKnowledgeNode: (id: ID) => void;

  // Learning Events
  recordLearningEvent: (projectId: ID, knowledgeNodeId: ID, type: import('../types').LearningEventType, result: import('../types').LearningEventResult, difficulty: import('../types').LearningEventDifficulty) => import('../types').LearningEvent;
  
  // Spaced Repetition
  reviewKnowledgeNode: (id: ID, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  
  // Fehlerprotokoll
  logMistake: (projectId: ID, knowledgeNodeId: ID, description: string, category: import('../types').MistakeCategory, questionId?: ID, flashcardId?: ID) => import('../types').Mistake;
  
  // Aufgabenbank
  createQuestion: (projectId: ID, knowledgeNodeId: ID, type: import('../types').QuestionType, difficulty: import('../types').LearningEventDifficulty, question: string, answer: string, explanation?: string, source?: string, points?: number, isOriginalExamQuestion?: boolean) => import('../types').Question;
  updateQuestion: (id: ID, updates: Partial<Omit<import('../types').Question, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteQuestion: (id: ID) => void;
  
  // Klausuren
  createExam: (projectId: ID, title: string, date: string, subject: string, topicIds: ID[], durationMinutes: number, totalPoints: number) => import('../types').Exam;
  updateExam: (id: ID, updates: Partial<Omit<import('../types').Exam, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteExam: (id: ID) => void;
  
  recordExamResult: (projectId: ID, examId: ID, score: number, maxScore: number, topicScores: Record<string, number>, problematicNodes: string[]) => import('../types').ExamResult;

  // Timelines
  createTimeline: (projectId: ID, title: string, description?: string) => Timeline;
  updateTimeline: (id: ID, updates: Partial<Pick<Timeline, 'title' | 'description'>>) => void;
  deleteTimeline: (id: ID) => void;

  // Timeline Events
  createTimelineEvent: (
    timelineId: ID,
    projectId: ID,
    data: {
      title: string;
      description?: string;
      date: string;
      endDate?: string;
      category?: string;
      color?: string;
      importance?: import('../types').TimelineEventImportance;
      linkedNodeIds?: ID[];
    }
  ) => TimelineEvent;
  updateTimelineEvent: (
    id: ID,
    updates: Partial<Omit<TimelineEvent, 'id' | 'timelineId' | 'projectId' | 'createdAt'>>
  ) => void;
  deleteTimelineEvent: (id: ID) => void;
}

type StoreState = AppState & Actions;

export const useStore = create<StoreState>()(
  persist(
    (set, _get) => ({
      // Initial state
      projects: {},
      mindmaps: {},
      mindmapNodes: {},
      mindmapEdges: {},
      notes: {},
      flashcards: {},
      taskcards: {},
      drawings: {},
      knowledgeNodes: {},
      learningEvents: {},
      questions: {},
      mistakes: {},
      exams: {},
      examResults: {},
      timelines: {},
      timelineEvents: {},

      // ─── Projects ──────────────────────────────────────────────────────
      createProject: (title, description = '') => {
        const project: Project = {
          id: generateId(),
          title,
          description,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ projects: { ...s.projects, [project.id]: project } }));
        return project;
      },

      updateProject: (id, updates) => {
        set((s) => ({
          projects: {
            ...s.projects,
            [id]: { ...s.projects[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteProject: (id) => {
        set((s) => {
          const projects = { ...s.projects };
          delete projects[id];
          // Cascade: delete all related mindmaps, nodes, edges, notes, flashcards, taskcards
          const mindmaps = Object.fromEntries(
            Object.entries(s.mindmaps).filter(([, m]) => m.projectId !== id)
          );
          const mindmapNodes = Object.fromEntries(
            Object.entries(s.mindmapNodes).filter(([, n]) => n.projectId !== id)
          );
          const mindmapEdges = Object.fromEntries(
            Object.entries(s.mindmapEdges).filter(([, e]) => {
              const node = s.mindmapNodes[e.sourceId];
              return node?.projectId !== id;
            })
          );
          const notes = Object.fromEntries(
            Object.entries(s.notes).filter(([, n]) => n.projectId !== id)
          );
          const flashcards = Object.fromEntries(
            Object.entries(s.flashcards).filter(([, f]) => f.projectId !== id)
          );
          const taskcards = Object.fromEntries(
            Object.entries(s.taskcards).filter(([, t]) => t.projectId !== id)
          );
          const knowledgeNodes = Object.fromEntries(
            Object.entries(s.knowledgeNodes).filter(([, k]) => k.projectId !== id)
          );
          const learningEvents = Object.fromEntries(
            Object.entries(s.learningEvents).filter(([, le]) => le.projectId !== id)
          );
          const questions = Object.fromEntries(
            Object.entries(s.questions).filter(([, q]) => q.projectId !== id)
          );
          const mistakes = Object.fromEntries(
            Object.entries(s.mistakes).filter(([, m]) => m.projectId !== id)
          );
          const exams = Object.fromEntries(
            Object.entries(s.exams).filter(([, e]) => e.projectId !== id)
          );
          const examResults = Object.fromEntries(
            Object.entries(s.examResults).filter(([, er]) => er.projectId !== id)
          );
          const timelines = Object.fromEntries(
            Object.entries(s.timelines || {}).filter(([, t]) => t.projectId !== id)
          );
          const timelineEvents = Object.fromEntries(
            Object.entries(s.timelineEvents || {}).filter(([, te]) => te.projectId !== id)
          );

          return { 
            projects, mindmaps, mindmapNodes, mindmapEdges, notes, flashcards, taskcards,
            knowledgeNodes, learningEvents, questions, mistakes, exams, examResults,
            timelines, timelineEvents
          };
        });
      },

      // ─── Mindmaps ──────────────────────────────────────────────────────
      createMindmap: (projectId, title) => {
        const mindmap: Mindmap = {
          id: generateId(),
          projectId,
          title,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ mindmaps: { ...s.mindmaps, [mindmap.id]: mindmap } }));
        // Create root node
        const knId = generateId();
        const rootNode: MindmapNode = {
          id: generateId(),
          mindmapId: mindmap.id,
          projectId,
          title,
          content: '',
          parentId: null,
          position: { x: 0, y: 0 },
          knowledgeNodeId: knId,
          linkedFlashcardIds: [],
          linkedTaskcardIds: [],
          linkedNoteIds: [],
          createdAt: now(),
          updatedAt: now(),
        };
        const rootKNode: KnowledgeNode = {
          id: knId,
          projectId,
          title,
          description: '',
          parentId: null,
          children: [],
          relatedNodes: [],
          notes: [],
          sourceReferences: [],
          flashcards: [],
          questions: [],
          taskcards: [],
          mastery: { understanding: 0, recall: 0, application: 0, exam: 0 },
          confidence: 0,
          overallStatus: 'NOT_LEARNED',
          lastReviewed: null,
          nextReview: null,
          interval: 0,
          ease: 2.5,
          repetitions: 0,
          mistakes: [],
          statistics: { timesReviewed: 0, correctAnswers: 0, incorrectAnswers: 0 },
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ 
          mindmapNodes: { ...s.mindmapNodes, [rootNode.id]: rootNode },
          knowledgeNodes: { ...s.knowledgeNodes, [knId]: rootKNode }
        }));
        return mindmap;
      },

      updateMindmap: (id, updates) => {
        set((s) => ({
          mindmaps: {
            ...s.mindmaps,
            [id]: { ...s.mindmaps[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteMindmap: (id) => {
        set((s) => {
          const mindmaps = { ...s.mindmaps };
          delete mindmaps[id];
          const knowledgeNodes = { ...s.knowledgeNodes };
          Object.values(s.mindmapNodes).forEach(n => {
            if (n.mindmapId === id && n.knowledgeNodeId) {
              delete knowledgeNodes[n.knowledgeNodeId];
            }
          });

          const mindmapNodes = Object.fromEntries(
            Object.entries(s.mindmapNodes).filter(([, n]) => n.mindmapId !== id)
          );
          const mindmapEdges = Object.fromEntries(
            Object.entries(s.mindmapEdges).filter(([, e]) => e.mindmapId !== id)
          );
          return { mindmaps, mindmapNodes, mindmapEdges, knowledgeNodes };
        });
      },

      // ─── Nodes ─────────────────────────────────────────────────────────
      createNode: (
        mindmapId,
        projectId,
        title,
        parentId = null,
        position = { x: 100, y: 100 },
        attachments = [],
        fontSize = undefined,
        imageSize = undefined
      ) => {
        const knId = generateId();
        const node: MindmapNode = {
          id: generateId(),
          mindmapId,
          projectId,
          title,
          content: '',
          parentId,
          position,
          knowledgeNodeId: knId,
          linkedFlashcardIds: [],
          linkedTaskcardIds: [],
          linkedNoteIds: [],
          attachments: attachments || [],
          fontSize: fontSize || (parentId === null ? 'lg' : 'md'),
          imageSize: imageSize || 'md',
          createdAt: now(),
          updatedAt: now(),
        };

        const kNode: KnowledgeNode = {
          id: knId,
          projectId,
          title,
          description: '',
          parentId: null, // We would need to look up the parent's knowledgeNodeId to properly nest them in KnowledgeGraph
          children: [],
          relatedNodes: [],
          notes: [],
          sourceReferences: [],
          flashcards: [],
          questions: [],
          taskcards: [],
          mastery: { understanding: 0, recall: 0, application: 0, exam: 0 },
          confidence: 0,
          overallStatus: 'NOT_LEARNED',
          lastReviewed: null,
          nextReview: null,
          interval: 0,
          ease: 2.5,
          repetitions: 0,
          mistakes: [],
          statistics: { timesReviewed: 0, correctAnswers: 0, incorrectAnswers: 0 },
          createdAt: now(),
          updatedAt: now(),
        };

        set((s) => {
          let parentKNodeId = null;
          if (parentId && s.mindmapNodes[parentId]) {
             parentKNodeId = s.mindmapNodes[parentId].knowledgeNodeId;
          }
          const finalKNode = { ...kNode, parentId: parentKNodeId };
          
          const newKNodes = { ...s.knowledgeNodes, [knId]: finalKNode };
          if (parentKNodeId && newKNodes[parentKNodeId]) {
            newKNodes[parentKNodeId] = {
              ...newKNodes[parentKNodeId],
              children: [...newKNodes[parentKNodeId].children, knId],
            };
          }

          return { 
            mindmapNodes: { ...s.mindmapNodes, [node.id]: node },
            knowledgeNodes: newKNodes
          };
        });
        return node;
      },

      updateNode: (id, updates) => {
        set((s) => {
          const mindmapNode = s.mindmapNodes[id];
          if (!mindmapNode) return s;

          const newMindmapNodes = {
            ...s.mindmapNodes,
            [id]: { ...mindmapNode, ...updates, updatedAt: now() },
          };

          let newKnowledgeNodes = s.knowledgeNodes;
          if (updates.title !== undefined && mindmapNode.knowledgeNodeId) {
            const knId = mindmapNode.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode) {
              newKnowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, title: updates.title, updatedAt: now() },
              };
            }
          }

          return { mindmapNodes: newMindmapNodes, knowledgeNodes: newKnowledgeNodes };
        });
      },

      deleteNode: (id) => {
        set((s) => {
          const mindmapNodes = { ...s.mindmapNodes };
          const knowledgeNodes = { ...s.knowledgeNodes };
          
          // Recursively find all child nodes to delete
          const toDelete = new Set<string>();
          const toDeleteKNodes = new Set<string>();

          const collectChildren = (nodeId: string) => {
            toDelete.add(nodeId);
            const knId = mindmapNodes[nodeId]?.knowledgeNodeId;
            if (knId) toDeleteKNodes.add(knId);

            Object.values(mindmapNodes)
              .filter((n) => n.parentId === nodeId)
              .forEach((n) => collectChildren(n.id));
          };
          collectChildren(id);

          toDelete.forEach((nid) => delete mindmapNodes[nid]);
          
          // Delete KnowledgeNodes and clean up parent references
          toDeleteKNodes.forEach((knId) => {
            const kn = knowledgeNodes[knId];
            if (kn && kn.parentId && knowledgeNodes[kn.parentId]) {
              knowledgeNodes[kn.parentId] = {
                ...knowledgeNodes[kn.parentId],
                children: knowledgeNodes[kn.parentId].children.filter((cid) => cid !== knId)
              };
            }
            delete knowledgeNodes[knId];
          });

          const mindmapEdges = Object.fromEntries(
            Object.entries(s.mindmapEdges).filter(
              ([, e]) => !toDelete.has(e.sourceId) && !toDelete.has(e.targetId)
            )
          );
          return { mindmapNodes, mindmapEdges, knowledgeNodes };
        });
      },

      moveNode: (id, position) => {
        set((s) => ({
          mindmapNodes: {
            ...s.mindmapNodes,
            [id]: { ...s.mindmapNodes[id], position, updatedAt: now() },
          },
        }));
      },

      batchMoveNodes: (updates) => {
        set((s) => {
          const mindmapNodes = { ...s.mindmapNodes };
          const timestamp = now();
          for (const u of updates) {
            if (mindmapNodes[u.id]) {
              mindmapNodes[u.id] = {
                ...mindmapNodes[u.id],
                position: u.position,
                updatedAt: timestamp,
              };
            }
          }
          return { mindmapNodes };
        });
      },

      // ─── Edges ─────────────────────────────────────────────────────────
      createEdge: (mindmapId, sourceId, targetId, label) => {
        const state = _get();
        const existing = (Object.values(state.mindmapEdges) as MindmapEdge[]).find(
          (e) => e.mindmapId === mindmapId && e.sourceId === sourceId && e.targetId === targetId
        );
        if (existing) {
          if (label && label !== existing.label) {
            set((s) => ({
              mindmapEdges: {
                ...s.mindmapEdges,
                [existing.id]: { ...existing, label },
              },
            }));
          }
          return existing;
        }

        const edge: MindmapEdge = {
          id: generateId(),
          mindmapId,
          sourceId,
          targetId,
          label: label || '',
        };
        set((s) => ({ mindmapEdges: { ...s.mindmapEdges, [edge.id]: edge } }));
        return edge;
      },

      updateEdge: (id, updates) => {
        set((s) => {
          const existing = s.mindmapEdges[id];
          if (!existing) return s;
          return {
            mindmapEdges: {
              ...s.mindmapEdges,
              [id]: { ...existing, ...updates },
            },
          };
        });
      },

      deleteEdge: (id) => {
        set((s) => {
          const edges = { ...s.mindmapEdges };
          delete edges[id];
          return { mindmapEdges: edges };
        });
      },

      deleteEdgesForNode: (nodeId) => {
        set((s) => ({
          mindmapEdges: Object.fromEntries(
            Object.entries(s.mindmapEdges).filter(
              ([, e]) => e.sourceId !== nodeId && e.targetId !== nodeId
            )
          ),
        }));
      },

      // ─── Notes ─────────────────────────────────────────────────────────
      createNote: (projectId, title = 'Neue Notiz') => {
        const note: Note = {
          id: generateId(),
          projectId,
          title,
          content: '',
          linkedNodeIds: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ notes: { ...s.notes, [note.id]: note } }));
        return note;
      },

      updateNote: (id, updates) => {
        set((s) => ({
          notes: {
            ...s.notes,
            [id]: { ...s.notes[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteNote: (id) => {
        set((s) => {
          const notes = { ...s.notes };
          delete notes[id];
          // Remove from node links
          const mindmapNodes = Object.fromEntries(
            Object.entries(s.mindmapNodes).map(([nid, n]) => [
              nid,
              { ...n, linkedNoteIds: n.linkedNoteIds.filter((lid) => lid !== id) },
            ])
          );
          return { notes, mindmapNodes };
        });
      },

      // ─── Flashcards ────────────────────────────────────────────────────
      createFlashcard: (projectId, front, back) => {
        const card: Flashcard = {
          id: generateId(),
          projectId,
          front,
          back,
          linkedNodeIds: [],
          difficulty: null,
          lastReviewed: null,
          reviewCount: 0,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ flashcards: { ...s.flashcards, [card.id]: card } }));
        return card;
      },

      updateFlashcard: (id, updates) => {
        set((s) => ({
          flashcards: {
            ...s.flashcards,
            [id]: { ...s.flashcards[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteFlashcard: (id) => {
        set((s) => {
          const flashcards = { ...s.flashcards };
          delete flashcards[id];
          const mindmapNodes = Object.fromEntries(
            Object.entries(s.mindmapNodes).map(([nid, n]) => [
              nid,
              { ...n, linkedFlashcardIds: n.linkedFlashcardIds.filter((lid) => lid !== id) },
            ])
          );
          return { flashcards, mindmapNodes };
        });
      },

      // ─── Taskcards ────────────────────────────────────────────────────
      createTaskcard: (projectId, title = '', position = { x: 40, y: 40 }) => {
        const card: Taskcard = {
          id: generateId(),
          projectId,
          title,
          content: '',
          position,
          color: 'default',
          width: 220,
          height: 120,
          linkedNodeIds: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ taskcards: { ...s.taskcards, [card.id]: card } }));
        return card;
      },

      updateTaskcard: (id, updates) => {
        set((s) => ({
          taskcards: {
            ...s.taskcards,
            [id]: { ...s.taskcards[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteTaskcard: (id) => {
        set((s) => {
          const taskcards = { ...s.taskcards };
          delete taskcards[id];
          const mindmapNodes = Object.fromEntries(
            Object.entries(s.mindmapNodes).map(([nid, n]) => [
              nid,
              { ...n, linkedTaskcardIds: n.linkedTaskcardIds.filter((lid) => lid !== id) },
            ])
          );
          return { taskcards, mindmapNodes };
        });
      },

      // ─── Linking ───────────────────────────────────────────────────────
      linkNoteToNode: (noteId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const note = s.notes[noteId];
          if (!node || !note) return s;

          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: {
                ...node,
                linkedNoteIds: node.linkedNoteIds.includes(noteId) ? node.linkedNoteIds : [...node.linkedNoteIds, noteId],
                updatedAt: now(),
              },
            },
            notes: {
              ...s.notes,
              [noteId]: {
                ...note,
                linkedNodeIds: note.linkedNodeIds.includes(nodeId) ? note.linkedNodeIds : [...note.linkedNodeIds, nodeId],
                updatedAt: now(),
              },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode && !kNode.notes.includes(noteId)) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, notes: [...kNode.notes, noteId], updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      unlinkNoteFromNode: (noteId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const note = s.notes[noteId];
          if (!node || !note) return s;
          
          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: { ...node, linkedNoteIds: node.linkedNoteIds.filter((id) => id !== noteId), updatedAt: now() },
            },
            notes: {
              ...s.notes,
              [noteId]: { ...note, linkedNodeIds: note.linkedNodeIds.filter((id) => id !== nodeId), updatedAt: now() },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, notes: kNode.notes.filter((id) => id !== noteId), updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      linkFlashcardToNode: (flashcardId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const card = s.flashcards[flashcardId];
          if (!node || !card) return s;

          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: {
                ...node,
                linkedFlashcardIds: node.linkedFlashcardIds.includes(flashcardId) ? node.linkedFlashcardIds : [...node.linkedFlashcardIds, flashcardId],
                updatedAt: now(),
              },
            },
            flashcards: {
              ...s.flashcards,
              [flashcardId]: {
                ...card,
                linkedNodeIds: card.linkedNodeIds.includes(nodeId) ? card.linkedNodeIds : [...card.linkedNodeIds, nodeId],
                updatedAt: now(),
              },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode && !kNode.flashcards.includes(flashcardId)) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, flashcards: [...kNode.flashcards, flashcardId], updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      unlinkFlashcardFromNode: (flashcardId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const card = s.flashcards[flashcardId];
          if (!node || !card) return s;

          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: { ...node, linkedFlashcardIds: node.linkedFlashcardIds.filter((id) => id !== flashcardId), updatedAt: now() },
            },
            flashcards: {
              ...s.flashcards,
              [flashcardId]: { ...card, linkedNodeIds: card.linkedNodeIds.filter((id) => id !== nodeId), updatedAt: now() },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, flashcards: kNode.flashcards.filter((id) => id !== flashcardId), updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      linkTaskcardToNode: (taskcardId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const card = s.taskcards[taskcardId];
          if (!node || !card) return s;

          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: {
                ...node,
                linkedTaskcardIds: node.linkedTaskcardIds.includes(taskcardId) ? node.linkedTaskcardIds : [...node.linkedTaskcardIds, taskcardId],
                updatedAt: now(),
              },
            },
            taskcards: {
              ...s.taskcards,
              [taskcardId]: {
                ...card,
                linkedNodeIds: card.linkedNodeIds.includes(nodeId) ? card.linkedNodeIds : [...card.linkedNodeIds, nodeId],
                updatedAt: now(),
              },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode && !kNode.taskcards.includes(taskcardId)) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, taskcards: [...kNode.taskcards, taskcardId], updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      unlinkTaskcardFromNode: (taskcardId, nodeId) => {
        set((s) => {
          const node = s.mindmapNodes[nodeId];
          const card = s.taskcards[taskcardId];
          if (!node || !card) return s;

          const newState: Partial<StoreState> = {
            mindmapNodes: {
              ...s.mindmapNodes,
              [nodeId]: { ...node, linkedTaskcardIds: node.linkedTaskcardIds.filter((id) => id !== taskcardId), updatedAt: now() },
            },
            taskcards: {
              ...s.taskcards,
              [taskcardId]: { ...card, linkedNodeIds: card.linkedNodeIds.filter((id) => id !== nodeId), updatedAt: now() },
            },
          };

          if (node.knowledgeNodeId) {
            const knId = node.knowledgeNodeId;
            const kNode = s.knowledgeNodes[knId];
            if (kNode) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [knId]: { ...kNode, taskcards: kNode.taskcards.filter((id) => id !== taskcardId), updatedAt: now() },
              };
            }
          }

          return newState;
        });
      },

      // ─── Drawings ──────────────────────────────────────────────────────
      setDrawings: (canvasId, strokes) => {
        set((s) => ({ drawings: { ...s.drawings, [canvasId]: strokes } }));
      },

      clearDrawings: (canvasId) => {
        set((s) => {
          const drawings = { ...s.drawings };
          delete drawings[canvasId];
          return { drawings };
        });
      },

      // ─── Knowledge Graph ────────────────────────────────────────────────
      createKnowledgeNode: (projectId, title, description = '', parentId = null) => {
        const node: KnowledgeNode = {
          id: generateId(),
          projectId,
          title,
          description,
          parentId,
          children: [],
          relatedNodes: [],
          notes: [],
          sourceReferences: [],
          flashcards: [],
          questions: [],
          taskcards: [],
          mastery: { understanding: 0, recall: 0, application: 0, exam: 0 },
          confidence: 0,
          overallStatus: 'NOT_LEARNED',
          lastReviewed: null,
          nextReview: null,
          interval: 0,
          ease: 2.5,
          repetitions: 0,
          mistakes: [],
          statistics: { timesReviewed: 0, correctAnswers: 0, incorrectAnswers: 0 },
          createdAt: now(),
          updatedAt: now(),
        };

        set((s) => {
          const newState = { knowledgeNodes: { ...s.knowledgeNodes, [node.id]: node } };
          if (parentId && s.knowledgeNodes[parentId]) {
            const parent = s.knowledgeNodes[parentId];
            newState.knowledgeNodes[parentId] = {
              ...parent,
              children: [...parent.children, node.id],
              updatedAt: now(),
            };
          }
          return newState;
        });

        return node;
      },

      updateKnowledgeNode: (id, updates) => {
        set((s) => ({
          knowledgeNodes: {
            ...s.knowledgeNodes,
            [id]: { ...s.knowledgeNodes[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteKnowledgeNode: (id) => {
        set((s) => {
          const knowledgeNodes = { ...s.knowledgeNodes };
          const toDelete = new Set<string>();

          // Recursively find all children
          const collectChildren = (nodeId: string) => {
            toDelete.add(nodeId);
            const node = knowledgeNodes[nodeId];
            if (node) {
              node.children.forEach(collectChildren);
            }
          };
          collectChildren(id);

          const parentId = knowledgeNodes[id]?.parentId;
          if (parentId && knowledgeNodes[parentId]) {
            knowledgeNodes[parentId] = {
              ...knowledgeNodes[parentId],
              children: knowledgeNodes[parentId].children.filter((cid) => cid !== id),
              updatedAt: now(),
            };
          }

          toDelete.forEach((nid) => delete knowledgeNodes[nid]);

          // Also need to cascade delete related entities later, but for Phase 1 this is fine.
          return { knowledgeNodes };
        });
      },

      // ─── Learning Events ───────────────────────────────────────────────
      recordLearningEvent: (projectId, knowledgeNodeId, type, result, difficulty) => {
        const event = {
          id: generateId(),
          projectId,
          knowledgeNodeId,
          type,
          result,
          difficulty,
          timestamp: now()
        };

        set((s) => {
          const newState: Partial<StoreState> = { learningEvents: { ...s.learningEvents, [event.id]: event } };
          const kNode = s.knowledgeNodes[knowledgeNodeId];
          
          if (kNode) {
            // Update simple statistics
            const isCorrect = result === 'correct';
            const isIncorrect = result === 'incorrect';
            
            // Phase 5: Update Mastery
            const newMastery = { ...kNode.mastery };
            const adjustment = isCorrect ? 10 : isIncorrect ? -15 : 0;
            
            if (type === 'flashcard' || type === 'free_recall') {
              newMastery.recall = Math.max(0, Math.min(100, newMastery.recall + adjustment));
            } else if (type === 'quiz') {
              newMastery.understanding = Math.max(0, Math.min(100, newMastery.understanding + adjustment));
            } else if (type === 'exam') {
              newMastery.exam = Math.max(0, Math.min(100, newMastery.exam + adjustment));
            } else if (type === 'question') {
              // Assume application or understanding depending on some future question properties, default to application
              newMastery.application = Math.max(0, Math.min(100, newMastery.application + adjustment));
            }

            // Calculate overallStatus based on mastery average
            const avgMastery = (newMastery.understanding + newMastery.recall + newMastery.application + newMastery.exam) / 4;
            let overallStatus: import('../types').MasteryLevel = 'NOT_LEARNED';
            if (avgMastery > 80) overallStatus = 'MASTERED';
            else if (avgMastery > 50) overallStatus = 'KNOWN';
            else if (avgMastery > 20) overallStatus = 'LEARNING';
            else if (avgMastery > 0) overallStatus = 'WEAK';

            newState.knowledgeNodes = {
              ...s.knowledgeNodes,
              [knowledgeNodeId]: {
                ...kNode,
                mastery: newMastery,
                overallStatus,
                statistics: {
                  ...kNode.statistics,
                  timesReviewed: kNode.statistics.timesReviewed + 1,
                  correctAnswers: kNode.statistics.correctAnswers + (isCorrect ? 1 : 0),
                  incorrectAnswers: kNode.statistics.incorrectAnswers + (isIncorrect ? 1 : 0),
                }
              }
            };
          }

          return newState;
        });

        return event;
      },

      // ─── Spaced Repetition ─────────────────────────────────────────────
      reviewKnowledgeNode: (id, rating) => {
        set((s) => {
          const kNode = s.knowledgeNodes[id];
          if (!kNode) return s;

          let { interval, ease, repetitions } = kNode;

          if (rating === 'again') {
            repetitions = 0;
            interval = 1; // 1 day or immediately
            ease = Math.max(1.3, ease - 0.2);
          } else {
            repetitions += 1;
            if (repetitions === 1) {
              interval = 1;
            } else if (repetitions === 2) {
              interval = 6;
            } else {
              interval = Math.round(interval * ease);
            }

            if (rating === 'hard') {
              ease = Math.max(1.3, ease - 0.15);
            } else if (rating === 'easy') {
              ease += 0.15;
            }
          }

          // Calculate next review date
          const nextReviewDate = new Date();
          nextReviewDate.setDate(nextReviewDate.getDate() + interval);

          return {
            knowledgeNodes: {
              ...s.knowledgeNodes,
              [id]: {
                ...kNode,
                interval,
                ease,
                repetitions,
                lastReviewed: now(),
                nextReview: nextReviewDate.toISOString(),
                updatedAt: now(),
              },
            },
          };
        });
      },

      // ─── Fehlerprotokoll ────────────────────────────────────────────────
      logMistake: (projectId, knowledgeNodeId, description, category, questionId, flashcardId) => {
        const mistake = {
          id: generateId(),
          projectId,
          knowledgeNodeId,
          description,
          category,
          questionId,
          flashcardId,
          timestamp: now(),
        };

        set((s) => {
          const newState: Partial<StoreState> = { mistakes: { ...s.mistakes, [mistake.id]: mistake } };
          const kNode = s.knowledgeNodes[knowledgeNodeId];
          
          if (kNode) {
            newState.knowledgeNodes = {
              ...s.knowledgeNodes,
              [knowledgeNodeId]: {
                ...kNode,
                mistakes: [...kNode.mistakes, mistake.id],
                updatedAt: now(),
              },
            };
          }
          return newState;
        });

        return mistake;
      },

      // ─── Aufgabenbank (Questions) ───────────────────────────────────────
      createQuestion: (projectId, knowledgeNodeId, type, difficulty, questionText, answer, explanation, source, points = 1, isOriginalExamQuestion = false) => {
        const question = {
          id: generateId(),
          projectId,
          knowledgeNodeId,
          type,
          difficulty,
          question: questionText,
          answer,
          explanation,
          source,
          isOriginalExamQuestion,
          points,
          createdAt: now(),
          updatedAt: now(),
        };

        set((s) => {
          const newState: Partial<StoreState> = { questions: { ...s.questions, [question.id]: question } };
          const kNode = s.knowledgeNodes[knowledgeNodeId];
          if (kNode) {
            newState.knowledgeNodes = {
              ...s.knowledgeNodes,
              [knowledgeNodeId]: { ...kNode, questions: [...kNode.questions, question.id], updatedAt: now() },
            };
          }
          return newState;
        });

        return question;
      },

      updateQuestion: (id, updates) => {
        set((s) => ({
          questions: {
            ...s.questions,
            [id]: { ...s.questions[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteQuestion: (id) => {
        set((s) => {
          const questions = { ...s.questions };
          const question = questions[id];
          delete questions[id];
          
          const newState: Partial<StoreState> = { questions };

          if (question && question.knowledgeNodeId) {
            const kNode = s.knowledgeNodes[question.knowledgeNodeId];
            if (kNode) {
              newState.knowledgeNodes = {
                ...s.knowledgeNodes,
                [question.knowledgeNodeId]: {
                  ...kNode,
                  questions: kNode.questions.filter((qid) => qid !== id),
                  updatedAt: now(),
                },
              };
            }
          }

          return newState;
        });
      },

      // ─── Klausuren (Exams) ──────────────────────────────────────────────
      createExam: (projectId, title, date, subject, topicIds, durationMinutes, totalPoints) => {
        const exam = {
          id: generateId(),
          projectId,
          title,
          date,
          subject,
          topicIds,
          durationMinutes,
          totalPoints,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ exams: { ...s.exams, [exam.id]: exam } }));
        return exam;
      },

      updateExam: (id, updates) => {
        set((s) => ({
          exams: {
            ...s.exams,
            [id]: { ...s.exams[id], ...updates, updatedAt: now() },
          },
        }));
      },

      deleteExam: (id) => {
        set((s) => {
          const exams = { ...s.exams };
          delete exams[id];
          return { exams };
        });
      },

      recordExamResult: (projectId, examId, score, maxScore, topicScores, problematicNodes) => {
        const examResult = {
          id: generateId(),
          projectId,
          examId,
          score,
          maxScore,
          topicScores,
          problematicNodes,
          timestamp: now(),
        };
        set((s) => ({ examResults: { ...s.examResults, [examResult.id]: examResult } }));
        return examResult;
      },

      // ─── Timelines ──────────────────────────────────────────────────────
      createTimeline: (projectId, title, description = '') => {
        const timeline: Timeline = {
          id: generateId(),
          projectId,
          title,
          description,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({
          timelines: { ...(s.timelines || {}), [timeline.id]: timeline },
        }));
        return timeline;
      },

      updateTimeline: (id, updates) => {
        set((s) => {
          const current = s.timelines?.[id];
          if (!current) return s;
          return {
            timelines: {
              ...s.timelines,
              [id]: { ...current, ...updates, updatedAt: now() },
            },
          };
        });
      },

      deleteTimeline: (id) => {
        set((s) => {
          const timelines = { ...s.timelines };
          delete timelines[id];
          const timelineEvents = Object.fromEntries(
            Object.entries(s.timelineEvents || {}).filter(([, te]) => te.timelineId !== id)
          );
          return { timelines, timelineEvents };
        });
      },

      // ─── Timeline Events ────────────────────────────────────────────────
      createTimelineEvent: (timelineId, projectId, data) => {
        const event: TimelineEvent = {
          id: generateId(),
          timelineId,
          projectId,
          title: data.title,
          description: data.description || '',
          date: data.date,
          endDate: data.endDate,
          category: data.category,
          color: data.color || 'blue',
          importance: data.importance || 'medium',
          linkedNodeIds: data.linkedNodeIds || [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({
          timelineEvents: { ...(s.timelineEvents || {}), [event.id]: event },
          timelines: s.timelines?.[timelineId]
            ? {
                ...s.timelines,
                [timelineId]: { ...s.timelines[timelineId], updatedAt: now() },
              }
            : s.timelines,
        }));
        return event;
      },

      updateTimelineEvent: (id, updates) => {
        set((s) => {
          const current = s.timelineEvents?.[id];
          if (!current) return s;
          const updated = { ...current, ...updates, updatedAt: now() };
          return {
            timelineEvents: {
              ...s.timelineEvents,
              [id]: updated,
            },
            timelines: s.timelines?.[current.timelineId]
              ? {
                  ...s.timelines,
                  [current.timelineId]: { ...s.timelines[current.timelineId], updatedAt: now() },
                }
              : s.timelines,
          };
        });
      },

      deleteTimelineEvent: (id) => {
        set((s) => {
          const timelineEvents = { ...s.timelineEvents };
          const event = timelineEvents[id];
          delete timelineEvents[id];
          return {
            timelineEvents,
            timelines: event && s.timelines?.[event.timelineId]
              ? {
                  ...s.timelines,
                  [event.timelineId]: { ...s.timelines[event.timelineId], updatedAt: now() },
                }
              : s.timelines,
          };
        });
      },
    }),
    {
      name: 'learnmap-storage',
      storage: createJSONStorage(() => diskAndLocalStorage),
    }
  )
);

/**
 * Safely imports and applies an entire state payload into the Zustand store
 * and persists it to both localStorage and local file on disk
 */
export function importFullState(payload: any, persistToDisk = true): boolean {
  if (!payload) return false;
  try {
    const rawState = payload.state ? payload.state : payload;
    if (typeof rawState !== 'object') return false;

    setSyncPaused(true);
    try {
      useStore.setState((current) => ({
        ...current,
        projects: rawState.projects ?? current.projects,
        mindmaps: rawState.mindmaps ?? current.mindmaps,
        mindmapNodes: rawState.mindmapNodes ?? current.mindmapNodes,
        mindmapEdges: rawState.mindmapEdges ?? current.mindmapEdges,
        notes: rawState.notes ?? current.notes,
        flashcards: rawState.flashcards ?? current.flashcards,
        taskcards: rawState.taskcards ?? current.taskcards,
        drawings: rawState.drawings ?? current.drawings,
        knowledgeNodes: rawState.knowledgeNodes ?? current.knowledgeNodes,
        learningEvents: rawState.learningEvents ?? current.learningEvents,
        questions: rawState.questions ?? current.questions,
        mistakes: rawState.mistakes ?? current.mistakes,
        exams: rawState.exams ?? current.exams,
        examResults: rawState.examResults ?? current.examResults,
        timelines: rawState.timelines ?? current.timelines ?? {},
        timelineEvents: rawState.timelineEvents ?? current.timelineEvents ?? {},
      }));
    } finally {
      setSyncPaused(false);
    }

    if (persistToDisk) {
      const fullState = useStore.getState();
      saveToDisk({ state: fullState, version: 0 });
    }
    return true;
  } catch (err) {
    console.error('Failed to import full state:', err);
    return false;
  }
}

/**
 * Synchronize store with local disk file on startup
 */
export async function initStorage(): Promise<void> {
  try {
    const diskData = await loadFromDisk();
    const currentState = useStore.getState();
    const storeProjectCount = Object.keys(currentState.projects || {}).length;

    if (diskData) {
      const diskState = diskData.state || diskData;
      const diskProjects = diskState.projects || {};
      const diskProjectCount = Object.keys(diskProjects).length;

      // If store is empty but disk has data (e.g. port changed or cache cleared): load from disk
      if (storeProjectCount === 0 && diskProjectCount > 0) {
        importFullState(diskData, false);
        return;
      }

      // If both have projects, check newest updated timestamp
      const getLatestUpdate = (projectsObj: Record<string, { updatedAt?: string }>) => {
        let max = '';
        for (const p of Object.values(projectsObj)) {
          if (p.updatedAt && p.updatedAt > max) max = p.updatedAt;
        }
        return max;
      };

      const storeLatest = getLatestUpdate(currentState.projects);
      const diskLatest = getLatestUpdate(diskProjects);

      if (diskLatest > storeLatest) {
        importFullState(diskData, false);
      } else if (storeProjectCount > 0 && storeLatest > diskLatest) {
        saveToDisk({ state: currentState, version: 0 });
      }
    } else if (storeProjectCount > 0) {
      // Disk file didn't exist yet, but store has data: persist to disk right now!
      saveToDisk({ state: currentState, version: 0 });
    }
  } catch (err) {
    console.warn('initStorage failed:', err);
  }
}

// Selector hooks for convenience
export const useProjects = () => {
  const projects = useStore((s) => s.projects);
  return useMemo(
    () => Object.values(projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects]
  );
};

export const useProject = (id: ID) => useStore((s) => s.projects[id]);

export const useMindmapsByProject = (projectId: ID) => {
  const mindmaps = useStore((s) => s.mindmaps);
  return useMemo(
    () => Object.values(mindmaps).filter((m) => m.projectId === projectId),
    [mindmaps, projectId]
  );
};

export const useMindmap = (id: ID) => useStore((s) => s.mindmaps[id]);

export const useNodesByMindmap = (mindmapId: ID) => {
  const mindmapNodes = useStore((s) => s.mindmapNodes);
  return useMemo(
    () => Object.values(mindmapNodes).filter((n) => n.mindmapId === mindmapId),
    [mindmapNodes, mindmapId]
  );
};

export const useEdgesByMindmap = (mindmapId: ID) => {
  const mindmapEdges = useStore((s) => s.mindmapEdges);
  return useMemo(
    () => Object.values(mindmapEdges).filter((e) => e.mindmapId === mindmapId),
    [mindmapEdges, mindmapId]
  );
};

export const useNode = (id: ID) => useStore((s) => s.mindmapNodes[id]);

export const useNotesByProject = (projectId: ID) => {
  const notes = useStore((s) => s.notes);
  return useMemo(
    () => Object.values(notes).filter((n) => n.projectId === projectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes, projectId]
  );
};

export const useNote = (id: ID) => useStore((s) => s.notes[id]);

export const useFlashcardsByProject = (projectId: ID) => {
  const flashcards = useStore((s) => s.flashcards);
  return useMemo(
    () => Object.values(flashcards).filter((f) => f.projectId === projectId),
    [flashcards, projectId]
  );
};

export const useFlashcard = (id: ID) => useStore((s) => s.flashcards[id]);

export const useTaskcardsByProject = (projectId: ID) => {
  const taskcards = useStore((s) => s.taskcards);
  return useMemo(
    () => Object.values(taskcards).filter((t) => t.projectId === projectId),
    [taskcards, projectId]
  );
};

export const useKnowledgeNodesByProject = (projectId: ID) => {
  const knowledgeNodes = useStore((s) => s.knowledgeNodes);
  return useMemo(
    () => Object.values(knowledgeNodes).filter((kn) => kn.projectId === projectId),
    [knowledgeNodes, projectId]
  );
};

export const useKnowledgeNode = (id: ID) => useStore((s) => s.knowledgeNodes[id]);

export const useLearningEventsByProject = (projectId: ID) => {
  const events = useStore((s) => s.learningEvents);
  return useMemo(
    () => Object.values(events).filter((e) => e.projectId === projectId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [events, projectId]
  );
};

export const useTimeline = (id: ID) => useStore((s) => s.timelines?.[id]);

export const useTimelinesByProject = (projectId: ID) => {
  const timelines = useStore((s) => s.timelines);
  return useMemo(
    () =>
      Object.values(timelines || {})
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [timelines, projectId]
  );
};

export const useTimelineEventsByTimeline = (timelineId: ID) => {
  const events = useStore((s) => s.timelineEvents);
  return useMemo(
    () => Object.values(events || {}).filter((e) => e.timelineId === timelineId),
    [events, timelineId]
  );
};
