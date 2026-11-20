"use client";

import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [company, setCompany] = useState("Company 1");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [owner, setOwner] = useState("Alex Rivers");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-generate key from name if user hasn't edited key manually
  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
    if (!key || key.length <= 4) {
      setKey(generated || val.slice(0, 3).toUpperCase());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          key: key.trim().toUpperCase(),
          company: company.trim() || "Company 1",
          description: description.trim() || null,
          color,
          owner: owner.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      onSuccess(data);
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

        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shadow-xs"
            style={{ backgroundColor: color }}
          >
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Create New Project</h2>
            <p className="text-xs text-muted-foreground">
              Projects group tasks, bugs, and custom workflow stages.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Project Name *
            </label>
            <Input
              required
              placeholder="e.g. Mobile Companion App"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Company / Client *
            </label>
            <Input
              required
              placeholder="e.g. Acme Tech or Nova Labs"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Short Key (Prefix) *
              </label>
              <Input
                required
                maxLength={6}
                placeholder="e.g. APP"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="h-9 font-mono uppercase"
              />
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Item ID prefix: {key ? `${key}-1` : "..."}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Lead / Owner
              </label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Alex Rivers"
                className="h-9"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Description
            </label>
            <Textarea
              rows={2}
              placeholder="Brief description of the project goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform cursor-pointer ${
                    color === c ? "scale-110 border-foreground shadow-xs" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t">
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
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
