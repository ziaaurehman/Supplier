"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Role = "ADMIN" | "INTERNAL_SALES" | "FIELD_SALES" | null;

interface DbUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

interface AuthContextType {
  role: Role;
  user: DbUser | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isHydrated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchDbUser = useCallback(async (): Promise<DbUser | null> => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      }
    } catch {
      // Network failure — treated as signed out
    }
    setUser(null);
    return null;
  }, []);

  useEffect(() => {
    fetchDbUser().finally(() => setIsHydrated(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchDbUser]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        const dbUser = await fetchDbUser();
        if (!dbUser) {
          await supabase.auth.signOut();
          return { error: "User not found in platform. Contact admin." };
        }
        router.push("/");
      }
      return {};
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ role, user, login, logout, isHydrated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
