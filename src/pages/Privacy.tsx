import { Shield, Info, Database, Scale, Target, Brain, Share2, Cookie, UserCheck, Clock, Lock, RefreshCw, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import privacyBanner from "@/assets/privacy-banner.jpg";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

const privacySections = [
  {
    icon: Info,
    title: "1. Introdução",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Esta Política de Privacidade tem como objetivo explicar, de forma clara e transparente, como coletamos, utilizamos, armazenamos e protegemos os dados dos usuários de nossa plataforma. Nosso compromisso é assegurar <strong>segurança, ética digital e conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)</strong> e demais legislações aplicáveis.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Ao utilizar a plataforma, o usuário concorda com os termos descritos nesta Política.
        </p>
      </>
    ),
  },
  {
    icon: Database,
    title: "2. Definições",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">Para fins desta Política:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Usuário:</strong> qualquer pessoa que utilize a plataforma.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Dados Pessoais:</strong> informações que permitem identificar uma pessoa física (ex.: nome, CPF, e-mail).</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Dados Sensíveis:</strong> dados que revelam origem racial/étnica, convicção religiosa, opinião política, saúde, biometria, entre outros definidos pela LGPD.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Tratamento de Dados:</strong> qualquer operação realizada com dados pessoais, como coleta, uso, armazenamento e compartilhamento.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Parceiros/Fornecedores:</strong> empresas que prestam serviços necessários para a operação da plataforma.</span></li>
        </ul>
      </>
    ),
  },
  {
    icon: Database,
    title: "3. Dados Coletados",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">Podemos coletar as seguintes categorias de dados:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Cadastro:</strong> nome, e-mail, telefone, CPF ou CNPJ (quando aplicável).</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Navegação e uso:</strong> endereço IP, cookies, localização aproximada, histórico de interações e preferências de conteúdo.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Transações:</strong> histórico de compras, assinaturas e métodos de pagamento.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Engajamento:</strong> interações em chat, feedbacks, upload de marcas, documentos e comunicações.</span></li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          <strong>Observação:</strong> não coletamos dados sensíveis sem consentimento explícito do usuário.
        </p>
      </>
    ),
  },
  {
    icon: Scale,
    title: "4. Bases Legais do Tratamento",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">O tratamento de dados é realizado com fundamento em bases legais da LGPD, incluindo:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Execução de contrato:</strong> para oferecer os serviços contratados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Consentimento:</strong> quando o usuário autoriza o uso de dados para fins específicos, como marketing.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Obrigação legal/regulatória:</strong> cumprimento de normas aplicáveis.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span><strong>Legítimo interesse:</strong> quando o uso dos dados é necessário para aprimorar serviços, respeitando sempre os direitos do usuário.</span></li>
        </ul>
      </>
    ),
  },
  {
    icon: Target,
    title: "5. Finalidades do Uso dos Dados",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">Os dados coletados são utilizados para:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Disponibilizar e melhorar os serviços da plataforma.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Personalizar a experiência do usuário.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Comunicar atualizações, novidades e ofertas.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Apoiar análises internas e geração de relatórios.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Cumprir obrigações legais e regulatórias.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Uso para campanhas de marketing para a plataforma.</span></li>
        </ul>
      </>
    ),
  },
  {
    icon: Brain,
    title: "6. Uso de Inteligência Artificial (IA)",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">A plataforma utiliza algoritmos e modelos de IA para:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Recomendar conteúdos e produtos personalizados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Apoiar atendimento e suporte via chatbots e análise preditiva.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Gerar insights estratégicos a partir de dados agregados e anônimos.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Auxiliar na criação de materiais digitais (ex.: posts, imagens e vídeos).</span></li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-4 mb-3 font-semibold">Compromissos sobre IA:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>A IA não substitui decisões humanas críticas.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>O usuário será informado quando interagir com sistemas automatizados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Nenhum dado pessoal sensível é utilizado sem consentimento.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Aplicamos medidas para evitar vieses e discriminação algorítmica.</span></li>
        </ul>
      </>
    ),
  },
  {
    icon: Share2,
    title: "7. Compartilhamento e Transferência de Dados",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Os dados dos usuários não são vendidos a terceiros. Podem ser compartilhados somente com:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>LeFil Company, responsável pela tecnologia da plataforma em questão, para apoio em marketing, inteligência artificial e suporte à plataforma.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Fornecedores e parceiros tecnológicos, estritamente necessários para a operação.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Autoridades competentes, quando exigido por lei.</span></li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          Caso seja necessário transferir dados para fora do Brasil, garantimos que isso será feito em conformidade com a LGPD e com as regras da legislação do país, adotando salvaguardas adequadas de proteção.
        </p>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "8. Cookies e Tecnologias de Rastreamento",
    content: (
      <p className="text-muted-foreground leading-relaxed">
        Utilizamos cookies e ferramentas de monitoramento para melhorar a experiência de navegação. O usuário pode gerenciar suas preferências de cookies diretamente no navegador, podendo desativar rastreamentos não essenciais.
      </p>
    ),
  },
  {
    icon: UserCheck,
    title: "9. Direitos dos Usuários",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">Em conformidade com a LGPD, o usuário pode:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Solicitar acesso, correção ou exclusão de dados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Revogar consentimento a qualquer momento.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Solicitar portabilidade de dados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Restringir ou se opor ao tratamento de dados pessoais.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Optar por não receber comunicações de marketing.</span></li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          As solicitações serão atendidas dentro do prazo legal de até 15 dias.
        </p>
      </>
    ),
  },
  {
    icon: Clock,
    title: "10. Prazo de Armazenamento",
    content: (
      <p className="text-muted-foreground leading-relaxed">
        Os dados são armazenados pelo tempo necessário para cumprimento das finalidades descritas nesta Política, durante o contrato com a plataforma ou conforme obrigações legais. Após esse período, os dados poderão ser anonimizados ou excluídos de forma segura.
      </p>
    ),
  },
  {
    icon: Lock,
    title: "11. Segurança da Informação",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed mb-3">Adotamos medidas técnicas e administrativas de segurança, incluindo:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Criptografia de dados.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Controle de acessos restritos.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Monitoramento contínuo de sistemas.</span></li>
          <li className="flex gap-2"><span className="text-primary mt-1">•</span><span>Políticas internas de governança e proteção de dados.</span></li>
        </ul>
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "12. Alterações na Política",
    content: (
      <p className="text-muted-foreground leading-relaxed">
        Podemos atualizar esta Política periodicamente. Em caso de alterações relevantes, os usuários serão notificados por meio da plataforma ou e-mail.
      </p>
    ),
  },
  {
    icon: Mail,
    title: "13. Canal de Atendimento",
    content: (
      <>
        <p className="text-muted-foreground leading-relaxed">
          Para dúvidas, solicitações ou exercício de direitos, entre em contato:
        </p>
        <p className="text-muted-foreground leading-relaxed mt-3">
          📧 <a href="mailto:contato@lefil.com.br" className="text-primary hover:underline transition-colors">contato@lefil.com.br</a>
        </p>
      </>
    ),
  },
];

