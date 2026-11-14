import dagre from '@dagrejs/dagre';
import type { MindmapNode, MindmapEdge, NodePosition, ID } from '../../types';

export interface LayoutUpdate {
  id: ID;
  position: NodePosition;
}

export type LayoutDirection = 'right' | 'left' | 'top' | 'bottom';

export interface LayoutConfig {
  /** Global font scale multiplier (default: 1) */
  fontScale: number;
  /** Horizontal distance between parent edge and child edge (px) */
  levelGapH: number;
  /** Vertical distance between parent edge and child edge (px) */
  levelGapV: number;
  /** Vertical gap between sibling subtrees in horizontal branches (px) */
  siblingGapV: number;
  /** Horizontal gap between sibling subtrees in vertical branches (px) */
  siblingGapH: number;
  /** Clearance between root node border and first-level horizontal branches (px) */
  rootGapX: number;
  /** Clearance between root node border and first-level vertical branches (px) */
  rootGapY: number;
  /** Mandatory minimum gap between any two bounding boxes horizontally (px) */
  minNodeGapX: number;
  /** Mandatory minimum gap between any two bounding boxes vertically (px) */
  minNodeGapY: number;
  /** Vertical spacing between multiple independent root trees (px) */
  treeGap: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  fontScale: 1,
  levelGapH: 100,
  levelGapV: 90,
  siblingGapV: 36,
  siblingGapH: 48,
  rootGapX: 90,
  rootGapY: 80,
  minNodeGapX: 35,
  minNodeGapY: 28,
  treeGap: 200,
};

interface Subtree {
  node: MindmapNode;
  width: number;
  height: number;
  direction: LayoutDirection;
  children: Subtree[];
  subtreeWidth: number;
  subtreeHeight: number;
}

export interface PlacedNode {
  id: ID;
  branchId: ID;
  direction: LayoutDirection;
  /** Center X coordinate */
  x: number;
  /** Center Y coordinate */
  y: number;
  w: number;
  h: number;
}

/**
 * Accurately estimates a node's rendered dimensions based on font size,
 * text length, line breaks, attachments (images, files), and internal padding.
 */
export function getNodeDimensions(
  node: MindmapNode,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): { width: number; height: number } {
  const fontSize = node.fontSize || (node.parentId === null ? 'lg' : 'md');
  const imageSize = node.imageSize || 'md';

  // Base dimensions & characters per line based on font size class
  let baseWidth = 140;
  let baseHeight = 40;
  let charsPerLine = 24;
  let lineHeight = 16;

  switch (fontSize) {
    case 'sm':
      baseWidth = 120;
      baseHeight = 34;
      charsPerLine = 26;
      lineHeight = 14;
      break;
    case 'md':
      baseWidth = 150;
      baseHeight = 40;
      charsPerLine = 22;
      lineHeight = 16;
      break;
    case 'lg':
      baseWidth = 180;
      baseHeight = 48;
      charsPerLine = 20;
      lineHeight = 18;
      break;
    case 'xl':
      baseWidth = 220;
      baseHeight = 56;
      charsPerLine = 16;
      lineHeight = 22;
      break;
  }

  // Account for title length & explicit newlines
  const title = node.title || 'Knoten';
  const explicitLines = title.split('\n');
  let totalEstimatedLines = 0;
  let maxLineLength = 0;

  for (const line of explicitLines) {
    const len = line.trim().length;
    if (len > maxLineLength) maxLineLength = len;
    const wrapped = Math.max(1, Math.ceil(len / charsPerLine));
    totalEstimatedLines += wrapped;
  }

  let width = Math.max(baseWidth, Math.min(320, maxLineLength * 7.5 + 40));
  let height = baseHeight;

  if (totalEstimatedLines > 1) {
    height += (totalEstimatedLines - 1) * lineHeight;
  }

  // Attachments: Images and Files
  if (node.attachments && node.attachments.length > 0) {
    const images = node.attachments.filter((a) => a.type === 'image');
    const files = node.attachments.filter((a) => a.type === 'file');

    if (images.length > 0) {
      let imgHeight = 110;
      switch (imageSize) {
        case 'sm':
          imgHeight = 65;
          break;
        case 'md':
          imgHeight = 110;
          break;
        case 'lg':
          imgHeight = 180;
          break;
        case 'xl':
          imgHeight = 260;
          break;
      }

      if (images.length === 1) {
        height += imgHeight + 10;
        width = Math.max(width, imageSize === 'lg' || imageSize === 'xl' ? 240 : 180);
      } else {
        // 2-column image grid
        height += Math.round(imgHeight * 0.72) + 10;
        width = Math.max(width, 220);
      }
    }

    if (files.length > 0) {
      height += files.length * 28 + 8;
      width = Math.max(width, 190);
    }
  }

  const fontScale = config.fontScale && config.fontScale > 0 ? config.fontScale : 1;

  // Add a small safety padding to ensure generous breathing room and apply font scaling
  return {
    width: Math.round((width + 8) * fontScale),
    height: Math.round((height + 6) * fontScale),
  };
}

