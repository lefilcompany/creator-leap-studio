import { NavLink, useLocation } from "react-router-dom";
import { 
  Home, 
  Tag, 
  Users, 
  Calendar, 
  History, 
  Sparkles, 
  CheckCircle, 
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
import { cn } from "@/lib/utils";
import logoCreator from "@/assets/logoCreatorPreta.png";

// --- DATA DEFINITIONS ---
const navLinks = [
  { id: "nav-home", href: "/dashboard", icon: Home, label: "Home" },
  { id: "nav-marcas", href: "/brands", icon: Tag, label: "Marcas" },
  { id: "nav-temas", href: "/themes", icon: Sparkles, label: "Temas Estratégicos" },
  { id: "nav-personas", href: "/personas", icon: Users, label: "Personas" },
  { id: "nav-historico", href: "/history", icon: History, label: "Histórico" },
];

const contentAction = {
  id: "nav-criar",
  href: "/create",
  icon: Sparkles,
  label: "Criar Conteúdo",
};

const reviewAction = {
  id: "nav-revisar",
  href: "/review",
  icon: CheckCircle,
  label: "Revisar Conteúdo",
};

const planAction = {
  id: "nav-planejar",
  href: "/plan",
  icon: Calendar,
  label: "Planejar Conteúdo",
};

// --- COMPONENT DEFINITIONS ---

// NavItem Unificado
function NavItem({ id, href, icon: Icon, label, collapsed }: { 
  id: string; 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="p-0">
        <NavLink
          id={id}
          to={href}
          className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors duration-200",
            isActive
              ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ContentAction Unificado
function ContentAction({ id, href, icon: Icon, label, collapsed }: { 
  id: string; 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      id={id}
      to={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105",
        isActive
          ? "bg-background border border-primary text-primary shadow-lg scale-105"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

// ReviewAction Unificado
function ReviewAction({ id, href, icon: Icon, label, collapsed }: { 
  id: string; 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      id={id}
      to={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105",
        isActive
          ? "bg-background border border-accent text-accent shadow-lg scale-105"
          : "bg-accent text-accent-foreground hover:bg-accent/90"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

// PlanAction Unificado
function PlanAction({ id, href, icon: Icon, label, collapsed }: { 
  id: string; 
  href: string; 
  icon: React.ElementType; 
  label: string; 
  collapsed: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <NavLink
      id={id}
      to={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105",
        isActive
          ? "bg-background border border-secondary text-secondary shadow-lg scale-105"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );
}

// TeamPlanSection Unificada
function TeamPlanSection({ teamName, planName, collapsed }: { 
  teamName: string; 
  planName: string; 
  collapsed: boolean;
}) {
  if (collapsed) return null;

  return (
    <div className="bg-gradient-to-tr from-primary to-fuchsia-600 text-primary-foreground rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <Rocket className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col items-start leading-tight">
          <div className="text-sm font-semibold">Equipe: {teamName}</div>
          <div className="text-xs opacity-90">Plano: {planName}</div>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const sidebarContent = () => (
    <>
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
              {navLinks.map((link) => (
                <NavItem key={link.href} {...link} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Action Buttons */}
        {!collapsed && (
          <div className="space-y-3 mt-6">
            <ContentAction {...contentAction} collapsed={collapsed} />
            <ReviewAction {...reviewAction} collapsed={collapsed} />
            <PlanAction {...planAction} collapsed={collapsed} />
          </div>
        )}

        {/* Spacer para empurrar o card para o final */}
        <div className="flex-grow"></div>

        {/* Team Info - Fixado no final */}
        <TeamPlanSection 
          teamName="LeFil" 
          planName="LEFIL" 
          collapsed={collapsed} 
        />
      </div>
    </>
  );

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-primary/20`} collapsible="icon">
      <SidebarContent className="bg-background flex flex-col h-full">
        {sidebarContent()}
      </SidebarContent>
    </Sidebar>
  );
}