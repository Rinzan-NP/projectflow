import React from "react";
import { notFound } from "next/navigation";
import { KanbanBoard } from "@/components/board/KanbanBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const backendUrl =
    process.env.BACKEND_URL || "https://projectflow-api-sgm3.onrender.com";

  let project: any = null;
  let items: any[] = [];

  try {
    const [projectRes, itemsRes] = await Promise.all([
      fetch(`${backendUrl}/api/projects/${encodeURIComponent(key)}`, {
        cache: "no-store",
      }),
      fetch(`${backendUrl}/api/projects/${encodeURIComponent(key)}/items`, {
        cache: "no-store",
      }),
    ]);

    if (projectRes.ok) {
      project = await projectRes.json();
    }
    if (itemsRes.ok) {
      items = await itemsRes.json();
    }
  } catch (err) {
    console.error("Failed to load board data:", err);
  }

  if (!project) notFound();

  return (
    <div className="h-full">
      <KanbanBoard
        projectKey={project.key}
        initialStages={project.stages || []}
        initialItems={items || []}
      />
    </div>
  );
}
