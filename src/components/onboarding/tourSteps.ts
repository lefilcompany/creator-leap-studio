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
    content: 'Temas Estratégicos: defina temas para suas campanhas, incluindo objetivos, público-alvo e tom de voz.',
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
    content: 'Planejar Conteúdo: organize seu calendário editorial e planeje suas publicações estrategicamente.',
    placement: 'right',
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
    content: 'Estatísticas gerais: veja quantas marcas, personas e temas você já criou.',
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
    content: 'Crie temas estratégicos para organizar suas campanhas de conteúdo.',
    disableBeacon: true,
    placement: 'left',
  },
  {
    target: '#themes-list',
    content: 'Visualize todos os temas criados e suas paletas de cores.',
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
    content: 'Escolha o tema estratégico que guiará a criação do conteúdo.',
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
    target: '#advanced-options',
    content: 'Configure opções avançadas como tom de voz, CTA e hashtags.',
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
    content: 'A Criação Rápida permite gerar imagens com IA de forma simples e intuitiva, sem precisar configurar marca, persona ou tema estratégico.',
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

export const planContentSteps: Step[] = [
  {
    target: '#plan-calendar',
    content: 'Planeje suas publicações com antecedência usando o calendário editorial.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#plan-filters',
    content: 'Filtre por marca, período ou status para organizar melhor.',
    placement: 'bottom',
  },
  {
    target: '#create-plan-button',
    content: 'Crie um novo plano de conteúdo estratégico.',
    placement: 'left',
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
    content: 'Use os filtros para encontrar conteúdos específicos rapidamente.',
    placement: 'bottom',
  },
  {
    target: '.action-card:first-child',
    content: 'Clique em qualquer item para ver detalhes completos e fazer download.',
    placement: 'top',
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
