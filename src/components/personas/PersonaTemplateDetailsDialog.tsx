'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Cake,
  Coins,
  MapPin,
  ShoppingCart,
  UserRound,
  Briefcase,
  Heart,
  Newspaper,
  Target,
  AlertTriangle,
  MessageCircle,
  Compass,
  Zap,
  Check,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type PersonaTemplateFull = {
  id: string;
  name: string;
  category: string | null;
  avatar_url: string | null;
  short_description: string | null;
  gender: string;
  age: string;
  location: string;
  professional_context: string;
  beliefs_and_interests: string;
  content_consumption_routine: string;
  main_goal: string;
  challenges: string;
  preferred_tone_of_voice: string;
  purchase_journey_stage: string;
  interest_triggers: string;
  income_and_purchase_habits?: string | null;
};

type Props = {
  template: PersonaTemplateFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: boolean;
  onToggleSelect: () => void;
  costPerPersona: number;
  owned?: boolean;
};

const InfoBlock = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-muted/40 p-3.5 border border-border/40">
      <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
};

export function PersonaTemplateDetailsDialog({
  template,
  open,
  onOpenChange,
  selected,
  onToggleSelect,
  costPerPersona,
  owned = false,
}: Props) {
  if (!template) return null;
  const t = template;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] md:w-[calc(100vw-3rem)] h-[95vh] sm:h-auto sm:max-h-[90vh] p-0 overflow-hidden gap-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{t.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] lg:grid-cols-[300px_1fr] flex-1 min-h-0 overflow-hidden">
          {/* Left — photo & quick facts */}
          <div className="bg-gradient-to-br from-muted/60 to-muted/20 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 border-b md:border-b-0 md:border-r border-border/40 md:overflow-y-auto shrink-0 md:shrink">
            <div className="flex md:block gap-4">
              <div className="w-24 sm:w-32 md:w-full aspect-square rounded-2xl overflow-hidden bg-muted shadow-md ring-1 ring-border/40 shrink-0">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserRound className="h-10 w-10 sm:h-20 sm:w-20 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="md:hidden flex-1 min-w-0 flex flex-col justify-center">
                <h2 className="text-base sm:text-xl font-bold text-foreground leading-tight">{t.name}</h2>
                {t.category && (
                  <Badge variant="secondary" className="mt-1.5 text-[10px] self-start">
                    {t.category}
                  </Badge>
                )}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-[11px] text-foreground/70">
                  <span className="flex items-center gap-1"><UserRound className="h-3 w-3 text-primary" />{t.gender}</span>
                  <span className="flex items-center gap-1"><Cake className="h-3 w-3 text-primary" />{t.age}</span>
                  <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-primary shrink-0" /><span className="truncate">{t.location}</span></span>
                </div>
              </div>
            </div>

            <div className="hidden md:block">
              <h2 className="text-xl font-bold text-foreground leading-tight">{t.name}</h2>
              {t.category && (
                <Badge variant="secondary" className="mt-2 text-[11px]">
                  {t.category}
                </Badge>
              )}
            </div>

            {t.short_description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
                {t.short_description}
              </p>
            )}

            <div className="hidden md:block space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground/80">
                <UserRound className="h-4 w-4 text-primary" />
                <span>{t.gender}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/80">
                <Cake className="h-4 w-4 text-primary" />
                <span>{t.age} anos</span>
              </div>
              <div className="flex items-center gap-2 text-foreground/80">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{t.location}</span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-border/40">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                {owned ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                    <Check className="h-3 w-3 mr-1" />
                    Já adicionada nesta marca
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                    <Coins className="h-4 w-4" />
                    {costPerPersona} créditos
                  </div>
                )}
              </div>
              <Button
                onClick={onToggleSelect}
                disabled={owned}
                className={cn(
                  'w-full h-10',
                  owned
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : selected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-r from-primary to-secondary text-primary-foreground'
                )}
              >
                {owned ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Já em uso nesta marca
                  </>
                ) : selected ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Adicionada ao carrinho
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Adicionar ao carrinho
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right — full persona details */}
          <ScrollArea className="flex-1 min-h-0 md:h-full">
            <div className="p-4 sm:p-5 lg:p-6 space-y-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">Perfil completo</h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  Todas as informações desta persona, prontas para serem importadas para sua marca.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
                <InfoBlock
                  icon={Briefcase}
                  label="Contexto profissional"
                  value={t.professional_context}
                />
                <InfoBlock
                  icon={Heart}
                  label="Crenças e interesses"
                  value={t.beliefs_and_interests}
                />
                <InfoBlock
                  icon={Newspaper}
                  label="Consumo de conteúdo"
                  value={t.content_consumption_routine}
                />
                <InfoBlock icon={Target} label="Objetivo principal" value={t.main_goal} />
                <InfoBlock icon={AlertTriangle} label="Desafios" value={t.challenges} />
                <InfoBlock
                  icon={MessageCircle}
                  label="Tom de voz preferido"
                  value={t.preferred_tone_of_voice}
                />
                <InfoBlock
                  icon={Compass}
                  label="Estágio na jornada de compra"
                  value={t.purchase_journey_stage}
                />
                <InfoBlock
                  icon={Zap}
                  label="Gatilhos de interesse"
                  value={t.interest_triggers}
                />
                <InfoBlock
                  icon={Wallet}
                  label="Renda e hábitos de compra"
                  value={t.income_and_purchase_habits}
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
