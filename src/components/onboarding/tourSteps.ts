import { Step } from 'react-joyride';

export const navbarSteps: Step[] = [
  {
    target: '#sidebar-logo',
    content: 'Bem-vindo ao Creator! Esta é sua plataforma de criação de conteúdo estratégico.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '#nav-brands',
    content: 'Marcas: crie e gerencie as marcas que você trabalha. Cada marca tem sua identidade única com logo, paleta de cores e valores.',
    placement: 'right',
  },
  {
    target: '#nav-themes',
    content: 'Editorias: defina editorias para suas campanhas, incluindo objetivos, público-alvo e tom de voz.',
    placement: 'right',
  },
  {
    target: '#nav-personas',
    content: 'Personas: crie perfis detalhados do seu público-alvo para conteúdo mais direcionado e eficaz.',
    placement: 'right',
  },
  {
    target: '#nav-quick-content',
    content: 'Criação Rápida: crie imagens personalizadas rapidamente sem precisar de configurações complexas ou burocracias.',
    placement: 'right',
  },
  {
    target: '#nav-history',
    content: 'Histórico: acesse e gerencie todo o conteúdo que você já criou na plataforma.',
    placement: 'right',
  },
  {
    target: '#nav-create-content',
    content: 'Criar Conteúdo: gere posts completos com texto e imagem personalizada para suas redes sociais.',
    placement: 'right',
  },
  {
    target: '#nav-review-content',
    content: 'Revisar Conteúdo: envie seus textos para revisão e melhoria profissional.',
    placement: 'right',
  },
  {
    target: '#nav-plan-content',
    content: 'Calendário de Conteúdo: organize seu calendário editorial e planeje suas publicações estrategicamente.',
    placement: 'right',
  },
  {
    target: '#topbar-search',
    content: 'Barra de Pesquisa: busque rapidamente por conteúdos, marcas ou qualquer informação na plataforma. Use Ctrl+K para abrir.',
    placement: 'bottom',
  },
  {
    target: '#topbar-coupon',
    content: 'Cupom de Presente: resgate cupons promocionais para ganhar créditos ou benefícios especiais.',
    placement: 'bottom',
  },
  {
    target: '#topbar-theme',
    content: 'Alternar Tema: mude entre o modo claro e escuro para sua preferência visual.',
    placement: 'bottom',
  },
  {
    target: '#topbar-notifications',
    content: 'Notificações: acompanhe atualizações importantes, solicitações de equipe e alertas do sistema.',
    placement: 'bottom',
  },
  {
    target: '#topbar-settings',
    content: 'Configurações: acesse informações sobre a plataforma, políticas de privacidade, histórico e opção de refazer os tours.',
    placement: 'bottom',
  },
  {
    target: '#topbar-profile',
    content: 'Perfil: gerencie suas informações pessoais, avatar, dados de equipe e configurações da conta.',
    placement: 'bottom',
  },
];

export const dashboardSteps: Step[] = [
  {
    target: '#dashboard-credits-card',
    content: 'Aqui você visualiza seus créditos disponíveis. Cada ação na plataforma consome créditos.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#dashboard-stats',
    content: 'Estatísticas gerais: veja quantas marcas, personas e editorias você já criou.',
    placement: 'bottom',
  },
  {
    target: '#dashboard-recent-actions',
    content: 'Ações recentes: acompanhe seu histórico de criações mais recentes.',
    placement: 'top',
  },
  {
    target: '#dashboard-quick-actions',
    content: 'Ações rápidas: acesso direto às principais funcionalidades da plataforma.',
    placement: 'top',
  },
];

export const brandsSteps: Step[] = [
  {
    target: '#brands-create-button',
    content: 'Clique aqui para criar uma nova marca. Você pode ter até 3 marcas no plano gratuito.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '#brands-list',
    content: 'Aqui estão todas as suas marcas cadastradas. Clique em uma para ver detalhes ou editar.',
    placement: 'bottom',
  },
];

