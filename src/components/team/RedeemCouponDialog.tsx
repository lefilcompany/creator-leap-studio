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
  onSuccess?: () => void;
  currentPlanId?: string;
}

export default function RedeemCouponDialog({ open, onOpenChange, onSuccess, currentPlanId = 'free' }: RedeemCouponDialogProps) {
  const { reloadUserData, refreshUserCredits } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isValidFormat, setIsValidFormat] = useState(false);

  const handleCouponInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '').trim();
    setCouponCode(value);
    setIsValidFormat(value.length >= 3);
    if (validationError || successMessage) {
      setValidationError('');
      setSuccessMessage('');
    }
  };

  const validatePlanCompatibility = (_code: string): string | null => {
    return null;
  };

  const handleRedeem = async () => {
    if (!isValidFormat) {
      setValidationError('Formato de cupom inválido');
      return;
    }

    // Validar compatibilidade de plano
    const planError = validatePlanCompatibility(couponCode);
    if (planError) {
      setValidationError(planError);
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
          await refreshUserCredits();
          await reloadUserData();
          onSuccess?.();
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
            Insira seu código de cupom para receber créditos ou benefícios instantâneos
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
              placeholder="Digite seu cupom"
              value={couponCode}
              onChange={handleCouponInput}
              onKeyPress={handleKeyPress}
              maxLength={30}
              className="text-center text-lg font-mono tracking-wider"
              disabled={isRedeeming}
              autoFocus
            />
            {couponCode && (
              <p className="text-xs text-muted-foreground text-center">
                {isValidFormat ? (
                  <span className="text-green-600 font-medium">✓ Formato válido</span>
                ) : (
                  <span className="text-amber-600">Digite pelo menos 3 caracteres</span>
                )}
              </p>
            )}
          </div>

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
