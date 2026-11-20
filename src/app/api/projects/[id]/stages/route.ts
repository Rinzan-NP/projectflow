import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stageSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findFirst({
      where: { OR: [{ id }, { key: id.toUpperCase() }] },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const stages = await db.stage.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json(stages);
  } catch (error: any) {
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
    const parsed = stageSchema.parse(json);

    // Get current max order
    const lastStage = await db.stage.findFirst({
      where: { projectId: project.id },
      orderBy: { order: "desc" },
    });
    const nextOrder = lastStage ? lastStage.order + 1 : 0;

    const stage = await db.stage.create({
      data: {
        projectId: project.id,
        name: parsed.name,
        color: parsed.color || "#64748b",
        isDoneStage: parsed.isDoneStage,
        wipLimit: parsed.wipLimit,
        order: parsed.order ?? nextOrder,
      },
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findFirst({
      where: { OR: [{ id }, { key: id.toUpperCase() }] },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const { stages } = await req.json(); // array of { id, order }

    await db.$transaction(
      stages.map((s: { id: string; order: number }) =>
        db.stage.update({
          where: { id: s.id },
          data: { order: s.order },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
