import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { ArrowLeft } from "lucide-react";

export default async function ItemStandalonePage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  const backendUrl =
    process.env.BACKEND_URL || "https://projectflow-api-sgm3.onrender.com";

  let project: any = null;
  let item: any = null;

  try {
    const [projectRes, itemRes] = await Promise.all([
      fetch(`${backendUrl}/api/projects/${encodeURIComponent(key)}`, {
        cache: "no-store",
      }),
      fetch(`${backendUrl}/api/items/${encodeURIComponent(id)}`, {
        cache: "no-store",
      }),
    ]);

    if (projectRes.ok) {
      project = await projectRes.json();
    }
    if (itemRes.ok) {
      item = await itemRes.json();
    }
  } catch (err) {
    console.error("Failed to load item page data:", err);
  }

  if (!project || !item) notFound();

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
          item={item}
          projectKey={project.key}
          isOpen={true}
          onClose={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
          stages={project.stages || []}
        />
      </div>
    </div>
  );
}
