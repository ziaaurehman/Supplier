"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

export type Role = "ADMIN" | "INTERNAL_SALES" | "FIELD_SALES" | null;

interface AuthContextType {
  role: Role;
  login: (role: Role) => void;
  logout: () => void;
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const router = useRouter();

  // Hydrate from localStorage
  useEffect(() => {
    const savedRole = localStorage.getItem("mock_role") as Role;
    if (savedRole) {
      // eslint-disable-next-line
      setRole(savedRole);
    }
    // eslint-disable-next-line
    setIsHydrated(true);
  }, []);

  const login = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem("mock_role", newRole as string);
    router.push("/");
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem("mock_role");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ role, login, logout, isHydrated }}>
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
