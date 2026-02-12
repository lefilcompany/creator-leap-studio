import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export default function DeleteAccountDialog({ open, onOpenChange, userEmail }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!password) {
      toast.error('Digite sua senha para confirmar');
      return;
    }

    if (emailConfirm.toLowerCase().trim() !== userEmail.toLowerCase().trim()) {
      toast.error('O email digitado não corresponde ao seu email');
      return;
    }

    if (!understood) {
      toast.error('Você precisa confirmar que entendeu as consequências');
      return;
    }

    setIsLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: password,
      });

      if (signInError) {
        toast.error('Senha incorreta');
        setIsLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao deletar conta');
      }

      toast.success('Conta deletada com sucesso');
      
      await logout();
      navigate('/');
      onOpenChange(false);
      setPassword('');
      setEmailConfirm('');
      setUnderstood(false);
    } catch (error: any) {
      console.error('Erro ao deletar conta:', error);
      toast.error(error.message || 'Erro ao deletar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setPassword('');
    setEmailConfirm('');
    setUnderstood(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background to-muted/20 border border-border/50 shadow-xl [&>div]:p-0 [&>div]:overflow-visible overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6 space-y-0">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-destructive/10 rounded-xl">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-xl font-bold text-destructive">
                Deletar Conta
              </DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Esta ação é permanente e não pode ser desfeita.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-5">
            {/* Danger zone */}
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="font-bold text-destructive text-sm">ATENÇÃO: IRREVERSÍVEL</p>
              </div>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1.5 ml-1">
                <li>Todos os seus dados serão <span className="font-semibold text-foreground">permanentemente removidos</span></li>
                <li>Você perderá acesso a marcas, temas e conteúdos</li>
                <li>Não será possível recuperar sua conta</li>
              </ul>
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <Label htmlFor="delete-password" className="text-sm font-semibold">
                Confirme sua senha
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="h-11 rounded-lg"
              />
            </div>

            {/* Email confirmation */}
            <div className="space-y-2.5">
              <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                Digite seu email para confirmar
              </Label>
              <p className="text-xs text-muted-foreground">
                Email: <span className="text-destructive font-semibold">{userEmail}</span>
              </p>
              <Input
                id="delete-confirm"
                type="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                placeholder="Digite seu email aqui"
                className="h-11 rounded-lg"
                autoComplete="off"
              />
            </div>

            {/* Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl">
              <Checkbox
                id="understood"
                checked={understood}
                onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                className="mt-0.5"
              />
              <label
                htmlFor="understood"
                className="text-sm leading-relaxed cursor-pointer select-none"
              >
                Eu entendo que esta ação é <span className="font-semibold">permanente</span> e não pode ser desfeita
              </label>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 p-4 flex flex-col sm:flex-row gap-3 bg-background/80 backdrop-blur-sm">
          <Button
            variant="outline"
            className="w-full sm:flex-1 h-10 rounded-lg"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:flex-1 h-10 rounded-lg"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deletando...
              </>
            ) : (
              'Deletar Permanentemente'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
