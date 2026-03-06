"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Plus, Pencil, Trash2, Globe } from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  websiteUrl: string | null;
  marketSegment: string | null;
  status: string;
  dataSources: Array<{ id: string; url: string; type: string }>;
}

export default function ManageCompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    marketSegment: "",
    notes: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then(setCompetitors);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/competitors/${editId}` : "/api/competitors";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const comp = await res.json();
      if (editId) {
        setCompetitors(competitors.map((c) => (c.id === editId ? { ...c, ...comp } : c)));
      } else {
        setCompetitors([...competitors, comp]);
      }
      setShowAdd(false);
      setEditId(null);
      setForm({ name: "", websiteUrl: "", marketSegment: "", notes: "", status: "ACTIVE" });
    }
  }

  function startEdit(comp: Competitor) {
    setForm({
      name: comp.name,
      websiteUrl: comp.websiteUrl || "",
      marketSegment: comp.marketSegment || "",
      notes: "",
      status: comp.status,
    });
    setEditId(comp.id);
    setShowAdd(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this competitor and all associated data?")) return;
    const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (res.ok) setCompetitors(competitors.filter((c) => c.id !== id));
  }

  return (
    <>
      <PageHeader
        title="Manage Competitors"
        description="Add, edit, and configure tracked competitors."
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Competitor
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Website</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Segment</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Data Sources</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp) => (
              <tr key={comp.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{comp.name}</td>
                <td className="px-4 py-3">
                  {comp.websiteUrl ? (
                    <a href={comp.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      Visit
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{comp.marketSegment || "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={comp.status === "ACTIVE" ? "success" : comp.status === "MONITORING" ? "warning" : "default"}>
                    {comp.status.toLowerCase()}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">{comp.dataSources?.length || 0} sources</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(comp)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(comp.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {competitors.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No competitors configured.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "Edit Competitor" : "Add Competitor"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input id="name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input id="website" label="Website URL" type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} />
          <Input id="segment" label="Market Segment" value={form.marketSegment} onChange={(e) => setForm({ ...form, marketSegment: e.target.value })} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="ACTIVE">Active</option>
              <option value="MONITORING">Monitoring</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Button>
            <Button type="submit">{editId ? "Save Changes" : "Add Competitor"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
