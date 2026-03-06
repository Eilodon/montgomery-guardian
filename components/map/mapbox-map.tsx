"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxMapProps {
  children?: React.ReactNode;
  className?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapClick?: (event: mapboxgl.MapMouseEvent) => void;
}

// Montgomery, Alabama coordinates
const MONTGOMERY_CENTER = [-86.2792, 32.3617] as [number, number];

export function MapboxMap({
  children,
  className = "",
  initialViewState = {
    longitude: MONTGOMERY_CENTER[0],
    latitude: MONTGOMERY_CENTER[1],
    zoom: 12,
  },
  onMapLoad,
  onMapClick,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Get Mapbox access token from environment
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.error("Mapbox access token is required");
      return;
    }

    // Set the access token
    mapboxgl.accessToken = mapboxToken;

    // Initialize the map
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11", // Dark theme for dashboard
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false, // Hide attribution for cleaner look
    });

    // Add navigation controls
    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add scale control
    mapInstance.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 80,
        unit: "metric",
      }),
      "bottom-left"
    );

    // Handle map load
    mapInstance.on("load", () => {
      console.log("Mapbox map loaded successfully");
      setMapLoaded(true);
      onMapLoad?.(mapInstance);

      // Add Montgomery city boundaries (simplified)
      mapInstance.addSource("montgomery-boundary", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                // Simplified Montgomery boundary coordinates
                [-86.35, 32.45],
                [-86.15, 32.45],
                [-86.15, 32.25],
                [-86.35, 32.25],
                [-86.35, 32.45],
              ],
            ],
          },
        },
      });

      // Add boundary layer
      mapInstance.addLayer({
        id: "montgomery-boundary-fill",
        type: "fill",
        source: "montgomery-boundary",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.05,
        },
      });

      mapInstance.addLayer({
        id: "montgomery-boundary-line",
        type: "line",
        source: "montgomery-boundary",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-opacity": 0.3,
        },
      });

      // Add downtown marker
      mapInstance.addSource("downtown-marker", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {
            title: "Downtown Montgomery",
            description: "City center and business district",
          },
          geometry: {
            type: "Point",
            coordinates: MONTGOMERY_CENTER,
          },
        },
      });

      mapInstance.addLayer({
        id: "downtown-marker",
        type: "circle",
        source: "downtown-marker",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f59e0b",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Add popup for downtown marker
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 25,
      });

      mapInstance.on("mouseenter", "downtown-marker", (e) => {
        const coordinates = e.features?.[0]?.geometry?.coordinates as [number, number];
        const description = e.features?.[0]?.properties?.description;

        if (coordinates && description) {
          popup.setLngLat(coordinates).setHTML(`<strong>Downtown Montgomery</strong><br>${description}`).addTo(mapInstance);
        }
      });

      mapInstance.on("mouseleave", "downtown-marker", () => {
        popup.remove();
      });
    });

    // Handle map click
    if (onMapClick) {
      mapInstance.on("click", onMapClick);
    }

    // Handle errors
    mapInstance.on("error", (e) => {
      console.error("Mapbox error:", e);
    });

    // Store map instance
    map.current = mapInstance;

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map view when initialViewState changes
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.flyTo({
        center: [initialViewState.longitude, initialViewState.latitude],
        zoom: initialViewState.zoom,
        duration: 1000,
      });
    }
  }, [initialViewState, mapLoaded]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-slate-400">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center p-6">
            <p className="text-red-400 mb-2">Mapbox access token is required</p>
            <p className="text-sm text-slate-400">
              Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment variables
            </p>
          </div>
        </div>
      )}

      {/* Render children (overlays, controls, etc.) */}
      {mapLoaded && children}
    </div>
  );
}

// Hook to get map instance
export function useMapboxMap() {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);

  return { map, setMap };
}

// Helper function to add crime heatmap layer
export function addCrimeHeatmapLayer(
  map: mapboxgl.Map,
  crimeData: any[],
  layerId: string = "crime-heatmap"
) {
  if (!map.getSource(layerId)) {
    map.addSource(layerId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: crimeData.map((crime) => ({
          type: "Feature",
          properties: {
            ...crime,
            intensity: crime.riskLevel === "critical" ? 1 : crime.riskLevel === "high" ? 0.75 : crime.riskLevel === "medium" ? 0.5 : 0.25,
          },
          geometry: {
            type: "Point",
            coordinates: [crime.longitude, crime.latitude],
          },
        })),
      },
    });

    map.addLayer(
      {
        id: `${layerId}-circles`,
        type: "circle",
        source: layerId,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            ["*", 10, ["get", "intensity"]],
            15,
            ["*", 30, ["get", "intensity"]],
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "intensity"],
            0,
            "#10b981", // green
            0.25,
            "#eab308", // yellow
            0.5,
            "#f97316", // orange
            0.75,
            "#ef4444", // red
            1,
            "#dc2626", // dark red
          ],
          "circle-opacity": 0.6,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.3,
        },
      },
      "montgomery-boundary-fill"
    );
  } else {
    // Update existing source
    const source = map.getSource(layerId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: crimeData.map((crime) => ({
          type: "Feature",
          properties: {
            ...crime,
            intensity: crime.riskLevel === "critical" ? 1 : crime.riskLevel === "high" ? 0.75 : crime.riskLevel === "medium" ? 0.5 : 0.25,
          },
          geometry: {
            type: "Point",
            coordinates: [crime.longitude, crime.latitude],
          },
        })),
      });
    }
  }
}

// Helper function to add 311 markers layer
export function add311MarkersLayer(
  map: mapboxgl.Map,
  requests311: any[],
  layerId: string = "311-markers"
) {
  if (!map.getSource(layerId)) {
    map.addSource(layerId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: requests311.map((request) => ({
          type: "Feature",
          properties: {
            ...request,
            icon: get311Icon(request.serviceType),
            color: get311Color(request.serviceType),
          },
          geometry: {
            type: "Point",
            coordinates: [request.longitude, request.latitude],
          },
        })),
      },
    });

    map.addLayer(
      {
        id: `${layerId}-symbols`,
        type: "symbol",
        source: layerId,
        layout: {
          "icon-image": ["get", "icon"],
          "icon-size": 1.2,
          "icon-allow-overlap": true,
          "text-field": ["get", "serviceType"],
          "text-font": ["Open Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 1,
        },
      },
      "montgomery-boundary-fill"
    );
  } else {
    // Update existing source
    const source = map.getSource(layerId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: requests311.map((request) => ({
          type: "Feature",
          properties: {
            ...request,
            icon: get311Icon(request.serviceType),
            color: get311Color(request.serviceType),
          },
          geometry: {
            type: "Point",
            coordinates: [request.longitude, request.latitude],
          },
        })),
      });
    }
  }
}

function get311Icon(serviceType: string): string {
  const iconMap: Record<string, string> = {
    pothole: "🚧",
    graffiti: "🎨",
    trash: "🗑️",
    flooding: "💧",
    overgrown_grass: "🌿",
    other: "📋",
  };
  return iconMap[serviceType] || iconMap.other;
}

function get311Color(serviceType: string): string {
  const colorMap: Record<string, string> = {
    pothole: "#ef4444",
    graffiti: "#8b5cf6",
    trash: "#f97316",
    flooding: "#3b82f6",
    overgrown_grass: "#10b981",
    other: "#6b7280",
  };
  return colorMap[serviceType] || colorMap.other;
}
