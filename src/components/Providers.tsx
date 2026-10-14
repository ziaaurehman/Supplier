"use client";

import { LanguageProvider } from "../context/LanguageContext";
import { AuthProvider } from "../context/AuthContext";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
        <Toaster position="top-right" />
      </LanguageProvider>
    </AuthProvider>
  );
}
