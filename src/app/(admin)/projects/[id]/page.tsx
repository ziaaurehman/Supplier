"use client";

import Topbar from "../../../../components/Topbar";
import styles from "./page.module.css";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../../context/LanguageContext";
import { useAuth } from "../../../../context/AuthContext";
import ItemAttachments from "../../../../components/ItemAttachments";

interface RfqStatus {
  id: string;
  token: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  respondedAt: string | null;
  unreadCount?: number;
  supplier: { id: string; name: string };
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  decorationMethod: string | null;
  quantityTiers: { quantity: number }[];
}

interface ProjectAttachment {
  id: string;
  projectItemId: string | null;
  rfqId: string | null;
  uploadedBySupplier: boolean;
  visibleToSupplier: boolean;
  fileName: string;
  mimeType: string | null;
  signedUrl: string | null;
  createdAt: string;
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
  isNew?: boolean;
}

interface InternalNote {
  id: string;
  content: string;
  createdAt: string;
  user: { fullName: string | null; email: string };
}

export default function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, language } = useLanguage();
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
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [shareNewUpload, setShareNewUpload] = useState(false);
  const [copiedRfqId, setCopiedRfqId] = useState<string | null>(null);

  const handleCopyLink = async (rfq: RfqStatus) => {
    const url = `${window.location.origin}/quote/${rfq.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRfqId(rfq.id);
      setTimeout(() => setCopiedRfqId((current) => (current === rfq.id ? null : current)), 2000);
    } catch {
      window.prompt(t("copyLinkManually"), url);
    }
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/notes`).then((r) => r.json()).catch(() => ({ notes: [] })),
    ]).then(([projectData, notesData]) => {
      setProject(projectData.project);
      setNotes(notesData.notes || []);
      const rfqs: RfqStatus[] = projectData.project?.rfqs || [];
      if (rfqs.length) {
        const requested = new URLSearchParams(window.location.search).get("rfq");
        const initial =
          rfqs.find((r) => r.id === requested) ||
          rfqs.find((r) => (r.unreadCount ?? 0) > 0) ||
          rfqs[0];
        setSelectedRfq(initial.id);
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
      formData.append("visibleToSupplier", String(shareNewUpload));
      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setAttachments((prev) => [...prev, data.attachment]);
      } else {
        alert(data.error || t("uploadFailed"));
      }
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const projectLoaded = !!project;
  useEffect(() => {
    if (!selectedRfq || !projectLoaded) return;
    fetch(`/api/rfqs/admin/${selectedRfq}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        setProject((prev) =>
          prev && prev.rfqs.some((r) => r.id === selectedRfq && (r.unreadCount ?? 0) > 0)
            ? { ...prev, rfqs: prev.rfqs.map((r) => (r.id === selectedRfq ? { ...r, unreadCount: 0 } : r)) }
            : prev
        );
      })
      .catch(() => setMessages([]));
  }, [selectedRfq, projectLoaded]);

  useEffect(() => {
    const section = window.location.hash.slice(1);
    if (projectLoaded && (section === "messages" || section === "attachments")) {
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [projectLoaded]);

  const openConversation = (rfqId: string) => {
    setSelectedRfq(rfqId);
    setActiveTab("message");
    document.getElementById("messages")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      case "sent": return styles.statusSent;
      case "opened": return styles.statusOpened;
      case "quoted": return styles.statusQuoted;
      case "declined": return styles.statusDeclined;
      default: return styles.statusNeutral;
    }
  };

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  const rfqEventDate = (rfq: RfqStatus) =>
    rfq.status === "quoted" || rfq.status === "declined"
      ? rfq.respondedAt
      : rfq.status === "opened"
        ? rfq.openedAt
        : rfq.sentAt;

  const rfqTimeline = (rfq: RfqStatus) =>
    [
      rfq.sentAt && `${t("rfqSent")}: ${formatDateTime(rfq.sentAt)}`,
      rfq.openedAt && `${t("rfqOpened")}: ${formatDateTime(rfq.openedAt)}`,
      rfq.respondedAt && `${rfqStatusLabel(rfq.status)}: ${formatDateTime(rfq.respondedAt)}`,
    ].filter(Boolean).join("\n");

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

  const handleToggleShare = async (a: ProjectAttachment) => {
    const share = !a.visibleToSupplier;
    if (share && !confirm(t("shareFileConfirm"))) return;
    const res = await fetch(`/api/attachments/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToSupplier: share }),
    });
    if (res.ok) {
      setAttachments((prev) => prev.map((x) => (x.id === a.id ? { ...x, visibleToSupplier: share } : x)));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("error"));
    }
  };

  const generalAttachments = attachments
    .filter((a) => !a.projectItemId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const teamFiles = generalAttachments.filter((a) => !a.uploadedBySupplier);
  const supplierFileGroups = (project?.rfqs || [])
    .map((rfq) => ({ rfq, files: generalAttachments.filter((a) => a.uploadedBySupplier && a.rfqId === rfq.id) }))
    .filter((g) => g.files.length > 0);

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
                  {project.rfqs.map((rfq) => {
                    const eventDate = rfqEventDate(rfq);
                    const copied = copiedRfqId === rfq.id;
                    return (
                      <li key={rfq.id} className={styles.supplierItem}>
                        <div className={styles.supplierInfo}>
                          <strong>
                            {rfq.supplier.name}
                            {(rfq.unreadCount ?? 0) > 0 && (
                              <button
                                type="button"
                                className={styles.unreadBadge}
                                onClick={() => openConversation(rfq.id)}
                                title={t("tabMessages")}
                              >
                                {t("newMessagesCount").replace("{count}", String(rfq.unreadCount))}
                              </button>
                            )}
                          </strong>
                          {eventDate && (
                            <span title={rfqTimeline(rfq)}>{formatDateTime(eventDate)}</span>
                          )}
                        </div>
                        <div className={styles.supplierActions}>
                          <span className={`${styles.statusPill} ${rfqStatusClass(rfq.status)}`}>
                            {rfqStatusLabel(rfq.status)}
                          </span>
                          <button
                            type="button"
                            className={`${styles.copyLinkBtn} ${copied ? styles.copyLinkBtnDone : ""}`}
                            onClick={() => handleCopyLink(rfq)}
                            title={copied ? t("linkCopied") : t("copyLinkHint")}
                            aria-label={copied ? t("linkCopied") : t("copyLink")}
                          >
                            {copied ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </li>
                    );
                  })}
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
                  <ItemAttachments
                    files={attachments
                      .filter((a) => a.projectItemId === item.id)
                      .reverse()
                      .map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, url: a.signedUrl }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.card} id="attachments">
              <h2 className={styles.sectionTitle}>{t("attachFile")}</h2>

              <h3 className={styles.fileGroupTitle}>{t("filesFromSuppliers")}</h3>
              {supplierFileGroups.length === 0 ? (
                <p className={styles.fileEmpty}>{t("noSupplierFiles")}</p>
              ) : (
                supplierFileGroups.map(({ rfq, files }) => (
                  <div key={rfq.id} className={styles.fileGroup}>
                    <div className={styles.fileGroupSupplier}>{rfq.supplier.name}</div>
                    {files.map((a) => (
                      <div key={a.id} className={styles.fileRow}>
                        <span className={styles.fileName} title={a.fileName}>{a.fileName}</span>
                        <span className={styles.fileMeta}>{formatDateTime(a.createdAt)}</span>
                        {a.signedUrl && (
                          <a href={a.signedUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>{t("download")}</a>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}

              <h3 className={styles.fileGroupTitle}>{t("internalFiles")}</h3>
              {teamFiles.length === 0 ? (
                <p className={styles.fileEmpty}>{t("noTeamFiles")}</p>
              ) : (
                <div className={styles.fileGroup}>
                  {teamFiles.map((a) => (
                    <div key={a.id} className={styles.fileRow}>
                      <span className={styles.fileName} title={a.fileName}>{a.fileName}</span>
                      <span className={a.visibleToSupplier ? styles.shareBadgeShared : styles.shareBadgeInternal}>
                        {a.visibleToSupplier ? t("sharedWithSuppliers") : t("internalOnly")}
                      </span>
                      {a.signedUrl && (
                        <a href={a.signedUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>{t("download")}</a>
                      )}
                      <button type="button" className={styles.shareToggle} onClick={() => handleToggleShare(a)}>
                        {a.visibleToSupplier ? t("makeInternal") : t("shareWithSuppliers")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.uploadRow}>
                <label className={styles.uploadBtn} style={{ cursor: uploadingFile ? "wait" : "pointer" }}>
                  {uploadingFile ? t("uploading") : t("uploadFile")}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" hidden onChange={handleFileUpload} disabled={uploadingFile} />
                </label>
                <label className={styles.shareCheckbox}>
                  <input type="checkbox" checked={shareNewUpload} onChange={(e) => setShareNewUpload(e.target.checked)} />
                  {t("shareWithSuppliers")}
                </label>
              </div>
              <p className={styles.fileHint}>{t("fileTypes")}</p>
            </div>

            <div className={styles.card} id="messages">
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
                      <option key={rfq.id} value={rfq.id}>
                        {rfq.supplier.name}
                        {(rfq.unreadCount ?? 0) > 0 ? ` (${t("newMessagesCount").replace("{count}", String(rfq.unreadCount))})` : ""}
                      </option>
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
                          <strong>
                            {msg.senderType === "supplier"
                              ? project.rfqs.find((r) => r.id === selectedRfq)?.supplier.name || t("supplierLabel")
                              : msg.senderName || t("you")}
                          </strong>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          {msg.isNew && <span className={styles.newPill}>{t("newBadge")}</span>}
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
                {activeTab === "message" && project.rfqs.length > 0 && (
                  <p className={styles.replyHint}>{t("supplierNotifiedHint")}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
