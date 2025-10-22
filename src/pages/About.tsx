import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, Users, Lightbulb, Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoCreatorPreta from '@/assets/logoCreatorPreta.png';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/dashboard"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <img
              src={logoCreatorPreta}
              alt="Logo Creator"
              className="h-12 w-auto"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Sobre o Creator
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            A plataforma que revoluciona a criação de conteúdo para marcas e empresas
          </p>
        </div>

        {/* Missão */}
        <Card className="mb-8 border-2 border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Target className="h-8 w-8 text-primary" />
              Nossa Missão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Democratizar a criação de conteúdo de alta qualidade, oferecendo ferramentas inteligentes 
              que permitem que qualquer empresa, independente do tamanho, possa produzir materiais 
              profissionais e engajantes para suas campanhas de marketing.
            </p>
          </CardContent>
        </Card>

        {/* Valores */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-2 border-blue-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Lightbulb className="h-6 w-6 text-blue-500" />
                Inovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Utilizamos as mais avançadas tecnologias de IA para criar conteúdo personalizado 
                e relevante para cada marca e público-alvo.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Zap className="h-6 w-6 text-green-500" />
                Eficiência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Reduzimos drasticamente o tempo de produção de conteúdo, permitindo que equipes 
                foquem no que realmente importa: estratégia e resultados.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-6 w-6 text-purple-500" />
                Colaboração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Facilitamos o trabalho em equipe com ferramentas que permitem revisão, 
                aprovação e colaboração em tempo real.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Heart className="h-6 w-6 text-red-500" />
                Qualidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprometidos com a excelência, garantimos que todo conteúdo gerado 
                atenda aos mais altos padrões de qualidade e relevância.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* O que fazemos */}
        <Card className="mb-8 border-2 border-secondary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">O que fazemos</CardTitle>
            <CardDescription className="text-lg">
              Transformamos ideias em conteúdo de impacto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Criação de Personas:</strong> Desenvolvemos personas detalhadas 
                  baseadas em dados reais do seu público-alvo para direcionar suas estratégias de conteúdo.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Gestão de Marcas:</strong> Mantenha a consistência visual 
                  e de comunicação da sua marca com nossa ferramenta de gestão de identidade.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Temas Estratégicos:</strong> Crie temas visuais 
                  alinhados com sua estratégia de marca e objetivos de marketing.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Geração de Conteúdo:</strong> Produza textos, imagens 
                  e vídeos personalizados para suas campanhas de forma rápida e eficiente.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 bg-primary rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Planejamento Estratégico:</strong> Organize e planeje 
                  suas campanhas de conteúdo com nossa ferramenta de planejamento integrada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground/70 mt-2">
            © 2024 Creator. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
