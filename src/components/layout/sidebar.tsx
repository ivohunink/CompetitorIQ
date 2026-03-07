"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Grid3X3,
  FolderTree,
  Building2,
  TrendingUp,
  GitCompareArrows,
  ClipboardCheck,
  Settings,
  Users,
  Bot,
  LogOut,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";

interface SidebarProps {
  userRole: string;
  userName: string;
}

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/matrix", label: "Feature Matrix", icon: Grid3X3 },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/competitors", label: "Competitors", icon: Building2 },
  { href: "/trends", label: "Trends", icon: TrendingUp },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
];

const editorNav = [
  { href: "/review", label: "Review Queue", icon: ClipboardCheck },
];

const adminNav = [
  {
    href: "/settings/competitors",
    label: "Manage Competitors",
    icon: Building2,
  },
  {
    href: "/settings/categories",
    label: "Manage Categories",
    icon: FolderTree,
  },
  { href: "/settings/scraping", label: "Scraping Config", icon: Bot },
  { href: "/settings/users", label: "User Management", icon: Users },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const isEditor = userRole === "ADMIN" || userRole === "EDITOR";
  const isAdmin = userRole === "ADMIN";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
          CQ
        </div>
        <span className="text-lg font-bold text-gray-900">CompetitorIQ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {mainNav.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {isEditor && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Review
            </p>
            <div className="space-y-1">
              {editorNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Settings
            </p>
            <div className="space-y-1">
              {adminNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium text-sm">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">
              {userName}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {userRole.toLowerCase()}
            </p>
          </div>
          <NotificationBell />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
