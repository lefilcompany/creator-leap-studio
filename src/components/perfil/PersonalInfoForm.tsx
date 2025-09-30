import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ChangePasswordDialog from './ChangePasswordDialog';

interface PersonalInfoFormProps {
  initialData: {
    name: string;
    email: string;
    phone: string;
    state: string;
    city: string;
  };
}

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

export default function PersonalInfoForm({ initialData }: PersonalInfoFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length >= 1) {
      formatted = `(${cleaned.substring(0, 2)}`;
    }
    if (cleaned.length >= 3) {
      formatted += `) ${cleaned.substring(2, 7)}`;
    }
    if (cleaned.length >= 8) {
      formatted += `-${cleaned.substring(7, 11)}`;
    }
    
    return formatted;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then((data: State[]) => {
        setStates(data);
        setLoadingStates(false);
      })
      .catch(() => {
        toast.error('Erro ao carregar lista de estados');
        setLoadingStates(false);
      });
  }, []);

  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
        .then(res => res.json())
        .then((data: City[]) => {
          setCities(data);
          setLoadingCities(false);
        })
        .catch(() => {
          toast.error('Erro ao carregar lista de cidades');
          setLoadingCities(false);
        });
    }
  }, [formData.state]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Informações atualizadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar informações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="group shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-primary/[0.02] to-secondary/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <CardHeader className="relative bg-gradient-to-r from-primary/8 via-secondary/5 to-accent/8 border-b border-primary/10 p-8">
          <div className="flex items-start gap-4">
            <div className="relative p-3 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
              <User className="h-7 w-7 text-primary relative z-10" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
                Dados Pessoais
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm md:text-base">
                Atualize suas informações de contato e localização
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-8 relative">
          {/* Nome e Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3 group/field">
              <Label htmlFor="name" className="text-sm font-semibold text-foreground flex items-center gap-2 group-hover/field:text-primary transition-colors">
                <div className="w-2 h-2 bg-gradient-to-r from-primary to-secondary rounded-full shadow-sm group-hover/field:shadow-md group-hover/field:scale-125 transition-all duration-300" />
                Nome Completo
              </Label>
              <div className="relative">
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => handleChange('name', e.target.value)} 
                  className="h-12 border-2 border-primary/20 focus:border-primary/50 hover:border-primary/30 rounded-xl bg-background/80 backdrop-blur-sm transition-all duration-300 text-base shadow-sm focus:shadow-md pl-4"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3 group/field">
              <Label htmlFor="email" className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-muted rounded-full" />
                Email
              </Label>
              <div className="relative">
                <Input 
                  id="email"
                  type="email" 
                  value={formData.email || ''} 
                  disabled 
                  className="h-12 cursor-not-allowed bg-muted/30 border-2 border-muted/40 rounded-xl text-base pl-4 shadow-sm"
                />
                <p className="absolute -bottom-6 left-0 text-xs text-muted-foreground/80 italic">
                  🔒 Campo protegido por segurança
                </p>
              </div>
            </div>
          </div>
          
          {/* Telefone, Estado e Cidade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-3 group/field">
              <Label htmlFor="phone" className="text-sm font-semibold text-foreground flex items-center gap-2 group-hover/field:text-accent transition-colors">
                <div className="w-2 h-2 bg-gradient-to-r from-accent to-primary rounded-full shadow-sm group-hover/field:shadow-md group-hover/field:scale-125 transition-all duration-300" />
                Telefone
              </Label>
              <div className="relative">
                <Input 
                  id="phone" 
                  value={formData.phone || ''} 
                  onChange={(e) => handlePhoneChange(e.target.value)} 
                  className="h-12 border-2 border-accent/20 focus:border-accent/50 hover:border-accent/30 rounded-xl bg-background/80 backdrop-blur-sm transition-all duration-300 text-base shadow-sm focus:shadow-md pl-4"
                  placeholder="(XX) XXXXX-XXXX"
                  maxLength={15}
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/5 to-primary/5 opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3 group/field">
              <Label htmlFor="state" className="text-sm font-semibold text-foreground flex items-center gap-2 group-hover/field:text-secondary transition-colors">
                <div className="w-2 h-2 bg-gradient-to-r from-secondary to-accent rounded-full shadow-sm group-hover/field:shadow-md group-hover/field:scale-125 transition-all duration-300" />
                Estado
              </Label>
              <Select 
                value={formData.state || ''} 
                onValueChange={(value) => {
                  handleChange('state', value);
                  handleChange('city', ''); // Reset city when state changes
                }} 
                disabled={loadingStates}
              >
                <SelectTrigger className="h-12 border-2 border-secondary/20 focus:border-secondary/50 hover:border-secondary/30 rounded-xl bg-background/80 backdrop-blur-sm text-base shadow-sm focus:shadow-md transition-all duration-300">
                  {loadingStates ? 'Carregando...' : <SelectValue placeholder="Selecione um estado" />}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-secondary/20 shadow-xl">
                  {states.map(state => (
                    <SelectItem key={state.id} value={state.sigla} className="text-base rounded-lg hover:bg-secondary/10 transition-colors cursor-pointer">
                      {state.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 group/field">
              <Label htmlFor="city" className="text-sm font-semibold text-foreground flex items-center gap-2 group-hover/field:text-secondary transition-colors">
                <div className="w-2 h-2 bg-gradient-to-r from-secondary to-primary rounded-full shadow-sm group-hover/field:shadow-md group-hover/field:scale-125 transition-all duration-300" />
                Cidade
              </Label>
              <Select 
                value={formData.city || ''} 
                onValueChange={(value) => handleChange('city', value)} 
                disabled={!formData.state || loadingCities}
              >
                <SelectTrigger className="h-12 border-2 border-secondary/20 focus:border-secondary/50 hover:border-secondary/30 rounded-xl bg-background/80 backdrop-blur-sm text-base shadow-sm focus:shadow-md transition-all duration-300 disabled:opacity-50">
                  {loadingCities ? 'Carregando...' : <SelectValue placeholder="Selecione uma cidade" />}
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2 border-secondary/20 shadow-xl">
                  {cities.map(city => (
                    <SelectItem key={city.id} value={city.nome} className="text-base rounded-lg hover:bg-secondary/10 transition-colors cursor-pointer">
                      {city.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-primary/10">
            <Button 
              variant="outline" 
              onClick={() => setIsPasswordDialogOpen(true)} 
              className="group/btn w-full sm:w-auto h-12 bg-gradient-to-r from-accent/5 to-secondary/5 border-2 border-accent/30 hover:border-accent/60 hover:bg-gradient-to-r hover:from-accent/15 hover:to-secondary/15 text-foreground font-semibold rounded-xl transition-all duration-300 shadow-sm hover:shadow-md text-base hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="group-hover/btn:text-accent transition-colors">Alterar Senha</span>
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="group/btn w-full sm:w-auto flex-1 h-12 bg-gradient-to-r from-primary via-secondary to-accent hover:from-primary/90 hover:via-secondary/90 hover:to-accent/90 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              {isSaving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              <span className="relative z-10">{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      />
    </>
  );
}
