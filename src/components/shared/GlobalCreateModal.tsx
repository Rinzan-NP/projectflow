"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bug,
  CheckSquare,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItemType, Priority, BugSeverity } from "@/lib/types";

interface GlobalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjectKey?: string;
  defaultStageId?: string;
  defaultType?: ItemType;
}

export function GlobalCreateModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectKey,
  defaultStageId,
  defaultType = "TASK",
}: GlobalCreateModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState("");
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemType>(defaultType);
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignee, setAssignee] = useState("Rinzan");
  const [severity, setSeverity] = useState<BugSeverity>("MAJOR");
  const [environment, setEnvironment] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");

  // Attached files state
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      fetch("/api/projects")
        .then((r) => r.json())
        .then((data) => {
          setProjects(data);
          if (data.length > 0) {
            const initialKey = defaultProjectKey || data[0].key;
            setSelectedProjectKey(initialKey);
            fetchStages(initialKey);
          }
        })
        .catch((err) => console.error("Failed to load projects:", err));
    }
  }, [isOpen, defaultProjectKey, defaultType]);

  const fetchStages = async (key: string) => {
    try {
      const res = await fetch(`/api/projects/${key}/stages`).then((r) => r.json());
      setStages(res);
      if (res.length > 0) {
        if (defaultStageId && res.some((s: any) => s.id === defaultStageId)) {
          setSelectedStageId(defaultStageId);
        } else {
          setSelectedStageId(res[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load stages:", err);
    }
  };

  const handleProjectChange = (key: string) => {
    setSelectedProjectKey(key);
    fetchStages(key);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStageId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create Work Item
      const res = await fetch(`/api/projects/${selectedProjectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          priority,
          stageId: selectedStageId,
          assignee: assignee || null,
          severity: type === "BUG" ? severity : null,
          environment: type === "BUG" && environment.trim() ? environment.trim() : null,
          stepsToReproduce:
            type === "BUG" && stepsToReproduce.trim() ? stepsToReproduce.trim() : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.error || "Failed to create item");
      }

      const createdItem = await res.json();

      // 2. Upload any attached files
      if (attachedFiles.length > 0 && createdItem.id) {
        for (const file of attachedFiles) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("itemId", createdItem.id);
            await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
          } catch (uploadErr) {
            console.error("Failed to upload attached file:", uploadErr);
          }
        }
      }

      // Reset form
      setTitle("");
      setDescription("");
      setAttachedFiles([]);
      setEnvironment("");
      setStepsToReproduce("");
      onClose();
      if (onSuccess) onSuccess();
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const TYPE_OPTIONS = [
    { key: "TASK", label: "Task", icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30" },
    { key: "BUG", label: "Bug", icon: Bug, color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30" },
    { key: "FEATURE", label: "Feature", icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30" },
    { key: "IMPROVEMENT", label: "Improvement", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/30" },
    { key: "CHORE", label: "Chore", icon: Wrench, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/30" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-bold tracking-tight mb-1">
          {type === "BUG" ? "Report Bug" : type === "FEATURE" ? "Create Feature" : "Create Work Item"}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add a task, bug, or feature to any project workflow stage with file attachments.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Remodeled Item Type Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Item Type *
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setType(opt.key as ItemType)}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? `${opt.bg} ${opt.color} font-bold ring-1 ring-current`
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project & Stage Dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Project *
              </label>
              <select
                value={selectedProjectKey}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.name} [{p.company || "Company"}] ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Stage *
              </label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary font-medium"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.wipLimit ? `(Limit ${s.wipLimit})` : ""}
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
              placeholder={
                type === "BUG"
                  ? "e.g., Login fails when user email contains dot"
                  : type === "FEATURE"
                  ? "e.g., Support dark mode in client dashboard"
                  : "e.g., Refactor database connection pooling"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs"
              autoFocus
              required
            />
          </div>

          {/* Priority & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🔵 Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="">Unassigned</option>
                <option value="Rinzan">Rinzan</option>
                <option value="Sam Taylor">Sam Taylor</option>
                <option value="Jordan Lee">Jordan Lee</option>
                <option value="Morgan Chen">Morgan Chen</option>
              </select>
            </div>
          </div>

          {/* Bug specific fields */}
          {type === "BUG" && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-3">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                <Bug className="h-3.5 w-3.5" />
                <span>Bug Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="BLOCKER">🔥 Blocker</option>
                    <option value="MAJOR">⚠️ Major</option>
                    <option value="MINOR">⚡ Minor</option>
                    <option value="TRIVIAL">🔹 Trivial</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                    Environment
                  </label>
                  <Input
                    placeholder="e.g. iOS Safari / Production"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Steps to Reproduce
                </label>
                <Textarea
                  placeholder="1. Go to settings... 2. Click save..."
                  value={stepsToReproduce}
                  onChange={(e) => setStepsToReproduce(e.target.value)}
                  className="min-h-[50px] text-xs bg-background resize-none"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Description
            </label>
            <Textarea
              placeholder="Provide context, acceptance criteria, or details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[70px] text-xs resize-none"
            />
          </div>

          {/* File Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                <span>Attachments & Screenshots</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Files</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,audio/*,.pdf,.txt,.log,.json,.csv,.zip"
            />

            {attachedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/80 hover:border-primary/50 hover:bg-muted/30 rounded-lg p-3 text-center cursor-pointer transition-colors"
              >
                <p className="text-xs text-muted-foreground">
                  Click to attach screenshots, logs, or documents
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  Images, PDFs, logs, zip, or voice notes
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {attachedFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || !selectedStageId || loading}
              className="font-semibold"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <span>Create {type === "BUG" ? "Bug" : type === "FEATURE" ? "Feature" : "Item"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
