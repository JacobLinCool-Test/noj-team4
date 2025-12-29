'use client';

import { createContext, useContext } from "react";
import { useAuthProvider } from "@/hooks/useAuth";

const AuthContext = createContext<ReturnType<typeof useAuthProvider> | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthProvider();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
