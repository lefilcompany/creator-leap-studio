import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Gift, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RedeemCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RedeemCouponDialog({ open, onOpenChange, onSuccess }: RedeemCouponDialogProps) {
  const { reloadUserData } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isValidFormat, setIsValidFormat] = useState(false);

  const handleCouponInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Adicionar hífens automaticamente
    if (value.length > 2) {
      value = value.slice(0, 2) + '-' + value.slice(2);
    }
    if (value.length > 9) {
      value = value.slice(0, 9) + '-' + value.slice(9);
    }
    
    setCouponCode(value.slice(0, 13)); // XX-YYYYYY-CC = 13 chars
    
    // Validar formato
    const regex = /^(B4|P7|C2|C1|C4)-[A-Z0-9]{6}-[A-Z0-9]{2}$/;
    const isValid = regex.test(value);
    setIsValidFormat(isValid);
    
    // Limpar mensagens ao alterar input
    if (validationError || successMessage) {
      setValidationError('');
      setSuccessMessage('');
    }
  };

  const handleRedeem = async () => {
    if (!isValidFormat) {
      setValidationError('Formato de cupom inválido');
      return;
    }

    setIsRedeeming(true);
    setValidationError('');
    setSuccessMessage('');

    try {
      console.log('[RedeemCouponDialog] Redeeming coupon:', couponCode);

      const { data, error } = await supabase.functions.invoke('redeem-coupon', {
        body: { couponCode }
      });

      if (error) {
        console.error('[RedeemCouponDialog] Error invoking function:', error);
        throw error;
      }

      console.log('[RedeemCouponDialog] Response:', data);

      if (data.valid) {
        // Sucesso!
        setSuccessMessage(`🎉 ${data.prize.description} aplicado(s) com sucesso!`);
        toast.success('Benefícios aplicados com sucesso!');
        
        // Aguardar 2 segundos para mostrar mensagem de sucesso
        setTimeout(async () => {
          await reloadUserData();
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        // Erro de validação
        setValidationError(data.error || 'Cupom inválido');
      }
    } catch (error: any) {
      console.error('[RedeemCouponDialog] Error:', error);
      setValidationError(error.message || 'Erro ao processar cupom. Tente novamente.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleClose = () => {
    setCouponCode('');
    setValidationError('');
    setSuccessMessage('');
    setIsValidFormat(false);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidFormat && !isRedeeming) {
      handleRedeem();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Gift className="h-6 w-6 text-primary" />
            Resgatar Cupom de Premiação
          </DialogTitle>
          <DialogDescription>
            Insira seu código de cupom para receber benefícios instantâneos na sua equipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input com formatação automática */}
          <div className="space-y-2">
            <Label htmlFor="coupon-code" className="text-base font-semibold">
              Código do Cupom
            </Label>
            <Input
              id="coupon-code"
              placeholder="XX-YYYYYY-CC"
              value={couponCode}
              onChange={handleCouponInput}
              onKeyPress={handleKeyPress}
              maxLength={13}
              className="text-center text-lg font-mono tracking-wider"
              disabled={isRedeeming}
              autoFocus
            />
            {couponCode && (
              <p className="text-xs text-muted-foreground text-center">
                {isValidFormat ? (
                  <span className="text-green-600 font-medium">✓ Formato válido</span>
                ) : (
                  <span className="text-amber-600">Formato: XX-YYYYYY-CC</span>
                )}
              </p>
            )}
          </div>

          {/* Seção informativa */}
          <Alert className="bg-primary/5 border-primary/20">
            <Gift className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Como funciona?</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 text-sm mt-2">
                <li><strong className="font-semibold">B4-XXXXXX-XX:</strong> 14 dias extras no plano Basic</li>
                <li><strong className="font-semibold">P7-XXXXXX-XX:</strong> 7 dias extras no plano Pro</li>
                <li><strong className="font-semibold">C1-XXXXXX-XX:</strong> 100 créditos distribuídos</li>
                <li><strong className="font-semibold">C2-XXXXXX-XX:</strong> 200 créditos distribuídos</li>
                <li><strong className="font-semibold">C4-XXXXXX-XX:</strong> 40 créditos distribuídos</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Os créditos são distribuídos proporcionalmente entre todas as funcionalidades.
              </p>
            </AlertDescription>
          </Alert>

          {/* Feedback de validação - Erro */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">
                {validationError}
              </AlertDescription>
            </Alert>
          )}

          {/* Feedback de validação - Sucesso */}
          {successMessage && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isRedeeming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRedeem}
            disabled={isRedeeming || !isValidFormat || !!successMessage}
            className="min-w-[120px]"
          >
            {isRedeeming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Resgatar Cupom
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
