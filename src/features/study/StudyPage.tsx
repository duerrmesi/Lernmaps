import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { useStore } from '../../store';
import { FlashcardTask } from './components/FlashcardTask';
import { QuestionTask } from './components/QuestionTask';
import { FreeRecallTask } from './components/FreeRecallTask';
import { MindmapTask } from './components/MindmapTask';

export const StudyPage: React.FC = () => {
  const navigate = useNavigate();
  const { knowledgeNodes, flashcards } = useStore();

  const studyQueue = useMemo(() => {
    const nodes = Object.values(knowledgeNodes);
    const nowTime = new Date().getTime();
    
    // 1. Due reviews
    const due = nodes.filter(n => n.nextReview && new Date(n.nextReview).getTime() <= nowTime);
    // 2. Weak topics
    const weak = nodes.filter(n => n.overallStatus === 'WEAK' || n.overallStatus === 'NOT_LEARNED');
    
    // Combine and deduplicate
    const combined = Array.from(new Set([...due, ...weak]));
    if (combined.length === 0 && nodes.length > 0) {
      // Fallback: mix some random nodes if nothing is due
      combined.push(...nodes.sort(() => 0.5 - Math.random()).slice(0, 3));
    }
    
    let queue: any[] = [];
    
    combined.forEach(node => {
      // Flashcards
      node.flashcards.forEach(fcId => {
        const fc = flashcards[fcId];
        if (fc) queue.push({ id: `fc_${fc.id}`, type: 'flashcard', node, item: fc });
      });
      
      // Questions
      const questionsForNode = Object.values(useStore.getState().questions).filter(q => q.knowledgeNodeId === node.id);
      questionsForNode.forEach(q => {
        queue.push({ id: `q_${q.id}`, type: 'question', node, item: q });
      });

      // Free Recall
      if (node.description || node.notes.length > 0) {
        queue.push({ id: `recall_${node.id}`, type: 'free_recall', node });
      }

      // Empty Mindmap (if node has children)
      if (node.children && node.children.length > 0) {
        queue.push({ id: `mindmap_${node.id}`, type: 'mindmap', node, childrenIds: node.children });
      }
    });
    
    // Shuffle queue to mix topics
    return queue.sort(() => Math.random() - 0.5).slice(0, 15); // Max 15 tasks per session
  }, [knowledgeNodes, flashcards]);

  const [currentIndex, setCurrentIndex] = useState(0);

  if (studyQueue.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center justify-center">
        <h1 className="text-xl font-semibold mb-2">Alles erledigt!</h1>
        <p className="text-text-disabled mb-6">Aktuell gibt es nichts zu lernen. Gut gemacht!</p>
        <Button variant="primary" onClick={() => navigate('/')}>Zurück zum Dashboard</Button>
      </div>
    );
  }

  const currentTask = studyQueue[currentIndex];

  const nextTask = () => {
    if (currentIndex < studyQueue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("Lerneinheit abgeschlossen!");
      navigate('/');
    }
  };

  const renderTask = () => {
    switch (currentTask.type) {
      case 'flashcard':
        return <FlashcardTask key={currentTask.id} node={currentTask.node} item={currentTask.item} onNext={nextTask} />;
      case 'question':
        return <QuestionTask key={currentTask.id} node={currentTask.node} item={currentTask.item} onNext={nextTask} />;
      case 'free_recall':
        return <FreeRecallTask key={currentTask.id} node={currentTask.node} onNext={nextTask} />;
      case 'mindmap':
        return <MindmapTask key={currentTask.id} node={currentTask.node} childrenIds={currentTask.childrenIds} onNext={nextTask} />;
      default:
        return <div>Unbekannter Aufgabentyp</div>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center pt-20">
      <div className="w-full max-w-2xl px-6">
        <div className="mb-8 flex items-center justify-between">
          <Button variant="secondary" onClick={() => navigate('/')}>
            <ArrowLeft size={14} className="mr-1" /> Abbrechen
          </Button>
          <div className="flex items-center gap-4">
            <span className="text-[12px] font-medium text-text-primary px-2 py-1 bg-bg-secondary rounded">Thema: {currentTask.node.title}</span>
            <span className="text-text-disabled text-sm font-medium">{currentIndex + 1} / {studyQueue.length}</span>
          </div>
        </div>
        
        {renderTask()}
      </div>
    </div>
  );
};
