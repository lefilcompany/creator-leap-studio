import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { Outlet } from "react-router-dom";

export const AdminLayout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen w-full flex overflow-hidden bg-gradient-to-br from-background via-background to-muted/10">
        <AdminSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-b from-background/50 to-background">
            <div className="w-full h-full p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
