import { generateDemoProject } from "./api/services/demo-data";

const d = generateDemoProject();
console.log("project:", d.project.name);
console.log("geometries:", d.geometries.length);
console.log("components (tree):", d.components.length);

if (d.geometries.length > 0) {
  const g0 = d.geometries[0];
  console.log("\n--- First geometry ---");
  console.log("id:", g0.id);
  console.log("componentId:", g0.componentId);
  console.log("transform length:", g0.transform?.length);
  const t = g0.transform!;
  console.log("transform matrix (column-major):");
  console.log(`  row0: ${t[0]}, ${t[4]}, ${t[8]}, ${t[12]}`);
  console.log(`  row1: ${t[1]}, ${t[5]}, ${t[9]}, ${t[13]}`);
  console.log(`  row2: ${t[2]}, ${t[6]}, ${t[10]}, ${t[14]}`);
  console.log(`  row3: ${t[3]}, ${t[7]}, ${t[11]}, ${t[15]}`);
  console.log("local positions (first 6):", g0.positions.slice(0, 6).join(", "));
}

if (d.geometries.length > 1) {
  const g1 = d.geometries[1];
  console.log("\n--- Second geometry ---");
  console.log("id:", g1.id);
  console.log("componentId:", g1.componentId);
  console.log("transform (first 8):", g1.transform?.slice(0, 8).join(", "));
}
