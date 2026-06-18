import { v4 as uuidv4 } from "uuid";
import type { IFCComponent, GeometryData, MaterialInfo } from "../../shared/types.js";

interface DemoComponentDef {
  expressId: number;
  type: string;
  name: string;
  category: "structural" | "hvac" | "plumbing" | "electrical" | "other";
  material: string;
  color: string;
  box: [number, number, number, number, number, number];
  parent?: number;
  clashWith?: number[];
}

const DEMO_MATERIALS: MaterialInfo[] = [
  { id: "mat-concrete", name: "Concrete", color: "#808080", opacity: 1.0, category: "structural" },
  { id: "mat-steel", name: "Steel", color: "#4a6fa5", opacity: 1.0, category: "structural" },
  { id: "mat-hvac", name: "Galvanized Steel", color: "#c0c0c0", opacity: 1.0, category: "hvac" },
  { id: "mat-copper", name: "Copper", color: "#b87333", opacity: 1.0, category: "plumbing" },
  { id: "mat-pvc", name: "PVC", color: "#e0e0e0", opacity: 1.0, category: "plumbing" },
  { id: "mat-cable", name: "Cable Tray", color: "#ffcc00", opacity: 1.0, category: "electrical" },
  { id: "mat-conduit", name: "EMT Conduit", color: "#404040", opacity: 1.0, category: "electrical" },
];

function boxToGeometry(
  id: string,
  componentId: number,
  box: [number, number, number, number, number, number],
  color: string,
  materialId: string
): GeometryData {
  const [x0, y0, z0, x1, y1, z1] = box;

  const positions = [
    x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0,
    x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1,
    x0, y0, z0, x0, y0, z1, x0, y1, z1, x0, y1, z0,
    x1, y0, z0, x1, y0, z1, x1, y1, z1, x1, y1, z0,
    x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1,
    x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1,
  ];

  const normals = [
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  ];

  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    8, 9, 10, 8, 10, 11,
    12, 13, 14, 12, 14, 15,
    16, 17, 18, 16, 18, 19,
    20, 21, 22, 20, 22, 23,
  ];

  return { id, positions, normals, indices, materialId, componentId, color };
}

function cylinderToGeometry(
  id: string,
  componentId: number,
  cx: number, cy: number, cz: number,
  radius: number, length: number,
  axis: "x" | "y" | "z",
  color: string,
  materialId: string,
  segments: number = 12
): GeometryData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    if (axis === "z") {
      positions.push(cx + radius * cos, cy + radius * sin, cz);
      positions.push(cx + radius * cos, cy + radius * sin, cz + length);
      normals.push(cos, sin, 0);
      normals.push(cos, sin, 0);
    } else if (axis === "x") {
      positions.push(cx, cy + radius * cos, cz + radius * sin);
      positions.push(cx + length, cy + radius * cos, cz + radius * sin);
      normals.push(0, cos, sin);
      normals.push(0, cos, sin);
    } else {
      positions.push(cx + radius * cos, cy, cz + radius * sin);
      positions.push(cx + length + radius * cos, cy, cz + radius * sin);
      normals.push(cos, 0, sin);
      normals.push(cos, 0, sin);
    }
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }

  return { id, positions, normals, indices, materialId, componentId, color };
}

function buildComponentTree(defs: DemoComponentDef[]): IFCComponent[] {
  const map = new Map<number, IFCComponent>();
  const roots: IFCComponent[] = [];

  for (const def of defs) {
    const comp: IFCComponent = {
      expressId: def.expressId,
      type: def.type,
      name: def.name,
      material: def.material,
      category: def.category,
      geometryId: `geom-${def.expressId}`,
      properties: {
        Volume: parseFloat(((def.box[3] - def.box[0]) * (def.box[4] - def.box[1]) * (def.box[5] - def.box[2])).toFixed(3)),
      },
      children: [],
    };
    map.set(def.expressId, comp);
  }

  for (const def of defs) {
    if (def.parent && map.has(def.parent)) {
      map.get(def.parent)!.children.push(map.get(def.expressId)!);
    } else {
      roots.push(map.get(def.expressId)!);
    }
  }

  return roots;
}

