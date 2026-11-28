"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  CheckCircle2,
  Search,
  Plus,
  ChevronDown,
  Building2,
  FolderKanban,
  Kanban,
  ListFilter,
  Bug,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  FileText,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "@/components/shared/Avatar";
import { ProjectFlowIcon } from "@/components/shared/ProjectFlowIcon";
import { useAuth } from "@/lib/auth";

interface SidebarProps {
  onOpenCommandPalette: () => void;
  onOpenQuickCreate: () => void;
}

export function Sidebar({ onOpenCommandPalette, onOpenQuickCreate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedProjectKey, setExpandedProjectKey] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);

        // Extract distinct companies
        const distinctCompanies = Array.from(
          new Set(data.map((p: any) => p.company).filter(Boolean))
        ) as string[];
        setCompanies(distinctCompanies);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [pathname]);

  // If currently in a project route (/projects/CRM/...), auto-expand that project
  useEffect(() => {
    const match = pathname.match(/^\/projects\/([A-Za-z0-9_-]+)/);
    if (match && match[1] && match[1] !== "page") {
      setExpandedProjectKey(match[1].toUpperCase());
    }
  }, [pathname]);

  // Effective company filter: locked to user.company for clients, or selectedCompany for admin
  const effectiveCompany = user?.company !== "ALL" ? (user?.company || "ALL") : selectedCompany;

  // Filter projects by selected company
  const filteredProjects = projects.filter((p) => {
    if (effectiveCompany === "ALL") return true;
    return p.company === effectiveCompany;
  });

  return (
    <aside
      className={`relative border-r bg-card flex flex-col shrink-0 transition-all duration-200 z-30 select-none ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top Header: Company Selector & Brand */}
      <div className="p-3.5 border-b flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <Link
              href="/projects"
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-85 transition-opacity"
            >
              <ProjectFlowIcon size={24} className="h-6 w-6 rounded-md shadow-xs shrink-0" />
              <span className="text-sm font-semibold tracking-tight">ProjectFlow</span>
            </Link>
          ) : (
            <Link
              href="/projects"
              className="mx-auto flex items-center justify-center hover:opacity-85 transition-opacity"
              title="ProjectFlow"
            >
              <ProjectFlowIcon size={26} className="h-6.5 w-6.5 rounded-md shadow-xs" />
            </Link>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Company Switcher */}
        {!collapsed && (
          <div className="relative mt-1">
            {user?.company !== "ALL" ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-semibold text-primary truncate">
                  {user?.company} Workspace
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/60 border border-border/80 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full bg-transparent font-medium text-xs text-foreground cursor-pointer outline-none truncate"
                  title="Filter by Company"
                >
                  <option value="ALL">All Companies ({companies.length})</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Action Button: New Item */}
      <div className="p-3 pb-1">
        <button
          onClick={onOpenQuickCreate}
          className={`w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs py-2 px-3 shadow-xs hover:bg-primary/90 transition-all cursor-pointer ${
            collapsed ? "px-0" : ""
          }`}
          title="New Work Item (C)"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>New Item</span>}
          {!collapsed && (
            <kbd className="ml-auto text-[10px] font-mono bg-primary-foreground/20 px-1 rounded opacity-80">
              C
            </kbd>
          )}
        </button>
      </div>

      {/* Search Trigger */}
      <div className="px-3 pt-1 pb-2">
        <button
          onClick={onOpenCommandPalette}
          className={`w-full flex items-center gap-2 rounded-lg border border-input/60 bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground text-xs py-1.5 px-2.5 transition-colors cursor-pointer ${
            collapsed ? "justify-center px-0" : "justify-between"
          }`}
          title="Search or jump to (Cmd+K)"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Search...</span>}
          </div>
          {!collapsed && (
            <kbd className="text-[10px] font-mono bg-background px-1 rounded border">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Main Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4 text-xs">
        {/* Core Links */}
        <div className="space-y-0.5">
          <Link
            href="/projects"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === "/projects"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            title="Projects Dashboard"
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-blue-500" />
            {!collapsed && <span>Projects</span>}
          </Link>

          <Link
            href="/board"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === "/board"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            title="All Projects Kanban Board"
          >
            <Kanban className="h-4 w-4 shrink-0 text-amber-500" />
            {!collapsed && <span>Board</span>}
          </Link>

          <Link
            href="/my-work"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === "/my-work"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            title="My Work"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            {!collapsed && <span>My Work</span>}
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === "/documents"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            title="Company Documents & Knowledge Base"
          >
            <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
            {!collapsed && <span>Documents</span>}
          </Link>

          <Link
            href="/documents"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              pathname === "/documents"
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            title="Company Documents"
          >
            <FileText className="h-4 w-4 shrink-0 text-indigo-500" />
            {!collapsed && <span>Documents</span>}
          </Link>
        </div>

        {/* Project Tree */}
        {!collapsed && (
          <div>
            <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Projects</span>
              <span className="text-[10px] font-mono font-normal">
                {filteredProjects.length}
              </span>
            </div>

            <div className="space-y-1 mt-1">
              {filteredProjects.map((proj) => {
                const isExpanded = expandedProjectKey === proj.key;
                const isCurrentProject = pathname.startsWith(`/projects/${proj.key}`);

                return (
                  <div key={proj.id} className="rounded-lg">
                    {/* Project header row */}
                    <div
                      onClick={() =>
                        setExpandedProjectKey(isExpanded ? null : proj.key)
                      }
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isCurrentProject
                          ? "bg-muted/80 text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono opacity-70">
                          {proj.key}
                        </span>
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Sub-routes under project */}
                    {isExpanded && (
                      <div className="ml-4 pl-2 border-l border-border/80 my-1 space-y-0.5 text-[11px]">
                        <Link
                          href={`/projects/${proj.key}/board`}
                          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                            pathname === `/projects/${proj.key}/board`
                              ? "text-primary font-bold bg-primary/10"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Kanban className="h-3 w-3" />
                          <span>Board</span>
                        </Link>
                        <Link
                          href={`/projects/${proj.key}/list`}
                          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                            pathname === `/projects/${proj.key}/list`
                              ? "text-primary font-bold bg-primary/10"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <ListFilter className="h-3 w-3" />
                          <span>List</span>
                        </Link>
                        <Link
                          href={`/projects/${proj.key}/bugs`}
                          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                            pathname === `/projects/${proj.key}/bugs`
                              ? "text-rose-500 font-bold bg-rose-500/10"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Bug className="h-3 w-3" />
                          <span>Bugs</span>
                        </Link>
                        <Link
                          href={`/projects/${proj.key}/roadmap`}
                          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                            pathname === `/projects/${proj.key}/roadmap`
                              ? "text-purple-500 font-bold bg-purple-500/10"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Roadmap</span>
                        </Link>
                        <Link
                          href={`/projects/${proj.key}/settings`}
                          className={`flex items-center gap-2 px-2 py-1 rounded transition-colors ${
                            pathname === `/projects/${proj.key}/settings`
                              ? "text-foreground font-bold bg-muted"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Settings className="h-3 w-3" />
                          <span>Settings</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom User Bar with Profile & Logout */}
      <div className="p-3 border-t flex items-center justify-between gap-2 bg-card">
        <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
          <div
            className="h-8 w-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs"
            style={{ backgroundColor: user?.avatarBg || "#2563eb" }}
          >
            {user?.avatarText || "U"}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.name || "User"}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {user?.company === "ALL" ? "All Companies" : `${user?.company} Company`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!collapsed && <ThemeToggle />}
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
