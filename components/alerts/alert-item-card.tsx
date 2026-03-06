"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AlertItemCardProps } from "./types";
import { severityColors } from "./types";

/**
 * Converts ISO 8601 timestamp string to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const timestampDate = new Date(timestamp);
  const diff = now - timestampDate.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes} min ago`;
  } else if (hours < 24) {
    return `${hours} hr ago`;
  } else {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}

export function AlertItemCard({ alert, isNew }: AlertItemCardProps) {
  const { title, summary, severity, source, timestamp } = alert;
  const dotColor = severityColors[severity];

  return (
    <article
      className={cn(
        "rounded-lg bg-slate-800 border border-slate-700 p-4",
        "transition-all duration-200 hover:bg-slate-800/80 hover:border-slate-600",
        "focus-within:ring-2 focus-within:ring-slate-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900"
      )}
      role="article"
      aria-label={`${severity} severity alert: ${title}`}
    >
      {/* Header with severity dot, title, and new badge */}
      <div className="flex items-start gap-3">
        {/* Severity Dot */}
        <div
          className={cn(
            "mt-1.5 h-2.5 w-2.5 rounded-full shrink-0",
            dotColor
          )}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row with New badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-100 truncate">
              {title}
            </h3>
            {isNew && (
              <Badge
                variant="destructive"
                className="shrink-0 animate-pulse text-xs px-1.5 py-0"
              >
                New
              </Badge>
            )}
          </div>

          {/* Summary - limited to 2 lines */}
          <p className="text-sm text-slate-400 line-clamp-2 mb-2">
            {summary}
          </p>

          {/* Footer: source + timestamp */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">{source}</span>
            <span aria-hidden="true">•</span>
            <time dateTime={timestamp}>
              {formatRelativeTime(timestamp)}
            </time>
          </div>
        </div>
      </div>
    </article>
  );
}
