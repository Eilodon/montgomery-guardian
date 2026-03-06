"use client";

import { cn } from "@/lib/utils";
import type { MapPanelProps } from "./types";

export function MapPanel({ title, children, className }: MapPanelProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Panel Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      </div>

      {/* Map Placeholder Area */}
      <div
        className="flex-1 min-h-[300px] rounded-lg bg-slate-700 flex items-center justify-center border border-slate-600"
        role="img"
        aria-label={`${title} map visualization area`}
      >
        {children || (
          <span className="text-sm text-slate-400">Map renders here</span>
        )}
      </div>
    </div>
  );
}

export type { MapPanelProps };
