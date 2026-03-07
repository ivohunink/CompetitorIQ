"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Check,
  X,
  ExternalLink,
  CheckSquare,
  Square,
  Minus,
  Loader2,
} from "lucide-react";

interface PendingItem {
  id: string;
  featureId: string;
  competitorId: string;
  status: string;
  evidenceUrl: string | null;
  confidence: string | null;
  notes: string | null;
  createdAt: string;
  feature: { name: string; category: { name: string } | null };
  competitor: { name: string };
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState("");
  const [filterCompetitor, setFilterCompetitor] = useState("");

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleAction(id: string, action: "APPROVED" | "REJECTED") {
    const res = await fetch(`/api/review/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: action }),
    });
    if (res.ok) {
      setItems(items.filter((i) => i.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkAction(action: "APPROVED" | "REJECTED") {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/review/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          reviewStatus: action,
        }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
      }
    } finally {
      setBulkLoading(false);
    }
  }

  // Filtering
  const filteredItems = items.filter((item) => {
    if (filterConfidence && item.confidence !== filterConfidence) return false;
    if (filterCompetitor && item.competitor.name !== filterCompetitor)
      return false;
    return true;
  });

  const competitors = Array.from(
    new Set(items.map((i) => i.competitor.name))
  ).sort();

  // Selection helpers
  const allFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((i) => selectedIds.has(i.id));
  const someFilteredSelected =
    filteredItems.some((i) => selectedIds.has(i.id)) && !allFilteredSelected;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.add(i.id));
        return next;
      });
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

  const confidenceVariant: Record<string, "success" | "warning" | "danger"> = {
    HIGH: "success",
    MEDIUM: "warning",
    LOW: "danger",
  };

  return (
    <>
      <PageHeader
        title="Review Queue"
        description="Review auto-scraped feature data before publishing to the live dashboard."
      />

      {loading ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Loading...
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          No items pending review. All caught up!
        </Card>
      ) : (
        <>
          {/* Filters & bulk action bar */}
          <Card className="mb-4 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center text-gray-500 hover:text-gray-700"
                  title={
                    allFilteredSelected ? "Deselect all" : "Select all visible"
                  }
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : someFilteredSelected ? (
                    <Minus className="h-4 w-4 text-brand-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span className="text-sm text-gray-500">
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
                  {filterConfidence || filterCompetitor
                    ? ` (filtered from ${items.length})`
                    : ""}
                </span>
                <div className="flex items-center gap-2 ml-2">
                  <Select
                    id="filter-confidence"
                    value={filterConfidence}
                    onChange={(e) => setFilterConfidence(e.target.value)}
                    options={[
                      { value: "", label: "All confidence" },
                      { value: "HIGH", label: "High confidence" },
                      { value: "MEDIUM", label: "Medium confidence" },
                      { value: "LOW", label: "Low confidence" },
                    ]}
                  />
                  <Select
                    id="filter-competitor"
                    value={filterCompetitor}
                    onChange={(e) => setFilterCompetitor(e.target.value)}
                    options={[
                      { value: "", label: "All competitors" },
                      ...competitors.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </div>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-brand-800">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleBulkAction("REJECTED")}
                    disabled={bulkLoading}
                    className="text-red-600 hover:bg-red-50"
                  >
                    {bulkLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-1" />
                    )}
                    Reject All
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction("APPROVED")}
                    disabled={bulkLoading}
                  >
                    {bulkLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Approve All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Items list */}
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`p-4 ${selectedIds.has(item.id) ? "ring-2 ring-brand-200 bg-brand-50/30" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => toggleSelect(item.id)}
                      className="mt-0.5 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {selectedIds.has(item.id) ? (
                        <CheckSquare className="h-4 w-4 text-brand-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">
                          {item.feature.name}
                        </h3>
                        <span className="text-gray-400">for</span>
                        <span className="font-medium text-gray-700">
                          {item.competitor.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {item.feature.category && (
                          <Badge variant="info">
                            {item.feature.category.name}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            item.status === "SUPPORTED"
                              ? "success"
                              : item.status === "PARTIAL"
                                ? "warning"
                                : "default"
                          }
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                        {item.confidence && (
                          <Badge variant={confidenceVariant[item.confidence]}>
                            {item.confidence} confidence
                          </Badge>
                        )}
                      </div>
                      {item.notes && (
                        <p className="mt-2 text-sm text-gray-600">
                          {item.notes}
                        </p>
                      )}
                      {item.evidenceUrl && (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700"
                        >
                          View evidence <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAction(item.id, "REJECTED")}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction(item.id, "APPROVED")}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredItems.length === 0 && (
              <Card className="p-8 text-center text-sm text-gray-500">
                No items match the current filters.
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
