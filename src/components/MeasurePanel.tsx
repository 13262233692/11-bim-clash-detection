import { useProjectStore } from "@/store/useProjectStore";
import { Ruler, Trash2, X, Info } from "lucide-react";

export default function MeasurePanel() {
  const measureEnabled = useProjectStore((s) => s.measureEnabled);
  const measureMode = useProjectStore((s) => s.measureMode);
  const measureLines = useProjectStore((s) => s.measureLines);
  const setMeasureEnabled = useProjectStore((s) => s.setMeasureEnabled);
  const removeMeasureLine = useProjectStore((s) => s.removeMeasureLine);
  const clearMeasureLines = useProjectStore((s) => s.clearMeasureLines);
  const resetMeasure = useProjectStore((s) => s.resetMeasure);

  const modeLabels: Record<string, string> = {
    idle: "就绪",
    point1: "选择起点",
    dragging: "拖拽中...",
    completed: "测量完成",
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-bim-border space-y-2">
        <button
          onClick={() => setMeasureEnabled(!measureEnabled)}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-mono transition-colors ${
            measureEnabled
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-bim-accent/20 text-bim-accent hover:bg-bim-accent/30"
          }`}
        >
          <Ruler size={14} />
          {measureEnabled ? "关闭测量" : "开启测量"}
        </button>

        {measureEnabled && (
          <div className="text-[10px] font-mono space-y-1">
            <div className="flex items-center justify-between text-bim-muted">
              <span>状态:</span>
              <span className={
                measureMode === "dragging" ? "text-amber-400" :
                measureMode === "completed" ? "text-emerald-400" :
                "text-bim-accent"
              }>{modeLabels[measureMode]}</span>
            </div>
            <div className="text-bim-muted/70 leading-relaxed px-1 py-1 bg-bim-surface/50 rounded">
              <p>• 左键点击选择起点</p>
              <p>• 拖拽到终点松开</p>
              <p>• ESC 或右键取消</p>
            </div>
          </div>
        )}
      </div>

      {measureEnabled && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-bim-border">
          <span className="text-[11px] font-mono text-bim-muted">
            测量记录 ({measureLines.length})
          </span>
          <div className="flex items-center gap-1">
            {measureMode !== "idle" && (
              <button
                onClick={() => resetMeasure()}
                className="p-1 rounded hover:bg-bim-surface text-slate-400 hover:text-white transition-colors"
                title="取消当前测量"
              >
                <X size={12} />
              </button>
            )}
            {measureLines.length > 0 && (
              <button
                onClick={() => clearMeasureLines()}
                className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                title="清空所有测量"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {measureLines.length === 0 && measureEnabled && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Info size={24} className="text-bim-muted/40 mb-2" />
            <p className="text-[11px] font-mono text-bim-muted/60">
              暂无测量记录
            </p>
            <p className="text-[10px] font-mono text-bim-muted/40 mt-1">
              在三维视口中拖拽以测量距离
            </p>
          </div>
        )}

        {measureLines.map((line, idx) => (
          <div
            key={line.id}
            className="p-2.5 rounded bg-bim-surface/50 border border-bim-border/50 hover:border-bim-accent/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-bim-accent">
                #{idx + 1} 测量记录
              </span>
              <button
                onClick={() => removeMeasureLine(line.id)}
                className="p-0.5 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={10} />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-bim-muted/80">
                  空间距离
                </span>
                <span className="text-sm font-mono text-amber-400 font-bold">
                  {(line.distance * 1000).toFixed(0)} mm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-bim-muted/80">
                  水平距离
                </span>
                <span className="text-xs font-mono text-blue-400">
                  {(line.horizontalDistance * 1000).toFixed(0)} mm
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-bim-muted/80">
                  净空高度
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {(line.verticalDistance * 1000).toFixed(0)} mm
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-bim-border/30 grid grid-cols-2 gap-1">
              <div className="text-[9px] font-mono text-bim-muted/60">
                <p className="text-bim-muted/40 mb-0.5">起点 XYZ</p>
                <p className="truncate">
                  {line.start.position.map(p => p.toFixed(2)).join(", ")}
                </p>
              </div>
              <div className="text-[9px] font-mono text-bim-muted/60">
                <p className="text-bim-muted/40 mb-0.5">终点 XYZ</p>
                <p className="truncate">
                  {line.end.position.map(p => p.toFixed(2)).join(", ")}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
