"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { GlobalCreateModal } from "@/components/shared/GlobalCreateModal";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isLoginPage = pathname === "/login";

  // If inside a project page (e.g. /projects/PP/board), extract the project key
  const projectMatch = pathname ? pathname.match(/^\/projects\/([^/]+)/) : null;
  const currentProjectKey = projectMatch ? decodeURIComponent(projectMatch[1]).toUpperCase() : undefined;

  // Protect all non-login pages: redirect unauthenticated users to /login
  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, isLoading, isLoginPage, router]);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K, 'c' to create, '/' to search
  useEffect(() => {
    if (isLoginPage) return;

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

      // Do not intercept if typing in an input or if modifier keys are active (Cmd+C, Ctrl+C, Alt, etc.)
      if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

      // Do not intercept if user has text selected on the page
      if (typeof window !== "undefined" && window.getSelection()?.toString().length) {
        return;
      }

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
  }, [isLoginPage]);

  // For /login route: render login page standalone (without app chrome)
  if (isLoginPage) {
    return <main className="min-h-screen w-screen bg-background">{children}</main>;
  }

  // Loading state or redirecting unauthenticated users
  if (isLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
        defaultProjectKey={currentProjectKey}
        hideProjectSelect={!!currentProjectKey}
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
