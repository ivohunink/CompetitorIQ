"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";

export function MobileHeader() {
  const { toggle } = useSidebar();

  return (
    <div className="fixed left-0 right-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 md:hidden">
      <button
        onClick={toggle}
        className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
          CQ
        </div>
        <span className="text-base font-bold text-gray-900">CompetitorIQ</span>
      </div>
    </div>
  );
}