export function generateDemoProject() {
  let nextId = 1;
  const compDefs: DemoComponentDef[] = [];

  const building: DemoComponentDef = {
    expressId: nextId++,
    type: "IfcBuilding",
    name: "Demo Office Building",
    category: "structural",
    material: "Concrete",
    color: "#808080",
    box: [-6, -0.3, -6, 26, 12, 16],
  };
  compDefs.push(building);

  const floor0: DemoComponentDef = {
    expressId: nextId++,
    type: "IfcBuildingStorey",
    name: "Ground Floor",
    category: "structural",
    material: "Concrete",
    color: "#909090",
    box: [-5.5, -0.25, -5.5, 25.5, 0.25, 15.5],
    parent: building.expressId,
  };
  compDefs.push(floor0);

  const floor1: DemoComponentDef = {
    expressId: nextId++,
    type: "IfcBuildingStorey",
    name: "First Floor",
    category: "structural",
    material: "Concrete",
    color: "#909090",
    box: [-5.5, 3.75, -5.5, 25.5, 4.25, 15.5],
    parent: building.expressId,
  };
  compDefs.push(floor1);

  const floor2: DemoComponentDef = {
    expressId: nextId++,
    type: "IfcBuildingStorey",
    name: "Second Floor",
    category: "structural",
    material: "Concrete",
    color: "#909090",
    box: [-5.5, 7.75, -5.5, 25.5, 8.25, 15.5],
    parent: building.expressId,
  };
  compDefs.push(floor2);

  const wallPositions = [
    { name: "North Wall", box: [-5.5, 0, -5.5, 25.5, 4, -5] as [number, number, number, number, number, number] },
    { name: "South Wall", box: [-5.5, 0, 15, 25.5, 4, 15.5] as [number, number, number, number, number, number] },
    { name: "East Wall", box: [25, 0, -5.5, 25.5, 4, 15.5] as [number, number, number, number, number, number] },
    { name: "West Wall", box: [-5.5, 0, -5.5, -5, 4, 15.5] as [number, number, number, number, number, number] },
    { name: "Interior Wall A", box: [5, 0, -5, 5.25, 4, 8] as [number, number, number, number, number, number] },
    { name: "Interior Wall B", box: [12, 0, 5, 12.25, 4, 15] as [number, number, number, number, number, number] },
    { name: "Interior Wall C", box: [18, 0, -5, 18.25, 4, 10] as [number, number, number, number, number, number] },
  ];

  for (const w of wallPositions) {
    compDefs.push({
      expressId: nextId++,
      type: "IfcWall",
      name: w.name,
      category: "structural",
      material: "Concrete",
      color: "#808080",
      box: w.box,
      parent: floor0.expressId,
    });
  }

  const columnPositions = [
    { name: "Column A1", x: 0, z: 0 },
    { name: "Column A2", x: 10, z: 0 },
    { name: "Column A3", x: 20, z: 0 },
    { name: "Column B1", x: 0, z: 10 },
    { name: "Column B2", x: 10, z: 10 },
    { name: "Column B3", x: 20, z: 10 },
  ];

  for (const col of columnPositions) {
    compDefs.push({
      expressId: nextId++,
      type: "IfcColumn",
      name: col.name,
      category: "structural",
      material: "Steel",
      color: "#4a6fa5",
      box: [col.x - 0.25, 0, col.z - 0.25, col.x + 0.25, 4, col.z + 0.25],
      parent: floor0.expressId,
    });
  }

  compDefs.push({
    expressId: nextId++,
    type: "IfcSlab",
    name: "Ground Floor Slab",
    category: "structural",
    material: "Concrete",
    color: "#a0a0a0",
    box: [-5, -0.15, -5, 25, 0.15, 15],
    parent: floor0.expressId,
  });

  compDefs.push({
    expressId: nextId++,
    type: "IfcSlab",
    name: "First Floor Slab",
    category: "structural",
    material: "Concrete",
    color: "#a0a0a0",
    box: [-5, 3.85, -5, 25, 4.15, 15],
    parent: floor1.expressId,
  });

  const hvacStartId = nextId;
  const hvacDucts = [
    { name: "Main Supply Duct", box: [-4, 2.8, 6, 24, 3.2, 6.4] as [number, number, number, number, number, number], clash: true },
    { name: "Branch Duct North", box: [8, 2.9, -4, 8.4, 3.3, 6] as [number, number, number, number, number, number], clash: false },
    { name: "Branch Duct South", box: [14, 2.9, 6.4, 14.4, 3.3, 14] as [number, number, number, number, number, number], clash: true },
    { name: "Return Duct", box: [-4, 3.5, 2, 24, 3.8, 2.3] as [number, number, number, number, number, number], clash: false },
    { name: "HVAC Unit 1", box: [22, 2.5, 1, 24.5, 3.5, 3] as [number, number, number, number, number, number], clash: false },
    { name: "HVAC Unit 2", box: [22, 2.5, 12, 24.5, 3.5, 14] as [number, number, number, number, number, number], clash: false },
  ];

  for (const duct of hvacDucts) {
    const clashWith = duct.clash ? [compDefs.find(d => d.name === "Interior Wall A")?.expressId, compDefs.find(d => d.name === "Interior Wall B")?.expressId].filter(Boolean) as number[] : [];
    compDefs.push({
      expressId: nextId++,
      type: "IfcDuctSegment",
      name: duct.name,
      category: "hvac",
      material: "Galvanized Steel",
      color: "#c0c0c0",
      box: duct.box,
      parent: floor0.expressId,
      clashWith,
    });
  }

  const plumbingPipes = [
    { name: "Main Water Supply", box: [2, 0.5, 1, 2.15, 3.5, 1.15] as [number, number, number, number, number, number], clash: false },
    { name: "Hot Water Pipe", box: [2.3, 0.5, 1, 2.4, 3.5, 1.1] as [number, number, number, number, number, number], clash: false },
    { name: "Drainage Pipe A", box: [-3, 0.5, 8, -2.85, 3.5, 8.15] as [number, number, number, number, number, number], clash: false },
    { name: "Sprinkler Pipe", box: [-4, 3.6, 4, 24, 3.75, 4.15] as [number, number, number, number, number, number], clash: true },
    { name: "Gas Pipe", box: [-3, 1.5, 12, 20, 1.65, 12.1] as [number, number, number, number, number, number], clash: true },
    { name: "Waste Pipe", box: [8, 0.3, 13, 8.15, 3.5, 13.15] as [number, number, number, number, number, number], clash: false },
  ];

  for (const pipe of plumbingPipes) {
    const clashWith = pipe.clash ? [compDefs.find(d => d.name === "Return Duct")?.expressId, compDefs.find(d => d.name === "Interior Wall C")?.expressId].filter(Boolean) as number[] : [];
    compDefs.push({
      expressId: nextId++,
      type: "IfcPipeSegment",
      name: pipe.name,
      category: "plumbing",
      material: pipe.name.includes("Gas") ? "Steel" : "Copper",
      color: pipe.name.includes("Gas") ? "#4a6fa5" : "#b87333",
      box: pipe.box,
      parent: floor0.expressId,
      clashWith,
    });
  }

  const electricalItems = [
    { name: "Main Cable Tray", box: [-4, 3.3, 0, 24, 3.4, 0.3] as [number, number, number, number, number, number], clash: true },
    { name: "Branch Cable Tray A", box: [5, 3.3, 0.3, 5.3, 3.4, 8] as [number, number, number, number, number, number], clash: false },
    { name: "Branch Cable Tray B", box: [15, 3.3, 0.3, 15.3, 3.4, 10] as [number, number, number, number, number, number], clash: false },
    { name: "Conduit Run A", box: [0, 2.5, -4, 0.05, 2.55, 0] as [number, number, number, number, number, number], clash: false },
    { name: "Conduit Run B", box: [10, 2.5, 10, 10.05, 2.55, 15] as [number, number, number, number, number, number], clash: false },
    { name: "Panel A", box: [23, 1, -4, 23.5, 2.5, -3.5] as [number, number, number, number, number, number], clash: false },
    { name: "Panel B", box: [23, 1, 14, 23.5, 2.5, 14.5] as [number, number, number, number, number, number], clash: false },
  ];

  for (const item of electricalItems) {
    const clashWith = item.clash ? [compDefs.find(d => d.name === "Main Supply Duct")?.expressId].filter(Boolean) as number[] : [];
    compDefs.push({
      expressId: nextId++,
      type: "IfcCableSegment",
      name: item.name,
      category: "electrical",
      material: item.name.includes("Conduit") ? "EMT Conduit" : "Cable Tray",
      color: item.name.includes("Conduit") ? "#404040" : "#ffcc00",
      box: item.box,
      parent: floor0.expressId,
      clashWith,
    });
  }

  for (let fl = 1; fl <= 2; fl++) {
    const baseY = fl * 4;
    const parentFloor = fl === 1 ? floor1 : floor2;

    compDefs.push({
      expressId: nextId++,
      type: "IfcDuctSegment",
      name: `Supply Duct Floor ${fl}`,
      category: "hvac",
      material: "Galvanized Steel",
      color: "#c0c0c0",
      box: [-4, baseY - 1.2, 6, 24, baseY - 0.8, 6.4],
      parent: parentFloor.expressId,
    });

    compDefs.push({
      expressId: nextId++,
      type: "IfcPipeSegment",
      name: `Sprinkler Pipe Floor ${fl}`,
      category: "plumbing",
      material: "Copper",
      color: "#b87333",
      box: [-4, baseY - 0.4, 4, 24, baseY - 0.25, 4.15],
      parent: parentFloor.expressId,
    });

    compDefs.push({
      expressId: nextId++,
      type: "IfcCableSegment",
      name: `Cable Tray Floor ${fl}`,
      category: "electrical",
      material: "Cable Tray",
      color: "#ffcc00",
      box: [-4, baseY - 0.7, 0, 24, baseY - 0.6, 0.3],
      parent: parentFloor.expressId,
    });

    for (const col of columnPositions) {
      compDefs.push({
        expressId: nextId++,
        type: "IfcColumn",
        name: `${col.name} Floor ${fl}`,
        category: "structural",
        material: "Steel",
        color: "#4a6fa5",
        box: [col.x - 0.25, baseY, col.z - 0.25, col.x + 0.25, baseY + 4, col.z + 0.25],
        parent: parentFloor.expressId,
      });
    }
  }

  const geometries: GeometryData[] = [];
  const componentLookup = new Map<number, { expressId: number; name: string; type: string }>();

  for (const def of compDefs) {
    if (def.type === "IfcBuilding" || def.type === "IfcBuildingStorey") continue;

    const geomId = `geom-${def.expressId}`;
    let geom: GeometryData;

    if (def.type === "IfcPipeSegment" || def.type === "IfcDuctSegment") {
      const [x0, y0, z0, x1, y1, z1] = def.box;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const dz = z1 - z0;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const cz = (z0 + z1) / 2;

      if (dz > dx && dz > dy) {
        geom = cylinderToGeometry(geomId, def.expressId, cx - (dx / 2 - Math.min(dx, dy) / 4), cy, z0, Math.min(dx, dy) / 4, dz, "z", def.color, DEMO_MATERIALS.find(m => m.name === def.material)?.id || "mat-concrete");
      } else if (dx > dy) {
        geom = cylinderToGeometry(geomId, def.expressId, x0, cy, cz - (dz / 2 - Math.min(dx, dy) / 4), Math.min(dy, dz) / 4, dx, "x", def.color, DEMO_MATERIALS.find(m => m.name === def.material)?.id || "mat-concrete");
      } else {
        geom = cylinderToGeometry(geomId, def.expressId, x0, y0, cz, Math.min(dx, dz) / 4, dy, "y", def.color, DEMO_MATERIALS.find(m => m.name === def.material)?.id || "mat-concrete");
      }
      geom.componentId = def.expressId;
    } else {
      const matId = DEMO_MATERIALS.find(m => m.name === def.material)?.id || "mat-concrete";
      geom = boxToGeometry(geomId, def.expressId, def.box, def.color, matId);
    }

    geometries.push(geom);
    componentLookup.set(def.expressId, { expressId: def.expressId, name: def.name, type: def.type });
  }

  const componentTree = buildComponentTree(compDefs);

  const totalTriangles = geometries.reduce((sum, g) => sum + Math.floor(g.indices.length / 3), 0);

  return {
    project: {
      id: uuidv4(),
      name: "Demo Office Building",
      createdAt: new Date().toISOString(),
      ifcFileName: "demo-building.ifc",
      status: "ready" as const,
      stats: {
        componentCount: compDefs.filter(d => d.type !== "IfcBuilding" && d.type !== "IfcBuildingStorey").length,
        triangleCount: totalTriangles,
        materialCount: DEMO_MATERIALS.length,
      },
    },
    geometries,
    components: componentTree,
    materials: DEMO_MATERIALS,
    componentLookup,
  };
}
