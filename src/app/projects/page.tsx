"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, FolderKanban, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { EditProjectModal } from "@/components/projects/EditProjectModal";
import { useAuth } from "@/lib/auth";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [companies, setCompanies] = useState<string[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const effectiveCompany = user.company !== "ALL" ? user.company : companyFilter;

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (effectiveCompany !== "ALL") params.set("company", effectiveCompany);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);

        const distinct = Array.from(
          new Set(data.map((p: any) => p.company).filter(Boolean))
        ) as string[];
        if (distinct.length > 0) setCompanies(distinct);
      }
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, companyFilter, user.company]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {user.company !== "ALL" ? `${user.company} Projects` : "Projects Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user.company !== "ALL"
              ? `Manage ${user.company} projects, monitor completion progress, and track open issues.`
              : "Manage projects, monitor completion progress, and track open issues."}
          </p>
        </div>

        {user.company === "ALL" && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 shadow-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-card border rounded-lg p-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects by name, key, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Company Filter (only visible for Admin, badge shown for clients) */}
          {user.company !== "ALL" ? (
            <div className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-md px-2.5 py-1.5 font-semibold">
              {user.company} Workspace
            </div>
          ) : companies.length > 0 ? (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="text-xs bg-background border rounded-md px-2.5 py-1.5 font-medium text-foreground cursor-pointer"
            >
              <option value="ALL">All Companies</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : null}

          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          {(["ALL", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {status === "ALL" ? "All" : status.replace("_", " ")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card/50">
          <FolderKanban className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            No projects found
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            {searchQuery
              ? `No projects match "${searchQuery}". Try adjusting your filters.`
              : "Get started by creating your first project with custom workflow stages."}
          </p>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Project</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={(p) => setEditingProject(p)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchProjects()}
      />

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          isOpen={!!editingProject}
          onClose={() => setEditingProject(null)}
          onUpdate={() => fetchProjects()}
          onDelete={() => fetchProjects()}
        />
      )}
    </div>
  );
}