export const themesSteps: Step[] = [
  {
    target: '#themes-create-button',
    content: 'Crie editorias para organizar suas campanhas de conteúdo.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '#themes-list',
    content: 'Visualize todas as editorias criadas e suas paletas de cores.',
    placement: 'bottom',
  },
];

export const personasSteps: Step[] = [
  {
    target: '#personas-create-button',
    content: 'Crie personas detalhadas para entender melhor seu público-alvo.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '#personas-list',
    content: 'Todas as suas personas cadastradas aparecem aqui.',
    placement: 'bottom',
  },
];

export const createContentSteps: Step[] = [
  {
    target: '#select-brand',
    content: 'Primeiro, selecione a marca para a qual você quer criar conteúdo.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#select-theme',
    content: 'Escolha a editoria que guiará a criação do conteúdo.',
    placement: 'bottom',
  },
  {
    target: '#select-persona',
    content: 'Selecione a persona do público-alvo para quem o conteúdo é direcionado.',
    placement: 'bottom',
  },
  {
    target: '#content-type-selector',
    content: 'Escolha o tipo de conteúdo: post educativo, promocional, inspiracional, etc.',
    placement: 'bottom',
  },
  {
    target: '#platform-selector',
    content: 'Selecione a plataforma onde o conteúdo será publicado (Instagram, Facebook, etc).',
    placement: 'bottom',
  },
  {
    target: '#content-description',
    content: 'Descreva o que você quer comunicar. Seja específico para melhores resultados.',
    placement: 'top',
  },
  {
    target: '#tone-of-voice',
    content: 'Tom de Voz: define como sua mensagem será transmitida (formal, casual, inspirador, técnico, etc). Este campo ajuda a manter a consistência da comunicação da marca e adaptar a linguagem ao público-alvo.',
    placement: 'top',
  },
  {
    target: '#advanced-options',
    content: 'Configure opções avançadas como CTA e hashtags para personalizar ainda mais seu conteúdo.',
    placement: 'top',
  },
  {
    target: '#generate-button',
    content: 'Quando tudo estiver configurado, clique aqui para gerar seu conteúdo!',
    placement: 'top',
  },
];

export const quickContentSteps: Step[] = [
  {
    target: '#quick-content-form',
    content: 'A Criação Rápida permite gerar imagens com IA de forma simples e intuitiva, sem precisar configurar marca, persona ou editoria.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#quick-brand-select',
    content: 'Marca (opcional): Selecionar uma marca ajuda a IA a criar conteúdo alinhado com sua identidade visual, usando cores e estilo da marca.',
    placement: 'bottom',
  },
  {
    target: '#quick-platform-select',
    content: 'Plataforma (opcional): Escolha onde o conteúdo será publicado. A proporção da imagem será ajustada automaticamente para a plataforma selecionada.',
    placement: 'bottom',
  },
  {
    target: '#quick-description',
    content: 'Prompt principal (obrigatório): Descreva detalhadamente o que você quer criar. Seja específico sobre cena, iluminação, cores e estilo desejado para melhores resultados.',
    placement: 'top',
  },
  {
    target: '#quick-reference-images',
    content: 'Imagens de Referência (opcional): Adicione até 5 imagens para guiar a geração. Você pode fazer upload, arrastar arquivos ou colar (Ctrl+V) diretamente.',
    placement: 'top',
  },
  {
    target: '#advanced-options',
    content: 'Opções Avançadas: Controles profissionais para ajustar detalhes da geração como prompt negativo, paleta de cores, iluminação e nível de detalhes.',
    placement: 'bottom',
  },
  {
    target: '#quick-generate-button',
    content: 'Quando tudo estiver configurado, clique aqui para gerar sua imagem. A ação consome 5 créditos. Certifique-se de que o prompt principal está preenchido.',
    placement: 'top',
  },
];

