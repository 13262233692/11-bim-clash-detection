import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Square, Wind, Droplets, Zap, Box } from "lucide-react";
import type { IFCComponent } from "@/types";
import { useProjectStore } from "@/store/useProjectStore";

const categoryIcons: Record<string, React.ReactNode> = {
  structural: <Square size={14} />,
  hvac: <Wind size={14} />,
  plumbing: <Droplets size={14} />,
  electrical: <Zap size={14} />,
  other: <Box size={14} />,
};

const categoryColors: Record<string, string> = {
  structural: "text-slate-400",
  hvac: "text-blue-400",
  plumbing: "text-cyan-400",
  electrical: "text-amber-400",
  other: "text-violet-400",
};

interface TreeNodeProps {
  node: IFCComponent;
  depth: number;
  defaultExpanded?: boolean;
}

function TreeNode({ node, depth, defaultExpanded = false }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const selectComponent = useProjectStore((s) => s.selectComponent);
  const selectedComponent = useProjectStore((s) => s.selectedComponent);
  const focusComponent = useProjectStore((s) => s.focusComponent);
  const visibleCategories = useProjectStore((s) => s.visibleCategories);
  const toggleCategory = useProjectStore((s) => s.toggleCategory);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedComponent?.expressId === node.expressId;
  const isVisible = visibleCategories[node.category] !== false;

  const handleSelect = useCallback(() => {
    selectComponent(node);
    focusComponent(node.expressId);
  }, [node, selectComponent, focusComponent]);

  const handleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleCategory(node.category);
    },
    [node.category, toggleCategory]
  );

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded text-sm transition-colors ${
          isSelected
            ? "bg-bim-accent/20 text-bim-accent"
            : "hover:bg-bim-surface text-slate-300"
        } ${!isVisible ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:text-bim-accent transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5 flex-shrink-0" />
        )}
        <span className={`flex-shrink-0 ${categoryColors[node.category] || "text-slate-400"}`}>
          {categoryIcons[node.category] || categoryIcons.other}
        </span>
        <span className="truncate flex-1 font-mono text-xs">{node.name || node.type}</span>
        <button
          onClick={handleVisibility}
          className={`w-3 h-3 rounded-sm border flex-shrink-0 transition-colors ${
            isVisible
              ? "bg-bim-accent border-bim-accent"
              : "border-bim-border bg-transparent"
          }`}
        />
      </div>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode
            key={child.expressId}
            node={child}
            depth={depth + 1}
            defaultExpanded={depth < 1}
          />
        ))}
    </div>
  );
}

export default function ModelTree() {
  const modelTree = useProjectStore((s) => s.modelTree);

  if (!modelTree || modelTree.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-bim-muted text-sm">
        No model loaded
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full custom-scrollbar">
      {modelTree.map((root) => (
        <TreeNode key={root.expressId} node={root} depth={0} defaultExpanded />
      ))}
    </div>
  );
}
