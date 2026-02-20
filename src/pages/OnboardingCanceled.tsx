import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreatorLogo } from "@/components/CreatorLogo";
import { XCircle, ArrowLeft, CreditCard, Info } from "lucide-react";
import { motion } from "framer-motion";
import canceledBanner from "@/assets/canceled-banner.jpg";

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Banner - taller with better object positioning */}
      <div className="relative h-52 lg:h-64 flex-shrink-0">
        <img
          src={canceledBanner}
          alt="Pagamento Cancelado"
          className="w-full h-full object-cover object-[center_45%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        {/* Logo overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/80 backdrop-blur-sm rounded-2xl px-5 py-2.5 shadow-md">
          <CreatorLogo />
        </div>
      </div>

      {/* Content - single unified card, no dividers */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 pb-8 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-card rounded-2xl shadow-lg p-6 lg:p-8 flex flex-col gap-6"
        >
          {/* Header */}
          <div className="text-center flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Pagamento Cancelado
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Você cancelou o processo de pagamento
              </p>
            </div>
          </div>

          {/* Info section as inner card */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">O que aconteceu</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>O pagamento não foi processado</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Sua equipe permanece com o plano FREE</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Você ainda tem os 5 créditos de boas-vindas</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
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

            <p className="text-xs text-muted-foreground text-center">
              Você pode fazer upgrade do seu plano a qualquer momento através do menu "Planos" após fazer login.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OnboardingCanceled;
