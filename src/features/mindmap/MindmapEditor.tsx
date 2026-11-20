import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Edge,
  type Node as FlowNode,
  type ReactFlowInstance,
  BackgroundVariant,
  MiniMap,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore, useNodesByMindmap, useEdgesByMindmap } from '../../store';
import type { MindmapNode, NodeAttachment, NodeFontSize, NodeImageSize } from '../../types';
import { MindmapNodeComponent } from './MindmapNode';
import { MindmapEdge } from './MindmapEdge';
import { NodeDetailPanel } from './NodeDetailPanel';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import {
  Plus,
  Pencil,
  MousePointer2,
  Workflow,
  Upload,
  FileText,
  X,
  ExternalLink,
  ImageIcon,
  Loader2,
  AlertTriangle,
  Type,
  Link2,
  ChevronsUpDown,
} from 'lucide-react';
import { DrawingOverlay } from '../canvas/DrawingOverlay';
import { cn } from '../../utils/cn';
import { autoLayoutMindmap, getNodeDimensions, DEFAULT_LAYOUT_CONFIG } from './mindmapLayout';
import {
  fileToAttachment,
  formatFileSize,
  getAttachmentFullData,
  openFileAttachment,
} from '../../utils/attachmentStorage';
import { usePDFViewerStore } from '../../store/pdfViewerStore';

const nodeTypes = {
  mindmapNode: MindmapNodeComponent,
};

const edgeTypes = {
  mindmapEdge: MindmapEdge,
};

interface MindmapEditorProps {
  mindmapId: string;
  projectId: string;
}

// Wrapper to safely access React Flow viewport
const FlowDrawingOverlay: React.FC<{ mindmapId: string; isDrawingMode: boolean }> = ({
  mindmapId,
  isDrawingMode,
}) => {
  const viewport = useViewport();
  return (
    <DrawingOverlay
      canvasId={`mindmap-${mindmapId}`}
      isDrawingMode={isDrawingMode}
      transform={viewport}
    />
  );
};

