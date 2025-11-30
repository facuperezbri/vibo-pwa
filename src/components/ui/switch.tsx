"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      // iOS style: green when checked, gray when unchecked
      "data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#E5E5EA]",
      // Remove border and shadow for iOS look
      "border-0 shadow-none",
      // Touch area expansion
      "touch-area-expand-switch",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-200 ease-in-out",
        // iOS style: translate to right when checked, stay left when unchecked
        "data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-[2px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
