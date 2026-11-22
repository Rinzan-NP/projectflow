import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  key: z.string().min(2, "Key must be at least 2 characters").max(10).toUpperCase(),
  company: z.string().min(1, "Company is required").default("Company 1"),
  description: z.string().optional().nullable(),
  color: z.string().default("#3b82f6"),
  icon: z.string().default("FolderKanban"),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
  startDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  owner: z.string().min(1, "Owner is required").default("Rinzan"),
  members: z.string().default("Sam Taylor,Jordan Lee"),
});

export const stageSchema = z.object({
  name: z.string().min(1, "Stage name is required").max(30),
  color: z.string().default("#64748b"),
  isDoneStage: z.boolean().default(false),
  wipLimit: z.number().int().positive().optional().nullable(),
  order: z.number().int().optional(),
});

export const itemSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().optional().nullable(),
  type: z.enum(["TASK", "BUG", "FEATURE", "IMPROVEMENT", "CHORE"]).default("TASK"),
  priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  stageId: z.string(),
  assignee: z.string().optional().nullable(),
  reporter: z.string().default("Rinzan"),
  dueDate: z.string().datetime().optional().nullable(),
  estimateHours: z.number().positive().optional().nullable(),
  parentId: z.string().optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  labels: z.array(z.string()).optional(), // array of label names

  // Bug specific
  severity: z.enum(["BLOCKER", "MAJOR", "MINOR", "TRIVIAL"]).optional().nullable(),
  stepsToReproduce: z.string().optional().nullable(),
  expectedResult: z.string().optional().nullable(),
  actualResult: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  source: z.enum(["INTERNAL", "CLIENT_REPORTED"]).optional().nullable(),

  // Feature specific
  userStory: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
});
