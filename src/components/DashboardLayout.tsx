import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlatformChatbot } from "./PlatformChatbot";
import { PresenceTracker } from "@/components/PresenceTracker";
import { UpdateBanner } from "@/components/UpdateBanner";
import { RouteProgressBar } from "@/components/RouteProgressBar";

export const DashboardLayout = () => {
  const isMobile = useIsMobile();
  
  return (
    <SidebarProvider defaultOpen={true}>
      <PresenceTracker />
      <RouteProgressBar />
      <div className="h-screen w-full flex flex-col overflow-hidden bg-[var(--layout-bg)]">
        <UpdateBanner />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <AppSidebar />
          <div className={
            isMobile
              ? "flex flex-1 flex-col min-w-0 bg-card"
              : "flex flex-1 flex-col min-w-0 bg-card rounded-2xl shadow-xl mt-4 mr-4 mb-4 ml-1 overflow-hidden"
          }>
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              <div className="w-full h-full p-4 sm:p-6 lg:p-8">
                <Outlet />
              </div>
            </main>
          </div>
          <PlatformChatbot />
        </div>
      </div>
    </SidebarProvider>
  );
};
