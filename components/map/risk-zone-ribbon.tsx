"use client";

import { useState, useEffect } from "react";
import type { RiskZoneRibbonProps, RiskZone } from "./types";

const zoneConfig: Record<RiskZone["level"], { label: string; color: string; bgColor: string; borderColor: string }> = {
  critical: { label: "Critical", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500" },
  high: { label: "High", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500" },
  medium: { label: "Medium", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500" },
  low: { label: "Low", color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500" },
};

export function RiskZoneRibbon({ zones }: RiskZoneRibbonProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick only for "last updated" display UX
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate total for percentage
  const totalZones = zones.reduce((sum, zone) => sum + zone.count, 0);
  const maxZoneCount = Math.max(...zones.map(z => z.count));

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-[60px] bg-slate-900/95 backdrop-blur-sm border-t border-slate-700">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-300">
            Tomorrow's Risk Zones
          </span>
          <span className="text-xs text-slate-500">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {zones.map((zone) => {
            const config = zoneConfig[zone.level];
            const percentage = totalZones > 0 ? (zone.count / totalZones) * 100 : 0;
            const isHighest = zone.count === maxZoneCount;

            return (
              <div
                key={zone.level}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-500 ${config.bgColor
                  } ${config.borderColor
                  } ${isHighest ? 'ring-2 ring-offset-0 ring-offset-slate-900' : ''
                  }`}
              >
                <div className="flex flex-col items-center">
                  <span className={`text-xs font-bold ${config.color}`}>
                    {config.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-100">
                      {zone.count}
                    </span>
                    <span className="text-xs text-slate-400">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Animated indicator for highest risk */}
                {isHighest && (
                  <div className="relative">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Risk Level Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Overall Risk:</span>
          <div className="flex items-center gap-1">
            {zones.map((zone, index) => {
              const config = zoneConfig[zone.level];
              const width = zone.count > 0 ? `${(zone.count / totalZones) * 100}%` : '0%';

              return (
                <div
                  key={zone.level}
                  className={`h-2 rounded-full transition-all duration-500 ${config.bgColor}`}
                  style={{ width }}
                  title={`${config.label}: ${zone.count} zones`}
                  aria-hidden="true"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover Details */}
      <div className="absolute bottom-full left-0 right-0 bg-slate-800 border border-slate-600 rounded-t-lg p-3 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="text-xs text-slate-300 mb-2">Risk Distribution Details:</div>
        <div className="grid grid-cols-4 gap-4 text-xs">
          {zones.map((zone) => {
            const config = zoneConfig[zone.level];
            return (
              <div key={zone.level} className="flex flex-col items-center">
                <span className={`font-medium ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-slate-300">{zone.count}</span>
                <span className="text-slate-500">
                  {totalZones > 0 ? ((zone.count / totalZones) * 100).toFixed(1) : 0}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-slate-400 mt-2 text-center">
          Total: {totalZones} risk zones identified
        </div>
      </div>
    </div>
  );
}
