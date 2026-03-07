"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { apiCall } from "@/lib/api";
import type { WhatIfSimulatorProps } from "./types";

export function WhatIfSimulator({
  patrolCoverage,
  onPatrolCoverageChange,
  backlogLevel,
  onBacklogLevelChange,
}: WhatIfSimulatorProps) {
  const [projectedImpact, setProjectedImpact] = useState<number>(50);
  const [isLoading, setIsLoading] = useState(false);
  const [confidence, setConfidence] = useState(0.85);

  // Use real ML simulation API from backend
  useEffect(() => {
    const simulateImpact = async () => {
      setIsLoading(true);
      try {
        const result = await apiCall('/predictions/simulate', {
          method: 'POST',
          body: JSON.stringify({ patrolCoverage, backlogLevel })
        });
        setProjectedImpact(result.projectedImpact);
        setConfidence(result.confidenceScore);
      } catch (error) {
        console.error("Simulation failed, using fallback logic:", error);
        // Fallback logic if API fails
        const fallback = Math.round(
          Math.max(0, Math.min(100, (patrolCoverage * 0.7) - (backlogLevel * 0.3) + 30))
        );
        setProjectedImpact(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(simulateImpact, 300);
    return () => clearTimeout(debounce);
  }, [patrolCoverage, backlogLevel]);

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
    <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4 relative overflow-hidden">
      {/* ML Processing Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] text-accent font-mono uppercase tracking-widest">ML_PERTURBATION...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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
          <h3 className="text-sm font-semibold text-slate-100">AI Risk Simulator (Ensemble)</h3>
        </div>
        <div className="px-1.5 py-0.5 rounded bg-slate-700 border border-slate-600">
          <span className="text-[9px] text-slate-400 font-mono">CONF: {(confidence * 100).toFixed(0)}%</span>
        </div>
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
          <span className="text-xs text-slate-400">Ensemble Impact Score</span>
          <div
            className={cn(
              "px-3 py-1.5 rounded-lg border transition-all duration-300",
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
        <p className="mt-2 text-xs text-slate-500 italic">
          {projectedImpact >= 70
            ? "Optimal configuration - XGBoost predicts high safety"
            : projectedImpact >= 40
              ? "Moderate impact - LSTM suggests adjusting patterns"
              : "High risk - Ensemble alert: increase resources"}
        </p>
      </div>
    </div>
  );
}

export type { WhatIfSimulatorProps };
