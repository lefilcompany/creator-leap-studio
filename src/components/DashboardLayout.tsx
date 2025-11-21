import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlatformChatbot } from "./PlatformChatbot";

export const DashboardLayout = () => {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/10">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Header />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-background/50 to-background">
            <div className="max-w-full mx-auto h-full">
              <Outlet />
            </div>
          </main>
        </div>
        <PlatformChatbot />
      </div>
    </SidebarProvider>
  );
};