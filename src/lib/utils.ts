import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date);
}

export function supportStatusLabel(status: string): string {
  switch (status) {
    case "SUPPORTED":
      return "Supported";
    case "PARTIAL":
      return "Partial";
    case "NOT_SUPPORTED":
      return "Not Supported";
    case "UNKNOWN":
      return "Unknown";
    default:
      return status;
  }
}

export function supportStatusIcon(status: string): string {
  switch (status) {
    case "SUPPORTED":
      return "✓";
    case "PARTIAL":
      return "◐";
    case "NOT_SUPPORTED":
      return "✕";
    case "UNKNOWN":
      return "?";
    default:
      return "?";
  }
}
