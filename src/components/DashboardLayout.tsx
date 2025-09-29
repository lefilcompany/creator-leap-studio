import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/10">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 ml-0 lg:ml-64">
          <Header />
          <main className="flex-1 overflow-hidden p-3 md:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background">
            <div className="max-w-full mx-auto h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};