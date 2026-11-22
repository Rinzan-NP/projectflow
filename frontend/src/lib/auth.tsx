"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
  user: AuthUser;
  login: (username: string) => boolean;
  logout: () => void;
  openLoginModal: () => void;
  isLoginModalOpen: boolean;
  closeLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(KNOWN_ACCOUNTS["nprinzan"]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    // Check saved session in localStorage
    const saved = localStorage.getItem("projectflow_username");
    if (saved && KNOWN_ACCOUNTS[saved.toLowerCase()]) {
      const u = KNOWN_ACCOUNTS[saved.toLowerCase()];
      setUser(u);
      document.cookie = `projectflow_username=${u.username}; path=/; max-age=31536000`;
    }
  }, []);

  const login = (usernameInput: string): boolean => {
    const key = usernameInput.trim().toLowerCase();
    const found = KNOWN_ACCOUNTS[key];
    if (found) {
      setUser(found);
      localStorage.setItem("projectflow_username", found.username);
      document.cookie = `projectflow_username=${found.username}; path=/; max-age=31536000`;
      setIsLoginModalOpen(false);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem("projectflow_username");
    document.cookie = "projectflow_username=; path=/; max-age=0";
    setIsLoginModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        openLoginModal: () => setIsLoginModalOpen(true),
        isLoginModalOpen,
        closeLoginModal: () => setIsLoginModalOpen(false),
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
