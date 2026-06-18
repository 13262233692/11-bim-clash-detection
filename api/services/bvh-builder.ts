import type { GeometryData, BVHNode } from "../../shared/types.js";
import { transformPoint, IDENTITY_MATRIX } from "../../shared/matrix.js";

class AABB {
  min: [number, number, number];
  max: [number, number, number];

  constructor(
    min: [number, number, number] = [Infinity, Infinity, Infinity],
    max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  ) {
    this.min = [...min];
    this.max = [...max];
  }

  intersect(other: AABB): boolean {
    return (
      this.min[0] <= other.max[0] &&
      this.max[0] >= other.min[0] &&
      this.min[1] <= other.max[1] &&
      this.max[1] >= other.min[1] &&
      this.min[2] <= other.max[2] &&
      this.max[2] >= other.min[2]
    );
  }

  merge(other: AABB): AABB {
    return new AABB(
      [
        Math.min(this.min[0], other.min[0]),
        Math.min(this.min[1], other.min[1]),
        Math.min(this.min[2], other.min[2]),
      ],
      [
        Math.max(this.max[0], other.max[0]),
        Math.max(this.max[1], other.max[1]),
        Math.max(this.max[2], other.max[2]),
      ]
    );
  }

  surfaceArea(): number {
    const d: [number, number, number] = [
      this.max[0] - this.min[0],
      this.max[1] - this.min[1],
      this.max[2] - this.min[2],
    ];
    return 2.0 * (d[0] * d[1] + d[1] * d[2] + d[2] * d[0]);
  }

  centroid(): [number, number, number] {
    return [
      (this.min[0] + this.max[0]) * 0.5,
      (this.min[1] + this.max[1]) * 0.5,
      (this.min[2] + this.max[2]) * 0.5,
    ];
  }
}

interface BVHLeaf {
  aabb: AABB;
  geometryId: string;
  componentId: number;
}

interface BVHBuildNode {
  aabb: AABB;
  left?: BVHBuildNode;
  right?: BVHBuildNode;
  leaf?: BVHLeaf;
}

function computeLocalAABB(geom: GeometryData): AABB {
  const box = new AABB();
  const pos = geom.positions;
  for (let i = 0; i < pos.length; i += 3) {
    box.min[0] = Math.min(box.min[0], pos[i]);
    box.min[1] = Math.min(box.min[1], pos[i + 1]);
    box.min[2] = Math.min(box.min[2], pos[i + 2]);
    box.max[0] = Math.max(box.max[0], pos[i]);
    box.max[1] = Math.max(box.max[1], pos[i + 1]);
    box.max[2] = Math.max(box.max[2], pos[i + 2]);
  }
  return box;
}

function transformAABB(localBox: AABB, transform: number[]): AABB {
  if (!transform || transform.length !== 16 ||
      (transform[0] === 1 && transform[5] === 1 && transform[10] === 1 &&
       transform[12] === 0 && transform[13] === 0 && transform[14] === 0)) {
    return new AABB(localBox.min, localBox.max);
  }

  const corners: [number, number, number][] = [
    [localBox.min[0], localBox.min[1], localBox.min[2]],
    [localBox.max[0], localBox.min[1], localBox.min[2]],
    [localBox.min[0], localBox.max[1], localBox.min[2]],
    [localBox.max[0], localBox.max[1], localBox.min[2]],
    [localBox.min[0], localBox.min[1], localBox.max[2]],
    [localBox.max[0], localBox.min[1], localBox.max[2]],
    [localBox.min[0], localBox.max[1], localBox.max[2]],
    [localBox.max[0], localBox.max[1], localBox.max[2]],
  ];

  const worldBox = new AABB();
  for (const corner of corners) {
    const [x, y, z] = transformPoint(transform, corner[0], corner[1], corner[2]);
    worldBox.min[0] = Math.min(worldBox.min[0], x);
    worldBox.min[1] = Math.min(worldBox.min[1], y);
    worldBox.min[2] = Math.min(worldBox.min[2], z);
    worldBox.max[0] = Math.max(worldBox.max[0], x);
    worldBox.max[1] = Math.max(worldBox.max[1], y);
    worldBox.max[2] = Math.max(worldBox.max[2], z);
  }

  return worldBox;
}

