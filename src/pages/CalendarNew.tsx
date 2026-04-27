import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
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
}

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
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedPersona = personas.find((p) => p.id === personaId);
  const selectedTheme = themes.find((t) => t.id === themeId);

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
                main_goal: selectedPersona.mainGoal,
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

  const handleSave = async () => {
    if (generatedItems.length === 0) {
      toast.error("Gere as pautas antes de salvar.");
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
        items: generatedItems,
      });
      navigate(`/calendar/${cal.id}`);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="space-y-5 pb-8 max-w-5xl mx-auto">
      <PageBreadcrumb items={[{ label: "Calendário", path: "/plan" }, { label: "Novo calendário" }]} />

      <div className="bg-card rounded-2xl shadow-md p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="rounded-xl bg-primary/10 text-primary p-2">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Novo calendário de conteúdo</h1>
            <p className="text-sm text-muted-foreground">
              Defina o contexto e a IA gera as pautas para você ajustar.
            </p>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do calendário *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Janeiro 2026 — Cerâmica Brennand"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="month">Mês de referência</Label>
            <Input
              id="month"
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={personaId} onValueChange={setPersonaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {personas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Editoria</Label>
            <Select value={themeId} onValueChange={setThemeId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brief">Briefing — o que você quer comunicar e por quê *</Label>
          <Textarea
            id="brief"
            rows={5}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Ex: Posicionar a marca como referência em decoração assinada, com foco em peças exclusivas. Misturar conteúdo educativo com bastidores do ateliê..."
          />
        </div>

        <div className="flex items-end gap-3">
          <div className="space-y-2 w-32">
            <Label htmlFor="count">Nº de pautas</Label>
            <Input
              id="count"
              type="number"
              min={3}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(3, Number(e.target.value) || 8)))}
            />
          </div>
          <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Gerando..." : "Gerar pautas com IA"}
          </Button>
        </div>
      </Card>

      {generatedItems.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Pautas geradas</h2>
              <p className="text-sm text-muted-foreground">
                {generatedItems.length} pautas — você poderá ajustar cada uma na próxima etapa.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {generatedItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="rounded-lg bg-primary/10 text-primary text-xs font-bold w-8 h-8 flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent">{item.theme}</span>
                    <span>{new Date(item.scheduled_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={createCalendar.isPending} className="gap-2">
              {createCalendar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Salvar e abrir calendário
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CalendarNew;
