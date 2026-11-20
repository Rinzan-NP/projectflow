import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.item.findFirst({
      where: {
        OR: [{ id }, { humanId: id.toUpperCase() }],
      },
      include: {
        project: {
          include: {
            stages: { orderBy: { order: "asc" } },
            labels: true,
            milestones: true,
          },
        },
        stage: true,
        labels: { include: { label: true } },
        checklists: { orderBy: { order: "asc" } },
        comments: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
        subtasks: {
          orderBy: { order: "asc" },
          include: { stage: true },
        },
        parent: true,
        milestone: true,
      },
    });

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await req.json();

    const currentItem = await db.item.findUnique({
      where: { id },
      include: { stage: true },
    });
    if (!currentItem) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const updateData: any = {};
    const activitiesToCreate: any[] = [];

    // Fields updates
    if (json.title !== undefined) updateData.title = json.title;
    if (json.description !== undefined) updateData.description = json.description;
    if (json.type !== undefined) updateData.type = json.type;
    if (json.priority !== undefined) {
      updateData.priority = json.priority;
      activitiesToCreate.push({
        author: json.author || "Alex Rivers",
        action: "PRIORITY_CHANGED",
        fromValue: currentItem.priority,
        toValue: json.priority,
      });
    }
    if (json.assignee !== undefined) {
      updateData.assignee = json.assignee;
      activitiesToCreate.push({
        author: json.author || "Alex Rivers",
        action: "ASSIGNED",
        fromValue: currentItem.assignee || "Unassigned",
        toValue: json.assignee || "Unassigned",
      });
    }
    if (json.dueDate !== undefined) {
      updateData.dueDate = json.dueDate ? new Date(json.dueDate) : null;
    }
    if (json.estimateHours !== undefined) {
      updateData.estimateHours = json.estimateHours;
    }

    // Stage change logic
    if (json.stageId && json.stageId !== currentItem.stageId) {
      const targetStage = await db.stage.findUnique({ where: { id: json.stageId } });
      if (targetStage) {
        updateData.stageId = targetStage.id;
        updateData.completedAt = targetStage.isDoneStage ? new Date() : null;

        activitiesToCreate.push({
          author: json.author || "Alex Rivers",
          action: "STAGE_CHANGED",
          fromValue: currentItem.stage.name,
          toValue: targetStage.name,
        });
      }
    }

    // Bug specific
    if (json.severity !== undefined) updateData.severity = json.severity;
    if (json.stepsToReproduce !== undefined) updateData.stepsToReproduce = json.stepsToReproduce;
    if (json.expectedResult !== undefined) updateData.expectedResult = json.expectedResult;
    if (json.actualResult !== undefined) updateData.actualResult = json.actualResult;
    if (json.environment !== undefined) updateData.environment = json.environment;
    if (json.source !== undefined) updateData.source = json.source;

    // Feature specific
    if (json.userStory !== undefined) updateData.userStory = json.userStory;
    if (json.requestedBy !== undefined) updateData.requestedBy = json.requestedBy;

    // Checklist item toggle or add
    if (json.toggleChecklistId !== undefined) {
      const checkItem = await db.checklistItem.findUnique({ where: { id: json.toggleChecklistId } });
      if (checkItem) {
        await db.checklistItem.update({
          where: { id: checkItem.id },
          data: { isDone: !checkItem.isDone },
        });
      }
    } else if (json.addChecklistText) {
      await db.checklistItem.create({
        data: {
          itemId: currentItem.id,
          text: json.addChecklistText,
        },
      });
    }

    // New comment
    if (json.newCommentBody) {
      await db.comment.create({
        data: {
          itemId: currentItem.id,
          author: json.commentAuthor || "Alex Rivers",
          body: json.newCommentBody,
        },
      });
    }

    const updated = await db.item.update({
      where: { id },
      data: {
        ...updateData,
        activityLogs: activitiesToCreate.length > 0 ? { create: activitiesToCreate } : undefined,
      },
      include: {
        stage: true,
        labels: { include: { label: true } },
        checklists: { orderBy: { order: "asc" } },
        comments: { orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
        subtasks: { include: { stage: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/items/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.item.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
