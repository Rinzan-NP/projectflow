"use client";

import React from "react";
import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  Bug,
  Sparkles,
  AlertCircle,
  MoreVertical,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/shared/Avatar";

interface ProjectCardProps {
  project: any;
  onEdit: (project: any) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const members = project.members
    ? project.members.split(",").map((m: string) => m.trim())
    : [project.owner];

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    ON_HOLD: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    ARCHIVED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shadow-xs shrink-0"
              style={{ backgroundColor: project.color }}
            >
              {project.key.slice(0, 3)}
            </div>
            <div>
              <Link
                href={`/projects/${project.key}/board`}
                className="text-base font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
              >
                {project.name}
              </Link>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {project.key}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-muted text-foreground font-semibold border">
                  {project.company || "Company"}
                </span>
                <span className="text-muted-foreground text-xs">•</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-sm border font-medium ${
                    statusColors[project.status] || statusColors.ACTIVE
                  }`}
                >
                  {project.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onEdit(project)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
            title="Project Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] mb-4">
          {project.description || "No description provided."}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-semibold text-foreground">
              {project.progressPercent}%{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                ({project.doneItems}/{project.totalItems} done)
              </span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${project.progressPercent}%`,
                backgroundColor: project.color || "#3b82f6",
              }}
            />
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-b mb-4 text-xs">
          <div className="flex flex-col items-center justify-center p-1.5 rounded-md bg-muted/40">
            <div className="flex items-center gap-1 text-rose-500 font-semibold">
              <Bug className="h-3.5 w-3.5" />
              <span>{project.openBugsCount}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Open Bugs</span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-md bg-muted/40">
            <div className="flex items-center gap-1 text-purple-500 font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{project.openFeaturesCount}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Features</span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-md bg-muted/40">
            <div
              className={`flex items-center gap-1 font-semibold ${
                project.overdueCount > 0 ? "text-amber-500" : "text-muted-foreground"
              }`}
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{project.overdueCount}</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5">Overdue</span>
          </div>
        </div>
      </div>

      {/* Footer: Quick Links & Team Avatars */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex -space-x-1.5 overflow-hidden">
          {members.slice(0, 3).map((m: string, i: number) => (
            <Avatar key={i} name={m} size="xs" className="ring-2 ring-background" />
          ))}
          {members.length > 3 && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-background">
              +{members.length - 3}
            </div>
          )}
        </div>

        <Link
          href={`/projects/${project.key}/board`}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          Open Board &rarr;
        </Link>
      </div>
    </div>
  );
}
