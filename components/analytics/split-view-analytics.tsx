"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MapPanel } from "./map-panel";
import { FeatureImportanceChart } from "./feature-importance-chart";
import { WhatIfSimulator } from "./what-if-simulator";
import type { SplitViewAnalyticsProps, FeatureImportanceItem } from "./types";

// Default feature importance data
const defaultFeatures: FeatureImportanceItem[] = [
  { name: "Weekend", value: 0.85, color: "#EF4444" },
  { name: "Temperature", value: 0.72, color: "#F59E0B" },
  { name: "311 Backlog", value: 0.65, color: "#3B82F6" },
  { name: "Hour of Day", value: 0.58, color: "#22C55E" },
  { name: "Neighborhood History", value: 0.91, color: "#8B5CF6" },
];

export function SplitViewAnalytics({
  historicalContent,
  predictedContent,
  features = defaultFeatures,
  className,
}: SplitViewAnalyticsProps) {
  // What-if simulator state
  const [patrolCoverage, setPatrolCoverage] = useState(50);
  const [backlogLevel, setBacklogLevel] = useState(30);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 bg-slate-900 rounded-xl",
        className
      )}
      role="region"
      aria-label="Split-view analytics dashboard"
    >
      {/* Split-View Map Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Historical Panel (Left) */}
        <MapPanel title="Historical (Last 30 Days)">
          {historicalContent}
        </MapPanel>

        {/* Predicted Panel (Right) */}
        <MapPanel title="Predicted (Next 24h)">
          {predictedContent}
        </MapPanel>
      </div>

      {/* Feature Importance Chart */}
      <FeatureImportanceChart
        features={features}
        title="Why is this area HIGH risk?"
      />

      {/* What-if Simulator */}
      <WhatIfSimulator
        patrolCoverage={patrolCoverage}
        onPatrolCoverageChange={setPatrolCoverage}
        backlogLevel={backlogLevel}
        onBacklogLevelChange={setBacklogLevel}
      />
    </div>
  );
}

export type { SplitViewAnalyticsProps };