/**
 * Determines the quadrant direction of a child node relative to its parent.
 * Uses center-to-center coordinates and aspect-ratio weighting so downward or
 * upward intent isn't wrongly marked horizontal when titles vary in width.
 */
export function determineExistingDirection(
  child: MindmapNode,
  parent: MindmapNode,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): LayoutDirection {
  const cDims = getNodeDimensions(child, config);
  const pDims = getNodeDimensions(parent, config);
  const cCenterX = child.position.x + cDims.width / 2;
  const cCenterY = child.position.y + cDims.height / 2;
  const pCenterX = parent.position.x + pDims.width / 2;
  const pCenterY = parent.position.y + pDims.height / 2;

  const dx = cCenterX - pCenterX;
  const dy = cCenterY - pCenterY;

  // Use rectangular aspect-ratio weighting (1.35) so downward intent isn't wrongly marked horizontal
  if (Math.abs(dy) * 1.35 >= Math.abs(dx)) {
    return dy < -20 ? 'top' : 'bottom';
  } else {
    return dx < -20 ? 'left' : 'right';
  }
}

/**
 * Distributes first-level direct children of the root into 4 sectors (right, left, top, bottom).
 * If children already have deliberate spatial positions, their directional intent is preserved.
 * If children are unpositioned or clustered, they are evenly balanced.
 */
