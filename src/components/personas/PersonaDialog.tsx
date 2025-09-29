'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { X, Plus } from 'lucide-react';
import type { Persona } from '@/types/persona';
import type { BrandSummary } from '@/types/brand';

const personaSchema = z.object({
  brandId: z.string().min(1, 'Selecione uma marca'),
  name: z.string().min(1, 'Nome é obrigatório'),
  age: z.number().min(1, 'Idade deve ser maior que 0').max(120, 'Idade deve ser menor que 120'),
  occupation: z.string().min(1, 'Profissão é obrigatória'),
  location: z.string().min(1, 'Localização é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  goals: z.string().min(1, 'Objetivos são obrigatórios'),
  frustrations: z.string().min(1, 'Frustrações são obrigatórias'),
  behaviors: z.string().min(1, 'Comportamento é obrigatório'),
  channels: z.array(z.string()).min(1, 'Pelo menos um canal é obrigatório'),
  personalityTraits: z.string().min(1, 'Traços de personalidade são obrigatórios'),
  demographics: z.object({
    gender: z.string().min(1, 'Gênero é obrigatório'),
    income: z.string().min(1, 'Renda é obrigatória'),
    education: z.string().min(1, 'Educação é obrigatória'),
    familyStatus: z.string().min(1, 'Estado civil é obrigatório'),
  }),
  psychographics: z.object({
    values: z.string().min(1, 'Valores são obrigatórios'),
    interests: z.string().min(1, 'Interesses são obrigatórios'),
    lifestyle: z.string().min(1, 'Estilo de vida é obrigatório'),
  }),
});

type PersonaFormData = z.infer<typeof personaSchema>;

interface PersonaDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PersonaFormData) => void;
  personaToEdit: Persona | null;
  brands: BrandSummary[];
}

const defaultChannels = [
  'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 
  'WhatsApp', 'Email', 'Blog', 'Podcast', 'TV', 'Rádio', 'Jornal'
];

export default function PersonaDialog({ isOpen, onOpenChange, onSave, personaToEdit, brands }: PersonaDialogProps) {
  const [newChannel, setNewChannel] = useState('');
  
  const form = useForm<PersonaFormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      brandId: '',
      name: '',
      age: 25,
      occupation: '',
      location: '',
      description: '',
      goals: '',
      frustrations: '',
      behaviors: '',
      channels: [],
      personalityTraits: '',
      demographics: {
        gender: '',
        income: '',
        education: '',
        familyStatus: '',
      },
      psychographics: {
        values: '',
        interests: '',
        lifestyle: '',
      },
    },
  });

  // Reset form when dialog opens/closes or persona changes
  useEffect(() => {
    if (isOpen && personaToEdit) {
      form.reset({
        brandId: personaToEdit.brandId,
        name: personaToEdit.name,
        age: personaToEdit.age,
        occupation: personaToEdit.occupation,
        location: personaToEdit.location,
        description: personaToEdit.description,
        goals: personaToEdit.goals,
        frustrations: personaToEdit.frustrations,
        behaviors: personaToEdit.behaviors,
        channels: personaToEdit.channels,
        personalityTraits: personaToEdit.personalityTraits,
        demographics: personaToEdit.demographics,
        psychographics: personaToEdit.psychographics,
      });
    } else if (isOpen && !personaToEdit) {
      form.reset({
        brandId: '',
        name: '',
        age: 25,
        occupation: '',
        location: '',
        description: '',
        goals: '',
        frustrations: '',
        behaviors: '',
        channels: [],
        personalityTraits: '',
        demographics: {
          gender: '',
          income: '',
          education: '',
          familyStatus: '',
        },
        psychographics: {
          values: '',
          interests: '',
          lifestyle: '',
        },
      });
    }
  }, [isOpen, personaToEdit, form]);

  const handleSubmit = (data: PersonaFormData) => {
    onSave(data);
  };

  const addChannel = (channel: string) => {
    const currentChannels = form.getValues('channels');
    if (!currentChannels.includes(channel)) {
      form.setValue('channels', [...currentChannels, channel]);
    }
  };

  const removeChannel = (channelToRemove: string) => {
    const currentChannels = form.getValues('channels');
    form.setValue('channels', currentChannels.filter(channel => channel !== channelToRemove));
  };

  const addCustomChannel = () => {
    if (newChannel.trim() && !form.getValues('channels').includes(newChannel.trim())) {
      addChannel(newChannel.trim());
      setNewChannel('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {personaToEdit ? 'Editar Persona' : 'Nova Persona'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma marca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissão *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Gerente de Marketing" {...field} />
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
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva brevemente esta persona..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Demografia */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Demográficas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="demographics.gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o gênero" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Não-binário">Não-binário</SelectItem>
                          <SelectItem value="Prefere não informar">Prefere não informar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="demographics.income"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renda *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: R$ 5.000 - R$ 10.000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="demographics.education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Educação *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Ensino Superior Completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="demographics.familyStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estado civil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                          <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                          <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                          <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                          <SelectItem value="União estável">União estável</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Comportamento e Objetivos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quais são os principais objetivos desta persona?"
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
                name="frustrations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frustrações *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Quais são as principais frustrações desta persona?"
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
              name="behaviors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comportamento *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o comportamento típico desta persona..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Canais de comunicação */}
            <FormField
              control={form.control}
              name="channels"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canais de Comunicação *</FormLabel>
                  <div className="space-y-4">
                    {/* Canais sugeridos */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Canais sugeridos:</p>
                      <div className="flex flex-wrap gap-2">
                        {defaultChannels.map((channel) => (
                          <Button
                            key={channel}
                            type="button"
                            variant={field.value.includes(channel) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (field.value.includes(channel)) {
                                removeChannel(channel);
                              } else {
                                addChannel(channel);
                              }
                            }}
                          >
                            {channel}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Canal customizado */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar canal customizado..."
                        value={newChannel}
                        onChange={(e) => setNewChannel(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomChannel())}
                      />
                      <Button type="button" onClick={addCustomChannel} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Canais selecionados */}
                    {field.value.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Canais selecionados:</p>
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((channel) => (
                            <Badge key={channel} variant="secondary" className="flex items-center gap-1">
                              {channel}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => removeChannel(channel)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personalityTraits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Traços de Personalidade *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os principais traços de personalidade..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Psicografia */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Psicografia</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="psychographics.values"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valores *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quais valores são importantes para esta persona?"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="psychographics.interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interesses *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Quais são os principais interesses desta persona?"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="psychographics.lifestyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estilo de Vida *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva o estilo de vida desta persona..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {personaToEdit ? 'Atualizar' : 'Criar'} Persona
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}