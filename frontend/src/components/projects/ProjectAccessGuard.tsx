"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectAccessGuardProps {
  projectCompany?: string;
  projectName: string;
  children: React.ReactNode;
}

export function ProjectAccessGuard({
  projectCompany,
  projectName,
  children,
}: ProjectAccessGuardProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  // If superadmin (user.company === "ALL"), full access granted
  if (user.company === "ALL") {
    return <>{children}</>;
  }

  // If project has no company or matches user company, access granted
  if (!projectCompany || projectCompany === user.company) {
    return <>{children}</>;
  }

  // Otherwise, company access mismatch: show clean access restricted message
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground">
        Access Restricted
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        <strong>{projectName}</strong> belongs to the{" "}
        <span className="font-semibold text-foreground">{projectCompany}</span> workspace.
        You are currently signed in as{" "}
        <span className="font-semibold text-foreground">{user.name}</span> (@{user.username}) from{" "}
        <span className="font-semibold text-foreground">{user.company}</span>.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <Link href="/projects">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Go to My Projects</span>
          </Button>
        </Link>
        <Button onClick={logout} variant="secondary" className="gap-2">
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </Button>
      </div>
    </div>
  );
}
