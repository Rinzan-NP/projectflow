import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { itemSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const project = await db.project.findFirst({
      where: { OR: [{ id }, { key: id.toUpperCase() }] },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const type = searchParams.get("type");
    const priority = searchParams.get("priority");
    const assignee = searchParams.get("assignee");
    const label = searchParams.get("label");
    const search = searchParams.get("search");

    const where: any = {
      projectId: project.id,
    };

    if (type && type !== "ALL") where.type = type;
    if (priority && priority !== "ALL") where.priority = priority;
    if (assignee && assignee !== "ALL") {
      if (assignee === "UNASSIGNED") where.assignee = null;
      else where.assignee = assignee;
    }
    if (label && label !== "ALL") {
      where.labels = {
        some: {
          label: { name: label },
        },
      };
    }
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { humanId: { contains: search.trim().toUpperCase() } },
        { description: { contains: search.trim() } },
      ];
    }

    const items = await db.item.findMany({
      where,
      orderBy: [{ stageId: "asc" }, { order: "asc" }],
      include: {
        stage: true,
        labels: {
          include: { label: true },
        },
        checklists: {
          orderBy: { order: "asc" },
        },
        comments: {
          orderBy: { createdAt: "desc" },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        subtasks: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("GET /api/projects/[id]/items error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findFirst({
      where: { OR: [{ id }, { key: id.toUpperCase() }] },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const json = await req.json();
    const parsed = itemSchema.parse(json);

    // Increment item counter atomically
    const updatedProject = await db.project.update({
      where: { id: project.id },
      data: { itemCounter: { increment: 1 } },
    });

    const itemNumber = updatedProject.itemCounter;
    const humanId = `${project.key}-${itemNumber}`;

    // Verify stage
    const stage = await db.stage.findUnique({
      where: { id: parsed.stageId },
    });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

    // Calculate order at the bottom of the stage
    const lastItemInStage = await db.item.findFirst({
      where: { stageId: stage.id },
      orderBy: { order: "desc" },
    });
    const order = lastItemInStage ? lastItemInStage.order + 1.0 : 1.0;

    const item = await db.item.create({
      data: {
        humanId,
        itemNumber,
        projectId: project.id,
        stageId: stage.id,
        type: parsed.type,
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        assignee: parsed.assignee,
        reporter: parsed.reporter || "Alex Rivers",
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        estimateHours: parsed.estimateHours,
        order,
        parentId: parsed.parentId,
        milestoneId: parsed.milestoneId,
        // Bug
        severity: parsed.severity,
        stepsToReproduce: parsed.stepsToReproduce,
        expectedResult: parsed.expectedResult,
        actualResult: parsed.actualResult,
        environment: parsed.environment,
        source: parsed.source,
        // Feature
        userStory: parsed.userStory,
        requestedBy: parsed.requestedBy,
        completedAt: stage.isDoneStage ? new Date() : null,
        activityLogs: {
          create: {
            author: parsed.reporter || "Alex Rivers",
            action: "CREATED",
            toValue: humanId,
          },
        },
      },
      include: {
        stage: true,
        labels: { include: { label: true } },
        checklists: true,
        comments: true,
        subtasks: true,
      },
    });

    // Handle labels if provided
    if (parsed.labels && parsed.labels.length > 0) {
      for (const labelName of parsed.labels) {
        let label = await db.label.findUnique({
          where: { projectId_name: { projectId: project.id, name: labelName } },
        });
        if (!label) {
          label = await db.label.create({
            data: { projectId: project.id, name: labelName },
          });
        }
        await db.itemLabel.create({
          data: { itemId: item.id, labelId: label.id },
        });
      }
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/projects/[id]/items error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
