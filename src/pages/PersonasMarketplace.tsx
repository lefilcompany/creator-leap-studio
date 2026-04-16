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
import {
  PersonaTemplateDetailsDialog,
  type PersonaTemplateFull,
} from '@/components/personas/PersonaTemplateDetailsDialog';

const COST_PER_PERSONA = 20;

type PersonaTemplate = PersonaTemplateFull;

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
  const [previewTemplate, setPreviewTemplate] = useState<PersonaTemplate | null>(null);

  const userCredits = user?.credits || 0;

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [templatesRes, brandsRes] = await Promise.all([
          supabase
            .from('persona_templates')
            .select('id, name, category, avatar_url, short_description, gender, age, location, professional_context, beliefs_and_interests, content_consumption_routine, main_goal, challenges, preferred_tone_of_voice, purchase_journey_stage, interest_triggers')
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
    <div className="flex flex-col gap-3 sm:gap-4 pb-32 sm:pb-4">
      <PageBreadcrumb
        items={[
          { label: 'Personas', href: '/personas' },
          { label: 'Catálogo' },
        ]}
      />

      {/* Header */}
      <div className="bg-card rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 flex items-center gap-3">
        <div className="bg-gradient-to-br from-primary to-secondary rounded-xl p-2 sm:p-2.5 shadow-md shrink-0">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground leading-tight">Catálogo de Personas</h1>
          <p className="text-[11px] sm:text-xs lg:text-sm text-muted-foreground leading-snug">
            Adicione personas pré-prontas à sua marca por {COST_PER_PERSONA} créditos cada
          </p>
        </div>
      </div>

      {/* Brand selector + mobile filters trigger */}
      <div className="flex flex-col sm:flex-row gap-3 lg:block">
        <div className="bg-card rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 flex-1 min-w-0">
          <label className="text-xs font-medium text-foreground mb-2 block">
            Vincular personas à marca
          </label>
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
            <SelectTrigger className="w-full h-10 sm:h-11 bg-background">
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
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-2 truncate">
              Personas serão criadas em{' '}
              <strong className="text-foreground">{selectedBrand.name}</strong>
            </p>
          )}
        </div>

        {/* Mobile/tablet filters trigger */}
        <div className="lg:hidden sm:w-auto sm:self-end">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-11 justify-center sm:px-5">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                <span className="sm:hidden">Filtros ({filteredTemplates.length})</span>
                <span className="hidden sm:inline">Filtros · {filteredTemplates.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm p-0">
              <div className="p-4 h-full overflow-hidden">
                <MarketplaceFilterSidebar
                  filters={filters}
                  onChange={setFilters}
                  facets={facets}
                  totalResults={filteredTemplates.length}
                  totalAll={templates.length}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Two-column layout: sidebar + grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr] gap-3 lg:gap-4 items-start">
        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:sticky lg:top-4">
          <MarketplaceFilterSidebar
            filters={filters}
            onChange={setFilters}
            facets={facets}
            totalResults={filteredTemplates.length}
            totalAll={templates.length}
          />
        </div>

        {/* Cards grid */}
        <div className="bg-card rounded-2xl shadow-md p-3 sm:p-4 lg:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
              ))
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {templates.length === 0
                  ? 'Nenhuma persona disponível no catálogo.'
                  : 'Nenhuma persona corresponde aos filtros.'}
              </div>
            ) : (
            filteredTemplates.map((t) => {
              const selected = selectedIds.has(t.id);

              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewTemplate(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setPreviewTemplate(t);
                    }
                  }}
                  className={cn(
                    'group relative text-left rounded-xl border-2 transition-all hover:shadow-lg overflow-hidden flex min-h-[160px] sm:min-h-[180px] bg-background cursor-pointer',
                    selected
                      ? 'border-primary shadow-md ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  )}
                >
                  {selected && (
                    <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 bg-primary rounded-full p-0.5 sm:p-1 shadow-md">
                      <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Left — realistic persona photo */}
                  <div className="w-[38%] xs:w-[35%] shrink-0 relative bg-muted overflow-hidden">
                    {t.avatar_url ? (
                      <img
                        src={t.avatar_url}
                        alt={t.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                        <UserRound className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/60" />
                      </div>
                    )}
                    <div className="absolute inset-y-0 right-0 w-6 sm:w-8 bg-gradient-to-l from-background/40 to-transparent pointer-events-none" />
                  </div>

                  {/* Right — All persona info */}
                  <div className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-3.5 gap-1.5 sm:gap-2">
                    <div className="min-w-0 pr-5 sm:pr-6">
                      <h3 className="font-semibold text-[13px] sm:text-sm text-foreground line-clamp-2 leading-tight">
                        {t.name}
                      </h3>
                      {t.category && (
                        <Badge variant="secondary" className="mt-1 text-[9px] sm:text-[10px] px-1.5 py-0">
                          {t.category}
                        </Badge>
                      )}
                    </div>

                    {t.short_description && (
                      <p className="hidden sm:block text-xs text-muted-foreground line-clamp-2 leading-snug">
                        {t.short_description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground mt-auto">
                      <span className="flex items-center gap-1">
                        <Cake className="h-3 w-3" />
                        {t.age}
                      </span>
                      <span className="flex items-center gap-1 min-w-0 max-w-full">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{t.location}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1.5 sm:pt-2 border-t border-border/40">
                      <div className="flex items-center gap-1 text-[11px] sm:text-xs font-medium text-primary min-w-0">
                        <Coins className="h-3 w-3 shrink-0" />
                        <span className="truncate">{COST_PER_PERSONA} <span className="hidden xs:inline">créditos</span><span className="xs:hidden">cr.</span></span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(t.id);
                        }}
                        className={cn(
                          'h-7 px-2 sm:px-2.5 text-[10px] sm:text-[11px] font-semibold gap-1 transition-all shrink-0',
                          selected
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary'
                        )}
                        aria-label={selected ? 'Remover persona' : 'Adicionar persona'}
                      >
                        {selected ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span className="hidden xs:inline">Adicionada</span>
                            <span className="xs:hidden">Ok</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>{/* /two-column layout */}
      {/* Sticky checkout — fixed on mobile, sticky on desktop */}
      <div className="fixed bottom-0 inset-x-0 z-30 sm:sticky sm:bottom-4 sm:inset-x-auto bg-card sm:rounded-2xl shadow-xl border-t sm:border border-border/40 p-3 sm:p-4">
        {unaffordableCount > 0 && (
          <div className="mb-2 sm:mb-3 flex items-start gap-2 text-[11px] sm:text-xs bg-destructive/10 text-destructive rounded-lg p-2 sm:p-2.5 border border-destructive/20">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
            <span className="leading-snug">
              <span className="hidden sm:inline">Você selecionou {selectedIds.size} personas, mas só tem créditos para {affordableCount}. As {unaffordableCount} restantes serão ignoradas.</span>
              <span className="sm:hidden">Créditos só cobrem {affordableCount} de {selectedIds.size}.</span>
            </span>
          </div>
        )}
        <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="font-semibold">{selectedIds.size}</span>
              <span className="text-muted-foreground hidden xs:inline sm:inline">sel.</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span className="font-bold text-foreground">{willCharge}</span>
              <span className="text-muted-foreground text-[10px] sm:text-xs truncate">
                / {userCredits}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/personas')}
              disabled={isPurchasing}
              className="h-9 sm:h-10 px-2.5 sm:px-4 text-xs sm:text-sm hidden xs:inline-flex sm:inline-flex"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handlePurchase}
              disabled={
                isPurchasing ||
                selectedIds.size === 0 ||
                !selectedBrandId ||
                maxAffordable === 0
              }
              className="h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-md sm:min-w-[180px]"
            >
              {isPurchasing ? (
                'Processando...'
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Adicionar </span>
                  <span className="sm:hidden">OK </span>
                  {affordableCount > 0 ? `(${affordableCount})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <PersonaTemplateDetailsDialog
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(o) => !o && setPreviewTemplate(null)}
        selected={previewTemplate ? selectedIds.has(previewTemplate.id) : false}
        onToggleSelect={() => previewTemplate && toggleSelection(previewTemplate.id)}
        costPerPersona={COST_PER_PERSONA}
      />
    </div>
  );
}
