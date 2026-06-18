import { useState, useCallback } from "react";
import { Play, MapPin, AlertTriangle, AlertCircle, Copy } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import type { ClashRequest } from "@/types";

const categories = [
  { key: "structural", label: "Structural" },
  { key: "hvac", label: "HVAC" },
  { key: "plumbing", label: "Plumbing" },
  { key: "electrical", label: "Electrical" },
];

const severityConfig = {
  hard: { color: "bg-red-500", text: "text-red-400", label: "Hard" },
  soft: { color: "bg-amber-500", text: "text-amber-400", label: "Soft" },
  duplicate: { color: "bg-violet-500", text: "text-violet-400", label: "Duplicate" },
};

export default function ClashPanel() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const clashStatus = useProjectStore((s) => s.clashStatus);
  const clashResults = useProjectStore((s) => s.clashResults);
  const runClashDetection = useProjectStore((s) => s.runClashDetection);
  const focusComponent = useProjectStore((s) => s.focusComponent);

  const [categoryA, setCategoryA] = useState<string[]>(["structural"]);
  const [categoryB, setCategoryB] = useState<string[]>(["hvac"]);
  const [tolerance, setTolerance] = useState(0.01);

  const toggleInArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];

  const handleRun = useCallback(() => {
    if (!currentProject) return;
    const request: ClashRequest = { categoryA, categoryB, tolerance };
    runClashDetection(currentProject.id, request);
  }, [currentProject, categoryA, categoryB, tolerance, runClashDetection]);

  const handleLocate = useCallback(
    (expressId: number) => {
      focusComponent(expressId);
    },
    [focusComponent]
  );

  const hardCount = clashResults.filter((c) => c.severity === "hard").length;
  const softCount = clashResults.filter((c) => c.severity === "soft").length;
  const dupCount = clashResults.filter((c) => c.severity === "duplicate").length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3 border-b border-bim-border">
        <div>
          <label className="text-xs font-mono text-bim-muted mb-1.5 block">
            Category A
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <label
                key={cat.key}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                  categoryA.includes(cat.key)
                    ? "bg-bim-accent/20 text-bim-accent border border-bim-accent/40"
                    : "bg-bim-surface text-slate-400 border border-bim-border hover:border-bim-accent/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={categoryA.includes(cat.key)}
                  onChange={() => setCategoryA(toggleInArray(categoryA, cat.key))}
                  className="sr-only"
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-bim-muted mb-1.5 block">
            Category B
          </label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <label
                key={cat.key}
                className={`text-xs px-2 py-1 rounded cursor-pointer transition-colors ${
                  categoryB.includes(cat.key)
                    ? "bg-bim-accent/20 text-bim-accent border border-bim-accent/40"
                    : "bg-bim-surface text-slate-400 border border-bim-border hover:border-bim-accent/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={categoryB.includes(cat.key)}
                  onChange={() => setCategoryB(toggleInArray(categoryB, cat.key))}
                  className="sr-only"
                />
                {cat.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-bim-muted mb-1.5 block">
            Tolerance: {tolerance.toFixed(3)}
          </label>
          <input
            type="range"
            min={0.001}
            max={0.1}
            step={0.001}
            value={tolerance}
            onChange={(e) => setTolerance(parseFloat(e.target.value))}
            className="w-full h-1 bg-bim-border rounded-lg appearance-none cursor-pointer accent-bim-accent"
          />
          <div className="flex justify-between text-[10px] text-bim-muted mt-0.5">
            <span>0.001</span>
            <span>0.1</span>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={clashStatus === "running" || !currentProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded bg-bim-accent hover:bg-bim-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-mono transition-colors"
        >
          {clashStatus === "running" ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play size={14} />
              Run Detection
            </>
          )}
        </button>

        {clashStatus === "running" && (
          <div className="w-full bg-bim-surface rounded-full h-1.5 overflow-hidden">
            <div className="bg-bim-accent h-full rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        )}
      </div>

      {clashResults.length > 0 && (
        <div className="p-3 border-b border-bim-border">
          <div className="flex gap-3 text-xs font-mono">
            <span className="text-red-400">{hardCount} Hard</span>
            <span className="text-amber-400">{softCount} Soft</span>
            <span className="text-violet-400">{dupCount} Dup</span>
            <span className="text-slate-400">Total: {clashResults.length}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {clashResults.map((clash) => {
          const sev = severityConfig[clash.severity];
          return (
            <div
              key={clash.id}
              className="p-2 rounded bg-bim-surface/60 border border-bim-border hover:border-bim-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.color}`}
                />
                <span className={`text-xs font-mono ${sev.text}`}>
                  {sev.label}
                </span>
                <span className="text-[10px] text-bim-muted ml-auto">
                  d={clash.distance.toFixed(4)}
                </span>
              </div>
              <div className="text-xs text-slate-300 truncate">
                A: {clash.componentA.name || clash.componentA.type}
              </div>
              <div className="text-xs text-slate-300 truncate">
                B: {clash.componentB.name || clash.componentB.type}
              </div>
              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={() => handleLocate(clash.componentA.expressId)}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bim-surface hover:bg-bim-accent/20 text-slate-400 transition-colors"
                >
                  <MapPin size={10} /> A
                </button>
                <button
                  onClick={() => handleLocate(clash.componentB.expressId)}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-bim-surface hover:bg-bim-accent/20 text-slate-400 transition-colors"
                >
                  <MapPin size={10} /> B
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
