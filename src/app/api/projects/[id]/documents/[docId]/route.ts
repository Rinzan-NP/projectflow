import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const document = await db.projectDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const body = await req.json();
    const { title, description, category, content } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (content !== undefined) data.content = content;

    const document = await db.projectDocument.update({
      where: { id: docId },
      data,
    });

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const document = await db.projectDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Try deleting file from disk if local
    if (document.fileUrl && document.fileUrl.startsWith("/api/uploads/")) {
      const fileName = document.fileUrl.replace("/api/uploads/", "");
      const filePath = path.join(process.cwd(), "public", "uploads", fileName);
      try {
        await unlink(filePath);
      } catch (err) {
        console.warn("Could not delete file from disk:", err);
      }
    }

    await db.projectDocument.delete({
      where: { id: docId },
    });

    return NextResponse.json({ success: true, message: "Document deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
