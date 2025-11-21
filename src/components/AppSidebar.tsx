import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Zap,
  Coins
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import logoCreatorPreta from "@/assets/logoCreatorPreta.png";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";
import creatorSymbol from "@/assets/creator-symbol.png";

function NavItem({ id, href, icon: Icon, label, collapsed, onNavigate, disabled }: {
  id: string;
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
  disabled?: boolean;
}) {
  const location = useLocation();
  const isActive = location.pathname === href;

  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-not-allowed opacity-50",
          collapsed ? "justify-center" : "",
          "text-muted-foreground bg-background"
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && (
          <span className="font-medium text-sm transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-fade-in">
            {label}
          </span>
        )}
      </div>
    );
  }

  const linkContent = (
    <NavLink
      id={id}
      to={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-4 p-2.5 rounded-lg transition-colors duration-200 group",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground bg-background hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && (
        <span className="font-medium text-sm transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-fade-in">
          {label}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function ActionButton({ id, href, icon: Icon, label, collapsed, variant, onNavigate, disabled }: {
    id: string;
    href: string;
    icon: React.ElementType;
    label: string;
    collapsed: boolean;
    variant: 'primary' | 'secondary' | 'accent';
    onNavigate?: () => void;
    disabled?: boolean;
}) {
    const location = useLocation();
    const navigate = useNavigate();
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

    if (disabled) {
        return (
            <div
                className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-not-allowed opacity-50",
                    "bg-muted text-muted-foreground"
                )}
            >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                    <span className="font-medium text-sm transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-fade-in">
                        {label}
                    </span>
                )}
            </div>
        );
    }

    const handleClick = (e: React.MouseEvent) => {
        // Se já estiver na página, resetar com state
        if (isActive) {
            e.preventDefault();
            navigate(href, { state: { reset: true }, replace: true });
        }
        onNavigate?.();
    };

    const linkContent = (
        <NavLink
            id={id}
            to={href}
            onClick={handleClick}
            className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105",
                collapsed ? "justify-center" : "",
                isActive ? variantClasses[variant].active : variantClasses[variant].inactive
            )}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
                <span className="font-medium text-sm transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-fade-in">
                    {label}
                </span>
            )}
        </NavLink>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {linkContent}
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
}

function TeamPlanSection({ teamName, planName, collapsed, onNavigate, t }: {
  teamName: string;
  planName: string;
  collapsed: boolean;
  onNavigate?: () => void;
  t: any;
}) {
  if (collapsed) return null;

  return (
    <NavLink
      id="nav-team"
      to="/team"
      onClick={onNavigate}
      className="flex items-center gap-4 p-3 rounded-lg transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform hover:scale-105 bg-gradient-to-tr from-primary to-fuchsia-600 text-primary-foreground shadow-lg animate-fade-in"
    >
      <Rocket className="h-6 w-6 flex-shrink-0" />
      <div className="flex flex-col items-start leading-tight transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">
        <span className="font-bold text-sm">{t.sidebar.team}: {teamName}</span>
        <span className="text-xs text-primary-foreground/80">{t.sidebar.plan}: {planName}</span>
      </div>
    </NavLink>
  );
}

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { team, isTrialExpired } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const logo = theme === 'dark' ? logoCreatorBranca : logoCreatorPreta;
  
  // Verifica se a sidebar está colapsada no desktop
  const collapsed = state === "collapsed";
  
  // Se o trial expirou, desabilita navegação exceto histórico
  const isNavigationDisabled = isTrialExpired;

  const navLinks = [
    { id: "nav-dashboard", href: "/dashboard", icon: Home, label: t.sidebar.home },
    { id: "nav-brands", href: "/brands", icon: Tag, label: t.sidebar.brands },
    { id: "nav-themes", href: "/themes", icon: Palette, label: t.sidebar.themes },
    { id: "nav-personas", href: "/personas", icon: Users, label: t.sidebar.personas },
    { id: "nav-quick-content", href: "/quick-content", icon: Zap, label: t.sidebar.quickContent },
    { id: "nav-history", href: "/history", icon: History, label: t.sidebar.history },
  ];

  const actionButtons = [
      { id: "nav-create-content", href: "/create", icon: Sparkles, label: t.sidebar.createContent, variant: "primary" as const },
      { id: "nav-review-content", href: "/review", icon: CheckCircle, label: t.sidebar.reviewContent, variant: "accent" as const },
      { id: "nav-plan-content", href: "/plan", icon: Calendar, label: t.sidebar.planContent, variant: "secondary" as const },
  ];

  const handleMobileNavigate = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const sidebarContent = () => (
    <TooltipProvider>
      <NavLink 
        to="/dashboard" 
        onClick={handleMobileNavigate}
        id="sidebar-logo"
        className="pt-6 pb-2 mb-2 flex justify-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        {collapsed ? (
          <img
            src={creatorSymbol}
            alt="Creator Symbol"
            className="h-10 w-10 object-contain"
          />
        ) : (
          <img
            src={logo}
            alt="Creator Logo"
            className="h-8 w-auto"
          />
        )}
      </NavLink>
      
      <nav className={cn(
        "flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "gap-3 px-2" : "gap-5 px-4"
      )}>
        <div className="flex flex-col gap-1.5">
          {navLinks.map((link) => (
            <NavItem 
              key={link.href} 
              {...link} 
              collapsed={collapsed} 
              onNavigate={handleMobileNavigate}
              disabled={isNavigationDisabled && link.id !== "nav-history"}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {actionButtons.map((button) => (
            <ActionButton 
              key={button.id} 
              {...button} 
              collapsed={collapsed} 
              onNavigate={handleMobileNavigate}
              disabled={isNavigationDisabled}
            />
          ))}
        </div>

        {team && (
          <div className="mt-auto mb-3 flex flex-col gap-2.5">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    id="nav-credits"
                    to="/plans"
                    onClick={handleMobileNavigate}
                    className="flex items-center justify-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                  >
                    <Coins className="h-5 w-5 flex-shrink-0" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Comprar Créditos</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <NavLink
                id="nav-credits"
                to="/plans"
                onClick={handleMobileNavigate}
                className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
              >
                <Coins className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm">Comprar Créditos</span>
              </NavLink>
            )}
            
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    id="nav-team"
                    to="/team"
                    onClick={handleMobileNavigate}
                    className="flex items-center justify-center gap-4 p-3 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 bg-gradient-to-tr from-primary to-fuchsia-600 text-primary-foreground shadow-lg"
                  >
                    <Rocket className="h-6 w-6 flex-shrink-0" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-sm">{t.sidebar.team}: {team.name}</span>
                    <span className="text-xs opacity-80">{t.sidebar.plan}: {team.plan?.name || 'Free'}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <TeamPlanSection
                teamName={team.name}
                planName={team.plan?.name || 'Free'}
                collapsed={collapsed}
                onNavigate={handleMobileNavigate}
                t={t}
              />
            )}
          </div>
        )}
      </nav>
    </TooltipProvider>
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

  // Desktop: renderiza a Sidebar normal retrátil
  return (
    <Sidebar 
      collapsible="icon"
      side="left"
      variant="sidebar"
      className="border-r border-primary/10 shadow-md shadow-primary/20 data-[state=collapsed]:w-20"
    >
      <SidebarContent className="bg-card flex flex-col h-full overflow-y-auto">
        {sidebarContent()}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}