const Privacy = () => {
  // Override global overflow-hidden on html/body to allow scrolling
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
      <div className="relative h-36 lg:h-52">
        <img
          src={privacyBanner}
          alt="Política de Privacidade"
          className="w-full h-full object-cover object-[center_55%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        
        {/* Breadcrumb overlay */}
        <PageBreadcrumb
          items={[{ label: "Política de Privacidade" }]}
          variant="overlay"
        />
      </div>

      {/* Content container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header card */}
        <div className="-mt-12 relative z-10 bg-card rounded-2xl shadow-lg p-4 lg:p-5 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <Shield className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                Política de Privacidade, Uso de Dados e Inteligência Artificial
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground mt-1">
                Transparência e segurança no tratamento dos seus dados
              </p>
            </div>
          </div>
        </div>

        {/* Accordion sections */}
        <Accordion type="multiple" defaultValue={["section-0"]} className="w-full space-y-3">
          {privacySections.map((section, index) => {
            const Icon = section.icon;
            return (
              <AccordionItem key={index} value={`section-${index}`} className="bg-card rounded-2xl shadow-sm border-0 hover:shadow-md transition-shadow">
                <AccordionTrigger className="p-4 lg:p-5 hover:no-underline rounded-2xl">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-foreground">
                      {section.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 lg:px-5 pb-5 pt-0 ml-[52px]">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-muted-foreground border-t border-border pt-6">
          <p>© 2025 Creator. Todos os direitos reservados.</p>
          <p className="mt-2">Última atualização: Janeiro de 2025</p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
