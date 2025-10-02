import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  Home,
  Tag,
  Users,
  Calendar,
  History,
  Sparkles,
  CheckCircle,
  Rocket,
  Palette,
  Zap
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import logoCreatorPreta from "@/assets/logoCreatorPreta.png";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";

const navLinks = [
  { id: "nav-home", href: "/dashboard", icon: Home, label: "Home" },
  { id: "nav-marcas", href: "/brands", icon: Tag, label: "Marcas" },
  { id: "nav-temas", href: "/themes", icon: Palette, label: "Temas Estratégicos" },
  { id: "nav-personas", href: "/personas", icon: Users, label: "Personas" },
  { id: "nav-historico", href: "/history", icon: History, label: "Histórico" },
];

const actionButtons = [
    { id: "nav-criar", href: "/create", icon: Sparkles, label: "Criar Conteúdo", variant: "primary" as const },
    { id: "nav-rapido", href: "/quick-content", icon: Zap, label: "Criação Rápida", variant: "primary" as const },
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
    <NavLink
      id={id}
      to={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 group",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground bg-background hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
    </NavLink>
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
            inactive: "bg-primary text-primary-foreground hover:bg-background hover:text-primary hover:border hover:border-primary",
        },
        accent: {
            active: "bg-background border border-accent text-accent shadow-lg scale-105",
            inactive: "bg-accent text-accent-foreground hover:bg-background hover:text-accent hover:border hover:border-accent",
        },
        secondary: {
            active: "bg-background border border-secondary text-secondary shadow-lg scale-105",
            inactive: "bg-secondary text-secondary-foreground hover:bg-background hover:text-secondary hover:border hover:border-secondary",
        },
    };

    return (
        <NavLink
            id={id}
            to={href}
            onClick={onNavigate}
            className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105",
                isActive ? variantClasses[variant].active : variantClasses[variant].inactive
            )}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">{label}</span>}
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
      to="/team"
      onClick={onNavigate}
      className="flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-gradient-to-tr from-primary to-fuchsia-600 text-primary-foreground shadow-lg"
    >
      <Rocket className="h-6 w-6 flex-shrink-0" />
      <div className="flex flex-col items-start leading-tight">
        <span className="font-bold text-sm">Equipe: {teamName}</span>
        <span className="text-xs text-primary-foreground/80">Plano: {planName}</span>
      </div>
    </NavLink>
  );
}

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { team } = useAuth();
  const { theme } = useTheme();
  const logo = theme === 'dark' ? logoCreatorBranca : logoCreatorPreta;
  
  // No desktop, a sidebar é sempre fixa e não colapsa
  const collapsed = false;

  const handleMobileNavigate = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const sidebarContent = () => (
    <>
      <NavLink 
        to="/dashboard" 
        onClick={handleMobileNavigate}
        className="pt-6 pb-2 mb-2 flex justify-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img
          src={logo}
          alt="Creator Logo"
          className="h-8 w-auto"
        />
      </NavLink>
      
      <nav className="flex-1 flex flex-col gap-6 px-4 overflow-hidden">
        <div className="flex flex-col gap-2">
          {navLinks.map((link) => (
            <NavItem key={link.href} {...link} collapsed={collapsed} onNavigate={handleMobileNavigate} />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {actionButtons.map((button) => (
            <ActionButton key={button.id} {...button} collapsed={collapsed} onNavigate={handleMobileNavigate} />
          ))}
        </div>

        {team && (
          <div className="mt-auto mb-4">
            <TeamPlanSection
              teamName={team.name}
              planName={team.plan?.name || 'Free'}
              collapsed={collapsed}
              onNavigate={handleMobileNavigate}
            />
          </div>
        )}
      </nav>
    </>
  );

  // No mobile/tablet, renderiza um Sheet em vez da Sidebar normal
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-card shadow-md shadow-primary/20">
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
      className="fixed left-0 top-0 h-screen w-64 border-r border-primary/10 shadow-md shadow-primary/20 z-40" 
      collapsible="none"
      side="left"
      variant="sidebar"
    >
      <SidebarContent className="bg-card flex flex-col h-full">
        {sidebarContent()}
      </SidebarContent>
    </Sidebar>
  );
}