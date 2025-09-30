import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, ArrowLeft, Heart, Users, Lightbulb, Target, Zap } from 'lucide-react';
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

        {/* Seção de Contatos */}
        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-primary mb-2">Entre em Contato</CardTitle>
            <CardDescription className="text-lg">
              Tem dúvidas? Quer saber mais? Estamos aqui para ajudar!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50">
                <div className="p-3 rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Email</h3>
                  <p className="text-muted-foreground">lefil@lefil.com.br</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-border/50">
                <div className="p-3 rounded-full bg-green-500/10">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">WhatsApp</h3>
                  <p className="text-muted-foreground">+55 81 9966-0072</p>
                </div>
              </div>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-muted-foreground mb-4">
                Nossa equipe está pronta para responder suas dúvidas e ajudar você a maximizar 
                o potencial da sua marca com o Creator.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <a href="mailto:lefil@lefil.com.br" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar Email
                  </a>
                </Button>
                <Button asChild variant="outline" className="border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                  <a href="https://wa.me/558199660072" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Chamar no WhatsApp
                  </a>
                </Button>
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
