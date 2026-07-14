import { SystemLogsTable } from "@/components/admin/SystemLogsTable";
import { OverlayFailuresCard } from "@/components/admin/OverlayFailuresCard";

const AdminLogs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Logs do Sistema</h1>
        <p className="text-muted-foreground">
          Monitore atividades e erros da plataforma
        </p>
      </div>

      <OverlayFailuresCard />

      <SystemLogsTable />
    </div>
  );
};

export default AdminLogs;

