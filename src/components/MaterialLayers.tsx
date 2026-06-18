import { useProjectStore } from "@/store/useProjectStore";

const categoryColors: Record<string, string> = {
  structural: "#64748b",
  hvac: "#3b82f6",
  plumbing: "#06b6d4",
  electrical: "#f59e0b",
  other: "#8b5cf6",
};

export default function MaterialLayers() {
  const materials = useProjectStore((s) => s.materials);
  const visibleCategories = useProjectStore((s) => s.visibleCategories);
  const toggleCategory = useProjectStore((s) => s.toggleCategory);

  const showAll = () => {
    const store = useProjectStore.getState();
    store.visibleCategories = {
      structural: true,
      hvac: true,
      plumbing: true,
      electrical: true,
      other: true,
    };
    useProjectStore.setState({ visibleCategories: { ...store.visibleCategories } });
  };

  const hideAll = () => {
    useProjectStore.setState({
      visibleCategories: {
        structural: false,
        hvac: false,
        plumbing: false,
        electrical: false,
        other: false,
      },
    });
  };

  const isolateCategory = (category: string) => {
    useProjectStore.setState({
      visibleCategories: {
        structural: false,
        hvac: false,
        plumbing: false,
        electrical: false,
        other: false,
        [category]: true,
      },
    });
  };

  const categoryBuckets = materials.reduce(
    (acc, mat) => {
      const cat = mat.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(mat);
      return acc;
    },
    {} as Record<string, typeof materials>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-3 py-2 border-b border-bim-border">
        <button
          onClick={showAll}
          className="text-xs px-2 py-1 rounded bg-bim-surface hover:bg-bim-accent/20 text-slate-300 transition-colors"
        >
          Show All
        </button>
        <button
          onClick={hideAll}
          className="text-xs px-2 py-1 rounded bg-bim-surface hover:bg-bim-accent/20 text-slate-300 transition-colors"
        >
          Hide All
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {Object.entries(categoryBuckets).map(([category, mats]) => (
          <div key={category}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: categoryColors[category] || "#8b5cf6" }}
              />
              <span className="text-xs font-mono text-slate-400 uppercase flex-1">
                {category}
              </span>
              <span className="text-xs text-bim-muted">{mats.length}</span>
              <button
                onClick={() => isolateCategory(category)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-bim-surface hover:bg-bim-accent/20 text-slate-400 transition-colors"
              >
                Isolate
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCategories[category] !== false}
                  onChange={() => toggleCategory(category)}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-bim-border rounded-full peer peer-checked:bg-bim-accent after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-200 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {mats.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-2 px-2 py-1 ml-3 rounded hover:bg-bim-surface/60 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: mat.color }}
                />
                <span className="text-xs text-slate-300 truncate flex-1">
                  {mat.name}
                </span>
                <span className="text-[10px] text-bim-muted">
                  {mat.opacity < 1 ? `${Math.round(mat.opacity * 100)}%` : ""}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
