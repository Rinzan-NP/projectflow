import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectSchema } from "@/lib/validations";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.project.findFirst({
      where: {
        OR: [{ id }, { key: id.toUpperCase() }],
      },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
        labels: true,
        milestones: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(json.name && { name: json.name }),
        ...(json.company && { company: json.company }),
        ...(json.description !== undefined && { description: json.description }),
        ...(json.color && { color: json.color }),
        ...(json.icon && { icon: json.icon }),
        ...(json.status && { status: json.status }),
        ...(json.startDate !== undefined && {
          startDate: json.startDate ? new Date(json.startDate) : null,
        }),
        ...(json.targetDate !== undefined && {
          targetDate: json.targetDate ? new Date(json.targetDate) : null,
        }),
        ...(json.owner && { owner: json.owner }),
        ...(json.members && { members: json.members }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
