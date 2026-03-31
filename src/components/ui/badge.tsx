import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#161616]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-500 text-white hover:bg-emerald-600",
        secondary:
          "border-transparent bg-zinc-700 text-zinc-100 hover:bg-zinc-600",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-600",
        outline: "border-zinc-600 text-zinc-300",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        warning:
          "border-transparent bg-orange-500/10 text-orange-400 border-orange-500/20",
        info:
          "border-transparent bg-blue-500/10 text-blue-400 border-blue-500/20",
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
