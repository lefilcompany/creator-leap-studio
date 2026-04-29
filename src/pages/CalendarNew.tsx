import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, ArrowRight, CheckCircle2, Wand2, Plus, Trash2, Minus, Target, Compass, Coins, Lightbulb, Pencil } from "lucide-react";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { useBrands } from "@/hooks/useBrands";
import { usePersonas } from "@/hooks/usePersonas";
import { useThemes } from "@/hooks/useThemes";
import { useCreateCalendar } from "@/hooks/useCalendars";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

interface GeneratedItem {
  title: string;
  theme: string;
  scheduled_date: string;
  platform?: string;
  format?: string;
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
];

const FORMATS = [
  { value: "post", label: "Post (feed)" },
  { value: "carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels / Vídeo curto" },
  { value: "story", label: "Story" },
  { value: "video_longo", label: "Vídeo longo" },
  { value: "post_fixo", label: "Post fixo" },
];

const CalendarNew = () => {
  const navigate = useNavigate();
  const { data: brands = [] } = useBrands();
  const { data: personas = [] } = usePersonas();
  const { data: themes = [] } = useThemes();
  const createCalendar = useCreateCalendar();

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [personaId, setPersonaId] = useState<string>("");
  const [themeId, setThemeId] = useState<string>("");
  const [userInput, setUserInput] = useState("");
  const [count, setCount] = useState(8);
  const [referenceMonth, setReferenceMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [generating, setGenerating] = useState(false);
  const [suggestingBriefing, setSuggestingBriefing] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedPersona = personas.find((p) => p.id === personaId);
  const selectedTheme = themes.find((t) => t.id === themeId);

  // Para sugerir o briefing com IA, exigimos contexto completo
  const missingForSuggest: string[] = [];
  if (name.trim().length < 3) missingForSuggest.push("nome do calendário");
  if (!referenceMonth) missingForSuggest.push("mês de referência");
  if (!selectedBrand) missingForSuggest.push("marca");
  if (!selectedPersona) missingForSuggest.push("persona");
  if (!selectedTheme) missingForSuggest.push("editoria");
  const canSuggest = missingForSuggest.length === 0;

  const handleSuggestBriefing = async () => {
    if (!canSuggest) {
      toast.error(`Preencha antes: ${missingForSuggest.join(", ")}.`);
      return;
    }
    setSuggestingBriefing(true);
    try {
      const refDate = `${referenceMonth}-01`;
      const { data, error } = await supabase.functions.invoke("suggest-calendar-briefing", {
        body: {
          calendar_name: name,
          brand: selectedBrand
            ? {
                name: selectedBrand.name,
                segment: selectedBrand.segment,
                values: selectedBrand.values,
                keywords: selectedBrand.keywords,
              }
            : null,
          persona: selectedPersona
            ? {
                name: selectedPersona.name,
                main_goal: (selectedPersona as { main_goal?: string }).main_goal,
                challenges: selectedPersona.challenges,
              }
            : null,
          theme: selectedTheme
            ? { title: selectedTheme.title, description: selectedTheme.description }
            : null,
          reference_month: refDate,
          hint: userInput,
        },
      });
      if (error) {
        let msg = error.message;
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          } catch { /* ignore */ }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.briefing) {
        setUserInput(data.briefing);
        toast.success("Sugestão de briefing gerada!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar sugestão");
    } finally {
      setSuggestingBriefing(false);
    }
  };

  const canGenerate = name.trim().length >= 3 && userInput.trim().length >= 10;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error("Preencha o nome e o briefing do calendário.");
      return;
    }
    setGenerating(true);
    try {
      const refDate = `${referenceMonth}-01`;
      const { data, error } = await supabase.functions.invoke("generate-calendar", {
        body: {
          brand: selectedBrand
            ? {
                name: selectedBrand.name,
                segment: selectedBrand.segment,
                values: selectedBrand.values,
                keywords: selectedBrand.keywords,
              }
            : null,
          persona: selectedPersona
            ? {
                name: selectedPersona.name,
                main_goal: (selectedPersona as { main_goal?: string }).main_goal,
                challenges: selectedPersona.challenges,
              }
            : null,
          theme: selectedTheme
            ? { title: selectedTheme.title, description: selectedTheme.description }
            : null,
          user_input: userInput,
          reference_month: refDate,
          count,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedItems(data.items || []);
      toast.success(`${data.items.length} pautas geradas!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar pautas");
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = (index: number, patch: Partial<GeneratedItem>) => {
    setGeneratedItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const removeItem = (index: number) => {
    setGeneratedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const lastDate = generatedItems[generatedItems.length - 1]?.scheduled_date;
    const baseDate = lastDate
      ? new Date(lastDate)
      : new Date(`${referenceMonth}-15`);
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 2);
    setGeneratedItems((prev) => [
      ...prev,
      {
        title: "Nova pauta",
        theme: prev[prev.length - 1]?.theme || "Educativo",
        scheduled_date: next.toISOString().slice(0, 10),
        platform: prev[prev.length - 1]?.platform || "instagram",
        format: prev[prev.length - 1]?.format || "post",
      },
    ]);
  };

  const handleSave = async () => {
    if (generatedItems.length === 0) {
      toast.error("Gere ou adicione pelo menos uma pauta antes de salvar.");
      return;
    }
    const incomplete = generatedItems.find(
      (it) => !it.title.trim() || !it.scheduled_date || !it.platform || !it.format
    );
    if (incomplete) {
      toast.error("Preencha título, data, rede social e formato em todas as pautas.");
      return;
    }
    try {
      const cal = await createCalendar.mutateAsync({
        name,
        brand_id: brandId || null,
        persona_id: personaId || null,
        theme_id: themeId || null,
        user_input: userInput,
        reference_month: `${referenceMonth}-01`,
        items: generatedItems.map((it) => ({
          title: it.title,
          theme: it.theme,
          scheduled_date: it.scheduled_date,
          platform: it.platform || null,
          format: it.format || null,
        })),
      });
      navigate(`/calendar/${cal.id}`);
    } catch {
      // toast handled in hook
    }
  };

  const briefingSuggestions = [
    "Posicionar a marca como referência no segmento, mesclando bastidores e conteúdo educativo.",
    "Lançar um produto novo no mês, com foco em geração de desejo e prova social.",
    "Reforçar autoridade técnica e diferenciais frente à concorrência.",
    "Aproximar a marca do público com tom leve, conversacional e bastidores reais.",
  ];
  const countPresets = [4, 8, 12, 16];
  const stage = generatedItems.length > 0 ? 2 : 1;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <PageBreadcrumb items={[{ label: "Calendário", href: "/plan" }, { label: "Novo calendário" }]} />

      {/* Cabeçalho — assistente de configuração */}
      <div className="bg-gradient-to-br from-primary/10 via-card to-card rounded-2xl shadow-md p-6 md:p-8 border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-primary text-primary-foreground p-3 shadow-lg shadow-primary/20 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-primary/15 text-primary">
                Etapa {stage} de 2
              </span>
              <span>{stage === 1 ? "Configuração" : "Ajuste das pautas"}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              Vamos montar seu calendário com IA
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Defina o contexto da marca, o foco editorial e o briefing.
              A IA vai gerar pautas que você poderá revisar e ajustar antes de aprovar.
            </p>
          </div>
        </div>
      </div>

      {/* Bloco 1 — Contexto do calendário */}
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 text-primary h-8 w-8 flex items-center justify-center shrink-0 text-sm font-bold">
            1
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base">Contexto do calendário</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Essas escolhas ajudam a IA a definir linguagem, foco temático e calendário ideal.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do calendário *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Janeiro 2026 — Cerâmica Brennand"
              />
              <p className="text-xs text-muted-foreground">Sugestão: Mês + Ano + Marca ou tema central.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="month">Mês de referência</Label>
              <Input
                id="month"
                type="month"
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Define o período em que as pautas serão distribuídas.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Tom, valores e identidade.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Persona</Label>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {personas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Para quem a comunicação é direcionada.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Editoria</Label>
              <Select value={themeId} onValueChange={setThemeId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {themes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Eixo temático principal do mês.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bloco 2 — Direção editorial (briefing em destaque) */}
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 text-primary h-8 w-8 flex items-center justify-center shrink-0 text-sm font-bold">
            2
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base">Direção editorial</h2>
              <span className="text-[10px] uppercase font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                Mais importante
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              É o briefing que orienta a IA. Quanto mais claro, mais relevantes serão as pautas.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-card to-primary/[0.03] rounded-2xl shadow-sm p-5 md:p-6 ring-1 ring-primary/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <Label htmlFor="brief" className="text-base font-semibold">
                Briefing principal *
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSuggestBriefing}
              disabled={suggestingBriefing || !canSuggest}
              title={
                canSuggest
                  ? "Gerar uma sugestão de briefing com base no contexto"
                  : `Para sugerir com IA, preencha: ${missingForSuggest.join(", ")}`
              }
              className="gap-2 h-9 self-start sm:self-auto"
            >
              {suggestingBriefing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {suggestingBriefing ? "Gerando..." : "Sugerir com IA"}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground -mt-1">
            Descreva o objetivo do mês, o posicionamento da marca, os temas prioritários,
            o tipo de conteúdo desejado e o tom da comunicação.
          </p>

          <Textarea
            id="brief"
            rows={7}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ex: Posicionar a marca como referência em decoração assinada, com foco em peças exclusivas. Misturar conteúdo educativo com bastidores do ateliê, depoimentos de clientes e lançamentos da nova coleção..."
            className="bg-background/60 resize-y text-sm leading-relaxed"
          />

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5" />
              Sugestões rápidas — clique para inserir
            </div>
            <div className="flex flex-wrap gap-2">
              {briefingSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setUserInput((prev) => (prev.trim() ? `${prev.trim()}\n• ${s}` : `• ${s}`))
                  }
                  className="text-xs text-left px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border/60"
                >
                  {s.length > 70 ? `${s.slice(0, 70)}…` : s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bloco 3 — Configuração da geração */}
      <section className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 text-primary h-8 w-8 flex items-center justify-center shrink-0 text-sm font-bold">
            3
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-base">Configuração da geração</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Defina o volume de pautas. Você poderá revisar, editar ou remover qualquer uma depois.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-medium">Número de pautas</Label>
              <span className="text-xs text-muted-foreground">Recomendado para um mês: 8 a 12</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="inline-flex items-center rounded-xl border border-border bg-background overflow-hidden h-11 self-start">
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.max(3, c - 1))}
                  className="h-full w-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Diminuir"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="px-5 min-w-[60px] text-center font-bold text-lg">{count}</div>
                <button
                  type="button"
                  onClick={() => setCount((c) => Math.min(20, c + 1))}
                  className="h-full w-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Aumentar"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {countPresets.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCount(n)}
                    className={`px-3 h-9 rounded-lg text-sm font-medium transition-colors border ${
                      count === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1 max-w-md">
              <p className="text-sm font-medium">Pronto para gerar?</p>
              <p className="text-xs text-muted-foreground">
                A IA vai criar {count} pautas com título, data, rede social e formato sugeridos.
                Você poderá revisar e editar tudo antes de enviar para a equipe.
              </p>
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-1.5">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                size="lg"
                className="gap-2 shadow-lg shadow-primary/20"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Gerando pautas..." : "Gerar calendário com IA"}
              </Button>
              <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 md:justify-end">
                <Coins className="h-3 w-3" />
                Custo: {CREDIT_COSTS.CONTENT_PLAN} créditos · revisável antes de aprovar
              </p>
            </div>
          </div>
        </div>
      </section>

      {generatedItems.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg">Pautas do calendário</h2>
              <p className="text-sm text-muted-foreground">
                Ajuste cada pauta antes de enviar para a equipe trabalhar o briefing.
                Defina título, data, rede social e formato.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2 shrink-0">
              <Plus className="h-3.5 w-3.5" />
              Adicionar pauta
            </Button>
          </div>

          <div className="space-y-3">
            {generatedItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 text-primary text-xs font-bold w-8 h-8 flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      placeholder="Título da pauta"
                      className="font-medium"
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Data</Label>
                        <Input
                          type="date"
                          value={item.scheduled_date}
                          onChange={(e) => updateItem(i, { scheduled_date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tema</Label>
                        <Input
                          value={item.theme}
                          onChange={(e) => updateItem(i, { theme: e.target.value })}
                          placeholder="Ex: Educativo"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Rede social</Label>
                        <Select
                          value={item.platform || ""}
                          onValueChange={(v) => updateItem(i, { platform: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {PLATFORMS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Formato</Label>
                        <Select
                          value={item.format || ""}
                          onValueChange={(v) => updateItem(i, { format: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {FORMATS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Remover pauta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              A marca, persona e editoria selecionadas acima serão aplicadas a todas as pautas.
            </p>
            <Button onClick={handleSave} disabled={createCalendar.isPending} className="gap-2">
              {createCalendar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Salvar e enviar para a equipe
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CalendarNew;
