export interface IFCProject {
  id: string;
  name: string;
  createdAt: string;
  ifcFileName: string;
  status: "uploading" | "parsing" | "ready" | "error";
  stats: {
    componentCount: number;
    triangleCount: number;
    materialCount: number;
  };
}

export interface IFCComponent {
  expressId: number;
  type: string;
  name: string;
  material: string;
  category: "structural" | "hvac" | "plumbing" | "electrical" | "other";
  geometryId: string;
  properties: Record<string, string | number>;
  children: IFCComponent[];
}

export interface GeometryData {
  id: string;
  positions: number[];
  normals: number[];
  indices: number[];
  materialId: string;
  componentId: number;
  color: string;
  transform: number[];
}

export interface MaterialInfo {
  id: string;
  name: string;
  color: string;
  opacity: number;
  category: string;
}

export interface ClashPair {
  id: string;
  componentA: { expressId: number; name: string; type: string };
  componentB: { expressId: number; name: string; type: string };
  clashPoint: [number, number, number];
  distance: number;
  severity: "hard" | "soft" | "duplicate";
  status: "new" | "acknowledged" | "resolved";
}

export interface ClashRequest {
  categoryA: string[];
  categoryB: string[];
  tolerance: number;
}
