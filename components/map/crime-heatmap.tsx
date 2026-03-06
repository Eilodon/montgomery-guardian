"use client";

import { useEffect, useState } from "react";
import { MapboxMap, addCrimeHeatmapLayer, useMapboxMap } from "./mapbox-map";
import { CrimeIncident } from "@/shared/types";
import { Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";

interface CrimeHeatmapProps {
  className?: string;
  onIncidentClick?: (incident: CrimeIncident) => void;
  timeRange?: "24h" | "7d" | "30d";
  filterRiskLevel?: "all" | "critical" | "high" | "medium" | "low";
}

// Mock crime data for demonstration
const mockCrimeData: CrimeIncident[] = [
  {
    id: "crime_1",
    type: "violent",
    latitude: 32.3617,
    longitude: -86.2792,
    neighborhood: "Downtown",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    status: "open",
    description: "Assault reported near downtown area",
  },
  {
    id: "crime_2",
    type: "property",
    latitude: 32.3800,
    longitude: -86.3000,
    neighborhood: "Capitol Heights",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    status: "investigating",
    description: "Vehicle break-in reported",
  },
  {
    id: "crime_3",
    type: "drug",
    latitude: 32.3400,
    longitude: -86.2600,
    neighborhood: "Oak Park",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    status: "closed",
    description: "Drug-related incident",
  },
  {
    id: "crime_4",
    type: "property",
    latitude: 32.3700,
    longitude: -86.2900,
    neighborhood: "Garden District",
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
    status: "open",
    description: "Burglary in residential area",
  },
  {
    id: "crime_5",
    type: "violent",
    latitude: 32.3500,
    longitude: -86.2800,
    neighborhood: "Bethesda",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    status: "investigating",
    description: "Robbery incident",
  },
  {
    id: "crime_6",
    type: "other",
    latitude: 32.3900,
    longitude: -86.3100,
    neighborhood: "Cloverdale",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    status: "open",
    description: "Suspicious activity reported",
  },
  {
    id: "crime_7",
    type: "property",
    latitude: 32.3300,
    longitude: -86.2500,
    neighborhood: "Highland Park",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    status: "closed",
    description: "Theft from vehicle",
  },
  {
    id: "crime_8",
    type: "drug",
    latitude: 32.4000,
    longitude: -86.3200,
    neighborhood: "Woodley Park",
    timestamp: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), // 15 hours ago
    status: "investigating",
    description: "Narcotics violation",
  },
];

