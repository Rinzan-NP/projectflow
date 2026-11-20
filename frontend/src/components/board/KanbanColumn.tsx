"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertCircle } from "lucide-react";
import { Stage, ItemWithRelations, ItemType } from "@/lib/types";
import { ItemCard } from "@/components/board/ItemCard";
import { QuickAddCard } from "@/components/board/QuickAddCard";

interface KanbanColumnProps {
  stage: Stage;
  items: ItemWithRelations[];
  onItemClick: (item: ItemWithRelations) => void;
  onQuickAdd: (stageId: string, title: string, type: ItemType) => Promise<void>;
}

export function KanbanColumn({
  stage,
  items,
  onItemClick,
  onQuickAdd,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: "Column",
      stage,
    },
  });

  const itemCount = items.length;
  const isWipExceeded = stage.wipLimit != null && itemCount > stage.wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 shrink-0 rounded-xl bg-muted/40 border border-border/80 max-h-[calc(100vh-14rem)] shadow-2xs transition-colors ${
        isOver ? "bg-accent/40 border-primary/50" : ""
      }`}
    >
      {/* Column Header */}
      <div
        className={`flex items-center justify-between p-3 border-b rounded-t-xl transition-colors ${
          isWipExceeded ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-xs font-bold text-foreground tracking-tight">
            {stage.name}
          </h3>
          <span
            className={`text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded-full ${
              isWipExceeded
                ? "bg-rose-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {itemCount}
            {stage.wipLimit ? `/${stage.wipLimit}` : ""}
          </span>
        </div>

        {isWipExceeded && (
          <span
            className="flex items-center gap-1 text-[10px] text-rose-500 font-bold"
            title="WIP limit exceeded!"
          >
            <AlertCircle className="h-3 w-3" />
            <span>WIP</span>
          </span>
        )}
      </div>

      {/* Cards Scroll Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClick={onItemClick} />
          ))}
        </SortableContext>
      </div>

      {/* Quick Add at bottom */}
      <div className="p-2 pt-1 border-t border-border/40">
        <QuickAddCard
          stageId={stage.id}
          onAdd={(title, type) => onQuickAdd(stage.id, title, type)}
        />
      </div>
    </div>
  );
}
