import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Box,
  RotateCcw,
  Camera,
  Grid3x3,
  Eye,
  Triangle,
  Ruler,
  Trash2,
  X,
} from "lucide-react";
import Scene from "@/components/Scene";
import ModelTree from "@/components/ModelTree";
import MaterialLayers from "@/components/MaterialLayers";
import ClashPanel from "@/components/ClashPanel";
import PropertyPanel from "@/components/PropertyPanel";
import MeasurePanel from "@/components/MeasurePanel";
import { useProjectStore } from "@/store/useProjectStore";

export default function Review() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const currentProject = useProjectStore((s) => s.currentProject);
  const geometries = useProjectStore((s) => s.geometries);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const fetchTree = useProjectStore((s) => s.fetchTree);
  const fetchGeometry = useProjectStore((s) => s.fetchGeometry);
  const fetchMaterials = useProjectStore((s) => s.fetchMaterials);
  const reset = useProjectStore((s) => s.reset);
  const measureEnabled = useProjectStore((s) => s.measureEnabled);
  const setMeasureEnabled = useProjectStore((s) => s.setMeasureEnabled);
  const clearMeasureLines = useProjectStore((s) => s.clearMeasureLines);
  const measureLines = useProjectStore((s) => s.measureLines);

  const [leftPanel, setLeftPanel] = useState(true);
  const [rightPanel, setRightPanel] = useState(true);
  const [leftTab, setLeftTab] = useState<"tree" | "materials">("tree");
  const [rightTab, setRightTab] = useState<"properties" | "clash" | "measure">("properties");
  const [wireframe, setWireframe] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    fetchProject(projectId);
    fetchTree(projectId);
    fetchGeometry(projectId);
    fetchMaterials(projectId);
    return () => {
      reset();
    };
  }, [projectId, fetchProject, fetchTree, fetchGeometry, fetchMaterials, reset]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customE = e as CustomEvent;
      setFps(customE.detail || 0);
    };
    window.addEventListener("bim-fps", handler);
    return () => window.removeEventListener("bim-fps", handler);
  }, []);

  const triangleCount = geometries.reduce(
    (sum, g) => sum + Math.floor(g.indices.length / 3),
    0
  );

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `bim-screenshot-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  if (!currentProject) {
    return (
      <div className="h-screen bg-bim-bg flex items-center justify-center">
        <div className="text-bim-muted font-mono text-sm">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bim-bg flex flex-col overflow-hidden">
      <div className="h-11 border-b border-bim-border flex items-center px-3 gap-2 flex-shrink-0 bg-bim-surface/50">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded hover:bg-bim-surface text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="h-5 w-px bg-bim-border" />
        <span className="font-mono text-sm text-white truncate">
          {currentProject.name}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setLeftPanel(!leftPanel)}
          className={`p-1.5 rounded transition-colors ${
            leftPanel ? "bg-bim-accent/20 text-bim-accent" : "hover:bg-bim-surface text-slate-400"
          }`}
          title="Toggle left panel"
        >
          {leftPanel ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <button
          onClick={() => setRightPanel(!rightPanel)}
          className={`p-1.5 rounded transition-colors ${
            rightPanel ? "bg-bim-accent/20 text-bim-accent" : "hover:bg-bim-surface text-slate-400"
          }`}
          title="Toggle right panel"
        >
          {rightPanel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {leftPanel && (
          <div className="w-[280px] border-r border-bim-border flex flex-col flex-shrink-0 bg-bim-surface/30">
            <div className="flex border-b border-bim-border">
              <button
                onClick={() => setLeftTab("tree")}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors ${
                  leftTab === "tree"
                    ? "text-bim-accent border-b-2 border-bim-accent"
                    : "text-bim-muted hover:text-slate-300"
                }`}
              >
                Model Tree
              </button>
              <button
                onClick={() => setLeftTab("materials")}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors ${
                  leftTab === "materials"
                    ? "text-bim-accent border-b-2 border-bim-accent"
                    : "text-bim-muted hover:text-slate-300"
                }`}
              >
                Materials
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {leftTab === "tree" ? <ModelTree /> : <MaterialLayers />}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center bg-bim-bg">
                  <div className="text-bim-muted font-mono text-sm">
                    Loading 3D viewport...
                  </div>
                </div>
              }
            >
              <Scene wireframe={wireframe} />
            </Suspense>
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-1.5 bg-bim-surface/80 backdrop-blur-sm border-t border-bim-border">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const canvas = document.querySelector("canvas");
                  if (canvas) {
                    const event = new KeyboardEvent("keydown", { key: "0" });
                    canvas.dispatchEvent(event);
                  }
                }}
                className="p-1.5 rounded hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent transition-colors"
                title="ISO View"
              >
                <Box size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent transition-colors"
                title="Front View"
              >
                <Grid3x3 size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent transition-colors"
                title="Top View"
              >
                <Eye size={14} />
              </button>
              <button
                className="p-1.5 rounded hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent transition-colors"
                title="Fit All"
              >
                <RotateCcw size={14} />
              </button>
              <div className="h-4 w-px bg-bim-border mx-1" />
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`p-1.5 rounded transition-colors ${
                  wireframe
                    ? "bg-bim-accent/20 text-bim-accent"
                    : "hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent"
                }`}
                title="Wireframe"
              >
                <Grid3x3 size={14} />
              </button>
              <button
                onClick={handleScreenshot}
                className="p-1.5 rounded hover:bg-bim-accent/20 text-slate-400 hover:text-bim-accent transition-colors"
                title="Screenshot"
              >
                <Camera size={14} />
              </button>
              <div className="h-4 w-px bg-bim-border mx-1" />
              <button
                onClick={() => {
                  setMeasureEnabled(!measureEnabled);
                  if (!measureEnabled) setRightTab("measure");
                }}
                className={`p-1.5 rounded transition-colors relative ${
                  measureEnabled
                    ? "bg-amber-500/20 text-amber-400"
                    : "hover:bg-amber-500/20 text-slate-400 hover:text-amber-400"
                }`}
                title={measureEnabled ? "关闭测量" : "开启测量"}
              >
                <Ruler size={14} />
                {measureLines.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-bim-bg text-[9px] font-mono flex items-center justify-center font-bold">
                    {measureLines.length}
                  </span>
                )}
              </button>
              {measureLines.length > 0 && (
                <button
                  onClick={() => clearMeasureLines()}
                  className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                  title="清空测量"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-bim-muted">
              <span className="flex items-center gap-1">
                <Triangle size={10} />
                {triangleCount.toLocaleString()} tris
              </span>
              <span>{fps} FPS</span>
            </div>
          </div>
        </div>

        {rightPanel && (
          <div className="w-[300px] border-l border-bim-border flex flex-col flex-shrink-0 bg-bim-surface/30">
            <div className="flex border-b border-bim-border">
              <button
                onClick={() => setRightTab("properties")}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors ${
                  rightTab === "properties"
                    ? "text-bim-accent border-b-2 border-bim-accent"
                    : "text-bim-muted hover:text-slate-300"
                }`}
              >
                Properties
              </button>
              <button
                onClick={() => setRightTab("clash")}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors ${
                  rightTab === "clash"
                    ? "text-bim-accent border-b-2 border-bim-accent"
                    : "text-bim-muted hover:text-slate-300"
                }`}
              >
                Clash
              </button>
              <button
                onClick={() => setRightTab("measure")}
                className={`flex-1 px-3 py-2 text-xs font-mono transition-colors relative ${
                  rightTab === "measure"
                    ? "text-amber-400 border-b-2 border-amber-400"
                    : "text-bim-muted hover:text-slate-300"
                }`}
              >
                Measure
                {measureLines.length > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500/80 text-bim-bg text-[9px] font-mono flex items-center justify-center font-bold">
                    {measureLines.length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {rightTab === "properties" ? (
                <PropertyPanel />
              ) : rightTab === "clash" ? (
                <ClashPanel />
              ) : (
                <MeasurePanel />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
