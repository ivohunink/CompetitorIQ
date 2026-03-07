"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Loader2, CheckCircle, ExternalLink } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count: { features: number };
}

interface DiscoverResult {
  categoryName: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresCreated: number;
  coveragesCreated: number;
  features: Array<{
    name: string;
    description: string;
    competitorCount: number;
  }>;
}

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [discoveringId, setDiscoveringId] = useState<string | null>(null);
  const [discoverResult, setDiscoverResult] = useState<DiscoverResult | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/categories/${editId}` : "/api/categories";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const cat = await res.json();
      if (editId) {
        setCategories(categories.map((c) => (c.id === editId ? { ...c, ...cat } : c)));
      } else {
        setCategories([...categories, { ...cat, _count: { features: 0 } }]);
      }
      setShowAdd(false);
      setEditId(null);
      setForm({ name: "", description: "" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Features in it will become uncategorized.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.ok) setCategories(categories.filter((c) => c.id !== id));
  }

  async function handleDiscover(cat: Category) {
    if (!cat.description) {
      setDiscoverError("This category needs a description before discovering features. Edit it and describe what the category should cover.");
      return;
    }

    setDiscoveringId(cat.id);
    setDiscoverResult(null);
    setDiscoverError(null);

    try {
      const res = await fetch(`/api/categories/${cat.id}/discover`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setDiscoverError(data.error || "Discovery failed");
        return;
      }

      setDiscoverResult(data);

      // Update feature count in the table
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? { ...c, _count: { features: c._count.features + data.featuresCreated } }
            : c
        )
      );
    } catch {
      setDiscoverError("Failed to connect to the server");
    } finally {
      setDiscoveringId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Manage Categories"
        description="Create, rename, merge, or delete feature categories."
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Features</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{cat.description || <span className="italic text-gray-400">No description</span>}</td>
                <td className="px-4 py-3 text-center text-gray-500">{cat._count.features}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleDiscover(cat)}
                      disabled={discoveringId !== null}
                      className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Discover features from competitor sources"
                    >
                      {discoveringId === cat.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </button>
                    <button onClick={() => { setForm({ name: cat.name, description: cat.description || "" }); setEditId(cat.id); setShowAdd(true); }} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(cat.id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No categories. They will be auto-created by AI categorization.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Discovery error banner */}
      {discoverError && (
        <Card className="mt-4 border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between">
            <p className="text-sm text-red-700">{discoverError}</p>
            <button onClick={() => setDiscoverError(null)} className="ml-4 text-red-400 hover:text-red-600 text-xs">Dismiss</button>
          </div>
        </Card>
      )}

      {/* Discovery results panel */}
      {discoverResult && (
        <Card className="mt-4 border-green-200 bg-green-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-900">
                  Discovery Complete: {discoverResult.categoryName}
                </h3>
              </div>
              <button onClick={() => setDiscoverResult(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
            </div>
            <div className="flex gap-4 text-sm text-green-800 mb-3">
              <span>{discoverResult.sourcesScraped} sources scraped</span>
              <span>{discoverResult.featuresCreated} features created</span>
              <span>{discoverResult.coveragesCreated} coverage records</span>
              {discoverResult.sourcesFailed > 0 && (
                <span className="text-amber-700">{discoverResult.sourcesFailed} sources failed</span>
              )}
            </div>
            {discoverResult.features.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Discovered Features</p>
                <div className="grid gap-1.5">
                  {discoverResult.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded bg-white/60 px-3 py-1.5 text-sm">
                      <span className="font-medium text-gray-900">{f.name}</span>
                      <span className="text-gray-500">{f.description}</span>
                      <Badge variant="default" className="ml-auto">
                        {f.competitorCount} competitor{f.competitorCount !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
                <a
                  href="/review"
                  className="inline-flex items-center gap-1 text-sm text-green-700 hover:text-green-900 mt-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Review discovered coverage in the Review Queue
                </a>
              </div>
            )}
            {discoverResult.features.length === 0 && (
              <p className="text-sm text-green-700">No new features were discovered. The category may already be well-covered, or try a more detailed description.</p>
            )}
          </div>
        </Card>
      )}

      {/* Discovering in-progress banner */}
      {discoveringId && (
        <Card className="mt-4 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Discovering features for &ldquo;{categories.find((c) => c.id === discoveringId)?.name}&rdquo;...
              </p>
              <p className="text-xs text-blue-700">Scraping all competitor sources and analyzing with AI. This may take a minute.</p>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input id="cat-name" label="Category Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what this category covers so the AI knows what features to look for. E.g., 'Features related to employee shift scheduling, auto-scheduling, shift swaps, open shift management, and schedule templates.'"
            />
            <p className="text-xs text-gray-500">A good description helps the AI discover relevant features when scraping competitor sources.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Button>
            <Button type="submit">{editId ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
