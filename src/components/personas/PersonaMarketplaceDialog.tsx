import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Coins, ShoppingCart, Sparkles, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { BrandSummary } from "@/types/brand";

const COST_PER_PERSONA = 20;

type PersonaTemplate = {
  id: string;
  name: string;
  category: string | null;
  avatar_url: string | null;
  short_description: string | null;
  gender: string;
  age: string;
  location: string;
  main_goal: string;
  challenges: string;
};

interface PersonaMarketplaceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  brands: BrandSummary[];
  onPurchaseComplete: () => void;
  defaultBrandId?: string | null;
}

export default function PersonaMarketplaceDialog({
  isOpen,
  onOpenChange,
  brands,
  onPurchaseComplete,
  defaultBrandId,
}: PersonaMarketplaceDialogProps) {
  const { user, refreshUserCredits } = useAuth();
  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [ownedNames, setOwnedNames] = useState<Set<string>>(new Set());

  const userCredits = user?.credits || 0;

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set());
    if (defaultBrandId) setSelectedBrandId(defaultBrandId);
    else if (brands.length === 1) setSelectedBrandId(brands[0].id);

    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("persona_templates")
          .select("id, name, category, avatar_url, short_description, gender, age, location, main_goal, challenges")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (error) throw error;
        setTemplates(data || []);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar catálogo de personas");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, defaultBrandId, brands]);

  // Load personas already owned by the selected brand (match by name)
  useEffect(() => {
    if (!isOpen || !selectedBrandId) {
      setOwnedNames(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("personas")
          .select("name")
          .eq("brand_id", selectedBrandId);
        if (error) throw error;
        if (cancelled) return;
        const names = new Set((data || []).map((p: any) => (p.name || "").trim().toLowerCase()));
        setOwnedNames(names);
        // Remove any selections that became "owned" after brand change
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const t of templates) {
            if (names.has((t.name || "").trim().toLowerCase())) next.delete(t.id);
          }
          return next;
        });
      } catch (e) {
        console.error("[marketplace] failed to load owned personas", e);
        if (!cancelled) setOwnedNames(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedBrandId, templates]);

  const isOwned = (name: string) => ownedNames.has((name || "").trim().toLowerCase());

  const toggleSelection = (id: string, name: string) => {
    if (isOwned(name)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCost = selectedIds.size * COST_PER_PERSONA;
  const maxAffordable = Math.floor(userCredits / COST_PER_PERSONA);
  const affordableCount = Math.min(selectedIds.size, maxAffordable);
  const unaffordableCount = selectedIds.size - affordableCount;
  const willCharge = affordableCount * COST_PER_PERSONA;

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === selectedBrandId),
    [brands, selectedBrandId]
  );

  const handlePurchase = async () => {
    if (!selectedBrandId) {
      toast.error("Selecione uma marca primeiro");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos uma persona");
      return;
    }
    if (maxAffordable === 0) {
      toast.error(`Você precisa de pelo menos ${COST_PER_PERSONA} créditos`);
      return;
    }

    setIsPurchasing(true);
    const toastId = "purchase-personas";
    toast.loading("Adicionando personas...", { id: toastId });

    try {
      const { data, error } = await supabase.functions.invoke("purchase-personas", {
        body: {
          brand_id: selectedBrandId,
          template_ids: Array.from(selectedIds),
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const purchased = (data as any).purchased || 0;
      const skipped = (data as any).skipped || 0;

      await refreshUserCredits();

      if (skipped > 0) {
        toast.success(
          `${purchased} persona(s) adicionada(s)! ${skipped} ignorada(s) por créditos insuficientes.`,
          { id: toastId }
        );
      } else {
        toast.success(`${purchased} persona(s) adicionada(s) com sucesso!`, { id: toastId });
      }

      onPurchaseComplete();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao processar compra", { id: toastId });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-2.5 shadow-md">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-xl">Catálogo de Personas</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Adicione personas pré-prontas à sua marca por {COST_PER_PERSONA} créditos cada
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Brand selector */}
        <div className="p-6 py-4 bg-muted/30 border-b border-border/40 shrink-0">
          <label className="text-xs font-medium text-foreground mb-2 block">
            Vincular personas à marca
          </label>
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
            <SelectTrigger className="w-full h-11 bg-card">
              <SelectValue placeholder="Selecione a marca que receberá as personas" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[100]">
              {brands.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  Crie uma marca primeiro
                </div>
              ) : (
                brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        {b.avatarUrl && <AvatarImage src={b.avatarUrl} alt={b.name} />}
                        <AvatarFallback
                          style={{ backgroundColor: b.brandColor || undefined }}
                          className="text-[10px] text-white"
                        >
                          {b.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {b.name}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedBrand && (
            <p className="text-xs text-muted-foreground mt-2">
              As personas selecionadas serão criadas em <strong className="text-foreground">{selectedBrand.name}</strong>
            </p>
          )}
        </div>

        {/* Cards grid */}
        <ScrollArea className="flex-1">
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse" />
              ))
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Nenhuma persona disponível no catálogo.
              </div>
            ) : (
              templates.map((t) => {
                const selected = selectedIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleSelection(t.id)}
                    className={cn(
                      "relative text-left rounded-xl border-2 p-4 transition-all hover:shadow-md",
                      selected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    {selected && (
                      <div className="absolute top-3 right-3 bg-primary rounded-full p-1 shadow-md">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                        {t.avatar_url && <AvatarImage src={t.avatar_url} alt={t.name} />}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 pr-6">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                          {t.name}
                        </h3>
                        {t.category && (
                          <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {t.short_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {t.short_description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/40 pt-2 mt-2">
                      <span>{t.age}</span>
                      <span className="text-border">•</span>
                      <span className="truncate">{t.location}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Coins className="h-3 w-3" />
                        {COST_PER_PERSONA} créditos
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {selected ? "Selecionada" : "Adicionar"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Checkout footer */}
        <div className="p-4 border-t border-border/40 bg-card shrink-0">
          {unaffordableCount > 0 && (
            <div className="mb-3 flex items-start gap-2 text-xs bg-destructive/10 text-destructive rounded-lg p-2.5 border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Você selecionou {selectedIds.size} personas, mas só tem créditos para {affordableCount}. As {unaffordableCount} restantes serão ignoradas.
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedIds.size}</span>
                <span className="text-muted-foreground">selecionadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-bold text-foreground">{willCharge}</span>
                <span className="text-muted-foreground text-xs">
                  / {userCredits} disponíveis
                </span>
              </div>
            </div>
            <Button
              onClick={handlePurchase}
              disabled={
                isPurchasing ||
                selectedIds.size === 0 ||
                !selectedBrandId ||
                maxAffordable === 0
              }
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md min-w-[180px]"
            >
              {isPurchasing ? (
                "Processando..."
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Adicionar {affordableCount > 0 ? `(${affordableCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