// Generate more mock data for heatmap effect
const generateMoreMockData = (): CrimeIncident[] => {
  const additionalData: CrimeIncident[] = [];
  const neighborhoods = [
    "Downtown", "Capitol Heights", "Oak Park", "Garden District", 
    "Bethesda", "Cloverdale", "Highland Park", "Woodley Park"
  ];
  const types: CrimeIncident["type"][] = ["violent", "property", "drug", "other"];
  const statuses: CrimeIncident["status"][] = ["open", "closed", "investigating"];
  
  for (let i = 0; i < 50; i++) {
    additionalData.push({
      id: `crime_${i + 9}`,
      type: types[Math.floor(Math.random() * types.length)],
      latitude: 32.30 + Math.random() * 0.15,
      longitude: -86.35 + Math.random() * 0.15,
      neighborhood: neighborhoods[Math.floor(Math.random() * neighborhoods.length)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: `Incident ${i + 9} - ${types[Math.floor(Math.random() * types.length)]} case`,
    });
  }
  
  return additionalData;
};

export function CrimeHeatmap({ 
  className = "", 
  onIncidentClick,
  timeRange = "24h",
  filterRiskLevel = "all"
}: CrimeHeatmapProps) {
  const { map, setMap } = useMapboxMap();
  const [crimeData, setCrimeData] = useState<CrimeIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<CrimeIncident | null>(null);

  // Load crime data
  useEffect(() => {
    const loadCrimeData = async () => {
      setIsLoading(true);
      
      try {
        // Try to load real data from API
        const response = await fetch("/api/v1/crime?limit=100");
        
        if (response.ok) {
          const apiData = await response.json();
          const incidents = apiData.data || [];
          setCrimeData(incidents);
        } else {
          // Fallback to mock data
          const allMockData = [...mockCrimeData, ...generateMoreMockData()];
          setCrimeData(allMockData);
        }
      } catch (error) {
        console.error("Failed to load crime data:", error);
        // Fallback to mock data
        const allMockData = [...mockCrimeData, ...generateMoreMockData()];
        setCrimeData(allMockData);
      } finally {
        setIsLoading(false);
      }
    };

    loadCrimeData();
  }, [timeRange]);

  // Add heatmap layer to map when data is loaded
  useEffect(() => {
    if (map && crimeData.length > 0) {
      // Filter data based on time range and risk level
      const filteredData = crimeData.filter(incident => {
        const incidentTime = new Date(incident.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - incidentTime.getTime();
        
        // Time range filter
        let timeFilter = true;
        switch (timeRange) {
          case "24h":
            timeFilter = timeDiff <= 24 * 60 * 60 * 1000;
            break;
          case "7d":
            timeFilter = timeDiff <= 7 * 24 * 60 * 60 * 1000;
            break;
          case "30d":
            timeFilter = timeDiff <= 30 * 24 * 60 * 60 * 1000;
            break;
        }
        
        // Risk level filter (based on crime type)
        let riskFilter = true;
        if (filterRiskLevel !== "all") {
          const riskLevel = getRiskLevel(incident.type);
          riskFilter = riskLevel === filterRiskLevel;
        }
        
        return timeFilter && riskFilter;
      });

      // Add risk level for visualization
      const enrichedData = filteredData.map(incident => ({
        ...incident,
        riskLevel: getRiskLevel(incident.type),
      }));

      addCrimeHeatmapLayer(map, enrichedData);
    }
  }, [map, crimeData, timeRange, filterRiskLevel]);

  // Handle map click for incident details
  const handleMapClick = (event: any) => {
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["crime-heatmap-circles"],
    });

    if (features.length > 0) {
      const incident = features[0].properties as CrimeIncident;
      setSelectedIncident(incident);
      onIncidentClick?.(incident);
    }
  };

  // Get risk level based on crime type
  const getRiskLevel = (type: CrimeIncident["type"]): "critical" | "high" | "medium" | "low" => {
    switch (type) {
      case "violent":
        return "critical";
      case "property":
        return "high";
      case "drug":
        return "medium";
      default:
        return "low";
    }
  };

  // Get crime statistics
  const getCrimeStats = () => {
    const stats = {
      total: crimeData.length,
      violent: crimeData.filter(c => c.type === "violent").length,
      property: crimeData.filter(c => c.type === "property").length,
      drug: crimeData.filter(c => c.type === "drug").length,
      other: crimeData.filter(c => c.type === "other").length,
      open: crimeData.filter(c => c.status === "open").length,
    };

    return stats;
  };

  const stats = getCrimeStats();

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map */}
      <MapboxMap
        onMapLoad={setMap}
        onMapClick={handleMapClick}
        className="w-full h-full"
      />

      {/* Crime Statistics Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
        <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Crime Statistics
        </h3>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Incidents</span>
            <span className="text-sm font-medium text-slate-100">{stats.total}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Violent</span>
            <span className="text-sm font-medium text-red-400">{stats.violent}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Property</span>
            <span className="text-sm font-medium text-orange-400">{stats.property}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Drug</span>
            <span className="text-sm font-medium text-yellow-400">{stats.drug}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Open Cases</span>
            <span className="text-sm font-medium text-blue-400">{stats.open}</span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Clock className="w-3 h-3" />
            Time Range
          </div>
          <div className="flex gap-1">
            {(["24h", "7d", "30d"] as const).map((range) => (
              <button
                key={range}
                onClick={() => {/* TODO: Implement time range change */}}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  timeRange === range
                    ? "bg-blue-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Level Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-100 mb-2">Risk Level</h4>
        <div className="space-y-1">
          {[
            { level: "critical", color: "bg-red-500", label: "Critical" },
            { level: "high", color: "bg-orange-500", label: "High" },
            { level: "medium", color: "bg-yellow-500", label: "Medium" },
            { level: "low", color: "bg-green-500", label: "Low" },
          ].map(({ level, color, label }) => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-xs text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-slate-400">Loading crime data...</p>
          </div>
        </div>
      )}

      {/* Selected Incident Popup */}
      {selectedIncident && (
        <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-100">Incident Details</h4>
            <button
              onClick={() => setSelectedIncident(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Type:</span>
              <span className="ml-2 text-slate-200 capitalize">{selectedIncident.type}</span>
            </div>
            <div>
              <span className="text-slate-400">Location:</span>
              <span className="ml-2 text-slate-200">{selectedIncident.neighborhood}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 capitalize ${
                selectedIncident.status === "open" ? "text-red-400" :
                selectedIncident.status === "investigating" ? "text-yellow-400" :
                "text-green-400"
              }`}>
                {selectedIncident.status}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Time:</span>
              <span className="ml-2 text-slate-200">
                {new Date(selectedIncident.timestamp).toLocaleString()}
              </span>
            </div>
            {selectedIncident.description && (
              <div>
                <span className="text-slate-400">Description:</span>
                <span className="ml-2 text-slate-200">{selectedIncident.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
