import { BottomNav } from "@/components/layout/bottom-nav";
import { DataProvider } from "@/contexts/data-context";

// Force dynamic rendering for all app pages (they all need auth)
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <div className="flex min-h-screen flex-col pb-20">
        <main className="flex-1">{children}</main>
        <BottomNav />
      </div>
    </DataProvider>
  );
}
