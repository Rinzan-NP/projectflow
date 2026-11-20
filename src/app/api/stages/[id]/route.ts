import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stageSchema } from "@/lib/validations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const updated = await db.stage.update({
      where: { id },
      data: {
        ...(json.name && { name: json.name }),
        ...(json.color && { color: json.color }),
        ...(json.isDoneStage !== undefined && { isDoneStage: json.isDoneStage }),
        ...(json.wipLimit !== undefined && { wipLimit: json.wipLimit }),
        ...(json.order !== undefined && { order: json.order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const moveToStageId = searchParams.get("moveToStageId");

    // Check if stage has items
    const itemCount = await db.item.count({ where: { stageId: id } });

    if (itemCount > 0) {
      if (!moveToStageId || moveToStageId === id) {
        return NextResponse.json(
          {
            error: "Stage has items. You must specify a target stage to move items to.",
            requiresTargetStage: true,
            itemCount,
          },
          { status: 400 }
        );
      }

      // Verify target stage exists and check if target is a done stage
      const targetStage = await db.stage.findUnique({ where: { id: moveToStageId } });
      if (!targetStage) {
        return NextResponse.json({ error: "Target stage not found" }, { status: 404 });
      }

      // Move items to target stage
      await db.item.updateMany({
        where: { stageId: id },
        data: {
          stageId: moveToStageId,
          completedAt: targetStage.isDoneStage ? new Date() : null,
        },
      });
    }

    await db.stage.delete({ where: { id } });

    return NextResponse.json({ success: true, movedItemsCount: itemCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
