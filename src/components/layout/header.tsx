"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightAction?: React.ReactNode;
  onBackClick?: () => void;
}

export function Header({
  title,
  showBack = false,
  showLogo = false,
  rightAction,
  onBackClick,
}: HeaderProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg safe-area-inset-top">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="touch-target -ml-2"
              onClick={handleBackClick}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {showLogo && (
            <Image
              src="/icon-192.png"
              alt="Vibo"
              width={32}
              height={32}
              className="rounded-lg"
            />
          )}
          {!showLogo && <h1 className="text-lg font-semibold">{title}</h1>}
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
