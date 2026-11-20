import React from "react";
import { CheckSquare, Bug, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { ItemType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ItemTypeIconProps {
  type: ItemType | string;
  className?: string;
  showLabel?: boolean;
}

export function ItemTypeIcon({ type, className, showLabel = false }: ItemTypeIconProps) {
  let IconComponent = CheckSquare;
  let color = "text-blue-500";
  let label = "Task";

  switch (type) {
    case "BUG":
      IconComponent = Bug;
      color = "text-rose-500";
      label = "Bug";
      break;
    case "FEATURE":
      IconComponent = Sparkles;
      color = "text-purple-500";
      label = "Feature";
      break;
    case "IMPROVEMENT":
      IconComponent = TrendingUp;
      color = "text-emerald-500";
      label = "Improvement";
      break;
    case "CHORE":
      IconComponent = Wrench;
      color = "text-slate-400";
      label = "Chore";
      break;
    default:
      IconComponent = CheckSquare;
      color = "text-blue-500";
      label = "Task";
  }

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={label}>
      <IconComponent className={cn("h-4 w-4", color, className)} />
      {showLabel && <span className="text-xs font-medium">{label}</span>}
    </span>
  );
}
