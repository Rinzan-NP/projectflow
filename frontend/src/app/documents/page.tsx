"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Upload,
  Plus,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileImage,
  FileAudio,
  FileArchive,
  File,
  X,
  BookOpen,
  FolderOpen,
  Building2,
  FolderKanban,
  Calendar,
  User,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  "All",
  "PRD",
  "Knowledge Base",
  "Architecture",
  "Design",
  "Meeting Notes",
  "General",
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_COLORS: Record<string, string> = {
  PRD: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  "Knowledge Base": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Architecture: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Design: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-800",
  "Meeting Notes": "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  General: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
};

interface CompanyDocument {
  id: string;
  projectId: string | null;
  company: string | null;
  projectName?: string | null;
  projectKey?: string | null;
  projectColor?: string | null;
  title: string;
  description: string | null;
  category: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  content: string | null;
  author: string;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string | null, fileName: string | null) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (mimeType?.startsWith("image/") || ["png", "jpg", "jpeg", "svg", "webp"].includes(ext || "")) {
    return <FileImage className="h-5 w-5 text-pink-500 shrink-0" />;
  }
  if (mimeType?.startsWith("audio/") || ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext || "")) {
    return <FileAudio className="h-5 w-5 text-purple-500 shrink-0" />;
  }
  if (["pdf"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-red-500 shrink-0" />;
  }
  if (["csv", "xlsx", "xls"].includes(ext || "")) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500 shrink-0" />;
  }
  if (["js", "ts", "tsx", "json", "yaml", "yml", "html", "css"].includes(ext || "")) {
    return <FileCode className="h-5 w-5 text-amber-500 shrink-0" />;
  }
  if (["zip", "tar", "gz", "rar"].includes(ext || "")) {
    return <FileArchive className="h-5 w-5 text-orange-500 shrink-0" />;
  }
  return <FileText className="h-5 w-5 text-indigo-500 shrink-0" />;
}

