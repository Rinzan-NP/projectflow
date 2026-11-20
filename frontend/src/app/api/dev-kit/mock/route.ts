import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ItemType, Priority, BugSeverity, BugSource } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { action, projectKey } = await req.json();

    const project = await db.project.findFirst({
      where: projectKey ? { key: projectKey.toUpperCase() } : undefined,
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "No project found" }, { status: 404 });
    }

    const firstStage = project.stages[0] || null;
    if (!firstStage) {
      return NextResponse.json({ error: "Project has no stages" }, { status: 400 });
    }

    if (action === "GENERATE_BUGS") {
      const mockBugs = [
        {
          title: "Memory leak in data table virtualizer after 500 rows",
          sev: BugSeverity.MAJOR,
          steps: "1. Scroll down rapidly in table\n2. Open memory profiler\n3. Memory heap climbs from 40MB to 450MB",
          exp: "Memory garbage collected smoothly",
          act: "Browser tab lags and eventually crashes",
          env: "Chrome 124 / macOS M2",
          src: BugSource.INTERNAL,
        },
        {
          title: "OAuth redirect callback fails with state mismatch on Safari",
          sev: BugSeverity.BLOCKER,
          steps: "1. Click Login with Google on Safari\n2. Authorize account\n3. Redirection loops with 401 error",
          exp: "Session JWT cookie saved and dashboard opens",
          act: "Alert: 'Invalid state parameter'",
          env: "Safari 17.4 / iOS 17 & macOS",
          src: BugSource.CLIENT_REPORTED,
        },
        {
          title: "Dark mode contrast ratio fails accessibility on active tab",
          sev: BugSeverity.TRIVIAL,
          steps: "Inspect active tab color with WCAG contrast checker",
          exp: "Contrast >= 4.5:1",
          act: "Contrast ratio is 3.1:1",
          env: "All browsers",
          src: BugSource.INTERNAL,
        },
        {
          title: "Audio voice note upload throws 413 Payload Too Large",
          sev: BugSeverity.MINOR,
          steps: "Record audio longer than 2 minutes and submit",
          exp: "Audio saves and renders player",
          act: "Toast error: 413 Payload Too Large",
          env: "Production API",
          src: BugSource.CLIENT_REPORTED,
        },
        {
          title: "Filter by assignee drops unassigned items from results",
          sev: BugSeverity.MINOR,
          steps: "Select 'Unassigned' in assignee dropdown",
          exp: "Shows all items with null assignee",
          act: "Returns empty list",
          env: "Staging v1.2",
          src: BugSource.INTERNAL,
        },
      ];

      const createdItems = [];
      for (const b of mockBugs) {
        const updatedP = await db.project.update({
          where: { id: project.id },
          data: { itemCounter: { increment: 1 } },
        });
        const humanId = `${project.key}-${updatedP.itemCounter}`;

        const item = await db.item.create({
          data: {
            humanId,
            itemNumber: updatedP.itemCounter,
            projectId: project.id,
            stageId: firstStage.id,
            type: ItemType.BUG,
            title: b.title,
            priority: b.sev === BugSeverity.BLOCKER ? Priority.CRITICAL : Priority.HIGH,
            severity: b.sev,
            source: b.src,
            stepsToReproduce: b.steps,
            expectedResult: b.exp,
            actualResult: b.act,
            environment: b.env,
            assignee: "Alex Rivers",
          },
        });
        createdItems.push(item);
      }

      return NextResponse.json({ success: true, count: createdItems.length });
    }

    if (action === "GENERATE_FEATURES") {
      const mockFeatures = [
        {
          title: "Automated Slack notification on stage move",
          story: "As a project manager, I want webhook alerts posted to #dev channel when tasks enter 'In Review'",
          req: "Internal Dev Team",
        },
        {
          title: "Export project work items to CSV and PDF",
          story: "As a client stakeholder, I want to download monthly milestone progress reports",
          req: "Client Enterprise",
        },
        {
          title: "Voice note transcription using Web Speech API",
          story: "As a field engineer, I want my voice attachments transcribed into item descriptions",
          req: "Product Roadmap",
        },
        {
          title: "Custom tag colors and multi-label filtering",
          story: "As an engineer, I want to filter by multiple labels simultaneously using AND/OR logic",
          req: "UX Guild",
        },
        {
          title: "Two-factor authentication (2FA) with TOTP",
          story: "As a security admin, I want to require authenticator app codes for team members",
          req: "SOC2 Compliance",
        },
      ];

      const createdItems = [];
      for (const f of mockFeatures) {
        const updatedP = await db.project.update({
          where: { id: project.id },
          data: { itemCounter: { increment: 1 } },
        });
        const humanId = `${project.key}-${updatedP.itemCounter}`;

        const item = await db.item.create({
          data: {
            humanId,
            itemNumber: updatedP.itemCounter,
            projectId: project.id,
            stageId: firstStage.id,
            type: ItemType.FEATURE,
            title: f.title,
            priority: Priority.MEDIUM,
            userStory: f.story,
            requestedBy: f.req,
            assignee: "Sam Taylor",
          },
        });
        createdItems.push(item);
      }

      return NextResponse.json({ success: true, count: createdItems.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Dev kit mock error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
