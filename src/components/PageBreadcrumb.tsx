import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemType {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  state?: Record<string, unknown>;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItemType[];
  className?: string;
  variant?: "default" | "overlay";
}

export function PageBreadcrumb({ items, className, variant = "default" }: PageBreadcrumbProps) {
  const isOverlay = variant === "overlay";

  return (
    <Breadcrumb className={cn(
      isOverlay && "absolute top-4 left-4 sm:left-6 lg:left-8 z-10",
      className
    )}>
      <BreadcrumbList className={cn(
        isOverlay && "bg-black/15 backdrop-blur-[2px] rounded-lg px-3 py-1.5 [&_*]:text-white/90 [&_*]:drop-shadow-sm"
      )}>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/dashboard" 
              className={cn(
                "flex items-center transition-colors",
                isOverlay ? "hover:text-white" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Home className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <div key={index} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className={cn(
                    "font-medium flex items-center gap-1.5",
                    isOverlay ? "text-white" : "text-foreground"
                  )}>
                    {item.icon}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={item.href}
                      state={item.state}
                      className={cn(
                        "transition-colors flex items-center gap-1.5",
                        isOverlay ? "hover:text-white" : "text-muted-foreground hover:text-primary"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
