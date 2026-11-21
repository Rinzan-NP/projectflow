"use client";

import React, { useState } from "react";
import { X, Trash2, Archive, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/shared/ColorPicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface EditProjectModalProps {
  project: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: any) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#64748b",
];

export function EditProjectModal({
  project,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [company, setCompany] = useState(project.company || "Company 1");
  const [description, setDescription] = useState(project.description || "");
  const [status, setStatus] = useState(project.status || "ACTIVE");
  const [priority, setPriority] = useState(project.priority || "MEDIUM");
  const [color, setColor] = useState(project.color || PRESET_COLORS[0]);
  const [owner, setOwner] = useState(project.owner || "");
  const [members, setMembers] = useState(project.members || "");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          description: description.trim() || null,
          status,
          priority,
          color,
          owner: owner.trim(),
          members: members.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project");

      onUpdate(data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete project");
      onDelete(project.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl text-card-foreground animate-in fade-in-0 zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-lg font-semibold tracking-tight mb-1">
          Project Settings: {project.name}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Key: <span className="font-mono font-bold text-foreground">{project.key}</span>
        </p>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Project Name
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Company / Client
            </label>
            <Input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Project Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="CRITICAL">🔴 Critical / Urgent</option>
                <option value="HIGH">🟠 High Priority</option>
                <option value="MEDIUM">🟡 Medium Priority</option>
                <option value="LOW">🔵 Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Owner
              </label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Team Members (comma separated)
            </label>
            <Input
              value={members}
              onChange={(e) => setMembers(e.target.value)}
              placeholder="Alex Rivers, Sam Taylor"
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Description
            </label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-xs"
            />
          </div>

          <ColorPicker
            label="Project Accent Color"
            value={color}
            onChange={setColor}
          />

          <div className="pt-4 flex items-center justify-between border-t">
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                  className="h-8 text-xs font-bold"
                >
                  Confirm Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
              >
                Close
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
