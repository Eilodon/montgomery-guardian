"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertItemCard } from "./alert-item-card";
import { AlertSkeleton } from "./alert-skeleton";
import type { AlertFeedProps } from "./types";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
function isAlertNew(timestamp: string): boolean {
  return new Date(timestamp).getTime() > Date.now() - FIVE_MINUTES_MS;
}

export function AlertFeed({ alerts, isLoading }: AlertFeedProps) {

  // Loading state
  if (isLoading) {
    return (
      <div className="max-h-[400px] overflow-y-auto">
        <AlertSkeleton count={3} />
      </div>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <div className="max-h-[400px] flex items-center justify-center py-12">
        <p className="text-slate-400 text-center">
          {"No alerts — all clear 🟢"}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-3 p-1">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="animate-slide-in-top"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <AlertItemCard alert={alert} isNew={isAlertNew(alert.timestamp)} />
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
