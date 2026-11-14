import { autoLayoutMindmap, validateLayout, getNodeDimensions } from '../mindmapLayout.ts';
import type { MindmapNode, MindmapEdge } from '../../../types/index.ts';

function createMockNode(
  id: string,
  title: string,
  parentId: string | null = null,
  pos = { x: 0, y: 0 },
  extra: Partial<MindmapNode> = {}
): MindmapNode {
  return {
    id,
    mindmapId: 'map-1',
    projectId: 'proj-1',
    title,
    content: '',
    parentId,
    position: pos,
    knowledgeNodeId: `kn-${id}`,
    linkedFlashcardIds: [],
    linkedTaskcardIds: [],
    linkedNoteIds: [],
    attachments: [],
    fontSize: parentId === null ? 'lg' : 'md',
    imageSize: 'md',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    throw new Error(`Test assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`  ✓ ${msg}`);
}

console.log('================================================================');
console.log('🧪 RUNNING MINDMAP LAYOUT TEST SUITE (11 SCENARIOS)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Hauptknoten mit zwei Unterknoten
// -----------------------------------------------------------------------------
console.log('Test 1: Hauptknoten mit zwei Unterknoten');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Zentralthema', null, { x: 0, y: 0 }),
    createMockNode('c1', 'Unterthema 1', 'root', { x: 50, y: 0 }),
    createMockNode('c2', 'Unterthema 2', 'root', { x: -50, y: 0 }),
  ];

  const updates = autoLayoutMindmap(nodes);
  assert(updates.length === 3, 'All 3 nodes updated');
  const val = validateLayout(nodes, updates, 10, 10);
  assert(val.isValid, `No overlaps (overlaps: ${val.overlapCount})`);

  const rootU = updates.find((u) => u.id === 'root')!;
  const c1U = updates.find((u) => u.id === 'c1')!;
  const c2U = updates.find((u) => u.id === 'c2')!;
  assert(c1U.position.x > rootU.position.x, 'Child 1 is to the right');
  assert(c2U.position.x < rootU.position.x, 'Child 2 is to the left');
}

// -----------------------------------------------------------------------------
// Test 2: Mindmap mit vielen Unterknoten auf derselben Ebene
// -----------------------------------------------------------------------------
console.log('\nTest 2: Mindmap mit vielen Unterknoten auf derselben Ebene (16 Kinder)');
{
  const nodes: MindmapNode[] = [createMockNode('root', 'Brainstorming', null, { x: 200, y: 200 })];
  for (let i = 1; i <= 16; i++) {
    nodes.push(createMockNode(`c${i}`, `Idee ${i}`, 'root', { x: 200, y: 200 }));
  }

  const updates = autoLayoutMindmap(nodes);
  assert(updates.length === 17, 'All 17 nodes placed');
  const val = validateLayout(nodes, updates, 8, 8);
  assert(val.isValid, `No overlaps among 16 direct siblings (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 3: Tiefe Hierarchie mit mindestens fünf Ebenen
// -----------------------------------------------------------------------------
console.log('\nTest 3: Tiefe Hierarchie mit 5 Ebenen');
{
  const nodes: MindmapNode[] = [
    createMockNode('l0', 'Ebene 0 (Root)', null),
    createMockNode('l1', 'Ebene 1', 'l0', { x: 100, y: 0 }),
    createMockNode('l2', 'Ebene 2', 'l1', { x: 200, y: 0 }),
    createMockNode('l3', 'Ebene 3', 'l2', { x: 300, y: 0 }),
    createMockNode('l4', 'Ebene 4', 'l3', { x: 400, y: 0 }),
    createMockNode('l5', 'Ebene 5', 'l4', { x: 500, y: 0 }),
    // Add some siblings on intermediate levels
    createMockNode('l1_b', 'Ebene 1B', 'l0', { x: 100, y: 80 }),
    createMockNode('l3_b', 'Ebene 3B', 'l2', { x: 300, y: 80 }),
  ];

  const updates = autoLayoutMindmap(nodes);
  assert(updates.length === 8, 'All 8 nodes placed');
  const val = validateLayout(nodes, updates, 10, 10);
  assert(val.isValid, `No overlaps in 5-level deep tree (overlaps: ${val.overlapCount})`);

  // Verify monotonic progression along X for right branch
  const getX = (id: string) => updates.find((u) => u.id === id)!.position.x;
  assert(getX('l0') < getX('l1'), 'L0 < L1 in X');
  assert(getX('l1') < getX('l2'), 'L1 < L2 in X');
  assert(getX('l2') < getX('l3'), 'L2 < L3 in X');
  assert(getX('l3') < getX('l4'), 'L3 < L4 in X');
  assert(getX('l4') < getX('l5'), 'L4 < L5 in X');
}

// -----------------------------------------------------------------------------
// Test 4: Teilbäume mit sehr unterschiedlicher Größe
// -----------------------------------------------------------------------------
console.log('\nTest 4: Teilbäume mit sehr unterschiedlicher Größe (Asymmetrisch)');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Zentralthema', null),
    // Small branch on Left: 1 single child
    createMockNode('left1', 'Kurzer Zweig', 'root', { x: -100, y: 0 }),
    // Huge branch on Right: 20 nodes with multiple levels
    createMockNode('right1', 'Großer Zweig', 'root', { x: 100, y: 0 }),
  ];

  for (let i = 1; i <= 6; i++) {
    const parentId = `r_sub_${i}`;
    nodes.push(createMockNode(parentId, `Subthema ${i}`, 'right1', { x: 200, y: i * 40 }));
    for (let j = 1; j <= 2; j++) {
      nodes.push(createMockNode(`r_leaf_${i}_${j}`, `Detail ${i}.${j}`, parentId, { x: 300, y: i * 40 + j * 20 }));
    }
  }

  const updates = autoLayoutMindmap(nodes);
  assert(updates.length === nodes.length, `All ${nodes.length} nodes placed`);
  const val = validateLayout(nodes, updates, 10, 10);
  assert(val.isValid, `Zero overlaps in asymmetrical tree (overlaps: ${val.overlapCount})`);

  // Left child should stay close to center despite huge right tree
  const rootX = updates.find((u) => u.id === 'root')!.position.x;
  const leftX = updates.find((u) => u.id === 'left1')!.position.x;
  const leftDist = Math.abs(rootX - leftX);
  assert(leftDist < 400, `Left branch remains compact (dist: ${leftDist}px < 400px)`);
}

// -----------------------------------------------------------------------------
// Test 5: Lange und mehrzeilige Knotentitel
// -----------------------------------------------------------------------------
console.log('\nTest 5: Lange und mehrzeilige Knotentitel');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Biologie & Genetik:\nGrundlagen der Vererbung', null),
    createMockNode('c1', 'Molekularbiologische Mechanismen der DNA-Replikation und Reparaturprozesse', 'root', { x: 100, y: 0 }),
    createMockNode('c2', 'Transkription:\n1. Initiation\n2. Elongation\n3. Termination', 'root', { x: 100, y: 100 }),
    createMockNode('c3', 'Translation an den Ribosomen im Zytoplasma', 'root', { x: -100, y: 0 }),
  ];

  // Verify dimensions calculation
  const dimC2 = getNodeDimensions(nodes[2]);
  assert(dimC2.height > 60, `Multiline node gets extra height (h: ${dimC2.height})`);

  const updates = autoLayoutMindmap(nodes);
  const val = validateLayout(nodes, updates, 10, 10);
  assert(val.isValid, `No overlaps with long and multiline titles (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 6: Unterschiedlich große Knotentypen (Font- und Bildgrößen)
// -----------------------------------------------------------------------------
console.log('\nTest 6: Unterschiedlich große Knotentypen (S/M/L/XL Font & Bilder)');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Zelle', null, { x: 0, y: 0 }, { fontSize: 'xl' }),
    createMockNode('n_sm', 'Kompakt', 'root', { x: 100, y: -50 }, { fontSize: 'sm' }),
    createMockNode('n_xl', 'Sehr Groß', 'root', { x: 100, y: 50 }, { fontSize: 'xl' }),
    createMockNode(
      'n_img',
      'Mitochondrium',
      'root',
      { x: -100, y: 0 },
      {
        fontSize: 'md',
        imageSize: 'xl',
        attachments: [
          {
            id: 'att-1',
            type: 'image',
            name: 'mitochondria.png',
            size: 1024,
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,fake',
          },
        ],
      }
    ),
  ];

  const dimImg = getNodeDimensions(nodes[3]);
  assert(dimImg.height >= 260, `Node with XL image has large height (${dimImg.height}px)`);

  const updates = autoLayoutMindmap(nodes);
  const val = validateLayout(nodes, updates, 12, 12);
  assert(val.isValid, `No overlaps with diverse node sizes (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 7: Mindmap mit mindestens 100 Knoten (Großes Netzwerk & Performance)
// -----------------------------------------------------------------------------
console.log('\nTest 7: Mindmap mit mindestens 100 Knoten');
{
  const nodes: MindmapNode[] = [createMockNode('root', 'Mega-Mindmap', null)];
  let idCounter = 1;

  // 4 primary branches
  for (const dir of ['right', 'left', 'top', 'bottom']) {
    const bId = `branch_${dir}`;
    const initPos =
      dir === 'right'
        ? { x: 100, y: 0 }
        : dir === 'left'
        ? { x: -100, y: 0 }
        : dir === 'top'
        ? { x: 0, y: -100 }
        : { x: 0, y: 100 };
    nodes.push(createMockNode(bId, `Zweig ${dir.toUpperCase()}`, 'root', initPos));

    // 5 children per branch = 20
    for (let c = 1; c <= 5; c++) {
      const cId = `c_${dir}_${c}`;
      nodes.push(createMockNode(cId, `Kategorie ${dir}-${c}`, bId, initPos));

      // 4 leaves per child = 80 leaves (Total = 1 + 4 + 20 + 80 = 105 nodes)
      for (let l = 1; l <= 4; l++) {
        const lId = `leaf_${idCounter++}`;
        nodes.push(createMockNode(lId, `Punkt ${idCounter}`, cId, initPos));
      }
    }
  }

  assert(nodes.length >= 100, `Generated ${nodes.length} nodes (>= 100)`);

  const t0 = performance.now();
  const updates = autoLayoutMindmap(nodes);
  const duration = performance.now() - t0;

  assert(updates.length === nodes.length, `All ${nodes.length} nodes received updates`);
  assert(duration < 100, `High performance: layout computed in ${duration.toFixed(2)}ms (< 100ms)`);

  const val = validateLayout(nodes, updates, 6, 6);
  assert(val.isValid, `Zero overlaps in 105-node mindmap (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 8: Mindmap, bei der sich vor dem Sortieren zahlreiche Knoten überlappen
// -----------------------------------------------------------------------------
console.log('\nTest 8: Mindmap mit extremen Überlappungen vor dem Sortieren');
{
  const nodes: MindmapNode[] = [createMockNode('root', 'Zentrum', null, { x: 50, y: 50 })];
  // 30 nodes ALL stacked at (50, 50)
  for (let i = 1; i <= 30; i++) {
    nodes.push(createMockNode(`node_${i}`, `Überlappung ${i}`, 'root', { x: 50, y: 50 }));
  }

  // Before sorting, all nodes overlap
  const preVal = validateLayout(nodes, nodes.map((n) => ({ id: n.id, position: n.position })));
  assert(!preVal.isValid, `Before layout: ${preVal.overlapCount} overlaps present`);

  // Run layout
  const updates = autoLayoutMindmap(nodes);
  const postVal = validateLayout(nodes, updates, 6, 6);
  assert(postVal.isValid, `After layout: exactly 0 overlaps (resolved from ${preVal.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 9: Mindmap, deren Knoten zuvor manuell chaotisch verschoben wurden
// -----------------------------------------------------------------------------
console.log('\nTest 9: Chaotisch manuell verschobene Knoten');
{
  const nodes: MindmapNode[] = [createMockNode('root', 'Chaos Map', null, { x: 342, y: -128 })];
  // Random coordinates
  for (let i = 1; i <= 20; i++) {
    const parentId = i <= 4 ? 'root' : `node_${((i - 1) % 4) + 1}`;
    const rx = (i * 137) % 600 - 300;
    const ry = (i * 241) % 600 - 300;
    nodes.push(createMockNode(`node_${i}`, `Random ${i}`, parentId, { x: rx, y: ry }));
  }

  const updates = autoLayoutMindmap(nodes);
  const val = validateLayout(nodes, updates, 8, 8);
  assert(val.isValid, `Chaotic nodes reorganized with zero overlaps (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 10: Speichern, Neuladen und erneutes Sortieren (Deterministisch & Idempotent)
// -----------------------------------------------------------------------------
console.log('\nTest 10: Speichern, Neuladen und Idempotenz (layout(layout(x)) === layout(x))');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Stabilitaet', null, { x: 100, y: 100 }),
    createMockNode('a', 'Ast A', 'root', { x: 250, y: 50 }),
    createMockNode('a1', 'Sub A1', 'a', { x: 380, y: 30 }),
    createMockNode('a2', 'Sub A2', 'a', { x: 380, y: 70 }),
    createMockNode('b', 'Ast B', 'root', { x: -100, y: 100 }),
    createMockNode('c', 'Ast C', 'root', { x: 100, y: 220 }),
  ];

  // Pass 1
  const pass1Updates = autoLayoutMindmap(nodes);

  // Apply updates to nodes as if saved and reloaded
  const updatedNodes = nodes.map((n) => {
    const u = pass1Updates.find((p) => p.id === n.id);
    return u ? { ...n, position: u.position } : n;
  });

  // Pass 2
  const pass2Updates = autoLayoutMindmap(updatedNodes);

  // Assert exact idempotency: all coordinates match pass 1
  let matches = 0;
  for (const u2 of pass2Updates) {
    const u1 = pass1Updates.find((p) => p.id === u2.id);
    if (u1 && u1.position.x === u2.position.x && u1.position.y === u2.position.y) {
      matches++;
    }
  }

  assert(matches === nodes.length, `100% deterministic & idempotent (${matches}/${nodes.length} identical)`);
}

// -----------------------------------------------------------------------------
// Test 11: Mindmap mit mehreren Teilbäumen, bei denen viele Linien aufeinandertreffen
// -----------------------------------------------------------------------------
console.log('\nTest 11: Konvergierende Teilbäume in 4 Quadranten (Right, Left, Top, Bottom)');
{
  const nodes: MindmapNode[] = [
    createMockNode('root', 'Konvergenz-Zentrum', null, { x: 0, y: 0 }),
    // Right quadrant
    createMockNode('r1', 'Rechts 1', 'root', { x: 100, y: -40 }),
    createMockNode('r2', 'Rechts 2', 'root', { x: 100, y: 40 }),
    createMockNode('r1_1', 'Detail R1.1', 'r1', { x: 200, y: -40 }),
    // Left quadrant
    createMockNode('l1', 'Links 1', 'root', { x: -100, y: -40 }),
    createMockNode('l2', 'Links 2', 'root', { x: -100, y: 40 }),
    createMockNode('l1_1', 'Detail L1.1', 'l1', { x: -200, y: -40 }),
    // Top quadrant
    createMockNode('t1', 'Oben 1', 'root', { x: -50, y: -100 }),
    createMockNode('t2', 'Oben 2', 'root', { x: 50, y: -100 }),
    // Bottom quadrant
    createMockNode('b1', 'Unten 1', 'root', { x: -50, y: 100 }),
    createMockNode('b2', 'Unten 2', 'root', { x: 50, y: 100 }),
  ];

  const updates = autoLayoutMindmap(nodes);
  assert(updates.length === nodes.length, 'All 11 nodes updated');
  const val = validateLayout(nodes, updates, 12, 12);
  assert(val.isValid, `No quadrant collision or edge interference (overlaps: ${val.overlapCount})`);
}

// -----------------------------------------------------------------------------
// Test 12: Benutzerdefinierte Verbindungen (DAG: A -> B, A -> C, C -> B)
// -----------------------------------------------------------------------------
console.log('\nTest 12: Benutzerdefinierte Kanten und Querverbindungen (DAG A->B, A->C, C->B)');
{
  const nodes: MindmapNode[] = [
    createMockNode('A', 'Startpunkt A', null, { x: 0, y: 0 }),
    createMockNode('C', 'Zwischenstation C', 'A', { x: 120, y: 60 }),
    createMockNode('B', 'Endpunkt B mit sehr langem Titel für Testzwecke', null, { x: 200, y: 150 }),
  ];

  const edges: MindmapEdge[] = [
    { id: 'e1', mindmapId: 'm1', sourceId: 'A', targetId: 'C', label: 'Schritt 1' },
    { id: 'e2', mindmapId: 'm1', sourceId: 'C', targetId: 'B', label: 'Schritt 2' },
    { id: 'e3', mindmapId: 'm1', sourceId: 'A', targetId: 'B', label: 'Direktverbindung' },
  ];

  const updates = autoLayoutMindmap(nodes, edges);
  assert(updates.length === 3, 'All 3 nodes updated with graph topology');
  const val = validateLayout(nodes, updates, 15, 15);
  assert(val.isValid, `Zero overlaps in DAG with custom cross-connections (overlaps: ${val.overlapCount})`);

  const updateMap = new Map(updates.map((u) => [u.id, u.position]));
  const posA = updateMap.get('A')!;
  const posC = updateMap.get('C')!;
  const posB = updateMap.get('B')!;

  assert(posA !== undefined && posC !== undefined && posB !== undefined, 'All positions resolved');
}

// -----------------------------------------------------------------------------
// Test 13: Screenshot-Szenario mit vertikal kaskadierenden Konzepten
// -----------------------------------------------------------------------------
console.log('\nTest 13: Kaskadierende vertikale Konzeptkette mit variierenden Textbreiten');
{
  const nodes: MindmapNode[] = [
    createMockNode('n1', 'Sesshaftwerdung', null, { x: 400, y: 50 }),
    createMockNode('n2', 'Tempel', 'n1', { x: 400, y: 150 }),
    createMockNode('n3', 'Himmel', 'n2', { x: 600, y: 180 }),
    createMockNode('n4', 'Gottes Name wohnt im Tempel, Gott selbst nich', 'n2', { x: 300, y: 250 }),
    createMockNode('n5', 'Unter Dem Volk', 'n4', { x: 380, y: 370 }),
    createMockNode('n6', 'Kommt in Form von Jesus Christus auf die Erde', 'n5', { x: 260, y: 490 }),
    createMockNode('n7', 'Gott ist unter uns', 'n6', { x: 320, y: 620 }),
  ];

  const edges: MindmapEdge[] = [
    { id: 'e1', mindmapId: 'm1', sourceId: 'n1', targetId: 'n2' },
    { id: 'e2', mindmapId: 'm1', sourceId: 'n2', targetId: 'n3' },
    { id: 'e3', mindmapId: 'm1', sourceId: 'n2', targetId: 'n4' },
    { id: 'e4', mindmapId: 'm1', sourceId: 'n4', targetId: 'n5' },
    { id: 'e5', mindmapId: 'm1', sourceId: 'n5', targetId: 'n6' },
    { id: 'e6', mindmapId: 'm1', sourceId: 'n6', targetId: 'n7' },
  ];

  const updates = autoLayoutMindmap(nodes, edges);
  assert(updates.length === 7, 'All 7 nodes organized cleanly');
  const val = validateLayout(nodes, updates, 12, 12);
  assert(val.isValid, `No overlaps in concept chain (overlaps: ${val.overlapCount})`);
}

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================\n');
