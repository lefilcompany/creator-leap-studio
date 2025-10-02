import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Brand } from "@/types/brand";

export default function QuickContent() {
  const navigate = useNavigate();
  const { user, team } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [credits, setCredits] = useState(0);

  const [formData, setFormData] = useState({
    prompt: "",
    brandId: "",
  });

  useEffect(() => {
    if (team) {
      loadData();
    }
  }, [team]);

  const loadData = async () => {
    try {
      setLoadingData(true);

      // Load brands
      const { data: brandsData, error: brandsError } = await supabase
        .from("brands")
        .select("*")
        .eq("team_id", team?.id)
        .order("name");

      if (brandsError) throw brandsError;
      setBrands((brandsData || []) as any);

      // Load credits
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("credits_quick_content")
        .eq("id", team?.id)
        .single();

      if (teamError) throw teamError;
      setCredits(teamData?.credits_quick_content || 0);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoadingData(false);
    }
  };

  const generateQuickContent = async () => {
    if (!formData.prompt.trim()) {
      toast.error("Por favor, descreva o que deseja criar");
      return;
    }

    if (credits <= 0) {
      toast.error("Você não possui créditos suficientes para criação rápida");
      return;
    }

    try {
      setLoading(true);
      console.log("Generating quick content...");

      const { data, error } = await supabase.functions.invoke(
        "generate-quick-content",
        {
          body: {
            prompt: formData.prompt,
            brandId: formData.brandId || null,
            userId: user?.id,
            teamId: team?.id,
          },
        }
      );

      if (error) {
        console.error("Error generating content:", error);
        throw error;
      }

      console.log("Content generated successfully:", data);

      // Update credits
      setCredits(data.creditsRemaining);

      // Navigate to result page
      navigate("/quick-content-result", {
        state: {
          imageUrl: data.imageUrl,
          description: data.description,
          actionId: data.actionId,
          prompt: formData.prompt,
        },
      });

      toast.success("Conteúdo gerado com sucesso!");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao gerar conteúdo");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Criação Rápida
              </h1>
              <p className="text-sm text-muted-foreground">
                Gere imagens rapidamente com IA
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
            <p className="text-2xl font-bold text-primary">{credits}</p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Configure sua criação
            </h2>
          </div>

          {/* Brand Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="brand">
              Marca (opcional)
            </Label>
            <Select
              value={formData.brandId}
              onValueChange={(value) =>
                setFormData({ ...formData, brandId: value })
              }
            >
              <SelectTrigger id="brand">
                <SelectValue placeholder="Nenhuma marca selecionada" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecionar uma marca ajudará a IA a criar conteúdo alinhado com a identidade da marca
            </p>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Descreva o que você quer criar <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="Ex: Uma imagem de um café sendo servido numa manhã ensolarada, com uma estética minimalista e moderna..."
              value={formData.prompt}
              onChange={(e) =>
                setFormData({ ...formData, prompt: e.target.value })
              }
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja específico sobre o que deseja ver na imagem
            </p>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          onClick={generateQuickContent}
          disabled={loading || !formData.prompt.trim()}
          size="lg"
          className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-5 w-5" />
              Gerar Conteúdo
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
