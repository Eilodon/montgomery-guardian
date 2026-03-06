"use client";

import { useState } from "react";
import {
  KPIDashboardGrid,
  type KPIDashboardData,
} from "@/components/dashboard";
import { MapContainer } from "@/components/map";
import { AlertFeed, type AlertItem } from "@/components/alerts";
import { SplitViewAnalytics } from "@/components/analytics";
import { SafetyScorecard, type DistrictData } from "@/components/scorecard";

// Sample district data for neighborhood scorecard
const sampleDistricts: DistrictData[] = [
  { id: "1", name: "Downtown", grade: "B", crimeIndex: 3.2, backlog311: 45, trend: 8 },
  { id: "2", name: "Bethesda", grade: "A", crimeIndex: 1.5, backlog311: 12, trend: -5 },
  { id: "3", name: "Silver Spring", grade: "C", crimeIndex: 4.8, backlog311: 67, trend: 12 },
  { id: "4", name: "Wheaton", grade: "C", crimeIndex: 4.2, backlog311: 54, trend: 3 },
  { id: "5", name: "Rockville", grade: "B", crimeIndex: 2.8, backlog311: 38, trend: -2 },
  { id: "6", name: "Gaithersburg", grade: "B", crimeIndex: 3.0, backlog311: 41, trend: 0 },
  { id: "7", name: "Germantown", grade: "A", crimeIndex: 1.8, backlog311: 18, trend: -8 },
  { id: "8", name: "Takoma Park", grade: "C", crimeIndex: 4.5, backlog311: 62, trend: 15 },
  { id: "9", name: "Chevy Chase", grade: "A", crimeIndex: 1.2, backlog311: 8, trend: -3 },
  { id: "10", name: "Olney", grade: "B", crimeIndex: 2.5, backlog311: 28, trend: -1 },
  { id: "11", name: "Aspen Hill", grade: "D", crimeIndex: 5.8, backlog311: 89, trend: 18 },
  { id: "12", name: "White Oak", grade: "C", crimeIndex: 4.0, backlog311: 52, trend: 6 },
  { id: "13", name: "Potomac", grade: "A", crimeIndex: 1.0, backlog311: 5, trend: -4 },
  { id: "14", name: "Kensington", grade: "B", crimeIndex: 2.9, backlog311: 35, trend: 2 },
  { id: "15", name: "Burtonsville", grade: "C", crimeIndex: 4.3, backlog311: 58, trend: 9 },
  { id: "16", name: "Clarksburg", grade: "B", crimeIndex: 2.2, backlog311: 22, trend: -6 },
  { id: "17", name: "Damascus", grade: "A", crimeIndex: 1.4, backlog311: 10, trend: -2 },
  { id: "18", name: "Poolesville", grade: "A", crimeIndex: 0.8, backlog311: 4, trend: 0 },
  { id: "19", name: "Laytonsville", grade: "B", crimeIndex: 2.0, backlog311: 15, trend: 1 },
  { id: "20", name: "Colesville", grade: "D", crimeIndex: 5.5, backlog311: 78, trend: 14 },
  { id: "21", name: "Fairland", grade: "C", crimeIndex: 4.6, backlog311: 64, trend: 7 },
  { id: "22", name: "Langley Park", grade: "F", crimeIndex: 7.2, backlog311: 112, trend: 22 },
  { id: "23", name: "Leisure World", grade: "A", crimeIndex: 0.9, backlog311: 6, trend: -1 },
  { id: "24", name: "Montgomery Village", grade: "C", crimeIndex: 4.1, backlog311: 55, trend: 4 },
];

// Sample alerts data for demonstration
const sampleAlerts: AlertItem[] = [
  {
    id: "1",
    title: "Structure Fire Reported",
    summary: "Active fire reported at 425 Main Street. Fire department dispatched. Nearby residents advised to avoid the area.",
    severity: "critical",
    source: "Fire Department",
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
  },
  {
    id: "2",
    title: "Traffic Collision - Multiple Vehicles",
    summary: "Multi-vehicle accident on Highway 270 near Exit 15. Emergency services on scene. Expect delays.",
    severity: "high",
    source: "Traffic Control",
    timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 min ago
  },
  {
    id: "3",
    title: "Water Main Break",
    summary: "Water main break reported on Oak Avenue. Crews dispatched for repair. Low water pressure expected in the area.",
    severity: "medium",
    source: "Public Works",
    timestamp: new Date(Date.now() - 25 * 60 * 1000), // 25 min ago
  },
  {
    id: "4",
    title: "Park Closure Notice",
    summary: "Montgomery Park closed for scheduled maintenance. Expected to reopen tomorrow at 8 AM.",
    severity: "low",
    source: "Parks & Recreation",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: "5",
    title: "Power Outage - Downtown District",
    summary: "Approximately 500 customers affected by power outage in downtown area. Crews investigating cause.",
    severity: "high",
    source: "Power Company",
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 min ago
  },
];

// Sample KPI data for demonstration
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

export default function DemoPage() {
  const [activeView, setActiveView] = useState<"dashboard" | "map" | "analytics" | "scorecard">("map");
  const [isLoading, setIsLoading] = useState(false);

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar - 64px */}
      <header className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-100">
            Montgomery Guardian
          </h1>
          <span className="text-sm text-slate-400 hidden sm:inline">
            City Safety Platform
          </span>
        </div>
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("map")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "map"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setActiveView("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "dashboard"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "analytics"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveView("scorecard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === "scorecard"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            }`}
          >
            Scorecard
          </button>
          <button
            onClick={simulateLoading}
            className="ml-4 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors border border-slate-600"
          >
            Simulate Load
          </button>
        </nav>
      </header>

      {/* Main Content */}
      {activeView === "scorecard" ? (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <SafetyScorecard districts={sampleDistricts} />
          </section>
        </main>
      ) : activeView === "analytics" ? (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Predictive Analytics
            </h2>
            <SplitViewAnalytics />
          </section>
        </main>
      ) : activeView === "map" ? (
        <MapContainer>
          {/* Placeholder map content - grid pattern */}
          <div className="w-full h-full relative">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(51, 65, 85, 0.3) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-slate-900/80 backdrop-blur-sm rounded-xl p-8 border border-slate-700 max-w-md">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-10 h-10 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  Interactive Map Area
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  This is where your map component (Mapbox, Leaflet, etc.) would be rendered.
                  The container supports full-height layout with overlay panels.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300">
                    Collapsible Sidebars
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300">
                    Layer Controls
                  </span>
                  <span className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300">
                    Risk Ribbon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </MapContainer>
      ) : (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              KPI Overview
            </h2>
            <KPIDashboardGrid data={sampleData} isLoading={isLoading} />
          </section>

          {/* Alert Feed Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Live Alerts
                </h2>
                <span className="text-sm text-slate-400">
                  {sampleAlerts.length} active
                </span>
              </div>
              <AlertFeed alerts={sampleAlerts} isLoading={isLoading} />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Alert States Demo
                </h2>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Loading State:</h3>
                  <div className="border border-slate-700 rounded-lg p-3">
                    <AlertFeed alerts={[]} isLoading={true} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Empty State:</h3>
                  <div className="border border-slate-700 rounded-lg p-3">
                    <AlertFeed alerts={[]} isLoading={false} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
