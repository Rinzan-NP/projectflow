"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export type KnownUsername = "nprinzan" | "solinify_1" | "gingr_h";

export interface AuthUser {
  username: string;
  name: string;
  company: string; // "ALL" for superadmin nprinzan, or specific company name
  role: "ADMIN" | "CLIENT";
  avatarText: string;
  avatarBg: string;
}

export const KNOWN_ACCOUNTS: Record<string, AuthUser> = {
  nprinzan: {
    username: "nprinzan",
    name: "Rinzan",
    company: "ALL",
    role: "ADMIN",
    avatarText: "RN",
    avatarBg: "#2563eb",
  },
  solinify_1: {
    username: "solinify_1",
    name: "Solinify Client",
    company: "Solinify",
    role: "CLIENT",
    avatarText: "S1",
    avatarBg: "#059669",
  },
  gingr_h: {
    username: "gingr_h",
    name: "Gingr Hub",
    company: "Gingr",
    role: "CLIENT",
    avatarText: "GH",
    avatarBg: "#10b981",
  },
};

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check saved session in localStorage / cookies
    const saved = localStorage.getItem("projectflow_username");
    if (saved && KNOWN_ACCOUNTS[saved.toLowerCase()]) {
      const u = KNOWN_ACCOUNTS[saved.toLowerCase()];
      setUser(u);
      document.cookie = `projectflow_username=${u.username}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = (usernameInput: string): boolean => {
    const key = usernameInput.trim().toLowerCase();
    const found = KNOWN_ACCOUNTS[key];
    if (found) {
      setUser(found);
      localStorage.setItem("projectflow_username", found.username);
      document.cookie = `projectflow_username=${found.username}; path=/; max-age=31536000; SameSite=Lax`;
      router.push("/projects");
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("projectflow_username");
    document.cookie = "projectflow_username=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
