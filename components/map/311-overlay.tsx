"use client";

import { useEffect, useState } from "react";
import { MapboxMap, add311MarkersLayer, useMapboxMap } from "./mapbox-map";
import { ServiceRequest311 } from "@/shared/types";
import { Calendar, Clock, Filter, Layers, Wrench } from "lucide-react";

interface Map311OverlayProps {
  className?: string;
  onRequestClick?: (request: ServiceRequest311) => void;
  filterServiceType?: "all" | ServiceRequest311["serviceType"];
  filterStatus?: "all" | ServiceRequest311["status"];
  showLayer?: boolean;
}

// Mock 311 service request data
const mock311Data: ServiceRequest311[] = [
  {
    requestId: "req_1",
    serviceType: "pothole",
    status: "open",
    latitude: 32.3617,
    longitude: -86.2792,
    address: "123 Dexter Ave, Montgomery, AL",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Large pothole in the middle of the street causing traffic hazards",
    estimatedResolutionDays: 3,
  },
  {
    requestId: "req_2",
    serviceType: "graffiti",
    status: "in_progress",
    latitude: 32.3800,
    longitude: -86.3000,
    address: "456 Madison Ave, Montgomery, AL",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Graffiti on public building wall",
    estimatedResolutionDays: 5,
  },
  {
    requestId: "req_3",
    serviceType: "trash",
    status: "closed",
    latitude: 32.3400,
    longitude: -86.2600,
    address: "789 Perry St, Montgomery, AL",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Overflowing trash container",
    estimatedResolutionDays: 1,
  },
  {
    requestId: "req_4",
    serviceType: "flooding",
    status: "open",
    latitude: 32.3700,
    longitude: -86.2900,
    address: "321 Commerce St, Montgomery, AL",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Standing water in parking lot after heavy rain",
    estimatedResolutionDays: 2,
  },
  {
    requestId: "req_5",
    serviceType: "overgrown_grass",
    status: "in_progress",
    latitude: 32.3500,
    longitude: -86.2800,
    address: "654 Coosa St, Montgomery, AL",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Overgrown vegetation blocking sidewalk",
    estimatedResolutionDays: 7,
  },
  {
    requestId: "req_6",
    serviceType: "pothole",
    status: "closed",
    latitude: 32.3900,
    longitude: -86.3100,
    address: "987 Mobile St, Montgomery, AL",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Multiple small potholes repaired",
    estimatedResolutionDays: 3,
  },
  {
    requestId: "req_7",
    serviceType: "other",
    status: "open",
    latitude: 32.3300,
    longitude: -86.2500,
    address: "147 Washington Ave, Montgomery, AL",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Damaged street sign needs replacement",
    estimatedResolutionDays: 4,
  },
  {
    requestId: "req_8",
    serviceType: "graffiti",
    status: "open",
    latitude: 32.4000,
    longitude: -86.3200,
    address: "258 Bibb St, Montgomery, AL",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description: "Graffiti on public bridge",
    estimatedResolutionDays: 5,
  },
];

// Generate more mock data for better visualization
const generateMoreMockData = (): ServiceRequest311[] => {
  const additionalData: ServiceRequest311[] = [];
  const serviceTypes: ServiceRequest311["serviceType"][] = ["pothole", "graffiti", "trash", "flooding", "overgrown_grass", "other"];
  const statuses: ServiceRequest311["status"][] = ["open", "in_progress", "closed"];
  const streets = [
    "Dexter Ave", "Madison Ave", "Perry St", "Commerce St",
    "Coosa St", "Mobile St", "Washington Ave", "Bibb St"
  ];

  for (let i = 0; i < 30; i++) {
    additionalData.push({
      requestId: `req_${i + 9}`,
      serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      latitude: 32.30 + Math.random() * 0.15,
      longitude: -86.35 + Math.random() * 0.15,
      address: `${Math.floor(Math.random() * 999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}, Montgomery, AL`,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: `Service request ${i + 9} - ${serviceTypes[Math.floor(Math.random() * serviceTypes.length)]} issue`,
      estimatedResolutionDays: Math.floor(Math.random() * 7) + 1,
    });
  }

  return additionalData;
};

