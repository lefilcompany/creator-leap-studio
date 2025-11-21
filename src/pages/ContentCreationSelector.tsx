import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Video, Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { CREDIT_COSTS } from "@/lib/creditCosts";

type ContentCreationType = 'quick' | 'image' | 'video' | null;

export default function ContentCreationSelector() {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [contentType, setContentType] = useState<ContentCreationType>(null);

  const handleContinue = () => {
    if (!contentType) return;

    const routes = {
      quick: '/quick-content',
      image: '/create-image',
      video: '/create-video',
    };

    navigate(routes[contentType]);
  };

  const contentOptions = [
    {
      id: 'quick',
      title: 'Criação Rápida',
      description: 'Gere imagens rapidamente com configurações otimizadas',
      icon: Zap,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20 hover:border-primary/40',
      credits: CREDIT_COSTS.QUICK_IMAGE,
    },
    {
      id: 'image',
      title: 'Criação Personalizada',
      description: 'Crie imagens com controle total de parâmetros e configurações',
      icon: Sparkles,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      borderColor: 'border-secondary/20 hover:border-secondary/40',
      credits: CREDIT_COSTS.COMPLETE_IMAGE,
    },
    {
      id: 'video',
      title: 'Criação de Vídeo',
      description: 'Produza vídeos profissionais com IA Veo 3.0 e 3.1',
      icon: Video,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      borderColor: 'border-accent/20 hover:border-accent/40',
      credits: CREDIT_COSTS.VIDEO_GENERATION,
    },
  ];

  return (
    <div className="min-h-full w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-3">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Criar Conteúdo
                  </h1>
                  <p className="text-muted-foreground text-sm md:text-base">
                    {!contentType 
                      ? "Escolha o tipo de conteúdo que deseja criar"
                      : contentOptions.find(opt => opt.id === contentType)?.description
                    }
                  </p>
                </div>
              </div>
              
              {/* Display de créditos */}
              {team && (
                <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40"></div>
                        <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-2">
                          <Zap className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {team?.credits || 0}
                        </span>
                        <p className="text-sm text-muted-foreground font-medium">
                          Criações Restantes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Selection Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold text-foreground">Selecione o Tipo de Criação</h2>
            <p className="text-sm text-muted-foreground">
              Escolha entre criação rápida, personalizada ou vídeo profissional
            </p>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={contentType || ''}
              onValueChange={(value) => setContentType(value as ContentCreationType)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {contentOptions.map((option) => (
                <div key={option.id} className="relative flex">
                  <RadioGroupItem
                    value={option.id}
                    id={option.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.id}
                    className={`
                      flex flex-col cursor-pointer rounded-2xl border-2 p-6
                      transition-all duration-200 h-full
                      ${option.borderColor}
                      peer-data-[state=checked]:border-primary
                      peer-data-[state=checked]:bg-primary/5
                      hover:shadow-lg hover:scale-[1.02]
                      bg-card
                    `}
                  >
                    {/* Icon Circle */}
                    <div className={`${option.bgColor} ${option.color} rounded-full p-4 w-fit mb-4`}>
                      <option.icon className="h-8 w-8" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {option.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                      {option.description}
                    </p>

                    {/* Credits Badge */}
                    <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {option.credits} créditos
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Continue Button */}
            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={!contentType}
                className="min-w-[200px]"
              >
                Continuar
                {contentType && (
                  <>
                    {" "}
                    {contentType === 'quick' && '→ Rápida'}
                    {contentType === 'image' && '→ Personalizada'}
                    {contentType === 'video' && '→ Vídeo'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
