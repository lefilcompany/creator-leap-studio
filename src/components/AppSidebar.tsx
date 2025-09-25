import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CreatorLogo } from "./CreatorLogo";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Marcas", url: "/brands", icon: Tag },
  { title: "Temas Estratégicos", url: "/themes", icon: Sparkles },
  { title: "Personas", url: "/personas", icon: Users },
  { title: "Histórico", url: "/history", icon: History },
];

const actionItems = [
  { title: "Criar Conteúdo", url: "/create", icon: PlusCircle },
  { title: "Revisar Conteúdo", url: "/review", icon: CheckCircle },
  { title: "Planejar Conteúdo", url: "/plan", icon: Calendar },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-white border-r">
        <div className="p-4 border-b">
          <CreatorLogo className="text-primary" />
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Ações
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {actionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className={isActive(item.url) ? "bg-primary text-primary-foreground" : ""}
                  >
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-auto p-4 bg-primary text-primary-foreground rounded-lg m-4">
            <div className="text-sm font-medium">Equipe: LeFil</div>
            <div className="text-xs opacity-90">Plano: LEFIL</div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}