"use client";

import { Badge } from "@/components/ui/badge";
import type { RiskZoneRibbonProps, RiskZone } from "./types";

const zoneConfig: Record<RiskZone["level"], { label: string; variant: "critical" | "high" | "medium" | "low" }> = {
  critical: { label: "Critical", variant: "critical" },
  high: { label: "High", variant: "high" },
  medium: { label: "Medium", variant: "medium" },
  low: { label: "Low", variant: "low" },
};

export function RiskZoneRibbon({ zones }: RiskZoneRibbonProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-[60px] bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
      <div className="flex items-center justify-between h-full px-6">
        <span className="text-sm font-medium text-slate-300">
          {"Tomorrow's Risk Zones"}
        </span>
        <div className="flex items-center gap-4">
          {zones.map((zone) => {
            const config = zoneConfig[zone.level];
            return (
              <div key={zone.level} className="flex items-center gap-2">
                <Badge variant={config.variant} className="font-semibold">
                  {config.label}
                </Badge>
                <span className="text-sm font-medium text-slate-100">
                  {zone.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
