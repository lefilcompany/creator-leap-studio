'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { X, Save } from 'lucide-react';
import { ColorPicker } from '@/components/ui/color-picker';
import type { Brand, MoodboardFile, ColorItem } from '@/types/brand';
import { useAuth } from '@/hooks/useAuth';
import { useDraftForm } from '@/hooks/useDraftForm';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type BrandFormData = Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'teamId' | 'userId'>;

interface BrandDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BrandFormData) => void;
  brandToEdit: Brand | null;
}

const initialFormData: BrandFormData = {
  name: '',
  responsible: '',
  segment: '',
  values: '',
  keywords: '',
  goals: '',
  inspirations: '',
  successMetrics: '',
  references: '',
  specialDates: '',
  promise: '',
  crisisInfo: '',
  milestones: '',
  collaborations: '',
  restrictions: '',
  moodboard: null, // O valor inicial agora é nulo
  logo: null, // Logo da marca
  referenceImage: null, // Imagem de referência da marca
  colorPalette: null, // Adicionado para paleta de cores
};

export default function BrandDialog({ isOpen, onOpenChange, onSave, brandToEdit }: BrandDialogProps) {
  const [formData, setFormData] = useState<BrandFormData>(initialFormData);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [members, setMembers] = useState<{ email: string; name: string }[]>([]);
  
  // Hook para gerenciar rascunhos
  const { loadDraft, clearDraft, hasDraft } = useDraftForm(formData, {
    draftKey: 'brand_form_draft',
    expirationHours: 2,
  });

  useEffect(() => {
    if (isOpen && brandToEdit) {
      // Se está editando, carrega os dados da marca
      setFormData({
        name: brandToEdit.name || '',
        responsible: brandToEdit.responsible || '',
        segment: brandToEdit.segment || '',
        values: brandToEdit.values || '',
        keywords: brandToEdit.keywords || '',
        goals: brandToEdit.goals || '',
        inspirations: brandToEdit.inspirations || '',
        successMetrics: brandToEdit.successMetrics || '',
        references: brandToEdit.references || '',
        specialDates: brandToEdit.specialDates || '',
        promise: brandToEdit.promise || '',
        crisisInfo: brandToEdit.crisisInfo || '',
        milestones: brandToEdit.milestones || '',
        collaborations: brandToEdit.collaborations || '',
        restrictions: brandToEdit.restrictions || '',
        moodboard: brandToEdit.moodboard || null,
        logo: brandToEdit.logo || null,
        referenceImage: brandToEdit.referenceImage || null,
        colorPalette: brandToEdit.colorPalette || null,
      });
    } else if (isOpen && !brandToEdit) {
      // Se está criando nova marca, tenta carregar rascunho
      const draft = loadDraft();
      if (draft) {
        setFormData(draft);
        toast.info(t.personas.draftRecovered, {
          description: t.personas.draftMessage,
          icon: <Save className="h-4 w-4" />,
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [brandToEdit, isOpen, loadDraft]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!isOpen || !user?.teamId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('team_id', user.teamId)
          .order('name', { ascending: true });

        if (error) throw error;

        setMembers(data || []);
      } catch (error) {
        console.error('Erro ao carregar membros:', error);
        setMembers([]);
        toast.error('Erro ao carregar membros da equipe');
      }
    };

    loadMembers();
  }, [isOpen, user?.teamId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // **ATUALIZADO:** Lê o arquivo e armazena um objeto com nome, tipo e conteúdo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFile: MoodboardFile = {
          name: file.name,
          type: file.type,
          content: reader.result as string,
        };
        setFormData(prev => ({ ...prev, moodboard: newFile }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, moodboard: null }));
    }
  }

  // Função para upload da logo
  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFile: MoodboardFile = {
          name: file.name,
          type: file.type,
          content: reader.result as string,
        };
        setFormData(prev => ({ ...prev, logo: newFile }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, logo: null }));
    }
  };

  // Função para upload da imagem de referência
  const handleReferenceImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newFile: MoodboardFile = {
          name: file.name,
          type: file.type,
          content: reader.result as string,
        };
        setFormData(prev => ({ ...prev, referenceImage: newFile }));
      };
      reader.readAsDataURL(file);
    } else {
      setFormData(prev => ({ ...prev, referenceImage: null }));
    }
  };

  // Função para remover o arquivo carregado
  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, moodboard: null }));
    // Limpar o input file
    const fileInput = document.getElementById('moodboard') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Função para remover a logo
  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: null }));
    // Limpar o input file
    const logoInput = document.getElementById('logo') as HTMLInputElement;
    if (logoInput) {
      logoInput.value = '';
    }
  };

  // Função para remover a imagem de referência
  const handleRemoveReferenceImage = () => {
    setFormData(prev => ({ ...prev, referenceImage: null }));
    // Limpar o input file
    const referenceInput = document.getElementById('referenceImage') as HTMLInputElement;
    if (referenceInput) {
      referenceInput.value = '';
    }
  };

  // Função para gerenciar as cores da paleta
  const handleColorsChange = (colors: ColorItem[]) => {
    setFormData(prev => ({ ...prev, colorPalette: colors }));
  };

  const handleSaveClick = async () => {
    try {
      // Validar todos os campos obrigatórios antes de salvar
      const requiredFields = [
        { field: 'name', label: 'Nome da marca' },
        { field: 'responsible', label: 'Responsável da marca' },
        { field: 'segment', label: 'Segmento' },
        { field: 'values', label: 'Valores' },
        { field: 'goals', label: 'Metas de negócio' },
        { field: 'successMetrics', label: 'Indicadores de sucesso' },
        { field: 'references', label: 'Conteúdos de referência' },
        { field: 'promise', label: 'Promessa única' },
        { field: 'restrictions', label: 'Restrições' },
        { field: 'moodboard', label: 'Moodboard' },
        { field: 'logo', label: 'Logo da marca' }
      ];

      const missingFields = requiredFields.filter(({ field }) => {
        if (field === 'moodboard') {
          return !formData.moodboard;
        }
        if (field === 'logo') {
          return !formData.logo;
        }
        return !formData[field as keyof BrandFormData]?.toString().trim();
      });

      if (missingFields.length > 0) {
        const fieldsList = missingFields.map(({ label }) => label).join(', ');
        toast.error(`${t.common.fieldRequired}: ${fieldsList}`);
        return;
      }

      await onSave(formData);
      clearDraft(); // Limpa o rascunho após salvar com sucesso
      onOpenChange(false);
    } catch (error) {
      // Em caso de erro, o toast será mostrado pela página pai
      console.error('Erro ao salvar marca:', error);
    }
  };

  const isFormValid = () => {
    const requiredFields = [
      'name', 'responsible', 'segment', 'values', 'goals',
      'successMetrics', 'references', 'promise', 'restrictions'
    ];

    const allTextFieldsValid = requiredFields.every(field =>
      formData[field as keyof BrandFormData]?.toString().trim() !== ''
    );

    const moodboardValid = formData.moodboard !== null;
    const logoValid = formData.logo !== null;

    return allTextFieldsValid && moodboardValid && logoValid;
  };

  // Função para lidar com o fechamento do diálogo
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Se estiver fechando, limpa o formulário
      setFormData(initialFormData);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-4xl flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{brandToEdit ? t.brands.editBrand : t.brands.newBrand}</DialogTitle>
              <DialogDescription>
                {brandToEdit ? t.brands.brandUpdated.replace('atualizada com sucesso!', 'as informações da sua marca.') : t.brands.createFirst.replace('Crie sua primeira marca para começar', 'Preencha os campos abaixo para adicionar uma nova marca.')}
              </DialogDescription>
            </div>
            {!brandToEdit && hasDraft() && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <Save className="h-3 w-3" />
                <span>{t.personas.draftSaved}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6 py-4">
          {/* Grid com os campos do formulário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* Coluna 1 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.brands.brandName} <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t.login.email}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="values">Valores <span className="text-red-500">*</span></Label>
                <Textarea
                  id="values"
                  value={formData.values}
                  onChange={handleInputChange}
                  placeholder="Descreva os princípios e valores fundamentais que guiam sua marca (ex: sustentabilidade, inovação, transparência)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goals">Quais as metas do negócio? <span className="text-red-500">*</span></Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={handleInputChange}
                  placeholder="Defina objetivos específicos e mensuráveis (aumentar vendas em 30%, gerar 500 leads/mês)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="successMetrics">Quais indicadores de sucesso? <span className="text-red-500">*</span></Label>
                <Textarea
                  id="successMetrics"
                  value={formData.successMetrics}
                  onChange={handleInputChange}
                  placeholder="Liste métricas que medirão o sucesso (taxa de conversão, engajamento, ROI, NPS)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialDates">Quais datas especiais no ano?</Label>
                <Textarea id="specialDates" value={formData.specialDates} onChange={handleInputChange} placeholder="Liste datas importantes para seu negócio (Black Friday, Natal, aniversário da empresa, sazonalidades)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promise">Qual promessa você faz e ninguém entrega igual? <span className="text-red-500">*</span></Label>
                <Textarea
                  id="promise"
                  value={formData.promise}
                  onChange={handleInputChange}
                  placeholder="Descreva sua proposta de valor única - o que diferencia sua marca da concorrência"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="milestones">Descreva marcos ou cases que reforçam autoridade e autenticidade da marca</Label>
                <Textarea id="milestones" value={formData.milestones} onChange={handleInputChange} placeholder="Conte conquistas, prêmios, cases de sucesso ou momentos importantes da trajetória da marca" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restrictions">Restrições <span className="text-red-500">*</span></Label>
                <Textarea
                  id="restrictions"
                  value={formData.restrictions}
                  onChange={handleInputChange}
                  placeholder="Liste limitações, temas proibidos ou diretrizes que devem ser evitadas na comunicação"
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="referenceImage">Imagem de referência da marca</Label>
                <div className="relative">
                  <Input
                    id="referenceImage"
                    type="file"
                    onChange={handleReferenceImageChange}
                    accept="image/*"
                    className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${formData.referenceImage ? 'pointer-events-none' : ''}`}
                  />
                  <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
                    formData.referenceImage 
                      ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50'
                  }`}>
                    {formData.referenceImage ? (
                      <div className="flex items-center justify-between w-full px-4">
                        <div className="flex items-center gap-2 max-w-[calc(100%-2rem)]">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="text-xs text-green-600 font-medium truncate">
                            {formData.referenceImage.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveReferenceImage}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0 rounded-full transition-all duration-200 relative z-20 ml-2"
                          title="Remover arquivo"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                          Clique para enviar imagem
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="responsible">Responsável da Marca <span className="text-red-500">*</span></Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, responsible: value }))} value={formData.responsible}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map(m => (
                      <SelectItem key={m.email} value={m.email}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento <span className="text-red-500">*</span></Label>
                <Textarea
                  id="segment"
                  value={formData.segment}
                  onChange={handleInputChange}
                  placeholder="Defina o setor de atuação da sua marca (tecnologia, moda, alimentação, etc.)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Palavras-Chave</Label>
                <Textarea id="keywords" value={formData.keywords} onChange={handleInputChange} placeholder="Palavras que representam sua marca, separadas por vírgula (tecnologia, inovação, sustentabilidade)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inspirations">Quais perfis ou marcas inspiram a sua marca e por quê?</Label>
                <Textarea id="inspirations" value={formData.inspirations} onChange={handleInputChange} placeholder="Mencione marcas/perfis de referência e explique o que admira neles (tom de voz, estratégia, valores)" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="references">Quais conteúdos são referência para sua marca? <span className="text-red-500">*</span></Label>
                <Textarea
                  id="references"
                  value={formData.references}
                  onChange={handleInputChange}
                  placeholder="Cole links de conteúdos que representam o estilo desejado (posts, vídeos, campanhas do Instagram, YouTube, etc.)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crisisInfo">Existe alguma crise de marca? Ou pode existir?</Label>
                <Textarea id="crisisInfo" value={formData.crisisInfo} onChange={handleInputChange} placeholder="Descreva situações de crise passadas ou potenciais riscos que devem ser considerados na comunicação" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collaborations">Existem ações com influenciadores, comunidades ou colaboradores?</Label>
                <Textarea id="collaborations" value={formData.collaborations} onChange={handleInputChange} placeholder="Descreva parcerias ativas, embaixadores da marca ou colaborações relevantes para o posicionamento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moodboard">Existem moodboard, referências visuais e identidade visual? <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="moodboard"
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${formData.moodboard ? 'pointer-events-none' : ''}`}
                  />
                  <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
                    formData.moodboard 
                      ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50'
                  }`}>
                    {formData.moodboard ? (
                      <div className="flex items-center justify-between w-full px-4">
                        <div className="flex items-center gap-2 max-w-[calc(100%-2rem)]">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="text-xs text-green-600 font-medium truncate">
                            {formData.moodboard.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFile}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0 rounded-full transition-all duration-200 relative z-20 ml-2"
                          title="Remover arquivo"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                          Clique para enviar moodboard
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da marca <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="logo"
                    type="file"
                    onChange={handleLogoChange}
                    accept="image/*"
                    className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 ${formData.logo ? 'pointer-events-none' : ''}`}
                  />
                  <div className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
                    formData.logo 
                      ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-primary/50'
                  }`}>
                    {formData.logo ? (
                      <div className="flex items-center justify-between w-full px-4">
                        <div className="flex items-center gap-2 max-w-[calc(100%-2rem)]">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                          <span className="text-xs text-green-600 font-medium truncate">
                            {formData.logo.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 flex-shrink-0 rounded-full transition-all duration-200 relative z-20 ml-2"
                          title="Remover arquivo"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center">
                          Clique para enviar logo
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seletor de Paleta de Cores - Fora do grid, ocupando toda a largura */}
          <div className="w-full">
            <ColorPicker
              colors={formData.colorPalette || []}
              onColorsChange={handleColorsChange}
              maxColors={8}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-center gap-4 pt-4 border-t border-border/40">
          <DialogClose asChild>
            <Button 
              type="button" 
              variant="outline" 
              className="min-w-[120px] h-11 px-8 font-medium transition-all duration-300 hover:bg-destructive hover:border-destructive hover:text-white dark:hover:bg-destructive"
            >
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button 
            type="submit" 
            onClick={handleSaveClick} 
            disabled={!isFormValid()}
            className="min-w-[120px] h-11 px-8 font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {brandToEdit ? t.common.save : t.brands.newBrand}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}