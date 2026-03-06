"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { WhatIfSimulatorProps } from "./types";

export function WhatIfSimulator({
  patrolCoverage,
  onPatrolCoverageChange,
  backlogLevel,
  onBacklogLevelChange,
}: WhatIfSimulatorProps) {
  // Calculate projected impact based on patrol coverage and backlog level
  // Higher patrol coverage = positive impact, higher backlog = negative impact
  // Formula: ((patrolCoverage * 0.7) - (backlogLevel * 0.3)) normalized to percentage
  const projectedImpact = Math.round(
    Math.max(0, Math.min(100, (patrolCoverage * 0.7) - (backlogLevel * 0.3) + 30))
  );

  // Determine impact color based on value
  const getImpactColor = (impact: number): string => {
    if (impact >= 70) return "text-success";
    if (impact >= 40) return "text-warning";
    return "text-danger";
  };

  const getImpactBgColor = (impact: number): string => {
    if (impact >= 70) return "bg-success/20 border-success/30";
    if (impact >= 40) return "bg-warning/20 border-warning/30";
    return "bg-danger/20 border-danger/30";
  };

  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center">
          <svg
            className="h-3 w-3 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-slate-100">What-if Simulator</h3>
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        {/* Patrol Coverage Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="patrol-coverage"
              className="text-xs font-medium text-slate-300"
            >
              Patrol Coverage %
            </label>
            <span className="text-xs font-semibold text-accent">
              {patrolCoverage}%
            </span>
          </div>
          <Slider
            id="patrol-coverage"
            value={[patrolCoverage]}
            onValueChange={(values) => onPatrolCoverageChange(values[0])}
            min={0}
            max={100}
            step={1}
            label="Patrol Coverage Percentage"
            className="w-full"
          />
        </div>

        {/* 311 Backlog Level Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="backlog-level"
              className="text-xs font-medium text-slate-300"
            >
              311 Backlog Level
            </label>
            <span className="text-xs font-semibold text-warning">
              {backlogLevel}%
            </span>
          </div>
          <Slider
            id="backlog-level"
            value={[backlogLevel]}
            onValueChange={(values) => onBacklogLevelChange(values[0])}
            min={0}
            max={100}
            step={1}
            label="311 Backlog Level"
            className="w-full"
          />
        </div>
      </div>

      {/* Projected Impact Display */}
      <div className="mt-5 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Projected Impact</span>
          <div
            className={cn(
              "px-3 py-1.5 rounded-lg border transition-colors",
              getImpactBgColor(projectedImpact)
            )}
          >
            <span
              className={cn(
                "text-lg font-bold tabular-nums",
                getImpactColor(projectedImpact)
              )}
            >
              {projectedImpact}%
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {projectedImpact >= 70
            ? "Optimal configuration - risk reduction likely"
            : projectedImpact >= 40
            ? "Moderate impact - consider adjustments"
            : "Low impact - increase patrol or reduce backlog"}
        </p>
      </div>
    </div>
  );
}

export type { WhatIfSimulatorProps };
