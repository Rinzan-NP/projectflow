"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import {
  Bug,
  Plus,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { ItemWithRelations, Stage, BugSeverity, BugSource } from "@/lib/types";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { Avatar } from "@/components/shared/Avatar";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function BugTrackerPage({
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

  // Filters
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "INTERNAL" | "CLIENT_REPORTED">("ALL");
  const [search, setSearch] = useState("");

  // Report Bug Modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("MAJOR");
  const [source, setSource] = useState<BugSource>("INTERNAL");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [environment, setEnvironment] = useState("");
  const [assignee, setAssignee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allMembers = ["Alex Rivers", "Sam Taylor", "Jordan Lee", "Morgan Chen"];

  const fetchData = async () => {
    try {
      const [stagesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectKey}/stages`).then((r) => r.json()),
        fetch(`/api/projects/${projectKey}/items?type=BUG`).then((r) => r.json()),
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

  // Group bugs by severity
  const bugsBySeverity = useMemo(() => {
    const groups: Record<BugSeverity, ItemWithRelations[]> = {
      BLOCKER: [],
      MAJOR: [],
      MINOR: [],
      TRIVIAL: [],
    };

    items.forEach((item) => {
      if (item.type !== "BUG") return;
      if (sourceFilter !== "ALL" && item.source !== sourceFilter) return;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !item.title.toLowerCase().includes(q) &&
          !item.humanId.toLowerCase().includes(q)
        )
          return;
      }

      const sev: BugSeverity = (item.severity as BugSeverity) || "MAJOR";
      groups[sev].push(item);
    });

    return groups;
  }, [items, sourceFilter, search]);

  const handleReportBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: "BUG",
          stageId: stages[0]?.id,
          priority: severity === "BLOCKER" ? "CRITICAL" : severity === "MAJOR" ? "HIGH" : "MEDIUM",
          severity,
          source,
          stepsToReproduce: steps.trim() || null,
          expectedResult: expected.trim() || null,
          actualResult: actual.trim() || null,
          environment: environment.trim() || null,
          assignee: assignee || null,
        }),
      });

      if (res.ok) {
        setIsReportOpen(false);
        setTitle("");
        setSteps("");
        setExpected("");
        setActual("");
        setEnvironment("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const SEVERITY_CONFIG: Record<
    BugSeverity,
    { label: string; color: string; badge: string; icon: any }
  > = {
    BLOCKER: {
      label: "Blocker",
      color: "border-rose-500/30 bg-rose-500/10 text-rose-500",
      badge: "bg-rose-500 text-white",
      icon: Flame,
    },
    MAJOR: {
      label: "Major",
      color: "border-red-500/30 bg-red-500/10 text-red-500",
      badge: "bg-red-500 text-white",
      icon: AlertTriangle,
    },
    MINOR: {
      label: "Minor",
      color: "border-amber-500/30 bg-amber-500/10 text-amber-500",
      badge: "bg-amber-500 text-white",
      icon: ShieldAlert,
    },
    TRIVIAL: {
      label: "Trivial",
      color: "border-slate-500/30 bg-slate-500/10 text-slate-500",
      badge: "bg-slate-500 text-white",
      icon: Bug,
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Report */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bug className="h-5 w-5 text-rose-500" />
            <span>Bug Tracker</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor regressions, client reports, and blocker severity issues.
          </p>
        </div>

        <Button
          onClick={() => setIsReportOpen(true)}
          className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Report Bug</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border rounded-xl p-3 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search bugs by summary or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSourceFilter("ALL")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sourceFilter === "ALL"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            All Sources
          </button>
          <button
            onClick={() => setSourceFilter("CLIENT_REPORTED")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sourceFilter === "CLIENT_REPORTED"
                ? "bg-rose-500 text-white font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Client Reported
          </button>
          <button
            onClick={() => setSourceFilter("INTERNAL")}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              sourceFilter === "INTERNAL"
                ? "bg-blue-500 text-white font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Internal Only
          </button>
        </div>
      </div>

      {/* Severity Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(["BLOCKER", "MAJOR", "MINOR", "TRIVIAL"] as BugSeverity[]).map((sev) => {
          const config = SEVERITY_CONFIG[sev];
          const Icon = config.icon;
          const bugList = bugsBySeverity[sev];

          return (
            <div
              key={sev}
              className="bg-card border rounded-xl p-4 shadow-xs flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-md flex items-center justify-center ${config.color}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="text-sm font-bold tracking-tight">{config.label}</h3>
                  <span
                    className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full ${config.badge}`}
                  >
                    {bugList.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[350px]">
                {bugList.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No {config.label.toLowerCase()} bugs reported.
                  </p>
                ) : (
                  bugList.map((bug) => (
                    <div
                      key={bug.id}
                      onClick={() => setSelectedItem(bug)}
                      className="p-3 rounded-lg border bg-background/50 hover:bg-background hover:border-primary/40 transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-rose-500">
                          {bug.humanId}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-sm font-medium ${
                            bug.source === "CLIENT_REPORTED"
                              ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {bug.source === "CLIENT_REPORTED" ? "Client Reported" : "Internal"}
                        </span>
                      </div>

                      <h4 className="text-xs font-medium text-foreground line-clamp-2">
                        {bug.title}
                      </h4>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${bug.stage?.color || "#64748b"}15`,
                            color: bug.stage?.color || "#64748b",
                          }}
                        >
                          {bug.stage?.name}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Avatar name={bug.assignee} size="xs" />
                          <span>{bug.assignee || "Unassigned"}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Bug Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2 text-rose-500">
              <Bug className="h-5 w-5" />
              <span>Report a Bug ({projectKey})</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Capture reproduction steps, severity, and environment details.
            </p>

            <form onSubmit={handleReportBug} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Summary / Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Session expires after 5 minutes on invoice page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
                  >
                    <option value="BLOCKER">Blocker (Immediate fix)</option>
                    <option value="MAJOR">Major (Broken core function)</option>
                    <option value="MINOR">Minor (Workaround available)</option>
                    <option value="TRIVIAL">Trivial (Cosmetic / Typo)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value as BugSource)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm"
                  >
                    <option value="INTERNAL">Internal QA / Dev</option>
                    <option value="CLIENT_REPORTED">Client Reported</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Steps to Reproduce
                </label>
                <Textarea
                  rows={3}
                  placeholder="1. Go to...\n2. Click on...\n3. Observe error..."
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Expected Result
                  </label>
                  <Input
                    placeholder="Should save successfully"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Actual Result
                  </label>
                  <Input
                    placeholder="Displays 500 error toast"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Environment / Client
                  </label>
                  <Input
                    placeholder="macOS Sonoma / Chrome 124"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Assign To
                  </label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm"
                  >
                    <option value="">Unassigned</option>
                    {allMembers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReportOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {submitting ? "Reporting..." : "Submit Bug Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
