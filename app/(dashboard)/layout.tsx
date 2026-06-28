import { Sidebar } from "./_components/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-jc-cream/30">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 pt-16 lg:pt-4 lg:pl-4">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
