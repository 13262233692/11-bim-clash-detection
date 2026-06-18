import { generateDemoProject } from "./api/services/demo-data.js";

const d = generateDemoProject();
console.log("project:", d.project.name);
console.log("geometries:", d.geometries.length);
console.log("components:", d.components.length);

if (d.geometries.length > 0) {
  const g0 = d.geometries[0];
  console.log("first geom id:", g0.id);
  console.log("first geom componentId:", g0.componentId);
  console.log("transform length:", g0.transform?.length);
  console.log("transform:", g0.transform?.join(", "));

  const pos = g0.positions;
  console.log("local positions sample:", pos[0], pos[1], pos[2], "|", pos[3], pos[4], pos[5]);
}
