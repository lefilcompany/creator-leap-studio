import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}

interface UsersTableProps {
  users: User[];
}

export const UsersTable = ({ users }: UsersTableProps) => {
  return (
    <div className="rounded-lg overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Nome</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Equipe</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="text-right font-semibold">Créditos da Equipe</TableHead>
            <TableHead className="font-semibold">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                Nenhum usuário encontrado
              </TableCell>
            </TableRow>
          ) : (
            users.map((user, index) => (
              <TableRow 
                key={user.id}
                className={`hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                }`}
              >
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.email}
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
                <TableCell className="text-sm text-muted-foreground font-medium">
                  {format(new Date(user.created_at), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