export const MindmapEditor: React.FC<MindmapEditorProps> = ({ mindmapId, projectId }) => {
  const storeNodes = useNodesByMindmap(mindmapId);
  const storeEdges = useEdgesByMindmap(mindmapId);
  const {
    createNode,
    updateNode,
    deleteNode,
    moveNode,
    batchMoveNodes,
    createEdge,
    updateEdge,
    deleteEdge,
    updateMindmap,
  } = useStore();

  const mindmap = useStore((s) => s.mindmaps[mindmapId]);
  const fontScale = mindmap?.fontScale ?? 1;

  const handleFontScaleChange = (scale: number) => {
    updateMindmap(mindmapId, { fontScale: scale });
  };

  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const { openViewer } = usePDFViewerStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addDirection, setAddDirection] = useState<'right' | 'left' | 'top' | 'bottom'>('right');
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Attachment states for adding a node
  const [stagedAttachments, setStagedAttachments] = useState<NodeAttachment[]>([]);
  const [newNodeFontSize, setNewNodeFontSize] = useState<NodeFontSize>('md');
  const [newNodeImageSize, setNewNodeImageSize] = useState<NodeImageSize>('md');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox for expanded image
  const [expandedImage, setExpandedImage] = useState<{
    name: string;
    url: string;
    size?: number;
  } | null>(null);

  // Deletion confirmation state
  const [nodePendingDelete, setNodePendingDelete] = useState<MindmapNode | null>(null);

  const requestDeleteNode = useCallback(
    (id: string) => {
      const target = storeNodes.find((n) => n.id === id);
      if (target) {
        setNodePendingDelete(target);
      }
    },
    [storeNodes]
  );

  const confirmDeleteNode = useCallback(() => {
    if (!nodePendingDelete) return;
    deleteNode(nodePendingDelete.id);
    if (selectedNodeId === nodePendingDelete.id) {
      setSelectedNodeId(null);
    }
    setNodePendingDelete(null);
  }, [nodePendingDelete, deleteNode, selectedNodeId]);

  const countDescendants = useCallback(
    function getDescendantCount(nodeId: string): number {
      let count = 0;
      const direct = storeNodes.filter((n) => n.parentId === nodeId);
      count += direct.length;
      for (const child of direct) {
        count += getDescendantCount(child.id);
      }
      return count;
    },
    [storeNodes]
  );

  // Handle new edge connection creation (both manual click-to-connect and drag-to-connect)
  const handleCreateConnection = useCallback(
    (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) {
        setConnectingFromNodeId(null);
        return;
      }

      const existing = storeEdges.find(
        (e) => e.sourceId === sourceId && e.targetId === targetId
      );

      if (existing) {
        setEditingEdgeId(existing.id);
      } else {
        const newEdge = createEdge(mindmapId, sourceId, targetId);
        setEditingEdgeId(newEdge.id);
      }

      setConnectingFromNodeId(null);
    },
    [storeEdges, createEdge, mindmapId]
  );

  // Global Escape key listener to cancel connecting or edge label editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectingFromNodeId) {
          setConnectingFromNodeId(null);
        }
        if (editingEdgeId) {
          setEditingEdgeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectingFromNodeId, editingEdgeId]);

  // Collapsed branches state (Faltbare Teilbäume)
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());

  const toggleCollapseNode = useCallback((nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const toggleCollapseAll = useCallback(() => {
    setCollapsedNodeIds((prev) => {
      if (prev.size > 0) {
        return new Set();
      }
      const nodesWithChildren = new Set<string>();
      storeNodes.forEach((n) => {
        if (storeNodes.some((c) => c.parentId === n.id)) {
          nodesWithChildren.add(n.id);
        }
      });
      return nodesWithChildren;
    });
  }, [storeNodes]);

  // Recursively calculate all hidden descendant node IDs
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set<string>();
    const addDescendants = (parentId: string) => {
      const children = storeNodes.filter((n) => n.parentId === parentId);
      children.forEach((c) => {
        hidden.add(c.id);
        addDescendants(c.id);
      });
    };

    collapsedNodeIds.forEach((id) => {
      addDescendants(id);
    });

    return hidden;
  }, [storeNodes, collapsedNodeIds]);

  const visibleStoreNodes = useMemo(() => {
    return storeNodes.filter((n) => !hiddenNodeIds.has(n.id));
  }, [storeNodes, hiddenNodeIds]);

  const visibleStoreEdges = useMemo(() => {
    return storeEdges.filter(
      (e) => !hiddenNodeIds.has(e.sourceId) && !hiddenNodeIds.has(e.targetId)
    );
  }, [storeEdges, hiddenNodeIds]);

  // Convert store nodes to React Flow nodes
  const toFlowNodes = useCallback(
    (nodes: MindmapNode[]): FlowNode[] => {
      return nodes.map((n) => {
        const directChildren = storeNodes.filter((c) => c.parentId === n.id);
        const hasChildren = directChildren.length > 0;
        const descendantCount = countDescendants(n.id);
        const isCollapsed = collapsedNodeIds.has(n.id);

        return {
          id: n.id,
          type: 'mindmapNode',
          position: n.position,
          data: {
            label: n.title,
            nodeId: n.id,
            isRoot: n.parentId === null,
            isSelected: n.id === selectedNodeId,
            attachments: n.attachments || [],
            linkedPdfPages: n.linkedPdfPages || [],
            onOpenPdfPage: (docId: string, page: number) => openViewer(docId, page),
            fontSize: n.fontSize || (n.parentId === null ? 'lg' : 'md'),
            imageSize: n.imageSize || 'md',
            fontScale,
            hasChildren,
            descendantCount,
            isCollapsed,
            onToggleCollapse: toggleCollapseNode,
            isConnectingSource: connectingFromNodeId === n.id,
            isConnectingCandidate: connectingFromNodeId !== null && connectingFromNodeId !== n.id,
            onStartConnecting: (id: string) => {
              setConnectingFromNodeId((prev) => (prev === id ? null : id));
            },
            onCompleteConnecting: (targetId: string) => {
              if (connectingFromNodeId) {
                handleCreateConnection(connectingFromNodeId, targetId);
              }
            },
            onSelect: (id: string) => setSelectedNodeId(id),
            onAddChild: (parentId: string, direction: 'right' | 'left' | 'top' | 'bottom' = 'right') => {
              setAddingChildOf(parentId);
              setAddDirection(direction);
              setStagedAttachments([]);
              setNewNodeFontSize('md');
              setNewNodeImageSize('md');
              setShowAddNode(true);
            },
            onDelete: (id: string) => {
              requestDeleteNode(id);
            },
            onRename: (id: string, title: string) => {
              updateNode(id, { title });
            },
            onExpandImage: async (att: NodeAttachment) => {
              const fullUrl = await getAttachmentFullData(att);
              setExpandedImage({
                name: att.name,
                url: fullUrl || att.dataUrl || '',
                size: att.size,
              });
            },
            onOpenFile: (att: NodeAttachment) => {
              openFileAttachment(att);
            },
          },
          selected: n.id === selectedNodeId,
        };
      });
    },
    [
      selectedNodeId,
      connectingFromNodeId,
      handleCreateConnection,
      requestDeleteNode,
      updateNode,
      fontScale,
      storeNodes,
      collapsedNodeIds,
      countDescendants,
      toggleCollapseNode,
      openViewer,
    ]
  );

  // Convert store edges to React Flow edges with dynamically calculated handles and non-overlapping offsets
  const toFlowEdges = useCallback(
    (edges: typeof storeEdges, currentNodes: MindmapNode[]): Edge[] => {
      // Deduplicate edges by sourceId->targetId to guarantee no duplicate parallel lines
      const seenPairs = new Set<string>();
      const dedupedEdges: typeof edges = [];
      edges.forEach((e) => {
        const pairKey = `${e.sourceId}->${e.targetId}`;
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          dedupedEdges.push(e);
        }
      });

      const nodeMap = new Map<string, MindmapNode>();
      currentNodes.forEach((n) => nodeMap.set(n.id, n));

      interface EdgeMeta {
        edge: (typeof storeEdges)[0];
        sourceNode?: MindmapNode;
        targetNode?: MindmapNode;
        direction: 'right' | 'left' | 'top' | 'bottom';
        sourceHandle: string;
        targetHandle: string;
      }

      const metaList: EdgeMeta[] = dedupedEdges.map((e) => {
        const sourceNode = nodeMap.get(e.sourceId);
        const targetNode = nodeMap.get(e.targetId);

        let direction: 'right' | 'left' | 'top' | 'bottom' = 'right';
        let sourceHandle = 'source-right';
        let targetHandle = 'target-left';

        if (sourceNode && targetNode) {
          const sDims = getNodeDimensions(sourceNode, { ...DEFAULT_LAYOUT_CONFIG, fontScale });
          const tDims = getNodeDimensions(targetNode, { ...DEFAULT_LAYOUT_CONFIG, fontScale });

          const sLeft = sourceNode.position.x;
          const sRight = sLeft + sDims.width;
          const sTop = sourceNode.position.y;
          const sBottom = sTop + sDims.height;
          const sCenterX = sLeft + sDims.width / 2;
          const sCenterY = sTop + sDims.height / 2;

          const tLeft = targetNode.position.x;
          const tRight = tLeft + tDims.width;
          const tTop = targetNode.position.y;
          const tBottom = tTop + tDims.height;
          const tCenterX = tLeft + tDims.width / 2;
          const tCenterY = tTop + tDims.height / 2;

          const cdx = tCenterX - sCenterX;
          const cdy = tCenterY - sCenterY;

          const overlapX = Math.min(sRight, tRight) - Math.max(sLeft, tLeft);
          const overlapY = Math.min(sBottom, tBottom) - Math.max(sTop, tTop);

          // 1. Dominant vertical alignment: nodes share horizontal interval or are vertically stacked
          if (overlapX > -30 && Math.abs(cdy) >= 20 && Math.abs(cdy) >= Math.abs(cdx) * 0.45) {
            if (cdy >= 0) {
              direction = 'bottom';
              sourceHandle = 'source-bottom';
              targetHandle = 'target-top';
            } else {
              direction = 'top';
              sourceHandle = 'source-top';
              targetHandle = 'target-bottom';
            }
          }
          // 2. Dominant horizontal alignment: nodes share vertical interval or are horizontally adjacent
          else if (overlapY > -25 && Math.abs(cdx) >= 20 && Math.abs(cdx) >= Math.abs(cdy) * 0.45) {
            if (cdx >= 0) {
              direction = 'right';
              sourceHandle = 'source-right';
              targetHandle = 'target-left';
            } else {
              direction = 'left';
              sourceHandle = 'source-left';
              targetHandle = 'target-right';
            }
          }
          // 3. Diagonal separation: compare aspect-ratio-weighted edge-to-edge gap
          else {
            const gapX = cdx > 0 ? Math.max(0, tLeft - sRight) : Math.max(0, sLeft - tRight);
            const gapY = cdy > 0 ? Math.max(0, tTop - sBottom) : Math.max(0, sTop - tBottom);

            // Because mindmap nodes are 2.5x-3x wider than tall, vertical gaps dominate visual flow
            if (gapY * 1.45 >= gapX) {
              if (cdy >= 0) {
                direction = 'bottom';
                sourceHandle = 'source-bottom';
                targetHandle = 'target-top';
              } else {
                direction = 'top';
                sourceHandle = 'source-top';
                targetHandle = 'target-bottom';
              }
            } else {
              if (cdx >= 0) {
                direction = 'right';
                sourceHandle = 'source-right';
                targetHandle = 'target-left';
              } else {
                direction = 'left';
                sourceHandle = 'source-left';
                targetHandle = 'target-right';
              }
            }
          }
        }

        return { edge: e, sourceNode, targetNode, direction, sourceHandle, targetHandle };
      });

      // Group edges by sourceId + sourceHandle to distribute exit points along node border
      const sourceGroups = new Map<string, EdgeMeta[]>();
      metaList.forEach((meta) => {
        const key = `${meta.edge.sourceId}_${meta.sourceHandle}`;
        const list = sourceGroups.get(key) || [];
        list.push(meta);
        sourceGroups.set(key, list);
      });

      // Group edges by targetId + targetHandle to distribute entry points along node border
      const targetGroups = new Map<string, EdgeMeta[]>();
      metaList.forEach((meta) => {
        const key = `${meta.edge.targetId}_${meta.targetHandle}`;
        const list = targetGroups.get(key) || [];
        list.push(meta);
        targetGroups.set(key, list);
      });

      const sourceIndices = new Map<string, number>();
      const targetIndices = new Map<string, number>();

      sourceGroups.forEach((group) => {
        if (group[0].sourceHandle.includes('left') || group[0].sourceHandle.includes('right')) {
          group.sort((a, b) => (a.targetNode?.position.y ?? 0) - (b.targetNode?.position.y ?? 0));
        } else {
          group.sort((a, b) => (a.targetNode?.position.x ?? 0) - (b.targetNode?.position.x ?? 0));
        }
        group.forEach((meta, idx) => {
          sourceIndices.set(meta.edge.id, idx);
        });
      });

      targetGroups.forEach((group) => {
        if (group[0].targetHandle.includes('left') || group[0].targetHandle.includes('right')) {
          group.sort((a, b) => (a.sourceNode?.position.y ?? 0) - (b.sourceNode?.position.y ?? 0));
        } else {
          group.sort((a, b) => (a.sourceNode?.position.x ?? 0) - (b.sourceNode?.position.x ?? 0));
        }
        group.forEach((meta, idx) => {
          targetIndices.set(meta.edge.id, idx);
        });
      });

      const flowEdges: Edge[] = metaList.map((meta) => {
        const sourceGroup = sourceGroups.get(`${meta.edge.sourceId}_${meta.sourceHandle}`) || [];
        const targetGroup = targetGroups.get(`${meta.edge.targetId}_${meta.targetHandle}`) || [];
        const sourceIdx = sourceIndices.get(meta.edge.id) ?? 0;
        const targetIdx = targetIndices.get(meta.edge.id) ?? 0;

        let offsetSourceX = 0;
        let offsetSourceY = 0;
        let offsetTargetX = 0;
        let offsetTargetY = 0;

        if (sourceGroup.length > 1) {
          if (meta.sourceHandle.includes('left') || meta.sourceHandle.includes('right')) {
            const maxSpan = 26;
            offsetSourceY = -maxSpan / 2 + sourceIdx * (maxSpan / (sourceGroup.length - 1));
          } else {
            const maxSpan = 36;
            offsetSourceX = -maxSpan / 2 + sourceIdx * (maxSpan / (sourceGroup.length - 1));
          }
        }

        if (targetGroup.length > 1) {
          if (meta.targetHandle.includes('left') || meta.targetHandle.includes('right')) {
            const maxSpan = 24;
            offsetTargetY = -maxSpan / 2 + targetIdx * (maxSpan / (targetGroup.length - 1));
          } else {
            const maxSpan = 32;
            offsetTargetX = -maxSpan / 2 + targetIdx * (maxSpan / (targetGroup.length - 1));
          }
        }

        return {
          id: meta.edge.id,
          source: meta.edge.sourceId,
          target: meta.edge.targetId,
          sourceHandle: meta.sourceHandle,
          targetHandle: meta.targetHandle,
          type: 'mindmapEdge',
          markerEnd: 'url(#mindmap-arrow)',
          data: {
            label: meta.edge.label || '',
            offsetSourceX,
            offsetSourceY,
            offsetTargetX,
            offsetTargetY,
            isEditing: editingEdgeId === meta.edge.id,
            onStartEdit: () => setEditingEdgeId(meta.edge.id),
            onCancelEdit: () => setEditingEdgeId(null),
            onUpdateLabel: (text: string) => {
              updateEdge(meta.edge.id, { label: text });
              setEditingEdgeId(null);
            },
            onDeleteEdge: () => {
              deleteEdge(meta.edge.id);
              if (editingEdgeId === meta.edge.id) {
                setEditingEdgeId(null);
              }
            },
          },
        };
      });

      return flowEdges;
    },
    [editingEdgeId, updateEdge, deleteEdge, fontScale]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(visibleStoreNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(visibleStoreEdges, visibleStoreNodes));

  // Sync store → flow nodes
  useEffect(() => {
    setNodes(toFlowNodes(visibleStoreNodes));
  }, [visibleStoreNodes, toFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(toFlowEdges(visibleStoreEdges, visibleStoreNodes));
  }, [visibleStoreEdges, visibleStoreNodes, toFlowEdges, setEdges]);

  // Handle node changes (drag and keyboard delete)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filteredChanges: NodeChange[] = [];
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          moveNode(change.id, change.position);
          filteredChanges.push(change);
        } else if (change.type === 'remove') {
          // Intercept removal to prompt for confirmation
          requestDeleteNode(change.id);
        } else {
          filteredChanges.push(change);
        }
      });
      if (filteredChanges.length > 0) {
        onNodesChange(filteredChanges);
      }
    },
    [onNodesChange, moveNode, requestDeleteNode]
  );

  // Handle new edge connections from drag-and-drop
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;
      handleCreateConnection(connection.source, connection.target);
    },
    [handleCreateConnection]
  );

  // Handle edge deletion
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteEdge(change.id);
        }
      });
    },
    [onEdgesChange, deleteEdge]
  );

  // Auto-Layout
  const handleAutoLayout = useCallback(() => {
    if (storeNodes.length === 0) return;

    // Clean up any existing duplicate edges in the store
    const seenPairs = new Set<string>();
    const duplicateEdgeIds: string[] = [];
    storeEdges.forEach((e) => {
      const pairKey = `${e.sourceId}->${e.targetId}`;
      if (seenPairs.has(pairKey)) {
        duplicateEdgeIds.push(e.id);
      } else {
        seenPairs.add(pairKey);
      }
    });

    if (duplicateEdgeIds.length > 0) {
      duplicateEdgeIds.forEach((id) => deleteEdge(id));
    }

    const cleanEdges = storeEdges.filter((e) => !duplicateEdgeIds.includes(e.id));
    const updates = autoLayoutMindmap(storeNodes, cleanEdges, { fontScale });
    const updateMap = new Map(updates.map((u) => [u.id, u.position]));
    const updatedNodes = storeNodes.map((n) => ({
      ...n,
      position: updateMap.get(n.id) || n.position,
    }));
    setNodes(toFlowNodes(updatedNodes));
    setEdges(toFlowEdges(cleanEdges, updatedNodes));
    batchMoveNodes(updates);
    setTimeout(() => {
      rfInstance?.fitView({
        padding: 0.22,
        duration: 400,
        minZoom: 0.35,
        maxZoom: 1.15,
      });
    }, 60);
  }, [storeNodes, storeEdges, deleteEdge, batchMoveNodes, toFlowNodes, toFlowEdges, setNodes, setEdges, rfInstance, fontScale]);

  // Global paste handler for images from clipboard (Strg + V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
            const safeName =
              !file.name || file.name === 'image.png'
                ? `Screenshot_${timeStr}.png`
                : file.name;
            const renamed = new File([file], safeName, { type: file.type });
            imageFiles.push(renamed);
          }
        }
      }

      if (imageFiles.length === 0) return;

      // Prevent default browser behavior since we handle image pasting
      e.preventDefault();

      // Case 1: Modal "Knoten hinzufügen" is open
      if (showAddNode) {
        setIsProcessingFiles(true);
        try {
          const newAtts: NodeAttachment[] = [];
          for (const file of imageFiles) {
            const att = await fileToAttachment(file);
            newAtts.push(att);
          }
          setStagedAttachments((prev) => [...prev, ...newAtts]);
        } catch (err) {
          console.error('Failed to paste image in modal', err);
        } finally {
          setIsProcessingFiles(false);
        }
        return;
      }

      // Case 2: A node is currently selected
      if (selectedNodeId) {
        const targetNode = storeNodes.find((n) => n.id === selectedNodeId);
        if (targetNode) {
          try {
            const newAtts: NodeAttachment[] = [];
            for (const file of imageFiles) {
              const att = await fileToAttachment(file);
              newAtts.push(att);
            }
            updateNode(selectedNodeId, {
              attachments: [...(targetNode.attachments || []), ...newAtts],
            });
          } catch (err) {
            console.error('Failed to paste image on node', err);
          }
        }
        return;
      }

      // Case 3: Canvas paste (no node selected) -> create a new root node with this image
      try {
        const newAtts: NodeAttachment[] = [];
        for (const file of imageFiles) {
          const att = await fileToAttachment(file);
          newAtts.push(att);
        }

        let position = { x: 200, y: 200 };
        if (rfInstance) {
          position = rfInstance.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          });
        } else {
          const rootNodes = storeNodes.filter((n) => !n.parentId);
          position = { x: 100, y: 100 + rootNodes.length * 90 };
        }

        const title = imageFiles[0]?.name.replace(/\.[^/.]+$/, '') || 'Bild';
        const node = createNode(mindmapId, projectId, title, null, position, newAtts);
        setSelectedNodeId(node.id);
      } catch (err) {
        console.error('Failed to create node from pasted image', err);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [
    showAddNode,
    selectedNodeId,
    storeNodes,
    updateNode,
    createNode,
    mindmapId,
    projectId,
    rfInstance,
  ]);

  // Process files selected or dropped in Add Node modal
  const handleAddFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessingFiles(true);
    try {
      const processed: NodeAttachment[] = [];
      for (const file of files) {
        const att = await fileToAttachment(file);
        processed.push(att);
      }
      setStagedAttachments((prev) => [...prev, ...processed]);
    } catch (err) {
      console.error('Failed to read files', err);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer?.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveStagedAttachment = (index: number) => {
    setStagedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Node logic supporting all 4 directions and root nodes
  const handleAddNode = () => {
    if (!newNodeTitle.trim()) return;

    const parentNode = addingChildOf ? storeNodes.find((n) => n.id === addingChildOf) : null;
    let position = { x: 200, y: 200 };

    if (parentNode) {
      const siblings = storeNodes.filter((n) => n.parentId === addingChildOf);

      if (addDirection === 'right') {
        const rightSiblings = siblings.filter((s) => s.position.x > parentNode.position.x);
        position = {
          x: parentNode.position.x + 240,
          y: parentNode.position.y + rightSiblings.length * 70,
        };
      } else if (addDirection === 'left') {
        const leftSiblings = siblings.filter((s) => s.position.x < parentNode.position.x);
        position = {
          x: parentNode.position.x - 240,
          y: parentNode.position.y + leftSiblings.length * 70,
        };
      } else if (addDirection === 'top') {
        const topSiblings = siblings.filter((s) => s.position.y < parentNode.position.y);
        position = {
          x: parentNode.position.x + topSiblings.length * 170,
          y: parentNode.position.y - 130,
        };
      } else if (addDirection === 'bottom') {
        const bottomSiblings = siblings.filter((s) => s.position.y > parentNode.position.y);
        position = {
          x: parentNode.position.x + bottomSiblings.length * 170,
          y: parentNode.position.y + 130,
        };
      }
    } else {
      // Adding a new root / independent starting node
      const rootNodes = storeNodes.filter((n) => !n.parentId);
      position = { x: 100, y: 100 + rootNodes.length * 90 };
    }

    const node = createNode(
      mindmapId,
      projectId,
      newNodeTitle.trim(),
      addingChildOf,
      position,
      stagedAttachments,
      newNodeFontSize,
      newNodeImageSize
    );

    if (addingChildOf) {
      createEdge(mindmapId, addingChildOf, node.id);
    }

    setShowAddNode(false);
    setNewNodeTitle('');
    setStagedAttachments([]);
    setNewNodeFontSize('md');
    setNewNodeImageSize('md');
    setAddingChildOf(null);
    setSelectedNodeId(node.id);
  };

  const selectedNode = selectedNodeId ? storeNodes.find((n) => n.id === selectedNodeId) : null;

  const getAddModalTitle = () => {
    if (!addingChildOf) return 'Neuen Anfangsknoten hinzufügen';
    switch (addDirection) {
      case 'left':
        return 'Knoten links hinzufügen';
      case 'top':
        return 'Knoten oben hinzufügen';
      case 'bottom':
        return 'Knoten unten hinzufügen';
      case 'right':
      default:
        return 'Knoten rechts hinzufügen';
    }
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* React Flow Canvas */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          connectionMode={ConnectionMode.Loose}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onEdgeClick={(_, edge) => {
            setEditingEdgeId(edge.id);
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setEditingEdgeId(null);
            setConnectingFromNodeId(null);
          }}
          onInit={setRfInstance}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2.5}
          deleteKeyCode={['Delete', 'Backspace']}
          nodesDraggable={!isDrawingMode}
          panOnDrag={!isDrawingMode}
          zoomOnScroll={!isDrawingMode}
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="#CCCCCC"
            gap={20}
            size={1}
          />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor="#DDDDDD"
            maskColor="rgba(242,242,242,0.75)"
            style={{ width: 110, height: 72 }}
          />

          {/* SVG Marker definitions for connection line arrows */}
          <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
            <defs>
              <marker
                id="mindmap-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8E8E93" />
              </marker>
              <marker
                id="mindmap-arrow-selected"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0D0D0D" />
              </marker>
            </defs>
          </svg>

          {/* Drawing overlay */}
          <FlowDrawingOverlay
            mindmapId={mindmapId}
            isDrawingMode={isDrawingMode}
          />
        </ReactFlow>

        {/* Active connection mode banner */}
        {connectingFromNodeId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-[#0D0D0D] text-white px-4 py-2 rounded-full shadow-xl border border-border text-xs animate-in fade-in slide-in-from-top-2 duration-150">
            <Link2 size={13} className="text-accent shrink-0 animate-pulse" />
            <span>
              Verbindung von <strong>„{storeNodes.find((n) => n.id === connectingFromNodeId)?.title || 'Knoten'}“</strong>: Klicke auf den Zielknoten
            </span>
            <button
              onClick={() => setConnectingFromNodeId(null)}
              className="ml-1 text-white/70 hover:text-white px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium transition-colors cursor-pointer"
              title="Abbrechen (Esc)"
            >
              Abbrechen
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[100] flex items-center gap-1.5 flex-wrap justify-end max-w-[calc(100%-1.5rem)]">
          {/* Drawing mode toggle */}
          <div className="flex items-center rounded border border-border bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setIsDrawingMode(false)}
              title="Zeiger-Modus (V)"
              className={cn(
                'px-2 py-1 text-[11px] flex items-center gap-1 transition-colors',
                !isDrawingMode
                  ? 'bg-[#0D0D0D] text-white'
                  : 'text-text-secondary hover:bg-bg-secondary'
              )}
            >
              <MousePointer2 size={11} />
            </button>
            <button
              onClick={() => setIsDrawingMode(true)}
              title="Zeichen-Modus (P)"
              className={cn(
                'px-2 py-1 text-[11px] flex items-center gap-1 transition-colors border-l border-border',
                isDrawingMode
                  ? 'bg-[#0D0D0D] text-white'
                  : 'text-text-secondary hover:bg-bg-secondary'
              )}
            >
              <Pencil size={11} />
            </button>
          </div>

          {/* Global Font Scale Slider */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 bg-white border border-border rounded shadow-sm"
            title="Schriftgröße aller Knoten anpassen (hilfreich beim Herauszoomen)"
          >
            <Type size={12} className="text-text-secondary shrink-0" />
            <span className="text-[10px] font-medium text-text-disabled select-none">A</span>
            <input
              type="range"
              min="0.7"
              max="2.5"
              step="0.05"
              value={fontScale}
              onChange={(e) => handleFontScaleChange(parseFloat(e.target.value))}
              className="w-16 sm:w-24 h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-[#0D0D0D]"
              title={`Schriftgröße: ${Math.round(fontScale * 100)}%`}
            />
            <span className="text-[12px] font-semibold text-text-disabled select-none">A</span>
            <button
              type="button"
              onClick={() => handleFontScaleChange(1)}
              title="Auf 100% zurücksetzen"
              className={cn(
                'text-[10.5px] font-mono font-medium px-1 py-0.5 rounded transition-colors cursor-pointer',
                fontScale === 1
                  ? 'text-text-disabled'
                  : 'text-text-primary hover:bg-bg-secondary hover:text-accent font-semibold'
              )}
            >
              {Math.round(fontScale * 100)}%
            </button>
          </div>

          {/* Auto-Layout button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoLayout}
            title="Mindmap automatisch ordnen"
            className="shadow-sm flex items-center gap-1"
          >
            <Workflow size={11} /> Ordnen
          </Button>

          {/* Collapse/Expand subtrees button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleCollapseAll}
            title={collapsedNodeIds.size > 0 ? 'Alle Äste ausklappen' : 'Alle Unteräste einklappen'}
            className="shadow-sm flex items-center gap-1"
          >
            <ChevronsUpDown size={11} /> {collapsedNodeIds.size > 0 ? 'Ausklappen' : 'Einklappen'}
          </Button>

          {/* Connect button if a node is selected */}
          {selectedNodeId && (
            <Button
              variant={connectingFromNodeId === selectedNodeId ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setConnectingFromNodeId((prev) => (prev === selectedNodeId ? null : selectedNodeId));
              }}
              title="Diesen Knoten mit einem anderen Knoten verbinden (A → B)"
              className="shadow-sm flex items-center gap-1"
            >
              <Link2 size={11} /> Verbinden
            </Button>
          )}

          {/* Add root node button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAddingChildOf(null);
              setStagedAttachments([]);
              setNewNodeFontSize('lg');
              setNewNodeImageSize('md');
              setShowAddNode(true);
            }}
            disabled={isDrawingMode}
            className="shadow-sm"
          >
            <Plus size={11} strokeWidth={2.5} /> Knoten
          </Button>
        </div>
      </div>

      {/* Detail panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          projectId={projectId}
          onClose={() => setSelectedNodeId(null)}
          onStartConnecting={(nodeId) => setConnectingFromNodeId(nodeId)}
          onAddChild={(parentId, direction = 'right') => {
            setAddingChildOf(parentId);
            setAddDirection(direction);
            setStagedAttachments([]);
            setNewNodeFontSize('md');
            setNewNodeImageSize('md');
            setShowAddNode(true);
          }}
          onDeleteNode={(id) => {
            requestDeleteNode(id);
          }}
          onExpandImage={(att) => {
            getAttachmentFullData(att).then((fullUrl) => {
              setExpandedImage({
                name: att.name,
                url: fullUrl || att.dataUrl || '',
                size: att.size,
              });
            });
          }}
        />
      )}

      {/* Add node modal with file / image dropzone */}
      <Modal
        isOpen={showAddNode}
        onClose={() => {
          setShowAddNode(false);
          setNewNodeTitle('');
          setStagedAttachments([]);
          setNewNodeFontSize('md');
          setNewNodeImageSize('md');
          setAddingChildOf(null);
        }}
        title={getAddModalTitle()}
        size="sm"
      >
        <div className="flex flex-col gap-3">
          {addingChildOf && (
            <p className="text-[12px] text-text-secondary">
              Verknüpft mit:{' '}
              <strong className="text-text-primary">
                {storeNodes.find((n) => n.id === addingChildOf)?.title}
              </strong>
            </p>
          )}

          <Input
            label="Bezeichnung"
            placeholder="z.B. Prophase"
            value={newNodeTitle}
            onChange={(e) => setNewNodeTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
            autoFocus
          />

          {/* Node styling options */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10.5px] font-medium text-text-secondary block mb-1">
                Schriftgröße
              </label>
              <div className="flex rounded border border-border bg-bg-secondary p-0.5">
                {(['sm', 'md', 'lg', 'xl'] as NodeFontSize[]).map((size) => {
                  const isActive = newNodeFontSize === size;
                  const label = size === 'sm' ? 'S' : size === 'md' ? 'M' : size === 'lg' ? 'L' : 'XL';
                  const desc =
                    size === 'sm'
                      ? 'Klein'
                      : size === 'md'
                      ? 'Normal'
                      : size === 'lg'
                      ? 'Groß'
                      : 'Sehr groß';
                  return (
                    <button
                      key={size}
                      type="button"
                      title={desc}
                      onClick={() => setNewNodeFontSize(size)}
                      className={cn(
                        'flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center cursor-pointer',
                        isActive
                          ? 'bg-[#0D0D0D] text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-text-secondary block mb-1">
                Bildgröße
              </label>
              <div className="flex rounded border border-border bg-bg-secondary p-0.5">
                {(['sm', 'md', 'lg', 'xl'] as NodeImageSize[]).map((size) => {
                  const isActive = newNodeImageSize === size;
                  const label = size === 'sm' ? 'S' : size === 'md' ? 'M' : size === 'lg' ? 'L' : 'XL';
                  const desc =
                    size === 'sm'
                      ? 'Klein'
                      : size === 'md'
                      ? 'Mittel'
                      : size === 'lg'
                      ? 'Groß'
                      : 'Sehr groß';
                  return (
                    <button
                      key={size}
                      type="button"
                      title={desc}
                      onClick={() => setNewNodeImageSize(size)}
                      className={cn(
                        'flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center cursor-pointer',
                        isActive
                          ? 'bg-[#0D0D0D] text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dropzone for files & images */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-text-secondary">
              Bilder & Dateien (optional)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFiles(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingFiles(false);
              }}
              onDrop={handleDropFiles}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-md p-3.5 text-center cursor-pointer transition-colors',
                isDraggingFiles
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-text-secondary bg-bg-secondary/40 hover:bg-bg-secondary'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleSelectFiles}
              />
              <Upload size={18} className="mx-auto text-text-secondary mb-1.5" />
              <p className="text-[12px] font-medium text-text-primary">
                Dateien oder Bilder hier hineinziehen
              </p>
              <p className="text-[10.5px] text-text-disabled mt-0.5">
                oder klicken / mit <kbd className="px-1 py-0.5 rounded bg-bg-tertiary border border-border text-[9.5px] font-mono">Strg + V</kbd> einfügen
              </p>
            </div>

            {isProcessingFiles && (
              <div className="flex items-center gap-2 text-[11px] text-text-secondary py-1">
                <Loader2 size={12} className="animate-spin text-accent" />
                <span>Dateien werden verarbeitet…</span>
              </div>
            )}

            {/* Staged attachments preview */}
            {stagedAttachments.length > 0 && (
              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto scrollbar-thin mt-1">
                {stagedAttachments.map((att, idx) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-bg-secondary text-[11.5px] border border-border/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.type === 'image' && att.dataUrl ? (
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-6 h-6 object-cover rounded shrink-0 border border-border"
                        />
                      ) : (
                        <FileText size={14} className="shrink-0 text-text-secondary" />
                      )}
                      <span className="truncate text-text-primary font-medium">
                        {att.name}
                      </span>
                      <span className="text-[10px] text-text-disabled shrink-0">
                        ({formatFileSize(att.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveStagedAttachment(idx)}
                      className="text-text-disabled hover:text-danger p-0.5 rounded transition-colors"
                      title="Entfernen"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-1.5 pt-2 border-t border-border mt-1">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddNode(false);
                setNewNodeTitle('');
                setStagedAttachments([]);
                setNewNodeFontSize('md');
                setNewNodeImageSize('md');
                setAddingChildOf(null);
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleAddNode}
              disabled={!newNodeTitle.trim() || isProcessingFiles}
            >
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Lightbox Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div
            className="max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-bg-secondary">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon size={14} className="text-text-secondary" />
                <span className="text-[12px] font-semibold text-text-primary truncate">
                  {expandedImage.name}
                </span>
                {expandedImage.size && (
                  <span className="text-[10px] text-text-disabled">
                    ({formatFileSize(expandedImage.size)})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <a
                  href={expandedImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={11} /> Im Tab öffnen
                </a>
                <button
                  onClick={() => setExpandedImage(null)}
                  className="text-text-disabled hover:text-text-primary p-1 rounded hover:bg-bg-tertiary transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* Image display */}
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[82vh] bg-[#0F0F0F]">
              <img
                src={expandedImage.url}
                alt={expandedImage.name}
                className="max-h-[78vh] max-w-[85vw] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={nodePendingDelete !== null}
        onClose={() => setNodePendingDelete(null)}
        title="Knoten löschen?"
        size="sm"
      >
        {nodePendingDelete && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-text-primary leading-normal">
                  Möchtest du den Knoten{' '}
                  <strong className="text-text-primary font-semibold">„{nodePendingDelete.title}“</strong>{' '}
                  wirklich löschen?
                </p>

                {countDescendants(nodePendingDelete.id) > 0 && (
                  <div className="mt-2.5 p-2.5 rounded bg-danger/10 border border-danger/25 text-[11.5px] text-danger leading-relaxed">
                    <strong>Hinweis:</strong> Dieser Knoten besitzt{' '}
                    <strong>{countDescendants(nodePendingDelete.id)}</strong> untergeordnete(n) Knoten.
                    Diese werden ebenfalls gelöscht.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-1.5 pt-2 border-t border-border mt-1">
              <Button variant="secondary" onClick={() => setNodePendingDelete(null)}>
                Abbrechen
              </Button>
              <Button variant="danger" onClick={confirmDeleteNode}>
                Löschen
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
