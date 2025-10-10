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
      // Verificar sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        navigate("/login");
        return;
      }

      // Buscar equipe pelo código usando função SQL segura
      console.log('🔍 Buscando equipe com código:', teamCode.trim());
      const { data: teamId, error: teamError } = await supabase
        .rpc('get_team_id_by_code', { p_team_code: teamCode.trim() });

      console.log('📊 Resultado da busca - teamId:', teamId, 'error:', teamError);

      if (teamError) {
        console.error('❌ Erro ao buscar equipe:', teamError);
        toast.error("Erro ao buscar equipe. Tente novamente.");
        return;
      }

      if (!teamId) {
        toast.error("Código de equipe inválido. Verifique e tente novamente.");
        return;
      }

      console.log('✅ Equipe encontrada com ID:', teamId);

      // Verificar se já existe uma solicitação pendente
      const { data: existingRequest } = await supabase
        .from('team_join_requests')
        .select('id, status')
        .eq('user_id', session.user.id)
        .eq('team_id', teamId)
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          toast.info("Você já possui uma solicitação pendente para esta equipe");
          return;
        } else if (existingRequest.status === 'approved') {
          toast.info("Sua solicitação já foi aprovada");
          await supabase.auth.signOut();
          navigate("/login");
          return;
        }
      }

      // Criar solicitação de entrada
      const { error: requestError } = await supabase
        .from('team_join_requests')
        .insert({
          user_id: session.user.id,
          team_id: teamId,
          status: 'pending'
        });

      if (requestError) {
        console.error('Erro ao criar solicitação:', requestError);
        throw new Error(`Não foi possível enviar a solicitação: ${requestError.message}`);
      }

      toast.success("Solicitação enviada com sucesso! Faça login para acessar o sistema.");
      
      // Fazer logout
      await supabase.auth.signOut();
      
      onSuccess();
      navigate("/login");
    } catch (error: any) {
      console.error('Erro ao solicitar entrada:', error);
      toast.error(error.message || "Erro ao solicitar entrada na equipe. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
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
                autoComplete="off"
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
              {isLoading 
                ? "Verificando código da equipe..." 
                : "Após enviar, aguarde a aprovação do administrador para acessar o sistema."}
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
