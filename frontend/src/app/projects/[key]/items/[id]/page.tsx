import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { ArrowLeft } from "lucide-react";

export default async function ItemStandalonePage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;

  const project = await db.project.findFirst({
    where: { key: key.toUpperCase() },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!project) notFound();

  const item = await db.item.findFirst({
    where: {
      OR: [{ id }, { humanId: id.toUpperCase() }],
      projectId: project.id,
    },
    include: {
      stage: true,
      labels: { include: { label: true } },
      checklists: { orderBy: { order: "asc" } },
      comments: { orderBy: { createdAt: "desc" } },
      activityLogs: { orderBy: { createdAt: "desc" } },
      subtasks: { include: { stage: true } },
    },
  });

  if (!item) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link
        href={`/projects/${project.key}/board`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to {project.name} Board</span>
      </Link>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ItemDetailModal
          item={item as any}
          projectKey={project.key}
          isOpen={true}
          onClose={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          stages={project.stages}
        />
      </div>
    </div>
  );
}
