import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface WorkspaceRow {
  id: string;
  name: string;
  owner_id: string;
  is_personal: boolean;
  credit_mode: 'personal' | 'shared';
  shared_credits: number;
  created_at: string;
  legacy_team_id: string | null;
  member_count?: number;
  owner_email?: string;
}

export default function SystemWorkspaces() {
  const [rows, setRows] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ws } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      const list = (ws || []) as any[];
      const ownerIds = [...new Set(list.map(w => w.owner_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', ownerIds);
      const emailMap = new Map((profiles || []).map((p: any) => [p.id, p.email]));

      const { data: members } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('status', 'active');
      const counts = new Map<string, number>();
      (members || []).forEach((m: any) => counts.set(m.workspace_id, (counts.get(m.workspace_id) || 0) + 1));

      setRows(list.map(w => ({
        ...w,
        owner_email: emailMap.get(w.owner_id),
        member_count: counts.get(w.id) || 0,
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.owner_email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">{rows.length} workspaces totais</p>
        </div>
        <Input
          placeholder="Buscar por nome ou e-mail do dono"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Dono</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Modo créditos</th>
              <th className="text-right p-3">Créditos compart.</th>
              <th className="text-right p-3">Membros</th>
              <th className="text-left p-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id} className="border-t hover:bg-muted/40">
                <td className="p-3 font-medium flex items-center gap-2">
                  {w.is_personal ? null : <Crown className="h-3 w-3 text-amber-500" />}
                  {w.name}
                </td>
                <td className="p-3 text-muted-foreground">{w.owner_email || w.owner_id.slice(0, 8)}</td>
                <td className="p-3">
                  <Badge variant={w.is_personal ? "secondary" : "default"}>
                    {w.is_personal ? "Pessoal" : "Equipe"}
                  </Badge>
                </td>
                <td className="p-3">
                  <Badge variant="outline">{w.credit_mode === 'shared' ? 'Compartilhado' : 'Pessoal'}</Badge>
                </td>
                <td className="p-3 text-right">{w.credit_mode === 'shared' ? w.shared_credits : '-'}</td>
                <td className="p-3 text-right flex items-center justify-end gap-1">
                  <Users className="h-3 w-3" /> {w.member_count}
                </td>
                <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
