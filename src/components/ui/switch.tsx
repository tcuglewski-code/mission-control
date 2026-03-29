"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-emerald-600" : "bg-zinc-700",
        className
      )}
      {...props}
    >
      <span className={cn("pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
    </button>
  )
}
