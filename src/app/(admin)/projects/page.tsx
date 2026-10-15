"use client";

import Topbar from "../../../components/Topbar";
import Link from "next/link";
import styles from "./page.module.css";
import { useLanguage } from "../../../context/LanguageContext";
import { useEffect, useState } from "react";

interface Project {
  id: string;
  projectNumber: string;
  title: string;
  customerReference: string | null;
  quoteDeadline: string | null;
  status: string;
}

const statusClassMap: Record<string, string> = {
  draft: "statusDraft",
  rfqs_sent: "statusSent",
  quotes_received: "statusSent",
  evaluation: "statusSent",
  completed: "statusComplete",
  cancelled: "statusDraft",
};

export default function ProjectsPage() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusLabels: Record<string, string> = {
    draft: t("statusDraft"),
    rfqs_sent: t("statusSent"),
    quotes_received: t("quotesReceived"),
    evaluation: t("statusEvaluation"),
    completed: t("statusComplete"),
    cancelled: t("statusCancelled"),
  };

  return (
    <div>
      <Topbar title={t("projectsTitle")} subtitle={t("projectsSubtitle")}>
        <Link href="/projects/new">
          <button className={styles.btnPrimary}>{t("newProject")}</button>
        </Link>
      </Topbar>

      <div className={styles.content}>
        <div className={styles.tableContainer}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{t("loading")}</div>
          ) : projects.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
              {t("noProjectsYet")}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("thProjectRef")}</th>
                  <th>{t("thTitle")}</th>
                  <th>{t("thCustomer")}</th>
                  <th>{t("thDeadline")}</th>
                  <th>{t("thStatus")}</th>
                  <th>{t("thAction")}</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.projectNumber}</td>
                    <td>
                      <Link href={`/projects/${p.id}`}>
                        <strong style={{ cursor: "pointer", color: "var(--text-dark)" }}>{p.title}</strong>
                      </Link>
                    </td>
                    <td>{p.customerReference || "—"}</td>
                    <td>{p.quoteDeadline ? new Date(p.quoteDeadline).toLocaleDateString() : "—"}</td>
                    <td>
                      <span className={styles[statusClassMap[p.status] || "statusDraft"]}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td>
                      {p.status === "draft" ? (
                        <Link href={`/projects/${p.id}/edit`}>
                          <button className={styles.actionBtn}>{t("edit")}</button>
                        </Link>
                      ) : (
                        <Link href={`/projects/${p.id}/compare`}>
                          <button className={styles.actionBtn}>{t("compareQuotes")}</button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
