import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ContentResultSkeleton() {
  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-3 md:p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        
        {/* Header Skeleton */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          
          {/* Media Skeleton */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 border-t border-border/20 flex items-center gap-2">
                <Skeleton className="h-11 flex-1 rounded-xl" />
                <Skeleton className="h-11 w-11 rounded-xl" />
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
            </CardContent>
          </Card>

          {/* Caption Skeleton */}
          <Card className="backdrop-blur-sm bg-card/80 border border-border/20 shadow-lg rounded-2xl">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/20">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-32 rounded-xl" />
              </div>
              
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Button Skeleton */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-4 md:p-6">
            <Skeleton className="h-12 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
