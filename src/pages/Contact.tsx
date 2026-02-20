import { Button } from '@/components/ui/button';
import { Mail, Phone, MessageSquare, Clock } from 'lucide-react';
import { useEffect } from 'react';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import profileBanner from '@/assets/profile-banner.jpg';

export default function Contact() {
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
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-56 lg:h-72">
        <img
          src={profileBanner}
          alt="Contato"
          className="w-full h-full object-cover object-[center_55%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        <PageBreadcrumb
          items={[{ label: "Contato" }]}
          variant="overlay"
        />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header card */}
        <div className="-mt-12 relative z-10 bg-card rounded-2xl shadow-lg p-4 lg:p-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <MessageSquare className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Entre em Contato
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground mt-1">
                Tem dúvidas? Quer saber mais? Estamos aqui para ajudar!
              </p>
            </div>
          </div>
        </div>

        {/* Contact cards */}
        <div className="space-y-3">
          {/* Fale Conosco */}
          <div className="bg-card rounded-2xl shadow-sm p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Fale Conosco</h2>
              <div className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Resposta em até 2 dias úteis</span>
              </div>
            </div>

            <p className="text-muted-foreground text-sm mb-5 ml-[52px]">
              Nossa equipe está pronta para responder suas dúvidas e ajudar você a maximizar o potencial da sua marca com o Creator.
            </p>

            <div className="grid md:grid-cols-2 gap-3 ml-[52px]">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">Email</h3>
                  <p className="text-sm text-muted-foreground">suporte.creator@lefil.com.br</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">+55 81 9966-0072</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-5 ml-[52px]">
              <Button asChild>
                <a href="mailto:suporte.creator@lefil.com.br" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Enviar Email
                </a>
              </Button>
              <Button asChild variant="outline" className="border-green-500/50 text-green-600 hover:text-green-600 hover:bg-green-50 hover:border-green-500/50 dark:hover:bg-green-950">
                <a href="https://wa.me/558199660072" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Chamar no WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {/* Horário de Atendimento */}
          <div className="bg-card rounded-2xl shadow-sm p-4 lg:p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Horário de Atendimento</h2>
            </div>

            <div className="space-y-2 ml-[52px]">
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="font-medium text-sm text-foreground">Segunda a Sexta</span>
                <span className="text-sm text-muted-foreground">08h às 18h</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30">
                <span className="font-medium text-sm text-foreground">Finais de Semana</span>
                <span className="text-sm text-muted-foreground">Fechado</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Mensagens recebidas fora do horário de atendimento serão respondidas no próximo dia útil
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-muted-foreground border-t border-border pt-6">
          <p>© 2025 Creator. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
