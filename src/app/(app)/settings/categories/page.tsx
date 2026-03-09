"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Minus,
  GripVertical,
  FolderOpen,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  subcategories?: Subcategory[];
  _count: { features: number };
}

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Feature {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  category: { id: string; name: string } | null;
  subcategory: { id: string; name: string } | null;
  coverages: Array<{
    id: string;
    status: string;
    competitor: { id: string; name: string };
  }>;
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

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkForm, setBulkForm] = useState({ description: "", sortOrder: "" });
  const [bulkLoading, setBulkLoading] = useState(false);

  // Expanded categories for viewing features
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [featuresByCategory, setFeaturesByCategory] = useState<Record<string, Feature[]>>({});
  const [loadingFeatures, setLoadingFeatures] = useState<Set<string>>(new Set());

  // Feature editing
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [featureForm, setFeatureForm] = useState({ name: "", description: "", categoryId: "", subcategoryId: "" });
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [addingFeatureToCategoryId, setAddingFeatureToCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  const refreshCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  // Category CRUD
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
    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // Discovery
  async function handleDiscover(cat: Category) {
    if (!cat.description) {
      setDiscoverError("This category needs a description before discovering features. Edit it and describe what the category should cover.");
      return;
    }

    setDiscoveringId(cat.id);
    setDiscoverResult(null);
    setDiscoverError(null);

    try {
      const res = await fetch(`/api/categories/${cat.id}/discover`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setDiscoverError(data.error || "Discovery failed");
        return;
      }

      setDiscoverResult(data);
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

  // Bulk selection helpers
  const allSelected = categories.length > 0 && selectedIds.size === categories.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < categories.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Bulk actions
  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/categories/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setCategories(categories.filter((c) => !selectedIds.has(c.id)));
        setSelectedIds(new Set());
        setShowBulkDelete(false);
      }
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const data: Record<string, unknown> = {};
      if (bulkForm.description) data.description = bulkForm.description;
      if (bulkForm.sortOrder) data.sortOrder = parseInt(bulkForm.sortOrder, 10);

      const res = await fetch("/api/categories/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), data }),
      });

      if (res.ok) {
        await refreshCategories();
        setSelectedIds(new Set());
        setShowBulkEdit(false);
        setBulkForm({ description: "", sortOrder: "" });
      }
    } finally {
      setBulkLoading(false);
    }
  }

  // Feature loading for expanded categories
  async function loadFeatures(categoryId: string) {
    setLoadingFeatures((prev) => new Set(prev).add(categoryId));
    try {
      const res = await fetch(`/api/features?categoryId=${categoryId}`);
      const data = await res.json();
      setFeaturesByCategory((prev) => ({ ...prev, [categoryId]: data }));
    } finally {
      setLoadingFeatures((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  }

  function toggleExpand(categoryId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
        if (!featuresByCategory[categoryId]) {
          loadFeatures(categoryId);
        }
      }
      return next;
    });
  }

  // Feature CRUD
  function openAddFeature(categoryId: string) {
    setEditingFeature(null);
    setAddingFeatureToCategoryId(categoryId);
    setFeatureForm({
      name: "",
      description: "",
      categoryId,
      subcategoryId: "",
    });
    setShowFeatureModal(true);
  }

  function openEditFeature(feature: Feature) {
    setEditingFeature(feature);
    setAddingFeatureToCategoryId(null);
    setFeatureForm({
      name: feature.name,
      description: feature.description || "",
      categoryId: feature.categoryId || "",
      subcategoryId: feature.subcategoryId || "",
    });
    setShowFeatureModal(true);
  }

  async function handleFeatureSave(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!editingFeature;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/features/${editingFeature!.id}` : "/api/features";

    const body: Record<string, unknown> = {
      name: featureForm.name,
      description: featureForm.description || null,
      categoryId: featureForm.categoryId || null,
      subcategoryId: featureForm.subcategoryId || null,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      // Refresh the feature list for affected categories
      const affectedCategoryIds: string[] = [];
      if (featureForm.categoryId) affectedCategoryIds.push(featureForm.categoryId);
      if (editingFeature?.categoryId && !affectedCategoryIds.includes(editingFeature.categoryId)) {
        affectedCategoryIds.push(editingFeature.categoryId);
      }
      if (addingFeatureToCategoryId && !affectedCategoryIds.includes(addingFeatureToCategoryId)) {
        affectedCategoryIds.push(addingFeatureToCategoryId);
      }

      for (let i = 0; i < affectedCategoryIds.length; i++) {
        const catId = affectedCategoryIds[i];
        if (expandedIds.has(catId)) {
          await loadFeatures(catId);
        }
      }

      await refreshCategories();
      setShowFeatureModal(false);
      setEditingFeature(null);
      setAddingFeatureToCategoryId(null);
    }
  }

  async function handleFeatureDelete(feature: Feature) {
    if (!confirm(`Delete feature "${feature.name}"? This will also remove all coverage data.`)) return;
    const res = await fetch(`/api/features/${feature.id}`, { method: "DELETE" });
    if (res.ok) {
      if (feature.categoryId && expandedIds.has(feature.categoryId)) {
        await loadFeatures(feature.categoryId);
      }
      await refreshCategories();
    }
  }

  function getSubcategoriesForCategory(categoryId: string): Subcategory[] {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories || [];
  }

  return (
    <>
      <PageHeader
        title="Manage Categories"
        description="Create, rename, merge, or delete feature categories. Expand a category to view and manage its features."
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Category
          </Button>
        }
      />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-brand-200 bg-brand-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-800">
              {selectedIds.size} categor{selectedIds.size === 1 ? "y" : "ies"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setBulkForm({ description: "", sortOrder: "" });
                  setShowBulkEdit(true);
                }}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Bulk Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => setShowBulkDelete(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="w-10 px-4 py-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center text-gray-500 hover:text-gray-700"
                  title={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : someSelected ? (
                    <Minus className="h-4 w-4 text-brand-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th className="w-8 px-1 py-3"></th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Features</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">Order</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                isSelected={selectedIds.has(cat.id)}
                isExpanded={expandedIds.has(cat.id)}
                isDiscovering={discoveringId === cat.id}
                discoveryDisabled={discoveringId !== null}
                features={featuresByCategory[cat.id]}
                loadingFeatures={loadingFeatures.has(cat.id)}
                onToggleSelect={() => toggleSelect(cat.id)}
                onToggleExpand={() => toggleExpand(cat.id)}
                onEdit={() => {
                  setForm({ name: cat.name, description: cat.description || "" });
                  setEditId(cat.id);
                  setShowAdd(true);
                }}
                onDelete={() => handleDelete(cat.id)}
                onDiscover={() => handleDiscover(cat)}
                onAddFeature={() => openAddFeature(cat.id)}
                onEditFeature={openEditFeature}
                onDeleteFeature={handleFeatureDelete}
              />
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No categories. They will be auto-created by AI categorization.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
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

      {/* Add/Edit Category Modal */}
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

      {/* Bulk Edit Modal */}
      <Modal isOpen={showBulkEdit} onClose={() => setShowBulkEdit(false)} title={`Bulk Edit ${selectedIds.size} Categories`}>
        <form onSubmit={handleBulkEdit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Only filled fields will be updated. Leave a field empty to keep existing values.
          </p>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              value={bulkForm.description}
              onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
              placeholder="Set description for all selected categories..."
            />
          </div>
          <Input
            id="bulk-sort"
            label="Sort Order"
            type="number"
            value={bulkForm.sortOrder}
            onChange={(e) => setBulkForm({ ...bulkForm, sortOrder: e.target.value })}
            placeholder="Set sort order for all selected..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowBulkEdit(false)}>Cancel</Button>
            <Button type="submit" disabled={bulkLoading || (!bulkForm.description && !bulkForm.sortOrder)}>
              {bulkLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Update {selectedIds.size} Categories
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Delete Categories" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete {selectedIds.size} categor{selectedIds.size === 1 ? "y" : "ies"}?
            Features in these categories will become uncategorized.
          </p>
          <div className="rounded-lg bg-red-50 p-3">
            <ul className="text-sm text-red-800 space-y-1">
              {categories
                .filter((c) => selectedIds.has(c.id))
                .map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-red-600">({c._count.features} features)</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowBulkDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Delete {selectedIds.size} Categories
            </Button>
          </div>
        </div>
      </Modal>

      {/* Feature Add/Edit Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={() => { setShowFeatureModal(false); setEditingFeature(null); setAddingFeatureToCategoryId(null); }}
        title={editingFeature ? "Edit Feature" : "Add Feature"}
      >
        <form onSubmit={handleFeatureSave} className="space-y-4">
          <Input
            id="feature-name"
            label="Feature Name"
            value={featureForm.name}
            onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={featureForm.description}
              onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
              placeholder="Optional description of the feature..."
            />
          </div>
          <Select
            id="feature-category"
            label="Category"
            value={featureForm.categoryId}
            onChange={(e) => setFeatureForm({ ...featureForm, categoryId: e.target.value, subcategoryId: "" })}
            options={[
              { value: "", label: "Uncategorized" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          {featureForm.categoryId && getSubcategoriesForCategory(featureForm.categoryId).length > 0 && (
            <Select
              id="feature-subcategory"
              label="Subcategory"
              value={featureForm.subcategoryId}
              onChange={(e) => setFeatureForm({ ...featureForm, subcategoryId: e.target.value })}
              options={[
                { value: "", label: "None" },
                ...getSubcategoriesForCategory(featureForm.categoryId).map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowFeatureModal(false); setEditingFeature(null); setAddingFeatureToCategoryId(null); }}
            >
              Cancel
            </Button>
            <Button type="submit">{editingFeature ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// Extracted row component to keep the table rendering clean
function CategoryRow({
  cat,
  isSelected,
  isExpanded,
  isDiscovering,
  discoveryDisabled,
  features,
  loadingFeatures,
  onToggleSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onDiscover,
  onAddFeature,
  onEditFeature,
  onDeleteFeature,
}: {
  cat: Category;
  isSelected: boolean;
  isExpanded: boolean;
  isDiscovering: boolean;
  discoveryDisabled: boolean;
  features?: Feature[];
  loadingFeatures: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDiscover: () => void;
  onAddFeature: () => void;
  onEditFeature: (feature: Feature) => void;
  onDeleteFeature: (feature: Feature) => void;
}) {
  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 ${isSelected ? "bg-brand-50/50" : ""}`}>
        <td className="px-4 py-3">
          <button
            onClick={onToggleSelect}
            className="flex items-center text-gray-400 hover:text-gray-600"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-brand-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-1 py-3">
          <button
            onClick={onToggleExpand}
            className="flex items-center text-gray-400 hover:text-gray-600"
            title={isExpanded ? "Collapse features" : "Expand features"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
        <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
          {cat.description || <span className="italic text-gray-400">No description</span>}
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant={cat._count.features > 0 ? "info" : "default"}>
            {cat._count.features}
          </Badge>
        </td>
        <td className="px-4 py-3 text-center text-gray-500">{cat.sortOrder}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={onDiscover}
              disabled={discoveryDisabled}
              className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Discover features from competitor sources"
            >
              {isDiscovering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Edit category"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded feature rows */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50/50 px-0 py-0">
            <div className="border-b border-gray-200">
              <div className="px-8 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Features in {cat.name}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onAddFeature}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Feature
                  </Button>
                </div>

                {loadingFeatures && (
                  <div className="flex items-center gap-2 py-4 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading features...</span>
                  </div>
                )}

                {!loadingFeatures && features && (
                  <>
                    {features.length === 0 ? (
                      <p className="py-4 text-sm text-gray-400 italic">
                        No features in this category yet. Add one or use Discover to find features automatically.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {features.map((feature) => (
                          <div
                            key={feature.id}
                            className="group flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                          >
                            <GripVertical className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-sm">{feature.name}</span>
                                {feature.subcategory && (
                                  <Badge variant="default">{feature.subcategory.name}</Badge>
                                )}
                              </div>
                              {feature.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{feature.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {feature.coverages.length > 0 && (
                                <span className="text-xs text-gray-400">
                                  {feature.coverages.length} competitor{feature.coverages.length !== 1 ? "s" : ""}
                                </span>
                              )}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => onEditFeature(feature)}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  title="Edit feature"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteFeature(feature)}
                                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  title="Delete feature"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
