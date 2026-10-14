"use client";

import Topbar from "../../../components/Topbar";
import { useLanguage } from "../../../context/LanguageContext";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  INTERNAL_SALES: "Internal Sales",
  FIELD_SALES: "Field Sales",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "#7c3aed",
  INTERNAL_SALES: "#0369a1",
  FIELD_SALES: "#059669",
};

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: "", fullName: "", role: "INTERNAL_SALES" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!formData.email || !formData.fullName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ email: "", fullName: "", role: "INTERNAL_SALES" });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create user");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) fetchUsers();
  };

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchUsers();
    }
  };

  return (
    <div>
      <Topbar title={t("userManagement")} subtitle={t("userManagementSubtitle")}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "8px 20px", background: "var(--primary-color)", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          + Add User
        </button>
      </Topbar>

      <div style={{ padding: 40 }}>
        {showForm && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "var(--primary-color)" }}>New User</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Max Mustermann"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 14, fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@company.com"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 14, fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 14, fontFamily: "inherit" }}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="INTERNAL_SALES">Internal Sales</option>
                  <option value="FIELD_SALES">Field Sales</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCreate}
                disabled={saving || !formData.email || !formData.fullName}
                style={{ padding: "8px 20px", background: "var(--primary-color)", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Creating..." : "Create User"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: "8px 20px", background: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Email", "Role", "Status", "Created", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#64748b", borderBottom: "1px solid #e2e8f0", background: "#fafafa" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No users found.</td></tr>
              )}
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9", opacity: user.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 500 }}>{user.fullName}</td>
                  <td style={{ padding: "10px 16px", fontSize: 13, color: "#64748b" }}>{user.email}</td>
                  <td style={{ padding: "10px 16px" }}>
                    {editingId === user.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => { setEditRole(e.target.value); handleRoleChange(user.id, e.target.value); }}
                        style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 12, fontFamily: "inherit" }}
                        autoFocus
                        onBlur={() => setEditingId(null)}
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="INTERNAL_SALES">Internal Sales</option>
                        <option value="FIELD_SALES">Field Sales</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => { setEditingId(user.id); setEditRole(user.role); }}
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${ROLE_COLORS[user.role] || "#64748b"}15`,
                          color: ROLE_COLORS[user.role] || "#64748b",
                          cursor: "pointer",
                        }}
                        title="Click to change role"
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: user.isActive ? "#059669" : "#94a3b8" }}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#94a3b8" }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <button
                      onClick={() => handleToggleActive(user)}
                      style={{
                        padding: "4px 12px",
                        border: "1px solid #e2e8f0",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "inherit",
                        color: user.isActive ? "#ef4444" : "#059669",
                      }}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
