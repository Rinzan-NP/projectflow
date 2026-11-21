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
        <div className="flex items-center gap-1.5 min-w-0">
          <ItemTypeIcon type={item.type} className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            {item.humanId}
          </span>
          {item.project && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shrink-0 border uppercase tracking-wider"
              style={{
                backgroundColor: `${item.project.color}15`,
                color: item.project.color,
                borderColor: `${item.project.color}35`,
              }}
              title={item.project.name}
            >
              {item.project.key}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" title={`Priority: ${item.priority}`}>
          <PriorityIcon priority={item.priority} className="h-3 w-3" />
          <span
            className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${
              item.priority === "CRITICAL"
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : item.priority === "HIGH"
                ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                : item.priority === "LOW"
                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
            }`}
          >
            {item.priority === "CRITICAL"
              ? "Critical"
              : item.priority === "HIGH"
              ? "High"
              : item.priority === "LOW"
              ? "Low"
              : "Med"}
          </span>
        </div>
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
