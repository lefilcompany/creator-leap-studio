import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/10">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-b from-background/50 to-background">
            <div className="max-w-8xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};