"use client";

import { useState } from "react";
import {
  KPIDashboardGrid,
  type KPIDashboardData,
} from "@/components/dashboard";
import { MapContainer, UnifiedMap } from "@/components/map";
import { AlertFeed, type AlertItem } from "@/components/alerts";
import { SplitViewAnalytics, SHAPFeatureImportance } from "@/components/analytics";
import { SafetyScorecard, type DistrictData } from "@/components/scorecard";
import {
  useKPIData,
  useLiveAlerts,
  useDistricts,
  usePredictions,
  useHeatmapData,
  useActive311Requests,
  sendChatMessage,
  analyzeImage,
  useSHAPExplainability,
  type ChatMessage,
  type VisionAnalysisResult
} from "@/lib/api";

export default function DemoPage() {
  const [activeView, setActiveView] = useState<"dashboard" | "map" | "analytics" | "scorecard">("map");

  // Use SWR hooks to fetch real data
  const { kpiData, isLoading: kpiLoading } = useKPIData();
  const { alerts, isLoading: alertsLoading } = useLiveAlerts();
  const { districts, isLoading: districtsLoading } = useDistricts();
  const { predictions, isLoading: predictionsLoading } = usePredictions();
  const { heatmapData, isLoading: heatmapLoading } = useHeatmapData();
  const { requests: active311Requests, isLoading: requestsLoading } = useActive311Requests();
  const { shapData, isLoading: shapLoading } = useSHAPExplainability();

  const isLoading = kpiLoading || alertsLoading || districtsLoading || predictionsLoading || heatmapLoading || requestsLoading || shapLoading;

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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "map"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
          >
            Map View
          </button>
          <button
            onClick={() => setActiveView("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "dashboard"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("analytics")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "analytics"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveView("scorecard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeView === "scorecard"
                ? "bg-accent text-slate-100"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
          >
            Scorecard
          </button>
        </nav>
      </header>

      {/* Main Content */}
      {activeView === "scorecard" ? (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <SafetyScorecard districts={districts} />
          </section>
        </main>
      ) : activeView === "analytics" ? (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Predictive Analytics
            </h2>
            <SHAPFeatureImportance />
          </section>
        </main>
      ) : activeView === "map" ? (
        <MapContainer>
          <UnifiedMap />
        </MapContainer>
      ) : (
        <main className="flex-1 p-6 lg:p-10 overflow-auto">
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              KPI Overview
            </h2>
            <KPIDashboardGrid data={kpiData} isLoading={kpiLoading} />
          </section>

          {/* Alert Feed Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Live Alerts
                </h2>
                <span className="text-sm text-slate-400">
                  {alerts.length} active
                </span>
              </div>
              <AlertFeed alerts={alerts} isLoading={alertsLoading} />
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