function partitionRootChildren(
  directChildren: MindmapNode[],
  rootNode: MindmapNode,
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Map<LayoutDirection, MindmapNode[]> {
  const partitions = new Map<LayoutDirection, MindmapNode[]>([
    ['right', []],
    ['left', []],
    ['top', []],
    ['bottom', []],
  ]);

  if (directChildren.length === 0) return partitions;

  const rDims = getNodeDimensions(rootNode, config);
  const rCenterX = rootNode.position.x + rDims.width / 2;
  const rCenterY = rootNode.position.y + rDims.height / 2;

  // Check if children already have varied spatial positions relative to root
  const hasDistinctPositions = directChildren.some((c) => {
    const cDims = getNodeDimensions(c, config);
    const cCenterX = c.position.x + cDims.width / 2;
    const cCenterY = c.position.y + cDims.height / 2;
    const dx = Math.abs(cCenterX - rCenterX);
    const dy = Math.abs(cCenterY - rCenterY);
    return dx > 35 || dy > 35;
  });

  if (hasDistinctPositions) {
    // Preserve user directional intent using center-based direction
    for (const child of directChildren) {
      const dir = determineExistingDirection(child, rootNode, config);
      partitions.get(dir)!.push(child);
    }
  } else {
    // Balanced distribution for new or unpositioned mindmaps
    const directions: LayoutDirection[] = ['right', 'left', 'bottom', 'top'];
    directChildren.forEach((child, index) => {
      const dir = directions[index % directions.length];
      partitions.get(dir)!.push(child);
    });
  }

  // Deterministically sort siblings in each sector by their center coordinates to prevent edge crossings
  // Right & Left branches sort from top to bottom (Y ascending)
  partitions.get('right')!.sort((a, b) => {
    const aDims = getNodeDimensions(a, config);
    const bDims = getNodeDimensions(b, config);
    const diff = (a.position.y + aDims.height / 2) - (b.position.y + bDims.height / 2);
    return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
  });
  partitions.get('left')!.sort((a, b) => {
    const aDims = getNodeDimensions(a, config);
    const bDims = getNodeDimensions(b, config);
    const diff = (a.position.y + aDims.height / 2) - (b.position.y + bDims.height / 2);
    return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
  });
  // Top & Bottom branches sort from left to right (X ascending)
  partitions.get('top')!.sort((a, b) => {
    const aDims = getNodeDimensions(a, config);
    const bDims = getNodeDimensions(b, config);
    const diff = (a.position.x + aDims.width / 2) - (b.position.x + bDims.width / 2);
    return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
  });
  partitions.get('bottom')!.sort((a, b) => {
    const aDims = getNodeDimensions(a, config);
    const bDims = getNodeDimensions(b, config);
    const diff = (a.position.x + aDims.width / 2) - (b.position.x + bDims.width / 2);
    return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
  });

  return partitions;
}

/**
 * Recursively builds a subtree calculating the required corridor bounding dimensions.
 */
function buildSubtree(
  node: MindmapNode,
  direction: LayoutDirection,
  childrenMap: Map<ID, MindmapNode[]>,
  config: LayoutConfig
): Subtree {
  const rawChildren = childrenMap.get(node.id) || [];

  // Sort siblings within branch to maintain clean order and zero line crossings
  const sortedChildren = [...rawChildren].sort((a, b) => {
    const aDims = getNodeDimensions(a, config);
    const bDims = getNodeDimensions(b, config);
    if (direction === 'right' || direction === 'left') {
      const aCenterY = a.position.y + aDims.height / 2;
      const bCenterY = b.position.y + bDims.height / 2;
      const diff = aCenterY - bCenterY;
      return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
    } else {
      const aCenterX = a.position.x + aDims.width / 2;
      const bCenterX = b.position.x + bDims.width / 2;
      const diff = aCenterX - bCenterX;
      return Math.abs(diff) > 5 ? diff : a.id.localeCompare(b.id);
    }
  });

  const children = sortedChildren.map((c) => buildSubtree(c, direction, childrenMap, config));
  const { width, height } = getNodeDimensions(node, config);

  let subtreeWidth = width;
  let subtreeHeight = height;

  if (direction === 'right' || direction === 'left') {
    if (children.length > 0) {
      const totalChildrenH =
        children.reduce((acc, c) => acc + c.subtreeHeight, 0) +
        (children.length - 1) * config.siblingGapV;
      subtreeHeight = Math.max(height, totalChildrenH);
      const maxChildW = Math.max(...children.map((c) => c.subtreeWidth));
      subtreeWidth = width + config.levelGapH + maxChildW;
    }
  } else {
    // Vertical direction ('top' or 'bottom')
    if (children.length > 0) {
      const totalChildrenW =
        children.reduce((acc, c) => acc + c.subtreeWidth, 0) +
        (children.length - 1) * config.siblingGapH;
      subtreeWidth = Math.max(width, totalChildrenW);
      const maxChildH = Math.max(...children.map((c) => c.subtreeHeight));
      subtreeHeight = height + config.levelGapV + maxChildH;
    }
  }

  return {
    node,
    width,
    height,
    direction,
    children,
    subtreeWidth,
    subtreeHeight,
  };
}

/**
 * Places nodes of a subtree with strict edge-to-edge clearances and centered children.
 */
function layoutSubtree(
  tree: Subtree,
  centerX: number,
  centerY: number,
  direction: LayoutDirection,
  branchId: ID,
  placedBucket: PlacedNode[],
  config: LayoutConfig
) {
  placedBucket.push({
    id: tree.node.id,
    branchId,
    direction,
    x: Math.round(centerX),
    y: Math.round(centerY),
    w: tree.width,
    h: tree.height,
  });

  if (tree.children.length === 0) return;

  if (direction === 'right' || direction === 'left') {
    const sign = direction === 'right' ? 1 : -1;
    const totalChildrenH =
      tree.children.reduce((acc, c) => acc + c.subtreeHeight, 0) +
      (tree.children.length - 1) * config.siblingGapV;

    let currentY = centerY - totalChildrenH / 2;

    for (const child of tree.children) {
      const childY = currentY + child.subtreeHeight / 2;
      const childX = centerX + sign * (tree.width / 2 + config.levelGapH + child.width / 2);
      layoutSubtree(child, childX, childY, direction, branchId, placedBucket, config);
      currentY += child.subtreeHeight + config.siblingGapV;
    }
  } else {
    // Vertical ('top' or 'bottom')
    const sign = direction === 'bottom' ? 1 : -1;
    const totalChildrenW =
      tree.children.reduce((acc, c) => acc + c.subtreeWidth, 0) +
      (tree.children.length - 1) * config.siblingGapH;

    let currentX = centerX - totalChildrenW / 2;

    for (const child of tree.children) {
      const childX = currentX + child.subtreeWidth / 2;
      const childY = centerY + sign * (tree.height / 2 + config.levelGapV + child.height / 2);
      layoutSubtree(child, childX, childY, direction, branchId, placedBucket, config);
      currentX += child.subtreeWidth + config.siblingGapH;
    }
  }
}

/**
 * Shifts all nodes belonging to a specific branch as a cohesive unit.
 */
function shiftBranch(placedNodes: PlacedNode[], branchId: ID, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return;
  for (const node of placedNodes) {
    if (node.branchId === branchId) {
      node.x += Math.round(dx);
      node.y += Math.round(dy);
    }
  }
}

/**
 * Checks whether two placed nodes overlap with optional minimum safety margins.
 */
export function checkNodeOverlap(
  a: PlacedNode,
  b: PlacedNode,
  gapX: number,
  gapY: number
): boolean {
  const aLeft = a.x - a.w / 2;
  const aRight = a.x + a.w / 2;
  const aTop = a.y - a.h / 2;
  const aBottom = a.y + a.h / 2;

  const bLeft = b.x - b.w / 2;
  const bRight = b.x + b.w / 2;
  const bTop = b.y - b.h / 2;
  const bBottom = b.y + b.h / 2;

  const xOverlap = aLeft - gapX < bRight && aRight + gapX > bLeft;
  const yOverlap = aTop - gapY < bBottom && aBottom + gapY > bTop;

  return xOverlap && yOverlap;
}

/**
 * Global collision resolution pass.
 * Detects any overlapping node bounding boxes between distinct branches and shifts
 * the affected branch subtrees outward along their respective axes.
 */
function resolveSubtreeCollisions(
  placedNodes: PlacedNode[],
  config: LayoutConfig,
  maxIterations = 20
): number {
  let iterations = 0;
  let hadCollision = true;

  while (hadCollision && iterations < maxIterations) {
    hadCollision = false;
    iterations++;

    for (let i = 0; i < placedNodes.length; i++) {
      for (let j = i + 1; j < placedNodes.length; j++) {
        const nodeA = placedNodes[i];
        const nodeB = placedNodes[j];

        // Only check nodes from different branches
        if (nodeA.branchId === nodeB.branchId) continue;

        if (checkNodeOverlap(nodeA, nodeB, config.minNodeGapX, config.minNodeGapY)) {
          hadCollision = true;

          // Determine appropriate separation axis based on branch directions
          if (nodeA.direction === 'right' && (nodeB.direction === 'top' || nodeB.direction === 'bottom')) {
            const bRight = nodeB.x + nodeB.w / 2;
            const aLeft = nodeA.x - nodeA.w / 2;
            const pushX = bRight + config.minNodeGapX - aLeft;
            if (pushX > 0) shiftBranch(placedNodes, nodeA.branchId, pushX, 0);
          } else if (nodeB.direction === 'right' && (nodeA.direction === 'top' || nodeA.direction === 'bottom')) {
            const aRight = nodeA.x + nodeA.w / 2;
            const bLeft = nodeB.x - nodeB.w / 2;
            const pushX = aRight + config.minNodeGapX - bLeft;
            if (pushX > 0) shiftBranch(placedNodes, nodeB.branchId, pushX, 0);
          } else if (nodeA.direction === 'left' && (nodeB.direction === 'top' || nodeB.direction === 'bottom')) {
            const aRight = nodeA.x + nodeA.w / 2;
            const bLeft = nodeB.x - nodeB.w / 2;
            const pushX = aRight - (bLeft - config.minNodeGapX);
            if (pushX > 0) shiftBranch(placedNodes, nodeA.branchId, -pushX, 0);
          } else if (nodeB.direction === 'left' && (nodeA.direction === 'top' || nodeA.direction === 'bottom')) {
            const bRight = nodeB.x + nodeB.w / 2;
            const aLeft = nodeA.x - nodeA.w / 2;
            const pushX = bRight - (aLeft - config.minNodeGapX);
            if (pushX > 0) shiftBranch(placedNodes, nodeB.branchId, -pushX, 0);
          } else if (nodeA.direction === 'right' && nodeB.direction === 'right') {
            // Sibling horizontal branches overlapping vertically
            const pushY = nodeA.y < nodeB.y ? -config.minNodeGapY : config.minNodeGapY;
            shiftBranch(placedNodes, nodeA.branchId, 0, pushY);
          } else if (nodeA.direction === 'left' && nodeB.direction === 'left') {
            const pushY = nodeA.y < nodeB.y ? -config.minNodeGapY : config.minNodeGapY;
            shiftBranch(placedNodes, nodeA.branchId, 0, pushY);
          } else if (nodeA.direction === 'top' && nodeB.direction === 'top') {
            const pushX = nodeA.x < nodeB.x ? -config.minNodeGapX : config.minNodeGapX;
            shiftBranch(placedNodes, nodeA.branchId, pushX, 0);
          } else if (nodeA.direction === 'bottom' && nodeB.direction === 'bottom') {
            const pushX = nodeA.x < nodeB.x ? -config.minNodeGapX : config.minNodeGapX;
            shiftBranch(placedNodes, nodeA.branchId, pushX, 0);
          } else {
            // General fallback separation
            const dx = nodeA.x >= nodeB.x ? config.minNodeGapX : -config.minNodeGapX;
            shiftBranch(placedNodes, nodeA.branchId, dx, 0);
          }
        }
      }
    }
  }

  return iterations;
}

/**
 * Classic 4-quadrant radial mindmap layout for brainstorming trees radiating from a central topic.
 */
export function layoutRadialMindmap(
  nodes: MindmapNode[],
  validEdges: MindmapEdge[],
  config: LayoutConfig
): LayoutUpdate[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<ID, MindmapNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const incomingEdges = new Map<ID, ID[]>();
  const outgoingEdges = new Map<ID, ID[]>();
  validEdges.forEach((e) => {
    const inc = incomingEdges.get(e.targetId) || [];
    inc.push(e.sourceId);
    incomingEdges.set(e.targetId, inc);

    const out = outgoingEdges.get(e.sourceId) || [];
    out.push(e.targetId);
    outgoingEdges.set(e.sourceId, out);
  });

  // Calculate topological depth from graph edges
  const depths = new Map<ID, number>();
  const computeDepth = (id: ID, visited: Set<ID>): number => {
    if (depths.has(id)) return depths.get(id)!;
    if (visited.has(id)) return 0;
    visited.add(id);

    const inc = incomingEdges.get(id) || [];
    let maxParentDepth = -1;
    for (const pId of inc) {
      const pDepth = computeDepth(pId, visited);
      if (pDepth > maxParentDepth) maxParentDepth = pDepth;
    }
    const node = nodeMap.get(id);
    if (node?.parentId && nodeMap.has(node.parentId)) {
      const pDepth = computeDepth(node.parentId, visited);
      if (pDepth > maxParentDepth) maxParentDepth = pDepth;
    }

    visited.delete(id);
    const d = maxParentDepth + 1;
    depths.set(id, d);
    return d;
  };

  nodes.forEach((n) => computeDepth(n.id, new Set()));

  // Identify root nodes and map children
  const roots: MindmapNode[] = [];
  const childrenMap = new Map<ID, MindmapNode[]>();
  const parentAssignment = new Map<ID, ID>();

  // Helper to ensure tree hierarchy remains strictly acyclic
  const wouldCreateCycle = (nodeId: ID, candidateParentId: ID): boolean => {
    let curr: ID | undefined = candidateParentId;
    const visited = new Set<ID>([nodeId]);
    while (curr) {
      if (visited.has(curr)) return true;
      visited.add(curr);
      curr = parentAssignment.get(curr);
    }
    return false;
  };

  // Sort nodes by depth ascending so parents are evaluated before children
  const sortedNodesByDepth = [...nodes].sort(
    (a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0)
  );

  // Determine effective primary parent for each node
  sortedNodesByDepth.forEach((n) => {
    const candidates: ID[] = [];
    if (n.parentId && nodeMap.has(n.parentId)) {
      candidates.push(n.parentId);
    }
    const inc = incomingEdges.get(n.id) || [];
    inc.forEach((pId) => {
      if (nodeMap.has(pId) && !candidates.includes(pId)) {
        candidates.push(pId);
      }
    });

    // Filter out candidates that would create a cycle in the tree
    const validCandidates = candidates.filter((pId) => !wouldCreateCycle(n.id, pId));

    let chosenParentId: ID | null = null;
    if (validCandidates.length > 0) {
      // Pick parent candidate with the largest topological depth to place this node
      // at its proper downstream level. If tied, prefer n.parentId for stability.
      chosenParentId = validCandidates.reduce((currBest, pId) => {
        const bestD = depths.get(currBest) ?? -1;
        const pD = depths.get(pId) ?? -1;
        if (pD > bestD) return pId;
        if (pD === bestD && currBest !== n.parentId && pId === n.parentId) return pId;
        return currBest;
      });
    }

    if (!chosenParentId) {
      roots.push(n);
    } else {
      parentAssignment.set(n.id, chosenParentId);
      const list = childrenMap.get(chosenParentId) || [];
      list.push(n);
      childrenMap.set(chosenParentId, list);
    }
  });

  // If cycle or malformed state resulted in 0 roots, pick the node with lowest Y
  if (roots.length === 0 && nodes.length > 0) {
    const topNode = [...nodes].sort((a, b) => a.position.y - b.position.y)[0];
    roots.push(topNode);
  }

  // Sort root nodes stably (top-to-bottom or by creation)
  roots.sort((a, b) => {
    const diff = a.position.y - b.position.y;
    return Math.abs(diff) > 20 ? diff : a.id.localeCompare(b.id);
  });

  const updates: LayoutUpdate[] = [];
  let currentTreeBaseY = 0;

  for (let rIdx = 0; rIdx < roots.length; rIdx++) {
    const root = roots[rIdx];
    const rootDims = getNodeDimensions(root, config);
    const directChildren = childrenMap.get(root.id) || [];

    // Preserve central root coordinates if it's the sole tree; stack subsequent trees cleanly
    const rootCenterX = rIdx === 0 ? root.position.x + rootDims.width / 2 : rootDims.width / 2;
    const rootCenterY = rIdx === 0 ? root.position.y + rootDims.height / 2 : currentTreeBaseY + rootDims.height / 2;

    const rootPlacedNode: PlacedNode = {
      id: root.id,
      branchId: root.id,
      direction: 'right',
      x: rootCenterX,
      y: rootCenterY,
      w: rootDims.width,
      h: rootDims.height,
    };

    const treePlacedNodes: PlacedNode[] = [rootPlacedNode];

    // Partition direct children into 4 quadrant branches
    const partitions = partitionRootChildren(directChildren, root, config);

    // Build Subtrees for each direction
    const rightTrees = (partitions.get('right') || []).map((c) =>
      buildSubtree(c, 'right', childrenMap, config)
    );
    const leftTrees = (partitions.get('left') || []).map((c) =>
      buildSubtree(c, 'left', childrenMap, config)
    );
    const topTrees = (partitions.get('top') || []).map((c) =>
      buildSubtree(c, 'top', childrenMap, config)
    );
    const bottomTrees = (partitions.get('bottom') || []).map((c) =>
      buildSubtree(c, 'bottom', childrenMap, config)
    );

    // 1. Right Branch: place compactly to the right of root
    if (rightTrees.length > 0) {
      const totalRightH =
        rightTrees.reduce((acc, t) => acc + t.subtreeHeight, 0) +
        Math.max(0, rightTrees.length - 1) * config.siblingGapV;
      let curY = rootCenterY - totalRightH / 2;

      for (const tree of rightTrees) {
        const ny = curY + tree.subtreeHeight / 2;
        const startX = rootCenterX + rootDims.width / 2 + config.rootGapX + tree.width / 2;
        layoutSubtree(tree, startX, ny, 'right', tree.node.id, treePlacedNodes, config);
        curY += tree.subtreeHeight + config.siblingGapV;
      }
    }

    // 2. Left Branch: place compactly to the left of root
    if (leftTrees.length > 0) {
      const totalLeftH =
        leftTrees.reduce((acc, t) => acc + t.subtreeHeight, 0) +
        Math.max(0, leftTrees.length - 1) * config.siblingGapV;
      let curY = rootCenterY - totalLeftH / 2;

      for (const tree of leftTrees) {
        const ny = curY + tree.subtreeHeight / 2;
        const startX = rootCenterX - rootDims.width / 2 - config.rootGapX - tree.width / 2;
        layoutSubtree(tree, startX, ny, 'left', tree.node.id, treePlacedNodes, config);
        curY += tree.subtreeHeight + config.siblingGapV;
      }
    }

    // 3. Top Branch: place compactly above root
    if (topTrees.length > 0) {
      const totalTopW =
        topTrees.reduce((acc, t) => acc + t.subtreeWidth, 0) +
        Math.max(0, topTrees.length - 1) * config.siblingGapH;
      let curX = rootCenterX - totalTopW / 2;

      for (const tree of topTrees) {
        const nx = curX + tree.subtreeWidth / 2;
        const startY = rootCenterY - rootDims.height / 2 - config.rootGapY - tree.height / 2;
        layoutSubtree(tree, nx, startY, 'top', tree.node.id, treePlacedNodes, config);
        curX += tree.subtreeWidth + config.siblingGapH;
      }
    }

    // 4. Bottom Branch: place compactly below root
    if (bottomTrees.length > 0) {
      const totalBottomW =
        bottomTrees.reduce((acc, t) => acc + t.subtreeWidth, 0) +
        Math.max(0, bottomTrees.length - 1) * config.siblingGapH;
      let curX = rootCenterX - totalBottomW / 2;

      for (const tree of bottomTrees) {
        const nx = curX + tree.subtreeWidth / 2;
        const startY = rootCenterY + rootDims.height / 2 + config.rootGapY + tree.height / 2;
        layoutSubtree(tree, nx, startY, 'bottom', tree.node.id, treePlacedNodes, config);
        curX += tree.subtreeWidth + config.siblingGapH;
      }
    }

    // 5. Global Subtree Collision Resolution:
    // Ensures that any overlap between adjacent or opposing branches is resolved cleanly
    resolveSubtreeCollisions(treePlacedNodes, config);

    // Convert placed node centers to React Flow top-left coordinates:
    // position = { x: centerX - w/2, y: centerY - h/2 }
    for (const p of treePlacedNodes) {
      updates.push({
        id: p.id,
        position: {
          x: Math.round(p.x - p.w / 2),
          y: Math.round(p.y - p.h / 2),
        },
      });
    }

    // Compute bounding box of this root tree for separating subsequent trees
    const treeMaxY = Math.max(...treePlacedNodes.map((p) => p.y + p.h / 2));
    currentTreeBaseY = treeMaxY + config.treeGap;
  }

  return updates;
}

/**
 * Detects whether the diagram is a classic 4-quadrant radial mindmap
 * (radiating out from a single central topic to multiple opposite quadrants with NO cross-edges)
 * versus a directed concept flow / flowchart / DAG with custom cross-connections.
 */
export function isClassicRadialMindmap(nodes: MindmapNode[], edges: MindmapEdge[]): boolean {
  if (nodes.length <= 2) return false;

  const nodeMap = new Map<ID, MindmapNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // If any node has multiple incoming edges, it is a graph/DAG, not a simple radial tree
  const inDegree = new Map<ID, number>();
  for (const e of edges) {
    if (e.sourceId !== e.targetId && nodeMap.has(e.sourceId) && nodeMap.has(e.targetId)) {
      const count = (inDegree.get(e.targetId) || 0) + 1;
      if (count > 1) return false;
      inDegree.set(e.targetId, count);

      // If an edge connects nodes across different branches (not parent->child)
      const target = nodeMap.get(e.targetId);
      if (target && target.parentId && target.parentId !== e.sourceId) {
        return false;
      }
    }
  }

  // Check roots
  const roots = nodes.filter((n) => !n.parentId);
  if (roots.length !== 1) return false;

  // Check if root has children in at least two opposing quadrants (e.g. left and right)
  const root = roots[0];
  const directChildren = nodes.filter((n) => n.parentId === root.id);
  if (directChildren.length < 2) return false;

  const hasLeft = directChildren.some((c) => c.position.x < root.position.x - 30);
  const hasRight = directChildren.some((c) => c.position.x > root.position.x + 30);
  const hasTop = directChildren.some((c) => c.position.y < root.position.y - 30);
  const hasBottom = directChildren.some((c) => c.position.y > root.position.y + 30);

  const radialBranches = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasTop ? 1 : 0) + (hasBottom ? 1 : 0);
  return radialBranches >= 2;
}

