import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Plus, Play, Trash2, CalendarDays, Clock, BookOpen } from 'lucide-react';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { cn } from '../../utils/cn';

interface ExamFormState {
  title: string;
  date: string;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  topicIds: string[];
  projectId: string;
}

const emptyForm = (): ExamFormState => ({
  title: '',
  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  subject: '',
  durationMinutes: 90,
  totalPoints: 60,
  topicIds: [],
  projectId: '',
});

export const ExamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { exams, examResults, projects, knowledgeNodes, createExam, deleteExam } = useStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ExamFormState>(emptyForm());

  const projectList = Object.values(projects);
  const examList = Object.values(exams).sort((a, b) => a.date.localeCompare(b.date));

  const availableNodes = Object.values(knowledgeNodes).filter(
    n => !form.projectId || n.projectId === form.projectId
  );

  const toggleTopic = (id: string) => {
    setForm(f => ({
      ...f,
      topicIds: f.topicIds.includes(id)
        ? f.topicIds.filter(t => t !== id)
        : [...f.topicIds, id],
    }));
  };

  const handleCreate = () => {
    if (!form.title.trim() || !form.projectId) return;
    createExam(
      form.projectId,
      form.title,
      form.date,
      form.subject || form.title,
      form.topicIds,
      form.durationMinutes,
      form.totalPoints
    );
    setModalOpen(false);
    setForm(emptyForm());
  };

  const handleDelete = (id: string) => {
    if (confirm('Klausur löschen?')) deleteExam(id);
  };

  // Days until exam
  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Last result for exam
  const lastResult = (examId: string) => {
    return Object.values(examResults)
      .filter(r => r.examId === examId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  };

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-text-primary mb-1">Klausuren</h1>
            <p className="text-[13px] text-text-secondary">{examList.length} Klausuren angelegt</p>
          </div>
          <Button onClick={() => setModalOpen(true)} size="sm">
            <Plus size={12} className="mr-1" />
            Neue Klausur
          </Button>
        </div>

        {examList.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <BookOpen size={28} className="text-text-disabled mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary mb-2">Noch keine Klausuren</p>
            <p className="text-[12px] text-text-disabled mb-4">Lege eine bevorstehende Klausur an, um einen Lernplan zu erhalten</p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={12} className="mr-1" /> Erste Klausur anlegen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {examList.map(exam => {
              const days = daysUntil(exam.date);
              const result = lastResult(exam.id);
              const project = projects[exam.projectId];
              const topics = exam.topicIds.map(id => knowledgeNodes[id]).filter(Boolean);

              return (
                <div key={exam.id} className="border border-border rounded-lg p-4 bg-bg-canvas hover:bg-bg-secondary transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[14px] font-medium text-text-primary">{exam.title}</h3>
                        {days >= 0 && days <= 3 && (
                          <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-medium">
                            Bald!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-text-disabled mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarDays size={10} />
                          {new Date(exam.date).toLocaleDateString('de-DE')}
                          {days >= 0 ? ` (in ${days} Tagen)` : ` (vor ${Math.abs(days)} Tagen)`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {exam.durationMinutes} Min.
                        </span>
                        <span>{exam.totalPoints} Punkte</span>
                        {project && <span>{project.title}</span>}
                      </div>

                      {topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {topics.map(t => (
                            <span key={t.id} className="text-[10px] bg-bg-tertiary border border-border rounded px-1.5 py-0.5 text-text-secondary">
                              {t.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {result && (
                        <div className="text-[11px] text-text-secondary">
                          Letztes Ergebnis: <strong>{result.score}/{result.maxScore}</strong> Punkte
                          ({Math.round((result.score / result.maxScore) * 100)}%)
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/exams/${exam.id}/simulate`)}
                      >
                        <Play size={11} className="mr-1" />
                        Simulation
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/exams/${exam.id}/plan`)}
                      >
                        Lernplan
                      </Button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="text-[11px] text-text-disabled hover:text-red-500 flex items-center gap-1 justify-center"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Neue Klausur" size="xl">
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Titel *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="z.B. Biologie Klausur"
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Fach</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="z.B. Biologie"
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Datum *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Dauer (Min.)</label>
              <input
                type="number"
                min={10}
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 60 }))}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-1">Gesamtpunkte</label>
              <input
                type="number"
                min={1}
                value={form.totalPoints}
                onChange={e => setForm(f => ({ ...f, totalPoints: parseInt(e.target.value) || 1 }))}
                className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Projekt *</label>
            <select
              value={form.projectId}
              onChange={e => setForm(f => ({ ...f, projectId: e.target.value, topicIds: [] }))}
              className="w-full text-[13px] bg-bg-secondary border border-border rounded px-3 py-2 text-text-primary"
            >
              <option value="">Projekt wählen...</option>
              {projectList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          {form.projectId && availableNodes.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-text-secondary block mb-2">Themen (optional)</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto border border-border rounded p-2 bg-bg-secondary">
                {availableNodes.map(n => (
                  <button
                    key={n.id}
                    onClick={() => toggleTopic(n.id)}
                    className={cn(
                      "text-[11px] rounded px-2 py-1 border transition-colors",
                      form.topicIds.includes(n.id)
                        ? "bg-text-primary text-bg-canvas border-text-primary"
                        : "border-border text-text-secondary hover:border-border-strong"
                    )}
                  >
                    {n.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || !form.projectId}>
              Klausur anlegen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
