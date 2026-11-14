import React, { useState } from 'react';
import { useStore } from '../../store';
import { Plus, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { QuestionType, LearningEventDifficulty } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';

const QUESTION_TYPES: QuestionType[] = [
  'Definition', 'Erklärung', 'Vergleich', 'Ursache/Wirkung',
  'Reihenfolge', 'Anwendung', 'Transfer', 'Multiple Choice', 'offene Frage'
];
const DIFFICULTIES: LearningEventDifficulty[] = ['easy', 'medium', 'hard'];
const diffLabel = (d: LearningEventDifficulty) =>
  d === 'easy' ? 'Einfach' : d === 'medium' ? 'Mittel' : 'Schwer';
const diffColor = (d: LearningEventDifficulty) =>
  d === 'easy' ? 'text-green-600' : d === 'medium' ? 'text-yellow-600' : 'text-red-500';

interface QuestionFormState {
  knowledgeNodeId: string;
  type: QuestionType;
  difficulty: LearningEventDifficulty;
  question: string;
  answer: string;
  explanation: string;
  source: string;
  points: number;
}

const emptyForm = (): QuestionFormState => ({
  knowledgeNodeId: '',
  type: 'Definition',
  difficulty: 'medium',
  question: '',
  answer: '',
  explanation: '',
  source: '',
  points: 5,
});

export const QuestionsPage: React.FC = () => {
  const { questions, knowledgeNodes, projects, createQuestion, updateQuestion, deleteQuestion } = useStore();

  const [filterProject, setFilterProject] = useState('all');
  const [filterType, setFilterType] = useState<QuestionType | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<LearningEventDifficulty | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionFormState>(emptyForm());

  const projectList = Object.values(projects);
  const questionList = Object.values(questions).sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt)
  );

  const filtered = questionList.filter(q => {
    if (filterProject !== 'all' && q.projectId !== filterProject) return false;
    if (filterType !== 'all' && q.type !== filterType) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const openCreate = (projectId?: string) => {
    setEditId(null);
    setForm({ ...emptyForm(), knowledgeNodeId: '', ...(projectId ? {} : {}) });
    setModalOpen(true);
  };

  const openEdit = (id: string) => {
    const q = questions[id];
    if (!q) return;
    setEditId(id);
    setForm({
      knowledgeNodeId: q.knowledgeNodeId,
      type: q.type,
      difficulty: q.difficulty,
      question: q.question,
      answer: q.answer,
      explanation: q.explanation ?? '',
      source: q.source ?? '',
      points: q.points,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim() || !form.knowledgeNodeId) return;
    if (editId) {
      updateQuestion(editId, {
        knowledgeNodeId: form.knowledgeNodeId,
        type: form.type,
        difficulty: form.difficulty,
        question: form.question,
        answer: form.answer,
        explanation: form.explanation || undefined,
        source: form.source || undefined,
        points: form.points,
      });
    } else {
      // Use first project if not filtered
      const projectId = filterProject !== 'all' ? filterProject : projectList[0]?.id;
      if (!projectId) return;
      createQuestion(
        projectId,
        form.knowledgeNodeId,
        form.type,
        form.difficulty,
        form.question,
        form.answer,
        form.explanation || undefined,
        form.source || undefined,
        form.points
      );
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Aufgabe löschen?')) deleteQuestion(id);
  };

  // Nodes available for current filter
  const availableNodes = Object.values(knowledgeNodes).filter(n =>
    filterProject === 'all' || n.projectId === filterProject
  );

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-text-primary mb-1">Aufgabenbank</h1>
            <p className="text-[13px] text-text-secondary">{questionList.length} Aufgaben gesamt</p>
          </div>
          <Button onClick={() => openCreate()} size="sm">
            <Plus size={12} className="mr-1" />
            Neue Aufgabe
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="text-[12px] bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary"
          >
            <option value="all">Alle Projekte</option>
            {projectList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="text-[12px] bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary"
          >
            <option value="all">Alle Typen</option>
            {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value as any)}
            className="text-[12px] bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary"
          >
            <option value="all">Alle Schwierigkeiten</option>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{diffLabel(d)}</option>)}
          </select>
          <span className="text-[11px] text-text-disabled ml-auto self-center">{filtered.length} Aufgaben</span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <p className="text-[13px] text-text-secondary mb-2">Keine Aufgaben vorhanden</p>
            <p className="text-[12px] text-text-disabled mb-4">Erstelle deine erste Aufgabe für eine sinnvolle Prüfungsvorbereitung</p>
            <Button size="sm" onClick={() => openCreate()}>
              <Plus size={12} className="mr-1" /> Aufgabe erstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(q => {
              const node = knowledgeNodes[q.knowledgeNodeId];
              const isOpen = expandedId === q.id;
              return (
                <div
                  key={q.id}
                  className="border border-border rounded-lg bg-bg-canvas hover:bg-bg-secondary transition-colors"
                >
                  <button
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                    onClick={() => setExpandedId(isOpen ? null : q.id)}
                  >
                    <ChevronDown
                      size={14}
                      className={cn("mt-0.5 text-text-disabled shrink-0 transition-transform", isOpen && "rotate-180")}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-[10px] font-medium", diffColor(q.difficulty))}>
                          {diffLabel(q.difficulty)}
                        </span>
                        <span className="text-[10px] text-text-disabled">·</span>
                        <span className="text-[10px] text-text-disabled">{q.type}</span>
                        {node && (
                          <>
                            <span className="text-[10px] text-text-disabled">·</span>
                            <span className="text-[10px] text-text-secondary">{node.title}</span>
                          </>
                        )}
                        <span className="ml-auto text-[10px] text-text-disabled">{q.points} Pkt.</span>
                      </div>
                      <p className="text-[13px] text-text-primary leading-snug">{q.question}</p>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border mt-0 pt-3">
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-disabled mb-1">Musterlösung</p>
                        <p className="text-[13px] text-text-primary whitespace-pre-wrap">{q.answer}</p>
                      </div>
                      {q.explanation && (
                        <div className="mb-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-disabled mb-1">Erklärung</p>
                          <p className="text-[12px] text-text-secondary">{q.explanation}</p>
                        </div>
                      )}
                      {q.source && (
                        <p className="text-[11px] text-text-disabled mb-3">Quelle: {q.source}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(q.id)}
                          className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary border border-border rounded px-2 py-1"
                        >
                          <Edit2 size={10} /> Bearbeiten
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 border border-border rounded px-2 py-1"
                        >
                          <Trash2 size={10} /> Löschen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Aufgabe bearbeiten" : "Neue Aufgabe"} size="xl">
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Knowledge Node */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Thema (Knowledge Node) *</label>
            <select
              value={form.knowledgeNodeId}
              onChange={e => setForm(f => ({ ...f, knowledgeNodeId: e.target.value }))}
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
            >
              <option value="">Thema wählen...</option>
              {availableNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>

          {/* Row: type + difficulty + points */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Typ</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as QuestionType }))}
                className="w-full text-[12px] bg-bg-secondary border border-border rounded px-2 py-2 text-text-primary"
              >
                {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Schwierigkeit</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as LearningEventDifficulty }))}
                className="w-full text-[12px] bg-bg-secondary border border-border rounded px-2 py-2 text-text-primary"
              >
                {DIFFICULTIES.map(d => <option key={d} value={d}>{diffLabel(d)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Punkte</label>
              <input
                type="number"
                min={1}
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: parseInt(e.target.value) || 1 }))}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
          </div>

          {/* Question */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Fragestellung *</label>
            <textarea
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              rows={3}
              placeholder="Formuliere eine klare, prüfungsähnliche Frage..."
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary resize-none"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Musterlösung *</label>
            <textarea
              value={form.answer}
              onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              rows={4}
              placeholder="Vollständige Musterantwort..."
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary resize-none"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Erklärung (optional)</label>
            <textarea
              value={form.explanation}
              onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              rows={2}
              placeholder="Zusätzliche Erläuterungen oder Hinweise..."
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary resize-none"
            />
          </div>

          {/* Source */}
          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Quelle (optional)</label>
            <input
              type="text"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              placeholder="z.B. Lehrbuch S. 42 oder Klausur 2024"
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.question.trim() || !form.answer.trim() || !form.knowledgeNodeId}>
              {editId ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
