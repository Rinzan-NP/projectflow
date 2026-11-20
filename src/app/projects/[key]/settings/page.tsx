"use client";

import React, { useEffect, useState, use } from "react";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Paintbrush,
  HelpCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  isDoneStage: boolean;
  wipLimit?: number | null;
  _count?: { items: number };
}

const PRESET_STAGE_COLORS = [
  "#94a3b8", // Slate
  "#38bdf8", // Sky
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#ef4444", // Red
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New stage form state
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(PRESET_STAGE_COLORS[1]);
  const [newStageIsDone, setNewStageIsDone] = useState(false);
  const [newStageWipLimit, setNewStageWipLimit] = useState<string>("");

  // Deletion modal state
  const [stageToDelete, setStageToDelete] = useState<Stage | null>(null);
  const [targetMoveStageId, setTargetMoveStageId] = useState<string>("");

  const fetchStages = async () => {
    try {
      const res = await fetch(`/api/projects/${projectKey}/stages`);
      if (res.ok) {
        const data = await res.json();
        setStages(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, [projectKey]);

  // Handle stage field update
  const handleStageChange = (id: string, field: keyof Stage, value: any) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Reorder stage up/down
  const moveStage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    // reassign order integers
    const updated = newStages.map((s, idx) => ({ ...s, order: idx }));
    setStages(updated);
  };

  // Save all stage edits to server
  const handleSaveAll = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // 1. Save reordering
      await fetch(`/api/projects/${projectKey}/stages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stages: stages.map((s) => ({ id: s.id, order: s.order })),
        }),
      });

      // 2. Save each stage's updated properties
      await Promise.all(
        stages.map((s) =>
          fetch(`/api/stages/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: s.name,
              color: s.color,
              isDoneStage: s.isDoneStage,
              wipLimit: s.wipLimit ? Number(s.wipLimit) : null,
            }),
          })
        )
      );

      setFeedback({ type: "success", message: "Stages updated successfully!" });
      fetchStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to save stages" });
    } finally {
      setSaving(false);
    }
  };

  // Add new stage
  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectKey}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStageName.trim(),
          color: newStageColor,
          isDoneStage: newStageIsDone,
          wipLimit: newStageWipLimit ? parseInt(newStageWipLimit) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add stage");
      }

      setNewStageName("");
      setNewStageWipLimit("");
      setNewStageIsDone(false);
      setFeedback({ type: "success", message: "New stage added!" });
      fetchStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete stage
  const handleConfirmDelete = async () => {
    if (!stageToDelete) return;
    setSaving(true);

    try {
      const query = targetMoveStageId ? `?moveToStageId=${targetMoveStageId}` : "";
      const res = await fetch(`/api/stages/${stageToDelete.id}${query}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete stage");
      }

      setStageToDelete(null);
      setTargetMoveStageId("");
      setFeedback({ type: "success", message: "Stage deleted successfully!" });
      fetchStages();
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Stage & Workflow Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure custom stages for {projectKey}, set WIP limits, and designate completion stages.
          </p>
        </div>

        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="gap-1.5 shadow-sm font-semibold"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? "Saving..." : "Save Changes"}</span>
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-destructive/10 text-destructive border-destructive/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Stage List */}
      <div className="bg-card border rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Current Workflow Stages ({stages.length})
        </h3>

        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const itemCount = stage._count?.items ?? 0;

            return (
              <div
                key={stage.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-lg border bg-background/60 hover:bg-background transition-colors"
              >
                {/* Reorder and color badge */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveStage(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveStage(idx, "down")}
                      disabled={idx === stages.length - 1}
                      className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="font-mono text-xs text-muted-foreground w-4 text-center">
                    {idx + 1}
                  </span>

                  {/* Color circle */}
                  <div className="relative group">
                    <span
                      className="block h-5 w-5 rounded-full border shadow-xs"
                      style={{ backgroundColor: stage.color }}
                    />
                  </div>

                  {/* Stage Name */}
                  <Input
                    value={stage.name}
                    onChange={(e) =>
                      handleStageChange(stage.id, "name", e.target.value)
                    }
                    className="h-8 w-44 font-medium text-xs"
                  />
                </div>

                {/* Properties: isDoneStage, WIP limit, items count */}
                <div className="flex items-center flex-wrap gap-4">
                  {/* WIP Limit */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>WIP Limit:</span>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="None"
                      value={stage.wipLimit ?? ""}
                      onChange={(e) =>
                        handleStageChange(
                          stage.id,
                          "wipLimit",
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      className="h-7 w-16 text-xs text-center"
                    />
                  </div>

                  {/* Is Done Stage toggle */}
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={stage.isDoneStage}
                      onChange={(e) =>
                        handleStageChange(stage.id, "isDoneStage", e.target.checked)
                      }
                      className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span
                      className={`font-medium ${
                        stage.isDoneStage
                          ? "text-emerald-500 font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      Done stage
                    </span>
                  </label>

                  {/* Item count chip */}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={() => {
                      setStageToDelete(stage);
                      const otherStages = stages.filter((s) => s.id !== stage.id);
                      if (otherStages.length > 0) {
                        setTargetMoveStageId(otherStages[0].id);
                      }
                    }}
                    disabled={stages.length <= 1}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 cursor-pointer"
                    title="Delete stage"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Stage Card */}
      <div className="bg-card border rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground mb-1">
          Add New Stage
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Append a new stage column to the end of the project workflow.
        </p>

        <form onSubmit={handleAddStage} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Stage Name *
              </label>
              <Input
                required
                placeholder="e.g. QA Verification"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                WIP Limit (optional)
              </label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={newStageWipLimit}
                onChange={(e) => setNewStageWipLimit(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Color:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_STAGE_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewStageColor(c)}
                    className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                      newStageColor === c ? "scale-125 border-foreground shadow-xs" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newStageIsDone}
                  onChange={(e) => setNewStageIsDone(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Counts as Completed ("Done")</span>
              </label>

              <Button type="submit" size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stage</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Stage Modal with Item Reassignment Prompt */}
      {stageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl text-card-foreground animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Delete Stage: {stageToDelete.name}</h3>
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {(stageToDelete._count?.items ?? 0) > 0 ? (
              <div className="space-y-4 mb-5">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-semibold mb-1">
                    Warning: This stage contains {stageToDelete._count?.items} work items.
                  </p>
                  <p>
                    Please choose which stage to move these items to before deleting.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Move existing items to:
                  </label>
                  <select
                    value={targetMoveStageId}
                    onChange={(e) => setTargetMoveStageId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {stages
                      .filter((s) => s.id !== stageToDelete.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.isDoneStage ? "Done Stage" : "Active Stage"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-5">
                This stage contains 0 items and can be safely deleted.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStageToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={saving}
              >
                {saving ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
