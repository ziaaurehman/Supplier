"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../../../context/LanguageContext";

export default function SupplierSelectionRedirect() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    router.replace("/projects");
  }, [router]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      {t("redirecting")} {t("createProjectFirst")}
    </div>
  );
}
