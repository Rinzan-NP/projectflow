"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  GitBranch,
  Copy,
  Check,
  Download,
  Sparkles,
  Bug,
  Database,
  HardDrive,
  FileCode,
  Building2,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DevKitPage() {
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  // Branch & Commit generation state
  const [branchType, setBranchType] = useState<"feature" | "fix" | "chore" | "refactor">("feature");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Mock generator feedback
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dev-kit/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectKey) {
          setSelectedProjectKey(data[0].key);
          loadProjectItems(data[0].key);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProjectItems = async (key: string) => {
    try {
      const res = await fetch(`/api/projects/${key}/items`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        if (data.length > 0) setSelectedItemId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProjects();
  }, []);

  const handleProjectSelect = (key: string) => {
    setSelectedProjectKey(key);
    loadProjectItems(key);
  };

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0];

  // Git formatting helpers
  const sanitizedTitle = selectedItem
    ? selectedItem.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45)
    : "work-item";

  const gitBranchName = selectedItem
    ? `${branchType}/${selectedItem.humanId}-${sanitizedTitle}`
    : "branch-name";

  const gitCommitMsg = selectedItem
    ? `${branchType === "fix" ? "fix" : "feat"}(${selectedItem.humanId}): ${selectedItem.title}`
    : "commit-message";

  const prTitle = selectedItem
    ? `[${selectedItem.humanId}] ${selectedItem.title}`
    : "PR-Title";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Mock Generators
  const handleGenerateMock = async (action: "GENERATE_BUGS" | "GENERATE_FEATURES") => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/dev-kit/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, projectKey: selectedProjectKey }),
      });
      if (res.ok) {
        setFeedback(
          action === "GENERATE_BUGS"
            ? "Created 5 mock bugs with realistic logs and environments!"
            : "Created 5 mock features with user stories!"
        );
        fetchStats();
        loadProjectItems(selectedProjectKey);
      }
    } catch (err: any) {
      setFeedback("Failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Terminal className="h-6 w-6 text-purple-500" />
          <span>Developer Toolkit (Dev Kit)</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Git branch & commit generators, mock data tools, local attachment inspection, and data exports.
        </p>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {feedback}
        </div>
      )}

      {/* 1. Git & Workflow Helper */}
      <div className="rounded-xl border bg-card p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Git Branch, Commit & PR Helper
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Standardizes repo branch naming and Conventional Commits
          </span>
        </div>

        {/* Project and Item pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Target Project
            </label>
            <select
              value={selectedProjectKey}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full h-8 text-xs bg-background border rounded px-2"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Branch Prefix
            </label>
            <select
              value={branchType}
              onChange={(e) => setBranchType(e.target.value as any)}
              className="w-full h-8 text-xs bg-background border rounded px-2"
            >
              <option value="feature">feature/</option>
              <option value="fix">fix/</option>
              <option value="chore">chore/</option>
              <option value="refactor">refactor/</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
              Select Work Item
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full h-8 text-xs bg-background border rounded px-2"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.humanId}: {i.title.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formatted Outputs with Copy Buttons */}
        <div className="space-y-3 pt-2">
          {/* Git Branch */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
              <span>Git Branch Name</span>
              <button
                onClick={() => copyToClipboard(`git checkout -b ${gitBranchName}`, "branch")}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
              >
                {copiedKey === "branch" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedKey === "branch" ? "Copied checkout cmd!" : "Copy checkout cmd"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border font-mono text-xs">
              <span className="text-foreground">{gitBranchName}</span>
              <button
                onClick={() => copyToClipboard(gitBranchName, "branch-only")}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiedKey === "branch-only" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          {/* Conventional Commit */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
              <span>Conventional Commit Message</span>
              <button
                onClick={() => copyToClipboard(gitCommitMsg, "commit")}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
              >
                {copiedKey === "commit" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedKey === "commit" ? "Copied!" : "Copy commit"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border font-mono text-xs">
              <span className="text-foreground">{gitCommitMsg}</span>
              <button
                onClick={() => copyToClipboard(gitCommitMsg, "commit")}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* PR Title */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
              <span>Pull Request Title</span>
              <button
                onClick={() => copyToClipboard(prTitle, "pr")}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
              >
                {copiedKey === "pr" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedKey === "pr" ? "Copied!" : "Copy title"}</span>
              </button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border font-mono text-xs">
              <span className="text-foreground">{prTitle}</span>
              <button
                onClick={() => copyToClipboard(prTitle, "pr")}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mock Data Generator & Quick Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-bold text-foreground">
              Mock Data Generators
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Quickly generate realistic work items for QA, performance load testing, and demonstrations.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => handleGenerateMock("GENERATE_BUGS")}
              className="justify-start gap-2 h-9 text-xs"
            >
              <Bug className="h-4 w-4 text-rose-500" />
              <span>Generate 5 Realistic Bugs (with logs & steps)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => handleGenerateMock("GENERATE_FEATURES")}
              className="justify-start gap-2 h-9 text-xs"
            >
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Generate 5 Feature Specs (with user stories)</span>
            </Button>
          </div>
        </div>

        {/* 3. Export Center */}
        <div className="rounded-xl border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Download className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-foreground">Data Export Center</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Download work items, custom stages, and metadata for backups or spreadsheet analytics.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <a
              href="/api/dev-kit/export?format=csv"
              download
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-semibold hover:bg-muted transition-colors"
            >
              <FileCode className="h-4 w-4 text-emerald-500" />
              <span>Export All Projects to CSV (Excel / Sheets)</span>
            </a>

            <a
              href="/api/dev-kit/export?format=json"
              target="_blank"
              download
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-semibold hover:bg-muted transition-colors"
            >
              <FileCode className="h-4 w-4 text-amber-500" />
              <span>Export Full Database Schema to JSON</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4. Local System Diagnostics & Storage */}
      {stats && (
        <div className="rounded-xl border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">
                Local Storage & System Diagnostics
              </h3>
            </div>
            <button
              onClick={fetchStats}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Refresh stats"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block text-[11px]">Database (SQLite)</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {stats.dbSizeKB} KB
              </span>
              <span className="text-[10px] text-muted-foreground">./dev.db file</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block text-[11px]">Local Uploads</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {stats.uploadFiles} files ({stats.uploadSizeKB} KB)
              </span>
              <span className="text-[10px] text-muted-foreground">public/uploads</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block text-[11px]">Companies</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {stats.companies?.length || 0}
              </span>
              <span className="text-[10px] text-muted-foreground truncate block">
                {stats.companies?.join(", ") || "None"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border">
              <span className="text-muted-foreground block text-[11px]">Total Items</span>
              <span className="text-base font-bold text-foreground mt-0.5 block">
                {stats.items}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {stats.bugs} bugs, {stats.features} features
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground pt-1">
            <span className="font-semibold">Local Storage Path:</span>{" "}
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
              {stats.storageLocation}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
