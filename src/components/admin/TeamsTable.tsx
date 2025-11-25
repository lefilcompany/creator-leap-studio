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

interface Team {
  id: string;
  name: string;
  credits: number;
  plan_id: string;
  subscription_status: string | null;
  created_at: string;
  subscription_period_end: string | null;
  plan_name: string;
  plan_credits: number;
  admin_name: string;
  admin_email: string;
  member_count: number;
}

interface TeamsTableProps {
  teams: Team[];
}

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "trialing":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "expired":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    case "canceled":
      return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case "active":
      return "Ativo";
    case "trialing":
      return "Trial";
    case "expired":
      return "Expirado";
    case "canceled":
      return "Cancelado";
    default:
      return "Desconhecido";
  }
};

export const TeamsTable = ({ teams }: TeamsTableProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Equipe</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead className="text-right">Créditos</TableHead>
            <TableHead className="text-center">Membros</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhuma equipe encontrada
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{team.admin_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.admin_email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{team.plan_name}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{team.credits}</span>
                    <span className="text-xs text-muted-foreground">
                      / {team.plan_credits}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">{team.member_count}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(team.subscription_status)}>
                    {getStatusLabel(team.subscription_status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(team.created_at), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
