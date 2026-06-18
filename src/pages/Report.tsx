import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

const severityConfig = {
  hard: { color: "bg-red-500/20 text-red-400", label: "Hard" },
  soft: { color: "bg-amber-500/20 text-amber-400", label: "Soft" },
  duplicate: { color: "bg-violet-500/20 text-violet-400", label: "Duplicate" },
};

const statusConfig = {
  new: { color: "bg-blue-500/20 text-blue-400", label: "New" },
  acknowledged: { color: "bg-amber-500/20 text-amber-400", label: "Acknowledged" },
  resolved: { color: "bg-emerald-500/20 text-emerald-400", label: "Resolved" },
};

export default function Report() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const currentProject = useProjectStore((s) => s.currentProject);
  const clashResults = useProjectStore((s) => s.clashResults);
  const clashStatus = useProjectStore((s) => s.clashStatus);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const runClashDetection = useProjectStore((s) => s.runClashDetection);

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!projectId) return;
    fetchProject(projectId);
    runClashDetection(projectId, ["hvac", "plumbing", "electrical"], ["structural"], 0.01);
  }, [projectId, fetchProject, runClashDetection]);

  const filtered = clashResults.filter((c) => {
    if (severityFilter !== "all" && c.severity !== severityFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const hardCount = clashResults.filter((c) => c.severity === "hard").length;
  const softCount = clashResults.filter((c) => c.severity === "soft").length;
  const dupCount = clashResults.filter((c) => c.severity === "duplicate").length;

  const exportCSV = useCallback(() => {
    const headers = ["ID", "Component A", "Component B", "Distance", "Severity", "Status"];
    const rows = filtered.map((c) => [
      c.id,
      c.componentA.name || c.componentA.type,
      c.componentB.name || c.componentB.type,
      c.distance.toFixed(6),
      c.severity,
      c.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clash-report-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, projectId]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clash-report-${projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, projectId]);

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-bim-bg flex items-center justify-center">
        <div className="text-bim-muted font-mono text-sm">Loading report...</div>
      </div>
    );
  }

  const isLoading = clashStatus === "running" || clashStatus === "idle";

  return (
    <div className="min-h-screen bg-bim-bg">
      <header className="border-b border-bim-border bg-bim-surface/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded hover:bg-bim-surface text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-mono text-white">
            Clash Report — {currentProject.name}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-bim-border bg-bim-surface p-4">
            <div className="text-xs font-mono text-bim-muted mb-1">Total Clashes</div>
            <div className="text-2xl font-mono text-white">{clashResults.length}</div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="text-xs font-mono text-red-400 mb-1">Hard Clashes</div>
            <div className="text-2xl font-mono text-red-400">{hardCount}</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs font-mono text-amber-400 mb-1">Soft Clashes</div>
            <div className="text-2xl font-mono text-amber-400">{softCount}</div>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="text-xs font-mono text-violet-400 mb-1">Duplicate</div>
            <div className="text-2xl font-mono text-violet-400">{dupCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-bim-border bg-bim-surface overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-bim-border flex-wrap">
            <Filter size={14} className="text-bim-muted" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs font-mono px-2 py-1 rounded bg-bim-bg border border-bim-border text-slate-300 focus:border-bim-accent focus:outline-none"
            >
              <option value="all">All Severity</option>
              <option value="hard">Hard</option>
              <option value="soft">Soft</option>
              <option value="duplicate">Duplicate</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-mono px-2 py-1 rounded bg-bim-bg border border-bim-border text-slate-300 focus:border-bim-accent focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
            <div className="flex-1" />
            <button
              onClick={exportCSV}
              className="text-xs font-mono px-3 py-1.5 rounded bg-bim-bg border border-bim-border hover:border-bim-accent/40 text-slate-300 hover:text-bim-accent transition-colors flex items-center gap-1.5"
            >
              <Download size={12} /> Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="text-xs font-mono px-3 py-1.5 rounded bg-bim-bg border border-bim-border hover:border-bim-accent/40 text-slate-300 hover:text-bim-accent transition-colors flex items-center gap-1.5"
            >
              <Download size={12} /> Export JSON
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bim-border bg-bim-bg/50">
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    ID
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    Component A
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    Component B
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    Distance
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    Severity
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-mono text-bim-muted font-normal">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((clash) => (
                  <tr
                    key={clash.id}
                    className="border-b border-bim-border/50 hover:bg-bim-accent/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/review/${projectId}`)}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-bim-muted">
                      {clash.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs truncate max-w-[200px]">
                      {clash.componentA.name || clash.componentA.type}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs truncate max-w-[200px]">
                      {clash.componentB.name || clash.componentB.type}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-300">
                      {clash.distance.toFixed(4)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${severityConfig[clash.severity].color}`}
                      >
                        {severityConfig[clash.severity].label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusConfig[clash.status].color}`}
                      >
                        {statusConfig[clash.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
                {isLoading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-bim-muted font-mono text-sm"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-bim-accent animate-pulse" />
                        Running clash detection...
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-bim-muted font-mono text-sm"
                    >
                      No clash results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
