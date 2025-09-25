import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Tag, 
  Users, 
  Calendar, 
  History, 
  Sparkles, 
  CheckCircle, 
  PlusCircle,
  Rocket
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import logoCreator from "@/assets/logoCreatorPreta.png";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Marcas", url: "/brands", icon: Tag },
  { title: "Temas Estratégicos", url: "/themes", icon: Sparkles },
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Histórico", url: "/history", icon: History },
];

const actionItems = [
  { title: "Criar Conteúdo", url: "/create", icon: Sparkles, color: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  { title: "Revisar Conteúdo", url: "/review", icon: CheckCircle, color: "bg-accent hover:bg-accent/90 text-accent-foreground" },
  { title: "Planejar Conteúdo", url: "/plan", icon: Calendar, color: "bg-secondary hover:bg-secondary/90 text-secondary-foreground" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-primary/20`} collapsible="icon">
      <SidebarContent className="bg-background flex flex-col h-full">
        
        {/* Logo no topo */}
        {!collapsed && (
          <div className="p-6">
            <img 
              src={logoCreator} 
              alt="Creator Logo" 
              className="h-8 w-auto"
            />
          </div>
        )}
        
        {/* Navigation Items */}
        <div className="p-4 flex-1 flex flex-col">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2">
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="p-0">
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.url) 
                            ? "text-primary" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive(item.url) ? "text-primary" : "text-muted-foreground"}`} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Action Buttons */}
          {!collapsed && (
            <div className="space-y-3 mt-6">
              {actionItems.map((item) => (
                <Button
                  key={item.title}
                  asChild
                  className={`w-full justify-start h-12 ${item.color}`}
                >
                  <NavLink to={item.url}>
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.title}
                  </NavLink>
                </Button>
              ))}
            </div>
          )}

          {/* Spacer para empurrar o card para o final */}
          <div className="flex-grow"></div>

          {/* Team Info - Fixado no final */}
          {!collapsed && (
            <div className="bg-primary text-primary-foreground rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="w-4 h-4" />
                <div className="text-sm font-semibold">Equipe: LeFil</div>
              </div>
              <div className="text-xs opacity-90">Plano: LEFIL</div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}