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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Créditos da Equipe</TableHead>
            <TableHead>Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhum usuário encontrado
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.team_name ? (
                    <span className="text-sm">{user.team_name}</span>
                  ) : (
                    <Badge variant="outline" className="bg-muted">
                      Sem equipe
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.role === "admin" ? (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Admin
                    </Badge>
                  ) : user.role === "member" ? (
                    <Badge variant="outline">Membro</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted">
                      N/A
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.credits !== null ? (
                    <span className="font-semibold">{user.credits}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
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
