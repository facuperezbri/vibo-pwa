import { ErrorBoundary } from "@/components/error-boundary";
import { ClubBottomNav } from "@/components/layout/club-bottom-nav";
import { NavigationProvider } from "@/contexts/navigation-context";
import { ReactQueryProvider } from "@/lib/react-query/provider";

export default function ClubLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      <NavigationProvider>
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col pb-20">
            <main className="flex-1">{children}</main>
            <ClubBottomNav />
          </div>
        </ErrorBoundary>
      </NavigationProvider>
    </ReactQueryProvider>
  );
}

