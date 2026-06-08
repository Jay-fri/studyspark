import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-transparent gradient-brand text-white shadow",
        secondary:   "border-transparent bg-surface-2 text-text-secondary",
        destructive: "border-transparent bg-brand-danger/10 text-brand-danger",
        outline:     "text-text-primary border-border",
        success:     "border-transparent bg-brand-accent/10 text-brand-accent",
        warning:     "border-transparent bg-brand-warning/10 text-brand-warning",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
