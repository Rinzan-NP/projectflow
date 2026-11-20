"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  CheckCircle2,
  Search,
  Plus,
  Moon,
  Sun,
  LayoutGrid,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  onOpenCommandPalette?: () => void;
  onOpenQuickCreate?: () => void;
}

export function Navbar({ onOpenCommandPalette, onOpenQuickCreate }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Brand & Left Nav */}
        <div className="flex items-center gap-6">
          <Link
            href="/projects"
            className="flex items-center gap-2 font-semibold text-foreground tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
              PM
            </div>
            <span className="text-base font-bold hidden sm:inline">ProjectFlow</span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <Link
              href="/projects"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/projects" || pathname.startsWith("/projects/")
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Projects</span>
            </Link>

            <Link
              href="/my-work"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                pathname === "/my-work"
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>My Work</span>
            </Link>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Search / CmdK button */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 h-8 px-2.5 rounded-md border border-input bg-muted/40 hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search or jump to...</span>
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Quick Create Item button */}
          {onOpenQuickCreate && (
            <Button
              onClick={onOpenQuickCreate}
              size="sm"
              className="h-8 gap-1 shadow-sm font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New</span>
              <kbd className="hidden lg:inline text-[10px] font-mono opacity-70 ml-1">
                C
              </kbd>
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
