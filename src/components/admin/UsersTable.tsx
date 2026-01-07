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

interface User {
  id: string;
  name: string;
  email: string;
  team_id: string | null;
  created_at: string;
  team_name: string | null;
  credits: number | null;
  plan_id: string | null;
  role: string | null;
  phone: string | null;
  state: string | null;
  city: string | null;
  avatar_url: string | null;
  tutorial_completed: boolean | null;
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
            <TableHead className="font-semibold">Localização</TableHead>
            <TableHead className="font-semibold">Equipe</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="text-right font-semibold">Créditos</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
                <TableCell className="text-sm text-muted-foreground">
                  {user.phone || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {user.city && user.state ? (
                    <span>{user.city}, {user.state}</span>
                  ) : user.state ? (
                    <span>{user.state}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
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
                    <span className="font-bold text-primary">{user.credits}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.tutorial_completed ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Pendente
                    </Badge>
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
