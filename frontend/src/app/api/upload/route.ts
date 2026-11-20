import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const itemId = formData.get("itemId") as string | null;

    if (!file || !itemId) {
      return NextResponse.json(
        { error: "File and itemId are required" },
        { status: 400 }
      );
    }

    // Verify item exists
    const item = await db.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Safe sanitized filename
    const originalName = file.name || "attachment";
    const ext = path.extname(originalName);
    const baseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40);
    const uniqueFileName = `${Date.now()}-${baseName}${ext || ".bin"}`;

    // Target upload directory in public/uploads for local access
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueFileName);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(filePath, buffer);

    // Save attachment in Prisma database
    const attachment = await db.attachment.create({
      data: {
        itemId: item.id,
        name: originalName,
        url: `/uploads/${uniqueFileName}`,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });

    // Record activity log
    await db.activityLog.create({
      data: {
        itemId: item.id,
        author: "Alex Rivers",
        action: "ATTACHED_FILE",
        toValue: originalName,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
