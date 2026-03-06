// Neighborhood Safety Scorecard Types

export type SafetyGrade = "A" | "B" | "C" | "D" | "F";

export type SortDirection = "asc" | "desc";

export type SortableColumn = "name" | "grade" | "crimeIndex" | "backlog311" | "trend";

export interface DistrictData {
  id: string;
  name: string;
  grade: SafetyGrade;
  crimeIndex: number;
  backlog311: number;
  trend: number; // Positive = up, Negative = down
}

export interface SortState {
  column: SortableColumn;
  direction: SortDirection;
}

export interface SafetyScorecardProps {
  districts: DistrictData[];
  className?: string;
}

export interface ScorecardTableProps {
  districts: DistrictData[];
  sortState: SortState;
  onSort: (column: SortableColumn) => void;
}

export interface ScorecardCardProps {
  district: DistrictData;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
