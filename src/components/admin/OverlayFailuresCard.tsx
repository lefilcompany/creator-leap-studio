import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Small observability card for the client-side overlay pipeline.
// Surfaces how many actions ended up with overlay_status='failed' in
// the last 24h/7d so operators can spot regressions in the browser-side
// Canvas 2D composition without opening the database.

interface OverlayFailureRow {
  id: string;
  created_at: string;
  user_id: string;
  overlay_status: string | null;
}

export function OverlayFailuresCard() {
  const [loading, setLoading] = useState(true);
  const [last24h, setLast24h] = useState(0);
  const [last7d, setLast7d] = useState(0);
  const [recent, setRecent] = useState<OverlayFailureRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [{ count: c24 }, { count: c7 }, { data: rows }] = await Promise.all([
        supabase.from("actions").select("id", { count: "exact", head: true })
          .eq("overlay_status", "failed").gte("created_at", since24h),
        supabase.from("actions").select("id", { count: "exact", head: true })
          .eq("overlay_status", "failed").gte("created_at", since7d),
        supabase.from("actions").select("id, created_at, user_id, overlay_status")
          .eq("overlay_status", "failed").order("created_at", { ascending: false }).limit(5),
      ]);

      setLast24h(c24 ?? 0);
      setLast7d(c7 ?? 0);
      setRecent((rows as OverlayFailureRow[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="rounded-2xl bg-card border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold">Falhas de overlay (Canvas 2D)</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">Últimas 24h</div>
          <div className="text-2xl font-bold">{last24h}</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">Últimos 7 dias</div>
          <div className="text-2xl font-bold">{last7d}</div>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-1 pt-1">
          <div className="font-medium">Mais recentes:</div>
          {recent.map((r) => (
            <div key={r.id} className="font-mono truncate">
              {new Date(r.created_at).toLocaleString("pt-BR")} — {r.id.slice(0, 8)}
            </div>
          ))}
        </div>
      )}

      {!loading && recent.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma falha registrada. ✅</p>
      )}
    </div>
  );
}
