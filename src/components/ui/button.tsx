import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variants = {
      default: "bg-emerald-600 text-white hover:bg-emerald-500",
      destructive: "bg-red-600 text-white hover:bg-red-500",
      outline: "border border-zinc-600 text-zinc-300 hover:bg-zinc-800",
      secondary: "bg-zinc-700 text-zinc-100 hover:bg-zinc-600",
      ghost: "text-zinc-400 hover:bg-zinc-800 hover:text-white",
      link: "text-emerald-400 underline-offset-4 hover:underline",
    }
    const sizes = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-7 px-3 text-xs",
      lg: "h-11 px-6 text-base",
      icon: "h-9 w-9",
    }
    return (
      <button
        ref={ref}
        className={cn("inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
