"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import {
  LayoutDashboard,
  Grid3X3,
  FolderTree,
  Building2,
  TrendingUp,
  GitCompareArrows,
  ClipboardCheck,
  Users,
  LogOut,
  Activity,
  BarChart3,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";

interface SidebarProps {
  userRole: string;
  userName: string;
}

const topNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/competitors", label: "Competitors", icon: Building2 },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/monitor", label: "Monitor", icon: Activity },
];

const reviewNav = [
  { href: "/review", label: "Review Queue", icon: ClipboardCheck },
];

const analyzeNav = [
  { href: "/matrix", label: "Feature Matrix", icon: Grid3X3 },
  { href: "/coverage", label: "Feature Coverage", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/trends", label: "Trends", icon: TrendingUp },
];

const settingsNav = [
  { href: "/settings/users", label: "User Management", icon: Users },
];

function NavItem({
  item,
  pathname,
  onNavigate,
}: {
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
  pathname: string;
  onNavigate: () => void;
}) {
  const isActive =
    pathname === item.href || pathname.startsWith(item.href + "/");
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
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
}

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: typeof topNav;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mt-6">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const isEditor = userRole === "ADMIN" || userRole === "EDITOR";
  const isAdmin = userRole === "ADMIN";

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
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
            {topNav.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} onNavigate={close} />
            ))}
          </div>

          {isEditor && (
            <NavSection label="Review" items={reviewNav} pathname={pathname} onNavigate={close} />
          )}

          <NavSection label="Analyze" items={analyzeNav} pathname={pathname} onNavigate={close} />

          {isAdmin && (
            <NavSection label="Settings" items={settingsNav} pathname={pathname} onNavigate={close} />
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
    </>
  );
}
