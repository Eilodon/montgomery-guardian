"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
// Giữ lại các hook API, nhưng tách view

// THỢ RÈN: Chunking các heavy components. SSR = false cho những thứ cần Browser API (Window)
const MapContainer = dynamic(() => import("@/components/map").then(mod => mod.MapContainer), { ssr: false, loading: () => <div className="animate-pulse bg-slate-800 h-full w-full rounded-xl"/> });
const UnifiedMap = dynamic(() => import("@/components/map").then(mod => mod.UnifiedMap), { ssr: false });
const SafetyScorecard = dynamic(() => import("@/components/scorecard").then(mod => mod.SafetyScorecard), { ssr: false });
const SHAPFeatureImportance = dynamic(() => import("@/components/analytics").then(mod => mod.SHAPFeatureImportance), { ssr: false });
const KPIDashboardGrid = dynamic(() => import("@/components/dashboard").then(mod => mod.KPIDashboardGrid));
const AlertFeed = dynamic(() => import("@/components/alerts").then(mod => mod.AlertFeed));

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

  // Use SWR hooks to fetch real data only when view is active
  const { kpiData, isLoading: kpiLoading } = useKPIData(activeView === "dashboard");
  const { alerts, isLoading: alertsLoading } = useLiveAlerts(activeView === "dashboard");
  const { districts, isLoading: districtsLoading } = useDistricts(activeView === "scorecard");
  const { predictions, isLoading: predictionsLoading } = usePredictions(activeView === "map");
  const { heatmapData, isLoading: heatmapLoading } = useHeatmapData(activeView === "map");
  const { requests: active311Requests, isLoading: requestsLoading } = useActive311Requests(activeView === "map");
  const { shapData, isLoading: shapLoading } = useSHAPExplainability(activeView === "analytics");

  const isLoadingMap = predictionsLoading || heatmapLoading || requestsLoading;
  const isLoadingDashboard = kpiLoading || alertsLoading;
  const isLoadingAnalytics = shapLoading;
  const isLoadingScorecard = districtsLoading;

  const isLoading = {
    map: isLoadingMap,
    dashboard: isLoadingDashboard,
    analytics: isLoadingAnalytics,
    scorecard: isLoadingScorecard,
  }[activeView] ?? false;

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
