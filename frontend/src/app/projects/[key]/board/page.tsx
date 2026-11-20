import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { KanbanBoard } from "@/components/board/KanbanBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await db.project.findFirst({
    where: { key: key.toUpperCase() },
    include: {
      stages: { orderBy: { order: "asc" } },
      items: {
        orderBy: [{ stageId: "asc" }, { order: "asc" }],
        include: {
          stage: true,
          labels: { include: { label: true } },
          checklists: { orderBy: { order: "asc" } },
          comments: { orderBy: { createdAt: "desc" } },
          activityLogs: { orderBy: { createdAt: "desc" }, take: 10 },
          subtasks: { include: { stage: true } },
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <div className="h-full">
      <KanbanBoard
        projectKey={project.key}
        initialStages={project.stages as any}
        initialItems={project.items as any}
      />
    </div>
  );
}
