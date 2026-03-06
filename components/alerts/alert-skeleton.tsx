import { cn } from "@/lib/utils";
import type { AlertSkeletonProps } from "./types";

export function AlertSkeleton({ count = 3 }: AlertSkeletonProps) {
  return (
    <div className="space-y-3 p-1" role="status" aria-label="Loading alerts">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg bg-slate-800 border border-slate-700 p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            {/* Severity Dot Skeleton */}
            <div className="mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-600 shrink-0" />

            {/* Content Skeleton */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title row skeleton */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-5 bg-slate-700 rounded",
                    index === 0 && "w-3/4",
                    index === 1 && "w-1/2",
                    index === 2 && "w-2/3"
                  )}
                />
              </div>

              {/* Summary skeleton - 2 lines */}
              <div className="space-y-2">
                <div className="h-3 bg-slate-700 rounded w-full" />
                <div
                  className={cn(
                    "h-3 bg-slate-700 rounded",
                    index === 0 && "w-4/5",
                    index === 1 && "w-3/5",
                    index === 2 && "w-2/3"
                  )}
                />
              </div>

              {/* Footer skeleton */}
              <div className="flex items-center gap-2">
                <div className="h-3 bg-slate-700 rounded w-16" />
                <div className="h-3 bg-slate-700 rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading alerts...</span>
    </div>
  );
}
