"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  Search,
  Filter,
  Bug,
  Sparkles,
  User,
  Plus,
  RefreshCw,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { Stage, ItemWithRelations, ItemType, Priority } from "@/lib/types";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { ItemCard } from "@/components/board/ItemCard";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { GlobalCreateModal } from "@/components/shared/GlobalCreateModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  projectKey: string;
  initialStages?: Stage[];
  initialItems?: ItemWithRelations[];
  allProjects?: any[];
}

const UNIFIED_STAGES: Stage[] = [
  {
    id: "stage_backlog",
    name: "Backlog",
    order: 0,
    color: "#94a3b8",
    isDoneStage: false,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: null,
  },
  {
    id: "stage_todo",
    name: "To Do",
    order: 1,
    color: "#38bdf8",
    isDoneStage: false,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: 15,
  },
  {
    id: "stage_in_progress",
    name: "In Progress",
    order: 2,
    color: "#f59e0b",
    isDoneStage: false,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: 10,
  },
  {
    id: "stage_in_review",
    name: "In Review",
    order: 3,
    color: "#a855f7",
    isDoneStage: false,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: 8,
  },
  {
    id: "stage_testing",
    name: "Testing",
    order: 4,
    color: "#ec4899",
    isDoneStage: false,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: null,
  },
  {
    id: "stage_done",
    name: "Done",
    order: 5,
    color: "#10b981",
    isDoneStage: true,
    projectId: "ALL",
    createdAt: new Date(),
    updatedAt: new Date(),
    wipLimit: null,
  },
];

function getUnifiedStageIdForItem(item: ItemWithRelations, currentStages: Stage[]): string {
  const stage = item.stage || currentStages.find((s) => s.id === item.stageId);
  if (!stage) return "stage_todo";
  if (stage.isDoneStage) return "stage_done";
  const name = (stage.name || "").toLowerCase();
  if (name.includes("backlog")) return "stage_backlog";
  if (name.includes("to do") || name.includes("todo")) return "stage_todo";
  if (name.includes("in progress") || name.includes("progress")) return "stage_in_progress";
  if (name.includes("review")) return "stage_in_review";
  if (name.includes("test") || name.includes("qa")) return "stage_testing";
  if (name.includes("done") || name.includes("complete")) return "stage_done";
  return "stage_todo";
}

function findProjectStageForUnifiedStage(project: any, unifiedStageId: string): Stage | null {
  if (!project || !project.stages || project.stages.length === 0) return null;
  const targetMap: Record<string, (name: string, isDone: boolean) => boolean> = {
    stage_backlog: (n, d) => !d && n.includes("backlog"),
    stage_todo: (n, d) => !d && (n.includes("to do") || n.includes("todo")),
    stage_in_progress: (n, d) => !d && (n.includes("in progress") || n.includes("progress")),
    stage_in_review: (n, d) => !d && n.includes("review"),
    stage_testing: (n, d) => !d && (n.includes("test") || n.includes("qa")),
    stage_done: (n, d) => d || n.includes("done"),
  };

  const matcher = targetMap[unifiedStageId];
  if (matcher) {
    const found = project.stages.find((s: Stage) =>
      matcher((s.name || "").toLowerCase(), s.isDoneStage)
    );
    if (found) return found;
  }
  return project.stages[0];
}

