import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Check } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useImportStore } from './importStore';
import { useStore } from '../../store';
import { AIService, type DocumentAnalysisResult, type GenerationResult, type Topic, type ExamAnalysisResult } from './AIService';
import { cn } from '../../utils/cn';

type Step = 'upload' | 'analyzing' | 'topics' | 'options' | 'generating' | 'review' | 'project';

export const ImportModal: React.FC = () => {
  const { isOpen, close } = useImportStore();
  const navigate = useNavigate();
  const {
    projects,
    createProject,
    createMindmap,
    createNode,
    createEdge,
    updateNode,
    createNote,
    updateNote,
    createFlashcard,
    createTaskcard,
    linkNoteToNode,
    createKnowledgeNode,
    createQuestion,
    createExam,
    createTimeline,
    createTimelineEvent,
  } = useStore();

  const [step, setStep] = useState<Step>('upload');
  const [uploadType, setUploadType] = useState<'file' | 'text' | 'image' | 'exam'>('file');
  const [_file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [examAnalysis, setExamAnalysis] = useState<ExamAnalysisResult | null>(null);
  
  // Topic selection
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());

  // Options
  const [options, setOptions] = useState({
    mindmap: true,
    notes: true,
    flashcards: true,
    taskcards: false,
    timelines: true,
  });

  // Generated results
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);

  // Review selection
  const [rejectedItems, setRejectedItems] = useState<Set<string>>(new Set());

  // Project selection
  const [targetProjectId, setTargetProjectId] = useState<string>('new');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setExamAnalysis(null);
    setSelectedTopicIds(new Set());
    setOptions({
      mindmap: true,
      notes: true,
      flashcards: true,
      taskcards: false,
      timelines: true,
    });
    setGenerationResult(null);
    setRejectedItems(new Set());
    setTargetProjectId('new');
  };

  const handleClose = () => {
    handleReset();
    close();
  };

  const handleFileSelect = async (selectedFile: File) => {
    const storeState = useImportStore.getState();
    const apiKey = storeState.apiKeys[storeState.provider];
    if (!apiKey) {
      alert("Bitte zuerst in den Einstellungen einen API-Key hinterlegen.");
      return;
    }
    setFile(selectedFile);
    setStep('analyzing');
    
    try {
      if (uploadType === 'exam') {
        const result = await AIService.analyzeOldExam(selectedFile, storeState.provider, apiKey, storeState.models[storeState.provider]);
        setExamAnalysis(result);
        setStep('project');
      } else {
        const result = await AIService.analyzeDocument(selectedFile, storeState.provider, apiKey, storeState.models[storeState.provider]);
        setAnalysis(result);
        
        // Auto-select all topics initially
        const allIds = new Set<string>();
        const traverse = (topics: Topic[]) => {
          topics.forEach(t => {
            if (t.selected) allIds.add(t.id);
            traverse(t.children);
          });
        };
        traverse(result.topics);
        setSelectedTopicIds(allIds);
        setStep('topics');
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      alert(`Fehler bei der KI-Analyse: ${err?.message || 'Unbekannter Fehler'}`);
      setStep('upload');
    }
  };

  const handleTopicsSubmit = () => {
    setStep('options');
  };

  const handleOptionsSubmit = async () => {
    if (!analysis) return;
    const storeState = useImportStore.getState();
    const apiKey = storeState.apiKeys[storeState.provider];
    if (!apiKey) return;
    setStep('generating');
    try {
      const result = await AIService.generateMaterials(analysis, Array.from(selectedTopicIds), options, storeState.provider, apiKey, storeState.models[storeState.provider]);
      setGenerationResult(result);
      setStep('review');
    } catch (err: any) {
      console.error('Material generation error:', err);
      alert(`Fehler beim Erstellen der Materialien: ${err?.message || 'Unbekannter Fehler'}`);
      setStep('options');
    }
  };

  const handleReviewSubmit = () => {
    setStep('project');
  };

  const toggleTopic = (id: string) => {
    const newSet = new Set(selectedTopicIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTopicIds(newSet);
  };

  const renderTopicTree = (topics: Topic[], level = 0) => {
    return (
      <div className={cn("space-y-1", level > 0 && "ml-4 mt-1 border-l border-border pl-3")}>
        {topics.map(t => (
          <div key={t.id}>
            <label className="flex items-center gap-2 text-[12.5px] text-text-primary hover:bg-bg-tertiary px-1 py-0.5 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTopicIds.has(t.id)}
                onChange={() => toggleTopic(t.id)}
                className="rounded border-border text-blue-500 focus:ring-blue-500 focus:ring-offset-bg-canvas"
              />
              <span>{t.title}</span>
            </label>
            {t.children.length > 0 && renderTopicTree(t.children, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  const toggleReject = (id: string) => {
    const newSet = new Set(rejectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setRejectedItems(newSet);
  };

  const handleSave = () => {
    if (!analysis && !examAnalysis) return;

    let projId = targetProjectId;
    
    if (examAnalysis) {
      if (projId === 'new') {
        const p = createProject(examAnalysis.title, 'Importierte Altklausur');
        projId = p.id;
      }

      // Create KnowledgeNodes for each topic
      const topicIdToKnowledgeNodeId = new Map<string, string>();
      examAnalysis.topics.forEach((t: {id: string, title: string}) => {
        const kn = createKnowledgeNode(projId, t.title);
        topicIdToKnowledgeNodeId.set(t.id, kn.id);
      });

      // Create Questions
      examAnalysis.questions.forEach((q: any) => {
        const knId = topicIdToKnowledgeNodeId.get(q.topicId);
        if (knId) {
          // Add question to store and mark as original exam question
          createQuestion(
            projId, 
            knId, 
            (q.type as any) || 'offene Frage', 
            (q.difficulty as any) || 'medium', 
            q.question, 
            q.answer, 
            '', 
            'Altklausur: ' + examAnalysis.title, 
            q.points,
            true // isOriginalExamQuestion
          );
        }
      });

      // Create Exam
      createExam(
        projId,
        examAnalysis.title,
        new Date().toISOString(),
        examAnalysis.subject,
        Array.from(topicIdToKnowledgeNodeId.values()),
        examAnalysis.durationMinutes || 90,
        examAnalysis.totalPoints || 100
      );

      handleClose();
      navigate('/projects/' + projId);
      return;
    }

    if (!analysis || !generationResult) return;

    if (projId === 'new') {
      const p = createProject(analysis.suggestedTitle, 'Generiert aus ' + analysis.fileName);
      projId = p.id;
    }

    // generated mindmap node id -> actual store node id
    const createdNodes = new Map<string, string>();
    // topicId -> actual store node id (for the primary/first node with that topicId)
    const topicToNodeId = new Map<string, string>();

    if (options.mindmap) {
      const mindmap = createMindmap(projId, analysis.suggestedTitle);
      
      // Compute a simple tree layout: root nodes at x=80, children fan out to the right
      const depthXMap: Record<number, number> = {};
      const getDepth = (id: string, visited = new Set<string>()): number => {
        if (visited.has(id)) return 0;
        visited.add(id);
        const node = generationResult.mindmapNodes.find(n => n.id === id);
        if (!node || !node.parentId) return 0;
        return 1 + getDepth(node.parentId, visited);
      };

      generationResult.mindmapNodes.forEach(node => {
        if (rejectedItems.has(node.id)) return;
        const depth = getDepth(node.id);
        const x = 80 + depth * 280;
        const yBase = (depthXMap[depth] ?? 80);
        depthXMap[depth] = yBase + 80;

        const newNode = createNode(mindmap.id, projId, node.title, null, { x, y: yBase });
        createdNodes.set(node.id, newNode.id);

        // Map topicId → first matching node id
        if (node.topicId && !topicToNodeId.has(node.topicId)) {
          topicToNodeId.set(node.topicId, newNode.id);
        }
      });

      // Link edges and set parentId
      generationResult.mindmapNodes.forEach(node => {
        if (rejectedItems.has(node.id) || !node.parentId) return;
        const sourceId = createdNodes.get(node.parentId);
        const targetId = createdNodes.get(node.id);
        if (sourceId && targetId) {
          createEdge(mindmap.id, sourceId, targetId);
          updateNode(targetId, { parentId: sourceId });
        }
      });
    }

    if (options.notes) {
      generationResult.notes.forEach(note => {
        if (rejectedItems.has(note.id)) return;
        const newNote = createNote(projId, note.title);
        const sourceText = note.sourcePage ? '<p><em>Quelle: ' + analysis.fileName + ', Seite ' + note.sourcePage + '</em></p>' : '';
        updateNote(newNote.id, { content: note.content + sourceText });

        // Link to the mindmap node that represents this topic
        const nodeId = topicToNodeId.get(note.topicId);
        if (nodeId) {
          linkNoteToNode(newNote.id, nodeId);
        }
      });
    }

    if (options.flashcards) {
      generationResult.flashcards.forEach(fc => {
        if (rejectedItems.has(fc.id)) return;
        createFlashcard(projId, fc.front, fc.back);
      });
    }

    if (options.taskcards) {
      let x = 40;
      generationResult.taskcards.forEach(tc => {
        if (rejectedItems.has(tc.id)) return;
        createTaskcard(projId, tc.title, { x, y: 40 });
        x += 220;
      });
    }

    if (options.timelines && generationResult.timelines) {
      generationResult.timelines.forEach(tl => {
        if (rejectedItems.has(tl.id)) return;
        const newTl = createTimeline(projId, tl.title, tl.description || '');
        if (Array.isArray(tl.events)) {
          tl.events.forEach(ev => {
            if (rejectedItems.has(ev.id)) return;
            createTimelineEvent(newTl.id, projId, {
              title: ev.title,
              description: ev.description,
              date: ev.date,
              endDate: ev.endDate,
              category: ev.category,
              color: ev.color,
              importance: ev.importance,
            });
          });
        }
      });
    }

    handleClose();
    navigate('/projects/' + projId);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Lernmaterial hinzufuegen" size="2xl">
      <div className="w-full min-h-[50vh] max-h-[80vh] flex flex-col">
        
        {step === 'upload' && (
          <div className="p-6">
            <div className="flex gap-4 mb-6 border-b border-border">
              <button className={cn("pb-2 text-[13px] font-medium border-b-2", uploadType === 'file' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-disabled')} onClick={() => setUploadType('file')}>Lernmaterial (Datei)</button>
              <button className={cn("pb-2 text-[13px] font-medium border-b-2", uploadType === 'exam' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-disabled')} onClick={() => setUploadType('exam')}>Alte Klausur (PDF)</button>
              <button className={cn("pb-2 text-[13px] font-medium border-b-2", uploadType === 'text' ? 'border-text-primary text-text-primary' : 'border-transparent text-text-disabled')} onClick={() => setUploadType('text')}>Text einfügen</button>
            </div>



            <div 
              className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center hover:bg-bg-tertiary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
            >
              <UploadCloud size={32} className="text-text-disabled mb-3" />
              <p className="text-[14px] text-text-primary font-medium mb-1">Datei hierher ziehen</p>
              <p className="text-[13px] text-text-secondary mb-4">oder</p>
              <Button variant="secondary" size="sm">Datei auswaehlen</Button>
              <p className="text-[11px] text-text-disabled mt-4">PDF . DOCX . TXT . JPG . PNG</p>
              <input type="file" className="hidden" ref={fileInputRef} onChange={e => { if (e.target.files?.length) handleFileSelect(e.target.files[0]) }} />
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-4"></div>
            <p className="text-[14px] text-text-primary font-medium mb-4">Lernmaterial wird verarbeitet</p>
            <div className="space-y-2 text-[13px] text-text-secondary">
               <p className="flex items-center gap-2"><Check size={14} className="text-green-500"/> Datei gelesen</p>
               <p className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-border border-t-text-secondary rounded-full animate-spin"/> Inhalte erkennen...</p>
            </div>
          </div>
        )}

        {step === 'topics' && analysis && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-border">
              <p className="text-[13px] text-text-secondary mb-1">Datei: {analysis.fileName}</p>
              <h3 className="text-[15px] font-medium text-text-primary">Erkannte Inhalte</h3>
              <p className="text-[12px] text-text-secondary">Waehle aus, welche Themen verarbeitet werden sollen.</p>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
               {renderTopicTree(analysis.topics)}
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button onClick={handleTopicsSubmit}>Weiter</Button>
            </div>
          </div>
        )}

        {step === 'options' && (
          <div className="p-6">
            <h3 className="text-[16px] font-medium text-text-primary mb-4 text-center">Was moechtest du daraus erstellen?</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              
              <label className={cn("border rounded-lg p-4 cursor-pointer transition-colors", options.mindmap ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-text-disabled')}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-[14px] text-text-primary">Mindmap</span>
                  <input type="checkbox" checked={options.mindmap} onChange={e => setOptions({...options, mindmap: e.target.checked})} className="rounded text-blue-500" />
                </div>
                <p className="text-[12px] text-text-secondary">Strukturiere das Thema visuell.</p>
              </label>

              <label className={cn("border rounded-lg p-4 cursor-pointer transition-colors", options.notes ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-text-disabled')}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-[14px] text-text-primary">Notizen</span>
                  <input type="checkbox" checked={options.notes} onChange={e => setOptions({...options, notes: e.target.checked})} className="rounded text-blue-500" />
                </div>
                <p className="text-[12px] text-text-secondary">Erstelle strukturierte Lernnotizen.</p>
              </label>

              <label className={cn("border rounded-lg p-4 cursor-pointer transition-colors", options.flashcards ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-text-disabled')}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-[14px] text-text-primary">Karteikarten</span>
                  <input type="checkbox" checked={options.flashcards} onChange={e => setOptions({...options, flashcards: e.target.checked})} className="rounded text-blue-500" />
                </div>
                <p className="text-[12px] text-text-secondary">Erstelle Fragen und Antworten zum Lernen.</p>
              </label>

              <label className={cn("border rounded-lg p-4 cursor-pointer transition-colors", options.taskcards ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-text-disabled')}>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-[14px] text-text-primary">Taskcards</span>
                  <input type="checkbox" checked={options.taskcards} onChange={e => setOptions({...options, taskcards: e.target.checked})} className="rounded text-blue-500" />
                </div>
                <p className="text-[12px] text-text-secondary">Erstelle eine uebersichtliche Lernflaeche.</p>
              </label>

              <label className={cn("border rounded-lg p-4 cursor-pointer transition-colors col-span-2", options.timelines ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-text-disabled')}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[14px] text-text-primary">Zeitstrahl (Chronologie & Meilensteine)</span>
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">KI-Kontext-Erkennung</span>
                  </div>
                  <input type="checkbox" checked={options.timelines} onChange={e => setOptions({...options, timelines: e.target.checked})} className="rounded text-blue-500" />
                </div>
                <p className="text-[12px] text-text-secondary">
                  Wird automatisch erstellt, wenn das Thema historische Ereignisse, Entwicklungsstufen, Epochen oder schrittweise Abläufe enthält.
                </p>
              </label>

            </div>
            <div className="flex justify-end">
              <Button onClick={handleOptionsSubmit} disabled={!options.mindmap && !options.notes && !options.flashcards && !options.taskcards && !options.timelines}>Lernmaterial erstellen</Button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mb-4"></div>
            <p className="text-[14px] text-text-primary font-medium mb-4">Lernmaterial wird erstellt</p>
            <div className="space-y-2 text-[13px] text-text-secondary">
               {options.mindmap && <p className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-border border-t-text-secondary rounded-full animate-spin"/> Mindmap wird erstellt</p>}
               {options.notes && <p className="flex items-center gap-2">... Notizen</p>}
               {options.flashcards && <p className="flex items-center gap-2">... Karteikarten</p>}
               {options.taskcards && <p className="flex items-center gap-2">... Taskcards</p>}
               {options.timelines && <p className="flex items-center gap-2">... Zeitstrahl & Meilensteine (falls Thema zeitlich relevant)</p>}
            </div>
          </div>
        )}

        {step === 'review' && generationResult && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-[15px] font-medium text-text-primary">Dein Lernmaterial ist fast fertig</h3>
                <p className="text-[12px] text-text-secondary">Bitte ueberpruefe die generierten Inhalte.</p>
              </div>
              <Button onClick={handleReviewSubmit}>Uebernehmen</Button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-6">
              
              {options.mindmap && (
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary mb-2 flex justify-between">
                    <span>Mindmap</span>
                    <span className="text-text-disabled font-normal">{generationResult.mindmapNodes.length} Begriffe</span>
                  </h4>
                  <div className="space-y-1">
                    {generationResult.mindmapNodes.map(n => (
                      <label key={n.id} className="flex items-center gap-2 text-[12px] text-text-secondary">
                        <input type="checkbox" checked={!rejectedItems.has(n.id)} onChange={() => toggleReject(n.id)} className="rounded" />
                        {n.title}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {options.flashcards && (
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary mb-2 flex justify-between">
                    <span>Karteikarten</span>
                    <span className="text-text-disabled font-normal">{generationResult.flashcards.length} Karten</span>
                  </h4>
                  <div className="space-y-2">
                    {generationResult.flashcards.map((fc, i) => (
                      <label key={fc.id} className="flex items-start gap-2 text-[12px] text-text-secondary bg-bg-tertiary p-2 rounded">
                        <input type="checkbox" checked={!rejectedItems.has(fc.id)} onChange={() => toggleReject(fc.id)} className="rounded mt-0.5" />
                        <div>
                          <p className="font-medium text-text-primary">{i+1}. {fc.front}</p>
                          <p className="text-text-disabled mt-0.5">{fc.back}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {options.notes && (
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary mb-2 flex justify-between">
                    <span>Notizen</span>
                    <span className="text-text-disabled font-normal">{generationResult.notes.length} Abschnitte</span>
                  </h4>
                  <div className="space-y-2">
                    {generationResult.notes.map((n) => (
                      <label key={n.id} className="flex items-center gap-2 text-[12px] text-text-secondary">
                        <input type="checkbox" checked={!rejectedItems.has(n.id)} onChange={() => toggleReject(n.id)} className="rounded" />
                        {n.title}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {options.timelines && generationResult.timelines && generationResult.timelines.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-semibold text-text-primary mb-2 flex justify-between">
                    <span>Zeitstrahlen & Chronologie</span>
                    <span className="text-text-disabled font-normal">
                      {generationResult.timelines.length} {generationResult.timelines.length === 1 ? 'Zeitstrahl' : 'Zeitstrahlen'}
                    </span>
                  </h4>
                  <div className="space-y-2">
                    {generationResult.timelines.map((tl) => (
                      <label key={tl.id} className="flex items-start gap-2.5 text-[12px] text-text-secondary bg-bg-tertiary p-2.5 rounded border border-border/80">
                        <input
                          type="checkbox"
                          checked={!rejectedItems.has(tl.id)}
                          onChange={() => toggleReject(tl.id)}
                          className="rounded mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary">{tl.title}</p>
                          {tl.description && (
                            <p className="text-text-disabled text-[11px] mt-0.5 line-clamp-1">{tl.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {tl.events?.slice(0, 4).map((ev) => (
                              <span key={ev.id} className="text-[10px] bg-white border border-border px-1.5 py-0.5 rounded text-text-secondary">
                                <span className="font-medium text-text-primary">{ev.date}:</span> {ev.title}
                              </span>
                            ))}
                            {(tl.events?.length || 0) > 4 && (
                              <span className="text-[10px] text-text-disabled self-center">
                                +{(tl.events?.length || 0) - 4} weitere
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {step === 'project' && (
          <div className="p-6">
            {examAnalysis ? (
               <div className="mb-6 p-4 bg-bg-tertiary rounded-lg border border-border">
                 <h3 className="text-[15px] font-medium text-text-primary mb-2">Altklausur erkannt: {examAnalysis.title}</h3>
                 <p className="text-[13px] text-text-secondary">Fach: {examAnalysis.subject} • {examAnalysis.durationMinutes} Minuten • {examAnalysis.totalPoints} Punkte</p>
                 <p className="text-[13px] text-text-secondary mt-1">{examAnalysis.questions.length} Aufgaben zu {examAnalysis.topics.length} Themen extrahiert.</p>
               </div>
            ) : null}
            <h3 className="text-[15px] font-medium text-text-primary mb-4">{examAnalysis ? 'Klausur speichern in:' : 'Lernmaterial hinzufuegen zu:'}</h3>
            <div className="space-y-2">
              
              <label className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", targetProjectId === 'new' ? 'border-blue-500 bg-blue-500/5' : 'border-border')}>
                <input type="radio" name="project" checked={targetProjectId === 'new'} onChange={() => setTargetProjectId('new')} className="text-blue-500" />
                <span className="text-[14px] text-text-primary">Neues Projekt</span>
              </label>

              {Object.values(projects).map(p => (
                <label key={p.id} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors", targetProjectId === p.id ? 'border-blue-500 bg-blue-500/5' : 'border-border')}>
                  <input type="radio" name="project" checked={targetProjectId === p.id} onChange={() => setTargetProjectId(p.id)} className="text-blue-500" />
                  <span className="text-[14px] text-text-primary">{p.title}</span>
                </label>
              ))}

            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave}>Speichern & Oeffnen</Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
