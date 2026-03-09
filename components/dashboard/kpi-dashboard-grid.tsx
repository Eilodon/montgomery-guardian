"use client";

import { cn } from "@/lib/utils";
import type { 
  IncidentsTodayData, 
  Calls911Data, 
  Open311RequestsData, 
  ResponseTimeData 
} from "./types";
import { IncidentsTodayCard } from "./incidents-today-card";
import { Calls911Card } from "./calls-911-card";
import { Open311Card } from "./open-311-card";
import { ResponseTimeCard } from "./response-time-card";

export interface KPIDashboardData {
  incidentsToday: IncidentsTodayData;
  calls911: Calls911Data;
  open311Requests: Open311RequestsData;
  avgResponseTime: ResponseTimeData;
}

export interface KPIDashboardGridProps {
  data?: KPIDashboardData;
  isLoading?: boolean;
  className?: string;
}

export function KPIDashboardGrid({ data, isLoading = false, className }: KPIDashboardGridProps) {
  const loading = isLoading || !data;

  return (
    <section className={cn("w-full", className)}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <IncidentsTodayCard
          title="Incidents Today"
          data={data?.incidentsToday ?? { count: 0, trend: { direction: "neutral" } }}
          isLoading={loading}
        />
        <Calls911Card
          title="911 Calls (24h)"
          data={data?.calls911 ?? { count: 0, sparklineData: [] }}
          isLoading={loading}
        />
        <Open311Card
          title="Open 311 Requests"
          data={data?.open311Requests ?? { count: 0, topCategory: "" }}
          isLoading={loading}
        />
        <ResponseTimeCard
          title="Avg Response Time"
          data={data?.avgResponseTime ?? { minutes: 0, trend: { direction: "neutral" } }}
          isLoading={loading}
        />
      </div>
    </section>
  );
}
