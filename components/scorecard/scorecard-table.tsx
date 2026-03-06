"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { GradeBadge } from "./grade-badge";
import { TrendIndicator } from "./trend-indicator";
import type { ScorecardTableProps, SortableColumn, SortDirection } from "./types";

interface SortHeaderProps {
  label: string;
  column: SortableColumn;
  currentColumn: SortableColumn;
  direction: SortDirection;
  onSort: (column: SortableColumn) => void;
  align?: "left" | "center" | "right";
}

function SortHeader({
  label,
  column,
  currentColumn,
  direction,
  onSort,
  align = "left",
}: SortHeaderProps) {
  const isActive = currentColumn === column;
  
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
        "text-slate-400 bg-slate-800/50",
        align === "center" && "text-center",
        align === "right" && "text-right"
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors",
          "focus:outline-none focus:text-slate-100",
          isActive && "text-slate-100"
        )}
        aria-label={`Sort by ${label} ${isActive ? (direction === "asc" ? "descending" : "ascending") : "ascending"}`}
      >
        {label}
        <span className="inline-flex flex-col" aria-hidden="true">
          <svg
            className={cn(
              "w-3 h-3 -mb-1",
              isActive && direction === "asc" ? "text-accent" : "text-slate-600"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 8l-6 6h12z" />
          </svg>
          <svg
            className={cn(
              "w-3 h-3",
              isActive && direction === "desc" ? "text-accent" : "text-slate-600"
            )}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 16l-6-6h12z" />
          </svg>
        </span>
      </button>
    </th>
  );
}

export function ScorecardTable({
  districts,
  sortState,
  onSort,
}: ScorecardTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr>
            <SortHeader
              label="Neighborhood"
              column="name"
              currentColumn={sortState.column}
              direction={sortState.direction}
              onSort={onSort}
            />
            <SortHeader
              label="Safety Grade"
              column="grade"
              currentColumn={sortState.column}
              direction={sortState.direction}
              onSort={onSort}
              align="center"
            />
            <SortHeader
              label="Crime Index"
              column="crimeIndex"
              currentColumn={sortState.column}
              direction={sortState.direction}
              onSort={onSort}
              align="right"
            />
            <SortHeader
              label="311 Backlog"
              column="backlog311"
              currentColumn={sortState.column}
              direction={sortState.direction}
              onSort={onSort}
              align="right"
            />
            <SortHeader
              label="Trend"
              column="trend"
              currentColumn={sortState.column}
              direction={sortState.direction}
              onSort={onSort}
              align="right"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {districts.map((district) => (
            <tr
              key={district.id}
              className="bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-slate-100">
                {district.name}
              </td>
              <td className="px-4 py-3 text-center">
                <GradeBadge grade={district.grade} />
              </td>
              <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                {district.crimeIndex.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                {district.backlog311}
              </td>
              <td className="px-4 py-3 text-right">
                <TrendIndicator value={district.trend} />
              </td>
            </tr>
          ))}
          {districts.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-slate-400"
              >
                No neighborhoods found matching your search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
