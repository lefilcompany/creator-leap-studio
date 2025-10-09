import { useState, useRef, useEffect } from "react";
import { Search, Settings, User, Menu, Loader2, Info, FileText, Shield, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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

export const Header = () => {
  const { setOpen } = useSidebar();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { logout, isTrialExpired } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  
  // Se o trial expirou, desabilita funcionalidades
  const isFunctionalityDisabled = isTrialExpired;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
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

  return (
    <header className="sticky top-0 z-50 w-full shadow-md shadow-primary/20 bg-card/95 backdrop-blur-md border-b border-primary/10 transition-all duration-300 animate-fade-in flex-shrink-0">
      <div className="flex h-14 md:h-16 lg:h-20 items-center justify-between px-3 md:px-4 lg:px-6 xl:px-8">
        {/* Mobile sidebar trigger - only on mobile/tablet */}
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
        
        {/* Search bar - Desktop only */}
        <div className="hidden lg:flex flex-1 max-w-2xl mx-4 lg:mx-6">
          <div className="relative w-full group">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 lg:h-5 lg:w-5 z-10 transition-colors duration-200" />
            {isSearching && (
              <Loader2 className="absolute right-3 lg:right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-spin z-10" />
            )}
            <Input
              type="search"
              placeholder="Pesquisar marcas, temas, personas..."
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
            <span className="sr-only">Pesquisar</span>
          </Button>

          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 md:h-10 md:w-10 rounded-lg hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 theme-rotate-animation"
          >
            <Sun className="h-4 w-4 md:h-5 md:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-muted-foreground" />
            <Moon className="absolute h-4 w-4 md:h-5 md:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-muted-foreground" />
            <span className="sr-only">Alternar tema</span>
          </Button>

          {/* Notifications */}
          <Notifications />

          {/* Settings dropdown */}
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 md:h-10 md:w-10 rounded-lg xl:rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 settings-spin-animation"
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <span className="sr-only">Configurações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-border/20 shadow-xl animate-scale-in">
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/about" className="flex items-center">
                    <Info className="mr-3 h-4 w-4" />
                    <span>Sobre o Creator</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer" asChild>
                  <Link to="/privacy" className="flex items-center">
                    <Shield className="mr-3 h-4 w-4" />
                    <span>Política de Privacidade</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 p-3 cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Sair da Conta</span>
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Logout confirmation dialog */}
            <DialogContent className="border-border/20 shadow-2xl animate-scale-in">
              <DialogHeader className="items-center text-center">
                <div className="mb-6">
                  <CreatorLogo />
                </div>
                <DialogTitle className="text-2xl font-bold">Você tem certeza que deseja sair?</DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Você precisará fazer login novamente para acessar sua conta e continuar criando conteúdo.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-3 mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="w-full rounded-xl hover:border-accent h-12">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="w-full rounded-xl h-12"
                  onClick={handleLogout}
                >
                  Sair da Conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile button */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 md:h-10 md:w-10 rounded-lg xl:rounded-xl bg-gradient-to-br from-primary via-primary/80 to-secondary text-primary-foreground
              transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25
              border-2 border-transparent hover:border-white/20"
          >
            <Link to="/profile">
              <User className="h-4 w-4 md:h-5 md:w-5" />
              <span className="sr-only">Perfil</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile Search Dialog */}
      <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 gap-0 border-border/20 shadow-2xl animate-scale-in">
          <DialogHeader className="p-4 pb-3 border-b border-border/20">
            <DialogTitle className="text-left text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Pesquisar Conteúdo
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
                placeholder="Digite para pesquisar marcas, temas, personas..."
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
                    <span className="text-muted-foreground">Pesquisando...</span>
                  </div>
                ) : (
                  <div>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">Nenhum resultado encontrado</p>
                    <p className="text-sm text-muted-foreground/70">
                      Tente pesquisar por diferentes palavras-chave
                    </p>
                  </div>
                )}
              </div>
            )}

            {searchQuery.trim().length === 0 && (
              <div className="mt-4 p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">Comece a pesquisar</p>
                <p className="text-sm text-muted-foreground/70">
                  Digite pelo menos 2 caracteres para ver os resultados
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};