"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type AdminUser = { id: string; email: string; name: string; role: string; createdAt: string };

export default function SettingsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-password", currentPassword, newPassword }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Password changed");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newName || !newUserPassword) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-user", email: newEmail, name: newName, password: newUserPassword }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Admin user created");
      setNewEmail(""); setNewName(""); setNewUserPassword("");
      const updated = await fetch("/api/admin").then((r) => r.json());
      setUsers(updated);
    } catch {
      toast.error("Failed to create admin user");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Delete this admin user?")) return;
    try {
      const res = await fetch(`/api/admin?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Admin user deleted");
      setUsers(users.filter((u) => u.id !== id));
    } catch {
      toast.error("Failed to delete admin user");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="font-display text-2xl text-jc-anchor">Settings</h1>

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <h2 className="text-sm font-medium text-jc-anchor mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input type="password" placeholder="Current password" required value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <input type="password" placeholder="New password" required value={newPassword} minLength={6}
            onChange={(e) => setNewPassword(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <input type="password" placeholder="Confirm new password" required value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <button type="submit" disabled={loading}
            className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
            {loading ? "Saving..." : "Change Password"}
          </button>
        </form>
      </div>

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <h2 className="text-sm font-medium text-jc-anchor mb-4">Create Admin User</h2>
        <form onSubmit={handleCreateUser} className="space-y-3">
          <input type="email" placeholder="Email" required value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <input type="text" placeholder="Name" required value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <input type="password" placeholder="Password" required value={newUserPassword} minLength={6}
            onChange={(e) => setNewUserPassword(e.target.value)}
            className="block w-full rounded-sm border border-jc-blush px-3 py-2 text-sm text-jc-anchor focus:border-jc-rose-gold focus:outline-none" />
          <button type="submit" disabled={loading}
            className="rounded-sm bg-jc-rose-gold px-4 py-2 text-sm text-white hover:bg-jc-rose-gold-light disabled:opacity-50">
            {loading ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>

      <div className="rounded-sm border border-jc-blush bg-white p-6">
        <h2 className="text-sm font-medium text-jc-anchor mb-4">Admin Users ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between border-b border-jc-blush/50 pb-2 last:border-0">
              <div>
                <p className="text-sm text-jc-anchor">{u.name} {u.role === "SUPER_ADMIN" && <span className="text-xs text-jc-rose-gold">(Super)</span>}</p>
                <p className="text-xs text-jc-anchor/50">{u.email}</p>
              </div>
              {users.length > 1 && (
                <button onClick={() => handleDeleteUser(u.id)}
                  className="text-xs text-red-500 hover:underline">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
