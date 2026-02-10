'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Tag, Calendar, Save, Loader2, User, Target, LayoutGrid, List, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formTranslations } from '@/lib/formTranslations';
import { NativeSelect } from '@/components/ui/native-select';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'input' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

const EditableField = ({ label, value, onChange, type = 'textarea', placeholder, options }: EditableFieldProps) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</Label>
    {type === 'select' && options ? (
      <NativeSelect value={value} onValueChange={onChange} options={options} className="bg-background/80 backdrop-blur-sm border-border/20" />
    ) : type === 'input' ? (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="bg-background/80 backdrop-blur-sm border-border/20 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
      />
    ) : (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || label}
        className="bg-background/80 backdrop-blur-sm border-border/20 focus:border-primary/50 focus:ring-primary/20 min-h-[100px] max-h-[200px] resize-y transition-all duration-200"
      />
    )}
  </div>
);

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
}

const SectionCard = ({ title, icon, children, accentColor }: SectionCardProps) => (
  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
    <div
      className="px-5 py-3.5 border-b border-border/10 flex items-center gap-2.5"
      style={accentColor ? { background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03)` } : {}}
    >
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

interface BrandData {
  id: string;
  name: string;
  brand_color: string | null;
  avatar_url: string | null;
}

const translations = formTranslations.pt.forms.personas;

const genderOptions = [
  { value: 'male', label: translations.genderOptions.male },
  { value: 'female', label: translations.genderOptions.female },
  { value: 'non-binary', label: translations.genderOptions.nonBinary },
  { value: 'preferNotToSay', label: translations.genderOptions.preferNotToSay },
];

const toneOptions = [
  { value: 'professional', label: translations.toneOptions.professional },
  { value: 'casual', label: translations.toneOptions.casual },
  { value: 'friendly', label: translations.toneOptions.friendly },
  { value: 'inspiring', label: translations.toneOptions.inspiring },
  { value: 'direct', label: translations.toneOptions.direct },
  { value: 'educational', label: translations.toneOptions.educational },
];

const journeyOptions = [
  { value: 'awareness', label: translations.journeyStages.awareness },
  { value: 'consideration', label: translations.journeyStages.consideration },
  { value: 'decision', label: translations.journeyStages.decision },
  { value: 'postPurchase', label: translations.journeyStages.postPurchase },
  { value: 'advocacy', label: translations.journeyStages.advocacy },
];

export default function PersonaView() {
  const { personaId } = useParams<{ personaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const viewMode = (location.state as any)?.viewMode || 'grid';
  const queryClient = useQueryClient();

  const [persona, setPersona] = useState<any | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef<Record<string, string>>({});

  const loadPersona = useCallback(async () => {
    if (!personaId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('personas').select('*').eq('id', personaId).single();
      if (error) throw error;
      setPersona(data);

      const { data: brandData } = await supabase
        .from('brands')
        .select('id, name, brand_color, avatar_url')
        .eq('id', data.brand_id)
        .single();
      setBrand(brandData || null);

      const initial: Record<string, string> = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        location: data.location,
        professionalContext: data.professional_context,
        beliefsAndInterests: data.beliefs_and_interests,
        mainGoal: data.main_goal,
        challenges: data.challenges,
        contentConsumptionRoutine: data.content_consumption_routine,
        preferredToneOfVoice: data.preferred_tone_of_voice,
        purchaseJourneyStage: data.purchase_journey_stage,
        interestTriggers: data.interest_triggers,
      };
      setFormData(initial);
      originalRef.current = { ...initial };
      setHasChanges(false);
    } catch (error) {
      console.error('Erro ao carregar persona:', error);
      toast.error('Erro ao carregar detalhes da persona');
      navigate('/personas');
    } finally {
      setIsLoading(false);
    }
  }, [personaId, navigate]);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  const checkHasChanges = useCallback((nextFormData: Record<string, string>) => {
    const textChanged = Object.keys(nextFormData).some(k => nextFormData[k] !== originalRef.current[k]);
    setHasChanges(textChanged);
  }, []);

  const updateField = (key: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [key]: value };
      checkHasChanges(next);
      return next;
    });
  };

  const handleSave = useCallback(async () => {
    if (!user?.id || !persona) return;
    setIsSaving(true);
    const toastId = 'persona-update';
    try {
      toast.loading('Salvando alterações...', { id: toastId });
      const { error } = await supabase
        .from('personas')
        .update({
          name: formData.name,
          age: formData.age,
          gender: formData.gender,
          location: formData.location,
          professional_context: formData.professionalContext,
          beliefs_and_interests: formData.beliefsAndInterests,
          main_goal: formData.mainGoal,
          challenges: formData.challenges,
          content_consumption_routine: formData.contentConsumptionRoutine,
          preferred_tone_of_voice: formData.preferredToneOfVoice,
          purchase_journey_stage: formData.purchaseJourneyStage,
          interest_triggers: formData.interestTriggers,
        })
        .eq('id', persona.id);

      if (error) throw error;
      toast.success('Persona atualizada com sucesso!', { id: toastId });
      originalRef.current = { ...formData };
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['personas'] });
    } catch (error) {
      console.error('Erro ao salvar persona:', error);
      toast.error('Erro ao salvar persona', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [persona, user, formData, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!persona) return;
    const toastId = 'persona-delete';
    try {
      toast.loading('Deletando persona...', { id: toastId });
      const { error } = await supabase.from('personas').delete().eq('id', persona.id);
      if (error) throw error;
      toast.success('Persona deletada com sucesso!', { id: toastId });
      navigate('/personas');
    } catch (error) {
      console.error('Erro ao deletar persona:', error);
      toast.error('Erro ao deletar persona', { id: toastId });
    }
  }, [persona, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold">Persona não encontrada</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/personas')}>
          Voltar para personas
        </Button>
      </div>
    );
  }

  const brandColor = brand?.brand_color || 'hsl(var(--primary))';
  const wasUpdated = persona.created_at !== persona.updated_at;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Hero Header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${brandColor}18, ${brandColor}08, hsl(var(--background)))`,
        }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-[0.04] blur-3xl" style={{ backgroundColor: brandColor }} />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full opacity-[0.03] blur-3xl" style={{ backgroundColor: brandColor }} />

        <div className="relative px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4">
            <PageBreadcrumb
              items={[
                { 
                  label: 'Personas', 
                  href: '/personas',
                  state: { viewMode },
                  icon: viewMode === 'list' 
                    ? <List className="h-3.5 w-3.5" /> 
                    : <LayoutGrid className="h-3.5 w-3.5" />
                },
                { label: formData.name || persona.name },
              ]}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {brand?.avatar_url ? (
                <img
                  src={brand.avatar_url}
                  alt={brand.name}
                  className="w-14 h-14 rounded-2xl object-cover shadow-lg ring-4 ring-white/20"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg ring-4 ring-white/20"
                  style={{ backgroundColor: brandColor }}
                >
                  {persona.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{formData.name || persona.name}</h1>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {brand?.name || 'Marca não definida'}</span>
                  <span className="text-border/50">•</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(persona.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl border-border/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors">
                    <Trash2 className="mr-1.5 h-4 w-4" /> Deletar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser desfeita. Isso irá deletar permanentemente a persona &quot;{persona.name}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Deletar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="rounded-xl shadow-md shadow-primary/20 transition-all duration-200"
              >
                {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <SectionCard title="Dados Demográficos" icon={<Info className="h-4 w-4" />} accentColor={brandColor}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Nome" value={formData.name || ''} onChange={(v) => updateField('name', v)} type="input" />
              <EditableField label="Idade" value={formData.age || ''} onChange={(v) => updateField('age', v)} type="input" />
              <EditableField label="Gênero" value={formData.gender || ''} onChange={(v) => updateField('gender', v)} type="select" options={genderOptions} />
              <EditableField label="Localização" value={formData.location || ''} onChange={(v) => updateField('location', v)} type="input" />
            </div>
          </SectionCard>

          <SectionCard title="Perfil e Motivações" icon={<User className="h-4 w-4" />} accentColor={brandColor}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Contexto Profissional" value={formData.professionalContext || ''} onChange={(v) => updateField('professionalContext', v)} />
              <EditableField label="Principal Objetivo" value={formData.mainGoal || ''} onChange={(v) => updateField('mainGoal', v)} />
              <EditableField label="Desafios" value={formData.challenges || ''} onChange={(v) => updateField('challenges', v)} />
              <EditableField label="Crenças e Interesses" value={formData.beliefsAndInterests || ''} onChange={(v) => updateField('beliefsAndInterests', v)} />
            </div>
          </SectionCard>

          <SectionCard title="Comportamento e Estratégia" icon={<Target className="h-4 w-4" />} accentColor={brandColor}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Rotina de Consumo de Conteúdo" value={formData.contentConsumptionRoutine || ''} onChange={(v) => updateField('contentConsumptionRoutine', v)} />
              <EditableField label="Tom de Voz Preferido" value={formData.preferredToneOfVoice || ''} onChange={(v) => updateField('preferredToneOfVoice', v)} type="select" options={toneOptions} />
              <EditableField label="Estágio da Jornada de Compra" value={formData.purchaseJourneyStage || ''} onChange={(v) => updateField('purchaseJourneyStage', v)} type="select" options={journeyOptions} />
              <EditableField label="Gatilhos de Interesse" value={formData.interestTriggers || ''} onChange={(v) => updateField('interestTriggers', v)} />
            </div>
          </SectionCard>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em {formatDate(persona.created_at)}</span>
            {wasUpdated && (
              <>
                <span className="text-border/50">•</span>
                <span>Atualizado em {formatDate(persona.updated_at)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
