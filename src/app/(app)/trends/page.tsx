"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Competitor {
  id: string;
  name: string;
}

interface Feature {
  id: string;
  name: string;
  createdAt: string;
  category: { name: string } | null;
  coverages: Array<{
    competitorId: string;
    status: string;
    createdAt: string;
    competitor: { name: string };
  }>;
}

export default function TrendsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then(setCompetitors);
    fetch("/api/features")
      .then((r) => r.json())
      .then(setFeatures);
  }, []);

  // Calculate momentum per competitor (features added in last 90 days)
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const momentum = competitors.map((comp) => {
    const recentCoverages = features.flatMap((f) =>
      f.coverages.filter(
        (c) =>
          c.competitorId === comp.id &&
          c.status === "SUPPORTED" &&
          new Date(c.createdAt) >= ninetyDaysAgo
      )
    );
    return {
      ...comp,
      recentCount: recentCoverages.length,
      totalSupported: features.filter((f) =>
        f.coverages.some(
          (c) => c.competitorId === comp.id && c.status === "SUPPORTED"
        )
      ).length,
    };
  }).sort((a, b) => b.recentCount - a.recentCount);

  // Recent feature additions timeline
  const recentFeatures = features
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 20);

  return (
    <>
      <PageHeader
        title="Trends"
        description="Track competitor momentum and feature addition trends."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Momentum Leaderboard */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">
              Competitor Momentum (90 days)
            </h3>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {momentum.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                Add competitors and features to see momentum data.
              </div>
            ) : (
              momentum.map((comp, idx) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {comp.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {comp.totalSupported} total features
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-brand-600">
                      +{comp.recentCount}
                    </span>
                    <p className="text-xs text-gray-500">new in 90d</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Timeline */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Recent Features</h3>
          </CardHeader>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {recentFeatures.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No feature history to show.
              </div>
            ) : (
              recentFeatures.map((f) => (
                <div key={f.id} className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {f.name}
                    </p>
                    <span className="text-xs text-gray-400">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {f.category && (
                    <Badge variant="info" className="mt-1">
                      {f.category.name}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