export const contentCreationSelectorSteps: Step[] = [
  {
    target: '[data-tour="creation-type-selector"]',
    content: 'Escolha o tipo de conteúdo que deseja criar. Cada opção tem um custo diferente em créditos.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="quick-creation-card"]',
    content: 'Criação Rápida: Gere conteúdo de forma ágil e simplificada. Ideal para postagens rápidas.',
  },
  {
    target: '[data-tour="image-creation-card"]',
    content: 'Criação Personalizada: Crie imagens com controle total sobre configurações, edição no canvas e ajustes detalhados.',
  },
  {
    target: '[data-tour="video-creation-card"]',
    content: 'Criação de Vídeo: Gere vídeos profissionais com o modelo VEO 3.1 do Google.',
  },
];

export const planContentSteps: Step[] = [
  {
    target: '#plan-header',
    content: 'Bem-vindo ao Calendário de Conteúdo! 📅 Esta funcionalidade usa IA para gerar um calendário editorial estratégico com ideias de posts alinhados à sua marca, tema e plataforma escolhida.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#plan-brand-field',
    content: 'Marca (obrigatório): Selecione a marca para a qual você quer criar o planejamento. A IA considerará a identidade visual, valores e posicionamento da marca ao sugerir posts.',
    placement: 'bottom',
  },
  {
    target: '#plan-platform-field',
    content: 'Plataforma (obrigatório): Escolha a rede social onde os posts serão publicados. Cada plataforma tem características únicas que a IA levará em conta (formato, tom, audiência, etc.).',
    placement: 'bottom',
  },
  {
    target: '#plan-quantity-field',
    content: 'Quantidade de Posts (obrigatório): Defina quantos posts você quer no planejamento (1 a 7). A IA criará ideias diversificadas e complementares para o período.',
    placement: 'bottom',
  },
  {
    target: '#plan-themes-field',
    content: 'Editorias (obrigatório): Selecione uma ou mais editorias que devem guiar o planejamento. Cada editoria tem objetivos, público-alvo e tom de voz específicos que a IA usará para criar posts coerentes.',
    placement: 'top',
  },
  {
    target: '#plan-objective-field',
    content: 'Objetivo dos Posts (obrigatório): Descreva o que você quer alcançar com esse planejamento. Ex: "Gerar engajamento com conteúdo educativo", "Aumentar vendas do produto X", "Fortalecer autoridade na área Y".',
    placement: 'top',
  },
  {
    target: '#plan-additional-info-field',
    content: 'Informações Adicionais (opcional): Adicione contexto extra que ajude a IA a personalizar o planejamento. Ex: "Focar em público jovem", "Incluir dicas práticas", "Usar linguagem descontraída", "Mencionar promoções de fim de ano".',
    placement: 'top',
  },
  {
    target: '#create-plan-button',
    content: 'Gerar Planejamento: Quando todos os campos obrigatórios estiverem preenchidos, clique aqui! A IA criará um calendário editorial completo com ideias de posts, sugestões de legendas e estratégias de publicação. Esta ação consome créditos.',
    placement: 'top',
  },
];

export const historySteps: Step[] = [
  {
    target: '#history-list',
    content: 'Todo conteúdo que você criou fica salvo aqui para referência futura.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#history-filters',
    content: 'Use os filtros para encontrar conteúdos específicos rapidamente. Clique em qualquer item da lista para ver detalhes completos e fazer download.',
    placement: 'bottom',
  },
];

export const creditsSteps: Step[] = [
  {
    target: '#credits-balance',
    content: 'Aqui você vê quantos créditos tem disponíveis e seu histórico de uso.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#buy-credits-button',
    content: 'Quando seus créditos acabarem, clique aqui para comprar mais.',
    placement: 'left',
  },
  {
    target: '#credits-history',
    content: 'Veja o histórico completo de uso e compras de créditos.',
    placement: 'top',
  },
];

