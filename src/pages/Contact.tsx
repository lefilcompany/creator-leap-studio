import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoCreatorPreta from '@/assets/logoCreatorPreta.png';
export default function Contact() {
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <img src={logoCreatorPreta} alt="Logo Creator" className="h-12 w-auto" />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Entre em Contato
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Tem dúvidas? Quer saber mais? Estamos aqui para ajudar!
          </p>
        </div>

        {/* Seção de Contatos */}
        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5 mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-primary mb-2">Fale Conosco</CardTitle>
            <CardDescription className="text-lg">
              Nossa equipe está pronta para responder suas dúvidas
            </CardDescription>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-green-600/20 border-2 border-green-500/40">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">Resposta em até 2 dias úteis</span>
            </div>
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
                <Button asChild variant="outline" className="border-green-500 text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                  <a href="https://wa.me/558199660072" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Chamar no WhatsApp
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card className="border-2 border-muted/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Horário de Atendimento</CardTitle>
            <CardDescription>
              Estamos disponíveis para atendê-lo nos seguintes horários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span className="font-medium text-foreground">Segunda a Sexta</span>
                <span className="text-muted-foreground">08h às 18h</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                <span className="font-medium text-foreground">Finais de Semana</span>
                <span className="text-muted-foreground">Fechado</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              * Mensagens recebidas fora do horário de atendimento serão respondidas no próximo dia útil
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground/70 mt-2">
            © 2024 Creator. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>;
}