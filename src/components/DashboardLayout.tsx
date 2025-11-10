import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlatformChatbot } from "./PlatformChatbot";
import { cn } from "@/lib/utils";
const DashboardContent = () => {
  const isMobile = useIsMobile();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/10">
      <AppSidebar />
      <div className={cn(
        "flex flex-1 flex-col min-w-0 transition-all duration-300",
        isMobile ? "ml-0" : (collapsed ? "ml-16" : "ml-64")
      )}>
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background px-[16px] py-[16px]">
          <div className="max-w-full mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <PlatformChatbot />
    </div>
  );
};

export const DashboardLayout = () => {
  return (
    <SidebarProvider defaultOpen={false}>
      <DashboardContent />
    </SidebarProvider>
  );
};