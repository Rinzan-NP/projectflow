"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, X, FolderKanban } from "lucide-react";
import { ItemType } from "@/lib/types";

interface QuickAddCardProps {
  stageId: string;
  onAdd: (title: string, type: ItemType, priority?: string, projectKey?: string) => Promise<void>;
  projects?: { id?: string; key: string; name: string; color?: string }[];
  showProjectSelect?: boolean;
  defaultProjectKey?: string;
}

export function QuickAddCard({
  stageId,
  onAdd,
  projects = [],
  showProjectSelect = false,
  defaultProjectKey = "",
}: QuickAddCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("TASK");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(
    defaultProjectKey || (projects.length > 0 ? projects[0].key : "")
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultProjectKey) {
      setSelectedProjectKey(defaultProjectKey);
    } else if (projects.length > 0 && !selectedProjectKey) {
      setSelectedProjectKey(projects[0].key);
    }
  }, [defaultProjectKey, projects, selectedProjectKey]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || loading) return;

    setLoading(true);
    try {
      await onAdd(title.trim(), type, priority, selectedProjectKey);
      setTitle("");
      // Keep input focused for rapid multi-item entry
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setTitle("");
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add item</span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-sm space-y-2 animate-in fade-in-0 duration-150">
      {/* Top Controls: Project (if in board page) + Type + Priority */}
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showProjectSelect && projects.length > 0 && (
            <div className="flex items-center gap-1 bg-primary/10 border border-primary/30 rounded px-1.5 py-0.5">
              <FolderKanban className="h-3 w-3 text-primary shrink-0" />
              <select
                value={selectedProjectKey}
                onChange={(e) => setSelectedProjectKey(e.target.value)}
                className="text-[11px] font-semibold bg-transparent cursor-pointer text-foreground focus:outline-none max-w-[130px] truncate"
                title="Which Project?"
              >
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={type}
            onChange={(e) => setType(e.target.value as ItemType)}
            className="text-[11px] font-semibold bg-muted/60 border rounded px-1.5 py-0.5 cursor-pointer text-foreground focus:outline-none"
          >
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="CHORE">Chore</option>
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="text-[11px] font-semibold bg-muted/60 border rounded px-1.5 py-0.5 cursor-pointer text-foreground focus:outline-none"
            title="Task Priority"
          >
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Med</option>
            <option value="LOW">🔵 Low</option>
          </select>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <input
        autoFocus
        type="text"
        placeholder={
          showProjectSelect && projects.length > 0
            ? `Item title for ${projects.find((p) => p.key === selectedProjectKey)?.name || "project"}...`
            : "Item title... (Press Enter)"
        }
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
        className="w-full text-xs bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex justify-end gap-1.5 pt-1">
        <button
          onClick={() => setIsOpen(false)}
          className="text-[11px] px-2 py-1 rounded text-muted-foreground hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSubmit()}
          disabled={!title.trim() || loading}
          className="text-[11px] px-2.5 py-1 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
        >
          <Check className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
