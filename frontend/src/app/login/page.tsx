"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ProjectFlowIcon } from "@/components/shared/ProjectFlowIcon";
import { User, AlertCircle, ArrowRight, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, redirect straight to projects
    if (!isLoading && user) {
      router.replace("/projects");
    }
  }, [user, isLoading, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please enter your username.");
      return;
    }

    setSubmitting(true);
    const success = login(trimmed);
    if (!success) {
      setError("Username not found. Please enter a valid company username.");
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.2),rgba(0,0,0,0))] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-card border shadow-md mb-4">
            <ProjectFlowIcon size={36} className="h-9 w-9 rounded-lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to ProjectFlow
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Enter your company username to access your workspace.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-xl backdrop-blur-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  autoFocus
                  type="text"
                  placeholder="e.g. solinify_1"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  className="pl-9 h-10 text-sm bg-background/50 focus:bg-background"
                  disabled={submitting}
                  autoComplete="username"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !username.trim()}
              className="w-full h-10 text-sm font-semibold gap-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-[11px] text-muted-foreground">
              Sign in with your assigned username (<span className="font-mono text-foreground">nprinzan</span>, <span className="font-mono text-foreground">solinify_1</span>, or <span className="font-mono text-foreground">gingr_h</span>).
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          ProjectFlow Workspace • Secure Company Access
        </p>
      </div>
    </div>
  );
}
