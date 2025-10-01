import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <Card className="p-8">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6 pr-4">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Política de Privacidade, Uso de Dados e Inteligência Artificial
                </h1>
              </div>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introdução</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Esta Política de Privacidade tem como objetivo explicar, de forma clara e transparente, como coletamos, utilizamos, armazenamos e protegemos os dados dos usuários de nossa plataforma. Nosso compromisso é assegurar segurança, ética digital e conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD) e demais legislações aplicáveis.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  Ao utilizar a plataforma, o usuário concorda com os termos descritos nesta Política.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">2. Definições</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">Para fins desta Política:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Usuário:</strong> qualquer pessoa que utilize a plataforma.</li>
                  <li><strong>Dados Pessoais:</strong> informações que permitem identificar uma pessoa física (ex.: nome, CPF, e-mail).</li>
                  <li><strong>Dados Sensíveis:</strong> dados que revelam origem racial/étnica, convicção religiosa, opinião política, saúde, biometria, entre outros definidos pela LGPD.</li>
                  <li><strong>Tratamento de Dados:</strong> qualquer operação realizada com dados pessoais, como coleta, uso, armazenamento e compartilhamento.</li>
                  <li><strong>Parceiros/Fornecedores:</strong> empresas que prestam serviços necessários para a operação da plataforma.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">3. Dados Coletados</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">Podemos coletar as seguintes categorias de dados:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Cadastro:</strong> nome, e-mail, telefone, CPF ou CNPJ (quando aplicável).</li>
                  <li><strong>Navegação e uso:</strong> endereço IP, cookies, localização aproximada, histórico de interações e preferências de conteúdo.</li>
                  <li><strong>Transações:</strong> histórico de compras, assinaturas e métodos de pagamento.</li>
                  <li><strong>Engajamento:</strong> interações em chat, feedbacks, upload de marcas, documentos e comunicações.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  <strong>Observação:</strong> não coletamos dados sensíveis sem consentimento explícito do usuário.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">4. Bases Legais do Tratamento</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">O tratamento de dados é realizado com fundamento em bases legais da LGPD, incluindo:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li><strong>Execução de contrato:</strong> para oferecer os serviços contratados.</li>
                  <li><strong>Consentimento:</strong> quando o usuário autoriza o uso de dados para fins específicos, como marketing.</li>
                  <li><strong>Obrigação legal/regulatória:</strong> cumprimento de normas aplicáveis.</li>
                  <li><strong>Legítimo interesse:</strong> quando o uso dos dados é necessário para aprimorar serviços, respeitando sempre os direitos do usuário.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">5. Finalidades do Uso dos Dados</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">Os dados coletados são utilizados para:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Disponibilizar e melhorar os serviços da plataforma.</li>
                  <li>Personalizar a experiência do usuário.</li>
                  <li>Comunicar atualizações, novidades e ofertas.</li>
                  <li>Apoiar análises internas e geração de relatórios.</li>
                  <li>Cumprir obrigações legais e regulatórias.</li>
                  <li>Uso para campanhas de marketing para a plataforma.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">6. Uso de Inteligência Artificial (IA)</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">A plataforma utiliza algoritmos e modelos de IA para:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Recomendar conteúdos e produtos personalizados.</li>
                  <li>Apoiar atendimento e suporte via chatbots e análise preditiva.</li>
                  <li>Gerar insights estratégicos a partir de dados agregados e anônimos.</li>
                  <li>Auxiliar na criação de materiais digitais (ex.: posts, imagens e vídeos).</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-3 mb-2"><strong>Compromissos sobre IA:</strong></p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>A IA não substitui decisões humanas críticas.</li>
                  <li>O usuário será informado quando interagir com sistemas automatizados.</li>
                  <li>Nenhum dado pessoal sensível é utilizado sem consentimento.</li>
                  <li>Aplicamos medidas para evitar vieses e discriminação algorítmica.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">7. Compartilhamento e Transferência de Dados</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Os dados dos usuários não são vendidos a terceiros. Podem ser compartilhados somente com:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>LeFil Company, responsável pela tecnologia da plataforma em questão, para apoio em marketing, inteligência artificial e suporte à plataforma.</li>
                  <li>Fornecedores e parceiros tecnológicos, estritamente necessários para a operação.</li>
                  <li>Autoridades competentes, quando exigido por lei.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  Caso seja necessário transferir dados para fora do Brasil, garantimos que isso será feito em conformidade com a LGPD e com as regras da legislação do país, adotando salvaguardas adequadas de proteção.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">8. Cookies e Tecnologias de Rastreamento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Utilizamos cookies e ferramentas de monitoramento para melhorar a experiência de navegação. O usuário pode gerenciar suas preferências de cookies diretamente no navegador, podendo desativar rastreamentos não essenciais.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">9. Direitos dos Usuários</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">Em conformidade com a LGPD, o usuário pode:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Solicitar acesso, correção ou exclusão de dados.</li>
                  <li>Revogar consentimento a qualquer momento.</li>
                  <li>Solicitar portabilidade de dados.</li>
                  <li>Restringir ou se opor ao tratamento de dados pessoais.</li>
                  <li>Optar por não receber comunicações de marketing.</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  As solicitações serão atendidas dentro do prazo legal de até 15 dias.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">10. Prazo de Armazenamento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Os dados são armazenados pelo tempo necessário para cumprimento das finalidades descritas nesta Política, durante o contrato com a plataforma ou conforme obrigações legais. Após esse período, os dados poderão ser anonimizados ou excluídos de forma segura.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">11. Segurança da Informação</h2>
                <p className="text-muted-foreground leading-relaxed mb-2">Adotamos medidas técnicas e administrativas de segurança, incluindo:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Criptografia de dados.</li>
                  <li>Controle de acessos restritos.</li>
                  <li>Monitoramento contínuo de sistemas.</li>
                  <li>Políticas internas de governança e proteção de dados.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">12. Alterações na Política</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Podemos atualizar esta Política periodicamente. Em caso de alterações relevantes, os usuários serão notificados por meio da plataforma ou e-mail.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-3">13. Canal de Atendimento</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Para dúvidas, solicitações ou exercício de direitos, entre em contato:
                </p>
                <p className="text-muted-foreground leading-relaxed mt-2">
                  📧 <a href="mailto:contato@lefil.com.br" className="text-primary hover:underline">contato@lefil.com.br</a>
                </p>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
