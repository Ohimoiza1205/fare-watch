import { Sidebar } from "@/components/Sidebar";
import { ThemeScope } from "@/components/ThemeScope";

// The left rail navigates both views. The theme scope gives the planner its blue
// surface and the tracker its dark one, switching by route.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeScope>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ThemeScope>
  );
}
