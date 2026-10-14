"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SupplierSelectionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      Redirecting... Create a project first, then select suppliers.
    </div>
  );
}
