"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SearchInput } from "./search-input";
import { ScorecardTable } from "./scorecard-table";
import { ScorecardCardList } from "./scorecard-card";
import { Pagination } from "./pagination";
import type {
  SafetyScorecardProps,
  SortState,
  SortableColumn,
  DistrictData,
  SafetyGrade,
} from "./types";

const ITEMS_PER_PAGE = 10;

// Grade order for sorting
const gradeOrder: Record<SafetyGrade, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  F: 5,
};

export function SafetyScorecard({ districts, className }: SafetyScorecardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortState, setSortState] = useState<SortState>({
    column: "name",
    direction: "asc",
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Handle sort toggle
  const handleSort = (column: SortableColumn) => {
    setSortState((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1); // Reset to first page on sort
  };

  // Filter and sort districts
  const processedDistricts = useMemo(() => {
    let result = [...districts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.name.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortState.column) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "grade":
          comparison = gradeOrder[a.grade] - gradeOrder[b.grade];
          break;
        case "crimeIndex":
          comparison = a.crimeIndex - b.crimeIndex;
          break;
        case "backlog311":
          comparison = a.backlog311 - b.backlog311;
          break;
        case "trend":
          comparison = a.trend - b.trend;
          break;
      }

      return sortState.direction === "asc" ? comparison : -comparison;
    });

    return result;
  }, [districts, searchQuery, sortState]);

  // Pagination
  const totalPages = Math.ceil(processedDistricts.length / ITEMS_PER_PAGE);
  const paginatedDistricts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedDistricts.slice(start, start + ITEMS_PER_PAGE);
  }, [processedDistricts, currentPage]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Neighborhood Safety Scorecard
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {processedDistricts.length} of {districts.length} neighborhoods
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <ScorecardTable
          districts={paginatedDistricts}
          sortState={sortState}
          onSort={handleSort}
        />
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <ScorecardCardList districts={paginatedDistricts} />
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
