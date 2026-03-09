"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  FileText,
  BookOpen,
  Star,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface PageContent {
  id: string;
  rawText: string;
}

interface ScrapeLogEntry {
  id: string;
  sourceUrl: string;
  sourceType: string;
  status: string;
  contentLength: number | null;
  featuresFound: number;
  newFeatures: number;
  error: string | null;
  duration: number | null;
  createdAt: string;
  pageContent: PageContent | null;
}

interface FeatureResult {
  id: string;
  featureName: string;
  featureId: string | null;
  isNew: boolean;
  status: string | null;
  confidence: string;
  evidence: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
}

interface ScrapeRunDetail {
  id: string;
  competitorName: string;
  status: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresFound: number;
  newFeatures: number;
  totalDuration: number | null;
  errors: string | null;
  createdAt: string;
  completedAt: string | null;
  scrapeLogs: ScrapeLogEntry[];
  featureResults: FeatureResult[];
}

const SOURCE_ICONS: Record<string, typeof Globe> = {
  website: Globe,
  changelog: FileText,
  docs: BookOpen,
  g2: Star,
  capterra: Star,
};

export default function ScrapeRunDetailPage() {
  const params = useParams();
  const runId = params.runId as string;
  const [run, setRun] = useState<ScrapeRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadRun() {
      try {
        const res = await fetch(`/api/scrape-runs/${runId}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Run not found" : "Failed to load run");
          return;
        }
        setRun(await res.json());
      } catch {
        setError("Failed to load run");
      } finally {
        setLoading(false);
      }
    }
    loadRun();
  }, [runId]);

  function toggleLog(logId: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  function formatDuration(ms: number | null): string {
    if (ms == null) return "-";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function formatTime(date: string): string {
    return new Date(date).toLocaleString();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !run) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          {error || "Run not found"}
        </CardContent>
      </Card>
    );
  }

  const parsedErrors: string[] = run.errors
    ? (() => {
        try {
          return JSON.parse(run.errors);
        } catch {
          return [run.errors];
        }
      })()
    : [];

  const knownFeatures = run.featureResults.filter((f) => !f.isNew);
  const newFeatures = run.featureResults.filter((f) => f.isNew);

  return (
    <>
      <PageHeader
        title={`Scrape Run — ${run.competitorName}`}
        description={`Run started ${formatTime(run.createdAt)}`}
        actions={
          <Link href="/settings/scraping/runs">
            <Button size="sm" variant="secondary">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              All Runs
            </Button>
          </Link>
        }
      />

      {/* Run Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Run Summary</h3>
            <RunStatusBadge status={run.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {run.sourcesScraped}
              </p>
              <p className="text-xs text-gray-500">Pages Scraped</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {run.sourcesFailed}
              </p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {run.featuresFound}
              </p>
              <p className="text-xs text-gray-500">Features Found</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {run.newFeatures}
              </p>
              <p className="text-xs text-gray-500">New Features</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(run.totalDuration)}
              </p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
          </div>
          {parsedErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-800 mb-1">
                <AlertCircle className="h-4 w-4" />
                Errors
              </div>
              <ul className="list-disc pl-5 text-sm text-red-700 space-y-0.5">
                {parsedErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages Scraped */}
      <Card className="mb-6">
        <CardHeader>
          <h3 className="font-semibold text-gray-900">
            Pages Scraped ({run.scrapeLogs.length})
          </h3>
        </CardHeader>
        <CardContent>
          {run.scrapeLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No pages were scraped.</p>
          ) : (
            <div className="space-y-2">
              {run.scrapeLogs.map((log) => {
                const Icon = SOURCE_ICONS[log.sourceType] || Globe;
                const isExpanded = expandedLogs.has(log.id);
                const hasContent = log.pageContent?.rawText;

                return (
                  <div
                    key={log.id}
                    className="rounded-lg border border-gray-200"
                  >
                    <button
                      onClick={() => hasContent && toggleLog(log.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
                        hasContent
                          ? "cursor-pointer hover:bg-gray-50"
                          : "cursor-default"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="capitalize text-gray-500 w-20 shrink-0">
                        {log.sourceType}
                      </span>
                      <a
                        href={log.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline truncate"
                        title={log.sourceUrl}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {log.sourceUrl.replace(/^https?:\/\//, "").slice(0, 60)}
                      </a>
                      <div className="ml-auto flex items-center gap-3 shrink-0">
                        <ScrapeStatusBadge status={log.status} />
                        {log.contentLength != null && (
                          <span className="text-xs text-gray-400">
                            {log.contentLength.toLocaleString()} chars
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {formatDuration(log.duration)}
                        </span>
                        {hasContent &&
                          (isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          ))}
                      </div>
                    </button>
                    {log.error && (
                      <div className="flex items-start gap-1 px-4 pb-2 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        {log.error}
                      </div>
                    )}
                    {isExpanded && hasContent && (
                      <div className="border-t border-gray-200 px-4 py-3">
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          Extracted Text
                        </p>
                        <pre className="max-h-96 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap font-mono">
                          {log.pageContent!.rawText}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Determinations */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">
            Feature Determinations ({run.featureResults.length})
          </h3>
        </CardHeader>
        <CardContent>
          {run.featureResults.length === 0 ? (
            <p className="text-sm text-gray-500">
              No features were extracted in this run.
            </p>
          ) : (
            <>
              {knownFeatures.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
                    Known Features ({knownFeatures.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Feature
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Status
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Confidence
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Evidence
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {knownFeatures.map((fr) => (
                          <tr
                            key={fr.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {fr.featureName}
                            </td>
                            <td className="px-3 py-2">
                              <FeatureStatusBadge status={fr.status} />
                            </td>
                            <td className="px-3 py-2">
                              <ConfidenceBadge confidence={fr.confidence} />
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={fr.evidence || ""}>
                              {fr.evidence || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {fr.sourceUrl ? (
                                <a
                                  href={fr.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-600 hover:underline text-xs truncate block max-w-[200px]"
                                  title={fr.sourceUrl}
                                >
                                  {fr.sourceUrl
                                    .replace(/^https?:\/\//, "")
                                    .slice(0, 40)}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {newFeatures.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase text-gray-500">
                    New Features Discovered ({newFeatures.length})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Feature
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Confidence
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Description
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {newFeatures.map((fr) => (
                          <tr
                            key={fr.id}
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {fr.featureName}
                                </span>
                                <Badge variant="info">New</Badge>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <ConfidenceBadge confidence={fr.confidence} />
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={fr.evidence || ""}>
                              {fr.evidence || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {fr.sourceUrl ? (
                                <a
                                  href={fr.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-600 hover:underline text-xs truncate block max-w-[200px]"
                                  title={fr.sourceUrl}
                                >
                                  {fr.sourceUrl
                                    .replace(/^https?:\/\//, "")
                                    .slice(0, 40)}
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
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

function ScrapeStatusBadge({ status }: { status: string }) {
  const variant =
    status === "success"
      ? "success"
      : status === "failed"
        ? "danger"
        : "warning";
  const label = status === "no_content" ? "no content" : status;
  return <Badge variant={variant}>{label}</Badge>;
}

function FeatureStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400">-</span>;
  const variant =
    status === "SUPPORTED"
      ? "success"
      : status === "PARTIAL"
        ? "warning"
        : "danger";
  return (
    <Badge variant={variant}>
      {status.toLowerCase().replace("_", " ")}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const variant =
    confidence === "HIGH"
      ? "success"
      : confidence === "MEDIUM"
        ? "warning"
        : "danger";
  return (
    <Badge variant={variant}>{confidence.toLowerCase()}</Badge>
  );
}
