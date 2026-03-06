"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ExternalLink } from "lucide-react";

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
    }
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
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
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
                    <p className="mt-2 text-sm text-gray-600">{item.notes}</p>
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
        </div>
      )}
    </>
  );
}
