import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Tag,
  Users,
  Calendar,
  History,
  Sparkles,
  CheckCircle,
  Rocket,
  Palette
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
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import logoCreator from "@/assets/logoCreatorPreta.png";

const navLinks = [
  { id: "nav-home", href: "/dashboard", icon: Home, label: "Home" },
  { id: "nav-marcas", href: "/brands", icon: Tag, label: "Marcas" },
  { id: "nav-temas", href: "/themes", icon: Palette, label: "Temas Estratégicos" },
  { id: "nav-personas", href: "/personas", icon: Users, label: "Personas" },
  { id: "nav-historico", href: "/history", icon: History, label: "Histórico" },
];

const actionButtons = [
    { id: "nav-criar", href: "/create", icon: Sparkles, label: "Criar Conteúdo", variant: "primary" as const },
    { id: "nav-revisar", href: "/review", icon: CheckCircle, label: "Revisar Conteúdo", variant: "accent" as const },
    { id: "nav-planejar", href: "/plan", icon: Calendar, label: "Planejar Conteúdo", variant: "secondary" as const },
];

function NavItem({ id, href, icon: Icon, label, collapsed, onNavigate }: {
  id: string;
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild className="p-0">
        <NavLink
          id={id}
          to={href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 lg:gap-4 p-2.5 lg:p-3 rounded-lg transition-colors duration-200 group",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground bg-background hover:bg-muted hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm lg:text-base">{label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function ActionButton({ id, href, icon: Icon, label, collapsed, variant, onNavigate }: {
    id: string;
    href: string;
    icon: React.ElementType;
    label: string;
    collapsed: boolean;
    variant: 'primary' | 'secondary' | 'accent';
    onNavigate?: () => void;
}) {
    const location = useLocation();
    const isActive = location.pathname === href;

    const variantClasses = {
        primary: {
            active: "bg-background border border-primary text-primary shadow-lg scale-105",
            inactive: "bg-primary text-primary-foreground hover:bg-primary/90",
        },
        accent: {
            active: "bg-background border border-accent text-accent shadow-lg scale-105",
            inactive: "bg-accent text-accent-foreground hover:bg-accent/90",
        },
        secondary: {
            active: "bg-background border border-secondary text-secondary shadow-lg scale-105",
            inactive: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        },
    };

    return (
        <NavLink
            id={id}
            to={href}
            onClick={onNavigate}
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 lg:px-4 lg:py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105",
                isActive ? variantClasses[variant].active : variantClasses[variant].inactive
            )}
        >
            <Icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
            {!collapsed && <span className="text-xs lg:text-sm">{label}</span>}
        </NavLink>
    );
}

function TeamPlanSection({ teamName, planName, collapsed, onNavigate }: {
  teamName: string;
  planName: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (collapsed) return null;

  return (
    <NavLink
      to="/equipe"
      onClick={onNavigate}
      className="bg-gradient-to-tr from-primary to-fuchsia-600 text-primary-foreground rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] block"
    >
      <div className="flex items-center gap-3">
        <Rocket className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col items-start leading-tight">
          <div className="text-sm font-semibold">Equipe: {teamName}</div>
          <div className="text-xs opacity-90">Plano: {planName}</div>
        </div>
      </div>
    </NavLink>
  );
}

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  
  // No desktop, a sidebar é sempre fixa e não colapsa
  const collapsed = false;

  const handleMobileNavigate = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const sidebarContent = () => (
    <>
      <div className="p-4 lg:p-6">
        <img
          src={logoCreator}
          alt="Creator Logo"
          className="h-6 lg:h-8 w-auto"
        />
      </div>
      
      <div className="p-3 lg:p-4 flex-1 flex flex-col">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navLinks.map((link) => (
                <NavItem key={link.href} {...link} collapsed={collapsed} onNavigate={handleMobileNavigate} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="space-y-2 lg:space-y-3 mt-4 lg:mt-6">
          {actionButtons.map((button) => (
              <ActionButton key={button.id} {...button} collapsed={collapsed} onNavigate={handleMobileNavigate} />
          ))}
        </div>

        <div className="flex-grow"></div>

        <TeamPlanSection
          teamName="LeFil"
          planName="LEFIL"
          collapsed={collapsed}
          onNavigate={handleMobileNavigate}
        />
      </div>
    </>
  );

  // No mobile/tablet, renderiza um Sheet em vez da Sidebar normal
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-background">
          <div className="h-full flex flex-col">
            {sidebarContent()}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: renderiza a Sidebar normal sempre fixa
  return (
    <Sidebar 
      className="w-64 border-r border-primary/20" 
      collapsible="none"
      side="left"
      variant="sidebar"
    >
      <SidebarContent className="bg-background flex flex-col h-full">
        {sidebarContent()}
      </SidebarContent>
    </Sidebar>
  );
}