"use client";

import { cn } from "@/lib/utils";
import type { Open311RequestsData, StatCardBaseProps } from "./types";
import { StatCardSkeleton } from "./stat-card-skeleton";

export interface Open311CardProps extends StatCardBaseProps {
  data: Open311RequestsData;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
      {category}
    </span>
  );
}

export function Open311Card({ title, data, isLoading }: Open311CardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="rounded-xl bg-card p-5 flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className={cn("text-4xl font-bold text-card-foreground mb-3")}>
        {data.count.toLocaleString()}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Top:</span>
        <CategoryBadge category={data.topCategory} />
      </div>
    </div>
  );
}
