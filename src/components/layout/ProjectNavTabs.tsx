"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Kanban,
  ListFilter,
  Bug,
  Sparkles,
  Settings,
  FileText,
} from "lucide-react";

interface ProjectNavTabsProps {
  projectKey: string;
}

export function ProjectNavTabs({ projectKey }: ProjectNavTabsProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectKey.toUpperCase()}`;

  const tabs = [
    { label: "Board", path: `${basePath}/board`, icon: Kanban },
    { label: "List", path: `${basePath}/list`, icon: ListFilter },
    { label: "Bugs", path: `${basePath}/bugs`, icon: Bug },
    { label: "Roadmap", path: `${basePath}/roadmap`, icon: Sparkles },
    { label: "Docs & KB", path: `${basePath}/docs`, icon: FileText },
    { label: "Stages & Settings", path: `${basePath}/settings`, icon: Settings },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-t pt-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          pathname === tab.path ||
          (tab.label === "Board" && pathname === basePath);

        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
