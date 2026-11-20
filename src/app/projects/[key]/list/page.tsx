"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import {
  Search,
  Filter,
  Check,
  Trash2,
  ArrowUpDown,
  MoreHorizontal,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { ItemWithRelations, Stage, ItemType, Priority } from "@/lib/types";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { Avatar } from "@/components/shared/Avatar";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ProjectListPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);

  // Table selection & bulk action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Filters & sorting
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"id" | "title" | "priority" | "dueDate" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const allMembers = ["Alex Rivers", "Sam Taylor", "Jordan Lee", "Morgan Chen"];

  const fetchData = async () => {
    try {
      const [stagesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectKey}/stages`).then((r) => r.json()),
        fetch(`/api/projects/${projectKey}/items`).then((r) => r.json()),
      ]);
      setStages(stagesRes);
      setItems(itemsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectKey]);

  // Sorting and filtering
  const filteredAndSortedItems = useMemo(() => {
    const res = items.filter((item) => {
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;
      if (stageFilter !== "ALL" && item.stageId !== stageFilter) return false;
      if (priorityFilter !== "ALL" && item.priority !== priorityFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesId = item.humanId.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId) return false;
      }
      return true;
    });

    res.sort((a, b) => {
      let comp = 0;
      if (sortField === "id") comp = a.itemNumber - b.itemNumber;
      else if (sortField === "title") comp = a.title.localeCompare(b.title);
      else if (sortField === "priority") {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        comp = (order[a.priority] || 0) - (order[b.priority] || 0);
      } else if (sortField === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        comp = da - db;
      } else if (sortField === "updatedAt") {
        comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return res;
  }, [items, search, typeFilter, stageFilter, priorityFilter, sortField, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Bulk actions executor
  const executeBulkAction = async (action: string, value?: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/items/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          itemIds: Array.from(selectedIds),
          value,
        }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items in table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground"
          >
            <option value="ALL">All Types</option>
            <option value="TASK">Tasks</option>
            <option value="BUG">Bugs</option>
            <option value="FEATURE">Features</option>
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground"
          >
            <option value="ALL">All Stages</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-background border rounded px-2 py-1 font-medium text-muted-foreground"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Actions Bar when items selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl p-3 text-xs animate-in fade-in-0 duration-150">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <span>{selectedIds.size} selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Stage */}
            <select
              value={bulkStageId}
              onChange={(e) => {
                setBulkStageId(e.target.value);
                if (e.target.value) executeBulkAction("CHANGE_STAGE", e.target.value);
              }}
              disabled={bulkLoading}
              className="h-7 text-xs bg-background border rounded px-2 font-medium"
            >
              <option value="">Move Stage...</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Bulk Priority */}
            <select
              value={bulkPriority}
              onChange={(e) => {
                setBulkPriority(e.target.value);
                if (e.target.value) executeBulkAction("CHANGE_PRIORITY", e.target.value);
              }}
              disabled={bulkLoading}
              className="h-7 text-xs bg-background border rounded px-2 font-medium"
            >
              <option value="">Set Priority...</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Bulk Assignee */}
            <select
              value={bulkAssignee}
              onChange={(e) => {
                setBulkAssignee(e.target.value);
                if (e.target.value) executeBulkAction("CHANGE_ASSIGNEE", e.target.value);
              }}
              disabled={bulkLoading}
              className="h-7 text-xs bg-background border rounded px-2 font-medium"
            >
              <option value="">Assign To...</option>
              {allMembers.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Bulk Delete */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected items?`)) {
                  executeBulkAction("DELETE");
                }
              }}
              disabled={bulkLoading}
              className="h-7 text-xs gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 font-semibold text-muted-foreground select-none">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredAndSortedItems.length > 0 &&
                      selectedIds.size === filteredAndSortedItems.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                </th>
                <th
                  onClick={() => {
                    setSortField("id");
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                  }}
                  className="p-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>ID</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3 w-10">Type</th>
                <th
                  onClick={() => {
                    setSortField("title");
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                  }}
                  className="p-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Title</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3">Stage</th>
                <th
                  onClick={() => {
                    setSortField("priority");
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                  }}
                  className="p-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="p-3">Assignee</th>
                <th
                  onClick={() => {
                    setSortField("dueDate");
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                  }}
                  className="p-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Due Date</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField("updatedAt");
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                  }}
                  className="p-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Updated</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`hover:bg-muted/40 transition-colors cursor-pointer ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="p-3" onClick={(e) => toggleSelectItem(item.id, e)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>

                      <td className="p-3 font-mono font-bold text-muted-foreground whitespace-nowrap">
                        {item.humanId}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <ItemTypeIcon type={item.type} />
                      </td>

                      <td className="p-3 font-medium text-foreground max-w-md">
                        <span className="line-clamp-1">{item.title}</span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                          style={{
                            backgroundColor: `${item.stage?.color || "#64748b"}15`,
                            color: item.stage?.color || "#64748b",
                            borderColor: `${item.stage?.color || "#64748b"}30`,
                          }}
                        >
                          {item.stage?.name || "Stage"}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <PriorityIcon priority={item.priority} showLabel />
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Avatar name={item.assignee} size="xs" />
                          <span className="text-muted-foreground">
                            {item.assignee || "Unassigned"}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {item.dueDate ? formatDate(item.dueDate) : "—"}
                      </td>

                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(item.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          projectKey={projectKey}
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
          stages={stages}
        />
      )}
    </div>
  );
}
