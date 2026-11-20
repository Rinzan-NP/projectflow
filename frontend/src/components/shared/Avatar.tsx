import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const COLORS = [
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-purple-500 text-white",
  "bg-amber-500 text-white",
  "bg-rose-500 text-white",
  "bg-indigo-500 text-white",
  "bg-teal-500 text-white",
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, size = "sm", className }: AvatarProps) {
  if (!name) {
    return (
      <div
        className={cn(
          "rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground font-semibold select-none",
          size === "xs" && "h-5 w-5 text-[10px]",
          size === "sm" && "h-6 w-6 text-xs",
          size === "md" && "h-8 w-8 text-sm",
          size === "lg" && "h-10 w-10 text-base",
          className
        )}
        title="Unassigned"
      >
        ?
      </div>
    );
  }

  const initials = getInitials(name);
  const colorClass = getColor(name);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold select-none shrink-0 shadow-sm",
        colorClass,
        size === "xs" && "h-5 w-5 text-[10px]",
        size === "sm" && "h-6 w-6 text-xs",
        size === "md" && "h-8 w-8 text-sm",
        size === "lg" && "h-10 w-10 text-base",
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
