"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { SafetyGrade } from "./types";

const gradeColors: Record<SafetyGrade, string> = {
  A: "bg-green-500 text-white",
  B: "bg-lime-500 text-slate-900",
  C: "bg-yellow-500 text-slate-900",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
};

const gradeLabels: Record<SafetyGrade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Fair",
  D: "Poor",
  F: "Critical",
};

interface GradeBadgeProps {
  grade: SafetyGrade;
  showLabel?: boolean;
  className?: string;
}

export function GradeBadge({ grade, showLabel = false, className }: GradeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-md",
        "min-w-[2rem] h-7 px-2.5 text-sm",
        gradeColors[grade],
        className
      )}
      role="status"
      aria-label={`Safety grade: ${grade} - ${gradeLabels[grade]}`}
    >
      {grade}
      {showLabel && (
        <span className="ml-1.5 font-medium text-xs opacity-90">
          ({gradeLabels[grade]})
        </span>
      )}
    </span>
  );
}
