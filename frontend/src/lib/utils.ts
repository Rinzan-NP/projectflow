import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const PRIORITY_CONFIG = {
  CRITICAL: { label: "Critical", color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", icon: "Flame" },
  HIGH: { label: "High", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", icon: "ArrowUp" },
  MEDIUM: { label: "Medium", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", icon: "Equal" },
  LOW: { label: "Low", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: "ArrowDown" },
};

export const TYPE_CONFIG = {
  TASK: { label: "Task", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/30", icon: "CheckSquare" },
  BUG: { label: "Bug", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/30", icon: "Bug" },
  FEATURE: { label: "Feature", color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/30", icon: "Sparkles" },
  IMPROVEMENT: { label: "Improvement", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", icon: "TrendingUp" },
  CHORE: { label: "Chore", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30", icon: "Wrench" },
};

export const SEVERITY_CONFIG = {
  BLOCKER: { label: "Blocker", color: "text-rose-600 bg-rose-600/15 border-rose-600/30" },
  MAJOR: { label: "Major", color: "text-red-500 bg-red-500/15 border-red-500/30" },
  MINOR: { label: "Minor", color: "text-amber-500 bg-amber-500/15 border-amber-500/30" },
  TRIVIAL: { label: "Trivial", color: "text-slate-400 bg-slate-500/15 border-slate-500/30" },
};
