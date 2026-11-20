"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, CheckSquare, MessageSquare, ListCheck } from "lucide-react";
import { ItemWithRelations } from "@/lib/types";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { Avatar } from "@/components/shared/Avatar";
import { formatDate } from "@/lib/utils";

interface ItemCardProps {
  item: ItemWithRelations;
  onClick: (item: ItemWithRelations) => void;
  isOverlay?: boolean;
}

export function ItemCard({ item, onClick, isOverlay = false }: ItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "Item",
      item,
    },
    disabled: isOverlay,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    item.dueDate &&
    !item.completedAt &&
    new Date(item.dueDate) < new Date();

  const totalChecklist = item.checklists?.length || 0;
  const doneChecklist = item.checklists?.filter((c) => c.isDone).length || 0;
  const commentCount = item.comments?.length || 0;
  const subtaskCount = item.subtasks?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(item)}
      className={`group relative rounded-lg border bg-card p-3 shadow-xs hover:border-primary/40 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-30 border-dashed border-primary" : ""
      } ${isOverlay ? "rotate-2 scale-105 shadow-xl border-primary" : ""}`}
    >
      {/* Top: Human ID & Type & Priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <ItemTypeIcon type={item.type} className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {item.humanId}
          </span>
        </div>

        <PriorityIcon priority={item.priority} className="h-3.5 w-3.5" />
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-foreground line-clamp-2 mb-2 leading-relaxed">
        {item.title}
      </h4>

      {/* Labels */}
      {item.labels && item.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {item.labels.slice(0, 3).map(({ label }) => (
            <span
              key={label.id}
              className="text-[10px] font-medium px-1.5 py-0.2 rounded-sm border"
              style={{
                backgroundColor: `${label.color}15`,
                color: label.color,
                borderColor: `${label.color}30`,
              }}
            >
              {label.name}
            </span>
          ))}
          {item.labels.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{item.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Due date, checklist/comment icons, Assignee */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* Due date */}
          {item.dueDate && (
            <span
              className={`flex items-center gap-1 ${
                isOverdue
                  ? "text-rose-500 font-semibold"
                  : item.completedAt
                  ? "text-muted-foreground line-through"
                  : "text-muted-foreground"
              }`}
              title={`Due ${formatDate(item.dueDate)}`}
            >
              <Calendar className="h-3 w-3" />
              <span>{formatDate(item.dueDate)}</span>
            </span>
          )}

          {/* Checklist progress */}
          {totalChecklist > 0 && (
            <span
              className={`flex items-center gap-0.5 ${
                doneChecklist === totalChecklist ? "text-emerald-500 font-medium" : ""
              }`}
              title={`${doneChecklist}/${totalChecklist} checklist items`}
            >
              <ListCheck className="h-3 w-3" />
              <span>
                {doneChecklist}/{totalChecklist}
              </span>
            </span>
          )}

          {/* Comments count */}
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5" title={`${commentCount} comments`}>
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <Avatar name={item.assignee} size="xs" />
      </div>
    </div>
  );
}
