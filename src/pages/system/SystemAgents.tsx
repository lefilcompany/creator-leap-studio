import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Play, Save, Bot, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";

const AGENTS = [
  { id: "calendar_briefing", label: "Briefing do Calendário" },
  { id: "calendar_items", label: "Pautas do Calendário" },
  { id: "copy_caption", label: "Legenda do Post" },
  { id: "image_briefing", label: "Briefing Visual da Imagem" },
  { id: "image_generation", label: "Geração de Imagem" },
  { id: "video_generation", label: "Geração de Vídeo" },
] as const;

type AgentId = typeof AGENTS[number]["id"];

interface SummaryRow {
  id: string;
  brand_id: string;
  agent_id: AgentId;
  style_summary: string | null;
  positive_rules: string[];
  negative_rules: string[];
  feedbacks_processed: number;
  last_revised_at: string | null;
  manually_edited: boolean;
}

interface BrandRow { id: string; name: string }

export default function SystemAgents() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [summaries, setSummaries] = useState<SummaryRow[]>([]);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, { pos: number; neg: number }>>({});
  const [editing, setEditing] = useState<SummaryRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: sums }, { data: bs }, { data: fbs }] = await Promise.all([
      supabase.from("agent_style_summaries").select("*").order("updated_at", { ascending: false }),
      supabase.from("brands").select("id, name"),
      supabase.from("agent_feedback").select("agent_id, brand_id, rating"),
    ]);
    setSummaries((sums as any) || []);
    const bmap: Record<string, string> = {};
    (bs || []).forEach((b: any) => { bmap[b.id] = b.name; });
    setBrands(bmap);
    const counts: Record<string, { pos: number; neg: number }> = {};
    (fbs || []).forEach((f: any) => {
      const k = `${f.agent_id}::${f.brand_id}`;
      counts[k] = counts[k] || { pos: 0, neg: 0 };
      if (f.rating === "positive") counts[k].pos++;
      else if (f.rating === "negative") counts[k].neg++;
    });
    setFeedbackCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runReviser = async (body: any, msg: string) => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("revise-agent", { body });
      if (error) throw error;
      toast.success(`${msg} — ${data?.processed ?? 0} item(ns) processado(s)`);
      await load();
    } catch (e: any) {
      toast.error("Falha ao rodar revisor: " + (e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("agent_style_summaries")
      .update({
        style_summary: editing.style_summary,
        positive_rules: editing.positive_rules,
        negative_rules: editing.negative_rules,
        manually_edited: true,
      })
      .eq("id", editing.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo. Edição manual marcada — revisor não sobrescreve.");
    setEditing(null);
    load();
  };

  // Build a row per (brand, agent) that has either a summary or feedbacks
  const allKeys = new Set<string>([
    ...summaries.map((s) => `${s.agent_id}::${s.brand_id}`),
    ...Object.keys(feedbackCounts),
  ]);
  const rows = Array.from(allKeys).map((key) => {
    const [agent_id, brand_id] = key.split("::");
    const summary = summaries.find((s) => s.agent_id === agent_id && s.brand_id === brand_id);
    const fb = feedbackCounts[key] || { pos: 0, neg: 0 };
    return { agent_id: agent_id as AgentId, brand_id, summary, fb };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> Agente Revisor
          </h1>
          <p className="text-muted-foreground">
            Lê os feedbacks dos usuários e gera regras de estilo por marca x agente, injetadas no prompt.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin h-4 w-4 mr-2" : "h-4 w-4 mr-2"} />
            Recarregar
          </Button>
          <Button onClick={() => runReviser({ scanAll: true }, "Revisão completa concluída")} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Rodar revisor em tudo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Nenhum feedback ou resumo ainda. Conforme os usuários derem 👍/👎 nos conteúdos, eles aparecem aqui.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => {
            const agent = AGENTS.find((a) => a.id === r.agent_id);
            return (
              <Card key={`${r.agent_id}::${r.brand_id}`} className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        {agent?.label || r.agent_id}
                        <Badge variant="outline">{brands[r.brand_id] || "marca removida"}</Badge>
                        {r.summary?.manually_edited && (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Editado manualmente</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-3 mt-1 text-xs">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-emerald-600" />{r.fb.pos}</span>
                        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-rose-600" />{r.fb.neg}</span>
                        {r.summary?.last_revised_at && (
                          <span>Revisado em {new Date(r.summary.last_revised_at).toLocaleString("pt-BR")}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {r.summary && (
                        <Button size="sm" variant="outline" onClick={() => setEditing(r.summary!)}>Editar</Button>
                      )}
                      <Button size="sm" disabled={running}
                        onClick={() => runReviser({ agentId: r.agent_id, brandId: r.brand_id }, "Revisor rodado")}>
                        {running ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                        Rodar revisor
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {r.summary && (
                  <CardContent className="space-y-3 text-sm">
                    {r.summary.style_summary && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Resumo de estilo</p>
                        <p className="whitespace-pre-wrap">{r.summary.style_summary}</p>
                      </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 mb-1">SEMPRE FAZER</p>
                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                          {(r.summary.positive_rules || []).map((rule, i) => <li key={i}>{rule}</li>)}
                          {(r.summary.positive_rules || []).length === 0 && <li className="text-muted-foreground list-none">—</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-rose-700 mb-1">NUNCA FAZER</p>
                        <ul className="list-disc list-inside space-y-0.5 text-xs">
                          {(r.summary.negative_rules || []).map((rule, i) => <li key={i}>{rule}</li>)}
                          {(r.summary.negative_rules || []).length === 0 && <li className="text-muted-foreground list-none">—</li>}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar regras do agente</DialogTitle>
            <DialogDescription>
              Ao salvar, marcamos como “editado manualmente” e o revisor automático para de sobrescrever este registro.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold mb-1">Resumo de estilo</p>
                <Textarea rows={6} value={editing.style_summary || ""}
                  onChange={(e) => setEditing({ ...editing, style_summary: e.target.value })} />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-1">Sempre fazer (uma por linha)</p>
                <Textarea rows={5} value={(editing.positive_rules || []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, positive_rules: e.target.value.split("\n").filter(Boolean) })} />
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-700 mb-1">Nunca fazer (uma por linha)</p>
                <Textarea rows={5} value={(editing.negative_rules || []).join("\n")}
                  onChange={(e) => setEditing({ ...editing, negative_rules: e.target.value.split("\n").filter(Boolean) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
