import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProjectNavTabs } from "@/components/layout/ProjectNavTabs";
import { ProjectAccessGuard } from "@/components/projects/ProjectAccessGuard";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const backendUrl =
    process.env.BACKEND_URL || "https://projectflow-api-sgm3.onrender.com";

  let project: any = null;
  try {
    const res = await fetch(
      `${backendUrl}/api/projects/${encodeURIComponent(key)}`,
      { cache: "no-store" }
    );
    if (res.ok) {
      project = await res.json();
    }
  } catch (err) {
    console.error("Failed to fetch project in layout:", err);
  }

  if (!project) {
    notFound();
  }

  const stages = project.stages || [];
  const doneStageIds = new Set(
    stages.filter((s: any) => s.isDoneStage).map((s: any) => s.id)
  );
  const totalItems = project.totalItems ?? 0;
  const doneItems = project.doneItems ?? 0;
  const progressPercent =
    project.progressPercent ??
    (totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100));

  return (
    <ProjectAccessGuard projectCompany={project.company} projectName={project.name}>
      <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
        {/* Project Subheader */}
        <div className="border-b bg-card px-4 sm:px-6 pt-4 pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            {/* Breadcrumb & Project Identity */}
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                style={{ backgroundColor: project.color || "#3b82f6" }}
              >
                {project.key?.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/projects"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Projects
                  </Link>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <h1 className="text-base font-bold text-foreground tracking-tight">
                    {project.name}
                  </h1>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground font-semibold">
                    {project.key}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Progress:</span>
                <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${progressPercent}%`,
                      backgroundColor: project.color || "#3b82f6",
                    }}
                  />
                </div>
                <span className="font-bold">{progressPercent}%</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {doneItems}/{totalItems} items completed
              </span>
            </div>
          </div>

          {/* View Tabs */}
          <ProjectNavTabs projectKey={project.key} />
        </div>

        {/* Main Content View */}
        <div className="flex-1 p-4 sm:p-6 bg-background/50">{children}</div>
      </div>
    </ProjectAccessGuard>
  );
}