/**
 * High-performance, Sugiyama-framework directed graph layout engine using Dagre.
 * Used for concept maps, flowcharts, and mindmaps with custom cross-connections (A->B, A->C, C->B).
 * Minimizes line crossings, staggers columns so lines never pass through nodes,
 * and eliminates duplicate parallel lines.
 */
export function layoutWithDagre(
  nodes: MindmapNode[],
  edges: MindmapEdge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): LayoutUpdate[] {
  if (nodes.length === 0) return [];

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));

  let rankdir: 'TB' | 'LR' = 'TB';
  if (nodes.length > 1) {
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX > spanY * 1.5) {
      rankdir = 'LR';
    }
  }

  g.setGraph({
    rankdir,
    ranksep: rankdir === 'TB' ? config.levelGapV + 20 : config.levelGapH + 20,
    nodesep: rankdir === 'TB' ? config.siblingGapH + 25 : config.siblingGapV + 25,
  });

  const nodeMap = new Map<ID, MindmapNode>();
  nodes.forEach((n) => {
    nodeMap.set(n.id, n);
    const dims = getNodeDimensions(n, config);
    g.setNode(n.id, { width: dims.width, height: dims.height });
  });

  const seenEdgePairs = new Set<string>();
  edges.forEach((e) => {
    if (nodeMap.has(e.sourceId) && nodeMap.has(e.targetId) && e.sourceId !== e.targetId) {
      const pair = `${e.sourceId}->${e.targetId}`;
      if (!seenEdgePairs.has(pair)) {
        seenEdgePairs.add(pair);
        g.setEdge(e.sourceId, e.targetId);
      }
    }
  });

  nodes.forEach((n) => {
    if (n.parentId && nodeMap.has(n.parentId)) {
      const pair = `${n.parentId}->${n.id}`;
      if (!seenEdgePairs.has(pair)) {
        seenEdgePairs.add(pair);
        g.setEdge(n.parentId, n.id);
      }
    }
  });

  dagre.layout(g);

  // Preserve the original anchor position of the primary root node so the mindmap doesn't jump wildly
  const primaryRoot = nodes.find((n) => !n.parentId) || nodes[0];
  const rootDagrePos = g.node(primaryRoot.id);
  const rootDims = getNodeDimensions(primaryRoot, config);
  const targetRootLeft = primaryRoot.position.x;
  const targetRootTop = primaryRoot.position.y;
  const offsetX = targetRootLeft - (rootDagrePos.x - rootDims.width / 2);
  const offsetY = targetRootTop - (rootDagrePos.y - rootDims.height / 2);

  const updates: LayoutUpdate[] = [];
  nodes.forEach((n) => {
    const dagreNode = g.node(n.id);
    if (dagreNode) {
      const dims = getNodeDimensions(n, config);
      const left = Math.round(dagreNode.x - dims.width / 2 + offsetX);
      const top = Math.round(dagreNode.y - dims.height / 2 + offsetY);
      updates.push({
        id: n.id,
        position: { x: left, y: top },
      });
    }
  });

  return updates;
}

