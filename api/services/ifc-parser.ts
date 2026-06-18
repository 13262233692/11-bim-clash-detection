import { v4 as uuidv4 } from "uuid";
import type { IFCComponent, GeometryData, MaterialInfo } from "../../shared/types.js";

type IfcCategory = "structural" | "hvac" | "plumbing" | "electrical" | "other";

const STRUCTURAL_TYPES = new Set([
  "IFCWALL", "IFCWALLSTANDARDCASE", "IFCSLAB", "IFCCOLUMN", "IFCBEAM",
  "IFCFOOTING", "IFCROOF", "IFCSTAIR", "IFCRAMP", "IFCCURTAINWALL",
  "IFCDOOR", "IFCWINDOW", "IFCPLATE", "IFCMEMBER",
]);

const HVAC_TYPES = new Set([
  "IFCDUCTSEGMENT", "IFCDUCTFITTING", "IFCAIRTERMINAL", "IFCFLOWCONTROLLER",
  "IFCFAN", "IFCUNITARYEQUIPMENT", "IFCAIRTERMINALBOX", "IFCCHILLER",
  "IFCCOIL", "IFCEVAPORATOR", "IFCCONDENSER",
]);

const PLUMBING_TYPES = new Set([
  "IFCPIPESEGMENT", "IFCPIPEFITTING", "IFCVALVE", "IFCPUMP",
  "IFCTANK", "IFCWASTETERMINAL", "IFCSANITARYTERMINAL", "IFCSINK",
  "IFCBATH", "IFCSHOWER",
]);

const ELECTRICAL_TYPES = new Set([
  "IFCCABLESEGMENT", "IFCCABLEFITTING", "IFCELECTRICAPPLIANCE",
  "IFCLAMP", "IFCLIGHTFIXTURE", "IFCSWITCHINGDEVICE",
  "IFCPROTECTIVEDEVICE", "IFCTRANSFORMER", "IFCGENERATOR",
  "IFCELECTRICDISTRIBUTIONBOARD", "IFCELECTRICFLOWTREATMENTDEVICE",
]);

function categorizeComponent(ifcType: string): IfcCategory {
  const upper = ifcType.toUpperCase();
  if (STRUCTURAL_TYPES.has(upper)) return "structural";
  if (HVAC_TYPES.has(upper)) return "hvac";
  if (PLUMBING_TYPES.has(upper)) return "plumbing";
  if (ELECTRICAL_TYPES.has(upper)) return "electrical";
  return "other";
}

const CATEGORY_COLORS: Record<IfcCategory, string> = {
  structural: "#808080",
  hvac: "#4a9eff",
  plumbing: "#b87333",
  electrical: "#ffcc00",
  other: "#a0a0a0",
};

interface ParsedResult {
  components: IFCComponent[];
  geometries: GeometryData[];
  materials: MaterialInfo[];
  componentLookup: Map<number, { expressId: number; name: string; type: string }>;
}

export async function parseIFCFile(filePath: string): Promise<ParsedResult> {
  let IfcApi: any = null;

  try {
    const webIfc = await import("web-ifc");
    IfcApi = webIfc.IfcAPI ?? webIfc.default?.IfcAPI;
    if (!IfcApi) {
      const mod = webIfc.default || webIfc;
      IfcApi = mod.IfcAPI || mod;
    }
  } catch (err) {
    console.error("Failed to load web-ifc, using fallback parser:", err);
    return fallbackParse(filePath);
  }

  try {
    const api = new IfcApi();
    await api.Init();

    const fs = await import("fs");
    const data = fs.readFileSync(filePath);
    const buffer = new Uint8Array(data);

    const modelID = api.OpenModel(buffer);
    const geometries: GeometryData[] = [];
    const components: IFCComponent[] = [];
    const materials: MaterialInfo[] = [];
    const materialMap = new Map<string, MaterialInfo>();
    const componentLookup = new Map<number, { expressId: number; name: string; type: string }>();

    const flatComps = api.GetIfcEntityList(modelID);

    for (const expressId of flatComps) {
      try {
        const type = api.GetLine(modelID, expressId);
        if (!type) continue;

        const ifcType = (type.constructor?.name || type.type || "IFCBUILDINGELEMENTPROXY").toUpperCase();
        const category = categorizeComponent(ifcType);
        const name = type.Name?.value || `${ifcType}_${expressId}`;
        const matName = "Default";

        if (!materialMap.has(matName)) {
          const mat: MaterialInfo = {
            id: `mat-${materialMap.size}`,
            name: matName,
            color: CATEGORY_COLORS[category],
            opacity: 1.0,
            category,
          };
          materialMap.set(matName, mat);
          materials.push(mat);
        }

        const geomId = uuidv4();
        const comp: IFCComponent = {
          expressId,
          type: ifcType,
          name,
          material: matName,
          category,
          geometryId: geomId,
          properties: {},
          children: [],
        };

        componentLookup.set(expressId, { expressId, name, type: ifcType });

        try {
          const mesh = api.GetGeometry(modelID, expressId);
          if (mesh) {
            const vertData = api.GetVertexArray(mesh.GetVertexData(), mesh.GetVertexDataSize()) as number[];
            const indexData = api.GetIndexArray(mesh.GetIndexData(), mesh.GetIndexDataSize()) as number[];

            const positions = Array.from(vertData) as number[];
            const indices = Array.from(indexData) as number[];
            const normals = new Array(positions.length).fill(0) as number[];

            for (let i = 0; i < indices.length; i += 3) {
              const i0 = indices[i] * 3;
              const i1 = indices[i + 1] * 3;
              const i2 = indices[i + 2] * 3;
              if (i0 + 2 < positions.length && i1 + 2 < positions.length && i2 + 2 < positions.length) {
                const e1x = positions[i1] - positions[i0];
                const e1y = positions[i1 + 1] - positions[i0 + 1];
                const e1z = positions[i1 + 2] - positions[i0 + 2];
                const e2x = positions[i2] - positions[i0];
                const e2y = positions[i2 + 1] - positions[i0 + 1];
                const e2z = positions[i2 + 2] - positions[i0 + 2];
                const nx = e1y * e2z - e1z * e2y;
                const ny = e1z * e2x - e1x * e2z;
                const nz = e1x * e2y - e1y * e2x;
                const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                normals[i0] += nx / len; normals[i0 + 1] += ny / len; normals[i0 + 2] += nz / len;
                normals[i1] += nx / len; normals[i1 + 1] += ny / len; normals[i1 + 2] += nz / len;
                normals[i2] += nx / len; normals[i2 + 1] += ny / len; normals[i2 + 2] += nz / len;
              }
            }

            geometries.push({
              id: geomId,
              positions,
              normals,
              indices,
              materialId: materialMap.get(matName)!.id,
              componentId: expressId,
              color: CATEGORY_COLORS[category],
            });
          }
        } catch (geomErr) {
          // skip geometry extraction errors
        }

        if (STRUCTURAL_TYPES.has(ifcType) || HVAC_TYPES.has(ifcType) ||
          PLUMBING_TYPES.has(ifcType) || ELECTRICAL_TYPES.has(ifcType)) {
          components.push(comp);
        }
      } catch (lineErr) {
        // skip individual line errors
      }
    }

    api.CloseModel(modelID);

    return { components, geometries, materials, componentLookup };
  } catch (err) {
    console.error("IFC parsing failed, using fallback:", err);
    return fallbackParse(filePath);
  }
}

function fallbackParse(filePath: string): ParsedResult {
  return {
    components: [],
    geometries: [],
    materials: [],
    componentLookup: new Map(),
  };
}