export default function CompanyDocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedProject, setSelectedProject] = useState<string>("ALL"); // "ALL", "NO_PROJECT", or project key
  const [search, setSearch] = useState("");

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState<"file" | "note">("file");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("General");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadTargetProject, setUploadTargetProject] = useState("NONE"); // "NONE" = company document
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveCompany = user?.company && user.company !== "ALL" ? user.company : selectedCompany;

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (effectiveCompany !== "ALL") params.set("company", effectiveCompany);
      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, [effectiveCompany]);

  // Allowed projects based on auth company
  const visibleProjects = useMemo(() => {
    if (user?.company && user.company !== "ALL") {
      return projects.filter((p) => p.company === user.company);
    }
    if (selectedCompany !== "ALL") {
      return projects.filter((p) => p.company === selectedCompany);
    }
    return projects;
  }, [projects, user?.company, selectedCompany]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== "All" && doc.category !== selectedCategory) return false;

      // Project filter
      if (selectedProject === "NO_PROJECT") {
        if (doc.projectId) return false;
      } else if (selectedProject !== "ALL") {
        if (doc.projectKey?.toUpperCase() !== selectedProject.toUpperCase()) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesDesc = doc.description?.toLowerCase().includes(q) ?? false;
        const matchesFile = doc.fileName?.toLowerCase().includes(q) ?? false;
        const matchesAuthor = doc.author.toLowerCase().includes(q);
        const matchesProject = doc.projectName?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesFile && !matchesAuthor && !matchesProject) return false;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedProject, search]);

  // Handle Create / Upload Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    try {
      setIsSubmitting(true);

      const targetCompany =
        user?.company && user.company !== "ALL"
          ? user.company
          : selectedCompany !== "ALL"
          ? selectedCompany
          : "General";

      if (uploadMode === "file" && uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("title", uploadTitle.trim());
        formData.append("category", uploadCategory);
        if (uploadDescription.trim()) formData.append("description", uploadDescription.trim());
        formData.append("author", user?.name || "Rinzan");
        formData.append("company", targetCompany);
        if (uploadTargetProject !== "NONE") {
          formData.append("projectId", uploadTargetProject);
        }

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: uploadTitle.trim(),
            category: uploadCategory,
            description: uploadDescription.trim() || null,
            content: uploadContent.trim() || null,
            author: user?.name || "Rinzan",
            company: targetCompany,
            projectId: uploadTargetProject === "NONE" ? null : uploadTargetProject,
          }),
        });

        if (!res.ok) throw new Error("Creation failed");
      }

      // Reset and refresh
      setUploadTitle("");
      setUploadDescription("");
      setUploadContent("");
      setUploadFile(null);
      setUploadTargetProject("NONE");
      setIsUploadOpen(false);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      alert("Failed to save document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (previewDoc?.id === id) setPreviewDoc(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Company Documents
            </h1>
            {effectiveCompany !== "ALL" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                {effectiveCompany}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Central repository for company knowledge base, PRDs, contracts, architecture guides, and shared files.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Admin Company Selector */}
          {user?.company === "ALL" && (
            <div className="flex items-center gap-1.5 bg-muted/60 border rounded-lg px-2.5 py-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent font-semibold text-foreground cursor-pointer outline-none"
              >
                <option value="ALL">All Companies</option>
                <option value="Solinify">Solinify</option>
                <option value="Gingr">Gingr</option>
              </select>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 shadow-xs cursor-pointer font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Document</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 rounded-xl border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Documents
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{documents.length}</p>
        </div>
        <div className="p-3.5 rounded-xl border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            🏢 Company-wide
          </p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {documents.filter((d) => !d.projectId).length}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            📁 Project Linked
          </p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {documents.filter((d) => d.projectId).length}
          </p>
        </div>
        <div className="p-3.5 rounded-xl border bg-card/60 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Knowledge Articles
          </p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {documents.filter((d) => d.category === "Knowledge Base" || d.content).length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-muted/60 border rounded-lg px-2.5 py-1.5 text-xs">
            <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent font-semibold text-foreground cursor-pointer outline-none"
            >
              <option value="ALL">All Documents (Company + Projects)</option>
              <option value="NO_PROJECT">🏢 Company-wide Only (No Project)</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.key}>
                  📁 {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by title, description, file..."
              className="pl-8 h-8 text-xs bg-muted/20"
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
          Loading documents...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-xl bg-card/30 text-center p-6 space-y-3">
          <FileText className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="font-bold text-sm text-foreground">No documents found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search || selectedCategory !== "All" || selectedProject !== "ALL"
              ? "No documents match your active filters. Try adjusting your query or category."
              : "Upload company PRDs, architecture notes, brand assets, or meeting documentation to get started."}
          </p>
          <Button size="sm" onClick={() => setIsUploadOpen(true)} className="gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add First Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setPreviewDoc(doc)}
              className="group relative flex flex-col justify-between p-4 rounded-xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-muted border shrink-0">
                      {getFileIcon(doc.mimeType, doc.fileName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                        {doc.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {doc.fileName || (doc.content ? "Markdown Article" : "Note")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      CATEGORY_COLORS[doc.category] || CATEGORY_COLORS["General"]
                    }`}
                  >
                    {doc.category}
                  </span>
                </div>

                {doc.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {doc.description}
                  </p>
                )}
              </div>

              {/* Bottom metadata & Scope badge */}
              <div className="pt-2 border-t flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                {/* Scope Badge */}
                {doc.projectId && doc.projectName ? (
                  <div
                    className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[10px] border truncate max-w-[140px]"
                    style={{
                      backgroundColor: `${doc.projectColor || "#3b82f6"}15`,
                      color: doc.projectColor || "#3b82f6",
                      borderColor: `${doc.projectColor || "#3b82f6"}30`,
                    }}
                    title={`Project: ${doc.projectName} (${doc.projectKey})`}
                  >
                    <FolderKanban className="h-3 w-3 shrink-0" />
                    <span className="truncate">{doc.projectName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[10px] bg-primary/10 text-primary border border-primary/20 truncate">
                    <Building2 className="h-3 w-3 shrink-0" />
                    <span>{doc.company || effectiveCompany}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  <Avatar name={doc.author} size="xs" />
                  <span className="text-[10px] truncate max-w-[80px]">{doc.author}</span>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-[10px]">{formatBytes(doc.fileSize)}</span>
                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1 cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in-0">
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden text-card-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-muted border shrink-0">
                  {getFileIcon(previewDoc.mimeType, previewDoc.fileName)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">{previewDoc.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{previewDoc.category}</span>
                    <span>•</span>
                    <span>
                      {previewDoc.projectId
                        ? `Project: ${previewDoc.projectName || previewDoc.projectKey}`
                        : `Company: ${previewDoc.company || effectiveCompany}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(previewDoc.fileUrl!, "_blank")}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed">
              {previewDoc.description && (
                <div className="p-3 rounded-lg bg-muted/30 border space-y-1">
                  <p className="font-semibold text-muted-foreground text-[11px]">Description / Context</p>
                  <p className="text-foreground whitespace-pre-wrap">{previewDoc.description}</p>
                </div>
              )}

              {previewDoc.content && (
                <div className="space-y-2">
                  <p className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                    Content / Notes
                  </p>
                  <div className="p-4 rounded-lg border bg-background font-mono text-[11px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {previewDoc.content}
                  </div>
                </div>
              )}

              {previewDoc.fileUrl && previewDoc.mimeType?.startsWith("image/") && (
                <div className="rounded-lg border overflow-hidden bg-black/5 flex items-center justify-center p-2">
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.title}
                    className="max-h-96 object-contain rounded"
                  />
                </div>
              )}

              <div className="pt-4 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  <span>Author: {previewDoc.author}</span>
                </div>
                <span>Created {formatDistanceToNow(new Date(previewDoc.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload / Create Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in-0">
          <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl flex flex-col overflow-hidden text-card-foreground">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Add Document</h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  uploadMode === "file"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Upload File (PDF, Image, Doc)
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("note")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  uploadMode === "note"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Write Note / Markdown
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDocument} className="p-6 space-y-4 text-xs">
              {/* Scope & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Scope / Association *
                  </label>
                  <select
                    value={uploadTargetProject}
                    onChange={(e) => setUploadTargetProject(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="NONE">
                      🏢 Company Document ({effectiveCompany})
                    </option>
                    {visibleProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        📁 Project: {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Category *
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary font-medium"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Title *
                </label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Master Service Agreement, Q4 Product PRD..."
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Description / Notes (Optional)
                </label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief context or summary of this document..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* File Upload Box */}
              {uploadMode === "file" ? (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    File *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setUploadFile(f);
                        if (!uploadTitle.trim()) {
                          setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors bg-muted/10"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    {uploadFile ? (
                      <div className="text-center">
                        <p className="font-semibold text-foreground text-xs">{uploadFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-semibold text-foreground text-xs">Click to browse or drop file</p>
                        <p className="text-[10px] text-muted-foreground">PDF, Docs, Sheets, Images, Archives</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Document Content (Markdown Supported) *
                  </label>
                  <Textarea
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    placeholder="# Meeting Notes or Knowledge Base Article..."
                    rows={6}
                    className="font-mono text-xs"
                    required
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !uploadTitle.trim() || (uploadMode === "file" && !uploadFile)}
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
