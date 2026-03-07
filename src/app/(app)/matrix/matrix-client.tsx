"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Search, Download, Bookmark, Trash2, ChevronDown } from "lucide-react";

interface SavedFilter {
  id: string;
  name: string;
  filters: string;
}

interface Feature {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  coverages: Array<{
    id: string;
    competitorId: string;
    status: string;
    evidenceUrl: string | null;
    notes: string | null;
    competitor: { id: string; name: string };
  }>;
}

interface Competitor {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  features: Feature[];
  competitors: Competitor[];
  categories: Category[];
  userRole: string;
}

const statusConfig: Record<
  string,
  { icon: string; label: string; bg: string; text: string }
> = {
  SUPPORTED: {
    icon: "✓",
    label: "Supported",
    bg: "bg-green-100",
    text: "text-green-800",
  },
  PARTIAL: {
    icon: "◐",
    label: "Partial",
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  NOT_SUPPORTED: {
    icon: "✕",
    label: "Not Supported",
    bg: "bg-red-100",
    text: "text-red-800",
  },
  UNKNOWN: {
    icon: "?",
    label: "Unknown",
    bg: "bg-gray-100",
    text: "text-gray-500",
  },
};

export function FeatureMatrixClient({
  features: initialFeatures,
  competitors,
  categories,
  userRole,
}: Props) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });
  const [features, setFeatures] = useState(initialFeatures);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    featureId: string;
    competitorId: string;
  } | null>(null);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const canEdit = userRole === "ADMIN" || userRole === "EDITOR";

  const loadSavedFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/saved-filters");
      if (res.ok) setSavedFilters(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    loadSavedFilters();
  }, [loadSavedFilters]);

  async function handleSaveFilter(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: filterName,
        filters: { search, categoryFilter, statusFilter },
      }),
    });
    if (res.ok) {
      loadSavedFilters();
      setShowSaveFilter(false);
      setFilterName("");
    }
  }

  function applyFilter(filter: SavedFilter) {
    const f = JSON.parse(filter.filters);
    setSearch(f.search || "");
    setCategoryFilter(f.categoryFilter || "all");
    setStatusFilter(f.statusFilter || "all");
    setShowFilterMenu(false);
  }

  async function deleteFilter(id: string) {
    await fetch(`/api/saved-filters/${id}`, { method: "DELETE" });
    setSavedFilters(savedFilters.filter((f) => f.id !== id));
  }

  const filteredFeatures = useMemo(() => {
    return features.filter((f) => {
      if (search) {
        const s = search.toLowerCase();
        if (
          !f.name.toLowerCase().includes(s) &&
          !f.description?.toLowerCase().includes(s)
        )
          return false;
      }
      if (categoryFilter !== "all" && f.categoryId !== categoryFilter)
        return false;
      if (statusFilter !== "all") {
        const hasStatus = f.coverages.some((c) => c.status === statusFilter);
        if (!hasStatus) return false;
      }
      return true;
    });
  }, [features, search, categoryFilter, statusFilter]);

  async function handleAddFeature(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeature),
      });
      if (res.ok) {
        const feature = await res.json();
        setFeatures([
          ...features,
          { ...feature, coverages: [] },
        ]);
        setShowAddFeature(false);
        setNewFeature({ name: "", description: "" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCellClick(featureId: string, competitorId: string) {
    if (!canEdit) return;

    const feature = features.find((f) => f.id === featureId);
    const coverage = feature?.coverages.find(
      (c) => c.competitorId === competitorId
    );
    const currentStatus = coverage?.status || "UNKNOWN";

    // Cycle through statuses
    const cycle = ["UNKNOWN", "SUPPORTED", "PARTIAL", "NOT_SUPPORTED"];
    const nextIdx = (cycle.indexOf(currentStatus) + 1) % cycle.length;
    const nextStatus = cycle[nextIdx];

    try {
      const res = await fetch("/api/coverages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId,
          competitorId,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setFeatures(
          features.map((f) => {
            if (f.id !== featureId) return f;
            const existing = f.coverages.findIndex(
              (c) => c.competitorId === competitorId
            );
            const comp = competitors.find((c) => c.id === competitorId)!;
            if (existing >= 0) {
              const updated = [...f.coverages];
              updated[existing] = { ...updated[existing], status: nextStatus };
              return { ...f, coverages: updated };
            }
            return {
              ...f,
              coverages: [
                ...f.coverages,
                {
                  id: "temp",
                  competitorId,
                  status: nextStatus,
                  evidenceUrl: null,
                  notes: null,
                  competitor: comp,
                },
              ],
            };
          })
        );
      }
    } catch (error) {
      console.error("Failed to update coverage:", error);
    }
  }

  function exportCSV() {
    const headers = ["Feature", "Category", ...competitors.map((c) => c.name)];
    const rows = filteredFeatures.map((f) => [
      f.name,
      f.category?.name || "Uncategorized",
      ...competitors.map((c) => {
        const cov = f.coverages.find((cv) => cv.competitorId === c.id);
        return statusConfig[cov?.status || "UNKNOWN"].label;
      }),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feature-matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="SUPPORTED">Supported</option>
          <option value="PARTIAL">Partial</option>
          <option value="NOT_SUPPORTED">Not Supported</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        {/* Saved Filters */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Bookmark className="mr-1.5 h-4 w-4" />
            Filters
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b px-3 py-2">
                <button
                  onClick={() => {
                    setShowFilterMenu(false);
                    setShowSaveFilter(true);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Save current filter
                </button>
              </div>
              {savedFilters.length === 0 ? (
                <p className="px-3 py-3 text-xs text-gray-500">
                  No saved filters yet
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto py-1">
                  {savedFilters.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
                    >
                      <button
                        onClick={() => applyFilter(f)}
                        className="flex-1 text-left text-sm text-gray-700"
                      >
                        {f.name}
                      </button>
                      <button
                        onClick={() => deleteFilter(f.id)}
                        className="rounded p-1 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download className="mr-1.5 h-4 w-4" />
          Export CSV
        </Button>

        {canEdit && (
          <Button size="sm" onClick={() => setShowAddFeature(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Feature
          </Button>
        )}
      </div>

      {/* Matrix */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-700 min-w-[250px]">
                  Feature
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700 min-w-[120px]">
                  Category
                </th>
                {competitors.map((c) => (
                  <th
                    key={c.id}
                    className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[100px]"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + competitors.length}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {features.length === 0
                      ? "No features yet. Add your first feature to get started."
                      : "No features match your filters."}
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feature, idx) => (
                  <tr
                    key={feature.id}
                    className={cn(
                      "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    )}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {feature.name}
                      </span>
                      {feature.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[230px]">
                          {feature.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {feature.category ? (
                        <Badge variant="info">{feature.category.name}</Badge>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    {competitors.map((comp) => {
                      const coverage = feature.coverages.find(
                        (c) => c.competitorId === comp.id
                      );
                      const status = coverage?.status || "UNKNOWN";
                      const config = statusConfig[status];

                      return (
                        <td
                          key={comp.id}
                          className="px-3 py-2.5 text-center"
                          onClick={() =>
                            handleCellClick(feature.id, comp.id)
                          }
                        >
                          <button
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg text-base font-medium transition-all",
                              config.bg,
                              config.text,
                              canEdit &&
                                "cursor-pointer hover:ring-2 hover:ring-brand-300"
                            )}
                            title={`${config.label}${canEdit ? " — Click to change" : ""}`}
                          >
                            {config.icon}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Legend:</span>
        {Object.entries(statusConfig).map(([key, config]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-5 w-5 items-center justify-center rounded text-xs",
                config.bg,
                config.text
              )}
            >
              {config.icon}
            </span>
            {config.label}
          </span>
        ))}
        {canEdit && (
          <span className="ml-auto italic">Click a cell to cycle status</span>
        )}
      </div>

      {/* Save Filter Modal */}
      <Modal
        isOpen={showSaveFilter}
        onClose={() => setShowSaveFilter(false)}
        title="Save Filter"
        size="sm"
      >
        <form onSubmit={handleSaveFilter} className="space-y-4">
          <Input
            id="filter-name"
            label="Filter Name"
            placeholder='e.g., "Scheduling features only"'
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            required
          />
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <p className="font-medium mb-1">Current filter:</p>
            {search && <p>Search: &ldquo;{search}&rdquo;</p>}
            {categoryFilter !== "all" && (
              <p>
                Category:{" "}
                {categories.find((c) => c.id === categoryFilter)?.name}
              </p>
            )}
            {statusFilter !== "all" && <p>Status: {statusFilter}</p>}
            {!search && categoryFilter === "all" && statusFilter === "all" && (
              <p className="text-gray-400">No filters applied</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSaveFilter(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Filter</Button>
          </div>
        </form>
      </Modal>

      {/* Add Feature Modal */}
      <Modal
        isOpen={showAddFeature}
        onClose={() => setShowAddFeature(false)}
        title="Add Feature"
      >
        <form onSubmit={handleAddFeature} className="space-y-4">
          <Input
            id="feature-name"
            label="Feature Name"
            placeholder="e.g., Auto-scheduling"
            value={newFeature.name}
            onChange={(e) =>
              setNewFeature({ ...newFeature, name: e.target.value })
            }
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              rows={3}
              placeholder="What does this feature do?"
              value={newFeature.description}
              onChange={(e) =>
                setNewFeature({ ...newFeature, description: e.target.value })
              }
            />
          </div>
          <p className="text-xs text-gray-500">
            AI will automatically assign a category based on the feature name
            and description.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddFeature(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Feature"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
