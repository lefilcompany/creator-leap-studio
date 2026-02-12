'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangePasswordDialog({ isOpen, onOpenChange }: ChangePasswordDialogProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCurrentPasswordValid, setIsCurrentPasswordValid] = useState<boolean | null>(null);
  const [hasVerifiedCurrentPassword, setHasVerifiedCurrentPassword] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const passwordsMatch = newPassword === confirmPassword;
  const isFormValid = newPassword.length >= 6 && passwordsMatch && hasVerifiedCurrentPassword;

  const verifyCurrentPassword = async () => {
    if (!currentPassword || !user?.email) return;
    
    setIsVerifying(true);
    
    try {
      // Tenta fazer login com a senha atual para verificar
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (!error) {
        setIsCurrentPasswordValid(true);
        setHasVerifiedCurrentPassword(true);
        toast.success('Senha atual verificada com sucesso!');
      } else {
        toast.error('Senha atual incorreta. Tente novamente.');
        setIsCurrentPasswordValid(false);
        setHasVerifiedCurrentPassword(false);
      }
    } catch (error) {
      toast.error('Erro ao verificar senha. Tente novamente.');
      setIsCurrentPasswordValid(false);
      setHasVerifiedCurrentPassword(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCurrentPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(e.target.value);
    setIsCurrentPasswordValid(null);
    setHasVerifiedCurrentPassword(false);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    // Removido toast redundante - validação visual já existe
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!isFormValid) {
        toast.error('Complete todos os requisitos antes de salvar.');
        return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Resetar o flag force_password_change se o usuário atual tiver esse flag ativo
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ force_password_change: false })
          .eq('id', user.id)
          .eq('force_password_change', true); // Só atualiza se estiver ativo
      }

      toast.success('Senha alterada com sucesso!');
      onOpenChange(false);
      
      setTimeout(() => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setIsCurrentPasswordValid(null);
          setHasVerifiedCurrentPassword(false);
      }, 300);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao alterar senha. Tente novamente.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-lg lg:max-w-xl bg-gradient-to-br from-background to-muted/20 border border-primary/30 shadow-xl [&>div]:p-0 [&>div]:overflow-visible overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-6 space-y-0">
          <DialogHeader className="text-center space-y-3">
            <DialogTitle className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Alterar Senha
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Por segurança, confirme primeiro sua senha atual antes de criar uma nova senha forte e única
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 md:space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-xs md:text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Senha Atual
              </Label>
              <div className="relative">
                <Input 
                  id="currentPassword" 
                  type={showPassword ? 'text' : 'password'} 
                  value={currentPassword} 
                  onChange={handleCurrentPasswordChange}
                  className="h-10 md:h-11 border border-orange-300/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30 transition-all rounded-lg pr-20 md:pr-24 text-sm md:text-base bg-gradient-to-r from-orange-50/40 to-red-50/40 hover:border-orange-400"
                  placeholder="Digite sua senha atual"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {currentPassword && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={verifyCurrentPassword}
                      disabled={isVerifying || !currentPassword}
                      className="h-7 px-2.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-md transition-all shadow-sm"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Verificar'
                      )}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 hover:bg-orange-100/70 rounded-lg" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5 text-orange-600"/> : <Eye className="h-3.5 w-3.5 text-orange-600"/>}
                  </Button>
                </div>
              </div>
              {isCurrentPasswordValid !== null && (
                <div className={`flex items-center gap-2 text-xs ${
                  isCurrentPasswordValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isCurrentPasswordValid ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="font-medium">Senha atual verificada com sucesso!</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5" />
                      <span className="font-medium">Senha atual incorreta</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-xs md:text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Nova Senha
              </Label>
              <div className="relative">
                <Input 
                  id="newPassword" 
                  type={showPassword ? 'text' : 'password'} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!hasVerifiedCurrentPassword}
                  className={`h-10 md:h-11 border border-blue-300/50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all rounded-lg pr-10 text-sm md:text-base bg-gradient-to-r from-blue-50/40 to-cyan-50/40 hover:border-blue-400 ${
                    !hasVerifiedCurrentPassword ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder={hasVerifiedCurrentPassword ? "Digite sua nova senha" : "Verifique a senha atual primeiro"}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-blue-100/70 rounded-lg" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5 text-blue-600"/> : <Eye className="h-3.5 w-3.5 text-blue-600"/>}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs md:text-sm font-bold text-foreground flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Confirmar Nova Senha
              </Label>
              <Input 
                id="confirmPassword" 
                type={showPassword ? 'text' : 'password'} 
                value={confirmPassword} 
                onChange={handleConfirmPasswordChange}
                disabled={!hasVerifiedCurrentPassword}
                className={`h-10 md:h-11 border border-purple-300/50 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all rounded-lg text-sm md:text-base bg-gradient-to-r from-purple-50/40 to-pink-50/40 hover:border-purple-400 ${
                  !hasVerifiedCurrentPassword ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder={hasVerifiedCurrentPassword ? "Confirme sua nova senha" : "Verifique a senha atual primeiro"}
              />
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200/50 shadow-sm">
              <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2 text-xs md:text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                Requisitos:
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    hasVerifiedCurrentPassword ? 'bg-green-500 shadow-sm' : 'bg-gray-300'
                  }`}>
                    {hasVerifiedCurrentPassword && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={`font-medium transition-colors ${
                    hasVerifiedCurrentPassword ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    Senha atual verificada
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    newPassword.length >= 6 ? 'bg-green-500 shadow-sm' : 'bg-gray-300'
                  }`}>
                    {newPassword.length >= 6 && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={`font-medium transition-colors ${
                    newPassword.length >= 6 ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${
                    passwordsMatch && confirmPassword ? 'bg-green-500 shadow-sm' : 'bg-gray-300'
                  }`}>
                    {passwordsMatch && confirmPassword && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <span className={`font-medium transition-colors ${
                    passwordsMatch && confirmPassword ? 'text-green-700' : 'text-gray-500'
                  }`}>
                    Senhas coincidem
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-primary/10 p-4 flex flex-col sm:flex-row gap-3 bg-background/80 backdrop-blur-sm">
          <DialogClose asChild>
            <Button 
              variant="outline"
              className="w-full sm:flex-1 h-10 border border-accent hover:border-primary hover:bg-primary/10 hover:text-primary text-accent rounded-lg font-medium transition-all text-sm"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid}
            className="w-full sm:flex-1 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 hover:from-blue-700 hover:via-purple-700 hover:to-cyan-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Salvar Nova Senha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
