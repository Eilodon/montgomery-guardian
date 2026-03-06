"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GradeBadge } from "./grade-badge";
import { TrendIndicator } from "./trend-indicator";
import type { ScorecardCardProps } from "./types";

export function ScorecardCard({ district }: ScorecardCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-slate-700 bg-slate-800 p-4",
        "hover:border-slate-600 transition-colors"
      )}
      aria-label={`${district.name} safety scorecard`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-slate-100 text-base">
          {district.name}
        </h3>
        <GradeBadge grade={district.grade} />
      </div>

      {/* Stats Grid */}
      <dl className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <dt className="text-xs text-slate-500 uppercase tracking-wide">
            Crime Index
          </dt>
          <dd className="text-lg font-semibold text-slate-200 tabular-nums">
            {district.crimeIndex.toFixed(1)}
          </dd>
        </div>
        
        <div className="space-y-1">
          <dt className="text-xs text-slate-500 uppercase tracking-wide">
            311 Backlog
          </dt>
          <dd className="text-lg font-semibold text-slate-200 tabular-nums">
            {district.backlog311}
          </dd>
        </div>
        
        <div className="space-y-1">
          <dt className="text-xs text-slate-500 uppercase tracking-wide">
            Trend
          </dt>
          <dd className="text-lg font-semibold">
            <TrendIndicator value={district.trend} className="text-base" />
          </dd>
        </div>
      </dl>
    </article>
  );
}

interface ScorecardCardListProps {
  districts: DistrictData[];
}

import type { DistrictData } from "./types";

export function ScorecardCardList({ districts }: ScorecardCardListProps) {
  if (districts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No neighborhoods found matching your search.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {districts.map((district) => (
        <ScorecardCard key={district.id} district={district} />
      ))}
    </div>
  );
}
