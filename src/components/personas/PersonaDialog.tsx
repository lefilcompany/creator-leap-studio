'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Info, ChevronDown } from 'lucide-react';
import type { Persona } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';
import { useDraftForm } from '@/hooks/useDraftForm';
import { toast } from 'sonner';

const personaSchema = z.object({
  brandId: z.string().min(1, 'Selecione uma marca'),
  name: z.string().min(1, 'Nome é obrigatório'),
  gender: z.string().min(1, 'Gênero é obrigatório'),
  age: z.string().min(1, 'Idade é obrigatória'),
  location: z.string().min(1, 'Localização é obrigatória'),
  professionalContext: z.string().min(1, 'Contexto profissional é obrigatório'),
  beliefsAndInterests: z.string().min(1, 'Crenças e interesses são obrigatórios'),
  contentConsumptionRoutine: z.string().min(1, 'Rotina de consumo de conteúdo é obrigatória'),
  mainGoal: z.string().min(1, 'Principal objetivo é obrigatório'),
  challenges: z.string().min(1, 'Desafios são obrigatórios'),
  preferredToneOfVoice: z.string().min(1, 'Tom de voz preferido é obrigatório'),
  purchaseJourneyStage: z.string().min(1, 'Estágio da jornada de compra é obrigatório'),
  interestTriggers: z.string().min(1, 'Gatilhos de interesse são obrigatórios'),
});

type PersonaFormData = z.infer<typeof personaSchema>;

interface PersonaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonaFormData) => void;
  personaToEdit: Persona | null;
  brands: BrandSummary[];
}

export default function PersonaDialog({ isOpen, onOpenChange, onSave, personaToEdit, brands }: PersonaDialogProps) {
  
  const form = useForm<PersonaFormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      brandId: '',
      name: '',
      gender: '',
      age: '',
      location: '',
      professionalContext: '',
      beliefsAndInterests: '',
      contentConsumptionRoutine: '',
      mainGoal: '',
      challenges: '',
      preferredToneOfVoice: '',
      purchaseJourneyStage: '',
      interestTriggers: '',
    },
  });

  // Observa mudanças no formulário para salvar rascunho
  const formValues = form.watch();
  
  // Hook para gerenciar rascunhos
  const { loadDraft, clearDraft, hasDraft } = useDraftForm(formValues, {
    draftKey: 'persona_form_draft',
    expirationHours: 2,
  });

  // Reset form when dialog opens/closes or persona changes
  useEffect(() => {
    if (isOpen && personaToEdit) {
      form.reset({
        brandId: personaToEdit.brandId,
        name: personaToEdit.name,
        gender: personaToEdit.gender,
        age: personaToEdit.age,
        location: personaToEdit.location,
        professionalContext: personaToEdit.professionalContext,
        beliefsAndInterests: personaToEdit.beliefsAndInterests,
        contentConsumptionRoutine: personaToEdit.contentConsumptionRoutine,
        mainGoal: personaToEdit.mainGoal,
        challenges: personaToEdit.challenges,
        preferredToneOfVoice: personaToEdit.preferredToneOfVoice,
        purchaseJourneyStage: personaToEdit.purchaseJourneyStage,
        interestTriggers: personaToEdit.interestTriggers,
      });
    } else if (isOpen && !personaToEdit) {
      // Tenta carregar rascunho
      const draft = loadDraft();
      if (draft) {
        form.reset(draft);
        toast.info('Rascunho recuperado', {
          description: 'Seus dados foram restaurados automaticamente.',
          icon: <Save className="h-4 w-4" />,
        });
      } else {
        form.reset({
          brandId: '',
          name: '',
          gender: '',
          age: '',
          location: '',
          professionalContext: '',
          beliefsAndInterests: '',
          contentConsumptionRoutine: '',
          mainGoal: '',
          challenges: '',
          preferredToneOfVoice: '',
          purchaseJourneyStage: '',
          interestTriggers: '',
        });
      }
    }
  }, [isOpen, personaToEdit, form, loadDraft]);

  const handleSubmit = (data: PersonaFormData) => {
    onSave(data);
    clearDraft(); // Limpa o rascunho após salvar com sucesso
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {personaToEdit ? 'Editar Persona' : 'Nova Persona'}
            </DialogTitle>
            {!personaToEdit && hasDraft() && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <Save className="h-3 w-3" />
                <span>Rascunho salvo</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Informações básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={brands.length === 0}
                          className="w-full h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          autoComplete="off"
                        >
                          <option value="" disabled>
                            {brands.length === 0 ? "Nenhuma marca cadastrada" : "Selecione uma marca"}
                          </option>
                          {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {brands.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5 mt-1">
                        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>Cadastre uma marca antes de criar personas</span>
                      </p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Persona *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Maria Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          autoComplete="off"
                        >
                          <option value="" disabled>Selecione o gênero</option>
                          <option value="Feminino">Feminino</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Não-binário">Não-binário</option>
                          <option value="Prefere não informar">Prefere não informar</option>
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade *</FormLabel>
                    <FormControl>
                      <Input placeholder="25 anos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: São Paulo, SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="professionalContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contexto Profissional *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Gerente de Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campos estratégicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mainGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Objetivo *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Qual é o principal objetivo desta persona?"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="challenges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desafios *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quais são os principais desafios desta persona?"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="beliefsAndInterests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Crenças e Interesses *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as crenças, valores e interesses desta persona..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentConsumptionRoutine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rotina de Consumo de Conteúdo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Como e quando esta persona consome conteúdo?"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="preferredToneOfVoice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tom de Voz Preferido *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          autoComplete="off"
                        >
                          <option value="" disabled>Selecione o tom preferido</option>
                          <option value="Profissional">Profissional</option>
                          <option value="Casual">Casual</option>
                          <option value="Amigável">Amigável</option>
                          <option value="Inspirador">Inspirador</option>
                          <option value="Direto">Direto</option>
                          <option value="Educativo">Educativo</option>
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseJourneyStage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio da Jornada de Compra *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <select
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          data-lpignore="true"
                          data-1p-ignore="true"
                          autoComplete="off"
                        >
                          <option value="" disabled>Selecione o estágio</option>
                          <option value="Consciência">Consciência</option>
                          <option value="Consideração">Consideração</option>
                          <option value="Decisão">Decisão</option>
                          <option value="Pós-compra">Pós-compra</option>
                          <option value="Advocacia">Advocacia</option>
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="interestTriggers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gatilhos de Interesse *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Quais são os gatilhos que despertam o interesse desta persona?"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              </div>
            </ScrollArea>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="hover:bg-destructive hover:border-destructive hover:text-white dark:hover:bg-destructive">
                Cancelar
              </Button>
              <Button type="submit">
                {personaToEdit ? 'Atualizar' : 'Criar Persona'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}