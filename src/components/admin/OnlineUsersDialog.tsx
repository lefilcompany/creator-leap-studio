import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OnlineUser {
  oderId: string;
  name: string;
  email: string;
  onlineAt: string;
}

interface OnlineUsersDialogProps {
  trigger: React.ReactNode;
}

export const OnlineUsersDialog = ({ trigger }: OnlineUsersDialogProps) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());

  // Update "now" every 30 seconds so time displays refresh
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("global-presence", {
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

        // Remove duplicates
        const uniqueUsers = users.reduce((acc, current) => {
          const existing = acc.find((item) => item.oderId === current.oderId);
          if (!existing) {
            acc.push(current);
          }
          return acc;
        }, [] as OnlineUser[]);

        setOnlineUsers(uniqueUsers);
        setIsConnected(true);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: user.name || "Usuário",
            email: user.email || "",
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return onlineUsers;
    const q = search.toLowerCase();
    return onlineUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [onlineUsers, search]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-500" />
            Usuários Online
            <Badge
              variant="secondary"
              className="ml-2 bg-emerald-500/10 text-emerald-600"
            >
              {onlineUsers.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        <ScrollArea className="h-[340px] pr-2">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">
                {onlineUsers.length === 0
                  ? "Nenhum usuário online"
                  : "Nenhum resultado para a busca"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.oderId}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    "bg-card hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.email || "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    <span>
                      {u.onlineAt
                        ? formatDistanceToNow(new Date(u.onlineAt), {
                            addSuffix: false,
                            locale: ptBR,
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
