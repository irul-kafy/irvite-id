"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./staff.css";

interface StaffItem {
  id: string;
  email: string;
  isActive: boolean;
  assignedEventCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AssignedEvent {
  id: string;
  title: string;
  slug: string;
  status: string;
  eventDate: string;
  assignedAt: string;
}

interface StaffDetail extends StaffItem {
  role: string;
  assignedEvents: AssignedEvent[];
}

export default function StaffClient() {
  const router = useRouter();

  // Auth / Role state
  const [checkingRole, setCheckingRole] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // List data state
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Status toggle confirmation modal state
  const [targetToggleStaff, setTargetToggleStaff] = useState<StaffItem | null>(
    null,
  );
  const [toggleLoading, setToggleLoading] = useState(false);

  // Password reset modal state
  const [targetResetStaff, setTargetResetStaff] = useState<StaffItem | null>(
    null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Edit email modal state
  const [targetEditStaff, setTargetEditStaff] = useState<StaffItem | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Staff detail modal state
  const [detailStaff, setDetailStaff] = useState<StaffDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // 1. Verify SUPER_ADMIN role
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (isMounted && data?.user) {
          if (data.user.role === "SUPER_ADMIN") {
            setIsSuperAdmin(true);
          } else {
            setIsSuperAdmin(false);
          }
        }
      })
      .catch(() => {
        if (isMounted) setIsSuperAdmin(false);
      })
      .finally(() => {
        if (isMounted) setCheckingRole(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  // 2. Refresh staff list helper
  const refreshStaffList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/staff?${params.toString()}`);

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setError(
          "Akses ditolak. Hanya SUPER_ADMIN yang dapat mengelola data staff.",
        );
        return;
      }
      if (!res.ok) {
        throw new Error("Gagal memuat daftar staff.");
      }

      const data = await res.json();
      setStaffList(data.data || []);
      setMeta(data.meta || { page: 1, limit: 20, total: 0, totalPages: 0 });
    } catch {
      setError("Terjadi kesalahan saat memuat data staff.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, router]);

  // Initial and param change fetch (async IIFE without synchronous setState in effect)
  useEffect(() => {
    if (!isSuperAdmin) return;
    let ignore = false;

    void (async () => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (search.trim()) params.set("search", search.trim());
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/staff?${params.toString()}`);

        if (ignore) return;
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.status === 403) {
          setError(
            "Akses ditolak. Hanya SUPER_ADMIN yang dapat mengelola data staff.",
          );
          return;
        }
        if (!res.ok) {
          throw new Error("Gagal memuat daftar staff.");
        }

        const data = await res.json();
        if (ignore) return;
        setStaffList(data.data || []);
        setMeta(data.meta || { page: 1, limit: 20, total: 0, totalPages: 0 });
      } catch {
        if (!ignore) {
          setError("Terjadi kesalahan saat memuat data staff.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isSuperAdmin, page, search, statusFilter, router]);

  // Handle edit email
  const handleEditEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEditStaff) return;
    setEditError("");

    const trimmed = editEmail.trim();
    if (!trimmed) {
      setEditError("Email wajib diisi.");
      return;
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setEditError("Format email tidak valid.");
      return;
    }

    try {
      setEditLoading(true);
      const res = await fetch(`/api/staff/${targetEditStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 404) {
        setEditError("Staff tidak ditemukan atau telah dihapus.");
        return;
      }
      if (res.status === 409) {
        setEditError("Email sudah digunakan oleh akun lain.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(
          data.message || "Gagal memperbarui email staff. Periksa kembali format input.",
        );
        return;
      }

      const updated = await res.json();
      const updatedStaff = updated.data || updated;

      // Close modal
      setTargetEditStaff(null);
      setEditEmail("");

      // Update detail if open for this staff
      if (detailStaff && detailStaff.id === targetEditStaff.id) {
        setDetailStaff({
          ...detailStaff,
          email: updatedStaff.email || trimmed.toLowerCase(),
        });
      }

      // Refresh list
      await refreshStaffList();

      setNotification({
        type: "success",
        message: `Email staff berhasil diperbarui menjadi ${updatedStaff.email || trimmed.toLowerCase()}.`,
      });
    } catch {
      setEditError("Terjadi kesalahan koneksi saat memperbarui email staff.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle create staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createEmail.includes("@") || !createEmail.includes(".")) {
      setCreateError("Format email tidak valid.");
      return;
    }
    if (createPassword.length < 12) {
      setCreateError("Password minimal 12 karakter.");
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 409) {
        setCreateError("Email staff sudah terdaftar.");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setCreateError(errData.message || "Gagal menambahkan staff.");
        return;
      }

      // Success: clear inputs, never retain plaintext password
      setCreateEmail("");
      setCreatePassword("");
      setCreateConfirmPassword("");
      setShowCreateModal(false);
      setNotification({
        type: "success",
        message: "Akun operator staff berhasil dibuat.",
      });
      refreshStaffList();
    } catch {
      setCreateError("Terjadi kesalahan jaringan saat membuat staff.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle toggle status
  const handleToggleStatus = async () => {
    if (!targetToggleStaff) return;
    try {
      setToggleLoading(true);
      const nextStatus = !targetToggleStaff.isActive;

      const res = await fetch(`/api/staff/${targetToggleStaff.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: nextStatus,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Gagal memperbarui status staff.");
      }

      setNotification({
        type: "success",
        message: nextStatus
          ? `Staff ${targetToggleStaff.email} telah diaktifkan kembali.`
          : `Staff ${targetToggleStaff.email} telah dinonaktifkan. Akses scanner ditutup seketika.`,
      });
      setTargetToggleStaff(null);
      refreshStaffList();
    } catch {
      setNotification({
        type: "danger",
        message: "Gagal mengubah status staff.",
      });
    } finally {
      setToggleLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetStaff) return;
    setResetError("");

    if (newPassword.length < 12) {
      setResetError("Password baru minimal 12 karakter.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Konfirmasi password tidak cocok.");
      return;
    }

    try {
      setResetLoading(true);
      const res = await fetch(`/api/staff/${targetResetStaff.id}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setResetError(errData.message || "Gagal mereset password staff.");
        return;
      }

      // Success
      setNewPassword("");
      setConfirmNewPassword("");
      setTargetResetStaff(null);
      setNotification({
        type: "success",
        message: "Password staff berhasil diperbarui.",
      });
    } catch {
      setResetError("Terjadi kesalahan jaringan.");
    } finally {
      setResetLoading(false);
    }
  };

  // Handle view detail
  const handleOpenDetail = async (staffId: string) => {
    try {
      setDetailLoading(true);
      setDetailStaff(null);

      const res = await fetch(`/api/staff/${staffId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Gagal memuat detail staff.");
      }

      const data = await res.json();
      setDetailStaff(data);
    } catch {
      setNotification({
        type: "danger",
        message: "Gagal memuat detail staff.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="staff-page-container">
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          Memeriksa hak akses...
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="staff-page-container">
        <div className="alert-box danger" style={{ marginTop: "2rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>
            Akses Terbatas
          </h3>
          <p style={{ margin: 0 }}>
            Modul Manajemen Operator Staff global hanya dapat diakses oleh{" "}
            <strong>SUPER_ADMIN</strong>. Jika Anda adalah Admin Acara,
            penugasan staff scanner dapat dikelola langsung pada halaman
            masing-masing Acara melalui menu <strong>Tim Staff Acara</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-page-container">
      {/* Header */}
      <div className="staff-page-header">
        <div>
          <h1>Manajemen Staff Operator</h1>
          <p>
            Kelola akun operator scanner check-in untuk seluruh acara di
            platform
          </p>
        </div>
        <div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setCreateEmail("");
              setCreatePassword("");
              setCreateConfirmPassword("");
              setCreateError("");
              setShowCreateModal(true);
            }}
            id="btn-add-staff"
          >
            + Tambah Staff Baru
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`alert-box ${notification.type}`} role="alert">
          {notification.message}
          <button
            style={{
              float: "right",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
            onClick={() => setNotification(null)}
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="alert-box danger" role="alert">
          {error}
        </div>
      )}

      {/* Controls Card */}
      <div className="staff-controls-card">
        <div className="staff-search-box">
          <input
            type="text"
            className="staff-search-input"
            placeholder="Cari email staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Cari email staff"
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <label
            htmlFor="status-filter"
            style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}
          >
            Status:
          </label>
          <select
            id="status-filter"
            className="staff-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
              setPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="active">Hanya Aktif</option>
            <option value="inactive">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Staff Table Card */}
      <div className="staff-table-card">
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Email Operator</th>
                <th>Status</th>
                <th>Penugasan Acara</th>
                <th>Terdaftar Sejak</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Memuat data operator staff...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {search || statusFilter !== "all"
                      ? "Tidak ada staff yang sesuai dengan filter pencarian."
                      : "Belum ada akun staff operator yang terdaftar."}
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} id={`staff-row-${staff.id}`}>
                    <td style={{ fontWeight: 600 }}>{staff.email}</td>
                    <td>
                      <span
                        className={`staff-status-badge ${staff.isActive ? "active" : "inactive"}`}
                      >
                        {staff.isActive ? "● Aktif" : "○ Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {staff.assignedEventCount} Acara
                      </span>
                    </td>
                    <td
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {new Date(staff.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <div
                        className="staff-action-buttons"
                        style={{ justifyContent: "flex-end" }}
                      >
                        <button
                          className="btn-sm-action"
                          onClick={() => handleOpenDetail(staff.id)}
                          title="Lihat rincian penugasan acara"
                        >
                          Detail Acara
                        </button>

                        <button
                          className="btn-sm-action"
                          onClick={() => {
                            setTargetEditStaff(staff);
                            setEditEmail(staff.email);
                            setEditError("");
                          }}
                          id={`btn-edit-staff-${staff.id}`}
                          title="Ubah email staff"
                        >
                          Edit
                        </button>

                        <button
                          className={`btn-sm-action ${staff.isActive ? "danger" : "success"}`}
                          onClick={() => setTargetToggleStaff(staff)}
                        >
                          {staff.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>

                        <button
                          className="btn-sm-action"
                          onClick={() => {
                            setTargetResetStaff(staff);
                            setNewPassword("");
                            setConfirmNewPassword("");
                            setResetError("");
                          }}
                          title="Ganti password staff"
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && meta.totalPages > 1 && (
          <div className="staff-pagination-bar">
            <div>
              Menampilkan halaman <strong>{meta.page}</strong> dari{" "}
              <strong>{meta.totalPages}</strong> ({meta.total} total staff)
            </div>
            <div className="staff-pagination-nav">
              <button
                className="btn-sm-action"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &larr; Sebelumnya
              </button>
              <button
                className="btn-sm-action"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Tambah Staff Baru ── */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => !createLoading && setShowCreateModal(false)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Akun Staff Operator</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={createLoading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateStaff}>
              <div className="modal-body">
                {createError && (
                  <div className="alert-box danger">{createError}</div>
                )}

                <div className="form-group">
                  <label htmlFor="create-email">Alamat Email Staff</label>
                  <input
                    id="create-email"
                    type="email"
                    required
                    placeholder="operator@irvite.id"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    disabled={createLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-password">
                    Password Akun (Minimal 12 Karakter)
                  </label>
                  <input
                    id="create-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    disabled={createLoading}
                  />
                  <div className="form-hint">
                    Gunakan kombinasi huruf dan angka minimal 12 karakter.
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="create-confirm-password">
                    Konfirmasi Password
                  </label>
                  <input
                    id="create-confirm-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    disabled={createLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-sm-action"
                  onClick={() => setShowCreateModal(false)}
                  disabled={createLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? "Menyimpan..." : "Simpan Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Email Staff */}
      {targetEditStaff && (
        <div
          className="modal-overlay"
          onClick={() => !editLoading && setTargetEditStaff(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Email Staff</h3>
              <button
                onClick={() => setTargetEditStaff(null)}
                disabled={editLoading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditEmail}>
              <div className="modal-body">
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                  }}
                >
                  Ubah alamat email untuk operator staff. Email digunakan untuk masuk ke aplikasi scanner.
                </p>

                {editError && (
                  <div className="alert-box danger">{editError}</div>
                )}

                <div className="form-group">
                  <label htmlFor="edit-staff-email">
                    Alamat Email Baru
                  </label>
                  <input
                    id="edit-staff-email"
                    type="email"
                    required
                    placeholder="nama@contoh.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={editLoading}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-sm-action"
                  onClick={() => setTargetEditStaff(null)}
                  disabled={editLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                  id="btn-save-edit-email"
                >
                  {editLoading ? "Menyimpan..." : "Simpan Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Konfirmasi Status (Aktif / Nonaktif) ── */}
      {targetToggleStaff && (
        <div
          className="modal-overlay"
          onClick={() => !toggleLoading && setTargetToggleStaff(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {targetToggleStaff.isActive
                  ? "Nonaktifkan Staff"
                  : "Aktifkan Kembali Staff"}
              </h3>
              <button
                onClick={() => setTargetToggleStaff(null)}
                disabled={toggleLoading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: "0 0 1rem 0", color: "var(--text-primary)" }}>
                Akun: <strong>{targetToggleStaff.email}</strong>
              </p>
              {targetToggleStaff.isActive ? (
                <div className="alert-box danger">
                  <strong>Nonaktifkan staff ini?</strong>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem" }}>
                    Staff akan segera kehilangan akses scanner check-in ke
                    seluruh acara yang ditugaskan. Riwayat kehadiran masa lalu
                    dan penugasan acara tetap aman tersimpan.
                  </p>
                </div>
              ) : (
                <div className="alert-box info">
                  <strong>Aktifkan kembali staff ini?</strong>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8125rem" }}>
                    Staff akan kembali dapat masuk dan melakukan pemindaian
                    kehadiran pada acara-acara yang telah ditugaskan.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-sm-action"
                onClick={() => setTargetToggleStaff(null)}
                disabled={toggleLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className={`btn ${targetToggleStaff.isActive ? "btn-danger" : "btn-primary"}`}
                onClick={handleToggleStatus}
                disabled={toggleLoading}
                style={
                  targetToggleStaff.isActive
                    ? {
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        padding: "0.4rem 1rem",
                        borderRadius: "var(--radius-sm, 6px)",
                        cursor: "pointer",
                      }
                    : undefined
                }
              >
                {toggleLoading
                  ? "Memproses..."
                  : targetToggleStaff.isActive
                    ? "Ya, Nonaktifkan"
                    : "Ya, Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ── */}
      {targetResetStaff && (
        <div
          className="modal-overlay"
          onClick={() => !resetLoading && setTargetResetStaff(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Password Staff</h3>
              <button
                onClick={() => setTargetResetStaff(null)}
                disabled={resetLoading}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p
                  style={{
                    margin: "0 0 1rem 0",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                  }}
                >
                  Mengatur ulang password untuk:{" "}
                  <strong>{targetResetStaff.email}</strong>
                </p>

                <div
                  style={{
                    backgroundColor: "rgba(234, 179, 8, 0.1)",
                    border: "1px solid rgba(234, 179, 8, 0.3)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    marginBottom: "1rem",
                    fontSize: "0.8125rem",
                    color: "var(--text-secondary)",
                    lineHeight: "1.4",
                  }}
                >
                  <strong>Catatan Keamanan:</strong> Reset password tidak
                  langsung mencabut token akses yang sudah diterbitkan. Untuk
                  memblokir akses segera, nonaktifkan akun staff.
                </div>

                {resetError && (
                  <div className="alert-box danger">{resetError}</div>
                )}

                <div className="form-group">
                  <label htmlFor="new-password">
                    Password Baru (Minimal 12 Karakter)
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-new-password">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={resetLoading}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-sm-action"
                  onClick={() => setTargetResetStaff(null)}
                  disabled={resetLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Menyimpan..." : "Perbarui Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Detail Penugasan Acara ── */}
      {(detailStaff || detailLoading) && (
        <div className="modal-overlay" onClick={() => setDetailStaff(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Detail Penugasan Staff</h3>
              <button
                onClick={() => setDetailStaff(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {detailLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Memuat data penugasan...
                </div>
              ) : detailStaff ? (
                <div>
                  <div
                    style={{
                      marginBottom: "1.25rem",
                      paddingBottom: "1rem",
                      borderBottom: "1px solid var(--admin-border)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {detailStaff.email}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.25rem",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className={`staff-status-badge ${detailStaff.isActive ? "active" : "inactive"}`}
                      >
                        {detailStaff.isActive ? "● Aktif" : "○ Nonaktif"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Role: {detailStaff.role}
                      </span>
                    </div>
                  </div>

                  <h4
                    style={{
                      margin: "0 0 0.75rem 0",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Daftar Acara Ditugaskan ({detailStaff.assignedEvents.length}
                    )
                  </h4>

                  {detailStaff.assignedEvents.length === 0 ? (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        fontStyle: "italic",
                      }}
                    >
                      Staff ini belum ditugaskan ke acara mana pun. Penugasan
                      dapat dilakukan melalui menu Tim Staff pada masing-masing
                      Acara.
                    </p>
                  ) : (
                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                      <table
                        className="staff-table"
                        style={{ fontSize: "0.8125rem" }}
                      >
                        <thead>
                          <tr>
                            <th>Judul Acara</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailStaff.assignedEvents.map((evt) => (
                            <tr key={evt.id}>
                              <td style={{ fontWeight: 500 }}>{evt.title}</td>
                              <td>
                                <span
                                  style={{
                                    padding: "0.15rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.6875rem",
                                    fontWeight: 600,
                                    background:
                                      evt.status === "PUBLISHED"
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : "rgba(120, 113, 108, 0.15)",
                                    color:
                                      evt.status === "PUBLISHED"
                                        ? "#059669"
                                        : "#78716c",
                                  }}
                                >
                                  {evt.status}
                                </span>
                              </td>
                              <td style={{ color: "var(--text-secondary)" }}>
                                {new Date(evt.eventDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-sm-action"
                onClick={() => setDetailStaff(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
