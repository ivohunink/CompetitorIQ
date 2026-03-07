"use client";

import { SidebarProvider } from "@/hooks/use-sidebar";
import { Sidebar } from "./sidebar";
import { MobileHeader } from "./mobile-header";

interface AppShellProps {
  children: React.ReactNode;
  userRole: string;
  userName: string;
}

export function AppShell({ children, userRole, userName }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50">
        <Sidebar userRole={userRole} userName={userName} />
        <MobileHeader />
        <main className="min-h-screen md:ml-64">
          <div className="p-4 pt-18 sm:p-6 md:pt-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
