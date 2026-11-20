import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { action, itemIds, value } = await req.json();

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 });
    }

    if (action === "DELETE") {
      await db.item.deleteMany({
        where: { id: { in: itemIds } },
      });
      return NextResponse.json({ success: true, count: itemIds.length });
    }

    if (action === "CHANGE_STAGE") {
      const targetStage = await db.stage.findUnique({ where: { id: value } });
      if (!targetStage) {
        return NextResponse.json({ error: "Target stage not found" }, { status: 404 });
      }

      await db.item.updateMany({
        where: { id: { in: itemIds } },
        data: {
          stageId: value,
          completedAt: targetStage.isDoneStage ? new Date() : null,
        },
      });
      return NextResponse.json({ success: true, count: itemIds.length });
    }

    if (action === "CHANGE_PRIORITY") {
      await db.item.updateMany({
        where: { id: { in: itemIds } },
        data: { priority: value },
      });
      return NextResponse.json({ success: true, count: itemIds.length });
    }

    if (action === "CHANGE_ASSIGNEE") {
      await db.item.updateMany({
        where: { id: { in: itemIds } },
        data: { assignee: value || null },
      });
      return NextResponse.json({ success: true, count: itemIds.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
