"use client";

import { cn } from "@/lib/utils";
import type { FeatureImportanceChartProps, FeatureImportanceItem } from "./types";

// Default feature importance data
const defaultFeatures: FeatureImportanceItem[] = [
  { name: "Weekend", value: 0.85, color: "#EF4444" },
  { name: "Temperature", value: 0.72, color: "#F59E0B" },
  { name: "311 Backlog", value: 0.65, color: "#3B82F6" },
  { name: "Hour of Day", value: 0.58, color: "#22C55E" },
  { name: "Neighborhood History", value: 0.91, color: "#8B5CF6" },
];

export function FeatureImportanceChart({
  features = defaultFeatures,
  title = "Why is this area HIGH risk?",
}: FeatureImportanceChartProps) {
  // Sort features by value descending for better visualization
  const sortedFeatures = [...features].sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
      {/* Chart Header */}
      <h3 className="text-sm font-semibold text-slate-100 mb-4">{title}</h3>

      {/* Horizontal Bar Chart */}
      <div
        className="space-y-3"
        role="img"
        aria-label="Feature importance horizontal bar chart"
      >
        {sortedFeatures.map((feature, index) => (
          <div key={feature.name} className="flex items-center gap-3">
            {/* Feature Label */}
            <div className="w-36 shrink-0">
              <span className="text-xs text-slate-300 truncate block">
                {feature.name}
              </span>
            </div>

            {/* Bar Container */}
            <div className="flex-1 h-5 bg-slate-700 rounded overflow-hidden relative">
              {/* Bar Fill */}
              <div
                className="h-full rounded transition-all duration-500 ease-out"
                style={{
                  width: `${feature.value * 100}%`,
                  backgroundColor: feature.color,
                  animationDelay: `${index * 100}ms`,
                }}
                role="progressbar"
                aria-valuenow={feature.value * 100}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${feature.name}: ${(feature.value * 100).toFixed(0)}%`}
              />
            </div>

            {/* Value Label */}
            <div className="w-10 shrink-0 text-right">
              <span className="text-xs font-medium text-slate-300">
                {feature.value.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scale Reference */}
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span>0</span>
        <span>0.5</span>
        <span>1</span>
      </div>
    </div>
  );
}

export type { FeatureImportanceChartProps };
