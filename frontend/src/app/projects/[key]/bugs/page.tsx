"use client";

import React, { useState, useEffect, use, useMemo, useRef } from "react";
import {
  Bug,
  Plus,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Upload,
  FileText,
  Trash2,
  CheckSquare,
  Sparkles,
  X,
} from "lucide-react";
import { ItemWithRelations, Stage, BugSeverity, BugSource, ItemType } from "@/lib/types";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { Avatar } from "@/components/shared/Avatar";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function BugTrackerPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "INTERNAL" | "CLIENT_REPORTED">("ALL");
  const [search, setSearch] = useState("");

  // Report Bug Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [itemType, setItemType] = useState<ItemType>("BUG");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("MAJOR");
  const [source, setSource] = useState<BugSource>("INTERNAL");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [environment, setEnvironment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const allMembers = ["Rinzan", "Sam Taylor", "Jordan Lee", "Morgan Chen"];

  const fetchData = async () => {
    try {
      const [stagesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectKey}/stages`).then((r) => r.json()),
        fetch(`/api/projects/${projectKey}/items?type=BUG`).then((r) => r.json()),
      ]);
      setStages(stagesRes);
      if (stagesRes.length > 0 && !selectedStageId) {
        setSelectedStageId(stagesRes[0].id);
      }
      setItems(itemsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectKey]);

  // Group bugs by severity
  const bugsBySeverity = useMemo(() => {
    const groups: Record<BugSeverity, ItemWithRelations[]> = {
      BLOCKER: [],
      MAJOR: [],
      MINOR: [],
      TRIVIAL: [],
    };

    items.forEach((item) => {
      if (item.type !== "BUG") return;
      if (sourceFilter !== "ALL" && item.source !== sourceFilter) return;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.humanId.toLowerCase().includes(q)
        )
          return;
      }

      const sev: BugSeverity = (item.severity as BugSeverity) || "MAJOR";
      groups[sev].push(item);
    });

    return groups;
  }, [items, sourceFilter, search]);

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

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStageId = selectedStageId || stages[0]?.id;
    if (!title.trim() || !targetStageId || submitting) return;

    setSubmitting(true);
    try {
      // 1. Create item in chosen stage
      const res = await fetch(`/api/projects/${projectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: itemType,
          stageId: targetStageId,
          priority: severity === "BLOCKER" ? "CRITICAL" : severity === "MAJOR" ? "HIGH" : "MEDIUM",
          severity: itemType === "BUG" ? severity : null,
          source: itemType === "BUG" ? source : null,
          stepsToReproduce: steps.trim() || null,
          expectedResult: expected.trim() || null,
          actualResult: actual.trim() || null,
          environment: environment.trim() || null,
          assignee: assignee || null,
        }),
      });

      if (res.ok) {
        const createdItem = await res.json();

        // 2. Upload attached files
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
            } catch (upErr) {
              console.error("Failed uploading attachment:", upErr);
            }
          }
        }

        setIsReportOpen(false);
        setTitle("");
        setSteps("");
        setExpected("");
        setActual("");
        setEnvironment("");
        setAttachedFiles([]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const SEVERITY_CONFIG: Record<
    BugSeverity,
    { label: string; color: string; badge: string; icon: any }
  > = {
    BLOCKER: {
      label: "Blocker",
      color: "border-rose-500/30 bg-rose-500/10 text-rose-500",
      badge: "bg-rose-500 text-white",
      icon: Flame,
    },
    MAJOR: {
      label: "Major",
      color: "border-orange-500/30 bg-orange-500/10 text-orange-500",
      badge: "bg-orange-500 text-white",
      icon: AlertTriangle,
    },
    MINOR: {
      label: "Minor",
      color: "border-amber-500/30 bg-amber-500/10 text-amber-500",
      badge: "bg-amber-500 text-white",
      icon: ShieldAlert,
    },
    TRIVIAL: {
      label: "Trivial",
      color: "border-slate-500/30 bg-slate-500/10 text-slate-500",
      badge: "bg-slate-500 text-white",
      icon: CheckCircle2,
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-rose-500" />
            <span>Bug Triage & Defect Tracker</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Severity lanes, client-reported vs internal tags, and stage progression.
          </p>
        </div>

        <Button
          onClick={() => {
            if (stages.length > 0 && !selectedStageId) setSelectedStageId(stages[0].id);
            setIsReportOpen(true);
          }}
          className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Report Bug</span>
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border bg-card shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bug title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Source:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="flex h-8 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Sources</option>
            <option value="INTERNAL">Internal QA / Dev</option>
            <option value="CLIENT_REPORTED">Client Reported</option>
          </select>
        </div>
      </div>

      {/* Severity Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["BLOCKER", "MAJOR", "MINOR", "TRIVIAL"] as BugSeverity[]).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const Icon = cfg.icon;
          const bugList = bugsBySeverity[sev] || [];

          return (
            <div
              key={sev}
              className="flex flex-col rounded-xl border bg-card/60 shadow-2xs overflow-hidden"
            >
              {/* Lane Header */}
              <div
                className={`flex items-center justify-between p-3 border-b ${cfg.color} font-semibold`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs tracking-tight">{cfg.label}</span>
                </div>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${cfg.badge}`}
                >
                  {bugList.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="p-2 space-y-2.5 min-h-[150px] flex-1 overflow-y-auto">
                {bugList.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                    No {cfg.label.toLowerCase()} bugs
                  </div>
                ) : (
                  bugList.map((bug) => (
                    <div
                      key={bug.id}
                      onClick={() => setSelectedItem(bug)}
                      className="group p-3 rounded-lg border bg-card hover:border-primary/50 transition-all cursor-pointer shadow-2xs space-y-2 hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">
                          {bug.humanId}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            bug.source === "CLIENT_REPORTED"
                              ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {bug.source === "CLIENT_REPORTED" ? "Client" : "Internal"}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
                        {bug.title}
                      </h4>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/40">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${bug.stage?.color || "#64748b"}15`,
                            color: bug.stage?.color || "#64748b",
                          }}
                        >
                          {bug.stage?.name}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Avatar name={bug.assignee} size="xs" />
                          <span>{bug.assignee || "Unassigned"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remodeled Report Bug Modal with Stage & File Upload */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsReportOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2 text-rose-500">
              <Bug className="h-5 w-5" />
              <span>Report Bug / Issue ({projectKey})</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose stage, reproduction steps, severity, and attach screenshots or logs.
            </p>

            <form onSubmit={handleReportBug} className="space-y-4">
              {/* Type Selector (Bug, Task, Feature) */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Work Item Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemType("BUG")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      itemType === "BUG"
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-500 ring-1 ring-rose-500"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Bug className="h-3.5 w-3.5" />
                    <span>Bug</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType("TASK")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      itemType === "TASK"
                        ? "bg-blue-500/10 border-blue-500/40 text-blue-500 ring-1 ring-blue-500"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemType("FEATURE")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-all ${
                      itemType === "FEATURE"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-500 ring-1 ring-purple-500"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Feature</span>
                  </button>
                </div>
              </div>

              {/* Stage Selection & Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Workflow Stage *
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

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs"
                  >
                    <option value="BLOCKER">🔥 Blocker (Immediate fix)</option>
                    <option value="MAJOR">⚠️ Major (Core broken)</option>
                    <option value="MINOR">⚡ Minor (Workaround exists)</option>
                    <option value="TRIVIAL">🔹 Trivial (Cosmetic / UI)</option>
                  </select>
                </div>
              </div>

              {/* Summary / Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Summary / Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Session expires after 5 minutes on invoice page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>

              {/* Source & Environment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Bug Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as BugSource)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs"
                  >
                    <option value="INTERNAL">Internal QA / Dev</option>
                    <option value="CLIENT_REPORTED">Client Reported</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Environment / Client
                  </label>
                  <Input
                    placeholder="macOS Sonoma / Chrome 124"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Steps to Reproduce */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Steps to Reproduce
                </label>
                <Textarea
                  placeholder="1. Navigate to billing tab&#10;2. Click export to CSV&#10;3. Observe 500 error toast"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                />
              </div>

              {/* Expected & Actual Result */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Expected Result
                  </label>
                  <Input
                    placeholder="Should download CSV file"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Actual Result
                  </label>
                  <Input
                    placeholder="Displays 500 error toast"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Assign To
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs"
                >
                  <option value="">Unassigned</option>
                  {allMembers.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* File / Screenshot Upload Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Attach Screenshots or Logs</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add File</span>
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
                      Click to attach screenshots, error logs, or documents
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

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReportOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !title.trim()}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  {submitting ? "Submitting..." : `Submit ${itemType}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          projectKey={projectKey}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setSelectedItem(updated);
          }}
          onDelete={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setSelectedItem(null);
          }}
          stages={stages}
        />
      )}
    </div>
  );
}
