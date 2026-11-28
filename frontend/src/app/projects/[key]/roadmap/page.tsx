"use client";

import React, { useState, useEffect, use, useMemo, useRef } from "react";
import {
  Sparkles,
  Plus,
  Compass,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  Calendar,
  X,
  Upload,
  FileText,
  Trash2,
} from "lucide-react";
import { ItemWithRelations, Stage } from "@/lib/types";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { Avatar } from "@/components/shared/Avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [features, setFeatures] = useState<ItemWithRelations[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);

  // Propose modal state
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [title, setTitle] = useState("");
  const [userStory, setUserStory] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [stagesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectKey}/stages`).then((r) => r.json()),
        fetch(`/api/projects/${projectKey}/items?type=FEATURE`).then((r) => r.json()),
      ]);
      setStages(stagesRes);
      if (stagesRes.length > 0 && !selectedStageId) {
        setSelectedStageId(stagesRes[0].id);
      }
      setFeatures(itemsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectKey]);

  // Map features by stage
  const featuresByStage = useMemo(() => {
    const map = new Map<string, ItemWithRelations[]>();
    stages.forEach((s) => map.set(s.id, []));
    features.forEach((f) => {
      if (f.stageId) {
        const arr = map.get(f.stageId) || [];
        arr.push(f);
        map.set(f.stageId, arr);
      }
    });
    return map;
  }, [stages, features]);

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

  const handleProposeFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStageId = selectedStageId || stages[0]?.id;
    if (!title.trim() || !targetStageId || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: "FEATURE",
          stageId: targetStageId,
          priority: "MEDIUM",
          userStory: userStory.trim() || null,
          requestedBy: requestedBy.trim() || null,
        }),
      });

      if (res.ok) {
        const createdItem = await res.json();

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
            } catch (err) {
              console.error("Upload error:", err);
            }
          }
        }

        setIsProposeOpen(false);
        setTitle("");
        setUserStory("");
        setRequestedBy("");
        setAttachedFiles([]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>Feature Roadmap</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track user stories, client requests, and subtask decomposition.
          </p>
        </div>

        <Button
          onClick={() => {
            if (stages.length > 0 && !selectedStageId) setSelectedStageId(stages[0].id);
            setIsProposeOpen(true);
          }}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Propose Feature</span>
        </Button>
      </div>

      {/* Feature Timeline Columns / Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stages.map((stage) => {
          const list = featuresByStage.get(stage.id) || [];

          return (
            <div
              key={stage.id}
              className="flex flex-col rounded-xl border bg-card/60 shadow-2xs overflow-hidden"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between p-3.5 border-b bg-card">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="text-xs font-bold text-foreground tracking-tight">
                    {stage.name}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {list.length} features
                </span>
              </div>

              {/* Items List */}
              <div className="p-3 space-y-3 min-h-[160px] flex-1 overflow-y-auto">
                {list.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-muted-foreground/60 border border-dashed rounded-lg">
                    No features in {stage.name}
                  </div>
                ) : (
                  list.map((feat) => {
                    const completedSubtasks =
                      feat.subtasks?.filter((st: any) => st.stage?.isDoneStage).length || 0;
                    const totalSubtasks = feat.subtasks?.length || 0;
                    const subtaskPercent =
                      totalSubtasks > 0
                        ? Math.round((completedSubtasks / totalSubtasks) * 100)
                        : 0;

                    return (
                      <div
                        key={feat.id}
                        onClick={() => setSelectedItem(feat)}
                        className="p-3.5 rounded-lg border bg-card hover:border-purple-500/50 transition-all cursor-pointer shadow-2xs space-y-2.5 hover:-translate-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            {feat.humanId}
                          </span>
                          {feat.requestedBy && (
                            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium truncate max-w-[140px]">
                              Req: {feat.requestedBy}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-foreground leading-snug">
                          {feat.title}
                        </h4>

                        {feat.userStory && (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-2 bg-muted/30 p-1.5 rounded">
                            &ldquo;{feat.userStory}&rdquo;
                          </p>
                        )}

                        {/* Subtasks Progress Bar */}
                        {totalSubtasks > 0 && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>Subtasks ({completedSubtasks}/{totalSubtasks})</span>
                              <span className="font-mono font-bold">{subtaskPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-purple-500 transition-all"
                                style={{ width: `${subtaskPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={feat.assignee} size="xs" />
                            <span>{feat.assignee || "Unassigned"}</span>
                          </div>

                          {feat.dueDate && (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <Calendar className="h-3 w-3" />
                              {new Date(feat.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Propose Feature Modal with Stage Selection and File Upload */}
      {isProposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95 my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsProposeOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2 text-purple-500">
              <Sparkles className="h-5 w-5" />
              <span>Propose Feature ({projectKey})</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add a new capability to the product backlog or target workflow stage.
            </p>

            <form onSubmit={handleProposeFeature} className="space-y-4">
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
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Requested By
                  </label>
                  <Input
                    placeholder="e.g. Acme Corp / Internal"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Feature Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Single Sign-On with SAML / Okta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  User Story / Problem Statement
                </label>
                <Textarea
                  rows={3}
                  placeholder="As a [role], I want to [action] so that [benefit]..."
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Attach Specs or Mockups</span>
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
                      Click to attach specifications, mockups, or requirements
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

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !title.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {submitting ? "Adding..." : "Add Feature"}
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
            setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
            setSelectedItem(updated);
          }}
          onDelete={(id) => {
            setFeatures((prev) => prev.filter((i) => i.id !== id));
            setSelectedItem(null);
          }}
          stages={stages}
        />
      )}
    </div>
  );
}
