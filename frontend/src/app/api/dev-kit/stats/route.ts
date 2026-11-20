import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const [projectCount, itemCount, bugCount, featureCount, attachmentCount] =
      await Promise.all([
        db.project.count(),
        db.item.count(),
        db.item.count({ where: { type: "BUG" } }),
        db.item.count({ where: { type: "FEATURE" } }),
        db.attachment.count(),
      ]);

    // Companies list
    const projects = await db.project.findMany({ select: { company: true } });
    const companies = Array.from(new Set(projects.map((p) => p.company).filter(Boolean)));

    // Check uploads folder size
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    let uploadSizeBytes = 0;
    let uploadFileCount = 0;
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      uploadFileCount = files.length;
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(uploadDir, file));
          uploadSizeBytes += stat.size;
        } catch (e) {}
      }
    }

    // Check database file size
    let dbSizeBytes = 0;
    const dbPath = path.join(process.cwd(), "dev.db");
    if (fs.existsSync(dbPath)) {
      dbSizeBytes = fs.statSync(dbPath).size;
    }

    return NextResponse.json({
      projects: projectCount,
      items: itemCount,
      bugs: bugCount,
      features: featureCount,
      attachments: attachmentCount,
      companies,
      uploadFiles: uploadFileCount,
      uploadSizeKB: Math.round(uploadSizeBytes / 1024),
      dbSizeKB: Math.round(dbSizeBytes / 1024),
      environment: process.env.NODE_ENV || "development",
      storageLocation: uploadDir,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
