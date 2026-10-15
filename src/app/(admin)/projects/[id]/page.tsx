"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";

interface RfqStatus {
  id: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  supplier: { id: string; name: string };
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  decorationMethod: string | null;
  quantityTiers: { quantity: number }[];
}

interface ProjectDetail {
  id: string;
  projectNumber: string;
  title: string;
  status: string;
  customerReference: string | null;
  quoteDeadline: string | null;
  deliveryDate: string | null;
  items: ProjectItem[];
  rfqs: RfqStatus[];
}

interface Message {
  id: string;
  content: string;
  senderType: string;
  senderName: string | null;
  createdAt: string;
}

interface InternalNote {
  id: string;
  content: string;
  createdAt: string;
  user: { fullName: string | null; email: string };
}

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { role } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"message" | "note">("message");
  const [selectedRfq, setSelectedRfq] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; fileName: string; fileUrl: string; createdAt: string }[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/notes`).then((r) => r.json()).catch(() => ({ notes: [] })),
    ]).then(([projectData, notesData]) => {
      setProject(projectData.project);
      setNotes(notesData.notes || []);
      if (projectData.project?.rfqs?.length) {
        setSelectedRfq(projectData.project.rfqs[0].id);
      }
    }).finally(() => setLoading(false));

    fetch(`/api/attachments?projectId=${id}`)
      .then((r) => r.json())
      .then((data) => setAttachments(data.attachments || []))
      .catch(() => {});
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(t("fileSizeLimit"));
      return;
    }
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", id);
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setAttachments((prev) => [...prev, data.attachment]);
      } else {
        const data = await res.json();
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!selectedRfq || !project) return;
    fetch(`/api/rfqs/admin/${selectedRfq}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => setMessages([]));
  }, [selectedRfq, project]);

  const handleSend = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      if (activeTab === "note") {
        const res = await fetch(`/api/projects/${id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyText.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setNotes([...notes, data.note]);
          setReplyText("");
        }
      } else {
        if (!selectedRfq) return alert("Select a supplier first");
        const res = await fetch(`/api/rfqs/admin/${selectedRfq}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: replyText.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages((prev) => [...prev, data.message]);
          setReplyText("");
        }
      }
    } finally {
      setSending(false);
    }
  };

  const rfqStatusClass = (status: string) => {
    switch (status) {
      case "quoted": return styles.statusQuoted;
      case "declined": return styles.statusDeclined;
      case "opened": return styles.statusPending;
      default: return styles.statusPending;
    }
  };

  const rfqStatusLabel = (status: string) => {
    switch (status) {
      case "sent": return t("rfqSent");
      case "opened": return t("rfqOpened");
      case "quoted": return t("quoted");
      case "declined": return t("declined");
      case "expired": return t("expired");
      default: return status;
    }
  };

  if (loading || !project) {
    return (
      <div>
        <Topbar title={t("loading")} subtitle="" backUrl="/projects" />
        <div style={{ padding: 40, textAlign: "center" }}>{t("loading")}</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title={`Project ${project.projectNumber}`}
        subtitle={`${project.title} • Deadline: ${project.quoteDeadline ? new Date(project.quoteDeadline).toLocaleDateString() : "—"}`}
        backUrl="/projects"
      >
        {project.status === "draft" && (
          <Link href={`/projects/${id}/suppliers`}>
            <button className={styles.btnPrimary}>{t("sendRFQs")}</button>
          </Link>
        )}
        {project.rfqs.some((r) => r.status === "quoted") && (
          <Link href={`/projects/${id}/compare`}>
            <button className={styles.btnPrimary}>{t("compareQuotes")}</button>
          </Link>
        )}
        {role === "ADMIN" && project.status !== "cancelled" && (
          <button
            style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}
            onClick={async () => {
              if (!confirm(t("cancelProjectConfirm"))) return;
              const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
              if (res.ok) router.push("/projects");
              else alert(t("cancelProjectFail"));
            }}
          >
            {t("cancel")}
          </button>
        )}
      </Topbar>

      <div className={styles.content}>
        <div className={styles.grid}>
          <div className={styles.column}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("supplierStatus")}</h2>
              {project.rfqs.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{t("noRfqsSent")}</p>
              ) : (
                <ul className={styles.supplierList}>
                  {project.rfqs.map((rfq) => (
                    <li key={rfq.id} className={styles.supplierItem}>
                      <div className={styles.supplierInfo}>
                        <strong>{rfq.supplier.name}</strong>
                        <span>
                          {rfq.status === "sent" && rfq.sentAt && `Sent: ${new Date(rfq.sentAt).toLocaleString()}`}
                          {rfq.status === "opened" && rfq.openedAt && `Opened: ${new Date(rfq.openedAt).toLocaleString()}`}
                          {rfq.status === "quoted" && t("quoteReceived")}
                          {rfq.status === "declined" && t("declined")}
                        </span>
                      </div>
                      <span className={rfqStatusClass(rfq.status)}>{rfqStatusLabel(rfq.status)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("projectDetails")}</h2>
              <p><strong>{t("thCustomer")}:</strong> {project.customerReference || "—"}</p>
              <p><strong>{t("deliveryDate")}:</strong> {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString() : "—"}</p>
              {project.items.map((item) => (
                <div key={item.id} style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                  <p><strong>{t("itemName")}:</strong> {item.name}</p>
                  {item.decorationMethod && <p><strong>{t("decoMethod")}:</strong> {item.decorationMethod}</p>}
                  <p><strong>{t("quantityTiers")}:</strong> {item.quantityTiers.map((qt) => qt.quantity).join(" / ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("attachFile")}</h2>
              {attachments.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {attachments.map((a) => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
                      <span>{a.fileName}</span>
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", fontSize: 12 }}>{t("download")}</a>
                      <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 11 }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ display: "inline-block", padding: "8px 16px", background: "#f1f5f9", borderRadius: 4, cursor: uploadingFile ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}>
                {uploadingFile ? t("uploading") : t("uploadFile")}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" style={{ display: "none" }} onChange={handleFileUpload} disabled={uploadingFile} />
              </label>
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>{t("fileTypes")}</span>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>{t("messagingNotes")}</h2>

              {project.rfqs.length > 0 && activeTab === "message" && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>{t("supplierLabel")}</label>
                  <select
                    value={selectedRfq}
                    onChange={(e) => setSelectedRfq(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 13, fontFamily: "inherit" }}
                  >
                    {project.rfqs.map((rfq) => (
                      <option key={rfq.id} value={rfq.id}>{rfq.supplier.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.chatBox}>
                {activeTab === "note" ? (
                  notes.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      {t("noNotesYet")}
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className={`${styles.messageGroup} ${styles.internalNote}`}>
                        <div className={styles.messageHeader}>
                          <strong>{note.user?.fullName || note.user?.email}</strong>
                          <span className={styles.internalBadge}>{t("internalNote")}</span>
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <div className={styles.messageBubble}>{note.content}</div>
                      </div>
                    ))
                  )
                ) : (
                  messages.length === 0 ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                      {t("noMessagesYet")}
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`${styles.messageGroup} ${msg.senderType === "supplier" ? "" : styles.outgoing}`}>
                        <div className={styles.messageHeader}>
                          <strong>{msg.senderName || (msg.senderType === "supplier" ? "Supplier" : "You")}</strong>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <div className={styles.messageBubble}>{msg.content}</div>
                      </div>
                    ))
                  )
                )}
              </div>

              <div className={styles.replyBox}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${activeTab === "message" ? styles.activeTab : ""}`}
                    onClick={() => setActiveTab("message")}
                    style={activeTab === "message" ? { background: "#e0f2fe", color: "#0369a1" } : {}}
                  >
                    {t("replySupplier")}
                  </button>
                  <button
                    className={`${styles.tab} ${activeTab === "note" ? styles.internalTab : ""}`}
                    onClick={() => setActiveTab("note")}
                    style={activeTab === "note" ? { background: "#fef3c7", color: "#92400e" } : {}}
                  >
                    {t("addInternalNote")}
                  </button>
                </div>
                <textarea
                  rows={3}
                  placeholder={activeTab === "note" ? t("addNotePlaceholder") : t("typeMessagePlaceholder")}
                  className={styles.replyTextarea}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                ></textarea>
                <div className={styles.replyActions}>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleSend}
                    disabled={sending || !replyText.trim()}
                  >
                    {sending ? t("sending") : activeTab === "note" ? t("addNote") : t("sendMessage")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
