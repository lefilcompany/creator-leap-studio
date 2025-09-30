import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Conta deletada com sucesso');
      onOpenChange(false);
      setPassword('');
      setEmailConfirm('');
      setUnderstood(false);
    } catch (error) {
      toast.error('Erro ao deletar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Deletar Conta Permanentemente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
              <p className="font-bold text-destructive text-sm">ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL!</p>
              <p className="text-sm">
                Ao deletar sua conta:
              </p>
              <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                <li>Todos os seus dados serão <span className="font-bold">permanentemente removidos</span></li>
                <li>Você perderá acesso a todas as marcas, temas e conteúdos</li>
                <li>Não será possível recuperar sua conta ou dados</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delete-password">Digite sua senha</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-sm font-semibold">
                  Para confirmar, digite seu email: <span className="text-destructive font-bold">{userEmail}</span>
                </Label>
                <Input
                  id="delete-confirm"
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  placeholder="Digite seu email aqui"
                  className="font-medium"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Esta é uma medida de segurança adicional para confirmar sua identidade
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="understood"
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <label
                  htmlFor="understood"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Eu entendo que esta ação é permanente e não pode ser desfeita
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            className="border-accent text-accent"
            onClick={() => {
              onOpenChange(false);
              setPassword('');
              setEmailConfirm('');
              setUnderstood(false);
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? 'Deletando...' : 'Deletar Conta Permanentemente'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
