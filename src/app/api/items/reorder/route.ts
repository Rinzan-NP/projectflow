import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Batch update order & stageId for drag & drop
export async function PUT(req: Request) {
  try {
    const { items } = await req.json(); // array of { id, stageId, order }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items payload" }, { status: 400 });
    }

    // We also check if target stage is done to set/clear completedAt
    const stageIds = Array.from(new Set(items.map((i: any) => i.stageId).filter(Boolean)));
    const stages = await db.stage.findMany({
      where: { id: { in: stageIds } },
    });
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    await db.$transaction(
      items.map((item: any) => {
        const stage = stageMap.get(item.stageId);
        return db.item.update({
          where: { id: item.id },
          data: {
            stageId: item.stageId,
            order: item.order,
            ...(stage && {
              completedAt: stage.isDoneStage ? new Date() : null,
            }),
          },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PUT /api/items/reorder error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
