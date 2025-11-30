import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    const isDateTimeInput =
      type === "date" || type === "time" || type === "datetime-local";

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Date/time inputs specific styles for mobile/PWA
          isDateTimeInput && [
            "box-border min-w-0",
            "text-base md:text-sm", // Consistent font size
            "leading-normal", // Proper line height
            "px-3 py-2", // Adequate padding for touch targets
            "appearance-none", // Remove default styling that can cause issues
            "[&::-webkit-calendar-picker-indicator]:opacity-100", // Ensure calendar icon is visible
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer", // Make it clickable
            "[&::-webkit-calendar-picker-indicator]:ml-auto", // Position icon properly
          ],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
