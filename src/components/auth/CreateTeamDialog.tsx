import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface CreateTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTeamDialog({ open, onClose, onSuccess }: CreateTeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Por favor, insira o nome da equipe");
      return;
    }

    if (!teamCode.trim()) {
      toast.error("Por favor, crie um código de acesso");
      return;
    }

    setIsLoading(true);

    try {
      // Verificar sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Sessão não encontrada. Por favor, tente novamente.");
        onClose();
        return;
      }

      console.log("Criando equipe para usuário:", session.user.id);

      // Usar a função segura do banco de dados que bypassa RLS
      const { data, error } = await supabase.rpc('create_team_for_user', {
        p_user_id: session.user.id,
        p_team_name: teamName,
        p_team_code: teamCode,
        p_plan_id: 'free'
      });

      if (error) {
        console.error('Erro ao criar equipe:', error);
        throw new Error(error.message);
      }

      console.log("Equipe criada com sucesso:", data);

      toast.success("Equipe criada com sucesso!");
      
      // Fechar dialog e redirecionar para dashboard
      onSuccess();
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Erro ao criar equipe:', error);
      toast.error(error.message || "Erro ao criar equipe. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Criar nova equipe</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Você será o administrador desta equipe e poderá convidar outros membros usando o código de acesso que você definir.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="teamName">Nome da equipe</Label>
            <Input
              id="teamName"
              placeholder="Ex: Minha Empresa, Time Marketing..."
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teamCode">Código de acesso</Label>
            <div className="relative">
              <Input
                id="teamCode"
                type={showCode ? "text" : "password"}
                placeholder="Crie um código seguro para sua equipe"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="pr-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowCode(!showCode)}
                disabled={isLoading}
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este código será usado por outros usuários para solicitar entrada na sua equipe.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTeamCode(generateRandomCode())}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Gerar código aleatório
            </Button>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Voltar
          </Button>
          <Button
            onClick={handleCreateTeam}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar equipe"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
