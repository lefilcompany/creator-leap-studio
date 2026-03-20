import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Home, Tag, Users, Calendar, History, Sparkles, CheckCircle, Palette, Coins, UsersRound, FolderOpen, ChevronRight } from "lucide-react";
import { Sidebar, SidebarContent, SidebarRail, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useCategories } from "@/hooks/useCategories";
import logoCreatorPreta from "@/assets/logoCreatorPreta.png";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";
import creatorSymbol from "@/assets/creator-symbol.png";
import { SidebarTaskIndicator } from "@/components/SidebarTaskIndicator";

function NavItem({
  id,
  href,
  icon: Icon,
  label,
  collapsed,
  onNavigate,
  disabled
}: {
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
      <div className={cn(
        "flex items-center gap-4 p-2.5 rounded-lg cursor-not-allowed opacity-50",
        collapsed ? "justify-center" : "",
        "text-muted-foreground bg-white/20 dark:bg-white/5"
      )}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
      </div>
    );
  }

  const linkContent = (
    <NavLink
      id={id}
      to={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-4 p-2.5 rounded-lg transition-colors duration-300 ease-in-out",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-white/70 dark:bg-white/10 text-primary shadow-sm"
          : "text-foreground/70 hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right"><p>{label}</p></TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function ActionButton({
  id,
  href,
  icon: Icon,
  label,
  collapsed,
  variant,
  onNavigate,
  disabled
}: {
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
      active: "bg-background border border-primary text-primary shadow-lg",
      inactive: "bg-primary text-primary-foreground hover:bg-background hover:text-primary hover:border hover:border-primary"
    },
    accent: {
      active: "bg-background border border-accent text-accent shadow-lg",
      inactive: "bg-accent text-accent-foreground hover:bg-background hover:text-accent hover:border hover:border-accent"
    },
    secondary: {
      active: "bg-background border border-secondary text-secondary shadow-lg",
      inactive: "bg-secondary text-secondary-foreground hover:bg-background hover:text-secondary hover:border hover:border-secondary"
    }
  };

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg cursor-not-allowed opacity-50",
        collapsed ? "justify-center" : "",
        "bg-muted text-muted-foreground"
      )}>
        <Icon className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-sm">{label}</span>}
      </div>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
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
        "flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ease-in-out hover:scale-105",
        collapsed ? "justify-center" : "",
        isActive ? variantClasses[variant].active : variantClasses[variant].inactive
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span className="font-medium text-sm">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right"><p>{label}</p></TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function CategoriesDropdown({ collapsed, onNavigate, disabled }: { collapsed: boolean; onNavigate?: () => void; disabled?: boolean }) {
  const location = useLocation();
  const { myCategories, sharedCategories } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = location.pathname.startsWith('/categories');

  const MAX_SHOWN = 5;

  if (disabled) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-2.5 rounded-lg cursor-not-allowed opacity-50",
        collapsed ? "justify-center" : "",
        "text-muted-foreground bg-white/20 dark:bg-white/5"
      )}>
        <FolderOpen className="h-5 w-5 flex-shrink-0" />
        {!collapsed && <span className="font-medium text-sm">Categorias</span>}
      </div>
    );
  }

  if (collapsed) {
    const linkContent = (
      <NavLink
        id="nav-categories"
        to="/categories"
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-center p-2.5 rounded-lg transition-colors duration-300 ease-in-out",
          isActive
            ? "bg-white/70 dark:bg-white/10 text-primary shadow-sm"
            : "text-foreground/70 hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground"
        )}
      >
        <FolderOpen className="h-5 w-5 flex-shrink-0" />
      </NavLink>
    );
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right"><p>Categorias</p></TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className={cn(
        "w-full flex items-center gap-4 p-2.5 rounded-lg transition-colors duration-300 ease-in-out",
        isActive
          ? "bg-white/70 dark:bg-white/10 text-primary shadow-sm"
          : "text-foreground/70 hover:bg-white/40 dark:hover:bg-white/10 hover:text-foreground"
      )}>
        <FolderOpen className="h-5 w-5 flex-shrink-0" />
        <span className="font-medium text-sm flex-1 text-left">Categorias</span>
        <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")} />
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
        {/* My Categories */}
        {myCategories.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2.5 pt-2 pb-1">Minhas</p>
            {myCategories.slice(0, MAX_SHOWN).map(cat => (
              <NavLink
                key={cat.id}
                to={`/categories/${cat.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                  location.pathname === `/categories/${cat.id}`
                    ? "bg-white/60 dark:bg-white/10 text-foreground font-medium"
                    : "text-foreground/60 hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="truncate">{cat.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {/* Shared Categories */}
        {sharedCategories.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2.5 pt-2 pb-1">Compartilhadas</p>
            {sharedCategories.slice(0, MAX_SHOWN).map(cat => (
              <NavLink
                key={cat.id}
                to={`/categories/${cat.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
                  location.pathname === `/categories/${cat.id}`
                    ? "bg-white/60 dark:bg-white/10 text-foreground font-medium"
                    : "text-foreground/60 hover:text-foreground hover:bg-white/30 dark:hover:bg-white/5"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="truncate">{cat.name}</span>
              </NavLink>
            ))}
          </>
        )}

        {myCategories.length === 0 && sharedCategories.length === 0 && (
          <p className="text-xs text-muted-foreground/50 px-2.5 py-2">Nenhuma categoria</p>
        )}

        {/* View All link */}
        <NavLink
          to="/categories"
          onClick={onNavigate}
          className="flex items-center px-2.5 py-1.5 text-xs text-primary hover:underline font-medium"
        >
          Ver todas
        </NavLink>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { user, isTrialExpired } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const logo = theme === 'dark' ? logoCreatorBranca : logoCreatorPreta;
  const collapsed = state === "collapsed";
  const isNavigationDisabled = isTrialExpired;

  const navLinks = [
    { id: "nav-dashboard", href: "/dashboard", icon: Home, label: t.sidebar.home },
    { id: "nav-brands", href: "/brands", icon: Tag, label: t.sidebar.brands },
    { id: "nav-themes", href: "/themes", icon: Palette, label: t.sidebar.themes },
    { id: "nav-personas", href: "/personas", icon: Users, label: t.sidebar.personas },
    { id: "nav-history", href: "/history", icon: History, label: t.sidebar.history },
  ];

  const postCategoryLinks = [
    { id: "nav-team", href: "/team", icon: UsersRound, label: t.sidebar.team },
  ];

  const actionButtons = [
    { id: "nav-create-content", href: "/create", icon: Sparkles, label: t.sidebar.createContent, variant: "primary" as const },
    { id: "nav-review-content", href: "/review", icon: CheckCircle, label: t.sidebar.reviewContent, variant: "accent" as const },
    { id: "nav-plan-content", href: "/plan", icon: Calendar, label: t.sidebar.planContent, variant: "secondary" as const },
  ];

  const handleMobileNavigate = () => {
    if (isMobile) setOpen(false);
  };

  const sidebarContent = () => (
    <TooltipProvider>
      {/* Logo */}
      <div className="pt-4 pb-2 mb-2 px-2 flex items-center justify-center">
        <NavLink
          to="/dashboard"
          onClick={handleMobileNavigate}
          id="sidebar-logo"
          className="flex justify-center cursor-pointer hover:opacity-80 transition-opacity duration-300"
        >
          {collapsed ? (
            <img src={creatorSymbol} alt="Creator Symbol" className="h-10 w-10 object-contain" />
          ) : (
            <img src={logo} alt="Creator Logo" className="h-8 w-auto" />
          )}
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
        collapsed ? "gap-3 px-2" : "gap-5 px-4"
      )}>
        <div className="flex flex-col gap-1.5">
          {navLinks.map(link => (
            <NavItem
              key={link.href}
              {...link}
              collapsed={collapsed}
              onNavigate={handleMobileNavigate}
              disabled={isNavigationDisabled && link.id !== "nav-history"}
            />
          ))}

          {/* Categories Dropdown */}
          <CategoriesDropdown
            collapsed={collapsed}
            onNavigate={handleMobileNavigate}
            disabled={isNavigationDisabled}
          />

          {postCategoryLinks.map(link => (
            <NavItem
              key={link.href}
              {...link}
              collapsed={collapsed}
              onNavigate={handleMobileNavigate}
              disabled={isNavigationDisabled}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {actionButtons.map(button => (
            <ActionButton
              key={button.id}
              {...button}
              collapsed={collapsed}
              onNavigate={handleMobileNavigate}
              disabled={isNavigationDisabled}
            />
          ))}
        </div>

        {/* Background Tasks */}
        {user && (
          <div className="mt-auto mb-2 flex flex-col gap-2.5">
            <SidebarTaskIndicator collapsed={collapsed} />
          </div>
        )}
      </nav>

      {/* Credits - fixed at bottom */}
      {user && (
        <div className={cn("flex-shrink-0 pb-5", collapsed ? "px-2" : "px-4")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  id="nav-credits"
                  to="/credits"
                  onClick={handleMobileNavigate}
                  className="flex items-center justify-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
                >
                  <Coins className="h-5 w-5 flex-shrink-0" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm">{user.credits || 0} créditos</span>
                  <span className="text-xs opacity-80">Clique para comprar</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              id="nav-credits"
              to="/credits"
              onClick={handleMobileNavigate}
              className="flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out hover:scale-105 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
            >
              <Coins className="h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold text-sm">{user.credits || 0} créditos</span>
                <span className="text-xs opacity-80">Comprar mais</span>
              </div>
            </NavLink>
          )}
        </div>
      )}
    </TooltipProvider>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-[var(--layout-bg)] shadow-md shadow-primary/20">
          <div className="h-full flex flex-col">{sidebarContent()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      side="left"
      variant="sidebar"
      className="border-none shadow-none flex-shrink-0"
    >
      <SidebarContent className="bg-transparent flex flex-col h-full overflow-y-auto">
        {sidebarContent()}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
