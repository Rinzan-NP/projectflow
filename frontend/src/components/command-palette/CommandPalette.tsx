"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderKanban,
  Kanban,
  CheckSquare,
  Bug,
  Sparkles,
  Plus,
  ArrowRight,
  Command,
} from "lucide-react";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { useAuth } from "@/lib/auth";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateItem?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenCreateItem,
}: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const pRes = await fetch("/api/projects").then((r) => r.json());
      const allowedProjects = user.company !== "ALL"
        ? pRes.filter((p: any) => p.company === user.company)
        : pRes;
      setProjects(allowedProjects);

      // Fetch items across allowed projects
      const itemPromises = allowedProjects.map((p: any) =>
        fetch(`/api/projects/${p.key}/items`).then((r) => r.json())
      );
      const itemsNested = await Promise.all(itemPromises);
      setItems(itemsNested.flat());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.key.toLowerCase().includes(query.toLowerCase())
  );

  const filteredItems = items
    .filter(
      (i) =>
        i.title.toLowerCase().includes(query.toLowerCase()) ||
        i.humanId.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);

  const handleSelectProject = (projectKey: string) => {
    router.push(`/projects/${projectKey}/board`);
    onClose();
  };

  const handleSelectItem = (humanId: string) => {
    const projectKey = humanId.split("-")[0];
    router.push(`/projects/${projectKey}/items/${humanId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-xs pt-20 p-4">
      <div className="relative w-full max-w-lg rounded-xl border bg-card shadow-2xl overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search projects & items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[350px] overflow-y-auto p-2 space-y-3 text-xs">
          {/* Quick Actions */}
          {!query && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </div>
              <div
                onClick={() => {
                  router.push("/projects");
                  onClose();
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <span>Go to Projects Dashboard</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div
                onClick={() => {
                  router.push("/board");
                  onClose();
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Kanban className="h-4 w-4 text-amber-500" />
                  <span>Go to Board</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
              <div
                onClick={() => {
                  router.push("/my-work");
                  onClose();
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-emerald-500" />
                  <span>Go to My Work</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Projects
              </div>
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProject(p.key)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.key.slice(0, 3)}
                    </span>
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="font-mono text-muted-foreground">({p.key})</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Open Board &rarr;</span>
                </div>
              ))}
            </div>
          )}

          {/* Items */}
          {filteredItems.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Work Items
              </div>
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item.humanId)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ItemTypeIcon type={item.type} />
                    <span className="font-mono font-bold text-muted-foreground shrink-0">
                      {item.humanId}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                    Jump to item
                  </span>
                </div>
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && filteredItems.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No results found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>Navigate with arrows or click</span>
          <span>
            Press <kbd className="font-mono bg-background border px-1 rounded">C</kbd> anywhere to create,{" "}
            <kbd className="font-mono bg-background border px-1 rounded">/</kbd> to search
          </span>
        </div>
      </div>
    </div>
  );
}
