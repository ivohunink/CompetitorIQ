"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  Plus,
  Globe,
  Building2,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface Competitor {
  id: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  marketSegment: string | null;
  notes: string | null;
  status: string;
  dataSources: Array<{ id: string; url: string; type: string }>;
  _count: { featureCoverages: number };
}

interface Props {
  competitors: Competitor[];
  userRole: string;
}

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  ACTIVE: "success",
  MONITORING: "warning",
  ARCHIVED: "default",
};

const SOURCE_TYPE_OPTIONS = [
  { value: "website", label: "Website / Features" },
  { value: "changelog", label: "Changelog" },
  { value: "docs", label: "Documentation" },
  { value: "g2", label: "G2" },
  { value: "capterra", label: "Capterra" },
];

export function CompetitorsClient({ competitors: initial, userRole }: Props) {
  const [competitors, setCompetitors] = useState(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    marketSegment: "",
    notes: "",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Source add state
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceCompetitorId, setSourceCompetitorId] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState({
    url: "",
    type: "website",
    cadence: "weekly",
  });

  const canEdit = userRole !== "VIEWER";

  const filtered =
    filter === "all"
      ? competitors
      : competitors.filter((c) => c.status === filter);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
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
          setCompetitors(
            competitors.map((c) => (c.id === editId ? { ...c, ...comp } : c))
          );
        } else {
          setCompetitors([
            ...competitors,
            { ...comp, dataSources: [], _count: { featureCoverages: 0 } },
          ]);
        }
        closeForm();
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(comp: Competitor) {
    setForm({
      name: comp.name,
      websiteUrl: comp.websiteUrl || "",
      marketSegment: comp.marketSegment || "",
      notes: comp.notes || "",
      status: comp.status,
    });
    setEditId(comp.id);
    setShowAdd(true);
  }

  function closeForm() {
    setShowAdd(false);
    setEditId(null);
    setForm({
      name: "",
      websiteUrl: "",
      marketSegment: "",
      notes: "",
      status: "ACTIVE",
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this competitor?")) return;
    const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompetitors(competitors.filter((c) => c.id !== id));
    }
  }

  function openAddSource(competitorId: string) {
    setSourceCompetitorId(competitorId);
    setSourceForm({ url: "", type: "website", cadence: "weekly" });
    setShowAddSource(true);
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceCompetitorId) return;

    const res = await fetch("/api/datasources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        competitorId: sourceCompetitorId,
        ...sourceForm,
      }),
    });
    if (res.ok) {
      const ds = await res.json();
      setCompetitors(
        competitors.map((c) =>
          c.id === sourceCompetitorId
            ? { ...c, dataSources: [...c.dataSources, ds] }
            : c
        )
      );
      setShowAddSource(false);
      setSourceCompetitorId(null);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-2">
          {["all", "ACTIVE", "MONITORING", "ARCHIVED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === s
                  ? "bg-brand-100 text-brand-700"
                  : "text-gray-500 hover:bg-gray-100"
              )}
            >
              {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {canEdit && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Competitor
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-500">
            No competitors found. Add your first competitor to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((comp) => (
            <Card
              key={comp.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">
                      {comp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/competitors/${comp.id}`}
                        className="font-semibold text-gray-900 hover:text-brand-600"
                      >
                        {comp.name}
                      </Link>
                      <Badge
                        variant={statusVariant[comp.status] || "default"}
                        className="ml-2"
                      >
                        {comp.status.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => startEdit(comp)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {userRole === "ADMIN" && (
                        <button
                          onClick={() => handleDelete(comp.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {comp.marketSegment && (
                  <p className="mt-2 text-xs text-gray-500">
                    {comp.marketSegment}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {comp._count.featureCoverages} features tracked
                  </span>
                  {comp.websiteUrl && (
                    <a
                      href={comp.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {comp.dataSources.map((ds) => (
                    <Badge key={ds.id} variant="default">
                      {ds.type}
                    </Badge>
                  ))}
                  {canEdit && (
                    <button
                      onClick={() => openAddSource(comp.id)}
                      className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Source
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Competitor Modal */}
      <Modal
        isOpen={showAdd}
        onClose={closeForm}
        title={editId ? "Edit Competitor" : "Add Competitor"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="comp-name"
            label="Competitor Name"
            placeholder="e.g., Workday"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            id="comp-url"
            label="Website URL"
            type="url"
            placeholder="https://example.com"
            value={form.websiteUrl}
            onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
          />
          <Input
            id="comp-segment"
            label="Market Segment"
            placeholder="e.g., Enterprise WFM"
            value={form.marketSegment}
            onChange={(e) =>
              setForm({ ...form, marketSegment: e.target.value })
            }
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="MONITORING">Monitoring</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              placeholder="Key observations about this competitor..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : editId ? "Save Changes" : "Add Competitor"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Source Modal */}
      <Modal
        isOpen={showAddSource}
        onClose={() => setShowAddSource(false)}
        title="Add Data Source"
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <Input
            id="source-url"
            label="URL"
            type="url"
            placeholder="https://competitor.com/features"
            value={sourceForm.url}
            onChange={(e) =>
              setSourceForm({ ...sourceForm, url: e.target.value })
            }
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Source Type
            </label>
            <select
              value={sourceForm.type}
              onChange={(e) =>
                setSourceForm({ ...sourceForm, type: e.target.value })
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {SOURCE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Cadence
            </label>
            <select
              value={sourceForm.cadence}
              onChange={(e) =>
                setSourceForm({ ...sourceForm, cadence: e.target.value })
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddSource(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Source</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
