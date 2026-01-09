import { Menu, Moon, Sun, LogOut, User, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatorLogo } from "../CreatorLogo";
import { SystemRealtimeStats } from "./SystemRealtimeStats";
import { cn } from "@/lib/utils";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

export const SystemHeader = () => {
  const { setOpen, toggleSidebar, state } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const toggleSidebarMode = () => {
    toggleSidebar();
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md shadow-primary/20 bg-card/95 backdrop-blur-md border-b border-primary/10 transition-all duration-300 flex-shrink-0">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-4 lg:px-6 w-full">
        {/* Sidebar triggers */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar trigger */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(true)}
              className="h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 transition-all duration-200"
            >
              <Menu className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Desktop sidebar mode toggle */}
          <div className="hidden lg:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSidebarMode}
                  className={cn(
                    "h-10 w-10 rounded-xl transition-all duration-300 group relative",
                    "hover:bg-primary/20 text-muted-foreground hover:text-primary"
                  )}
                >
                  {state === "collapsed" ? (
                    <PanelLeftClose className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <PanelLeftOpen className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{state === "collapsed" ? "Expandir sidebar" : "Recolher sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* System badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Sistema
            </span>
          </div>

          {/* Realtime Stats */}
          <SystemRealtimeStats />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 transition-all duration-200 group"
          >
            <Sun className="h-4 w-4 md:h-5 md:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute h-4 w-4 md:h-5 md:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
            <span className="sr-only">Alternar tema</span>
          </Button>

          {/* Profile dropdown */}
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 p-0"
                >
                  <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-primary/20 hover:border-primary/40 transition-all">
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || "System Admin"} />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-secondary text-primary-foreground text-xs md:text-sm font-semibold">
                      {user?.name ? (
                        user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .substring(0, 2)
                      ) : (
                        <User className="h-4 w-4 md:h-5 md:w-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-xl">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium">{user?.name || "System Admin"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/dashboard" className="flex items-center">
                    <PanelLeftOpen className="mr-3 h-4 w-4" />
                    <span>Ir para o App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 p-3 cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout confirmation dialog */}
            <DialogContent className="border-border/20 shadow-2xl rounded-2xl">
              <DialogHeader className="items-center text-center">
                <div className="mb-6">
                  <CreatorLogo />
                </div>
                <DialogTitle className="text-2xl font-bold">Sair do sistema?</DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Você será desconectado da sua conta.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-3 mt-6">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl h-12"
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-xl h-12"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
};