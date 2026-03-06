"use client";

import React, { useState } from "react";
import { MapboxMap } from "./mapbox-map";
import { Layers, Map, Eye, EyeOff, AlertTriangle, Wrench } from "lucide-react";

type MapView = "crime" | "311" | "unified";

// Simple ToggleGroup component since we don't have the dependency
function ToggleGroup({ children, value, onValueChange, className = "" }: {
  children: React.ReactNode;
  value: MapView;
  onValueChange: (value: MapView) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex bg-slate-100 rounded-lg p-1 ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            isActive: (child.props as any).value === value,
            onClick: () => onValueChange((child.props as any).value),
          });
        }
        return child;
      })}
    </div>
  );
}

function ToggleGroupItem({
  value,
  isActive,
  onClick,
  children,
  className = ""
}: {
  value: MapView;
  isActive?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      value={value}
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${isActive
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
        } ${className}`}
    >
      {children}
    </button>
  );
}

interface UnifiedMapProps {
  crimeData?: any[];
  requests311?: any[];
}

export function UnifiedMap({ crimeData = [], requests311 = [] }: UnifiedMapProps) {
  const [activeView, setActiveView] = useState<MapView>("unified");
  const [showCrime, setShowCrime] = useState(true);
  const [show311, setShow311] = useState(true);

  return (
    <div className="relative w-full h-full">
      {/* Map Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-2">
          {/* View Toggle */}
          <ToggleGroup
            value={activeView}
            onValueChange={setActiveView}
            className="mb-2"
          >
            <ToggleGroupItem value="crime">
              Crime
            </ToggleGroupItem>
            <ToggleGroupItem value="311">
              311
            </ToggleGroupItem>
            <ToggleGroupItem value="unified">
              Unified
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Layer Controls for Unified View */}
          {activeView === "unified" && (
            <div className="flex gap-2 border-t border-slate-700 pt-2">
              <button
                onClick={() => setShowCrime(!showCrime)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${showCrime
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "bg-slate-700 text-slate-400 border border-slate-600"
                  }`}
                title={showCrime ? "Hide Crime Layer" : "Show Crime Layer"}
              >
                {showCrime ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Crime
              </button>
              <button
                onClick={() => setShow311(!show311)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${show311
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-slate-700 text-slate-400 border border-slate-600"
                  }`}
                title={show311 ? "Hide 311 Layer" : "Show 311 Layer"}
              >
                {show311 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                311
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Content */}
      <div className="w-full h-full">
        <MapboxMap
          crimeData={crimeData}
          requests311={requests311}
          showHeatmap={activeView === "crime" || (activeView === "unified" && showCrime)}
          show311Points={activeView === "311" || (activeView === "unified" && show311)}
          className="w-full h-full"
        />
      </div>

      {/* Crime Statistics Overlay (Conditional) */}
      {(activeView === "crime" || (activeView === "unified" && showCrime)) && crimeData.length > 0 && (
        <div className="absolute top-20 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 max-w-[180px] z-10 hidden md:block">
          <h3 className="text-[10px] font-semibold text-slate-100 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Crime Stats
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Total</span>
              <span className="text-slate-100">{crimeData.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* 311 Statistics Overlay (Conditional) */}
      {(activeView === "311" || (activeView === "unified" && show311)) && requests311.length > 0 && (
        <div className="absolute top-20 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 max-w-[180px] z-10 hidden md:block">
          <h3 className="text-[10px] font-semibold text-slate-100 mb-2 flex items-center gap-1">
            <Wrench className="w-3 h-3 text-blue-400" />
            311 Requests
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Active</span>
              <span className="text-slate-100">{requests311.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-100 mb-2 flex items-center gap-2">
          <Map className="w-3 h-3" />
          Map Legend
        </h4>

        {activeView === "crime" && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-slate-300">Critical Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-slate-300">High Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-300">Medium Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs text-slate-300">Low Risk</span>
            </div>
          </div>
        )}

        {activeView === "311" && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs">🚧</span>
              <span className="text-xs text-slate-300">Pothole</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🎨</span>
              <span className="text-xs text-slate-300">Graffiti</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🗑️</span>
              <span className="text-xs text-slate-300">Trash</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">💧</span>
              <span className="text-xs text-slate-300">Flooding</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">🌿</span>
              <span className="text-xs text-slate-300">Vegetation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">📋</span>
              <span className="text-xs text-slate-300">Other</span>
            </div>
          </div>
        )}

        {activeView === "unified" && (
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-slate-300">Crime Risk</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-300">311 Services</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs">🚧</span>
                <span className="text-xs">🎨</span>
                <span className="text-xs">🗑️</span>
                <span className="text-xs">💧</span>
                <span className="text-xs">🌿</span>
                <span className="text-xs">📋</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Information */}
      <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3 max-w-xs">
        <h4 className="text-xs font-semibold text-slate-100 mb-1">Current View</h4>
        <p className="text-xs text-slate-300 capitalize">
          {activeView === "unified" && showCrime && show311 && "Unified: Crime + 311"}
          {activeView === "unified" && showCrime && !show311 && "Crime Only"}
          {activeView === "unified" && !showCrime && show311 && "311 Only"}
          {activeView === "unified" && !showCrime && !show311 && "No Layers"}
          {activeView === "crime" && "Crime Heatmap"}
          {activeView === "311" && "311 Service Requests"}
        </p>
      </div>
    </div>
  );
}
