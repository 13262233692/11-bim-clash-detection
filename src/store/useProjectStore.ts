import { create } from "zustand";
import type {
  IFCProject,
  IFCComponent,
  GeometryData,
  MaterialInfo,
  ClashPair,
  ClashRequest,
  MeasurePoint,
  MeasureLine,
  MeasureMode,
} from "@/types";

interface ProjectState {
  projects: IFCProject[];
  currentProject: IFCProject | null;
  modelTree: IFCComponent[] | null;
  geometries: GeometryData[];
  materials: MaterialInfo[];
  clashResults: ClashPair[];
  clashJobId: string | null;
  clashStatus: "idle" | "running" | "completed" | "failed";
  selectedComponent: IFCComponent | null;
  visibleCategories: Record<string, boolean>;
  clashPoints: [number, number, number][];
  focusedComponentId: number | null;
  measureEnabled: boolean;
  measureMode: MeasureMode;
  measureStart: MeasurePoint | null;
  measureEnd: MeasurePoint | null;
  measureLines: MeasureLine[];
}

interface ProjectActions {
  fetchProjects: () => Promise<void>;
  createProject: (name: string, file: File) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  fetchTree: (id: string) => Promise<void>;
  fetchGeometry: (id: string) => Promise<void>;
  fetchMaterials: (id: string) => Promise<void>;
  runClashDetection: (id: string, request: ClashRequest) => Promise<void>;
  fetchClashResults: (id: string) => Promise<void>;
  selectComponent: (component: IFCComponent | null) => void;
  toggleCategory: (category: string) => void;
  focusComponent: (expressId: number | null) => void;
  createDemoProject: () => Promise<void>;
  reset: () => void;
  setMeasureEnabled: (enabled: boolean) => void;
  setMeasureMode: (mode: MeasureMode) => void;
  setMeasureStart: (point: MeasurePoint | null) => void;
  setMeasureEnd: (point: MeasurePoint | null) => void;
  addMeasureLine: (line: MeasureLine) => void;
  removeMeasureLine: (id: string) => void;
  clearMeasureLines: () => void;
  resetMeasure: () => void;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  modelTree: null,
  geometries: [],
  materials: [],
  clashResults: [],
  clashJobId: null,
  clashStatus: "idle",
  selectedComponent: null,
  visibleCategories: {
    structural: true,
    hvac: true,
    plumbing: true,
    electrical: true,
    other: true,
  },
  clashPoints: [],
  focusedComponentId: null,
  measureEnabled: false,
  measureMode: "idle",
  measureStart: null,
  measureEnd: null,
  measureLines: [],
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json && json.success && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}

export const useProjectStore = create<ProjectState & ProjectActions>(
  (set, get) => ({
    ...initialState,

    fetchProjects: async () => {
      try {
        const data = await apiFetch<IFCProject[]>("/api/projects");
        set({ projects: data });
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    },

    createProject: async (name, file) => {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("ifcFile", file);
      try {
        const project = await apiFetch<IFCProject>("/api/projects", {
          method: "POST",
          body: formData,
        });
        set((s) => ({ projects: [...s.projects, project] }));
      } catch (err) {
        console.error("Failed to create project:", err);
        throw err;
      }
    },

    deleteProject: async (id) => {
      try {
        await fetch(`/api/projects/${id}`, { method: "DELETE" });
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProject:
            s.currentProject?.id === id ? null : s.currentProject,
        }));
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    },

    fetchProject: async (id) => {
      try {
        const data = await apiFetch<IFCProject>(`/api/projects/${id}`);
        set({ currentProject: data });
      } catch (err) {
        console.error("Failed to fetch project:", err);
      }
    },

    fetchTree: async (id) => {
      try {
        const data = await apiFetch<IFCComponent[]>(`/api/projects/${id}/tree`);
        set({ modelTree: data });
      } catch (err) {
        console.error("Failed to fetch tree:", err);
      }
    },

    fetchGeometry: async (id) => {
      try {
        const data = await apiFetch<GeometryData[]>(
          `/api/projects/${id}/geometry`
        );
        set({ geometries: data });
      } catch (err) {
        console.error("Failed to fetch geometry:", err);
      }
    },

    fetchMaterials: async (id) => {
      try {
        const data = await apiFetch<MaterialInfo[]>(
          `/api/projects/${id}/materials`
        );
        set({ materials: data });
      } catch (err) {
        console.error("Failed to fetch materials:", err);
      }
    },

    runClashDetection: async (id, request) => {
      set({ clashStatus: "running", clashResults: [], clashPoints: [] });
      try {
        const data = await apiFetch<{ jobId: string }>(
          `/api/projects/${id}/clash`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
          }
        );
        set({ clashJobId: data.jobId });
        const poll = async () => {
          try {
            const status = await apiFetch<{
              status: string;
              results?: ClashPair[];
            }>(`/api/projects/${id}/clash/${data.jobId}`);
            if (status.status === "completed" && status.results) {
              const points = status.results.map(
                (r) => r.clashPoint
              ) as [number, number, number][];
              set({
                clashStatus: "completed",
                clashResults: status.results,
                clashPoints: points,
              });
            } else if (status.status === "failed") {
              set({ clashStatus: "failed" });
            } else {
              setTimeout(poll, 1000);
            }
          } catch {
            set({ clashStatus: "failed" });
          }
        };
        setTimeout(poll, 500);
      } catch (err) {
        console.error("Failed to run clash detection:", err);
        set({ clashStatus: "failed" });
      }
    },

    fetchClashResults: async (id) => {
      try {
        const data = await apiFetch<ClashPair[]>(
          `/api/projects/${id}/clash/results`
        );
        const points = data.map(
          (r) => r.clashPoint
        ) as [number, number, number][];
        set({ clashResults: data, clashPoints: points });
      } catch (err) {
        console.error("Failed to fetch clash results:", err);
      }
    },

    selectComponent: (component) => {
      set({ selectedComponent: component });
    },

    toggleCategory: (category) => {
      set((s) => ({
        visibleCategories: {
          ...s.visibleCategories,
          [category]: !s.visibleCategories[category],
        },
      }));
    },

    focusComponent: (expressId) => {
      set({ focusedComponentId: expressId });
    },

    createDemoProject: async () => {
      try {
        const project = await apiFetch<IFCProject>("/api/projects/demo", {
          method: "POST",
        });
        set((s) => ({ projects: [...s.projects, project] }));
      } catch (err) {
        console.error("Failed to create demo project:", err);
        throw err;
      }
    },

    reset: () => {
      set(initialState);
    },

    setMeasureEnabled: (enabled) => {
      set({
        measureEnabled: enabled,
        measureMode: enabled ? "idle" : "idle",
        measureStart: null,
        measureEnd: null,
      });
    },

    setMeasureMode: (mode) => {
      set({ measureMode: mode });
    },

    setMeasureStart: (point) => {
      set({ measureStart: point });
    },

    setMeasureEnd: (point) => {
      set({ measureEnd: point });
    },

    addMeasureLine: (line) => {
      set((s) => ({ measureLines: [...s.measureLines, line] }));
    },

    removeMeasureLine: (id) => {
      set((s) => ({
        measureLines: s.measureLines.filter((l) => l.id !== id),
      }));
    },

    clearMeasureLines: () => {
      set({ measureLines: [] });
    },

    resetMeasure: () => {
      set({
        measureMode: "idle",
        measureStart: null,
        measureEnd: null,
      });
    },
  })
);
