import { Search, Bell, Settings, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full shadow-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        {/* Mobile sidebar trigger */}
        <div className="lg:hidden mr-4">
          <SidebarTrigger />
        </div>

        {/* Search bar - centered */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder="Pesquisar marcas, temas, personas..."
              className="pl-10 pr-4 bg-muted/50 border-muted focus:bg-background"
            />
          </div>
        </div>

        {/* Right side icons */}
        <div className="flex items-center gap-2 ml-4">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90">
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};