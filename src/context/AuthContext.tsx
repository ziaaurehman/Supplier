"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

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
  supabaseUser: SupabaseUser | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isHydrated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchDbUser = useCallback(async (authUser: SupabaseUser) => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      }
    } catch {
      // User not in DB yet
    }
    return null;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setSupabaseUser(authUser);
        await fetchDbUser(authUser);
      }
      setIsHydrated(true);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setSupabaseUser(session.user);
          await fetchDbUser(session.user);
        } else if (event === "SIGNED_OUT") {
          setSupabaseUser(null);
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, fetchDbUser]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data.user) {
        setSupabaseUser(data.user);
        const dbUser = await fetchDbUser(data.user);
        if (!dbUser) return { error: "User not found in platform. Contact admin." };
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
    setSupabaseUser(null);
    router.push("/login");
  };

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider value={{ role, user, supabaseUser, login, logout, isHydrated, isLoading }}>
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
