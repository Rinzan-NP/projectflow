"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { GlobalCreateModal } from "@/components/shared/GlobalCreateModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K, 'c' to create, '/' to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setIsCreateOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        setIsCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <Sidebar
        onOpenCommandPalette={() => setIsCommandOpen(true)}
        onOpenQuickCreate={() => setIsCreateOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <main className="flex-1">{children}</main>
      </div>

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onOpenCreateItem={() => {
          setIsCommandOpen(false);
          setIsCreateOpen(true);
        }}
      />

      <GlobalCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
