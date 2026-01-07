import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogsDialog } from "./UserLogsDialog";
import { format } from "date-fns";

// Format seconds to human readable duration
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}min`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
};

interface User {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  created_at: string;
  team_name: string | null;
  credits: number | null;
  plan_id: string | null;
  plan_name: string | null;
  role: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  avatar_url: string | null;
  tutorial_completed: boolean | null;
  updated_at: string | null;
  actions_count: number;
  total_credits_used: number;
  last_action_at: string | null;
  subscription_status: string | null;
  last_online_at: string | null;
  total_session_seconds: number;
}

interface UsersTableProps {
  users: User[];
}

export const UsersTable = ({ users }: UsersTableProps) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };
  return (
    <>
    <div className="rounded-lg overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Usuário</TableHead>
            <TableHead className="font-semibold">Contato</TableHead>
            <TableHead className="font-semibold">Equipe</TableHead>
            <TableHead className="font-semibold">Plano</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="text-right font-semibold">Créditos</TableHead>
            <TableHead className="text-right font-semibold">Ações</TableHead>
            <TableHead className="text-right font-semibold">Créditos Usados</TableHead>
            <TableHead className="font-semibold">Último Online</TableHead>
            <TableHead className="text-right font-semibold">Tempo Total</TableHead>
            <TableHead className="font-semibold">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-12">
                Nenhum usuário encontrado
              </TableCell>
            </TableRow>
          ) : (
            users.map((user, index) => (
              <TableRow 
                key={user.id}
                onClick={() => handleUserClick(user)}
                className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                }`}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user.name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>
                    <p className="text-muted-foreground">{user.phone || "-"}</p>
                    {(user.city || user.state) && (
                      <p className="text-xs text-muted-foreground">
                        {user.city && user.state ? `${user.city}, ${user.state}` : user.state || user.city}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.team_name ? (
                    <span className="text-sm font-medium">{user.team_name}</span>
                  ) : (
                    <Badge variant="outline" className="bg-muted">
                      Sem equipe
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.plan_name ? (
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit">{user.plan_name}</Badge>
                      {user.subscription_status && (
                        <span className={`text-xs ${
                          user.subscription_status === 'active' ? 'text-green-600' : 
                          user.subscription_status === 'trialing' ? 'text-blue-600' : 
                          'text-muted-foreground'
                        }`}>
                          {user.subscription_status === 'active' ? 'Ativo' :
                           user.subscription_status === 'trialing' ? 'Trial' :
                           user.subscription_status === 'canceled' ? 'Cancelado' :
                           user.subscription_status}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.role === "admin" ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-medium">
                      Admin
                    </Badge>
                  ) : user.role === "member" ? (
                    <Badge variant="outline" className="font-medium">Membro</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted">
                      N/A
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.credits !== null ? (
                    <span className="font-bold text-primary">{user.credits.toLocaleString('pt-BR')}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{user.actions_count.toLocaleString('pt-BR')}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium text-amber-600">{user.total_credits_used.toLocaleString('pt-BR')}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.last_online_at ? (
                    format(new Date(user.last_online_at), "dd/MM/yyyy HH:mm")
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {user.total_session_seconds > 0 ? (
                    <span className="font-medium text-blue-600">
                      {formatDuration(user.total_session_seconds)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium">
                  {format(new Date(user.created_at), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    
    <UserLogsDialog
      user={selectedUser}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    />
    </>
  );
};
