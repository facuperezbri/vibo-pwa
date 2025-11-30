"use client";

import { PadelBallLoader } from "@/components/ui/padel-ball-loader";

export default function LoadingTestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <PadelBallLoader size="lg" />
    </div>
  );
}

