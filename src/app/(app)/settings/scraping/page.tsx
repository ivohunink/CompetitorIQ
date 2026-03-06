"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Clock, AlertCircle } from "lucide-react";

export default function ScrapingConfigPage() {
  return (
    <>
      <PageHeader
        title="Scraping Configuration"
        description="Configure automated data collection from competitor sources."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Automated Scraping Engine
              </h3>
              <p className="text-sm text-gray-500">Phase 2 Feature</p>
            </div>
            <Badge variant="warning" className="ml-auto">
              Coming Soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-gray-50 p-6 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-2">
              The automated scraping engine is part of Phase 2 and will include:
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>
                Scheduled web scraping of competitor URLs (daily/weekly)
              </li>
              <li>
                AI-powered feature extraction from HTML content
              </li>
              <li>
                Change detection with diff views
              </li>
              <li>
                Confidence scoring for extracted features
              </li>
              <li>
                Review queue integration before publishing
              </li>
            </ul>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              Estimated: Weeks 4-6
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
