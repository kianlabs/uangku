import { BottomNav } from "@/components/ui/BottomNav";
import { FAB } from "@/components/ui/FAB";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <main
        className="flex-1 w-full max-w-lg mx-auto px-4 pt-6"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        }}
      >
        {children}
      </main>
      <FAB />
      <BottomNav />
    </div>
  );
}
