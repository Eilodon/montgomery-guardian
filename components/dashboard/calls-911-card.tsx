"use client";

import { cn } from "@/lib/utils";
import type { Calls911Data, StatCardBaseProps } from "./types";
import { StatCardSkeleton } from "./stat-card-skeleton";
import { SparklineChart } from "./sparkline-chart";

export interface Calls911CardProps extends StatCardBaseProps {
  data: Calls911Data;
}

export function Calls911Card({ title, data, isLoading }: Calls911CardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="rounded-xl bg-card p-5 flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="flex items-end justify-between gap-4">
        <p className={cn("text-4xl font-bold text-card-foreground")}>
          {data.count.toLocaleString()}
        </p>
        <div className="flex-1 max-w-[100px] h-10">
          <SparklineChart data={data.sparklineData} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        Last 7 days trend
      </p>
    </div>
  );
}
