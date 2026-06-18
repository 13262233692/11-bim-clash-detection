import { generateDemoProject } from "./api/services/demo-data";
import { buildBVH } from "./api/services/bvh-builder";
import { detectClashes } from "./api/services/clash-detector";

const d = generateDemoProject();
console.log("=== Project Info ===");
console.log("Project:", d.project.name);
console.log("Geometries:", d.geometries.length);

console.log("\n=== Sample Geometry (North Wall, id=5) ===");
const wallGeom = d.geometries.find(g => g.componentId === 5);
if (wallGeom) {
  console.log("Local AABB (from positions):");
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < wallGeom.positions.length; i += 3) {
    minX = Math.min(minX, wallGeom.positions[i]);
    minY = Math.min(minY, wallGeom.positions[i + 1]);
    minZ = Math.min(minZ, wallGeom.positions[i + 2]);
    maxX = Math.max(maxX, wallGeom.positions[i]);
    maxY = Math.max(maxY, wallGeom.positions[i + 1]);
    maxZ = Math.max(maxZ, wallGeom.positions[i + 2]);
  }
  console.log(`  min: (${minX}, ${minY}, ${minZ})`);
  console.log(`  max: (${maxX}, ${maxY}, ${maxZ})`);
  console.log("Transform matrix:");
  const t = wallGeom.transform;
  console.log(`  [${t[0]}, ${t[4]}, ${t[8]}, ${t[12]}]`);
  console.log(`  [${t[1]}, ${t[5]}, ${t[9]}, ${t[13]}]`);
  console.log(`  [${t[2]}, ${t[6]}, ${t[10]}, ${t[14]}]`);
  console.log(`  [${t[3]}, ${t[7]}, ${t[11]}, ${t[15]}]`);
}

console.log("\n=== Building BVH ===");
const bvh = buildBVH(d.geometries);
console.log("BVH nodes:", bvh.length);
console.log("Root AABB:");
console.log(`  min: (${bvh[0].min[0]}, ${bvh[0].min[1]}, ${bvh[0].min[2]})`);
console.log(`  max: (${bvh[0].max[0]}, ${bvh[0].max[1]}, ${bvh[0].max[2]})`);

console.log("\n=== Clash Detection (HVAC vs Structural) ===");
const hvacCat = new Set(["hvac"]);
const structCat = new Set(["structural"]);

const compIdSetA = new Set<number>();
const compIdSetB = new Set<number>();
const findIds = (comps: typeof d.components, targetSet: Set<number>, categories: Set<string>) => {
  for (const comp of comps) {
    if (categories.has(comp.category)) targetSet.add(comp.expressId);
    findIds(comp.children, targetSet, categories);
  }
};
findIds(d.components, compIdSetA, hvacCat);
findIds(d.components, compIdSetB, structCat);

console.log("HVAC components:", compIdSetA.size);
console.log("Structural components:", compIdSetB.size);

const geomsA = d.geometries.filter(g => compIdSetA.has(g.componentId));
const geomsB = d.geometries.filter(g => compIdSetB.has(g.componentId));
console.log("HVAC geometries:", geomsA.length);
console.log("Structural geometries:", geomsB.length);

const geomMapA = new Map(geomsA.map(g => [g.componentId, g]));
const geomMapB = new Map(geomsB.map(g => [g.componentId, g]));

const treeA = buildBVH(geomsA);
const treeB = buildBVH(geomsB);

const clashes = detectClashes(treeA, treeB, geomMapA, geomMapB, 0.01, d.componentLookup);
console.log("\nClashes found:", clashes.length);

const hardCount = clashes.filter(c => c.severity === "hard").length;
const softCount = clashes.filter(c => c.severity === "soft").length;
const dupCount = clashes.filter(c => c.severity === "duplicate").length;
console.log(`  Hard: ${hardCount}, Soft: ${softCount}, Duplicate: ${dupCount}`);

console.log("\n=== Sample Clashes (first 3) ===");
clashes.slice(0, 3).forEach((c, i) => {
  console.log(`${i + 1}. ${c.componentA.name} vs ${c.componentB.name}`);
  console.log(`   Severity: ${c.severity}, Distance: ${c.distance.toFixed(4)}`);
  console.log(`   Clash point: (${c.clashPoint[0].toFixed(2)}, ${c.clashPoint[1].toFixed(2)}, ${c.clashPoint[2].toFixed(2)})`);
});

console.log("\n=== Expected Clashes Verification ===");
console.log("Checking known clash pairs from demo data setup...");
const expectedClashes = [
  ["Main Supply Duct", "Interior Wall A"],
  ["Main Supply Duct", "Interior Wall B"],
  ["Branch Duct South", "Interior Wall B"],
];

for (const [nameA, nameB] of expectedClashes) {
  const found = clashes.find(c =>
    (c.componentA.name === nameA && c.componentB.name === nameB) ||
    (c.componentA.name === nameB && c.componentB.name === nameA)
  );
  console.log(`  ${nameA} vs ${nameB}: ${found ? "FOUND" : "MISSING"} ${found ? `(${found.severity})` : ""}`);
}
