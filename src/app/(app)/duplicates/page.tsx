"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  Copy,
  X,
  Merge,
  Loader2,
  Search,
} from "lucide-react";

interface DuplicateFeature {
  id: string;
  name: string;
  description: string | null;
  category: { id: string; name: string } | null;
}

interface DuplicateItem {
  id: string;
  featureAId: string;
  featureBId: string;
  similarity: number;
  method: string;
  status: string;
  createdAt: string;
  featureA: DuplicateFeature;
  featureB: DuplicateFeature;
}

export default function DuplicatesPage() {
  const [items, setItems] = useState<DuplicateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [mergeItem, setMergeItem] = useState<DuplicateItem | null>(null);
  const [merging, setMerging] = useState(false);

  function fetchDuplicates(status: string) {
    setLoading(true);
    fetch(`/api/features/duplicates?status=${status}`)
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchDuplicates(filterStatus);
  }, [filterStatus]);

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/features/duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchDuplicates(filterStatus);
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleDismiss(id: string) {
    const res = await fetch(`/api/features/duplicates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISMISSED" }),
    });
    if (res.ok) {
      setItems(items.filter((i) => i.id !== id));
    }
  }

  async function handleMerge(duplicateId: string, keepFeatureId: string) {
    setMerging(true);
    try {
      const res = await fetch(`/api/features/duplicates/${duplicateId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepFeatureId }),
      });
      if (res.ok) {
        setItems(items.filter((i) => i.id !== duplicateId));
        setMergeItem(null);
      }
    } finally {
      setMerging(false);
    }
  }

  const methodLabel: Record<string, string> = {
    string: "Name similarity",
    ai: "AI detected",
    both: "Name + AI",
  };

  return (
    <>
      <PageHeader
        title="Duplicate Features"
        description="Review and resolve potential duplicate features detected by similarity analysis."
      />

      {/* Toolbar */}
      <Card className="mb-4 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "PENDING", label: "Pending" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "DISMISSED", label: "Dismissed" },
              ]}
            />
            <span className="text-sm text-gray-500">
              {items.length} duplicate{items.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button size="sm" onClick={handleScan} disabled={scanning}>
            {scanning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            Scan for Duplicates
          </Button>
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          Loading...
        </Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-500">
          <Copy className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          No duplicates found. Run a scan to check for potential duplicates.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {item.featureA.name}
                    </span>
                    {item.featureA.category && (
                      <Badge variant="info">{item.featureA.category.name}</Badge>
                    )}
                    <span className="text-gray-400 mx-1">&harr;</span>
                    <span className="font-medium text-gray-900">
                      {item.featureB.name}
                    </span>
                    {item.featureB.category && (
                      <Badge variant="info">{item.featureB.category.name}</Badge>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={item.similarity >= 0.8 ? "danger" : "warning"}>
                      {Math.round(item.similarity * 100)}% similar
                    </Badge>
                    <Badge variant="default">
                      {methodLabel[item.method] || item.method}
                    </Badge>
                  </div>
                  {(item.featureA.description || item.featureB.description) && (
                    <div className="mt-2 text-sm text-gray-500 grid grid-cols-2 gap-4">
                      <div>
                        {item.featureA.description && (
                          <p>{item.featureA.description}</p>
                        )}
                      </div>
                      <div>
                        {item.featureB.description && (
                          <p>{item.featureB.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {item.status === "PENDING" && (
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(item.id)}
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setMergeItem(item)}
                    >
                      <Merge className="h-4 w-4 mr-1" />
                      Merge
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Merge modal */}
      <Modal
        isOpen={!!mergeItem}
        title="Merge Duplicate Features"
        onClose={() => setMergeItem(null)}
      >
        {mergeItem && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Choose which feature to keep. The other feature will be deleted and
              its coverage data will be transferred.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleMerge(mergeItem.id, mergeItem.featureAId)}
                disabled={merging}
                className="w-full rounded-lg border-2 border-gray-200 p-4 text-left hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                <p className="font-medium text-gray-900">
                  Keep &quot;{mergeItem.featureA.name}&quot;
                </p>
                {mergeItem.featureA.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {mergeItem.featureA.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Discard &quot;{mergeItem.featureB.name}&quot;
                </p>
              </button>
              <button
                onClick={() => handleMerge(mergeItem.id, mergeItem.featureBId)}
                disabled={merging}
                className="w-full rounded-lg border-2 border-gray-200 p-4 text-left hover:border-brand-500 hover:bg-brand-50 transition-colors"
              >
                <p className="font-medium text-gray-900">
                  Keep &quot;{mergeItem.featureB.name}&quot;
                </p>
                {mergeItem.featureB.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {mergeItem.featureB.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Discard &quot;{mergeItem.featureA.name}&quot;
                </p>
              </button>
            </div>
            {merging && (
              <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Merging features...
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
