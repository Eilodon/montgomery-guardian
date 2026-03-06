"use client";

import { ChevronRight, ChevronLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AnalyticsPanelProps } from "./types";

export function AnalyticsPanel({ children, isOpen, onToggle }: AnalyticsPanelProps) {
  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-4 z-30 transition-all duration-300 bg-slate-800 hover:bg-slate-700 border border-slate-600",
          isOpen ? "right-[288px]" : "right-4"
        )}
        aria-label={isOpen ? "Close analytics panel" : "Open analytics panel"}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Panel */}
      <div
        className={cn(
          "absolute top-0 right-0 z-20 h-full w-[280px] bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-slate-100">Analytics</h2>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="h-[calc(100%-60px-65px)]">
          <div className="p-4">
            {children || (
              <div className="space-y-4">
                {/* Placeholder content */}
                <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Incident Trends
                  </h3>
                  <div className="h-24 rounded bg-slate-700/50 flex items-center justify-center">
                    <span className="text-xs text-slate-500">Chart placeholder</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Response Metrics
                  </h3>
                  <div className="h-24 rounded bg-slate-700/50 flex items-center justify-center">
                    <span className="text-xs text-slate-500">Metrics placeholder</span>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/60 border border-slate-700 p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Zone Distribution
                  </h3>
                  <div className="h-24 rounded bg-slate-700/50 flex items-center justify-center">
                    <span className="text-xs text-slate-500">Distribution placeholder</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
