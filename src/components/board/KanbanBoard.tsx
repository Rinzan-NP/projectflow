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
} from "lucide-react";
import { Stage, ItemWithRelations, ItemType } from "@/lib/types";
import { KanbanColumn } from "@/components/board/KanbanColumn";
import { ItemCard } from "@/components/board/ItemCard";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface KanbanBoardProps {
  projectKey: string;
  initialStages: Stage[];
  initialItems: ItemWithRelations[];
}

export function KanbanBoard({
  projectKey,
  initialStages,
  initialItems,
}: KanbanBoardProps) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [activeItem, setActiveItem] = useState<ItemWithRelations | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [quickToggle, setQuickToggle] = useState<"ALL" | "BUGS" | "FEATURES" | "MY">("ALL");

  const currentUser = "Alex Rivers";

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px threshold so clicking to open card doesn't accidentally drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
        if (!matchesTitle && !matchesId && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, search, typeFilter, priorityFilter, assigneeFilter, quickToggle]);

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const map: Record<string, ItemWithRelations[]> = {};
    for (const stage of stages) {
      map[stage.id] = [];
    }
    for (const item of filteredItems) {
      if (map[item.stageId]) {
        map[item.stageId].push(item);
      }
    }
    // Sort items within each stage by order
    for (const stageId in map) {
      map[stageId].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [stages, filteredItems]);

  // Extract all assignees for filter
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.assignee) set.add(i.assignee);
    });
    return Array.from(set);
  }, [items]);

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

        const activeItem = prevItems[activeIndex];
        const overItem = prevItems[overIndex];

        if (activeItem.stageId !== overItem.stageId) {
          // Move item to new stage
          const copy = [...prevItems];
          copy[activeIndex] = {
            ...activeItem,
            stageId: overItem.stageId,
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

    // Recalculate order within the affected stage
    const currentItems = [...items];
    const targetItem = currentItems.find((i) => i.id === active.id);
    if (!targetItem) return;

    // Group items in target item's stage and update their order values
    const stageItems = currentItems
      .filter((i) => i.stageId === targetItem.stageId)
      .map((item, idx) => ({
        id: item.id,
        stageId: item.stageId,
        order: (idx + 1) * 1.0,
      }));

    // Optimistically update state
    setItems((prev) =>
      prev.map((i) => {
        const found = stageItems.find((s) => s.id === i.id);
        return found ? { ...i, order: found.order } : i;
      })
    );

    // Save immediately to backend
    try {
      await fetch("/api/items/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: stageItems }),
      });
    } catch (err) {
      console.error("Failed to persist item reorder:", err);
    }
  };

  // Quick Add Item Handler
  const handleQuickAdd = async (stageId: string, title: string, type: ItemType) => {
    try {
      const res = await fetch(`/api/projects/${projectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          stageId,
          priority: "MEDIUM",
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
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

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Kanban Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items by title or ID (e.g. CRM-1)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/50"
          />
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

        {/* Right: Dropdown Filters */}
        <div className="flex items-center gap-2">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground focus:text-foreground cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground focus:text-foreground cursor-pointer"
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned</option>
            {allAssignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
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
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              items={itemsByStage[stage.id] || []}
              onItemClick={(item) => setSelectedItem(item)}
              onQuickAdd={handleQuickAdd}
            />
          ))}
        </div>

        {/* Drag Overlay for smooth preview */}
        <DragOverlay>
          {activeItem ? <ItemCard item={activeItem} onClick={() => {}} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          projectKey={projectKey}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          stages={stages}
        />
      )}
    </div>
  );
}
