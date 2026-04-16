'use client';

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Coins, ShoppingCart, Sparkles, AlertCircle, MapPin, Cake, UserRound, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { BrandSummary } from '@/types/brand';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import {
  MarketplaceFilterSidebar,
  initialFilters,
  type MarketplaceFilters,
  type AgeRange,
} from '@/components/personas/MarketplaceFilterSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  purchase_journey_stage?: string | null;
};

export default function PersonasMarketplacePage() {
  const navigate = useNavigate();
  const { user, refreshUserCredits } = useAuth();

  const [templates, setTemplates] = useState<PersonaTemplate[]>([]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>(initialFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const userCredits = user?.credits || 0;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [templatesRes, brandsRes] = await Promise.all([
          supabase
            .from('persona_templates')
            .select('id, name, category, avatar_url, short_description, gender, age, location, main_goal, challenges, purchase_journey_stage')
            .eq('is_active', true)
            .order('display_order', { ascending: true }),
          supabase
            .from('brands')
            .select('id, name, responsible, brand_color, avatar_url, created_at, updated_at')
            .order('name', { ascending: true }),
        ]);

        if (templatesRes.error) throw templatesRes.error;
        if (brandsRes.error) throw brandsRes.error;

        setTemplates(templatesRes.data || []);
        const summaries: BrandSummary[] = (brandsRes.data || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          responsible: b.responsible,
          brandColor: b.brand_color || null,
          avatarUrl: b.avatar_url || null,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
        }));
        setBrands(summaries);
        if (summaries.length === 1) setSelectedBrandId(summaries[0].id);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar catálogo de personas');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggleSelection = (id: string) => {
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

  // --- Filter logic ---
  const getAgeRange = (ageStr: string): AgeRange | null => {
    const n = parseInt((ageStr || '').replace(/\D/g, ''), 10);
    if (!n) return null;
    if (n < 30) return '18-29';
    if (n < 45) return '30-44';
    if (n < 60) return '45-59';
    return '60+';
  };

  const getState = (location: string): string | null => {
    const m = (location || '').match(/,\s*([A-Z]{2})\b/);
    return m ? m[1] : null;
  };

  const filteredTemplates = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filters.categories.length && (!t.category || !filters.categories.includes(t.category))) return false;
      if (filters.genders.length && !filters.genders.includes(t.gender)) return false;
      if (filters.ageRanges.length) {
        const r = getAgeRange(t.age);
        if (!r || !filters.ageRanges.includes(r)) return false;
      }
      if (filters.states.length) {
        const s = getState(t.location);
        if (!s || !filters.states.includes(s)) return false;
      }
      if (filters.journeyStages.length) {
        if (!t.purchase_journey_stage || !filters.journeyStages.includes(t.purchase_journey_stage)) return false;
      }
      if (q) {
        const hay = [t.name, t.category, t.short_description, t.location, t.main_goal, t.challenges]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [templates, filters]);

  const facets = useMemo(() => {
    const count = (getter: (t: PersonaTemplate) => string | null | undefined) => {
      const map = new Map<string, number>();
      templates.forEach((t) => {
        const v = getter(t);
        if (!v) return;
        map.set(v, (map.get(v) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([value, c]) => ({ value, count: c }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };
    const ageOrder: AgeRange[] = ['18-29', '30-44', '45-59', '60+'];
    const ageCounts = count((t) => getAgeRange(t.age));
    return {
      categories: count((t) => t.category),
      genders: count((t) => t.gender),
      ageRanges: ageOrder
        .map((r) => ({ value: r, count: ageCounts.find((a) => a.value === r)?.count || 0 }))
        .filter((a) => a.count > 0),
      states: count((t) => getState(t.location)),
      journeyStages: count((t) => t.purchase_journey_stage),
    };
  }, [templates]);

  const handlePurchase = async () => {
    if (!selectedBrandId) {
      toast.error('Selecione uma marca primeiro');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos uma persona');
      return;
    }
    if (maxAffordable === 0) {
      toast.error(`Você precisa de pelo menos ${COST_PER_PERSONA} créditos`);
      return;
    }

    setIsPurchasing(true);
    const toastId = 'purchase-personas';
    toast.loading('Adicionando personas...', { id: toastId });

    try {
      const { data, error } = await supabase.functions.invoke('purchase-personas', {
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

      navigate('/personas');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao processar compra', { id: toastId });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageBreadcrumb
        items={[
          { label: 'Personas', href: '/personas' },
          { label: 'Catálogo' },
        ]}
      />

      {/* Header */}
      <div className="bg-card rounded-2xl shadow-md p-4 lg:p-5 flex items-center gap-3">
        <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-2.5 shadow-md">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Catálogo de Personas</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Adicione personas pré-prontas à sua marca por {COST_PER_PERSONA} créditos cada
          </p>
        </div>
      </div>

      {/* Brand selector */}
      <div className="bg-card rounded-2xl shadow-md p-4 lg:p-5">
        <label className="text-xs font-medium text-foreground mb-2 block">
          Vincular personas à marca
        </label>
        <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
          <SelectTrigger className="w-full h-11 bg-background">
            <SelectValue placeholder="Selecione a marca que receberá as personas" />
          </SelectTrigger>
          <SelectContent>
            {brands.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Crie uma marca primeiro</div>
            ) : (
              brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      {b.avatarUrl && <AvatarImage src={b.avatarUrl} alt={b.name} />}
                      <AvatarFallback
                        style={{ backgroundColor: b.brandColor || undefined }}
                        className="text-[10px] text-primary-foreground"
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
            As personas selecionadas serão criadas em{' '}
            <strong className="text-foreground">{selectedBrand.name}</strong>
          </p>
        )}
      </div>

      {/* Cards grid */}
      <div className="bg-card rounded-2xl shadow-md p-4 lg:p-5 space-y-4">
        {/* Search + categories */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar persona por nome, profissão, cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border transition-colors',
                    activeCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                  )}
                >
                  {cat === 'all' ? `Todas (${templates.length})` : cat}
                </button>
              ))}
            </div>
          )}
          {!isLoading && (
            <p className="text-xs text-muted-foreground">
              {filteredTemplates.length} {filteredTemplates.length === 1 ? 'persona encontrada' : 'personas encontradas'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
            ))
          ) : filteredTemplates.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {templates.length === 0
                ? 'Nenhuma persona disponível no catálogo.'
                : 'Nenhuma persona corresponde à busca.'}
            </div>
          ) : (
            filteredTemplates.map((t) => {
              const selected = selectedIds.has(t.id);

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSelection(t.id)}
                  className={cn(
                    'group relative text-left rounded-xl border-2 transition-all hover:shadow-lg overflow-hidden flex min-h-[180px] bg-background',
                    selected
                      ? 'border-primary shadow-md ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {selected && (
                    <div className="absolute top-2 right-2 z-10 bg-primary rounded-full p-1 shadow-md">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Left 35% — realistic persona photo */}
                  <div className="w-[35%] shrink-0 relative bg-muted overflow-hidden">
                    {t.avatar_url ? (
                      <img
                        src={t.avatar_url}
                        alt={t.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                        <UserRound className="h-12 w-12 text-muted-foreground/60" />
                      </div>
                    )}
                    {/* Subtle gradient overlay for legibility on edge */}
                    <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background/40 to-transparent pointer-events-none" />
                  </div>

                  {/* Right 65% — All persona info */}
                  <div className="w-[65%] flex flex-col p-3.5 gap-2 min-w-0">
                    <div className="min-w-0 pr-6">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">
                        {t.name}
                      </h3>
                      {t.category && (
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                          {t.category}
                        </Badge>
                      )}
                    </div>

                    {t.short_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                        {t.short_description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1">
                        <Cake className="h-3 w-3" />
                        {t.age}
                      </span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t.location}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Coins className="h-3 w-3" />
                        {COST_PER_PERSONA} créditos
                      </div>
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          selected ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {selected ? 'Selecionada' : 'Adicionar'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Sticky checkout */}
      <div className="sticky bottom-4 bg-card rounded-2xl shadow-xl border border-border/40 p-4">
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/personas')} disabled={isPurchasing}>
              Cancelar
            </Button>
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
                'Processando...'
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Adicionar {affordableCount > 0 ? `(${affordableCount})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
