"use client";

import React, { useState, useEffect, use, useMemo } from "react";
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ListCheck,
} from "lucide-react";
import { ItemWithRelations, Stage } from "@/lib/types";
import { Avatar } from "@/components/shared/Avatar";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { ItemDetailModal } from "@/components/item-detail/ItemDetailModal";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function RoadmapPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const resolvedParams = use(params);
  const projectKey = resolvedParams.key.toUpperCase();

  const [features, setFeatures] = useState<ItemWithRelations[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemWithRelations | null>(null);

  // Propose feature modal
  const [isProposeOpen, setIsProposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [userStory, setUserStory] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [stagesRes, itemsRes] = await Promise.all([
        fetch(`/api/projects/${projectKey}/stages`).then((r) => r.json()),
        fetch(`/api/projects/${projectKey}/items?type=FEATURE`).then((r) => r.json()),
      ]);
      setStages(stagesRes);
      setFeatures(itemsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectKey]);

  // Group features by stage
  const featuresByStage = useMemo(() => {
    const map: Record<string, ItemWithRelations[]> = {};
    stages.forEach((s) => {
      map[s.id] = [];
    });
    features.forEach((f) => {
      if (map[f.stageId]) map[f.stageId].push(f);
    });
    return map;
  }, [stages, features]);

  const handleProposeFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectKey}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type: "FEATURE",
          stageId: stages[0]?.id,
          priority: "MEDIUM",
          userStory: userStory.trim() || null,
          requestedBy: requestedBy.trim() || null,
        }),
      });

      if (res.ok) {
        setIsProposeOpen(false);
        setTitle("");
        setUserStory("");
        setRequestedBy("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <span>Feature Roadmap</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track user stories, client requests, and subtask decomposition.
          </p>
        </div>

        <Button
          onClick={() => setIsProposeOpen(true)}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          <span>Propose Feature</span>
        </Button>
      </div>

      {/* Feature Timeline Columns / Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {stages.map((stage) => {
          const stageFeatures = featuresByStage[stage.id] || [];

          return (
            <div
              key={stage.id}
              className="bg-card border rounded-xl p-4 shadow-xs flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <h3 className="text-xs font-bold text-foreground">{stage.name}</h3>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-semibold">
                    {stageFeatures.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {stageFeatures.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">
                    No features in {stage.name.toLowerCase()}.
                  </p>
                ) : (
                  stageFeatures.map((feat) => {
                    const checklistTotal = feat.checklists?.length || 0;
                    const checklistDone = feat.checklists?.filter((c) => c.isDone).length || 0;
                    const subtaskCount = feat.subtasks?.length || 0;

                    return (
                      <div
                        key={feat.id}
                        onClick={() => setSelectedItem(feat)}
                        className="p-3.5 rounded-lg border bg-background/50 hover:bg-background hover:border-purple-500/40 transition-all cursor-pointer space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-purple-500">
                            {feat.humanId}
                          </span>
                          <PriorityIcon priority={feat.priority} />
                        </div>

                        <h4 className="text-xs font-semibold text-foreground">
                          {feat.title}
                        </h4>

                        {feat.userStory && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded">
                            "{feat.userStory}"
                          </p>
                        )}

                        {feat.requestedBy && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                            Req by: {feat.requestedBy}
                          </div>
                        )}

                        {/* Subtasks and checklist progress */}
                        <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-3">
                            {checklistTotal > 0 && (
                              <span
                                className="flex items-center gap-1"
                                title="Checklist progress"
                              >
                                <ListCheck className="h-3 w-3" />
                                <span>
                                  {checklistDone}/{checklistTotal}
                                </span>
                              </span>
                            )}
                            {subtaskCount > 0 && (
                              <span className="flex items-center gap-1" title="Child tasks">
                                <Layers className="h-3 w-3" />
                                <span>{subtaskCount} subtasks</span>
                              </span>
                            )}
                          </div>

                          <Avatar name={feat.assignee} size="xs" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Propose Feature Modal */}
      {isProposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl text-card-foreground animate-in fade-in-0 zoom-in-95">
            <h3 className="text-lg font-bold tracking-tight mb-1 flex items-center gap-2 text-purple-500">
              <Sparkles className="h-5 w-5" />
              <span>Propose Feature ({projectKey})</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Add a new capability to the product backlog.
            </p>

            <form onSubmit={handleProposeFeature} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Feature Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Single Sign-On with SAML / Okta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  User Story / Problem Statement
                </label>
                <Textarea
                  rows={3}
                  placeholder="As a [role], I want to [action] so that [benefit]..."
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Requested By (Client / Stakeholder)
                </label>
                <Input
                  placeholder="e.g. Acme Corp Enterprise / Internal Roadmap"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {submitting ? "Adding..." : "Add to Backlog"}
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
            setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
            setSelectedItem(updated);
          }}
          onDelete={(id) => {
            setFeatures((prev) => prev.filter((f) => f.id !== id));
            setSelectedItem(null);
          }}
          stages={stages}
        />
      )}
    </div>
  );
}
