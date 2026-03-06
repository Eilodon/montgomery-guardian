"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LayerToggleProps, MapLayerType } from "./types";

const layers: { id: MapLayerType; label: string }[] = [
  { id: "crime", label: "Crime" },
  { id: "311", label: "311 Requests" },
  { id: "unified", label: "Unified" },
];

export function LayerToggle({ activeLayer, onLayerChange }: LayerToggleProps) {
  return (
    <div className="absolute top-4 right-4 z-20 flex gap-2 rounded-lg bg-slate-900/90 p-2 backdrop-blur-sm border border-slate-700">
      {layers.map((layer) => (
        <Button
          key={layer.id}
          variant={activeLayer === layer.id ? "active" : "outline"}
          size="sm"
          onClick={() => onLayerChange(layer.id)}
          className={cn(
            "transition-all duration-200",
            activeLayer === layer.id
              ? "bg-accent text-slate-100 border-accent"
              : "border-slate-600 text-slate-300 hover:text-slate-100"
          )}
        >
          {layer.label}
        </Button>
      ))}
    </div>
  );
}
