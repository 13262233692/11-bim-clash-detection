import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Trash2,
  Building2,
  ArrowRight,
  FolderOpen,
  Plus,
} from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";

const statusConfig = {
  uploading: { color: "bg-purple-500", text: "text-purple-400", label: "Uploading" },
  parsing: { color: "bg-amber-500", text: "text-amber-400", label: "Parsing" },
  ready: { color: "bg-emerald-500", text: "text-emerald-400", label: "Ready" },
  error: { color: "bg-red-500", text: "text-red-400", label: "Error" },
};

export default function Home() {
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const createDemoProject = useProjectStore((s) => s.createDemoProject);

  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      const name = uploadName || file.name.replace(/\.ifc$/i, "");
      setUploading(true);
      try {
        await createProject(name, file);
        setShowUpload(false);
        setUploadName("");
      } catch {
      } finally {
        setUploading(false);
      }
    },
    [uploadName, createProject]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await deleteProject(id);
    },
    [deleteProject]
  );

  const handleDemo = useCallback(async () => {
    try {
      const proj = await createDemoProject();
    } catch {}
  }, [createDemoProject]);

  return (
    <div className="min-h-screen bg-bim-bg">
      <header className="border-b border-bim-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-bim-accent flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-mono font-semibold text-white tracking-tight">
              BIM Clash Detection
            </h1>
          </div>
          <button
            onClick={handleDemo}
            className="text-sm px-4 py-2 rounded-lg bg-bim-surface border border-bim-border hover:border-bim-accent/50 text-slate-300 hover:text-bim-accent font-mono transition-colors"
          >
            Load Demo
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-mono text-slate-300">Projects</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project, index) => {
            const status = statusConfig[project.status];
            return (
              <div
                key={project.id}
                className="animate-card-fade-in group rounded-xl border border-bim-border bg-bim-surface hover:border-bim-accent/40 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-bim-accent/5"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="h-36 bg-bim-bg/50 flex items-center justify-center relative">
                  <Building2
                    size={40}
                    className="text-bim-border group-hover:text-bim-accent/40 transition-colors"
                  />
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${status.color}/20 ${status.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-mono text-sm text-white truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-bim-muted">
                    <span>{project.stats.componentCount} components</span>
                    <span>
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {project.ifcFileName && (
                    <div className="text-[10px] text-bim-muted truncate font-mono">
                      {project.ifcFileName}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {project.status === "ready" && (
                      <>
                        <button
                          onClick={() => navigate(`/review/${project.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-bim-accent hover:bg-bim-accent/80 text-white font-mono transition-colors"
                        >
                          <FolderOpen size={12} />
                          Open Review
                        </button>
                        <button
                          onClick={() => navigate(`/report/${project.id}`)}
                          className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-bim-surface border border-bim-border hover:border-bim-accent/40 text-slate-300 font-mono transition-colors"
                        >
                          <ArrowRight size={12} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="flex items-center justify-center text-xs px-2 py-1.5 rounded-lg bg-bim-surface border border-bim-border hover:border-bim-danger/40 hover:text-bim-danger text-slate-400 font-mono transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            onClick={() => setShowUpload(true)}
            className="animate-card-fade-in rounded-xl border-2 border-dashed border-bim-border hover:border-bim-accent/50 bg-bim-surface/30 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] group"
            style={{ animationDelay: `${projects.length * 80}ms` }}
          >
            <div className="w-12 h-12 rounded-full bg-bim-surface flex items-center justify-center mb-3 group-hover:bg-bim-accent/10 transition-colors">
              <Plus size={24} className="text-bim-muted group-hover:text-bim-accent transition-colors" />
            </div>
            <span className="text-sm font-mono text-bim-muted group-hover:text-bim-accent transition-colors">
              New Project
            </span>
          </div>
        </div>
      </main>

      {showUpload && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setShowUpload(false)}
        >
          <div
            className="w-full max-w-md bg-bim-surface rounded-xl border border-bim-border p-6 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-mono text-white mb-4">
              Upload IFC File
            </h3>

            <div className="mb-4">
              <label className="text-xs font-mono text-bim-muted mb-1 block">
                Project Name
              </label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Auto-detect from filename"
                className="w-full px-3 py-2 rounded-lg bg-bim-bg border border-bim-border text-sm text-white placeholder-bim-muted/50 focus:border-bim-accent focus:outline-none font-mono"
              />
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver
                  ? "border-bim-accent bg-bim-accent/5"
                  : "border-bim-border hover:border-bim-accent/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                size={32}
                className={`mx-auto mb-3 ${dragOver ? "text-bim-accent" : "text-bim-muted"}`}
              />
              <p className="text-sm text-slate-300 mb-1">
                Drag & drop your IFC file here
              </p>
              <p className="text-xs text-bim-muted">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowUpload(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bim-bg border border-bim-border text-sm text-slate-300 font-mono hover:border-bim-accent/40 transition-colors"
              >
                Cancel
              </button>
            </div>

            {uploading && (
              <div className="mt-3">
                <div className="w-full bg-bim-bg rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-bim-accent h-full rounded-full animate-pulse"
                    style={{ width: "50%" }}
                  />
                </div>
                <p className="text-xs text-bim-muted mt-1 text-center font-mono">
                  Uploading...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