export const reviewContentInitialSteps: Step[] = [
  {
    target: '#review-content-header',
    content: 'Bem-vindo à área de Revisão de Conteúdo! Aqui você pode usar IA para aprimorar seus materiais de posts nas redes sociais.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#review-type-selection',
    content: `Escolha o tipo de revisão que você precisa:

• **Revisar Imagem**: Envie uma arte pronta e receba sugestões para melhorar aspectos visuais (cores, contraste, composição, etc.)

• **Revisar Legenda**: Cole uma legenda já escrita e peça melhorias em clareza, persuasão, call-to-action e adequação ao público

• **Revisar Texto para Imagem**: Otimize frases que vão dentro da arte (headlines, slogans) para ficarem mais curtas, impactantes e alinhadas ao contexto

💡 Clique em um dos tipos para ver um tour detalhado específico!`,
    placement: 'bottom',
  },
];

export const reviewContentImageSteps: Step[] = [
  {
    target: '#review-brand-field',
    content: 'Primeiro, selecione a marca. A IA usará a identidade visual, paleta de cores e posicionamento da marca para sugerir melhorias visuais coerentes.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#review-theme-field',
    content: 'Editoria (opcional): escolha uma editoria se quiser alinhar as sugestões visuais com uma campanha ou linha editorial específica.',
    placement: 'top',
  },
  {
    target: '#review-content-input',
    content: 'Envie a imagem que você quer revisar. Arraste e solte ou clique para selecionar (PNG ou JPEG, máx. 4MB).',
    placement: 'top',
  },
  {
    target: '#review-adjustments-prompt',
    content: 'Descreva o que você quer melhorar na imagem. Seja específico: "tornar mais vibrante", "melhorar contraste", "deixar mais profissional", etc. Informe também o objetivo (ex: post promocional, inspiracional) e público-alvo.',
    placement: 'top',
  },
  {
    target: '#review-submit-button',
    content: 'Pronto! Clique em "Gerar Revisão" e a IA analisará sua imagem considerando marca, tema e suas instruções, retornando sugestões detalhadas de melhorias visuais.',
    placement: 'top',
  },
];

export const reviewContentCaptionSteps: Step[] = [
  {
    target: '#review-brand-field',
    content: 'Selecione a marca para que a IA considere o tom de voz, linguagem e posicionamento ao sugerir melhorias na legenda.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#review-theme-field',
    content: 'Editoria (opcional): use para alinhar a revisão da legenda com campanhas, objetivos de comunicação ou linha editorial específica.',
    placement: 'top',
  },
  {
    target: '#review-content-input',
    content: 'Cole aqui a legenda que você já escreveu e quer melhorar. Pode ter até 8000 caracteres.',
    placement: 'top',
  },
  {
    target: '#review-adjustments-prompt',
    content: 'Explique o que você quer melhorar: "tornar mais engajadora", "adicionar call-to-action", "simplificar linguagem", "aumentar persuasão", etc. Informe o público-alvo e objetivo do post.',
    placement: 'top',
  },
  {
    target: '#review-submit-button',
    content: 'Clique em "Gerar Revisão" e a IA analisará sua legenda, retornando sugestões de melhorias considerando marca, tema e suas instruções.',
    placement: 'top',
  },
];

export const reviewContentTextSteps: Step[] = [
  {
    target: '#review-brand-field',
    content: 'Selecione a marca para que a IA considere identidade verbal, tom de comunicação e posicionamento ao revisar o texto da arte.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '#review-theme-field',
    content: 'Editoria (opcional): escolha uma editoria para alinhar o texto com campanhas ou objetivos específicos de comunicação.',
    placement: 'top',
  },
  {
    target: '#review-content-input',
    content: 'Cole o texto que vai aparecer dentro da imagem do post: frase, citação, headline, slogan, mensagem principal, etc. Máximo de 8000 caracteres.',
    placement: 'top',
  },
  {
    target: '#review-adjustments-prompt',
    content: 'Descreva como quer melhorar o texto e forneça contexto da imagem onde ele será usado. Ex: "tornar mais curto e impactante para Instagram, será usado em post motivacional com fundo azul e foto de montanha".',
    placement: 'top',
  },
  {
    target: '#review-submit-button',
    content: 'Clique em "Gerar Revisão" e a IA otimizará seu texto considerando marca, tema, contexto visual e suas instruções, retornando sugestões para deixá-lo mais impactante.',
    placement: 'top',
  },
];
