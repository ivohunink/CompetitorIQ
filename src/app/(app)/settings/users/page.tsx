"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, UserX, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleVariant: Record<string, "info" | "success" | "default"> = {
  ADMIN: "info",
  EDITOR: "success",
  VIEWER: "default",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VIEWER",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const user = await res.json();
      setUsers([...users, { ...user, isActive: true }]);
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "VIEWER" });
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create user");
    }
  }

  async function handleRoleChange(id: string, role: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this user?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
    }
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Invite users, assign roles, and manage access."
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Invite User
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Joined</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="rounded border border-gray-200 px-2 py-1 text-xs"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={user.isActive ? "success" : "danger"}>
                    {user.isActive ? "Active" : "Deactivated"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.isActive && (
                    <button
                      onClick={() => handleDeactivate(user.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Deactivate user"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Invite User">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input id="user-name" label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="user-email" label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input id="user-pass" label="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
