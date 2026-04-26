import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";
import { updateUser, deleteUser } from "../api/users";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

function resizeImage(file, size = 400) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = url;
  });
}

export default function AccountPanel({ onSaveStateChange }) {
  const dark = useTheme();
  const { user, setUser, logout, isDemo } = useAuth();
  const navigate = useNavigate();

  const bg     = dark ? "var(--dark-bg)"      : "var(--light-bg)";
  const border = dark ? "var(--dark-border)"  : "var(--light-border)";
  const text   = dark ? "var(--dark-text)"    : "var(--light-text)";
  const muted  = `color-mix(in srgb, ${text} 50%, transparent)`;
  const danger = "var(--category-expense)";

  const [form, setForm] = useState({
    first_name: user?.first_name ?? "",
    last_name:  user?.last_name  ?? "",
    avatar:     user?.avatar     ?? null,
  });
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deleteInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isDirty =
    form.first_name.trim() !== (user?.first_name ?? "") ||
    form.last_name.trim()  !== (user?.last_name  ?? "") ||
    form.avatar            !== (user?.avatar      ?? null);

  useEffect(() => {
    onSaveStateChange?.({
      isDirty,
      isSaving: saving,
      saveStatus,
      onSave: handleSave,
    });
  }, [isDirty, saving, saveStatus]);

  useEffect(() => {
    if (deleteOpen) {
      setDeletePhrase("");
      setDeleteError("");
      setTimeout(() => deleteInputRef.current?.focus(), 50);
    }
  }, [deleteOpen]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm((f) => ({ ...f, avatar: dataUrl }));
    e.target.value = "";
    setError("");
    if (isDemo()) {
      const updated = { ...(user ?? {}), avatar: dataUrl };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await updateUser({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        avatar:     dataUrl,
      });
      const updated = res.data;
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setForm({ first_name: updated.first_name, last_name: updated.last_name, avatar: updated.avatar ?? null });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!isDirty || saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await updateUser({
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
        avatar:     form.avatar,
      });
      const updated = res.data;
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setForm({ first_name: updated.first_name, last_name: updated.last_name, avatar: updated.avatar ?? null });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setError(err.response?.data?.detail ?? "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deletePhrase !== CONFIRM_PHRASE || deleting) return;
    if (isDemo()) { setDeleteError("Account deletion is not available in demo mode."); return; }
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteUser();
      logout();
      navigate("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.detail ?? "Something went wrong");
      setDeleting(false);
    }
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const inputStyle = {
    width: "100%",
    borderRadius: "12px",
    padding: "10px 16px",
    fontSize: "14px",
    border: `1px solid ${border}`,
    backgroundColor: bg,
    color: text,
    outline: "none",
    boxSizing: "border-box",
  };

  const disabledInputStyle = {
    ...inputStyle,
    opacity: 0.6,
    cursor: "not-allowed",
  };

  const confirmReady = deletePhrase === CONFIRM_PHRASE;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* Joined date — top left */}
      {createdAt && (
        <p style={{ fontSize: "11px", color: muted, marginBottom: "-20px" }}>
          Joined {createdAt}
        </p>
      )}

      {/* Avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          style={{
            position: "relative",
            width: 80, height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            border: "none",
            padding: 0,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {form.avatar ? (
            <img
              src={form.avatar}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "2rem", fontWeight: 700,
                backgroundColor: `color-mix(in srgb, ${text} 12%, transparent)`,
                color: text,
              }}
            >
              {form.first_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          {/* Hover overlay */}
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.45)",
              opacity: avatarHovered ? 1 : 0,
              transition: "opacity 150ms ease",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </button>
        {/* Camera badge */}
        <div
          style={{
            position: "absolute", bottom: 2, right: 2,
            width: 22, height: 22, borderRadius: "50%",
            backgroundColor: dark ? "var(--dark-surface)" : "var(--light-surface)",
            border: `1.5px solid ${border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        </div>

        <p style={{ fontSize: "14px", fontWeight: 600, color: text }}>
          {form.first_name || user?.first_name} {form.last_name || user?.last_name}
        </p>
        <p style={{ fontSize: "12px", color: muted }}>{user?.email_address ?? "—"}</p>
      </div>

      {/* Profile fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px", color: muted }}>
            First Name
          </label>
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            disabled={isDemo()}
            maxLength={20}
            style={isDemo() ? disabledInputStyle : inputStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px", color: muted }}>
            Last Name
          </label>
          <input
            type="text"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            disabled={isDemo()}
            maxLength={20}
            style={isDemo() ? disabledInputStyle : inputStyle}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "6px", color: muted }}>
            Email
          </label>
          <div style={disabledInputStyle}>{user?.email_address ?? "—"}</div>
        </div>

        {error && (
          <p style={{ fontSize: "13px", color: danger }}>{error}</p>
        )}
      </div>

      {/* Bottom: danger zone pushed to end */}
      <div style={{ marginTop: "auto" }}>
        <div
          style={{
            borderRadius: "14px",
            border: `1px solid color-mix(in srgb, ${danger} 35%, transparent)`,
            overflow: "hidden",
          }}
        >
            <div style={{ padding: "14px 16px", borderBottom: deleteOpen ? `1px solid color-mix(in srgb, ${danger} 20%, transparent)` : "none" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: danger, marginBottom: "4px" }}>Delete Account</p>
              <p style={{ fontSize: "12px", color: muted, marginBottom: "12px" }}>
                Permanently deletes your account and all associated data. This cannot be undone.
              </p>
              {!deleteOpen && (
                <button
                  onClick={() => setDeleteOpen(true)}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${danger} 16%, transparent)`}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${danger} 8%, transparent)`}
                  style={{
                    fontSize: "12px", fontWeight: 600,
                    padding: "6px 14px", borderRadius: "8px",
                    border: `1px solid color-mix(in srgb, ${danger} 50%, transparent)`,
                    color: danger,
                    backgroundColor: `color-mix(in srgb, ${danger} 8%, transparent)`,
                    cursor: "pointer", transition: "background-color 150ms ease",
                  }}
                >
                  Delete account
                </button>
              )}
            </div>

            {deleteOpen && (
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", backgroundColor: `color-mix(in srgb, ${danger} 4%, transparent)` }}>
                <p style={{ fontSize: "12px", color: text }}>
                  To confirm, type{" "}
                  <span style={{ fontFamily: "monospace", fontWeight: 600, color: danger }}>
                    {CONFIRM_PHRASE}
                  </span>{" "}
                  below:
                </p>
                <input
                  ref={deleteInputRef}
                  type="text"
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && confirmReady && handleDelete()}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                  style={{
                    ...inputStyle,
                    borderColor: confirmReady
                      ? `color-mix(in srgb, ${danger} 60%, transparent)`
                      : border,
                  }}
                />
                {deleteError && (
                  <p style={{ fontSize: "12px", color: danger }}>{deleteError}</p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => setDeleteOpen(false)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${text} 8%, transparent)`}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    style={{
                      flex: 1, fontSize: "13px", fontWeight: 500,
                      padding: "8px", borderRadius: "10px",
                      border: `1px solid ${border}`,
                      color: muted, backgroundColor: "transparent", cursor: "pointer",
                      transition: "background-color 150ms ease",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={!confirmReady || deleting}
                    onMouseEnter={e => { if (confirmReady && !deleting) e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${danger} 22%, transparent)`; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = confirmReady ? `color-mix(in srgb, ${danger} 12%, transparent)` : "transparent"; }}
                    style={{
                      flex: 1, fontSize: "13px", fontWeight: 600,
                      padding: "8px", borderRadius: "10px",
                      border: `1px solid color-mix(in srgb, ${danger} 60%, transparent)`,
                      color: danger,
                      backgroundColor: confirmReady
                        ? `color-mix(in srgb, ${danger} 12%, transparent)`
                        : "transparent",
                      opacity: confirmReady ? 1 : 0.4,
                      cursor: confirmReady && !deleting ? "pointer" : "default",
                      transition: "background-color 150ms ease, opacity 150ms ease",
                    }}
                  >
                    {deleting ? "Deleting…" : "I understand, delete my account"}
                  </button>
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
