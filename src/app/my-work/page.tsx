"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Flame,
  ChevronRight,
} from "lucide-react";
import { ItemWithRelations, Priority } from "@/lib/types";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export default function MyWorkPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const currentUser = user?.name || "Rinzan";
  const userCompany = user?.company;
  const username = user?.username;

  const fetchMyWork = async () => {
    try {
      // Fetch projects to get all user's items
      const projectsRes = await fetch("/api/projects").then((r) => r.json());
      const allowedProjects = userCompany && userCompany !== "ALL"
        ? projectsRes.filter((p: any) => p.company === userCompany)
        : projectsRes;

      const allItems: any[] = [];

      for (const p of allowedProjects) {
        const pItems = await fetch(`/api/projects/${p.key}/items`).then((r) => r.json());
        pItems.forEach((i: any) => {
          if (
            i.assignee === currentUser ||
            (username && i.reporter === username) ||
            (userCompany && userCompany !== "ALL")
          ) {
            allItems.push({ ...i, project: p });
          }
        });
      }
      setItems(allItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyWork();
  }, [userCompany, username]);

  // Group items by due date buckets
  const grouped = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tonight = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const buckets = {
      overdue: [] as any[],
      dueToday: [] as any[],
      thisWeek: [] as any[],
      later: [] as any[],
      completed: [] as any[],
    };

    items.forEach((item) => {
      if (item.stage?.isDoneStage || item.completedAt) {
        buckets.completed.push(item);
        return;
      }

      if (!item.dueDate) {
        buckets.later.push(item);
        return;
      }

      const due = new Date(item.dueDate);
      if (due < today) {
        buckets.overdue.push(item);
      } else if (due >= today && due < tonight) {
        buckets.dueToday.push(item);
      } else if (due >= tonight && due <= endOfWeek) {
        buckets.thisWeek.push(item);
      } else {
        buckets.later.push(item);
      }
    });

    return buckets;
  }, [items]);

  const BUCKET_CONFIG = [
    {
      key: "overdue",
      title: "Overdue",
      color: "text-rose-500",
      bg: "bg-rose-500/10 border-rose-500/30",
      icon: Flame,
      items: grouped.overdue,
    },
    {
      key: "dueToday",
      title: "Due Today",
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/30",
      icon: Clock,
      items: grouped.dueToday,
    },
    {
      key: "thisWeek",
      title: "Due This Week",
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/30",
      icon: Calendar,
      items: grouped.thisWeek,
    },
    {
      key: "later",
      title: "Later / No Due Date",
      color: "text-muted-foreground",
      bg: "bg-muted/40 border-border",
      icon: CheckCircle2,
      items: grouped.later,
    },
    {
      key: "completed",
      title: "Completed",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      icon: CheckCircle,
      items: grouped.completed,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-primary" />
          <span>My Work</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          All active items assigned to {currentUser} across every project.
        </p>
      </div>

      <div className="space-y-6">
        {BUCKET_CONFIG.map((bucket) => {
          const Icon = bucket.icon;

          return (
            <div
              key={bucket.key}
              className="bg-card border rounded-xl overflow-hidden shadow-2xs"
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${bucket.bg}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${bucket.color}`} />
                  <h3 className={`text-xs font-bold tracking-tight ${bucket.color}`}>
                    {bucket.title}
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-background border">
                  {bucket.items.length}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border/60">
                {bucket.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">
                    No items in this section.
                  </p>
                ) : (
                  bucket.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <ItemTypeIcon type={item.type} />
                        <span className="font-mono font-bold text-muted-foreground">
                          {item.humanId}
                        </span>
                        <span className="font-medium text-foreground line-clamp-1">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${item.project?.color || "#3b82f6"}15`,
                            color: item.project?.color || "#3b82f6",
                          }}
                        >
                          {item.project?.key}
                        </span>

                        <PriorityIcon priority={item.priority} />

                        {item.dueDate && (
                          <span className="text-muted-foreground text-[11px]">
                            {formatDate(item.dueDate)}
                          </span>
                        )}

                        <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          projectKey={selectedItem.project?.key || "CRM"}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setSelectedItem(updated);
          }}
          onDelete={(id) => {
            setItems((prev) => prev.filter((i) => i.id !== id));
            setSelectedItem(null);
          }}
          stages={[]}
        />
      )}
    </div>
  );
}
