import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

interface AdminFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  plans: Array<{ id: string; name: string }>;
}

export const AdminFilters = ({
  searchQuery,
  onSearchChange,
  planFilter,
  onPlanFilterChange,
  statusFilter,
  onStatusFilterChange,
  plans,
}: AdminFiltersProps) => {
  const planOptions = [
    { value: "all", label: "Todos os planos" },
    ...plans.map((plan) => ({ value: plan.id, label: plan.name })),
  ];

  const statusOptions = [
    { value: "all", label: "Todos os status" },
    { value: "active", label: "Ativo" },
    { value: "trialing", label: "Trial" },
    { value: "expired", label: "Expirado" },
    { value: "canceled", label: "Cancelado" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <NativeSelect
        value={planFilter}
        onValueChange={onPlanFilterChange}
        options={planOptions}
        placeholder="Filtrar por plano"
        triggerClassName="w-full sm:w-[200px] h-10"
      />
      <NativeSelect
        value={statusFilter}
        onValueChange={onStatusFilterChange}
        options={statusOptions}
        placeholder="Filtrar por status"
        triggerClassName="w-full sm:w-[200px] h-10"
      />
    </div>
  );
};
