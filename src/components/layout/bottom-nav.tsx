"use client";

import { useNavigation } from "@/contexts/navigation-context";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/react-query/hooks";
import { isPlayerProfileComplete } from "@/lib/profile-utils";
import { History, Home, Plus, Trophy, User as UserIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const navItems = [
  {
    href: "/",
    label: "Inicio",
    icon: Home,
  },
  {
    href: "/matches",
    label: "Partidos",
    icon: History,
  },
  {
    href: "/new-match",
    label: "Nuevo",
    icon: Plus,
    isAction: true,
  },
  {
    href: "/ranking",
    label: "Ranking",
    icon: Trophy,
  },
  {
    href: "/profile",
    label: "Perfil",
    icon: UserIcon,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { handleNavigation: handleNavigationWithConfirm } = useNavigation();
  const { data: profileData } = useProfile();

  // Calculate badge visibility with useMemo to avoid unnecessary re-renders
  const showProfileBadge = useMemo(() => {
    if (!profileData?.profile || !profileData?.user) {
      return false;
    }
    return !isPlayerProfileComplete(profileData.profile, profileData.user);
  }, [profileData?.profile, profileData?.user]);

  // Prefetch all routes immediately on mount (like React Router)
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const handleNavigation = useCallback(
    (href: string) => {
      if (pathname === href) return;

      // Use navigation context to check for unsaved data before navigating
      handleNavigationWithConfirm(() => {
        router.push(href);
      });
    },
    [pathname, router, handleNavigationWithConfirm]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg safe-area-inset-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className="group relative -mt-6 flex flex-col items-center touch-target"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary border-2 border-background shadow-lg shadow-secondary/25 transition-transform group-active:scale-95">
                  <Icon className="h-6 w-6 text-secondary-foreground" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </button>
            );
          }

          const showBadge = item.href === "/profile" && showProfileBadge;

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "touch-target relative flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
                isActive ? "text-secondary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                {showBadge && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
