import React from "react";
import { Flame, ArrowUp, Equal, ArrowDown } from "lucide-react";
import { Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PriorityIconProps {
  priority: Priority | string;
  className?: string;
  showLabel?: boolean;
}

export function PriorityIcon({ priority, className, showLabel = false }: PriorityIconProps) {
  let IconComponent = Equal;
  let color = "text-yellow-500";
  let label = "Medium";

  switch (priority) {
    case "CRITICAL":
      IconComponent = Flame;
      color = "text-rose-500";
      label = "Critical";
      break;
    case "HIGH":
      IconComponent = ArrowUp;
      color = "text-orange-500";
      label = "High";
      break;
    case "MEDIUM":
      IconComponent = Equal;
      color = "text-yellow-500";
      label = "Medium";
      break;
    case "LOW":
      IconComponent = ArrowDown;
      color = "text-blue-400";
      label = "Low";
      break;
  }

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={`Priority: ${label}`}>
      <IconComponent className={cn("h-4 w-4", color, className)} />
      {showLabel && <span className="text-xs font-medium">{label}</span>}
    </span>
  );
}
