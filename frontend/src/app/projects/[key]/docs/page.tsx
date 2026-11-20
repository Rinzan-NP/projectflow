"use client";

import React, { useState, useEffect, use } from "react";
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
  Calendar,
  User,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/shared/Avatar";
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

interface ProjectDocument {
  id: string;
  projectId: string;
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
    return <FileImage className="h-5 w-5 text-pink-500" />;
  }
  if (mimeType?.startsWith("audio/") || ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext || "")) {
    return <FileAudio className="h-5 w-5 text-purple-500" />;
  }
  if (["pdf"].includes(ext || "")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (["csv", "xlsx", "xls"].includes(ext || "")) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (["js", "ts", "tsx", "json", "yaml", "yml", "html", "css"].includes(ext || "")) {
    return <FileCode className="h-5 w-5 text-amber-500" />;
  }
  if (["zip", "tar", "gz", "rar"].includes(ext || "")) {
    return <FileArchive className="h-5 w-5 text-orange-500" />;
  }
  return <FileText className="h-5 w-5 text-indigo-500" />;
}

export default function ProjectDocsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ProjectDocument | null>(null);

  // Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("PRD");
  const [docDescription, setDocDescription] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docAuthor, setDocAuthor] = useState("Alex Rivers");
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectKey}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectKey]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !docTitle.trim()) return;

    try {
      setSubmitting(true);
      const formData = new FormData();
      if (uploadFile) {
        formData.append("file", uploadFile);
      }
      formData.append("title", docTitle.trim() || (uploadFile ? uploadFile.name : "Untitled"));
      formData.append("category", docCategory);
      if (docDescription) formData.append("description", docDescription.trim());
      formData.append("author", docAuthor.trim() || "Alex Rivers");

      const res = await fetch(`/api/projects/${projectKey}/documents`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setShowUploadModal(false);
        resetForm();
        fetchDocuments();
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNoteCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/projects/${projectKey}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle.trim(),
          category: docCategory,
          description: docDescription.trim() || null,
          content: docContent.trim() || null,
          author: docAuthor.trim() || "Alex Rivers",
        }),
      });

      if (res.ok) {
        setShowNoteModal(false);
        resetForm();
        fetchDocuments();
      }
    } catch (err) {
      console.error("Create note failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/projects/${projectKey}/documents/${docId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        if (previewDoc?.id === docId) setPreviewDoc(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const resetForm = () => {
    setUploadFile(null);
    setDocTitle("");
    setDocCategory("PRD");
    setDocDescription("");
    setDocContent("");
    setDocAuthor("Alex Rivers");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadFile(file);
      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesCategory =
      selectedCategory === "All" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(search.toLowerCase())) ||
      (doc.fileName && doc.fileName.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Documents & Knowledge Base
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store Product Requirements Documents (PRDs), architecture specs, design assets, and team guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetForm();
              setDocCategory("Knowledge Base");
              setShowNoteModal(true);
            }}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            New Note / Doc
          </Button>

          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowUploadModal(true);
            }}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Controls: Search & Category Filter Pills */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const count =
              cat === "All"
                ? documents.length
                : documents.filter((d) => d.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-8 h-8 text-xs bg-card"
          />
        </div>
      </div>

      {/* Document Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl border bg-card/50 animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-card/30">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {search || selectedCategory !== "All"
              ? "No matching documents found"
              : "No project documents uploaded yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {search || selectedCategory !== "All"
              ? "Try clearing your search filters or selecting another category."
              : "Upload your PRD, technical specifications, or create a knowledge base article for this project."}
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resetForm();
                setShowNoteModal(true);
              }}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Note
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setShowUploadModal(true);
              }}
              className="h-8 text-xs gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload File
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isFile = !!doc.fileUrl;
            const categoryBadge =
              CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.General;

            return (
              <div
                key={doc.id}
                className="group flex flex-col justify-between rounded-xl border bg-card p-4 hover:shadow-sm hover:border-primary/40 transition-all text-left"
              >
                <div>
                  {/* Top Line: Category & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md border tracking-wider ${categoryBadge}`}
                    >
                      {doc.category}
                    </span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        title="View / Preview"
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {isFile && doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          download={doc.fileName || doc.title}
                          title="Download"
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Delete"
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Document Title & File Info */}
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="cursor-pointer flex items-start gap-2.5 mb-2"
                  >
                    <div className="p-2 rounded-lg bg-muted/60 shrink-0 mt-0.5">
                      {getFileIcon(doc.mimeType, doc.fileName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                        {doc.title}
                      </h4>
                      {doc.fileName && (
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {doc.fileName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description preview */}
                  {doc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {doc.description}
                    </p>
                  )}
                </div>

                {/* Bottom Footer: Author, Size, Date */}
                <div className="pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground mt-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={doc.author} size="sm" className="h-4 w-4 text-[9px]" />
                    <span className="truncate max-w-[100px]">{doc.author}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFile ? (
                      <span className="font-mono">{formatBytes(doc.fileSize)}</span>
                    ) : (
                      <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-medium">
                        Text Note
                      </span>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-lg rounded-xl border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Upload Project File (PRD / KB / Specs)
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-3.5">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : uploadFile
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setUploadFile(file);
                      if (!docTitle) setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1" />
                    <p className="text-xs font-semibold text-foreground">{uploadFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                    <p className="text-[10px] text-primary mt-1">Click to replace file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-xs font-medium text-foreground">
                      Click to choose file or drag and drop here
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      PDF, DOCX, Markdown, Sheets, Images, Audio, ZIP up to 50MB
                    </p>
                  </div>
                )}
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Document Title</label>
                  <Input
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Q3 Product Requirements"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full h-8 text-xs rounded-md border bg-card px-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="PRD">PRD</option>
                    <option value="Knowledge Base">Knowledge Base</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Design">Design</option>
                    <option value="Meeting Notes">Meeting Notes</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1 block">Description (Optional)</label>
                <Textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="Brief summary or context for the team..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Author */}
              <div>
                <label className="text-xs font-medium mb-1 block">Uploaded By</label>
                <Input
                  value={docAuthor}
                  onChange={(e) => setDocAuthor(e.target.value)}
                  placeholder="Your Name"
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || (!uploadFile && !docTitle.trim())}
                  className="h-8 text-xs"
                >
                  {submitting ? "Uploading..." : "Save Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Text Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-xl rounded-xl border shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Write Knowledge Base Article / PRD Note
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleNoteCreate} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Note Title</label>
                  <Input
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. Onboarding Architecture"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full h-8 text-xs rounded-md border bg-card px-2 text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Knowledge Base">Knowledge Base</option>
                    <option value="PRD">PRD</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Design">Design</option>
                    <option value="Meeting Notes">Meeting Notes</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Summary / Description</label>
                <Input
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  placeholder="One line summary..."
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Content (Markdown Supported)</label>
                <Textarea
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  placeholder="Write documentation, requirements, acceptance criteria, or technical details..."
                  rows={8}
                  className="text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNoteModal(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !docTitle.trim()}
                  className="h-8 text-xs"
                >
                  {submitting ? "Saving..." : "Create Document"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview / View Document Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-card w-full max-w-2xl max-h-[85vh] rounded-xl border shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  {getFileIcon(previewDoc.mimeType, previewDoc.fileName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{previewDoc.title}</h3>
                    <span
                      className={`text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded border ${
                        CATEGORY_COLORS[previewDoc.category] || CATEGORY_COLORS.General
                      }`}
                    >
                      {previewDoc.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    By {previewDoc.author} • {new Date(previewDoc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName || previewDoc.title}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {previewDoc.description && (
                <div className="bg-muted/40 p-3 rounded-lg border text-muted-foreground">
                  <p className="font-semibold text-foreground text-[11px] mb-0.5">Description</p>
                  {previewDoc.description}
                </div>
              )}

              {/* Render Image */}
              {previewDoc.mimeType?.startsWith("image/") && previewDoc.fileUrl && (
                <div className="flex justify-center border rounded-lg p-2 bg-muted/20">
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.title}
                    className="max-h-96 rounded object-contain"
                  />
                </div>
              )}

              {/* Render Audio */}
              {previewDoc.mimeType?.startsWith("audio/") && previewDoc.fileUrl && (
                <div className="p-4 border rounded-lg bg-muted/20 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-foreground">Audio Note</p>
                  <audio controls className="w-full" src={previewDoc.fileUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* Render Markdown / Text content */}
              {previewDoc.content && (
                <div className="border rounded-lg p-4 bg-muted/10">
                  <p className="font-semibold text-foreground text-xs mb-2">Document Content</p>
                  <div className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
                    {previewDoc.content}
                  </div>
                </div>
              )}

              {/* If it's a PDF or binary file */}
              {previewDoc.fileUrl && !previewDoc.mimeType?.startsWith("image/") && !previewDoc.mimeType?.startsWith("audio/") && (
                <div className="p-6 border rounded-lg bg-muted/30 text-center space-y-2">
                  <FileText className="h-10 w-10 text-primary mx-auto opacity-80" />
                  <p className="text-xs font-semibold text-foreground">{previewDoc.fileName}</p>
                  <p className="text-[11px] text-muted-foreground">{formatBytes(previewDoc.fileSize)}</p>
                  <a
                    href={previewDoc.fileUrl}
                    download={previewDoc.fileName || previewDoc.title}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 mt-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
