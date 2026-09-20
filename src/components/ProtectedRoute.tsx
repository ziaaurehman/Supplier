"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { role, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !role) {
      router.push("/login");
    }
  }, [role, isHydrated, router]);

  if (!isHydrated || !role) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
