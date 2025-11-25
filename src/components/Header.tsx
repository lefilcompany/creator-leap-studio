import { useState, useRef, useEffect } from "react";
import { Search, Settings, User, Menu, Loader2, Info, FileText, Shield, LogOut, Moon, Sun, Gift, History, RefreshCw, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
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
import { CreatorLogo } from "./CreatorLogo";
import Notifications from "./Notifications";
import RedeemCouponDialog from "./team/RedeemCouponDialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { setOpen, isFixed, setIsFixed } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logout, isTrialExpired, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { resetAllTours } = useOnboarding();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  
  // Se o trial expirou, desabilita funcionalidades
  const isFunctionalityDisabled = isTrialExpired;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Focus search on mobile when opened
  useEffect(() => {
    if (showMobileSearch && searchRef.current) {
      setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    }
  }, [showMobileSearch]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowMobileSearch(true);
      }
      if (event.key === 'Escape' && showMobileSearch) {
        setShowMobileSearch(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMobileSearch]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length >= 2) {
      setIsSearching(true);
      // Simulate search delay
      setTimeout(() => {
        setIsSearching(false);
      }, 1000);
    } else {
      setIsSearching(false);
    }
  };

  const toggleSidebarMode = () => {
    const newIsFixed = !isFixed;
    setIsFixed(newIsFixed);
    if (newIsFixed) {
      setOpen(true); // Expande ao fixar
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-md shadow-primary/20 bg-card/95 backdrop-blur-md border-b border-primary/10 transition-all duration-300 animate-fade-in flex-shrink-0">
      <div className="flex h-14 md:h-16 lg:h-20 items-center justify-between px-3 md:px-4 lg:px-6 xl:px-8 w-full">
        {/* Sidebar triggers */}
        <div className="flex items-center gap-2">
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
                    isFixed 
                      ? "bg-primary/15 hover:bg-primary/25 text-primary border-2 border-primary/30" 
                      : "hover:bg-muted text-muted-foreground border-2 border-transparent hover:border-primary/20"
                  )}
                >
                  <div className="relative">
                    {isFixed ? (
                      <PanelLeftOpen className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    )}
                  </div>
                  <span className="sr-only">
                    {isFixed ? "Desativar modo fixo" : "Ativar modo fixo"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="flex flex-col gap-1.5">
                  <p className="font-semibold text-sm">
                    {isFixed ? "🔒 Modo Fixo Ativado" : "🔓 Modo Retrátil Ativado"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isFixed 
                      ? "A sidebar permanece sempre visível. Clique para alternar para o modo retrátil." 
                      : "A sidebar se expande ao passar o mouse. Clique para fixá-la permanentemente."}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
          {/* Search bar - Desktop only */}
        <div id="topbar-search" className="hidden lg:flex flex-1 max-w-2xl mx-4 lg:mx-6">
          <div className="relative w-full group">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 lg:h-5 lg:w-5 z-10 transition-colors duration-200" />
            {isSearching && (
              <Loader2 className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-spin z-10" />
            )}
            <Input
              type="search"
              placeholder={t.search.placeholder}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              disabled={isFunctionalityDisabled}
              className={`w-full rounded-xl lg:rounded-2xl pl-10 lg:pl-12 pr-3 lg:pr-4 py-2 lg:py-3 h-10 text-sm lg:text-base border-2 bg-background/50 transition-all duration-200 hover:bg-background focus:bg-background disabled:opacity-50 disabled:cursor-not-allowed ${
                isSearching 
                  ? 'border-primary/50 shadow-md' 
                  : 'border-border/50 hover:border-primary/30 focus:border-primary/50'
              }`}
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileSearch(true)}
            disabled={isFunctionalityDisabled}
            className="lg:hidden h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span className="sr-only">{t.search.searchContent}</span>
          </Button>

          {/* Coupon button */}
          <Button
            id="topbar-coupon"
            variant="outline"
            size="sm"
            onClick={() => setShowCouponDialog(true)}
            className="h-8 md:h-10 px-2 lg:px-3 rounded-lg hover:bg-primary/10 transition-all duration-200 border-2 border-primary/30 hover:border-primary/50 group"
          >
            <span className="hidden lg:inline text-sm font-medium bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent mr-2">Cupom de presente</span>
            <Gift className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </Button>

          {/* Theme toggle button */}
          <Button
            id="topbar-theme"
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 group"
          >
            <Sun className="h-4 w-4 md:h-5 md:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground group-hover:animate-[sun-rays_0.6s_ease-in-out] dark:group-hover:animate-none" />
            <Moon className="absolute h-4 w-4 md:h-5 md:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground dark:group-hover:animate-[moon-glow_0.6s_ease-in-out]" />
            <span className="sr-only">{t.theme.toggle}</span>
          </Button>

          {/* Notifications */}
          <Notifications />

          {/* Settings dropdown */}
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="topbar-settings"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 md:h-10 md:w-10 rounded-lg xl:rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 group"
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground group-hover:animate-[gear-spin_0.3s_ease-in-out]" />
                  <span className="sr-only">{t.settings.title}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-border/20 shadow-xl animate-scale-in">
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/about" className="flex items-center">
                    <Info className="mr-3 h-4 w-4" />
                    <span>{t.settings.about}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/contact" className="flex items-center">
                    <FileText className="mr-3 h-4 w-4" />
                    <span>Entre em Contato</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/privacy" className="flex items-center">
                    <Shield className="mr-3 h-4 w-4" />
                    <span>{t.settings.privacy}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/history" className="flex items-center">
                    <History className="mr-3 h-4 w-4" />
                    <span>Histórico</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="p-3 cursor-pointer" 
                  onClick={() => {
                    resetAllTours();
                    toast({
                      title: "Tours reiniciados",
                      description: "Todos os tours de apresentação foram reiniciados. Visite cada página para vê-los novamente.",
                      duration: 5000,
                    });
                  }}
                >
                  <RefreshCw className="mr-3 h-4 w-4" />
                  <span>Refazer Tours</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 p-3 cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>{t.settings.logout}</span>
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout confirmation dialog */}
            <DialogContent className="border-border/20 shadow-2xl animate-scale-in rounded-2xl">
              <DialogHeader className="items-center text-center">
                <div className="mb-6">
                  <CreatorLogo />
                </div>
                <DialogTitle className="text-2xl font-bold">{t.settings.logoutConfirm}</DialogTitle>
                <DialogDescription className="text-base mt-2">
                  {t.settings.logoutMessage}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-3 mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full rounded-xl hover:border-accent hover:bg-accent/20 hover:text-accent h-12">
                    {t.settings.cancel}
                  </Button>
                </DialogClose>
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="w-full rounded-xl h-12"
                  onClick={handleLogout}
                >
                  {t.settings.logout}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile button */}
          <Link to="/profile" className="transition-all duration-300 hover:scale-105">
            <Avatar id="topbar-profile" className="h-8 w-8 md:h-10 md:w-10 border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/25">
              <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name || 'User'} />
              <AvatarFallback className="bg-gradient-to-br from-primary via-primary/80 to-secondary text-primary-foreground text-xs md:text-sm font-semibold">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : <User className="h-4 w-4 md:h-5 md:w-5" />}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">{t.profile}</span>
          </Link>
        </div>
      </div>

      {/* Mobile Search Dialog */}
      <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
        <DialogContent className="max-w-[95vw] w-full p-0 gap-0 border-border/20 shadow-2xl animate-scale-in">
          <DialogHeader className="p-4 pb-3 border-b border-border/20">
            <DialogTitle className="text-left text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              {t.search.searchContent}
            </DialogTitle>
          </DialogHeader>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary z-10" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-spin z-10" />
              )}
              <Input
                ref={searchRef}
                placeholder={t.search.placeholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 h-12 text-base bg-muted/50 border-border/50 rounded-xl 
                  focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/20 
                  transition-all duration-200"
              />
            </div>

            {/* Mobile search results placeholder */}
            {searchQuery.trim().length >= 2 && (
              <div className="mt-4 p-8 text-center">
                {isSearching ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-primary animate-spin mr-3" />
                    <span className="text-muted-foreground">{t.search.searching}</span>
                  </div>
                ) : (
                  <div>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">{t.search.noResults}</p>
                    <p className="text-sm text-muted-foreground/70">
                      {t.search.tryDifferent}
                    </p>
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim().length === 0 && (
              <div className="mt-4 p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">{t.search.startSearching}</p>
                <p className="text-sm text-muted-foreground/70">
                  {t.search.minCharacters}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Redeem Coupon Dialog */}
      <RedeemCouponDialog
        open={showCouponDialog}
        onOpenChange={setShowCouponDialog}
        onSuccess={() => {
          setShowCouponDialog(false);
        }}
        currentPlanId={user?.teamId || ''}
      />
    </header>
  );
};