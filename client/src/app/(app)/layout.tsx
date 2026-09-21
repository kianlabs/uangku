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
        className="flex-1 w-full max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-6 pt-6"
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
