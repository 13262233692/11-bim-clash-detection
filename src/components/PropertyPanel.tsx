import { useProjectStore } from "@/store/useProjectStore";

const categoryColors: Record<string, string> = {
  structural: "bg-slate-500",
  hvac: "bg-blue-500",
  plumbing: "bg-cyan-500",
  electrical: "bg-amber-500",
  other: "bg-violet-500",
};

export default function PropertyPanel() {
  const selectedComponent = useProjectStore((s) => s.selectedComponent);

  if (!selectedComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-bim-muted">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-2 opacity-40"
        >
          <path d="M3 3h18v18H3z" />
          <path d="M9 3v18" />
          <path d="M15 3v18" />
          <path d="M3 9h18" />
          <path d="M3 15h18" />
        </svg>
        <span className="text-sm">Select a component</span>
      </div>
    );
  }

  const entries = Object.entries(selectedComponent.properties || {});

  return (
    <div className="overflow-y-auto h-full p-3 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${categoryColors[selectedComponent.category] || "bg-violet-500"}`}
          />
          <span className="text-xs font-mono text-bim-accent uppercase">
            {selectedComponent.category}
          </span>
        </div>
        <div>
          <div className="text-[10px] text-bim-muted font-mono">Name</div>
          <div className="text-sm text-slate-200">
            {selectedComponent.name || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-bim-muted font-mono">Type</div>
          <div className="text-sm text-slate-200">
            {selectedComponent.type || "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-bim-muted font-mono">Express ID</div>
          <div className="text-sm text-slate-200 font-mono">
            {selectedComponent.expressId}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-bim-muted font-mono">Material</div>
          <div className="text-sm text-slate-200">
            {selectedComponent.material || "—"}
          </div>
        </div>
      </div>

      {entries.length > 0 && (
        <div>
          <div className="text-xs font-mono text-bim-muted mb-2 border-t border-bim-border pt-2">
            Properties
          </div>
          <div className="space-y-1">
            {entries.map(([key, value]) => (
              <div
                key={key}
                className="flex justify-between items-start text-xs gap-2"
              >
                <span className="text-bim-muted font-mono truncate flex-shrink min-w-0">
                  {key}
                </span>
                <span className="text-slate-300 text-right font-mono truncate min-w-0">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
