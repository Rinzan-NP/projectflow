import {
  Project,
  Stage,
  Item,
  Label,
  ItemLabel,
  ChecklistItem,
  Comment,
  Attachment,
  ActivityLog,
  Milestone,
  ProjectStatus,
  ItemType,
  Priority,
  BugSeverity,
  BugSource,
} from "@prisma/client";

export type {
  Project,
  Stage,
  Item,
  Label,
  ItemLabel,
  ChecklistItem,
  Comment,
  Attachment,
  ActivityLog,
  Milestone,
  ProjectStatus,
  ItemType,
  Priority,
  BugSeverity,
  BugSource,
};

export type ItemWithRelations = Item & {
  stage?: Stage;
  project?: {
    id: string;
    key: string;
    name: string;
    color: string;
    company?: string | null;
    priority?: Priority | null;
  };
  labels?: (ItemLabel & { label: Label })[];
  checklists?: ChecklistItem[];
  comments?: Comment[];
  attachments?: Attachment[];
  activityLogs?: ActivityLog[];
  subtasks?: (Item & { stage?: Stage })[];
  parent?: Item | null;
  milestone?: Milestone | null;
};

export type StageWithItems = Stage & {
  items: ItemWithRelations[];
};

export type ProjectWithStagesAndStats = Project & {
  stages: StageWithItems[];
  _count?: {
    items: number;
  };
  totalItems?: number;
  doneItems?: number;
  progressPercent?: number;
  openBugsCount?: number;
  openFeaturesCount?: number;
  overdueCount?: number;
};
