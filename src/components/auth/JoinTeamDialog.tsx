import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface JoinTeamDialogProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onSuccess: () => void;
}

export function JoinTeamDialog({ open, onClose, onBack, onSuccess }: JoinTeamDialogProps) {
  const [teamCode, setTeamCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRequest = async () => {
    if (!teamCode.trim()) {
      toast.error("Por favor, insira o código da equipe");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Buscar equipe pelo código
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('code', teamCode)
        .single();

      if (teamError || !team) {
        toast.error("Código de equipe inválido");
        return;
      }

      // Verificar se já existe uma solicitação pendente
      const { data: existingRequest } = await supabase
        .from('team_join_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('team_id', team.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.info("Você já possui uma solicitação pendente para esta equipe");
          return;
        } else if (existingRequest.status === 'approved') {
          toast.info("Sua solicitação já foi aprovada");
          navigate("/dashboard");
          return;
        }
      }

      // Criar solicitação de entrada
      const { error: requestError } = await supabase
        .from('team_join_requests')
        .insert({
          user_id: user.id,
          team_id: team.id,
          status: 'pending'
        });

      if (requestError) throw requestError;

      toast.success("Solicitação enviada! Aguarde a aprovação do administrador.");
      onSuccess();
      // Redirecionar para uma página de espera ou login
      navigate("/");
    } catch (error: any) {
      console.error('Erro ao solicitar entrada:', error);
      toast.error(error.message || "Erro ao solicitar entrada na equipe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Entrar em uma equipe</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Para entrar em uma equipe existente, você precisa do código de acesso fornecido pelo administrador da equipe.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="joinTeamCode">Código da equipe</Label>
            <div className="relative">
              <Input
                id="joinTeamCode"
                type={showCode ? "text" : "password"}
                placeholder="Digite o código fornecido pelo administrador"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="pr-10"
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
              Após enviar, aguarde a aprovação do administrador para acessar o sistema.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Voltar
          </Button>
          <Button
            onClick={handleJoinRequest}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Solicitar entrada"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
