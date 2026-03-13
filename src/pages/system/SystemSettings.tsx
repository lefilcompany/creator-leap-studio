import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { GeminiQuotaCard } from "@/components/admin/GeminiQuotaCard";
import { Shield, Database, Server, ExternalLink } from "lucide-react";

const SystemSettings = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Informações e configurações do sistema
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Admin Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Administrador
            </CardTitle>
            <CardDescription>Informações da conta administrativa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Nome</span>
              <span className="text-sm font-medium">{user?.name || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge className="bg-primary/10 text-primary border-primary/20">System Admin</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-chart-2" />
              Plataforma
            </CardTitle>
            <CardDescription>Informações técnicas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Modelo de créditos</span>
              <Badge variant="outline">Individual (por usuário)</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pagamentos</span>
              <Badge variant="outline">Cartão + Boleto</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Domínio</span>
              <span className="text-sm font-medium">pla.creator.lefil.com.br</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gemini Quota */}
      <GeminiQuotaCard />

      {/* Quick Links */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-chart-4" />
            Links Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Stripe Dashboard
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://wa.me/5581996600072" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                WhatsApp Suporte
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;
