import { v4 as uuidv4 } from "uuid";
import type { BVHNode, ClashPair, ClashResponse, GeometryData } from "../../shared/types.js";

interface JobEntry {
  response: ClashResponse;
  categoryA: string[];
  categoryB: string[];
}

const jobStore = new Map<string, JobEntry>();

function aabbOverlap(a: BVHNode, b: BVHNode): boolean {
  return (
    a.min[0] <= b.max[0] &&
    a.max[0] >= b.min[0] &&
    a.min[1] <= b.max[1] &&
    a.max[1] >= b.min[1] &&
    a.min[2] <= b.max[2] &&
    a.max[2] >= b.min[2]
  );
}

function traverseBVH(
  nodeA: BVHNode,
  treeA: BVHNode[],
  nodeB: BVHNode,
  treeB: BVHNode[],
  pairs: [number, number][]
): void {
  if (!aabbOverlap(nodeA, nodeB)) return;

  const aIsLeaf = nodeA.componentId !== undefined;
  const bIsLeaf = nodeB.componentId !== undefined;

  if (aIsLeaf && bIsLeaf) {
    pairs.push([nodeA.componentId!, nodeB.componentId!]);
    return;
  }

  if (aIsLeaf) {
    if (nodeB.leftChild !== undefined) traverseBVH(nodeA, treeA, treeB[nodeB.leftChild], treeB, pairs);
    if (nodeB.rightChild !== undefined) traverseBVH(nodeA, treeA, treeB[nodeB.rightChild], treeB, pairs);
    return;
  }

  if (bIsLeaf) {
    if (nodeA.leftChild !== undefined) traverseBVH(treeA[nodeA.leftChild], treeA, nodeB, treeB, pairs);
    if (nodeA.rightChild !== undefined) traverseBVH(treeA[nodeA.rightChild], treeA, nodeB, treeB, pairs);
    return;
  }

  if (nodeA.leftChild !== undefined && nodeB.leftChild !== undefined)
    traverseBVH(treeA[nodeA.leftChild], treeA, treeB[nodeB.leftChild], treeB, pairs);
  if (nodeA.leftChild !== undefined && nodeB.rightChild !== undefined)
    traverseBVH(treeA[nodeA.leftChild], treeA, treeB[nodeB.rightChild], treeB, pairs);
  if (nodeA.rightChild !== undefined && nodeB.leftChild !== undefined)
    traverseBVH(treeA[nodeA.rightChild], treeA, treeB[nodeB.leftChild], treeB, pairs);
  if (nodeA.rightChild !== undefined && nodeB.rightChild !== undefined)
    traverseBVH(treeA[nodeA.rightChild], treeA, treeB[nodeB.rightChild], treeB, pairs);
}

function aabbOverlapDepth(a: BVHNode, b: BVHNode): [number, number, number, number] {
  const overlapX = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
  const overlapY = Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]);
  const overlapZ = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
  const minOverlap = Math.min(overlapX, overlapY, overlapZ);
  return [overlapX, overlapY, overlapZ, minOverlap];
}

function geometryAABB(geom: GeometryData): BVHNode {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const pos = geom.positions;
  for (let i = 0; i < pos.length; i += 3) {
    minX = Math.min(minX, pos[i]);
    minY = Math.min(minY, pos[i + 1]);
    minZ = Math.min(minZ, pos[i + 2]);
    maxX = Math.max(maxX, pos[i]);
    maxY = Math.max(maxY, pos[i + 1]);
    maxZ = Math.max(maxZ, pos[i + 2]);
  }
  return {
    min: [minX, minY, minZ] as [number, number, number],
    max: [maxX, maxY, maxZ] as [number, number, number],
  };
}

export function detectClashes(
  treeA: BVHNode[],
  treeB: BVHNode[],
  geometriesA: Map<number, GeometryData>,
  geometriesB: Map<number, GeometryData>,
  tolerance: number,
  componentLookup: Map<number, { expressId: number; name: string; type: string }>
): ClashPair[] {
  if (treeA.length === 0 || treeB.length === 0) return [];

  const candidatePairs: [number, number][] = [];
  traverseBVH(treeA[0], treeA, treeB[0], treeB, candidatePairs);

  const clashes: ClashPair[] = [];
  const seen = new Set<string>();

  for (const [compIdA, compIdB] of candidatePairs) {
    const key = `${Math.min(compIdA, compIdB)}_${Math.max(compIdA, compIdB)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const geomA = geometriesA.get(compIdA);
    const geomB = geometriesB.get(compIdB);
    if (!geomA || !geomB) continue;

    const aabbA = geometryAABB(geomA);
    const aabbB = geometryAABB(geomB);

    const [, , , minOverlap] = aabbOverlapDepth(aabbA, aabbB);

    if (minOverlap <= -tolerance) continue;

    const approxDistance = minOverlap > 0 ? -minOverlap : Math.abs(minOverlap);

    const centerA: [number, number, number] = [
      (aabbA.min[0] + aabbA.max[0]) / 2,
      (aabbA.min[1] + aabbA.max[1]) / 2,
      (aabbA.min[2] + aabbA.max[2]) / 2,
    ];
    const centerB: [number, number, number] = [
      (aabbB.min[0] + aabbB.max[0]) / 2,
      (aabbB.min[1] + aabbB.max[1]) / 2,
      (aabbB.min[2] + aabbB.max[2]) / 2,
    ];
    const clashPoint: [number, number, number] = [
      (centerA[0] + centerB[0]) / 2,
      (centerA[1] + centerB[1]) / 2,
      (centerA[2] + centerB[2]) / 2,
    ];

    const infoA = componentLookup.get(compIdA) || { expressId: compIdA, name: `Component ${compIdA}`, type: "Unknown" };
    const infoB = componentLookup.get(compIdB) || { expressId: compIdB, name: `Component ${compIdB}`, type: "Unknown" };

    let severity: "hard" | "soft" | "duplicate" = "soft";
    if (minOverlap > 0.1) severity = "hard";
    else if (minOverlap > 0.01) severity = "hard";
    else if (minOverlap > 0) severity = "soft";
    else if (minOverlap > -tolerance * 0.5) severity = "soft";
    if (infoA.type === infoB.type && minOverlap > 0.05) severity = "duplicate";

    clashes.push({
      id: uuidv4(),
      componentA: { expressId: infoA.expressId, name: infoA.name, type: infoA.type },
      componentB: { expressId: infoB.expressId, name: infoB.name, type: infoB.type },
      clashPoint,
      distance: approxDistance,
      severity,
      status: "new",
    });
  }

  return clashes.sort((a, b) => b.distance - a.distance);
}

export function createJob(categoryA: string[], categoryB: string[], tolerance: number): string {
  const jobId = uuidv4();
  jobStore.set(jobId, {
    response: { jobId, status: "running", progress: 0 },
    categoryA,
    categoryB,
  });
  return jobId;
}

export function updateJob(jobId: string, update: Partial<ClashResponse>): void {
  const entry = jobStore.get(jobId);
  if (!entry) return;
  entry.response = { ...entry.response, ...update };
}

export function getJob(jobId: string): ClashResponse | undefined {
  return jobStore.get(jobId)?.response;
}

export function deleteJob(jobId: string): void {
  jobStore.delete(jobId);
}
