"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Plus,
  Trash2,
  Pencil,
  Globe,
  FileText,
  BookOpen,
  Star,
  Clock,
} from "lucide-react";

interface DataSource {
  id: string;
  url: string;
  type: string;
  cadence: string;
  scrapeEnabled: boolean;
  lastScraped: string | null;
}

interface Props {
  competitorId: string;
  initialSources: DataSource[];
}

const SOURCE_TYPE_OPTIONS = [
  { value: "website", label: "Website / Features" },
  { value: "changelog", label: "Changelog" },
  { value: "docs", label: "Documentation" },
  { value: "g2", label: "G2" },
  { value: "capterra", label: "Capterra" },
];

const SOURCE_ICONS: Record<string, typeof Globe> = {
  website: Globe,
  changelog: FileText,
  docs: BookOpen,
  g2: Star,
  capterra: Star,
};

function formatLastScraped(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function SourceManager({ competitorId, initialSources }: Props) {
  const [sources, setSources] = useState<DataSource[]>(initialSources);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    url: "",
    type: "website",
    cadence: "weekly",
  });

  function openAdd() {
    setForm({ url: "", type: "website", cadence: "weekly" });
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(ds: DataSource) {
    setForm({ url: ds.url, type: ds.type, cadence: ds.cadence });
    setEditId(ds.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      const res = await fetch(`/api/datasources/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSources(
          sources.map((ds) => (ds.id === editId ? { ...ds, ...form } : ds))
        );
        closeModal();
      }
    } else {
      const res = await fetch("/api/datasources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId, ...form }),
      });
      if (res.ok) {
        const ds = await res.json();
        setSources([...sources, ds]);
        closeModal();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this data source?")) return;
    const res = await fetch(`/api/datasources/${id}`, { method: "DELETE" });
    if (res.ok) setSources(sources.filter((ds) => ds.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/datasources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrapeEnabled: enabled }),
    });
    setSources(
      sources.map((ds) =>
        ds.id === id ? { ...ds, scrapeEnabled: enabled } : ds
      )
    );
  }

  async function handleCadenceChange(id: string, cadence: string) {
    await fetch(`/api/datasources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadence }),
    });
    setSources(
      sources.map((ds) => (ds.id === id ? { ...ds, cadence } : ds))
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Data Sources</h3>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No data sources configured. Add a source to enable automated
              scraping.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Source
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    URL
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Cadence
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Last Scraped
                  </th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">
                    Enabled
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((ds) => {
                  const Icon = SOURCE_ICONS[ds.type] || Globe;
                  return (
                    <tr
                      key={ds.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-gray-400" />
                          <span className="capitalize">{ds.type}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={ds.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline truncate block max-w-xs"
                          title={ds.url}
                        >
                          {ds.url.replace(/^https?:\/\//, "").slice(0, 50)}
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={ds.cadence}
                          onChange={(e) =>
                            handleCadenceChange(ds.id, e.target.value)
                          }
                          className="rounded border border-gray-200 px-2 py-1 text-xs"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {formatLastScraped(ds.lastScraped)}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() =>
                            handleToggle(ds.id, !ds.scrapeEnabled)
                          }
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            ds.scrapeEnabled ? "bg-brand-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                              ds.scrapeEnabled
                                ? "translate-x-4"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(ds)}
                            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ds.id)}
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editId ? "Edit Data Source" : "Add Data Source"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="ds-url"
            label="URL"
            type="url"
            placeholder="https://competitor.com/features"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Source Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
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
              value={form.cadence}
              onChange={(e) => setForm({ ...form, cadence: e.target.value })}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit">{editId ? "Save Changes" : "Add Source"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
