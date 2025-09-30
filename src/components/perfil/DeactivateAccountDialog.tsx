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
import { toast } from 'sonner';

interface DeactivateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeactivateAccountDialog({ open, onOpenChange }: DeactivateAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!password) {
      toast.error('Digite sua senha para confirmar');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Conta inativada com sucesso');
      onOpenChange(false);
      setPassword('');
    } catch (error) {
      toast.error('Erro ao inativar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Inativar Conta</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Sua conta será desativada e você não poderá mais acessá-la. Seus dados serão
              preservados e você poderá reativar sua conta a qualquer momento cadastrando-se
              novamente com o mesmo email.
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="deactivate-password">Digite sua senha para confirmar</Label>
              <Input
                id="deactivate-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
              />
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
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isLoading}
          >
            {isLoading ? 'Inativando...' : 'Inativar Conta'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