/**
 * Main auto-layout function for the Mindmap.
 * Selects the optimal layout strategy:
 * - Pure radial quadrant layout for classic brainstorming mindmaps radiating from a single root
 * - Sugiyama graph layout (Dagre) for directed concept maps, workflows, and diagrams with custom cross-connections
 */
export function autoLayoutMindmap(
  nodes: MindmapNode[],
  edgesOrConfig?: MindmapEdge[] | Partial<LayoutConfig>,
  customConfig?: Partial<LayoutConfig>
): LayoutUpdate[] {
  if (nodes.length === 0) return [];

  let edges: MindmapEdge[] = [];
  let userConfig: Partial<LayoutConfig> | undefined = customConfig;
  if (Array.isArray(edgesOrConfig)) {
    edges = edgesOrConfig;
  } else if (edgesOrConfig) {
    userConfig = edgesOrConfig;
  }

  const config: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...userConfig };
  const nodeMap = new Map<ID, MindmapNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const validEdges = edges.filter(
    (e) => nodeMap.has(e.sourceId) && nodeMap.has(e.targetId) && e.sourceId !== e.targetId
  );

  if (isClassicRadialMindmap(nodes, validEdges)) {
    return layoutRadialMindmap(nodes, validEdges, config);
  } else {
    return layoutWithDagre(nodes, validEdges, config);
  }
}