function computeGeometryAABB(geom: GeometryData): AABB {
  const localBox = computeLocalAABB(geom);
  const transform = geom.transform || IDENTITY_MATRIX;
  return transformAABB(localBox, transform);
}

function sahSplit(leaves: BVHLeaf[], parentBox: AABB): { left: BVHLeaf[]; right: BVHLeaf[]; axis: number } | null {
  if (leaves.length <= 2) return null;

  let bestCost = Infinity;
  let bestAxis = 0;
  let bestSplit = 0;

  for (let axis = 0; axis < 3; axis++) {
    leaves.sort((a, b) => a.aabb.centroid()[axis] - b.aabb.centroid()[axis]);

    const n = leaves.length;
    const rightBoxes: AABB[] = new Array(n);
    let rightBox = new AABB();
    for (let i = n - 1; i >= 0; i--) {
      rightBox = rightBox.merge(leaves[i].aabb);
      rightBoxes[i] = rightBox;
    }

    let leftBox = new AABB();
    for (let i = 0; i < n - 1; i++) {
      leftBox = leftBox.merge(leaves[i].aabb);
      const leftCount = i + 1;
      const rightCount = n - leftCount;
      const cost =
        0.125 +
        (leftCount * leftBox.surfaceArea() + rightCount * rightBoxes[i + 1].surfaceArea()) /
          parentBox.surfaceArea();

      if (cost < bestCost) {
        bestCost = cost;
        bestAxis = axis;
        bestSplit = i + 1;
      }
    }
  }

  if (bestCost >= leaves.length) return null;

  leaves.sort((a, b) => a.aabb.centroid()[bestAxis] - b.aabb.centroid()[bestAxis]);
  return { left: leaves.slice(0, bestSplit), right: leaves.slice(bestSplit), axis: bestAxis };
}

function buildRecursive(leaves: BVHLeaf[]): BVHBuildNode {
  if (leaves.length === 1) {
    return { aabb: leaves[0].aabb, leaf: leaves[0] };
  }

  const parentBox = leaves.reduce((acc, l) => acc.merge(l.aabb), new AABB());
  const split = sahSplit(leaves, parentBox);

  if (!split) {
    const mid = Math.floor(leaves.length / 2);
    return buildInternal(leaves.slice(0, mid), leaves.slice(mid), parentBox);
  }

  return buildInternal(split.left, split.right, parentBox);
}

function buildInternal(leftLeaves: BVHLeaf[], rightLeaves: BVHLeaf[], parentBox: AABB): BVHBuildNode {
  const left = buildRecursive(leftLeaves);
  const right = buildRecursive(rightLeaves);
  return { aabb: parentBox, left, right };
}

function flattenBVH(node: BVHBuildNode, nodes: BVHNode[]): number {
  const idx = nodes.length;
  nodes.push({
    min: node.aabb.min,
    max: node.aabb.max,
  });

  if (node.leaf) {
    nodes[idx].componentId = node.leaf.componentId;
    nodes[idx].geometryId = node.leaf.geometryId;
  } else {
    if (node.left) {
      const leftIdx = flattenBVH(node.left, nodes);
      nodes[idx].leftChild = leftIdx;
    }
    if (node.right) {
      const rightIdx = flattenBVH(node.right, nodes);
      nodes[idx].rightChild = rightIdx;
    }
  }

  return idx;
}

export function buildBVH(geometries: GeometryData[]): BVHNode[] {
  if (geometries.length === 0) return [];

  const leaves: BVHLeaf[] = geometries.map((geom) => ({
    aabb: computeGeometryAABB(geom),
    geometryId: geom.id,
    componentId: geom.componentId,
  }));

  const root = buildRecursive(leaves);
  const nodes: BVHNode[] = [];
  flattenBVH(root, nodes);
  return nodes;
}

export function serializeBVH(nodes: BVHNode[]): string {
  return JSON.stringify(nodes);
}

export function deserializeBVH(json: string): BVHNode[] {
  return JSON.parse(json);
}

export { AABB };
