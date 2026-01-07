import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
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
        "flex items-center gap-4 p-2.5 rounded-lg transition-all duration-300 ease-out group",
        collapsed ? "justify-center" : "",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground bg-background hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3 }}
          className="font-medium text-sm"
        >
          {label}
        </motion.span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function AdminSidebar() {
  const { state, open, setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  const logo = theme === "dark" ? logoCreatorBranca : logoCreatorPreta;
  const collapsed = state === "collapsed";

  const navLinks = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/plans", icon: CreditCard, label: "Planos" },
    { href: "/admin/teams", icon: Building2, label: "Equipes" },
    { href: "/admin/users", icon: Users, label: "Usuários" },
    { href: "/admin/logs", icon: ScrollText, label: "Logs do Sistema" },
  ];

  const handleLogout = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleMobileNavigate = () => {
    if (isMobile) {
      setOpen(false);
    }
  };

  const sidebarContent = () => (
    <TooltipProvider>
      {/* Header com Logo */}
      <div className="pt-4 pb-2 mb-2 px-2 flex items-center justify-center">
        <NavLink
          to="/admin"
          onClick={handleMobileNavigate}
          className="flex justify-center cursor-pointer hover:opacity-80 transition-opacity duration-500"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={collapsed ? "symbol" : "logo"}
              src={collapsed ? creatorSymbol : logo}
              alt={collapsed ? "Creator Symbol" : "Creator Logo"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={collapsed ? "h-10 w-10 object-contain" : "h-8 w-auto"}
            />
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Admin Badge */}
      {!collapsed && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">Painel Admin</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <motion.nav
        className={cn(
          "flex-1 flex flex-col overflow-y-auto overflow-x-hidden",
          collapsed ? "gap-3 px-2" : "gap-2 px-4"
        )}
      >
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
                  className="flex items-center justify-center gap-3 p-2.5 rounded-lg transition-all duration-300 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium text-sm">Sair</span>
            </button>
          )}
        </div>
      </motion.nav>
    </TooltipProvider>
  );

  // Mobile: Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-card shadow-md shadow-primary/20">
          <div className="h-full flex flex-col">{sidebarContent()}</div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Sidebar
  return (
    <Sidebar
      collapsible="icon"
      side="left"
      variant="sidebar"
      className="border-r border-primary/10 shadow-md shadow-primary/20 flex-shrink-0"
    >
      <SidebarContent className="bg-card flex flex-col h-full overflow-y-auto">
        {sidebarContent()}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
