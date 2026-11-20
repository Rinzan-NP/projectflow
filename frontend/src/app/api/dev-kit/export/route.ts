import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const projectKey = searchParams.get("projectKey");

    const where: any = {};
    if (projectKey && projectKey !== "ALL") {
      where.key = projectKey.toUpperCase();
    }

    const projects = await db.project.findMany({
      where,
      include: {
        stages: { orderBy: { order: "asc" } },
        items: {
          include: {
            stage: true,
            labels: { include: { label: true } },
            checklists: true,
            comments: true,
            attachments: true,
          },
        },
      },
    });

    if (format === "csv") {
      const rows: string[] = [];
      rows.push("Project,Key,Company,HumanID,Type,Title,Stage,Priority,Assignee,Severity,DueDate,CreatedAt");

      for (const p of projects) {
        for (const i of p.items) {
          const safeTitle = `"${(i.title || "").replace(/"/g, '""')}"`;
          rows.push(
            [
              `"${p.name}"`,
              p.key,
              `"${p.company}"`,
              i.humanId,
              i.type,
              safeTitle,
              `"${i.stage?.name || ""}"`,
              i.priority,
              `"${i.assignee || "Unassigned"}"`,
              i.severity || "",
              i.dueDate ? new Date(i.dueDate).toISOString().split("T")[0] : "",
              new Date(i.createdAt).toISOString().split("T")[0],
            ].join(",")
          );
        }
      }

      return new NextResponse(rows.join("\n"), {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="projects-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
