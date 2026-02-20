import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { XCircle, ArrowLeft, CreditCard, Info, Gift } from "lucide-react";
import { motion } from "framer-motion";

const OnboardingCanceled = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center px-4 sm:px-6 py-8">
      {/* Decorative background circles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <CreatorLogo />
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-card rounded-2xl shadow-lg border border-border/50 p-6 lg:p-8 flex flex-col gap-6"
        >
          {/* Status icon + title */}
          <div className="text-center flex flex-col items-center gap-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shadow-sm"
            >
              <XCircle className="h-8 w-8 text-orange-500 dark:text-orange-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Pagamento Cancelado
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Você cancelou o processo de pagamento
              </p>
            </div>
          </div>

          {/* Info section */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">O que aconteceu</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground pl-1">
              <li className="flex gap-2.5 items-start">
                <span className="text-primary mt-0.5 text-xs">●</span>
                <span>O pagamento não foi processado</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="text-primary mt-0.5 text-xs">●</span>
                <span>Sua equipe permanece com o plano FREE</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="text-primary mt-0.5 text-xs">●</span>
                <span>Você ainda tem os 5 créditos de boas-vindas</span>
              </li>
              <li className="flex gap-2.5 items-start">
                <span className="text-primary mt-0.5 text-xs">●</span>
                <span>Você pode tentar novamente a qualquer momento</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/onboarding')} 
              className="w-full h-11"
              size="lg"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full h-11"
              size="lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ir para Login
            </Button>
          </div>
        </motion.div>

        {/* Footer hint */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs text-muted-foreground text-center mt-4 max-w-sm"
        >
          Você pode fazer upgrade do seu plano a qualquer momento através do menu "Planos" após fazer login.
        </motion.p>
      </div>
    </div>
  );
};

export default OnboardingCanceled;
