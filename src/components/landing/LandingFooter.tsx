import { CreatorLogo } from "@/components/CreatorLogo";
import { useNavigate } from "react-router-dom";

export const LandingFooter = () => {
  const navigate = useNavigate();

  const footerLinks = {
    produto: [
      { label: "Funcionalidades", id: "features" },
      { label: "Planos", id: "pricing" },
      { label: "Como funciona", id: "how-it-works" },
    ],
    empresa: [
      { label: "Sobre", onClick: () => navigate("/about") },
      { label: "Contato", onClick: () => navigate("/contact") },
    ],
    legal: [
      { label: "Privacidade", onClick: () => navigate("/privacy") },
      { label: "Termos de Uso", onClick: () => navigate("/privacy") },
    ],
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer id="footer" className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Logo and Description */}
          <div className="lg:col-span-2 space-y-4">
            <CreatorLogo className="h-12" />
            <p className="text-sm text-muted-foreground max-w-sm">
              Crie, planeje e transforme conteúdos com autonomia e estratégia.
              Inteligência artificial que entende suas necessidades.
            </p>
          </div>

          {/* Produto */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Produto
            </h3>
            <ul className="space-y-2">
              {footerLinks.produto.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Empresa
            </h3>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.onClick}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={link.onClick}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {new Date().getFullYear()} Creator AI. Todos os direitos
            reservados.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Entrar
            </button>
            <button
              onClick={() => navigate("/register")}
              className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
