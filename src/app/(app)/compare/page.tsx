"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Competitor {
  id: string;
  name: string;
}

interface Feature {
  id: string;
  name: string;
  category: { name: string } | null;
  coverages: Array<{ competitorId: string; status: string }>;
}

const statusConfig: Record<string, { icon: string; bg: string; text: string }> = {
  SUPPORTED: { icon: "✓", bg: "bg-green-100", text: "text-green-800" },
  PARTIAL: { icon: "◐", bg: "bg-yellow-100", text: "text-yellow-800" },
  NOT_SUPPORTED: { icon: "✕", bg: "bg-red-100", text: "text-red-800" },
  UNKNOWN: { icon: "?", bg: "bg-gray-100", text: "text-gray-500" },
};

export default function ComparePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [compA, setCompA] = useState("");
  const [compB, setCompB] = useState("");

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then(setCompetitors);
    fetch("/api/features")
      .then((r) => r.json())
      .then(setFeatures);
  }, []);

  const selectedA = competitors.find((c) => c.id === compA);
  const selectedB = competitors.find((c) => c.id === compB);

  return (
    <>
      <PageHeader
        title="Compare Competitors"
        description="Side-by-side feature comparison of any two competitors."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <select
          value={compA}
          onChange={(e) => setCompA(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto sm:min-w-[200px]"
        >
          <option value="">Select competitor...</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <span className="text-sm font-medium text-gray-500">vs</span>

        <select
          value={compB}
          onChange={(e) => setCompB(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-auto sm:min-w-[200px]"
        >
          <option value="">Select competitor...</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {compA && compB ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Feature
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">
                  Category
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  {selectedA?.name}
                </th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">
                  {selectedB?.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => {
                const covA = feature.coverages.find(
                  (c) => c.competitorId === compA
                );
                const covB = feature.coverages.find(
                  (c) => c.competitorId === compB
                );
                const statusA = covA?.status || "UNKNOWN";
                const statusB = covB?.status || "UNKNOWN";
                const cfgA = statusConfig[statusA];
                const cfgB = statusConfig[statusB];

                return (
                  <tr
                    key={feature.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {feature.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {feature.category?.name || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm",
                          cfgA.bg,
                          cfgA.text
                        )}
                      >
                        {cfgA.icon}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm",
                          cfgB.bg,
                          cfgB.text
                        )}
                      >
                        {cfgB.icon}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {features.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No features to compare.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Select two competitors above to see a side-by-side comparison.
          </div>
        </Card>
      )}
    </>
  );
}
