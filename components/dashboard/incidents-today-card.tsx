"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncidentsTodayData, StatCardBaseProps } from "./types";
import { StatCardSkeleton } from "./stat-card-skeleton";

export interface IncidentsTodayCardProps extends StatCardBaseProps {
  data: IncidentsTodayData;
}

function getCountColor(count: number): string {
  if (count > 50) return "text-danger";
  if (count < 20) return "text-success";
  return "text-warning";
}

function TrendIndicator({ direction, percentage }: { direction: "up" | "down" | "neutral"; percentage?: number }) {
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const colorClass = direction === "up" ? "text-danger" : direction === "down" ? "text-success" : "text-muted-foreground";
  
  return (
    <div className={cn("flex items-center gap-1 text-sm", colorClass)}>
      <Icon className="h-4 w-4" />
      {percentage !== undefined && (
        <span>{percentage}%</span>
      )}
      <span className="text-muted-foreground ml-1">vs yesterday</span>
    </div>
  );
}

export function IncidentsTodayCard({ title, data, isLoading }: IncidentsTodayCardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="rounded-xl bg-card p-5 flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className={cn("text-4xl font-bold mb-3", getCountColor(data.count))}>
        {data.count}
      </p>
      <TrendIndicator 
        direction={data.trend.direction} 
        percentage={data.trend.percentage} 
      />
    </div>
  );
}
