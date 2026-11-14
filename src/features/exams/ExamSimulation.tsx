import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

type SimStep = 'intro' | 'running' | 'result';

export const ExamSimulation: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { exams, questions, knowledgeNodes, recordExamResult, recordLearningEvent } = useStore();

  const exam = examId ? exams[examId] : null;

  // Questions for this exam (based on topicIds)
  const examQuestions = Object.values(questions).filter(q =>
    exam?.topicIds.includes(q.knowledgeNodeId)
  );

  const [step, setStep] = useState<SimStep>('intro');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (step === 'running' && exam) {
      setTimeLeft(exam.durationMinutes * 60);
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            stopTimer();
            setStep('result');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return stopTimer;
  }, [step, exam, stopTimer]);

  if (!exam) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary">Klausur nicht gefunden.</p>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFinish = () => {
    stopTimer();

    // Calculate score
    const totalEarned = examQuestions.reduce((sum, q) => sum + (scores[q.id] ?? 0), 0);
    const maxScore = examQuestions.reduce((sum, q) => sum + q.points, 0) || exam.totalPoints;

    // Topic scores
    const topicScores: Record<string, number> = {};
    const topicMax: Record<string, number> = {};
    examQuestions.forEach(q => {
      const nid = q.knowledgeNodeId;
      topicScores[nid] = (topicScores[nid] ?? 0) + (scores[q.id] ?? 0);
      topicMax[nid] = (topicMax[nid] ?? 0) + q.points;
    });
    const topicPct: Record<string, number> = {};
    Object.keys(topicScores).forEach(nid => {
      topicPct[nid] = topicMax[nid] > 0 ? Math.round((topicScores[nid] / topicMax[nid]) * 100) : 0;
    });

    const problematic = Object.entries(topicPct)
      .filter(([, pct]) => pct < 60)
      .map(([nid]) => nid);

    // Record result & learning events
    recordExamResult(exam.projectId, exam.id, totalEarned, maxScore, topicPct, problematic);
    examQuestions.forEach(q => {
      const s = scores[q.id] ?? 0;
      const result = s >= q.points * 0.8 ? 'correct' : s >= q.points * 0.4 ? 'partial' : 'incorrect';
      recordLearningEvent(exam.projectId, q.knowledgeNodeId, 'exam', result, 'medium');
    });

    setStep('result');
  };

  const currentQ = examQuestions[currentIdx];
  const totalPoints = examQuestions.reduce((s, q) => s + q.points, 0) || exam.totalPoints;
  const earnedPoints = Object.values(scores).reduce((a, b) => a + b, 0);

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-canvas p-8">
        <div className="max-w-md w-full border border-border rounded-xl p-8">
          <h1 className="text-[20px] font-semibold text-text-primary mb-2">{exam.title}</h1>
          <p className="text-[13px] text-text-secondary mb-6">{exam.subject}</p>

          <div className="space-y-2 mb-8 text-[13px] text-text-secondary">
            <div className="flex justify-between">
              <span>Datum</span>
              <span className="text-text-primary">{new Date(exam.date).toLocaleDateString('de-DE')}</span>
            </div>
            <div className="flex justify-between">
              <span>Dauer</span>
              <span className="text-text-primary">{exam.durationMinutes} Minuten</span>
            </div>
            <div className="flex justify-between">
              <span>Aufgaben</span>
              <span className="text-text-primary">{examQuestions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Erreichbare Punkte</span>
              <span className="text-text-primary">{totalPoints}</span>
            </div>
          </div>

          {examQuestions.length === 0 && (
            <div className="mb-6 p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-[12px] text-yellow-700">
              Für diese Klausur sind noch keine Aufgaben in der Aufgabenbank vorhanden.
              Erstelle erst Aufgaben, die den ausgewählten Themen zugeordnet sind.
              
              <div className="mt-3">
                <Button 
                  size="sm" 
                  disabled={isGenerating}
                  onClick={async () => {
                    const { useImportStore } = await import('../import/importStore');
                    const { AIService } = await import('../import/AIService');
                    const { provider, apiKeys, models } = useImportStore.getState();
                    const apiKey = apiKeys[provider];
                    const model = models[provider];
                    if (!apiKey) {
                      alert('Bitte zuerst in den Einstellungen einen API-Key hinterlegen.');
                      return;
                    }
                    setIsGenerating(true);
                    try {
                      const topics = exam.topicIds.map(id => ({ id, title: knowledgeNodes[id]?.title || 'Thema' }));
                      const newQs = await AIService.generateExamQuestions(topics, provider, apiKey, model);
                      const { createQuestion } = useStore.getState();
                      newQs.forEach((q: any) => {
                        createQuestion(
                          exam.projectId,
                          q.knowledgeNodeId,
                          q.type,
                          q.difficulty,
                          q.question,
                          q.answer,
                          '',
                          '',
                          q.points
                        );
                      });
                      alert(`${newQs.length} Aufgaben erfolgreich generiert!`);
                    } catch (e: any) {
                      alert('Fehler bei der Generierung: ' + e.message);
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                >
                  {isGenerating ? 'Generiere Aufgaben...' : 'Mit KI Aufgaben generieren'}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-bg-secondary rounded-lg p-3 mb-6 text-[12px] text-text-secondary">
            Während der Simulation: keine Lernhilfen, keine Musterlösungen bis zur Abgabe.
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate('/exams')}>Zurück</Button>
            <Button onClick={() => { setStep('running'); setCurrentIdx(0); }} className="flex-1">
              Simulation starten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── RUNNING ────────────────────────────────────────────────────────────────
  if (step === 'running') {
    const isRevealed = currentQ ? revealed.has(currentQ.id) : false;
    const urgentTime = timeLeft < 300;

    return (
      <div className="flex-1 flex flex-col bg-bg-canvas overflow-hidden">
        {/* Top bar */}
        <div className="border-b border-border px-6 py-3 flex items-center gap-4 shrink-0">
          <span className="text-[12px] text-text-secondary font-medium">{exam.title}</span>
          <span className="text-[11px] text-text-disabled">
            Aufgabe {currentIdx + 1} / {examQuestions.length}
          </span>
          <div className="flex-1" />
          {/* Timer */}
          <div className={cn(
            "flex items-center gap-1.5 font-mono text-[13px] font-medium px-3 py-1 rounded",
            urgentTime ? "bg-red-50 text-red-600 border border-red-200" : "bg-bg-secondary text-text-primary border border-border"
          )}>
            <Clock size={12} />
            {formatTime(timeLeft)}
          </div>
          <Button size="sm" onClick={handleFinish}>Abgeben</Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question index sidebar */}
          <div className="w-14 border-r border-border flex flex-col items-center py-3 gap-1 overflow-y-auto shrink-0">
            {examQuestions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "w-8 h-8 rounded text-[11px] font-medium transition-colors",
                  i === currentIdx
                    ? "bg-text-primary text-bg-canvas"
                    : answers[q.id] !== undefined
                      ? "bg-bg-tertiary text-text-primary border border-border"
                      : "text-text-disabled hover:bg-bg-secondary"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-8">
            {examQuestions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-text-secondary text-[13px]">Keine Aufgaben für diese Klausur.</p>
              </div>
            ) : currentQ ? (
              <div className="max-w-2xl mx-auto">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[11px] text-text-disabled">{currentQ.type}</span>
                  <span className="text-[11px] text-text-disabled">·</span>
                  <span className="text-[11px] text-text-disabled">{currentQ.points} Punkte</span>
                  <span className="text-[11px] text-text-disabled">·</span>
                  {currentQ.isOriginalExamQuestion ? (
                    <span className="text-[10px] bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-500/20">Originalaufgabe</span>
                  ) : (
                    <span className="text-[10px] bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded font-medium border border-green-500/20">Übungsaufgabe</span>
                  )}
                </div>
                <h2 className="text-[16px] font-medium text-text-primary mb-6 leading-relaxed">
                  {currentQ.question}
                </h2>

                <textarea
                  value={answers[currentQ.id] ?? ''}
                  onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
                  rows={8}
                  placeholder="Deine Antwort..."
                  className="w-full text-[13px] bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary resize-none mb-6"
                />

                {/* Self-scoring after reveal */}
                {isRevealed && (
                  <div className="border border-border rounded-lg p-4 bg-bg-secondary mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-text-disabled mb-2">Musterlösung</p>
                    <p className="text-[13px] text-text-primary whitespace-pre-wrap mb-4">{currentQ.answer}</p>
                    <p className="text-[11px] text-text-secondary mb-2">Wie viele Punkte gibst du dir? (max. {currentQ.points})</p>
                    <input
                      type="range"
                      min={0}
                      max={currentQ.points}
                      value={scores[currentQ.id] ?? 0}
                      onChange={e => setScores(s => ({ ...s, [currentQ.id]: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-text-disabled mt-1">
                      <span>0</span>
                      <span className="text-text-primary font-medium">{scores[currentQ.id] ?? 0} Pkt.</span>
                      <span>{currentQ.points}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                    disabled={currentIdx === 0}
                  >
                    <ChevronLeft size={12} />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRevealed(r => new Set([...r, currentQ.id]))}
                    disabled={isRevealed}
                  >
                    Musterlösung anzeigen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setCurrentIdx(i => Math.min(examQuestions.length - 1, i + 1))}
                    disabled={currentIdx === examQuestions.length - 1}
                  >
                    <ChevronRight size={12} />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const grade = pct >= 90 ? 'Sehr gut' : pct >= 75 ? 'Gut' : pct >= 60 ? 'Befriedigend' : pct >= 45 ? 'Ausreichend' : 'Nicht bestanden';

  // Per-topic scores
  const topicRows = exam.topicIds.map(nid => {
    const node = knowledgeNodes[nid];
    const qs = examQuestions.filter(q => q.knowledgeNodeId === nid);
    const earned = qs.reduce((s, q) => s + (scores[q.id] ?? 0), 0);
    const max = qs.reduce((s, q) => s + q.points, 0);
    const p = max > 0 ? Math.round((earned / max) * 100) : 0;
    return { node, earned, max, p };
  }).filter(r => r.node);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className={cn(
            "text-[48px] font-semibold mb-2",
            pct >= 60 ? "text-text-primary" : "text-red-500"
          )}>
            {earnedPoints} / {totalPoints}
          </div>
          <div className="text-[20px] font-medium text-text-secondary mb-1">{pct} %</div>
          <div className="text-[14px] text-text-disabled">{grade}</div>
        </div>

        {/* Topic breakdown */}
        {topicRows.length > 0 && (
          <div className="border border-border rounded-lg mb-6 overflow-hidden">
            <div className="px-4 py-2 bg-bg-secondary border-b border-border">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-disabled">Themen-Auswertung</span>
            </div>
            {topicRows.map(({ node, earned, max, p }) => (
              <div key={node.id} className="px-4 py-3 border-b border-border last:border-0 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[13px] text-text-primary mb-1">{node.title}</p>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", p >= 60 ? "bg-green-500" : "bg-red-400")}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-medium text-text-primary">{p}%</div>
                  <div className="text-[10px] text-text-disabled">{earned}/{max} Pkt.</div>
                </div>
                {p < 60 && (
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                )}
                {p >= 60 && (
                  <CheckCircle size={14} className="text-green-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="secondary" onClick={() => navigate('/exams')}>Zur Übersicht</Button>
          <Button onClick={() => {
            setStep('intro');
            setAnswers({});
            setRevealed(new Set());
            setScores({});
            setCurrentIdx(0);
          }}>
            Erneut starten
          </Button>
        </div>
      </div>
    </div>
  );
};
