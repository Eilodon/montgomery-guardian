"use client";

import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AlertsSidebarProps, Alert } from "./types";

const severityConfig: Record<Alert["severity"], { variant: "critical" | "high" | "medium" | "low" }> = {
  critical: { variant: "critical" },
  high: { variant: "high" },
  medium: { variant: "medium" },
  low: { variant: "low" },
};

export function AlertsSidebar({ alerts, isOpen, onToggle }: AlertsSidebarProps) {
  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-4 z-30 transition-all duration-300 bg-slate-800 hover:bg-slate-700 border border-slate-600",
          isOpen ? "left-[308px]" : "left-4"
        )}
        aria-label={isOpen ? "Close alerts sidebar" : "Open alerts sidebar"}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>

      {/* Sidebar Panel */}
      <div
        className={cn(
          "absolute top-0 left-0 z-20 h-full w-[300px] bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h2 className="text-lg font-semibold text-slate-100">Live Alerts</h2>
          <Badge variant="secondary" className="ml-auto">
            {alerts.length}
          </Badge>
        </div>

        {/* Scrollable Alert List */}
        <ScrollArea className="h-[calc(100%-60px-65px)]">
          <div className="p-4 space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No active alerts
              </div>
            ) : (
              alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}

function AlertCard({ alert }: { alert: Alert }) {
  const config = severityConfig[alert.severity];
  
  return (
    <div className="rounded-lg bg-slate-800/80 border border-slate-700 p-3 hover:bg-slate-800 transition-colors cursor-pointer">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-slate-100 line-clamp-1">
          {alert.title}
        </h3>
        <Badge variant={config.variant} className="shrink-0 text-xs">
          {alert.severity}
        </Badge>
      </div>
      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
        {alert.description}
      </p>
      <span className="text-xs text-slate-500">{alert.timestamp}</span>
    </div>
  );
}
