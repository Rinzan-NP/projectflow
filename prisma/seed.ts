import { PrismaClient, ProjectStatus, ItemType, Priority, BugSeverity, BugSource } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Cleaning database...");
  await prisma.activityLog.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.itemLabel.deleteMany({});
  await prisma.label.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.stage.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.project.deleteMany({});

  console.log("🌱 Creating Project 1: Customer Portal CRM (CRM)...");

  const projectCRM = await prisma.project.create({
    data: {
      name: "Customer Portal CRM",
      key: "CRM",
      company: "Acme Tech",
      description: "Next-gen web client portal, self-service ticketing and analytics dashboard.",
      color: "#3b82f6",
      icon: "Layers",
      status: ProjectStatus.ACTIVE,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      owner: "Alex Rivers",
      members: "Alex Rivers,Sam Taylor,Jordan Lee,Morgan Chen",
      itemCounter: 16,
    },
  });

  const defaultStagesConfig = [
    { name: "Backlog", order: 0, color: "#94a3b8", isDoneStage: false },
    { name: "To Do", order: 1, color: "#38bdf8", isDoneStage: false, wipLimit: 8 },
    { name: "In Progress", order: 2, color: "#f59e0b", isDoneStage: false, wipLimit: 5 },
    { name: "In Review", order: 3, color: "#a855f7", isDoneStage: false, wipLimit: 4 },
    { name: "Testing", order: 4, color: "#ec4899", isDoneStage: false },
    { name: "Done", order: 5, color: "#10b981", isDoneStage: true },
  ];

  const crmStages: Record<string, any> = {};
  for (const s of defaultStagesConfig) {
    const createdStage = await prisma.stage.create({
      data: {
        projectId: projectCRM.id,
        name: s.name,
        order: s.order,
        color: s.color,
        isDoneStage: s.isDoneStage,
        wipLimit: s.wipLimit ?? null,
      },
    });
    crmStages[s.name] = createdStage;
  }

  // Labels for CRM
  const crmLabels: Record<string, any> = {};
  const labelsData = [
    { name: "frontend", color: "#38bdf8" },
    { name: "backend", color: "#818cf8" },
    { name: "security", color: "#f43f5e" },
    { name: "ui/ux", color: "#ec4899" },
    { name: "database", color: "#10b981" },
    { name: "performance", color: "#f59e0b" },
  ];

  for (const l of labelsData) {
    const lbl = await prisma.label.create({
      data: { projectId: projectCRM.id, name: l.name, color: l.color },
    });
    crmLabels[l.name] = lbl;
  }

  // Milestone
  const crmMilestone1 = await prisma.milestone.create({
    data: {
      projectId: projectCRM.id,
      name: "v1.2 Security & OAuth Release",
      targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      description: "Core client login and SSO integrations",
    },
  });

  console.log("🌱 Adding items to CRM...");

  // Feature: Single Sign-On (CRM-1)
  const item1 = await prisma.item.create({
    data: {
      humanId: "CRM-1",
      itemNumber: 1,
      projectId: projectCRM.id,
      stageId: crmStages["In Progress"].id,
      type: ItemType.FEATURE,
      title: "Google Workspace & Okta SAML SSO",
      description: "Implement enterprise single sign-on so enterprise clients can log in using their identity provider.",
      priority: Priority.CRITICAL,
      assignee: "Alex Rivers",
      reporter: "Jordan Lee",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimateHours: 24,
      order: 1.0,
      userStory: "As an IT administrator, I want my team to log in using Okta so we can centrally enforce MFA and revoke access.",
      requestedBy: "Acme Corp (Enterprise Tier)",
      milestoneId: crmMilestone1.id,
    },
  });

  await prisma.itemLabel.createMany({
    data: [
      { itemId: item1.id, labelId: crmLabels["backend"].id },
      { itemId: item1.id, labelId: crmLabels["security"].id },
    ],
  });

  await prisma.checklistItem.createMany({
    data: [
      { itemId: item1.id, text: "Configure SAML assertion parser", isDone: true, order: 1 },
      { itemId: item1.id, text: "Add certificate rollover handler", isDone: true, order: 2 },
      { itemId: item1.id, text: "Unit test OAuth PKCE flows", isDone: false, order: 3 },
      { itemId: item1.id, text: "Security team review", isDone: false, order: 4 },
    ],
  });

  await prisma.comment.create({
    data: {
      itemId: item1.id,
      author: "Jordan Lee",
      body: "Security team approved the ID token verification spec. Moving forward with PKCE tests.",
    },
  });

  await prisma.activityLog.create({
    data: {
      itemId: item1.id,
      author: "Alex Rivers",
      action: "STAGE_CHANGED",
      fromValue: "To Do",
      toValue: "In Progress",
    },
  });

  // Subtask of CRM-1
  const item1Sub1 = await prisma.item.create({
    data: {
      humanId: "CRM-2",
      itemNumber: 2,
      projectId: projectCRM.id,
      stageId: crmStages["Done"].id,
      type: ItemType.TASK,
      title: "Store encrypted OAuth client secrets in KMS",
      description: "Set up envelope encryption for third-party client secrets.",
      priority: Priority.HIGH,
      assignee: "Alex Rivers",
      reporter: "Alex Rivers",
      order: 1.0,
      parentId: item1.id,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Bug: Session token expiry (CRM-3)
  const item3 = await prisma.item.create({
    data: {
      humanId: "CRM-3",
      itemNumber: 3,
      projectId: projectCRM.id,
      stageId: crmStages["In Review"].id,
      type: ItemType.BUG,
      title: "Session token invalidates unexpectedly after 5 minutes of inactivity",
      description: "Users are reporting sudden logouts when filling multi-step invoice forms.",
      priority: Priority.CRITICAL,
      severity: BugSeverity.BLOCKER,
      assignee: "Sam Taylor",
      reporter: "Morgan Chen",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      estimateHours: 4,
      order: 2.0,
      stepsToReproduce: "1. Log into portal\n2. Open invoice generator\n3. Wait 5 minutes without navigation\n4. Click Save Invoice",
      expectedResult: "JWT refresh token silently refreshes access token without logging out.",
      actualResult: "Modal popup: 'Session expired' and user is redirected to /login losing form data.",
      environment: "Production / Chrome 124 / macOS & Windows",
      source: BugSource.CLIENT_REPORTED,
    },
  });

  await prisma.itemLabel.create({
    data: { itemId: item3.id, labelId: crmLabels["security"].id },
  });

  await prisma.comment.create({
    data: {
      itemId: item3.id,
      author: "Sam Taylor",
      body: "Root cause found: refresh token cookie had `SameSite=Strict` and `max-age` set in milliseconds instead of seconds. PR #114 submitted.",
    },
  });

  // Task: Export audit logs to CSV (CRM-4)
  await prisma.item.create({
    data: {
      humanId: "CRM-4",
      itemNumber: 4,
      projectId: projectCRM.id,
      stageId: crmStages["To Do"].id,
      type: ItemType.TASK,
      title: "Audit log CSV & JSON export",
      description: "Allow admin users to download security logs for SOC2 compliance.",
      priority: Priority.MEDIUM,
      assignee: "Jordan Lee",
      reporter: "Alex Rivers",
      dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      estimateHours: 8,
      order: 1.0,
    },
  });

  // Bug: Broken pagination (CRM-5)
  await prisma.item.create({
    data: {
      humanId: "CRM-5",
      itemNumber: 5,
      projectId: projectCRM.id,
      stageId: crmStages["Testing"].id,
      type: ItemType.BUG,
      title: "Contact table pagination fails when search query contains quotes",
      description: "SQL unescaped quotes causes 500 internal server error in customer search.",
      priority: Priority.HIGH,
      severity: BugSeverity.MAJOR,
      assignee: "Sam Taylor",
      reporter: "Alex Rivers",
      estimateHours: 3,
      order: 1.0,
      stepsToReproduce: "Type `O'Connor` in customer search bar and hit page 2.",
      expectedResult: "Page 2 filtered results show smoothly.",
      actualResult: "Toast error: 'Failed to fetch customer records (500)'.",
      environment: "Staging API v1.1.2",
      source: BugSource.INTERNAL,
    },
  });

  // Task: Dark mode UI audit (CRM-6)
  await prisma.item.create({
    data: {
      humanId: "CRM-6",
      itemNumber: 6,
      projectId: projectCRM.id,
      stageId: crmStages["Done"].id,
      type: ItemType.TASK,
      title: "Contrast accessibility fixes in dark mode dropdowns",
      description: "Ensure 4.5:1 WCAG AA contrast ratio across all popovers.",
      priority: Priority.LOW,
      assignee: "Morgan Chen",
      reporter: "Morgan Chen",
      order: 1.0,
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // Feature: Webhook notification system (CRM-7)
  await prisma.item.create({
    data: {
      humanId: "CRM-7",
      itemNumber: 7,
      projectId: projectCRM.id,
      stageId: crmStages["Backlog"].id,
      type: ItemType.FEATURE,
      title: "Outbound Webhooks for Ticket Status Changes",
      description: "Allow clients to subscribe their Slack / Zapier endpoints to ticket lifecycle events.",
      priority: Priority.MEDIUM,
      assignee: null,
      reporter: "Alex Rivers",
      order: 1.0,
      userStory: "As an operations manager, I want webhook events triggered to our Slack bot whenever high-priority tickets are opened.",
      requestedBy: "Globex Logistics",
    },
  });

  // Bug: Avatar upload fails (CRM-8)
  await prisma.item.create({
    data: {
      humanId: "CRM-8",
      itemNumber: 8,
      projectId: projectCRM.id,
      stageId: crmStages["Backlog"].id,
      type: ItemType.BUG,
      title: "PNG image upload over 2MB triggers memory leak on resize",
      description: "Image processing sharp worker crashes node container.",
      priority: Priority.MEDIUM,
      severity: BugSeverity.MINOR,
      assignee: "Sam Taylor",
      reporter: "Jordan Lee",
      order: 2.0,
      source: BugSource.INTERNAL,
    },
  });

  // Additional CRM items for realistic density
  const extraCrmItems = [
    { num: 9, stage: "To Do", type: ItemType.TASK, title: "Configure rate limiting on /api/v1/tickets", prio: Priority.HIGH, assignee: "Alex Rivers", est: 6 },
    { num: 10, stage: "In Progress", type: ItemType.BUG, title: "Date picker allows booking meetings in the past", prio: Priority.MEDIUM, sev: BugSeverity.MINOR, assignee: "Morgan Chen", est: 2, src: BugSource.CLIENT_REPORTED },
    { num: 11, stage: "In Review", type: ItemType.FEATURE, title: "Customizable Email Notification Templates", prio: Priority.MEDIUM, assignee: "Jordan Lee", est: 12, req: "Marketing Dept" },
    { num: 12, stage: "Testing", type: ItemType.TASK, title: "Stress test database connection pool under 500 rps", prio: Priority.HIGH, assignee: "Alex Rivers", est: 8 },
    { num: 13, stage: "Done", type: ItemType.TASK, title: "Upgrade Tailwind CSS to latest release", prio: Priority.LOW, assignee: "Morgan Chen", est: 3, doneDaysAgo: 7 },
    { num: 14, stage: "Done", type: ItemType.BUG, title: "Footer overlapping modal on mobile viewport", prio: Priority.LOW, sev: BugSeverity.TRIVIAL, assignee: "Morgan Chen", est: 1, doneDaysAgo: 5 },
    { num: 15, stage: "To Do", type: ItemType.TASK, title: "Add Redis cache for frequently read organization settings", prio: Priority.MEDIUM, assignee: "Sam Taylor", est: 5 },
    { num: 16, stage: "Backlog", type: ItemType.FEATURE, title: "AI-assisted ticket summarization", prio: Priority.LOW, assignee: null, est: 20, req: "Product Roadmap" },
  ];

  for (const item of extraCrmItems) {
    await prisma.item.create({
      data: {
        humanId: `CRM-${item.num}`,
        itemNumber: item.num,
        projectId: projectCRM.id,
        stageId: crmStages[item.stage].id,
        type: item.type,
        title: item.title,
        priority: item.prio,
        severity: item.sev ?? null,
        assignee: item.assignee,
        reporter: "Alex Rivers",
        estimateHours: item.est,
        order: item.num * 1.0,
        source: item.src ?? BugSource.INTERNAL,
        requestedBy: item.req ?? null,
        completedAt: item.doneDaysAgo ? new Date(Date.now() - item.doneDaysAgo * 24 * 60 * 60 * 1000) : null,
      },
    });
  }

  // ---------------------------------------------------------------------
  // PROJECT 2: Mobile Companion App (APP)
  // ---------------------------------------------------------------------
  console.log("🌱 Creating Project 2: Mobile Companion App (APP)...");

  const projectAPP = await prisma.project.create({
    data: {
      name: "Mobile Companion App",
      key: "APP",
      company: "Nova Labs",
      description: "Cross-platform iOS and Android mobile app with offline SQLite sync and push alerts.",
      color: "#8b5cf6",
      icon: "Smartphone",
      status: ProjectStatus.ACTIVE,
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      owner: "Sam Taylor",
      members: "Alex Rivers,Sam Taylor,Taylor Swift,Morgan Chen",
      itemCounter: 14,
    },
  });

  const appStages: Record<string, any> = {};
  for (const s of defaultStagesConfig) {
    const stage = await prisma.stage.create({
      data: {
        projectId: projectAPP.id,
        name: s.name,
        order: s.order,
        color: s.color,
        isDoneStage: s.isDoneStage,
        wipLimit: s.wipLimit ?? null,
      },
    });
    appStages[s.name] = stage;
  }

  const appLabels: Record<string, any> = {};
  const appLabelData = [
    { name: "ios", color: "#6366f1" },
    { name: "android", color: "#10b981" },
    { name: "offline", color: "#f59e0b" },
    { name: "sync", color: "#06b6d4" },
    { name: "auth", color: "#ec4899" },
  ];
  for (const l of appLabelData) {
    const lbl = await prisma.label.create({
      data: { projectId: projectAPP.id, name: l.name, color: l.color },
    });
    appLabels[l.name] = lbl;
  }

  // Items for APP
  const appItemsData = [
    { num: 1, stage: "Done", type: ItemType.TASK, title: "Initialize React Native / Expo router scaffolding", prio: Priority.HIGH, assignee: "Sam Taylor", doneDaysAgo: 10 },
    { num: 2, stage: "Done", type: ItemType.FEATURE, title: "Biometric authentication (FaceID & Fingerprint)", prio: Priority.HIGH, assignee: "Alex Rivers", doneDaysAgo: 3, req: "Security Standard" },
    { num: 3, stage: "In Progress", type: ItemType.FEATURE, title: "Offline synchronization queue using WatermelonDB", prio: Priority.CRITICAL, assignee: "Sam Taylor", est: 30, req: "Field Sales Reps" },
    { num: 4, stage: "In Progress", type: ItemType.BUG, title: "Push notifications do not register device token on iOS 18", prio: Priority.CRITICAL, sev: BugSeverity.BLOCKER, assignee: "Alex Rivers", est: 5, src: BugSource.INTERNAL },
    { num: 5, stage: "To Do", type: ItemType.TASK, title: "Implement deep linking for ticket URL schemes", prio: Priority.MEDIUM, assignee: "Morgan Chen", est: 6 },
    { num: 6, stage: "To Do", type: ItemType.BUG, title: "Dark mode switch flickers unstyled splash screen on cold start", prio: Priority.LOW, sev: BugSeverity.MINOR, assignee: "Morgan Chen", est: 2, src: BugSource.INTERNAL },
    { num: 7, stage: "In Review", type: ItemType.TASK, title: "Camera barcode scanner for equipment tracking", prio: Priority.HIGH, assignee: "Sam Taylor", est: 10 },
    { num: 8, stage: "Testing", type: ItemType.BUG, title: "Battery drain during background GPS sync", prio: Priority.HIGH, sev: BugSeverity.MAJOR, assignee: "Alex Rivers", est: 8, src: BugSource.CLIENT_REPORTED },
    { num: 9, stage: "Backlog", type: ItemType.FEATURE, title: "WearOS / Apple Watch quick task glance widget", prio: Priority.LOW, assignee: null, est: 24, req: "Product Innovation" },
    { num: 10, stage: "Backlog", type: ItemType.TASK, title: "Setup automated App Store TestFlight deployments via Fastlane", prio: Priority.MEDIUM, assignee: "Sam Taylor", est: 8 },
    { num: 11, stage: "Done", type: ItemType.TASK, title: "Design mobile Figma design system tokens", prio: Priority.MEDIUM, assignee: "Morgan Chen", doneDaysAgo: 12 },
    { num: 12, stage: "To Do", type: ItemType.BUG, title: "Keyboard covers submit button on iPhone SE screen", prio: Priority.MEDIUM, sev: BugSeverity.MINOR, assignee: "Morgan Chen", est: 3, src: BugSource.CLIENT_REPORTED },
    { num: 13, stage: "Backlog", type: ItemType.TASK, title: "Local database encryption at rest with SQLCipher", prio: Priority.HIGH, assignee: null, est: 12 },
    { num: 14, stage: "In Review", type: ItemType.FEATURE, title: "Voice notes attachment upload", prio: Priority.MEDIUM, assignee: "Alex Rivers", est: 14, req: "Mobile Beta Testers" },
  ];

  for (const item of appItemsData) {
    const createdItem = await prisma.item.create({
      data: {
        humanId: `APP-${item.num}`,
        itemNumber: item.num,
        projectId: projectAPP.id,
        stageId: appStages[item.stage].id,
        type: item.type,
        title: item.title,
        priority: item.prio,
        severity: item.sev ?? null,
        assignee: item.assignee,
        reporter: "Sam Taylor",
        estimateHours: item.est,
        order: item.num * 1.0,
        source: item.src ?? BugSource.INTERNAL,
        requestedBy: item.req ?? null,
        completedAt: item.doneDaysAgo ? new Date(Date.now() - item.doneDaysAgo * 24 * 60 * 60 * 1000) : null,
      },
    });

    if (item.num === 3) {
      await prisma.checklistItem.createMany({
        data: [
          { itemId: createdItem.id, text: "Create local SQLite schema migration", isDone: true, order: 1 },
          { itemId: createdItem.id, text: "Implement conflict resolution algorithm (last-write-wins)", isDone: true, order: 2 },
          { itemId: createdItem.id, text: "Background sync worker service", isDone: false, order: 3 },
          { itemId: createdItem.id, text: "Network status listener", isDone: false, order: 4 },
        ],
      });
      await prisma.comment.create({
        data: {
          itemId: createdItem.id,
          author: "Alex Rivers",
          body: "WatermelonDB is performing nicely with 10k cached rows in testing benchmarks.",
        },
      });
    }
  }

  console.log("✅ Seed completed successfully!");
  console.log(`- Project CRM: 16 items, 6 stages, labels, checklists, comments, activity log`);
  console.log(`- Project APP: 14 items, 6 stages, labels, checklists, comments`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
