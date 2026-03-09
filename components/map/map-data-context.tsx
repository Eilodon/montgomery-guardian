"use client";

import { createContext, useContext } from "react";
import type { CrimeIncident, ServiceRequest311 } from "@/shared/types";

interface MapDataContextValue {
    crimeData: CrimeIncident[];
    requests311: ServiceRequest311[];
}

const MapDataContext = createContext<MapDataContextValue>({
    crimeData: [],
    requests311: [],
});

export function MapDataProvider({
    children,
    crimeData,
    requests311,
}: MapDataContextValue & { children: React.ReactNode }) {
    return (
        <MapDataContext.Provider value={{ crimeData, requests311 }}>
            {children}
        </MapDataContext.Provider>
    );
}

export function useMapData(): MapDataContextValue {
    return useContext(MapDataContext);
}
