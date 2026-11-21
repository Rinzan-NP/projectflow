import React from "react";
import { KanbanBoard } from "@/components/board/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function GlobalBoardPage() {
  const backendUrl =
    process.env.BACKEND_URL || "https://projectflow-api-sgm3.onrender.com";

  let allProjects: any[] = [];
  let allItems: any[] = [];

  try {
    const [projectsRes, itemsRes] = await Promise.all([
      fetch(`${backendUrl}/api/projects`, {
        cache: "no-store",
      }),
      fetch(`${backendUrl}/api/items`, {
        cache: "no-store",
      }),
    ]);

    if (projectsRes.ok) {
      allProjects = await projectsRes.json();
    }
    if (itemsRes.ok) {
      allItems = await itemsRes.json();
    }
  } catch (err) {
    console.error("Failed to load global board data:", err);
  }

  return (
    <div className="h-full">
      <KanbanBoard
        projectKey="ALL"
        allProjects={allProjects}
        initialStages={[]}
        initialItems={allItems}
      />
    </div>
  );
}
