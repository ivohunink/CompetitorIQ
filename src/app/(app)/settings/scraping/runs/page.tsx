"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface ScrapeRunEntry {
  id: string;
  competitorName: string;
  status: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresFound: number;
  newFeatures: number;
  totalDuration: number | null;
  createdAt: string;
  completedAt: string | null;
}

export default function ScrapeRunsPage() {
  const [runs, setRuns] = useState<ScrapeRunEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadRuns = useCallback(async (offset = 0) => {
    if (offset === 0) setLoading(true);
    try {
      const res = await fetch(`/api/scrape-runs?limit=50&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setRuns(data.runs || []);
        } else {
          setRuns((prev) => [...prev, ...(data.runs || [])]);
        }
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  function formatDuration(ms: number | null): string {
    if (ms == null) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatTime(date: string): string {
    return new Date(date).toLocaleString();
  }

  return (
    <>
      <PageHeader
        title="Scrape Runs"
        description="History of all scraping runs with detailed audit trails."
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No scrape runs yet. Trigger a scrape from the{" "}
            <Link
              href="/settings/scraping"
              className="text-brand-600 hover:underline"
            >
              Scraping Configuration
            </Link>{" "}
            page.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Competitor
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Sources
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Features
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600" />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-gray-500">
                        {formatTime(run.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {run.competitorName}
                      </td>
                      <td className="px-4 py-3">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {run.sourcesScraped}
                        {run.sourcesFailed > 0 && (
                          <span className="text-red-500">
                            {" "}
                            / {run.sourcesFailed} failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {run.featuresFound}
                        {run.newFeatures > 0 && (
                          <span className="text-green-600">
                            {" "}
                            +{run.newFeatures} new
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {formatDuration(run.totalDuration)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/settings/scraping/runs/${run.id}`}
                          className="inline-flex items-center gap-1 text-brand-600 hover:underline text-xs"
                        >
                          Details
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {runs.length < total && (
              <div className="border-t p-3 text-center">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => loadRuns(runs.length)}
                >
                  Load More ({runs.length} of {total})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed"
      ? "success"
      : status === "failed"
        ? "danger"
        : "warning";

  return <Badge variant={variant}>{status}</Badge>;
}
