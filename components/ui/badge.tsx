import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-100 text-slate-900",
        secondary: "border-transparent bg-slate-700 text-slate-100",
        destructive: "border-transparent bg-danger text-slate-50",
        outline: "text-slate-100 border-slate-600",
        critical: "border-transparent bg-danger text-slate-50",
        high: "border-transparent bg-warning text-slate-900",
        medium: "border-transparent bg-amber-600 text-slate-50",
        low: "border-transparent bg-success text-slate-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
