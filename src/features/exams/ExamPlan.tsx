import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { CalendarDays, Target, ArrowLeft, Play } from 'lucide-react';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

export const ExamPlan: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { exams, knowledgeNodes, questions } = useStore();

  const exam = examId ? exams[examId] : null;
  if (!exam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Klausur nicht gefunden.</p>
      </div>
    );
  }

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const topics = exam.topicIds.map(id => knowledgeNodes[id]).filter(Boolean);
  const examQuestions = Object.values(questions).filter(q =>
    exam.topicIds.includes(q.knowledgeNodeId)
  );

  // Compute mastery per topic
  const topicMastery = topics.map(n => ({
    node: n,
    avg: Math.round(
      (n.mastery.understanding + n.mastery.recall + n.mastery.application + n.mastery.exam) / 4
    ),
    status: n.overallStatus,
    questionCount: examQuestions.filter(q => q.knowledgeNodeId === n.id).length,
  })).sort((a, b) => a.avg - b.avg);

  // Build a simple learning plan
  const planDays: { day: string; label: string; tasks: string[] }[] = [];
  if (daysLeft === 0) {
    planDays.push({ day: 'Heute', label: 'Klausurtag', tasks: ['Kurze Wiederholung der Schwächen', 'Keine neuen Themen beginnen', 'Gute Nacht schlafen'] });
  } else {
    const weakTopics = topicMastery.filter(t => t.avg < 60).map(t => t.node.title);
    const medTopics = topicMastery.filter(t => t.avg >= 60 && t.avg < 80).map(t => t.node.title);
    const strongTopics = topicMastery.filter(t => t.avg >= 80).map(t => t.node.title);

    if (daysLeft >= 1) {
      planDays.push({
        day: 'Heute',
        label: daysLeft > 3 ? 'Schwächen aufarbeiten' : 'Intensive Wiederholung',
        tasks: weakTopics.length > 0
          ? [`Schwache Themen wiederholen: ${weakTopics.slice(0, 2).join(', ')}`, 'Karteikarten durchgehen', 'Fehlerprotokoll anschauen']
          : ['Alle Themen kurz überblicken', 'Karteikarten wiederholen'],
      });
    }
    if (daysLeft >= 2) {
      planDays.push({
        day: 'Morgen',
        label: 'Aufgaben und Anwendung',
        tasks: [
          ...medTopics.slice(0, 2).map(t => `Aufgaben zu: ${t}`),
          `${examQuestions.length} Übungsaufgaben aus der Aufgabenbank`,
        ].filter(Boolean),
      });
    }
    if (daysLeft >= 4) {
      planDays.push({
        day: `In ${Math.floor(daysLeft / 2)} Tagen`,
        label: 'Gemischte Wiederholung',
        tasks: [
          'Alle Themen gemischt wiederholen',
          'Schwächen nochmals üben',
          ...strongTopics.slice(0, 1).map(t => `${t} festigen`),
        ],
      });
    }
    if (daysLeft >= 3) {
      planDays.push({
        day: `In ${Math.max(2, daysLeft - 1)} Tagen`,
        label: 'Prüfungssimulation',
        tasks: [
          `Klausur-Simulation (${exam.durationMinutes} Min.)`,
          'Auswertung analysieren',
          'Letzte Schwächen anpassen',
        ],
      });
    }
    planDays.push({
      day: new Date(exam.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      label: 'Klausurtag',
      tasks: ['Kurze Wiederholung am Morgen', 'Keine neuen Themen mehr'],
    });
  }

  const masteryLabel = (avg: number) =>
    avg >= 80 ? 'Gut' : avg >= 60 ? 'Mittel' : avg >= 40 ? 'Schwach' : 'Kaum bekannt';
  const masteryColor = (avg: number) =>
    avg >= 80 ? 'text-green-600' : avg >= 60 ? 'text-yellow-600' : 'text-red-500';
  const barColor = (avg: number) =>
    avg >= 80 ? 'bg-green-500' : avg >= 60 ? 'bg-yellow-500' : 'bg-red-400';

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <button
          onClick={() => navigate('/exams')}
          className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-text-primary mb-6"
        >
          <ArrowLeft size={12} /> Zurück zu Klausuren
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[20px] font-semibold text-text-primary mb-1">{exam.title}</h1>
            <div className="flex items-center gap-3 text-[12px] text-text-secondary">
              <span className="flex items-center gap-1">
                <CalendarDays size={11} />
                {new Date(exam.date).toLocaleDateString('de-DE')}
              </span>
              <span className={cn("font-medium", daysLeft <= 3 ? "text-red-500" : "text-text-primary")}>
                {daysLeft === 0 ? 'Heute!' : `Noch ${daysLeft} Tage`}
              </span>
            </div>
          </div>
          <Button size="sm" onClick={() => navigate(`/exams/${exam.id}/simulate`)}>
            <Play size={11} className="mr-1" />
            Simulation
          </Button>
        </div>

        {/* Wissensstand per Thema */}
        {topicMastery.length > 0 && (
          <div className="mb-8">
            <h2 className="text-[13px] font-semibold text-text-primary mb-3">Wissensstand nach Thema</h2>
            <div className="space-y-3">
              {topicMastery.map(({ node, avg }) => (
                <div key={node.id} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-[12px] text-text-secondary truncate">{node.title}</div>
                  <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", barColor(avg))}
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                  <div className={cn("text-[11px] font-medium w-20 text-right", masteryColor(avg))}>
                    {avg}% – {masteryLabel(avg)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topics.length === 0 && (
          <div className="mb-8 p-4 border border-border rounded-lg text-[12px] text-text-secondary">
            <Target size={14} className="mb-2 text-text-disabled" />
            <p>Keine Themen für diese Klausur zugewiesen. Bearbeite die Klausur, um Themen hinzuzufügen.</p>
          </div>
        )}

        {/* Lernplan */}
        <div>
          <h2 className="text-[13px] font-semibold text-text-primary mb-3">Empfohlener Lernplan</h2>
          <div className="space-y-3">
            {planDays.map((day, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    i === 0 ? "bg-text-primary" : "bg-border"
                  )} />
                  {i < planDays.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[12px] font-medium text-text-primary">{day.day}</span>
                    <span className="text-[11px] text-text-disabled">{day.label}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {day.tasks.map((task, j) => (
                      <li key={j} className="text-[12px] text-text-secondary flex items-start gap-1.5">
                        <span className="text-text-disabled mt-0.5">→</span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-3 text-center">
            <div className="text-[20px] font-semibold text-text-primary">{examQuestions.length}</div>
            <div className="text-[11px] text-text-disabled">Aufgaben</div>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <div className="text-[20px] font-semibold text-text-primary">{topics.length}</div>
            <div className="text-[11px] text-text-disabled">Themen</div>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <div className="text-[20px] font-semibold text-text-primary">
              {topicMastery.length > 0
                ? Math.round(topicMastery.reduce((s, t) => s + t.avg, 0) / topicMastery.length)
                : 0}%
            </div>
            <div className="text-[11px] text-text-disabled">Ø Wissensstand</div>
          </div>
        </div>
      </div>
    </div>
  );
};
