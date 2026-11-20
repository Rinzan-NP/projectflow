import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const company = searchParams.get("company");
    const query = searchParams.get("q");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (company && company !== "ALL") {
      where.company = company;
    }
    if (query) {
      where.OR = [
        { name: { contains: query } },
        { key: { contains: query } },
        { description: { contains: query } },
      ];
    }

    const projects = await db.project.findMany({
      where,
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        items: {
          select: {
            id: true,
            type: true,
            dueDate: true,
            completedAt: true,
            stageId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();

    const enriched = projects.map((project) => {
      const doneStageIds = new Set(
        project.stages.filter((s) => s.isDoneStage).map((s) => s.id)
      );

      const totalItems = project.items.length;
      const doneItems = project.items.filter((item) =>
        doneStageIds.has(item.stageId)
      ).length;
      const progressPercent =
        totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);

      const openBugsCount = project.items.filter(
        (item) => item.type === "BUG" && !doneStageIds.has(item.stageId)
      ).length;

      const openFeaturesCount = project.items.filter(
        (item) => item.type === "FEATURE" && !doneStageIds.has(item.stageId)
      ).length;

      const overdueCount = project.items.filter((item) => {
        if (!item.dueDate || doneStageIds.has(item.stageId)) return false;
        return new Date(item.dueDate) < now;
      }).length;

      return {
        ...project,
        totalItems,
        doneItems,
        progressPercent,
        openBugsCount,
        openFeaturesCount,
        overdueCount,
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = projectSchema.parse(json);

    // Check if key already exists
    const existing = await db.project.findUnique({
      where: { key: parsed.key.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Project key "${parsed.key}" is already taken` },
        { status: 400 }
      );
    }

    const defaultStages = [
      { name: "Backlog", order: 0, color: "#94a3b8", isDoneStage: false },
      { name: "To Do", order: 1, color: "#38bdf8", isDoneStage: false, wipLimit: 10 },
      { name: "In Progress", order: 2, color: "#f59e0b", isDoneStage: false, wipLimit: 5 },
      { name: "In Review", order: 3, color: "#a855f7", isDoneStage: false, wipLimit: 5 },
      { name: "Testing", order: 4, color: "#ec4899", isDoneStage: false },
      { name: "Done", order: 5, color: "#10b981", isDoneStage: true },
    ];

    const project = await db.project.create({
      data: {
        name: parsed.name,
        key: parsed.key.toUpperCase(),
        company: parsed.company || "Company 1",
        description: parsed.description,
        color: parsed.color,
        icon: parsed.icon,
        status: parsed.status,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        targetDate: parsed.targetDate ? new Date(parsed.targetDate) : null,
        owner: parsed.owner,
        members: parsed.members,
        stages: {
          create: defaultStages,
        },
        labels: {
          create: [
            { name: "frontend", color: "#38bdf8" },
            { name: "backend", color: "#818cf8" },
            { name: "ui/ux", color: "#ec4899" },
            { name: "bug", color: "#f43f5e" },
          ],
        },
      },
      include: {
        stages: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: 500 }
    );
  }
}
