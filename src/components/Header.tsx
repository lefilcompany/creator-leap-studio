import { useState, useRef, useEffect } from "react";
import { Search, Bell, Settings, User, Menu, Loader2, Info, FileText, Shield, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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

export const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
    <header className="sticky top-0 z-50 w-full shadow-lg shadow-primary/10 bg-card/95 backdrop-blur-md border-b border-border/20 transition-all duration-300 animate-fade-in">
      <div className="flex h-16 md:h-20 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Mobile sidebar trigger */}
          <div className="lg:hidden">
            <SidebarTrigger />
          </div>

          {/* Logo - hidden on very small screens */}
          <div className="hidden min-[420px]:block lg:hidden">
            <CreatorLogo />
          </div>
        </div>

        {/* Search bar - Desktop only */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-6">
          <div className="relative w-full group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 z-10 transition-colors duration-200" />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-spin z-10" />
            )}
            <Input
              type="search"
              placeholder="Pesquisar marcas, temas, personas..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={`w-full rounded-2xl pl-12 pr-4 py-3 h-12 text-base border-2 bg-background/50 transition-all duration-200 hover:bg-background focus:bg-background ${
                isSearching 
                  ? 'border-primary/50 shadow-md' 
                  : 'border-border/50 hover:border-primary/30 focus:border-primary/50'
              }`}
            />
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 md:gap-3">
          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileSearch(true)}
            className="md:hidden h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">Pesquisar</span>
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20 relative"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {/* Notification badge */}
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full border-2 border-background animate-pulse"></div>
            <span className="sr-only">Notificações</span>
          </Button>

          {/* Settings dropdown */}
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-200 border border-transparent hover:border-primary/20"
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="sr-only">Configurações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-border/20 shadow-xl animate-scale-in">
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <Info className="mr-3 h-4 w-4" />
                  <span>Sobre o Creator</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <FileText className="mr-3 h-4 w-4" />
                  <span>Termos de Serviço</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer">
                  <Shield className="mr-3 h-4 w-4" />
                  <span>Política de Privacidade</span>
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
                  <Button type="button" variant="outline" className="w-full rounded-xl hover:border-primary border-2 h-12">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="button" variant="destructive" className="w-full rounded-xl h-12">
                  Sair da Conta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Profile button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-secondary text-primary-foreground
              transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25
              border-2 border-transparent hover:border-white/20"
          >
            <User className="h-5 w-5" />
            <span className="sr-only">Perfil</span>
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