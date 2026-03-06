"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { SearchInputProps } from "./types";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search neighborhoods...",
}: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor="neighborhood-search" className="sr-only">
        Search neighborhoods
      </label>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        id="neighborhood-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-4 py-2.5 rounded-lg",
          "bg-slate-800 border border-slate-700",
          "text-slate-100 placeholder:text-slate-500",
          "text-sm",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
          "transition-colors"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200"
          aria-label="Clear search"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