export function Map311Overlay({
  className = "",
  onRequestClick,
  filterServiceType = "all",
  filterStatus = "all",
  showLayer = true
}: Map311OverlayProps) {
  const { map, setMap } = useMapboxMap();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest311[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest311 | null>(null);
  const [layerVisible, setLayerVisible] = useState(showLayer);

  // Load 311 service request data
  useEffect(() => {
    const loadServiceRequests = async () => {
      setIsLoading(true);

      try {
        // Try to load real data from API
        const response = await fetch("/api/v1/requests-311?limit=100");

        if (response.ok) {
          const apiData = await response.json();
          const requests = apiData.data || [];
          setServiceRequests(requests);
        } else {
          // Fallback to mock data
          const allMockData = [...mock311Data, ...generateMoreMockData()];
          setServiceRequests(allMockData);
        }
      } catch (error) {
        console.error("Failed to load 311 data:", error);
        // Fallback to mock data
        const allMockData = [...mock311Data, ...generateMoreMockData()];
        setServiceRequests(allMockData);
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceRequests();
  }, []);

  // Add 311 markers layer to map when data is loaded
  useEffect(() => {
    if (map && serviceRequests.length > 0 && layerVisible) {
      // Filter data based on filters
      const filteredData = serviceRequests.filter(request => {
        const serviceFilter = filterServiceType === "all" || request.serviceType === filterServiceType;
        const statusFilter = filterStatus === "all" || request.status === filterStatus;
        return serviceFilter && statusFilter;
      });

      add311MarkersLayer(map, filteredData);
    }
  }, [map, serviceRequests, filterServiceType, filterStatus, layerVisible]);

  // Handle map click for request details
  const handleMapClick = (event: any) => {
    if (!map) return;

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["311-markers-symbols"],
    });

    if (features.length > 0) {
      const request = features[0].properties as ServiceRequest311;
      setSelectedRequest(request);
      onRequestClick?.(request);
    }
  };

  // Get service request statistics
  const getServiceStats = () => {
    const stats = {
      total: serviceRequests.length,
      open: serviceRequests.filter(r => r.status === "open").length,
      inProgress: serviceRequests.filter(r => r.status === "in_progress").length,
      closed: serviceRequests.filter(r => r.status === "closed").length,
      pothole: serviceRequests.filter(r => r.serviceType === "pothole").length,
      graffiti: serviceRequests.filter(r => r.serviceType === "graffiti").length,
      trash: serviceRequests.filter(r => r.serviceType === "trash").length,
      flooding: serviceRequests.filter(r => r.serviceType === "flooding").length,
      overgrown_grass: serviceRequests.filter(r => r.serviceType === "overgrown_grass").length,
      other: serviceRequests.filter(r => r.serviceType === "other").length,
    };

    return stats;
  };

  const stats = getServiceStats();

  // Get service type icon and color
  const getServiceTypeInfo = (serviceType: ServiceRequest311["serviceType"]) => {
    const typeMap: Record<ServiceRequest311["serviceType"], { icon: string; color: string; label: string }> = {
      pothole: { icon: "🚧", color: "bg-red-500", label: "Pothole" },
      graffiti: { icon: "🎨", color: "bg-purple-500", label: "Graffiti" },
      trash: { icon: "🗑️", color: "bg-orange-500", label: "Trash" },
      flooding: { icon: "💧", color: "bg-blue-500", label: "Flooding" },
      overgrown_grass: { icon: "🌿", color: "bg-green-500", label: "Vegetation" },
      other: { icon: "📋", color: "bg-gray-500", label: "Other" },
    };
    return typeMap[serviceType];
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Map */}
      <MapboxMap
        onMapLoad={setMap}
        onMapClick={handleMapClick}
        className="w-full h-full"
      />

      {/* 311 Service Request Statistics Overlay */}
      <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
        <h3 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-400" />
          311 Service Requests
        </h3>

        {/* Status Statistics */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Total Requests</span>
            <span className="text-sm font-medium text-slate-100">{stats.total}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Open</span>
            <span className="text-sm font-medium text-red-400">{stats.open}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">In Progress</span>
            <span className="text-sm font-medium text-yellow-400">{stats.inProgress}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400">Closed</span>
            <span className="text-sm font-medium text-green-400">{stats.closed}</span>
          </div>
        </div>

        {/* Service Type Breakdown */}
        <div className="border-t border-slate-700 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Filter className="w-3 h-3" />
            Service Types
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["pothole", "graffiti", "trash", "flooding", "overgrown_grass", "other"] as const).map((type) => {
              const typeInfo = getServiceTypeInfo(type);
              const count = stats[type];
              return (
                <div key={type} className="flex items-center gap-1">
                  <span className="text-xs">{typeInfo.icon}</span>
                  <span className="text-xs text-slate-300">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Layer Toggle */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <button
            onClick={() => setLayerVisible(!layerVisible)}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded text-xs font-medium transition-colors ${layerVisible
                ? "bg-blue-500 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
          >
            <Layers className="w-3 h-3" />
            {layerVisible ? "Hide Layer" : "Show Layer"}
          </button>
        </div>
      </div>

      {/* Service Type Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-slate-100 mb-2">Service Types</h4>
        <div className="space-y-1">
          {(["pothole", "graffiti", "trash", "flooding", "overgrown_grass", "other"] as const).map((type) => {
            const typeInfo = getServiceTypeInfo(type);
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs">{typeInfo.icon}</span>
                <span className="text-xs text-slate-300">{typeInfo.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-slate-400">Loading 311 data...</p>
          </div>
        </div>
      )}

      {/* Selected Request Popup */}
      {selectedRequest && (
        <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg p-4 max-w-sm">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {getServiceTypeInfo(selectedRequest.serviceType).icon}
              Service Request
            </h4>
            <button
              onClick={() => setSelectedRequest(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ×
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400">Request ID:</span>
              <span className="ml-2 text-slate-200">{selectedRequest.requestId}</span>
            </div>
            <div>
              <span className="text-slate-400">Type:</span>
              <span className="ml-2 text-slate-200 capitalize">{selectedRequest.serviceType.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 capitalize ${selectedRequest.status === "open" ? "text-red-400" :
                  selectedRequest.status === "in_progress" ? "text-yellow-400" :
                    "text-green-400"
                }`}>
                {selectedRequest.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Address:</span>
              <span className="ml-2 text-slate-200">{selectedRequest.address}</span>
            </div>
            <div>
              <span className="text-slate-400">Created:</span>
              <span className="ml-2 text-slate-200">
                {new Date(selectedRequest.createdAt).toLocaleDateString()}
              </span>
            </div>
            {selectedRequest.estimatedResolutionDays && (
              <div>
                <span className="text-slate-400">Est. Resolution:</span>
                <span className="ml-2 text-slate-200">
                  {selectedRequest.estimatedResolutionDays} days
                </span>
              </div>
            )}
            {selectedRequest.description && (
              <div>
                <span className="text-slate-400">Description:</span>
                <span className="ml-2 text-slate-200">{selectedRequest.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
