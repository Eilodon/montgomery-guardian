"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResponseTimeData, StatCardBaseProps } from "./types";
import { StatCardSkeleton } from "./stat-card-skeleton";

export interface ResponseTimeCardProps extends StatCardBaseProps {
  data: ResponseTimeData;
}

function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function TrendBadge({ direction, percentage }: { direction: "up" | "down" | "neutral"; percentage?: number }) {
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  
  // For response time: up is bad (danger), down is good (success)
  const colorClass = direction === "up" 
    ? "bg-danger/15 text-danger border-danger/30" 
    : direction === "down" 
    ? "bg-success/15 text-success border-success/30" 
    : "bg-muted text-muted-foreground border-muted";
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
      colorClass
    )}>
      <Icon className="h-3 w-3" />
      {percentage !== undefined && <span>{percentage}%</span>}
    </span>
  );
}

export function ResponseTimeCard({ title, data, isLoading }: ResponseTimeCardProps) {
  if (isLoading) {
    return <StatCardSkeleton />;
  }

  return (
    <div className="rounded-xl bg-card p-5 flex flex-col">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        {title}
      </h3>
      <p className={cn("text-4xl font-bold text-card-foreground mb-3")}>
        {formatTime(data.minutes)}
      </p>
      <div className="flex items-center gap-2">
        <TrendBadge 
          direction={data.trend.direction} 
          percentage={data.trend.percentage} 
        />
        <span className="text-sm text-muted-foreground">vs yesterday</span>
      </div>
    </div>
  );
}
