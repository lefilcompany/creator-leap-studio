import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  ScrollText, 
  Shield,
  LogOut,
  CreditCard
} from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarRail, 
  useSidebar 
} from "@/components/ui/sidebar";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import logoCreatorPreta from "@/assets/logoCreatorPreta.png";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";
import creatorSymbol from "@/assets/creator-symbol.png";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavItem({ href, icon: Icon, label, collapsed, onNavigate }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === href;

  const linkContent = (
    <NavLink
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

export function SystemSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  const logo = theme === "dark" ? logoCreatorBranca : logoCreatorPreta;
  const collapsed = state === "collapsed";

  const navLinks = [
    { href: "/system", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/system/plans", icon: CreditCard, label: "Planos" },
    { href: "/system/teams", icon: Building2, label: "Equipes" },
    { href: "/system/users", icon: Users, label: "Usuários" },
    { href: "/system/logs", icon: ScrollText, label: "Logs do Sistema" },
  ];

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleMobileNavigate = () => {
    if (isMobile) setOpen(false);
  };

  const sidebarContent = () => (
    <TooltipProvider>
      {/* Logo */}
      <div className="pt-4 pb-2 mb-2 px-2 flex items-center justify-center">
        <NavLink
          to="/system"
          onClick={handleMobileNavigate}
          className="flex justify-center cursor-pointer hover:opacity-80 transition-opacity duration-300"
        >
          {collapsed ? (
            <img src={creatorSymbol} alt="Creator Symbol" className="h-10 w-10 object-contain" />
          ) : (
            <img src={logo} alt="Creator Logo" className="h-8 w-auto" />
          )}
        </NavLink>
      </div>

      {/* System Admin Badge */}
      {!collapsed && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Sistema</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 flex flex-col overflow-y-auto overflow-x-hidden",
        collapsed ? "gap-3 px-2" : "gap-2 px-4"
      )}>
        <div className="flex flex-col gap-1.5">
          {navLinks.map((link) => (
            <NavItem
              key={link.href}
              {...link}
              collapsed={collapsed}
              onNavigate={handleMobileNavigate}
            />
          ))}
        </div>

        {/* Logout */}
        <div className="mt-auto mb-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-3 p-2.5 rounded-lg transition-colors duration-300 ease-in-out text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right"><p>Sair</p></TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-2.5 rounded-lg transition-colors duration-300 ease-in-out text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium text-sm">Sair</span>
            </button>
          )}
        </div>
      </nav>
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
