"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X,
  Trash2,
  Calendar,
  Clock,
  User,
  Tag,
  CheckSquare,
  MessageSquare,
  Activity,
  Layers,
  Sparkles,
  Bug,
  Plus,
  Check,
  ExternalLink,
  Paperclip,
  Mic,
  MicOff,
  Image as ImageIcon,
  Music,
  FileText,
  Download,
  Upload,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItemWithRelations, ItemType, Priority, BugSeverity, BugSource } from "@/lib/types";
import { ItemTypeIcon } from "@/components/shared/ItemTypeIcon";
import { PriorityIcon } from "@/components/shared/PriorityIcon";
import { Avatar } from "@/components/shared/Avatar";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface ItemDetailModalProps {
  item: ItemWithRelations | null;
  projectKey: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updated: ItemWithRelations) => void;
  onDelete: (id: string) => void;
  stages: any[];
  allProjects?: any[];
  allMembers?: string[];
}

export function ItemDetailModal({
  item,
  projectKey,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  stages,
  allProjects,
  allMembers = ["Rinzan", "Sam Taylor", "Jordan Lee", "Morgan Chen"],
}: ItemDetailModalProps) {
  if (!isOpen || !item) return null;

  const { user } = useAuth();
  const [projectList, setProjectList] = useState<any[]>(allProjects || []);
  const [currentStages, setCurrentStages] = useState<any[]>(stages);
  const [isChangingProject, setIsChangingProject] = useState(false);

  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [type, setType] = useState<ItemType>(item.type);
  const [priority, setPriority] = useState<Priority>(item.priority);
  const [stageId, setStageId] = useState(item.stageId);
  const [assignee, setAssignee] = useState(item.assignee || "");
  const [dueDate, setDueDate] = useState(
    item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : ""
  );
  const [estimateHours, setEstimateHours] = useState(
    item.estimateHours != null ? String(item.estimateHours) : ""
  );

  // Bug specific
  const [severity, setSeverity] = useState<BugSeverity>(item.severity || "MAJOR");
  const [source, setSource] = useState<BugSource>(item.source || "INTERNAL");
  const [stepsToReproduce, setStepsToReproduce] = useState(item.stepsToReproduce || "");
  const [expectedResult, setExpectedResult] = useState(item.expectedResult || "");
  const [actualResult, setActualResult] = useState(item.actualResult || "");
  const [environment, setEnvironment] = useState(item.environment || "");

  // Feature specific
  const [userStory, setUserStory] = useState(item.userStory || "");
  const [requestedBy, setRequestedBy] = useState(item.requestedBy || "");

  // Checklist state
  const [newChecklistText, setNewChecklistText] = useState("");

  // Comment state
  const [newCommentBody, setNewCommentBody] = useState("");

  // Subtask create state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Attachments & Media state
  const [attachments, setAttachments] = useState<any[]>(item.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "checklist" | "subtasks" | "attachments" | "activity"
  >("details");

  useEffect(() => {
    if (allProjects && allProjects.length > 0) {
      setProjectList(allProjects);
    } else {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setProjectList(data);
        })
        .catch(console.error);
    }
  }, [allProjects]);

  useEffect(() => {
    if (stages && stages.length > 0) {
      setCurrentStages(stages);
    }
  }, [stages]);

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || "");
    setType(item.type);
    setPriority(item.priority);
    setStageId(item.stageId);
    setAssignee(item.assignee || "");
    setDueDate(item.dueDate ? new Date(item.dueDate).toISOString().split("T")[0] : "");
    setEstimateHours(item.estimateHours != null ? String(item.estimateHours) : "");
    setSeverity(item.severity || "MAJOR");
    setSource(item.source || "INTERNAL");
    setStepsToReproduce(item.stepsToReproduce || "");
    setExpectedResult(item.expectedResult || "");
    setActualResult(item.actualResult || "");
    setEnvironment(item.environment || "");
    setUserStory(item.userStory || "");
    setRequestedBy(item.requestedBy || "");
    if (item.attachments) setAttachments(item.attachments);
  }, [item.id, item.projectId, item.humanId, item.stageId]);

  const availableProjects = useMemo(() => {
    if (!user || user.company === "ALL") return projectList;
    return projectList.filter((p) => p.company === user.company);
  }, [projectList, user]);

  const handleProjectChange = async (targetProjectId: string) => {
    const currentId = item.projectId || "NONE";
    if (targetProjectId === currentId) return;
    setIsChangingProject(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: targetProjectId }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (targetProjectId === "NONE") {
          setCurrentStages([
            { id: "stage_todo", name: "To Do", isDoneStage: false },
            { id: "stage_in_progress", name: "In Progress", isDoneStage: false },
            { id: "stage_in_review", name: "In Review", isDoneStage: false },
            { id: "stage_done", name: "Done", isDoneStage: true },
            { id: "stage_backlog", name: "Backlog", isDoneStage: false },
          ]);
        } else {
          const targetProj = projectList.find((p) => p.id === targetProjectId);
          if (targetProj && targetProj.stages && targetProj.stages.length > 0) {
            setCurrentStages(targetProj.stages);
          }
        }
        setStageId(updated.stageId);
        onUpdate(updated);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Failed to change project");
      }
    } catch (err) {
      console.error(err);
      alert("Error changing project");
    } finally {
      setIsChangingProject(false);
    }
  };

  useEffect(() => {
    if (item.attachments) setAttachments(item.attachments);
  }, [item.attachments]);

  // Save field changes
  const handleSaveField = async (payload: Partial<any>) => {
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title !== item.title) {
      handleSaveField({ title: title.trim() });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== item.description) {
      handleSaveField({ description });
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const text = newChecklistText.trim();
    setNewChecklistText("");
    await handleSaveField({ addChecklistText: text });
  };

  const handleToggleChecklist = async (checkId: string) => {
    await handleSaveField({ toggleChecklistId: checkId });
  };

  const handleDeleteChecklist = async (checkId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await handleSaveField({ deleteChecklistId: checkId });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim()) return;
    await handleSaveField({
      newCommentBody: newCommentBody.trim(),
      commentAuthor: "Rinzan",
    });
    setNewCommentBody("");
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    const title = newSubtaskTitle.trim();
    setNewSubtaskTitle("");

    try {
      // First try dedicated subtask endpoint
      let res = await fetch(`/api/items/${item.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority: "MEDIUM",
        }),
      });

      // Fallback to project items endpoint if needed
      if (!res.ok) {
        const targetProjKey =
          (item.project?.key || item.humanId.split("-")[0] || projectKey || "").toUpperCase();
        const validProjKey = targetProjKey !== "ALL" ? targetProjKey : item.humanId.split("-")[0];
        res = await fetch(`/api/projects/${validProjKey}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            type: "TASK",
            priority: "MEDIUM",
            stageId: item.stageId,
            parentId: item.id,
          }),
        });
      }

      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setSaving(true);
    try {
      await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Upload file (screenshot, audio, document)
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", item.id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments((prev) => [newAttachment, ...prev]);
        const refreshed = await fetch(`/api/items/${item.id}`).then((r) => r.json());
        onUpdate(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Start voice note audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File(
          [audioBlob],
          `voice-note-${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`,
          { type: "audio/webm" }
        );
        await handleFileUpload(audioFile);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission is required to record audio.");
      console.error(err);
    }
  };

  // Stop voice note audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      const refreshed = await fetch(`/api/items/${item.id}`).then((r) => r.json());
      onUpdate(refreshed);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
      <div className="relative w-full max-w-4xl h-[90vh] max-h-[850px] rounded-xl border bg-card shadow-xl flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/20">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-primary">
              {item.humanId}
            </span>
            <span className="text-muted-foreground">•</span>
            {/* Project Indicator */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-[11px] font-semibold border text-muted-foreground" title="Assigned Project">
              <FolderKanban className="w-3.5 h-3.5 text-primary" />
              <span>{item.project?.name || (item.projectId ? projectKey : `No Project (${item.company || "General"})`)}</span>
            </div>
            <span className="text-muted-foreground">•</span>
            {/* Quick Type Selector */}
            <select
              value={type}
              onChange={(e) => {
                const newT = e.target.value as ItemType;
                setType(newT);
                handleSaveField({ type: newT });
              }}
              className="text-xs font-semibold bg-background border rounded px-2 py-1 cursor-pointer focus:outline-none"
            >
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="FEATURE">Feature</option>
              <option value="IMPROVEMENT">Improvement</option>
              <option value="CHORE">Chore</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.open(`/projects/${projectKey}/items/${item.humanId}`, "_blank")}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              title="Open full page"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
            <button
              onClick={handleDeleteItem}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Delete Item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Left Content */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
            {/* Title */}
            <div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-lg font-bold border-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-b rounded-none"
                placeholder="Item title..."
              />
            </div>

            {/* Tabs Bar */}
            <div className="flex items-center gap-4 border-b text-xs font-medium overflow-x-auto">
              <button
                onClick={() => setActiveTab("details")}
                className={`pb-2.5 border-b-2 cursor-pointer whitespace-nowrap ${
                  activeTab === "details"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Description & Fields
              </button>
              <button
                onClick={() => setActiveTab("checklist")}
                className={`pb-2.5 border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "checklist"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Checklist</span>
                <span className="text-[10px] px-1.5 rounded-full bg-muted font-mono">
                  {item.checklists?.filter((c) => c.isDone).length || 0}/
                  {item.checklists?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("subtasks")}
                className={`pb-2.5 border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "subtasks"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Subtasks</span>
                <span className="text-[10px] px-1.5 rounded-full bg-muted font-mono">
                  {item.subtasks?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("attachments")}
                className={`pb-2.5 border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "attachments"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Paperclip className="h-3 w-3" />
                <span>Attachments & Media</span>
                <span className="text-[10px] px-1.5 rounded-full bg-muted font-mono">
                  {attachments.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`pb-2.5 border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "activity"
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Activity & Comments</span>
                <span className="text-[10px] px-1.5 rounded-full bg-muted font-mono">
                  {item.comments?.length || 0}
                </span>
              </button>
            </div>

            {/* TAB CONTENT: DETAILS */}
            {activeTab === "details" && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Description (Markdown supported)
                  </label>
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Add details, acceptance criteria, or technical specs..."
                    className="text-xs leading-relaxed"
                  />
                </div>

                {/* BUG-SPECIFIC FIELDS */}
                {type === "BUG" && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                      <Bug className="h-4 w-4" />
                      <span>Bug Report Details</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          Severity
                        </label>
                        <select
                          value={severity}
                          onChange={(e) => {
                            const sev = e.target.value as BugSeverity;
                            setSeverity(sev);
                            handleSaveField({ severity: sev });
                          }}
                          className="w-full text-xs bg-background border rounded px-2 py-1.5"
                        >
                          <option value="BLOCKER">Blocker</option>
                          <option value="MAJOR">Major</option>
                          <option value="MINOR">Minor</option>
                          <option value="TRIVIAL">Trivial</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          Source
                        </label>
                        <select
                          value={source}
                          onChange={(e) => {
                            const src = e.target.value as BugSource;
                            setSource(src);
                            handleSaveField({ source: src });
                          }}
                          className="w-full text-xs bg-background border rounded px-2 py-1.5"
                        >
                          <option value="INTERNAL">Internal</option>
                          <option value="CLIENT_REPORTED">Client Reported</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Steps to Reproduce
                      </label>
                      <Textarea
                        rows={2}
                        value={stepsToReproduce}
                        onChange={(e) => setStepsToReproduce(e.target.value)}
                        onBlur={() => handleSaveField({ stepsToReproduce })}
                        placeholder="1. Step one... 2. Step two..."
                        className="text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          Expected Result
                        </label>
                        <Input
                          value={expectedResult}
                          onChange={(e) => setExpectedResult(e.target.value)}
                          onBlur={() => handleSaveField({ expectedResult })}
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                          Actual Result
                        </label>
                        <Input
                          value={actualResult}
                          onChange={(e) => setActualResult(e.target.value)}
                          onBlur={() => handleSaveField({ actualResult })}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Environment (OS, Browser, Device)
                      </label>
                      <Input
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value)}
                        onBlur={() => handleSaveField({ environment })}
                        placeholder="e.g. macOS Sonoma / Chrome 124"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}

                {/* FEATURE-SPECIFIC FIELDS */}
                {type === "FEATURE" && (
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-500">
                      <Sparkles className="h-4 w-4" />
                      <span>Feature Specification</span>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        User Story / Problem Statement
                      </label>
                      <Textarea
                        rows={2}
                        value={userStory}
                        onChange={(e) => setUserStory(e.target.value)}
                        onBlur={() => handleSaveField({ userStory })}
                        placeholder="As a [role], I want to [action] so that [benefit]..."
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                        Requested By (Client / Stakeholder)
                      </label>
                      <Input
                        value={requestedBy}
                        onChange={(e) => setRequestedBy(e.target.value)}
                        onBlur={() => handleSaveField({ requestedBy })}
                        placeholder="e.g. Acme Corp Enterprise / Internal Roadmap"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CHECKLIST */}
            {activeTab === "checklist" && (
              <div className="space-y-4">
                <form onSubmit={handleAddChecklist} className="flex gap-2">
                  <Input
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    placeholder="Add an acceptance criteria or checklist item..."
                    className="text-xs h-8"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs shrink-0">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </form>

                <div className="space-y-2">
                  {item.checklists && item.checklists.length > 0 ? (
                    item.checklists.map((check) => (
                      <div
                        key={check.id}
                        onClick={() => handleToggleChecklist(check.id)}
                        className="group flex items-center gap-2 p-2 rounded border bg-background/50 hover:bg-background cursor-pointer text-xs transition-colors"
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                            check.isDone
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                        >
                          {check.isDone && <Check className="h-3 w-3" />}
                        </div>
                        <span
                          className={`flex-1 ${
                            check.isDone ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {check.text}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChecklist(check.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded transition-opacity"
                          title="Delete checklist item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No checklist items yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SUBTASKS */}
            {activeTab === "subtasks" && (
              <div className="space-y-4">
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Break down into subtasks... (e.g. Unit tests, API schema)"
                    className="text-xs h-8"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs shrink-0">
                    <Plus className="h-3 w-3 mr-1" /> Add Subtask
                  </Button>
                </form>

                <div className="space-y-2">
                  {item.subtasks && item.subtasks.length > 0 ? (
                    item.subtasks.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 rounded border bg-background/50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">{sub.humanId}</span>
                          <span className="font-medium">{sub.title}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {(sub as any).stage?.name || "Stage"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No subtasks created for this item.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ATTACHMENTS & MEDIA */}
            {activeTab === "attachments" && (
              <div className="space-y-6">
                {/* Action Bar: Upload File & Record Audio */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                      }}
                      accept="image/*,audio/*,.pdf,.txt,.log,.json"
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploading ? "Uploading..." : "Upload Screenshot / File"}</span>
                    </Button>
                  </div>

                  {/* Audio Recorder Controls */}
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startRecording}
                        className="h-8 text-xs gap-1.5 border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Record Voice Note</span>
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-lg">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs font-mono font-bold text-rose-600">
                          {Math.floor(recordingSeconds / 60)}:
                          {(recordingSeconds % 60).toString().padStart(2, "0")}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={stopRecording}
                          className="h-6 text-[10px] px-2 ml-1"
                        >
                          <MicOff className="h-3 w-3 mr-1" />
                          <span>Stop & Save</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments List */}
                <div className="space-y-3">
                  {attachments.length === 0 ? (
                    <div className="text-center py-10 border border-dashed rounded-xl bg-card/40">
                      <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-xs font-medium text-foreground">No attachments yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload bug screenshots, logs, or record audio voice notes stored locally in public/uploads.
                      </p>
                    </div>
                  ) : (
                    attachments.map((att) => {
                      const isImage =
                        att.mimeType?.startsWith("image/") ||
                        /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || "");
                      const isAudio =
                        att.mimeType?.startsWith("audio/") ||
                        /\.(mp3|wav|webm|ogg|m4a)$/i.test(att.name || "");

                      return (
                        <div
                          key={att.id}
                          className="p-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-colors shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {isImage ? (
                                <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                              ) : isAudio ? (
                                <Music className="h-4 w-4 text-purple-500 shrink-0" />
                              ) : (
                                <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-foreground truncate block">
                                  {att.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {att.sizeBytes
                                    ? `${Math.round(att.sizeBytes / 1024)} KB • `
                                    : ""}
                                  {formatDateTime(att.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.name}
                                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                title="Download / Open"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Delete attachment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Image Preview */}
                          {isImage && (
                            <div className="mt-2 rounded-lg overflow-hidden border max-w-md bg-muted/10">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full max-h-60 object-contain"
                              />
                            </div>
                          )}

                          {/* Built-in Audio Player */}
                          {isAudio && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/30 border">
                              <audio
                                controls
                                src={att.url}
                                className="w-full h-8"
                                preload="metadata"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ACTIVITY & COMMENTS */}
            {activeTab === "activity" && (
              <div className="space-y-6">
                {/* Add Comment */}
                <form onSubmit={handleAddComment} className="space-y-2">
                  <Textarea
                    rows={2}
                    value={newCommentBody}
                    onChange={(e) => setNewCommentBody(e.target.value)}
                    placeholder="Write a comment or update (Markdown supported)..."
                    className="text-xs"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" className="h-7 text-xs">
                      Post Comment
                    </Button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Comments
                  </h5>
                  {item.comments && item.comments.length > 0 ? (
                    item.comments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg border bg-background/50 text-xs space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="font-bold text-foreground">{comment.author}</span>
                          <span className="text-[10px]">{formatDateTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {comment.body}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  )}
                </div>

                {/* Activity Log */}
                <div className="space-y-2 pt-2 border-t">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Activity History
                  </h5>
                  {item.activityLogs && item.activityLogs.length > 0 ? (
                    item.activityLogs.map((act) => (
                      <div key={act.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Activity className="h-3 w-3 text-muted-foreground/60" />
                        <span className="font-medium text-foreground">{act.author}</span>
                        <span>{act.action.replace("_", " ").toLowerCase()}:</span>
                        {act.fromValue && <span className="line-through">{act.fromValue}</span>}
                        {act.toValue && <span className="font-semibold text-foreground">&rarr; {act.toValue}</span>}
                        <span className="text-[10px] ml-auto">{formatDate(act.createdAt)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No activity recorded.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Properties */}
          <div className="w-full md:w-72 border-t md:border-t-0 md:border-l bg-muted/15 p-5 space-y-4 overflow-y-auto text-xs">
            {/* Project Selector */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                <span>Project</span>
                {isChangingProject && (
                  <span className="text-[10px] text-primary animate-pulse">Moving...</span>
                )}
              </label>
              <div className="relative">
                <select
                  disabled={isChangingProject}
                  value={item.projectId || "NONE"}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full h-8 text-xs bg-background border rounded px-2 font-medium cursor-pointer focus:ring-1 focus:ring-primary truncate"
                >
                  <option value="NONE">
                    ✨ No Project (General / {item.company || user?.company || "Company"})
                  </option>
                  {!availableProjects.some((p) => p.id === item.projectId) && item.project && item.projectId && (
                    <option value={item.projectId}>
                      {item.project.name} ({item.project.key})
                    </option>
                  )}
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Workflow Stage
              </label>
              <select
                value={stageId || ""}
                onChange={(e) => {
                  const sId = e.target.value;
                  setStageId(sId);
                  handleSaveField({ stageId: sId });
                }}
                className="w-full h-8 text-xs bg-background border rounded px-2 font-medium"
              >
                {currentStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isDoneStage ? "(Done)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  const p = e.target.value as Priority;
                  setPriority(p);
                  handleSaveField({ priority: p });
                }}
                className="w-full h-8 text-xs bg-background border rounded px-2 font-medium"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => {
                  const ass = e.target.value;
                  setAssignee(ass);
                  handleSaveField({ assignee: ass || null });
                }}
                className="w-full h-8 text-xs bg-background border rounded px-2"
              >
                <option value="">Unassigned</option>
                {allMembers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Due Date
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleSaveField({
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  });
                }}
                className="h-8 text-xs"
              />
            </div>

            {/* Estimate */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Estimate (Hours)
              </label>
              <Input
                type="number"
                min={0}
                value={estimateHours}
                onChange={(e) => {
                  setEstimateHours(e.target.value);
                  handleSaveField({
                    estimateHours: e.target.value ? parseFloat(e.target.value) : null,
                  });
                }}
                placeholder="e.g. 8"
                className="h-8 text-xs"
              />
            </div>

            {/* Reporter info */}
            <div className="pt-3 border-t text-[11px] text-muted-foreground space-y-1.5">
              <div className="flex justify-between">
                <span>Reporter:</span>
                <span className="font-medium text-foreground">{item.reporter}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{formatDate(item.createdAt)}</span>
              </div>
              {item.completedAt && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <span>Completed:</span>
                  <span>{formatDate(item.completedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
