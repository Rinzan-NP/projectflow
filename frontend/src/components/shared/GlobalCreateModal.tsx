"use client";

import React, { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItemType, Priority, BugSeverity } from "@/lib/types";

interface GlobalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GlobalCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: GlobalCreateModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState("");
  const [stages, setStages] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemType>("TASK");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignee, setAssignee] = useState("Alex Rivers");
  const [severity, setSeverity] = useState<BugSeverity>("MAJOR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((data) => {
          setProjects(data);
          if (data.length > 0) {
            setSelectedProjectKey(data[0].key);
            fetchStages(data[0].key);
          }
        });
    }
  }, [isOpen]);

  const fetchStages = async (key: string) => {
    try {
      const res = await fetch(`/api/projects/${key}/stages`).then((r) => r.json());
      setStages(res);
      if (res.length > 0) setSelectedStageId(res[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectChange = (key: string) => {
    setSelectedProjectKey(key);
    fetchStages(key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStageId) return;

    setLoading(true);
    setError(null);

    try {
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
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create item");
      }

      setTitle("");
      setDescription("");
      onClose();
      if (onSuccess) onSuccess();
      window.location.reload(); // Refresh active view
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-bold tracking-tight mb-1">Create Work Item</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add a task, bug, or feature to any project workflow.
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Project *
              </label>
              <select
                value={selectedProjectKey}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
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
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Title *
            </label>
            <Input
              required
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ItemType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
              >
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="FEATURE">Feature</option>
                <option value="IMPROVEMENT">Improvement</option>
                <option value="CHORE">Chore</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Assignee
              </label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Alex Rivers"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Description (Optional)
            </label>
            <Textarea
              rows={3}
              placeholder="Add details, links, or specifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>

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
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Creating..." : "Create Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
