import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OnlineUser {
  oderId: string;
  name: string;
  email: string;
  onlineAt: string;
}

interface RecentActivity {
  type: string;
  count: number;
  lastAt: string;
}

export const AdminRealtimeStats = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recentActions, setRecentActions] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Set up presence channel
    const channel = supabase.channel("admin-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((presence) => {
            users.push({
              oderId: key,
              name: presence.name || "Usuário",
              email: presence.email || "",
              onlineAt: presence.onlineAt,
            });
          });
        });
        
        setOnlineUsers(users);
        setIsConnected(true);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: user.name,
            email: user.email,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    // Fetch recent actions count (last hour)
    const fetchRecentActions = async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { count } = await supabase
        .from("credit_history")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneHourAgo.toISOString());

      setRecentActions(count || 0);
    };

    fetchRecentActions();

    // Set up realtime listener for new actions
    const actionsChannel = supabase
      .channel("admin-actions-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_history",
        },
        () => {
          setRecentActions((prev) => prev + 1);
        }
      )
      .subscribe();

    // Refresh actions count every minute
    const interval = setInterval(fetchRecentActions, 60000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(actionsChannel);
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="flex items-center gap-2">
      {/* Online Users */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="relative">
              <Users className="h-4 w-4 text-emerald-500" />
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted"
                )}
              />
            </div>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {onlineUsers.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold text-sm">Usuários Online</p>
            {onlineUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum usuário online</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {onlineUsers.slice(0, 5).map((u) => (
                  <div key={u.oderId} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="truncate">{u.name}</span>
                  </div>
                ))}
                {onlineUsers.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{onlineUsers.length - 5} mais
                  </p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Recent Activity */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {recentActions}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="space-y-1">
            <p className="font-semibold text-sm">Atividade Recente</p>
            <p className="text-xs text-muted-foreground">
              {recentActions} ações na última hora
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
