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
  currentPlanId: string;
}

export default function RedeemCouponDialog({ open, onOpenChange, onSuccess, currentPlanId }: RedeemCouponDialogProps) {
  const { reloadUserData } = useAuth();
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isValidFormat, setIsValidFormat] = useState(false);

  // Detectar se é cupom promocional (formato: nome200)
  const isPromoCoupon = (code: string): boolean => {
    return /^[a-z]+200$/i.test(code.replace(/\s/g, ''));
  };

  // Detectar se é cupom checksum (formato: XX-YYYYYY-CC)
  const isChecksumFormat = (code: string): boolean => {
    return /^(B4|P7|C2|C1|C4)-[A-Z0-9]{6}-[A-Z0-9]{2}$/.test(code);
  };

  const handleCouponInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Se parece com cupom promocional (contém letras minúsculas ou termina com 200)
    if (/[a-z]/.test(value) || value.toLowerCase().endsWith('200')) {
      // Manter como está, apenas remover espaços
      value = value.replace(/\s/g, '').toLowerCase();
      setCouponCode(value);
      setIsValidFormat(isPromoCoupon(value));
    } else {
      // Formato checksum - aplicar formatação automática
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Adicionar hífens automaticamente
      if (value.length > 2) {
        value = value.slice(0, 2) + '-' + value.slice(2);
      }
      if (value.length > 9) {
        value = value.slice(0, 9) + '-' + value.slice(9);
      }
      
      setCouponCode(value.slice(0, 12)); // XX-YYYYYY-CC = 12 chars
      setIsValidFormat(isChecksumFormat(value));
    }
    
    // Limpar mensagens ao alterar input
    if (validationError || successMessage) {
      setValidationError('');
      setSuccessMessage('');
    }
  };

  const validatePlanCompatibility = (code: string): string | null => {
    // Cupons promocionais não têm restrição de plano
    if (isPromoCoupon(code)) {
      return null;
    }
    
    const prefix = code.split('-')[0];
    if (prefix === 'B4' && currentPlanId !== 'free') {
      return 'Este cupom só pode ser usado por equipes no plano Free.';
    }
    if (prefix === 'P7' && currentPlanId !== 'free' && currentPlanId !== 'basic') {
      return 'Este cupom só pode ser usado por equipes nos planos Free ou Basic.';
    }
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
                  <span className="text-amber-600">Ex: nome200 ou XX-YYYYYY-CC</span>
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