/**
 * Diagnostic validation utility.
 * Verifies that zero overlaps exist and returns details for automated testing.
 */
export function validateLayout(
  nodes: MindmapNode[],
  updates: LayoutUpdate[],
  minGapX = 0,
  minGapY = 0
): {
  isValid: boolean;
  overlapCount: number;
  overlaps: Array<{ idA: string; idB: string; overlapX: number; overlapY: number }>;
} {
  const updateMap = new Map<ID, NodePosition>();
  updates.forEach((u) => updateMap.set(u.id, u.position));

  const placed: PlacedNode[] = nodes.map((n) => {
    const pos = updateMap.get(n.id) || n.position;
    const dims = getNodeDimensions(n);
    return {
      id: n.id,
      branchId: n.parentId || n.id,
      direction: 'right',
      x: pos.x + dims.width / 2,
      y: pos.y + dims.height / 2,
      w: dims.width,
      h: dims.height,
    };
  });

  const overlaps: Array<{ idA: string; idB: string; overlapX: number; overlapY: number }> = [];

  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];

      const aLeft = a.x - a.w / 2;
      const aRight = a.x + a.w / 2;
      const aTop = a.y - a.h / 2;
      const aBottom = a.y + a.h / 2;

      const bLeft = b.x - b.w / 2;
      const bRight = b.x + b.w / 2;
      const bTop = b.y - b.h / 2;
      const bBottom = b.y + b.h / 2;

      const overlapX = Math.min(aRight + minGapX, bRight + minGapX) - Math.max(aLeft - minGapX, bLeft - minGapX);
      const overlapY = Math.min(aBottom + minGapY, bBottom + minGapY) - Math.max(aTop - minGapY, bTop - minGapY);

      if (overlapX > 0 && overlapY > 0) {
        overlaps.push({
          idA: a.id,
          idB: b.id,
          overlapX: Math.round(overlapX),
          overlapY: Math.round(overlapY),
        });
      }
    }
  }

  return {
    isValid: overlaps.length === 0,
    overlapCount: overlaps.length,
    overlaps,
  };
}
