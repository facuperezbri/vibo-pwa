"use client";

import { useEffect, useRef } from "react";
import { useData } from "@/contexts/data-context";
import { usePathname } from "next/navigation";

/**
 * Component that refreshes data when navigating to the home page
 */
export function HomeRefresh() {
  const { refreshStats } = useData();
  const pathname = usePathname();
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    // Reset the flag when pathname changes
    hasRefreshedRef.current = false;
  }, [pathname]);

  useEffect(() => {
    // Refresh stats when entering the home page, but only once per navigation
    if (pathname === "/" && !hasRefreshedRef.current) {
      hasRefreshedRef.current = true;
      refreshStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only depend on pathname, not refreshStats

  return null;
}

