"use client";

import { cn } from "@/lib/utils";

export interface StatCardSkeletonProps {
  className?: string;
}

export function StatCardSkeleton({ className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-card p-5 animate-pulse",
        className
      )}
    >
      <div className="h-4 w-24 bg-muted rounded mb-4" />
      <div className="h-10 w-20 bg-muted rounded mb-3" />
      <div className="h-4 w-16 bg-muted rounded" />
    </div>
  );
}
