"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Bot,
  Play,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  FileText,
  BookOpen,
  Star,
} from "lucide-react";

interface DataSource {
  id: string;
  competitorId: string;
  url: string;
  type: string;
  lastScraped: string | null;
  scrapeEnabled: boolean;
  cadence: string;
  competitor: { id: string; name: string; status: string };
}

interface ScrapeResult {
  competitorName: string;
  sourcesScraped: number;
  sourcesFailed: number;
  featuresUpdated: number;
  newFeaturesFound: number;
  errors: string[];
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

export default function ScrapingConfigPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [competitors, setCompetitors] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState<Record<string, boolean>>({});
  const [scrapeResults, setScrapeResults] = useState<
    Record<string, ScrapeResult>
  >({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    competitorId: "",
    url: "",
    type: "website",
    cadence: "weekly",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dsRes, compRes] = await Promise.all([
      fetch("/api/datasources"),
      fetch("/api/competitors"),
    ]);
    const ds = await dsRes.json();
    const comps = await compRes.json();
    setDataSources(ds);
    setCompetitors(comps);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group data sources by competitor
  const grouped = dataSources.reduce(
    (acc, ds) => {
      const key = ds.competitor.id;
      if (!acc[key]) acc[key] = { competitor: ds.competitor, sources: [] };
      acc[key].sources.push(ds);
      return acc;
    },
    {} as Record<
      string,
      { competitor: DataSource["competitor"]; sources: DataSource[] }
    >
  );

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/datasources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scrapeEnabled: enabled }),
    });
    setDataSources(
      dataSources.map((ds) =>
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
    setDataSources(
      dataSources.map((ds) => (ds.id === id ? { ...ds, cadence } : ds))
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this data source?")) return;
    const res = await fetch(`/api/datasources/${id}`, { method: "DELETE" });
    if (res.ok) setDataSources(dataSources.filter((ds) => ds.id !== id));
  }

  async function handleScrape(competitorId: string) {
    setScraping((s) => ({ ...s, [competitorId]: true }));
    setScrapeResults((r) => {
      const next = { ...r };
      delete next[competitorId];
      return next;
    });

    try {
      const res = await fetch(`/api/scrape/${competitorId}`, {
        method: "POST",
      });
      const result = await res.json();
      setScrapeResults((r) => ({ ...r, [competitorId]: result }));
      loadData();
    } catch {
      setScrapeResults((r) => ({
        ...r,
        [competitorId]: {
          competitorName: "",
          sourcesScraped: 0,
          sourcesFailed: 0,
          featuresUpdated: 0,
          newFeaturesFound: 0,
          errors: ["Network error"],
        },
      }));
    } finally {
      setScraping((s) => ({ ...s, [competitorId]: false }));
    }
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/datasources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      const ds = await res.json();
      setDataSources([...dataSources, ds]);
      setShowAdd(false);
      setAddForm({
        competitorId: "",
        url: "",
        type: "website",
        cadence: "weekly",
      });
    }
  }

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

  return (
    <>
      <PageHeader
        title="Scraping Configuration"
        description="Configure automated data collection from competitor sources."
        actions={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Data Source
          </Button>
        }
      />

      {/* Summary card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Automated Scraping Engine
              </h3>
              <p className="text-sm text-gray-500">
                {dataSources.filter((ds) => ds.scrapeEnabled).length} active
                sources across {Object.keys(grouped).length} competitors
              </p>
            </div>
            <Badge variant="success" className="ml-auto">
              Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900">
                {dataSources.length}
              </p>
              <p className="text-xs text-gray-500">Total Sources</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-green-600">
                {dataSources.filter((ds) => ds.scrapeEnabled).length}
              </p>
              <p className="text-xs text-gray-500">Enabled</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-blue-600">
                {dataSources.filter((ds) => ds.cadence === "daily").length}
              </p>
              <p className="text-xs text-gray-500">Daily</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-purple-600">
                {dataSources.filter((ds) => ds.cadence === "weekly").length}
              </p>
              <p className="text-xs text-gray-500">Weekly</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-competitor sections */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No data sources configured. Add competitors with data sources in
            Settings &gt; Competitors, or click &ldquo;Add Data Source&rdquo;
            above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([compId, { competitor, sources }]) => (
            <Card key={compId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {competitor.name}
                    </h3>
                    <Badge
                      variant={
                        competitor.status === "ACTIVE" ? "success" : "warning"
                      }
                    >
                      {competitor.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {scrapeResults[compId] && (
                      <ScrapeResultBadge result={scrapeResults[compId]} />
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleScrape(compId)}
                      disabled={scraping[compId]}
                    >
                      {scraping[compId] ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 h-4 w-4" />
                      )}
                      {scraping[compId] ? "Scraping..." : "Scrape Now"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                                ds.scrapeEnabled
                                  ? "bg-brand-600"
                                  : "bg-gray-300"
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
                            <button
                              onClick={() => handleDelete(ds.id)}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add data source modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Data Source"
      >
        <form onSubmit={handleAddSource} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Competitor
            </label>
            <select
              value={addForm.competitorId}
              onChange={(e) =>
                setAddForm({ ...addForm, competitorId: e.target.value })
              }
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select competitor...</option>
              {competitors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="url"
            label="URL"
            type="url"
            placeholder="https://competitor.com/features"
            value={addForm.url}
            onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Source Type
            </label>
            <select
              value={addForm.type}
              onChange={(e) =>
                setAddForm({ ...addForm, type: e.target.value })
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
              value={addForm.cadence}
              onChange={(e) =>
                setAddForm({ ...addForm, cadence: e.target.value })
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
              onClick={() => setShowAdd(false)}
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

function ScrapeResultBadge({ result }: { result: ScrapeResult }) {
  const hasErrors = result.errors.length > 0;
  const success = result.sourcesScraped > 0 && !hasErrors;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {success ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-500" />
      )}
      <span className="text-gray-600">
        {result.featuresUpdated} features updated
        {result.newFeaturesFound > 0 &&
          `, ${result.newFeaturesFound} new found`}
        {result.sourcesFailed > 0 &&
          `, ${result.sourcesFailed} sources failed`}
      </span>
    </div>
  );
}
