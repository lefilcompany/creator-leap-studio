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
    <div className="rounded-lg overflow-hidden shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="font-semibold">Equipe</TableHead>
            <TableHead className="font-semibold">Admin</TableHead>
            <TableHead className="font-semibold">Plano</TableHead>
            <TableHead className="text-right font-semibold">Créditos</TableHead>
            <TableHead className="text-center font-semibold">Membros</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                Nenhuma equipe encontrada
              </TableCell>
            </TableRow>
          ) : (
            teams.map((team, index) => (
              <TableRow 
                key={team.id}
                className={`hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                }`}
              >
                <TableCell className="font-medium">{team.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{team.admin_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.admin_email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-medium">{team.plan_name}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-primary">{team.credits}</span>
                    <span className="text-xs text-muted-foreground">
                      / {team.plan_credits}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold">{team.member_count}</span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(team.subscription_status)}>
                    {getStatusLabel(team.subscription_status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-medium">
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