export function KanbanBoard({
  projectKey = "ALL",
  initialStages = [],
  initialItems = [],
  allProjects: initialAllProjects = [],
}: KanbanBoardProps) {
  const [selectedProject, setSelectedProject] = useState<string>(projectKey || "ALL");
  const [allProjects, setAllProjects] = useState<any[]>(initialAllProjects);
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [activeItem, setActiveItem] = useState<ItemWithRelations | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [quickToggle, setQuickToggle] = useState<"ALL" | "BUGS" | "FEATURES" | "MY">("ALL");

  const currentUser = "Rinzan";

  // Fetch projects list if not supplied
  useEffect(() => {
    if (allProjects.length === 0) {
      fetch("/api/projects")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setAllProjects(data))
        .catch(console.error);
    }
  }, [allProjects.length]);

  // If in ALL mode and items empty, fetch all items
  useEffect(() => {
    if (selectedProject === "ALL" && items.length === 0) {
      fetch("/api/items")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setItems(data))
        .catch(console.error);
    }
  }, [selectedProject, items.length]);

  // Determine active stages
  const activeStages = useMemo(() => {
    if (selectedProject === "ALL") {
      return UNIFIED_STAGES;
    }
    const currentProj = allProjects.find(
      (p) => p.key.toUpperCase() === selectedProject.toUpperCase()
    );
    if (currentProj && currentProj.stages && currentProj.stages.length > 0) {
      return [...currentProj.stages].sort((a: Stage, b: Stage) => a.order - b.order);
    }
    return initialStages.length > 0 ? initialStages : UNIFIED_STAGES;
  }, [selectedProject, allProjects, initialStages]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Project filter
      if (selectedProject !== "ALL") {
        const itemProjKey = item.project?.key || item.humanId.split("-")[0];
        if (itemProjKey.toUpperCase() !== selectedProject.toUpperCase()) {
          return false;
        }
      }

      // Quick toggles
      if (quickToggle === "BUGS" && item.type !== "BUG") return false;
      if (quickToggle === "FEATURES" && item.type !== "FEATURE") return false;
      if (quickToggle === "MY" && item.assignee !== currentUser) return false;

      // Select filters
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;
      if (assigneeFilter !== "ALL") {
        if (assigneeFilter === "UNASSIGNED" && item.assignee) return false;
        if (assigneeFilter !== "UNASSIGNED" && item.assignee !== assigneeFilter) return false;
      }

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesId = item.humanId.toLowerCase().includes(query);
        const matchesDesc = item.description?.toLowerCase().includes(query) ?? false;
        const matchesProj = item.project?.name.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesId && !matchesDesc && !matchesProj) return false;
      }

      return true;
    });
  }, [items, selectedProject, search, typeFilter, priorityFilter, assigneeFilter, quickToggle]);

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const map: Record<string, ItemWithRelations[]> = {};
    for (const stage of activeStages) {
      map[stage.id] = [];
    }

    const isAllMode = selectedProject === "ALL";

    for (const item of filteredItems) {
      if (isAllMode) {
        const unifiedStageId = getUnifiedStageIdForItem(item, activeStages);
        if (map[unifiedStageId]) {
          map[unifiedStageId].push(item);
        } else if (map["stage_todo"]) {
          map["stage_todo"].push(item);
        }
      } else {
        if (map[item.stageId]) {
          map[item.stageId].push(item);
        } else if (activeStages[0]) {
          map[activeStages[0].id].push(item);
        }
      }
    }

    // Sort items within each stage by order
    for (const stageId in map) {
      map[stageId].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [activeStages, filteredItems, selectedProject]);

  // Extract all assignees for filter
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.assignee) set.add(i.assignee);
    });
    return Array.from(set);
  }, [items]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = items.find((i) => i.id === active.id);
    if (item) setActiveItem(item);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveAnItem = active.data.current?.type === "Item";
    const isOverAnItem = over.data.current?.type === "Item";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveAnItem) return;

    // Dropping over another item
    if (isActiveAnItem && isOverAnItem) {
      setItems((prevItems) => {
        const activeIndex = prevItems.findIndex((i) => i.id === activeId);
        const overIndex = prevItems.findIndex((i) => i.id === overId);

        if (activeIndex === -1 || overIndex === -1) return prevItems;

        const actItem = prevItems[activeIndex];
        const ovItem = prevItems[overIndex];

        if (actItem.stageId !== ovItem.stageId) {
          const copy = [...prevItems];
          copy[activeIndex] = {
            ...actItem,
            stageId: ovItem.stageId,
          };
          return arrayMove(copy, activeIndex, overIndex);
        }

        return arrayMove(prevItems, activeIndex, overIndex);
      });
    }

    // Dropping directly over an empty column
    if (isActiveAnItem && isOverAColumn) {
      setItems((prevItems) => {
        const activeIndex = prevItems.findIndex((i) => i.id === activeId);
        if (activeIndex === -1) return prevItems;

        const copy = [...prevItems];
        copy[activeIndex] = {
          ...copy[activeIndex],
          stageId: overId,
        };
        return copy;
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const targetItem = items.find((i) => i.id === activeId);
    if (!targetItem) return;

    const isAllMode = selectedProject === "ALL";

    if (isAllMode) {
      // Determine which unified column was dropped into
      let targetUnifiedStageId = overId;
      const overItem = items.find((i) => i.id === overId);
      if (overItem) {
        targetUnifiedStageId = getUnifiedStageIdForItem(overItem, activeStages);
      }

      // Find item's project and the project's corresponding stage
      const itemProjKey = targetItem.project?.key || targetItem.humanId.split("-")[0];
      const proj = allProjects.find(
        (p) => p.key.toUpperCase() === itemProjKey.toUpperCase()
      );

      const targetProjectStage = findProjectStageForUnifiedStage(proj, targetUnifiedStageId);
      if (targetProjectStage) {
        // Update local state
        setItems((prev) =>
          prev.map((i) =>
            i.id === targetItem.id
              ? { ...i, stageId: targetProjectStage.id, stage: targetProjectStage }
              : i
          )
        );

        // Persist to backend
        try {
          await fetch(`/api/items/${targetItem.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stageId: targetProjectStage.id }),
          });
        } catch (err) {
          console.error("Failed to update item stage:", err);
        }
      }
    } else {
      // Standard single-project reorder
      const currentItems = [...items];
      const stageItems = currentItems
        .filter((i) => i.stageId === targetItem.stageId)
        .map((item, idx) => ({
          id: item.id,
          stageId: item.stageId,
          order: (idx + 1) * 1.0,
        }));

      setItems((prev) =>
        prev.map((i) => {
          const found = stageItems.find((s) => s.id === i.id);
          return found ? { ...i, order: found.order } : i;
        })
      );

      try {
        await fetch("/api/items/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: stageItems }),
        });
      } catch (err) {
        console.error("Failed to persist item reorder:", err);
      }
    }
  };

  // Quick Add Item Handler with Priority & Project support
  const handleQuickAdd = async (
    stageId: string,
    title: string,
    type: ItemType,
    priority: string = "MEDIUM",
    chosenProjectKey?: string
  ) => {
    // Determine target project
    let targetProjectKey =
      chosenProjectKey ||
      (selectedProject !== "ALL" ? selectedProject : (projectKey !== "ALL" ? projectKey : ""));

    if (!targetProjectKey && allProjects.length > 0) {
      targetProjectKey = allProjects[0].key;
    }

    if (!targetProjectKey) {
      console.error("No project available to add item to");
      return;
    }

    const proj = allProjects.find(
      (p) => p.key.toUpperCase() === targetProjectKey.toUpperCase()
    );

    let actualStageId = stageId;
    if (selectedProject === "ALL") {
      const matchedStage = findProjectStageForUnifiedStage(proj, stageId);
      if (matchedStage) {
        actualStageId = matchedStage.id;
      }
    }

    try {
      const res = await fetch(`/api/projects/${targetProjectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          stageId: actualStageId,
          priority: priority || "MEDIUM",
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        if (!newItem.project && proj) {
          newItem.project = { id: proj.id, name: proj.name, key: proj.key, color: proj.color };
        }
        setItems((prev) => [...prev, newItem]);
      }
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const handleUpdateItem = (updated: ItemWithRelations) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    if (selectedItem?.id === updated.id) {
      setSelectedItem(updated);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }
  };

  const isInsideProductPage = projectKey !== "ALL";
  const showProjectSelectOnQuickAdd = !isInsideProductPage && selectedProject === "ALL";
  const effectiveProjectKey = isInsideProductPage
    ? projectKey
    : (selectedProject !== "ALL" ? selectedProject : undefined);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
        {/* Left: Project Filter & Search */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5 bg-muted/60 border rounded-lg px-2.5 py-1 shrink-0">
            <FolderKanban className="h-3.5 w-3.5 text-primary shrink-0" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs bg-transparent font-semibold text-foreground cursor-pointer outline-none"
              title="Filter by Project"
            >
              <option value="ALL">All Projects ({allProjects.length})</option>
              {allProjects.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search items by title, ID, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/50"
            />
          </div>
        </div>

        {/* Middle: Quick Toggles */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setQuickToggle("ALL")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
              quickToggle === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setQuickToggle("BUGS")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
              quickToggle === "BUGS"
                ? "bg-rose-500 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Bug className="h-3 w-3" />
            <span>Bugs only</span>
          </button>
          <button
            onClick={() => setQuickToggle("FEATURES")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
              quickToggle === "FEATURES"
                ? "bg-purple-500 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Features only</span>
          </button>
          <button
            onClick={() => setQuickToggle("MY")}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors font-medium cursor-pointer ${
              quickToggle === "MY"
                ? "bg-emerald-500 text-white shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <User className="h-3 w-3" />
            <span>My Items</span>
          </button>
        </div>

        {/* Right: Priority, Type, Assignee Filters & Create Item Button */}
        <div className="flex items-center gap-2">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground focus:text-foreground cursor-pointer"
            title="Filter by Task Priority"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">🔵 Low</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground focus:text-foreground cursor-pointer"
            title="Filter by Type"
          >
            <option value="ALL">All Types</option>
            <option value="TASK">Task</option>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature</option>
            <option value="IMPROVEMENT">Improvement</option>
            <option value="CHORE">Chore</option>
          </select>

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground focus:text-foreground cursor-pointer"
            title="Filter by Assignee"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {allAssignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* New Item Button */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="h-8 text-xs font-semibold gap-1.5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Item</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[calc(100vh-16rem)]">
          {activeStages.map((stage) => {
            const currentProj = allProjects.find((p) => p.key === selectedProject);
            return (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                items={itemsByStage[stage.id] || []}
                onItemClick={(item) => setSelectedItem(item)}
                onQuickAdd={handleQuickAdd}
                projectName={currentProj?.name}
                projectColor={currentProj?.color}
                allProjects={allProjects}
                showProjectSelect={showProjectSelectOnQuickAdd}
                defaultProjectKey={effectiveProjectKey}
              />
            );
          })}
        </div>

        {/* Drag Overlay for smooth preview */}
        <DragOverlay>
          {activeItem ? (
            <ItemCard
              item={activeItem}
              onClick={() => {}}
              isOverlay
              projectName={allProjects.find((p) => p.key === selectedProject)?.name}
              projectColor={allProjects.find((p) => p.key === selectedProject)?.color}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          projectKey={selectedItem.project?.key || selectedProject}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          stages={activeStages}
        />
      )}

      {/* Global / Board Create Item Modal */}
      {isCreateModalOpen && (
        <GlobalCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetch(projectKey === "ALL" ? "/api/items" : `/api/projects/${projectKey}/items`)
              .then((r) => (r.ok ? r.json() : []))
              .then((data) => setItems(data))
              .catch(console.error);
          }}
          defaultProjectKey={effectiveProjectKey}
          hideProjectSelect={isInsideProductPage}
        />
      )}
    </div>
  );
}
