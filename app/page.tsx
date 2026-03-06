"use client";

import { useState } from "react";
import {
  KPIDashboardGrid,
  IncidentsTodayCard,
  Calls911Card,
  Open311Card,
  ResponseTimeCard,
  type KPIDashboardData,
} from "@/components/dashboard";

// Sample data for demonstration
const sampleData: KPIDashboardData = {
  incidentsToday: {
    count: 67,
    trend: { direction: "up", percentage: 12 },
  },
  calls911: {
    count: 1247,
    sparklineData: [180, 220, 195, 240, 210, 260, 245],
  },
  open311Requests: {
    count: 342,
    topCategory: "Pothole",
  },
  avgResponseTime: {
    minutes: 8,
    trend: { direction: "down", percentage: 15 },
  },
};

const lowIncidentsData: KPIDashboardData = {
  incidentsToday: {
    count: 14,
    trend: { direction: "down", percentage: 28 },
  },
  calls911: {
    count: 856,
    sparklineData: [150, 130, 145, 120, 135, 110, 105],
  },
  open311Requests: {
    count: 189,
    topCategory: "Graffiti",
  },
  avgResponseTime: {
    minutes: 6,
    trend: { direction: "down", percentage: 8 },
  },
};

const moderateIncidentsData: KPIDashboardData = {
  incidentsToday: {
    count: 35,
    trend: { direction: "neutral" },
  },
  calls911: {
    count: 1024,
    sparklineData: [200, 195, 205, 200, 198, 202, 200],
  },
  open311Requests: {
    count: 256,
    topCategory: "Trash",
  },
  avgResponseTime: {
    minutes: 72,
    trend: { direction: "up", percentage: 5 },
  },
};

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [dataSet, setDataSet] = useState<"high" | "low" | "moderate">("high");

  const currentData = 
    dataSet === "high" ? sampleData : 
    dataSet === "low" ? lowIncidentsData : 
    moderateIncidentsData;

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <main className="min-h-screen p-6 lg:p-10">
      <header className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-card-foreground mb-2 text-balance">
          Montgomery Guardian
        </h1>
        <p className="text-muted-foreground">
          City Safety Platform - KPI Dashboard
        </p>
      </header>

      {/* Controls for demo */}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <button
          onClick={simulateLoading}
          className="px-4 py-2 rounded-lg bg-accent text-card-foreground text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          Simulate Loading
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Data scenario:</span>
          <select
            value={dataSet}
            onChange={(e) => setDataSet(e.target.value as "high" | "low" | "moderate")}
            className="px-3 py-2 rounded-lg bg-card text-card-foreground text-sm border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="high">High Incidents (Red)</option>
            <option value="low">Low Incidents (Green)</option>
            <option value="moderate">Moderate (Amber)</option>
          </select>
        </div>
      </div>

      {/* Main KPI Grid Component */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-card-foreground mb-4">
          KPI Dashboard Grid
        </h2>
        <KPIDashboardGrid data={currentData} isLoading={isLoading} />
      </section>

      {/* Individual Card Examples */}
      <section>
        <h2 className="text-lg font-semibold text-card-foreground mb-4">
          Individual Card Components
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <IncidentsTodayCard
            title="Incidents Today"
            data={{ count: 67, trend: { direction: "up", percentage: 12 } }}
            isLoading={false}
          />
          <Calls911Card
            title="911 Calls (24h)"
            data={{ count: 1247, sparklineData: [180, 220, 195, 240, 210, 260, 245] }}
            isLoading={false}
          />
          <Open311Card
            title="Open 311 Requests"
            data={{ count: 342, topCategory: "Pothole" }}
            isLoading={false}
          />
          <ResponseTimeCard
            title="Avg Response Time"
            data={{ minutes: 8, trend: { direction: "down", percentage: 15 } }}
            isLoading={false}
          />
        </div>
      </section>
    </main>
  );
}
