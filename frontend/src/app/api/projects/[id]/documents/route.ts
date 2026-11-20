import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Support lookup by project ID or project key
    const project = await db.project.findFirst({
      where: {
        OR: [{ id }, { key: id.toUpperCase() }],
      },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = { projectId: project.id };
    if (category && category !== "All") {
      where.category = category;
    }

    const documents = await db.projectDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch project documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db.project.findFirst({
      where: {
        OR: [{ id }, { key: id.toUpperCase() }],
      },
      select: { id: true, owner: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Multipart Form Data (File Upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || (file ? file.name : "Untitled Document");
      const category = (formData.get("category") as string) || "PRD";
      const description = (formData.get("description") as string) || null;
      const author = (formData.get("author") as string) || project.owner || "Alex Rivers";
      const content = (formData.get("content") as string) || null;

      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      let mimeType = null;

      if (file && typeof file === "object" && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate sanitized unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueFileName = `${timestamp}-${safeName}`;

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, uniqueFileName);
        await writeFile(filePath, buffer);

        fileUrl = `/api/uploads/${uniqueFileName}`;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type || "application/octet-stream";
      }

      const document = await db.projectDocument.create({
        data: {
          projectId: project.id,
          title,
          category,
          description,
          content,
          fileUrl,
          fileName,
          fileSize,
          mimeType,
          author,
        },
      });

      return NextResponse.json(document, { status: 201 });
    }

    // JSON Body (Text/Markdown notes or linked docs)
    const body = await req.json();
    const { title, category, description, content, fileUrl, fileName, fileSize, mimeType, author } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const document = await db.projectDocument.create({
      data: {
        projectId: project.id,
        title: title.trim(),
        category: category || "PRD",
        description: description || null,
        content: content || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || (content ? "text/markdown" : null),
        author: author || project.owner || "Alex Rivers",
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Failed to create document:", error);
    return NextResponse.json(
      { error: "Failed to upload/create project document" },
      { status: 500 }
    );
  }
}
