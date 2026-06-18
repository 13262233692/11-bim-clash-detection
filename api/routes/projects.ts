import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import type { IFCProject, IFCComponent, GeometryData, BVHNode, ClashRequest, MaterialInfo } from "../../shared/types.js";
import { buildBVH, serializeBVH, deserializeBVH } from "../services/bvh-builder.js";
import { detectClashes, createJob, updateJob, getJob } from "../services/clash-detector.js";
import { generateDemoProject } from "../services/demo-data.js";
import { parseIFCFile } from "../services/ifc-parser.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".ifc") cb(null, true);
    else cb(new Error("Only .ifc files are allowed"));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

interface ProjectStore {
  project: IFCProject;
  components: IFCComponent[];
  geometries: GeometryData[];
  bvhTree: BVHNode[];
  materials: MaterialInfo[];
  componentLookup: Map<number, { expressId: number; name: string; type: string }>;
  filePath?: string;
}

const projects = new Map<string, ProjectStore>();

router.post("/", upload.single("ifc"), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: "No IFC file uploaded" });
      return;
    }

    const projectId = uuidv4();
    const projectName = req.body.name || path.basename(file.originalname, ".ifc");

    const project: IFCProject = {
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      ifcFileName: file.originalname,
      status: "parsing",
      stats: { componentCount: 0, triangleCount: 0, materialCount: 0 },
    };

    projects.set(projectId, {
      project,
      components: [],
      geometries: [],
      bvhTree: [],
      materials: [],
      componentLookup: new Map(),
      filePath: file.path,
    });

    res.status(201).json({ success: true, data: project });

    try {
      const parsed = await parseIFCFile(file.path);

      if (parsed.geometries.length === 0) {
        project.status = "error";
        project.stats = { componentCount: 0, triangleCount: 0, materialCount: 0 };
        return;
      }

      const bvhTree = buildBVH(parsed.geometries);

      const store = projects.get(projectId)!;
      store.components = parsed.components;
      store.geometries = parsed.geometries;
      store.bvhTree = bvhTree;
      store.materials = parsed.materials;
      store.componentLookup = parsed.componentLookup;

      project.status = "ready";
      project.stats = {
        componentCount: parsed.components.length,
        triangleCount: parsed.geometries.reduce((sum, g) => sum + Math.floor(g.indices.length / 3), 0),
        materialCount: parsed.materials.length,
      };
    } catch (parseErr) {
      project.status = "error";
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Upload failed" });
  }
});

router.get("/", (_req: Request, res: Response): void => {
  const list = Array.from(projects.values()).map((s) => s.project);
  res.json({ success: true, data: list });
});

router.get("/:id", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  res.json({ success: true, data: store.project });
});

router.delete("/:id", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (store.filePath && fs.existsSync(store.filePath)) {
    fs.unlinkSync(store.filePath);
  }
  projects.delete(req.params.id);
  res.json({ success: true, data: null });
});

router.get("/:id/tree", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  res.json({ success: true, data: store.components });
});

router.get("/:id/geometry", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  let geoms = store.geometries;
  const category = req.query.category as string;
  if (category) {
    const categories = category.split(",");
    const categorySet = new Set(categories);
    const matchingIds = new Set<number>();
    const findMatching = (comps: IFCComponent[]) => {
      for (const comp of comps) {
        if (categorySet.has(comp.category)) matchingIds.add(comp.expressId);
        findMatching(comp.children);
      }
    };
    findMatching(store.components);
    geoms = geoms.filter((g) => matchingIds.has(g.componentId));
  }

  res.json({ success: true, data: geoms });
});

router.get("/:id/materials", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  res.json({ success: true, data: store.materials });
});

router.get("/:id/components/:expressId", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  const expressId = parseInt(req.params.expressId, 10);

  const findComponent = (comps: IFCComponent[]): IFCComponent | null => {
    for (const comp of comps) {
      if (comp.expressId === expressId) return comp;
      const found = findComponent(comp.children);
      if (found) return found;
    }
    return null;
  };

  const component = findComponent(store.components);
  if (!component) {
    res.status(404).json({ success: false, error: "Component not found" });
    return;
  }

  const geom = store.geometries.find((g) => g.componentId === expressId);

  res.json({
    success: true,
    data: {
      ...component,
      geometry: geom || null,
    },
  });
});

router.post("/:id/clash", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  if (store.project.status !== "ready") {
    res.status(400).json({ success: false, error: "Project is not ready for clash detection" });
    return;
  }

  const body = req.body as ClashRequest;
  const categoryA = body.categoryA || ["hvac", "plumbing", "electrical"];
  const categoryB = body.categoryB || ["structural"];
  const tolerance = body.tolerance ?? 0.1;

  const jobId = createJob(categoryA, categoryB, tolerance);
  res.status(202).json({ success: true, data: { jobId } });

  setImmediate(() => {
    try {
      updateJob(jobId, { progress: 10 });

      const compIdSetA = new Set<number>();
      const compIdSetB = new Set<number>();
      const findIds = (comps: IFCComponent[], targetSet: Set<number>, categories: Set<string>) => {
        for (const comp of comps) {
          if (categories.has(comp.category)) targetSet.add(comp.expressId);
          findIds(comp.children, targetSet, categories);
        }
      };
      findIds(store.components, compIdSetA, new Set(categoryA));
      findIds(store.components, compIdSetB, new Set(categoryB));

      updateJob(jobId, { progress: 30 });

      const geomsA = store.geometries.filter((g) => compIdSetA.has(g.componentId));
      const geomsB = store.geometries.filter((g) => compIdSetB.has(g.componentId));

      const geomMapA = new Map(geomsA.map((g) => [g.componentId, g]));
      const geomMapB = new Map(geomsB.map((g) => [g.componentId, g]));

      updateJob(jobId, { progress: 50 });

      const treeA = buildBVH(geomsA);
      const treeB = buildBVH(geomsB);

      updateJob(jobId, { progress: 70 });

      const clashes = detectClashes(treeA, treeB, geomMapA, geomMapB, tolerance, store.componentLookup);

      updateJob(jobId, { progress: 100 });
      updateJob(jobId, { status: "completed", results: clashes, progress: 100 });
    } catch (err) {
      updateJob(jobId, { status: "failed", progress: 0 });
    }
  });
});

router.get("/:id/clash/:jobId", (req: Request, res: Response): void => {
  const store = projects.get(req.params.id);
  if (!store) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ success: false, error: "Job not found" });
    return;
  }

  res.json({ success: true, data: job });
});

router.post("/demo", (_req: Request, res: Response): void => {
  const demo = generateDemoProject();

  const bvhTree = buildBVH(demo.geometries);

  projects.set(demo.project.id, {
    project: demo.project,
    components: demo.components,
    geometries: demo.geometries,
    bvhTree,
    materials: demo.materials,
    componentLookup: demo.componentLookup,
  });

  res.status(201).json({ success: true, data: demo.project });
});

export default router;
