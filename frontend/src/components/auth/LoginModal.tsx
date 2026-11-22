"use client";

import React, { useState } from "react";
import { useAuth, KNOWN_ACCOUNTS } from "@/lib/auth";
import {
  X,
  User,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginModal() {
  const { user, login, logout, isLoginModalOpen, closeLoginModal } = useAuth();
  const [usernameInput, setUsernameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

  const handleSelectAccount = (username: string) => {
    setError(null);
    login(username);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!usernameInput.trim()) {
      setError("Please enter a username.");
      return;
    }

    const success = login(usernameInput.trim());
    if (!success) {
      setError(
        `User "${usernameInput}" not found. Allowed logins: nprinzan, solinify_1, gingr_h`
      );
    } else {
      setUsernameInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border bg-card text-card-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Switch Account / Sign In</h2>
              <p className="text-xs text-muted-foreground">
                Select your company profile to access projects and report issues.
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Currently Signed In Box */}
          <div className="p-3.5 rounded-xl border bg-secondary/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="h-10 w-10 rounded-xl text-white font-bold flex items-center justify-center shrink-0 shadow-xs text-sm"
                style={{ backgroundColor: user.avatarBg }}
              >
                {user.avatarText}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground truncate">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    @{user.username}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>
                    {user.company === "ALL"
                      ? "Admin (All Companies)"
                      : `${user.company} Company`}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md shrink-0">
              Active Now
            </span>
          </div>

          {/* 1-Click Available Accounts */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
              Available Company Accounts (1-Click)
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {Object.values(KNOWN_ACCOUNTS).map((acc) => {
                const isCurrent = acc.username === user.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleSelectAccount(acc.username)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-border/80 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0"
                        style={{ backgroundColor: acc.avatarBg }}
                      >
                        {acc.avatarText}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {acc.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({acc.username})
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {acc.company === "ALL" ? (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                              <ShieldCheck className="h-3 w-3" />
                              Superadmin • Full Access
                            </span>
                          ) : (
                            <span>
                              Filtered to <strong className="font-semibold text-foreground">{acc.company}</strong> projects
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Or enter username directly */}
          <div className="pt-2 border-t">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="text-xs font-semibold text-muted-foreground block">
                Or Sign In with Username
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username (e.g. solinify_1)..."
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (error) setError(null);
                  }}
                  className="h-9 text-xs"
                />
                <Button type="submit" size="sm" className="h-9 px-4 shrink-0 font-medium">
                  Sign In
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
