import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Building2,
  Grid3X3,
  FolderTree,
  TrendingUp,
  AlertCircle,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [competitorCount, featureCount, categoryCount, coverageStats, recentFeatures, pendingReviews] =
    await Promise.all([
      prisma.competitor.count({ where: { status: "ACTIVE" } }),
      prisma.feature.count(),
      prisma.category.count(),
      prisma.featureCoverage.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.feature.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
      prisma.featureCoverage.count({ where: { reviewStatus: "PENDING" } }),
    ]);

  const totalCoverages = coverageStats.reduce((sum, s) => sum + s._count, 0);
  const supportedCount =
    coverageStats.find((s) => s.status === "SUPPORTED")?._count || 0;
  const coverageRate =
    totalCoverages > 0
      ? Math.round((supportedCount / totalCoverages) * 100)
      : 0;

  const stats = [
    {
      label: "Active Competitors",
      value: competitorCount,
      icon: Building2,
      href: "/competitors",
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Features Tracked",
      value: featureCount,
      icon: Grid3X3,
      href: "/matrix",
      color: "text-purple-600 bg-purple-50",
    },
    {
      label: "Categories",
      value: categoryCount,
      icon: FolderTree,
      href: "/coverage",
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Coverage Rate",
      value: `${coverageRate}%`,
      icon: TrendingUp,
      href: "/matrix",
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        description="Here's what's happening with your competitive intelligence."
      />

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Features */}
        <Card>
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Features</h2>
            <Link
              href="/matrix"
              className="text-sm text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentFeatures.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No features added yet. Start by adding features from the Feature
                Matrix.
              </div>
            ) : (
              recentFeatures.map((feature) => (
                <Link
                  key={feature.id}
                  href={`/features/${feature.id}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {feature.name}
                    </p>
                    {feature.category && (
                      <p className="text-xs text-gray-500">
                        {feature.category.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(feature.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions & Alerts */}
        <Card>
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <CardContent className="space-y-3">
            {pendingReviews > 0 && (
              <Link
                href="/review"
                className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 hover:bg-yellow-100 transition-colors"
              >
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {pendingReviews} items pending review
                  </p>
                  <p className="text-xs text-yellow-600">
                    Review scraped data before publishing
                  </p>
                </div>
              </Link>
            )}

            <Link
              href="/matrix"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
            >
              <Grid3X3 className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Feature Matrix
                </p>
                <p className="text-xs text-gray-500">
                  View and compare competitor features
                </p>
              </div>
            </Link>

            <Link
              href="/competitors"
              className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
            >
              <Building2 className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Manage Competitors
                </p>
                <p className="text-xs text-gray-500">
                  Add or update competitor profiles
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
