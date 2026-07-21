// Catálogo estático das ferramentas expostas pelo MCP do Creator.
// Usado apenas pela página pública de documentação (`/mcp-docs`).
// Mantido em sincronia manualmente com src/lib/mcp/tools/**.

export type McpToolGroup =
  | "Perfil"
  | "Marcas"
  | "Personas"
  | "Temas"
  | "Conteúdo"
  | "Revisão"
  | "Contexto";

export type McpToolParam = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

export type McpToolDoc = {
  name: string;
  group: McpToolGroup;
  title: string;
  description: string;
  params: McpToolParam[];
  exampleRequest: Record<string, unknown>;
  exampleResponse: Record<string, unknown>;
  costCredits?: number;
  destructive?: boolean;
  notes?: string;
};

const rpc = (name: string, args: Record<string, unknown>, id = 1) => ({
  jsonrpc: "2.0",
  id,
  method: "tools/call",
  params: { name, arguments: args },
});

const okResp = (obj: unknown, id = 1) => ({
  jsonrpc: "2.0",
  id,
  result: {
    content: [{ type: "text", text: JSON.stringify(obj) }],
    structuredContent: obj,
  },
});

export const MCP_TOOLS: McpToolDoc[] = [
  // ============ PERFIL ============
  {
    name: "echo",
    group: "Perfil",
    title: "Echo — teste de conectividade",
    description:
      "Ecoa o texto recebido junto com o id do usuário autenticado e um timestamp. Use para validar a conexão OAuth e o transporte MCP.",
    params: [
      { name: "text", type: "string", required: true, description: "Texto que será ecoado de volta." },
    ],
    exampleRequest: rpc("echo", { text: "ping" }),
    exampleResponse: okResp({ echoed: "ping", userId: "ecb55ace-…", at: "2026-07-17T12:00:00.000Z" }),
  },
  {
    name: "get_profile",
    group: "Perfil",
    title: "Meu perfil",
    description: "Retorna nome, e-mail, saldo de créditos e team_id do usuário autenticado.",
    params: [],
    exampleRequest: rpc("get_profile", {}),
    exampleResponse: okResp({
      id: "ecb55ace-66b9-4f69-92fe-977aaa5c7d30",
      name: "Emanuel Rodrigues",
      email: "emanuel.rodrigues@lefil.com.br",
      credits: 1391,
      team_id: null,
    }),
  },
  {
    name: "get_credit_balance",
    group: "Perfil",
    title: "Saldo de créditos",
    description: "Retorna o saldo atual (`credits`, `max_credits`, `credits_expire_at`) do usuário.",
    params: [],
    exampleRequest: rpc("get_credit_balance", {}),
    exampleResponse: okResp({ credits: 1391, max_credits: 2000, credits_expire_at: "2026-08-15T00:00:00Z" }),
  },

  // ============ MARCAS ============
  {
    name: "list_brands",
    group: "Marcas",
    title: "Listar marcas",
    description: "Lista as marcas do usuário logado (id, nome, cor, criado_em).",
    params: [{ name: "limit", type: "number", required: false, description: "Máx. de linhas (padrão 25, máx. 100)." }],
    exampleRequest: rpc("list_brands", { limit: 10 }),
    exampleResponse: okResp({
      brands: [
        { id: "b1e0…", name: "LEFIL", brand_color: "#2E7D32", created_at: "2026-04-01T18:22:11Z" },
      ],
    }),
  },
  {
    name: "get_brand",
    group: "Marcas",
    title: "Obter marca",
    description: "Retorna todos os campos de uma marca pelo id (paleta, logo, valores, restrições, etc.).",
    params: [{ name: "id", type: "uuid", required: true, description: "ID da marca." }],
    exampleRequest: rpc("get_brand", { id: "b1e0…" }),
    exampleResponse: okResp({
      id: "b1e0…",
      name: "LEFIL",
      segment: "SaaS de marketing",
      values: "Clareza, autoria, cuidado com a linguagem",
      restrictions: "Sem termos políticos, sem promessas irreais",
      success_metrics: "Redução do CAC, aumento do LTV",
      logo: { url: "https://…/logo.png" },
      brand_color: "#2E7D32",
    }),
  },
  {
    name: "create_brand",
    group: "Marcas",
    title: "Cadastrar marca",
    description:
      "Cria uma nova marca no Creator. Alinhado ao formulário de cadastro do roteiro: nome, segmento, valores, indicadores de sucesso, restrições e URL do logo são obrigatórios.",
    params: [
      { name: "name", type: "string", required: true, description: "Nome oficial ou comercial." },
      { name: "segment", type: "string", required: true, description: "Segmento ou mercado de atuação." },
      { name: "values", type: "string", required: true, description: "Valores que orientam a marca." },
      { name: "success_metrics", type: "string", required: true, description: "Indicadores usados para avaliar sucesso." },
      { name: "restrictions", type: "string", required: true, description: "O que nunca deve aparecer na comunicação." },
      { name: "logo_url", type: "url", required: true, description: "URL pública do logo (PNG/SVG/PDF)." },
      { name: "responsible", type: "string", required: false, description: "Responsável pela marca (default: nome do usuário)." },
      { name: "keywords", type: "string", required: false, description: "Palavras-chave." },
      { name: "inspirations", type: "string", required: false, description: "Marcas/perfis de referência." },
      { name: "special_dates", type: "string", required: false, description: "Datas importantes." },
      { name: "brand_references", type: "string", required: false, description: "Links/campanhas de referência." },
      { name: "goals", type: "string", required: false, description: "Objetivos de negócio ou comunicação." },
      { name: "promise", type: "string", required: false, description: "Promessa da marca." },
      { name: "brand_color", type: "hex", required: false, description: "Cor principal em #RRGGBB." },
    ],
    exampleRequest: rpc("create_brand", {
      name: "LEFIL",
      segment: "SaaS de marketing",
      values: "Clareza, autoria",
      success_metrics: "CAC, LTV",
      restrictions: "Sem promessas irreais",
      logo_url: "https://exemplo.com/logo.png",
      brand_color: "#2E7D32",
    }),
    exampleResponse: okResp({ id: "b1e0…", name: "LEFIL" }),
  },
  {
    name: "update_brand",
    group: "Marcas",
    title: "Atualizar marca",
    description: "Atualiza campos parciais de uma marca existente (todos opcionais exceto `id`).",
    params: [
      { name: "id", type: "uuid", required: true, description: "ID da marca." },
      { name: "name", type: "string", required: false, description: "Novo nome." },
      { name: "segment", type: "string", required: false, description: "Segmento." },
      { name: "values", type: "string", required: false, description: "Valores." },
      { name: "keywords", type: "string", required: false, description: "Palavras-chave." },
      { name: "goals", type: "string", required: false, description: "Objetivos." },
      { name: "inspirations", type: "string", required: false, description: "Inspirações." },
      { name: "success_metrics", type: "string", required: false, description: "Métricas de sucesso." },
      { name: "brand_references", type: "string", required: false, description: "Referências." },
      { name: "special_dates", type: "string", required: false, description: "Datas especiais." },
      { name: "promise", type: "string", required: false, description: "Promessa." },
      { name: "restrictions", type: "string", required: false, description: "Restrições." },
      { name: "brand_color", type: "hex", required: false, description: "Cor #RRGGBB." },
      { name: "logo_url", type: "url", required: false, description: "Substitui o logo." },
    ],
    exampleRequest: rpc("update_brand", { id: "b1e0…", brand_color: "#0D47A1" }),
    exampleResponse: okResp({ id: "b1e0…", brand_color: "#0D47A1" }),
  },
  {
    name: "delete_brand",
    group: "Marcas",
    title: "Excluir marca",
    description: "Remove uma marca definitivamente. Ação irreversível.",
    destructive: true,
    params: [{ name: "id", type: "uuid", required: true, description: "ID da marca." }],
    exampleRequest: rpc("delete_brand", { id: "b1e0…" }),
    exampleResponse: okResp({ deleted: true }),
  },

  // ============ PERSONAS ============
  {
    name: "list_personas",
    group: "Personas",
    title: "Listar personas",
    description: "Lista as personas acessíveis. Filtra por marca opcionalmente.",
    params: [
      { name: "brand_id", type: "uuid", required: false, description: "Filtra personas de uma marca." },
      { name: "limit", type: "number", required: false, description: "Máx. de linhas (padrão 25)." },
    ],
    exampleRequest: rpc("list_personas", { brand_id: "b1e0…", limit: 10 }),
    exampleResponse: okResp({
      personas: [{ id: "p1a…", name: "Empreendedora Beleza 25-34", brand_id: "b1e0…" }],
    }),
  },
  {
    name: "get_persona",
    group: "Personas",
    title: "Obter persona",
    description: "Retorna todos os campos de uma persona pelo id.",
    params: [{ name: "id", type: "uuid", required: true, description: "ID da persona." }],
    exampleRequest: rpc("get_persona", { id: "p1a…" }),
    exampleResponse: okResp({
      id: "p1a…",
      name: "Empreendedora Beleza 25-34",
      main_goal: "Escalar loja online",
      challenges: "Falta de tempo para criar conteúdo",
      preferred_tone_of_voice: "Próximo, inspirador",
    }),
  },
  {
    name: "create_persona",
    group: "Personas",
    title: "Criar persona",
    description: "Cria uma persona associada opcionalmente a uma marca.",
    params: [
      { name: "name", type: "string", required: true, description: "Nome da persona." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca associada." },
      { name: "age", type: "string", required: false, description: "Faixa etária." },
      { name: "gender", type: "string", required: false, description: "Gênero." },
      { name: "location", type: "string", required: false, description: "Localização." },
      { name: "professional_context", type: "string", required: false, description: "Contexto profissional." },
      { name: "beliefs_and_interests", type: "string", required: false, description: "Crenças e interesses." },
      { name: "content_consumption_routine", type: "string", required: false, description: "Rotina de consumo de conteúdo." },
      { name: "main_goal", type: "string", required: false, description: "Principal objetivo/desejo." },
      { name: "challenges", type: "string", required: false, description: "Dores/desafios." },
      { name: "preferred_tone_of_voice", type: "string", required: false, description: "Tom de voz preferido." },
      { name: "purchase_journey_stage", type: "string", required: false, description: "Estágio da jornada." },
      { name: "interest_triggers", type: "string", required: false, description: "Gatilhos de interesse." },
      { name: "income_and_purchase_habits", type: "string", required: false, description: "Renda e hábitos de compra." },
    ],
    exampleRequest: rpc("create_persona", {
      name: "Empreendedora Beleza 25-34",
      brand_id: "b1e0…",
      main_goal: "Escalar loja online",
      challenges: "Falta de tempo",
      preferred_tone_of_voice: "Próximo, inspirador",
    }),
    exampleResponse: okResp({ id: "p1a…", name: "Empreendedora Beleza 25-34" }),
  },
  {
    name: "update_persona",
    group: "Personas",
    title: "Atualizar persona",
    description: "Atualiza campos parciais de uma persona (todos opcionais exceto `id`).",
    params: [
      { name: "id", type: "uuid", required: true, description: "ID da persona." },
      { name: "name", type: "string", required: false, description: "Novo nome." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca." },
      { name: "age", type: "string", required: false, description: "Idade." },
      { name: "gender", type: "string", required: false, description: "Gênero." },
      { name: "location", type: "string", required: false, description: "Localização." },
      { name: "main_goal", type: "string", required: false, description: "Objetivo." },
      { name: "challenges", type: "string", required: false, description: "Desafios." },
      { name: "preferred_tone_of_voice", type: "string", required: false, description: "Tom preferido." },
    ],
    exampleRequest: rpc("update_persona", { id: "p1a…", preferred_tone_of_voice: "Direto, técnico" }),
    exampleResponse: okResp({ id: "p1a…", preferred_tone_of_voice: "Direto, técnico" }),
  },
  {
    name: "delete_persona",
    group: "Personas",
    title: "Excluir persona",
    description: "Remove uma persona. Ação irreversível.",
    destructive: true,
    params: [{ name: "id", type: "uuid", required: true, description: "ID da persona." }],
    exampleRequest: rpc("delete_persona", { id: "p1a…" }),
    exampleResponse: okResp({ deleted: true }),
  },

  // ============ TEMAS ============
  {
    name: "list_themes",
    group: "Temas",
    title: "Listar temas estratégicos",
    description: "Lista as editorias/temas estratégicos acessíveis. Filtra por marca opcionalmente.",
    params: [
      { name: "brand_id", type: "uuid", required: false, description: "Filtra por marca." },
      { name: "limit", type: "number", required: false, description: "Máx. de linhas." },
    ],
    exampleRequest: rpc("list_themes", { brand_id: "b1e0…" }),
    exampleResponse: okResp({
      themes: [{ id: "t1x…", title: "Bastidores da marca", brand_id: "b1e0…" }],
    }),
  },
  {
    name: "get_theme",
    group: "Temas",
    title: "Obter tema estratégico",
    description: "Retorna todos os campos de um tema estratégico pelo id.",
    params: [{ name: "id", type: "uuid", required: true, description: "ID do tema." }],
    exampleRequest: rpc("get_theme", { id: "t1x…" }),
    exampleResponse: okResp({
      id: "t1x…",
      title: "Bastidores da marca",
      tone_of_voice: "Próximo; Autêntico",
      macro_themes: "Processo, equipe, produção",
      platforms: "instagram, tiktok",
    }),
  },
  {
    name: "create_theme",
    group: "Temas",
    title: "Criar tema estratégico",
    description: "Cria um tema/editoria associado a uma marca.",
    params: [
      { name: "title", type: "string", required: true, description: "Título do tema/editoria." },
      { name: "brand_id", type: "uuid", required: true, description: "Marca associada." },
      { name: "description", type: "string", required: false, description: "Descrição." },
      { name: "tone_of_voice", type: "string", required: false, description: "Ex.: 'Inspirador; Profissional'." },
      { name: "target_audience", type: "string", required: false, description: "Público-alvo." },
      { name: "objectives", type: "string", required: false, description: "Objetivos." },
      { name: "macro_themes", type: "string", required: false, description: "Macrotemas." },
      { name: "best_formats", type: "string", required: false, description: "Melhores formatos." },
      { name: "platforms", type: "string", required: false, description: "Plataformas." },
      { name: "hashtags", type: "string", required: false, description: "Hashtags." },
      { name: "expected_action", type: "string", required: false, description: "Ação esperada." },
      { name: "color_palette", type: "string", required: false, description: "Paleta de cores." },
      { name: "additional_info", type: "string", required: false, description: "Info adicional." },
    ],
    exampleRequest: rpc("create_theme", {
      title: "Bastidores da marca",
      brand_id: "b1e0…",
      tone_of_voice: "Próximo; Autêntico",
      platforms: "instagram, tiktok",
    }),
    exampleResponse: okResp({ id: "t1x…", title: "Bastidores da marca" }),
  },
  {
    name: "update_theme",
    group: "Temas",
    title: "Atualizar tema estratégico",
    description: "Atualiza campos parciais de um tema estratégico.",
    params: [
      { name: "id", type: "uuid", required: true, description: "ID do tema." },
      { name: "title", type: "string", required: false, description: "Novo título." },
      { name: "description", type: "string", required: false, description: "Descrição." },
      { name: "tone_of_voice", type: "string", required: false, description: "Tom." },
      { name: "platforms", type: "string", required: false, description: "Plataformas." },
    ],
    exampleRequest: rpc("update_theme", { id: "t1x…", tone_of_voice: "Educativo; Direto" }),
    exampleResponse: okResp({ id: "t1x…", tone_of_voice: "Educativo; Direto" }),
  },
  {
    name: "delete_theme",
    group: "Temas",
    title: "Excluir tema estratégico",
    description: "Remove um tema estratégico. Ação irreversível.",
    destructive: true,
    params: [{ name: "id", type: "uuid", required: true, description: "ID do tema." }],
    exampleRequest: rpc("delete_theme", { id: "t1x…" }),
    exampleResponse: okResp({ deleted: true }),
  },

  // ============ CONTEÚDO ============
  {
    name: "create_image_content",
    group: "Conteúdo",
    title: "Criar imagem (pipeline completo)",
    description:
      "Gera uma imagem usando o pipeline completo do Creator (marca, persona, tema, tom, plataforma). Retorna URL da imagem, id da action e metadados.",
    costCredits: 8,
    notes:
      "Chamada síncrona longa (15–30s). Consome créditos do usuário autenticado. Ideal para o fluxo do Anexo D (roteiro conversacional).",
    params: [
      { name: "brand_id", type: "uuid", required: true, description: "Marca (obrigatório para contexto)." },
      { name: "description", type: "string", required: true, description: "Descrição da cena." },
      {
        name: "reference_image_url",
        type: "string (URL https ou data URL)",
        required: true,
        description: "Imagem de referência obrigatória que guia a geração (produto, composição, estilo).",
      },
      { name: "persona_id", type: "uuid", required: false, description: "Persona-alvo." },
      { name: "theme_id", type: "uuid", required: false, description: "Tema/editoria." },
      { name: "narrative", type: "string", required: false, description: "Narrativa a contar." },
      { name: "tone", type: "string[] (máx 4)", required: false, description: "Tons de voz." },
      { name: "platform", type: "string", required: false, description: "Ex.: 'instagram_feed'." },
      { name: "aspect_ratio", type: "string", required: false, description: "Ex.: '1:1', '4:5', '9:16'." },
      { name: "include_text", type: "boolean", required: false, description: "Incluir texto sobre a imagem." },
      { name: "text_content", type: "string", required: false, description: "Texto a aparecer na imagem." },
      { name: "content_type", type: "'organic' | 'paid'", required: false, description: "Orgânico ou pago." },
      { name: "campaign_context", type: "string", required: false, description: "Bloco de campanha." },
      { name: "visual_style", type: "string", required: false, description: "Estilo visual." },
    ],
    exampleRequest: rpc("create_image_content", {
      brand_id: "b1e0…",
      description: "Foto de produto skincare em bancada de mármore com plantas ao fundo",
      reference_image_url: "https://exemplo.com/referencias/produto.jpg",
      persona_id: "p1a…",
      theme_id: "t1x…",
      tone: ["inspirador", "próximo"],
      platform: "instagram_feed",
      aspect_ratio: "4:5",
      include_text: true,
      text_content: "Cuidado diário. Resultado real.",
      content_type: "organic",
    }),
    exampleResponse: okResp({
      action_id: "a1c…",
      imageUrl: "https://…/creations/a1c….jpg",
      title: "Cuidado diário. Resultado real.",
      creditsConsumed: 8,
    }),
  },
  {
    name: "create_quick_content",
    group: "Conteúdo",
    title: "Criar conteúdo rápido",
    description: "Fluxo rápido de geração de imagem a partir de prompt livre (sem contexto de marca obrigatório).",
    costCredits: 5,
    params: [
      { name: "prompt", type: "string", required: true, description: "Prompt livre." },
      { name: "aspect_ratio", type: "string", required: false, description: "Ex.: '1:1', '4:5', '9:16'." },
      { name: "platform", type: "string", required: false, description: "Plataforma alvo." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca opcional." },
    ],
    exampleRequest: rpc("create_quick_content", {
      prompt: "Café expresso visto de cima em mesa de madeira, luz natural",
      aspect_ratio: "1:1",
    }),
    exampleResponse: okResp({
      action_id: "aq7…",
      imageUrl: "https://…/creations/aq7….jpg",
      creditsConsumed: 5,
    }),
  },
  {
    name: "generate_caption",
    group: "Conteúdo",
    title: "Gerar legenda",
    description: "Gera legenda para uma imagem/conteúdo, usando contexto de marca e persona se fornecido.",
    costCredits: 1,
    params: [
      { name: "prompt", type: "string", required: true, description: "Instrução ou contexto." },
      { name: "image_url", type: "url", required: false, description: "URL da imagem base." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca." },
      { name: "persona_id", type: "uuid", required: false, description: "Persona." },
      { name: "theme_id", type: "uuid", required: false, description: "Tema." },
      { name: "platform", type: "string", required: false, description: "Plataforma." },
    ],
    exampleRequest: rpc("generate_caption", {
      prompt: "Legenda para o lançamento do sérum",
      brand_id: "b1e0…",
      persona_id: "p1a…",
      platform: "instagram_feed",
    }),
    exampleResponse: okResp({
      caption: "Chegou o sérum que traz de volta o brilho…\n\nSaiba mais no link da bio.\n\n#skincare #brilho",
    }),
  },
  {
    name: "create_content_plan",
    group: "Conteúdo",
    title: "Criar calendário de conteúdo",
    description:
      "Cria um calendário de conteúdo (planejamento) para uma marca com quantidade, plataformas e objetivo. Devolve o `calendar_id`; use `list_calendar_items` para ler os itens.",
    costCredits: 3,
    notes: "Geração assíncrona — chame `list_calendar_items` depois para ler os itens processados.",
    params: [
      { name: "brand_id", type: "uuid", required: true, description: "Marca." },
      { name: "quantity", type: "number", required: true, description: "1 a 60 peças." },
      { name: "objective", type: "string", required: true, description: "Objetivo." },
      { name: "themes", type: "string[]", required: false, description: "Editorias a distribuir." },
      { name: "platforms", type: "string[]", required: false, description: "Plataformas alvo." },
      { name: "additional_info", type: "string", required: false, description: "Contexto extra." },
    ],
    exampleRequest: rpc("create_content_plan", {
      brand_id: "b1e0…",
      quantity: 12,
      objective: "Campanha de lançamento — 2 semanas",
      platforms: ["instagram", "linkedin"],
    }),
    exampleResponse: okResp({
      calendar_id: "cal_9k1…",
      status: "processing",
      quantity: 12,
    }),
  },

  // ============ REVISÃO ============
  {
    name: "review_image",
    group: "Revisão",
    title: "Revisar/ajustar imagem",
    description: "Aplica ajustes descritos em linguagem natural a uma imagem existente.",
    costCredits: 8,
    params: [
      { name: "image_url", type: "url", required: true, description: "URL da imagem base." },
      { name: "prompt", type: "string", required: true, description: "Instruções de ajuste." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca (contexto)." },
    ],
    exampleRequest: rpc("review_image", {
      image_url: "https://…/creations/a1c….jpg",
      prompt: "Deixe o fundo mais claro e adicione uma folha de eucalipto no canto direito",
      brand_id: "b1e0…",
    }),
    exampleResponse: okResp({ action_id: "a1c2…", imageUrl: "https://…/creations/a1c2….jpg" }),
  },
  {
    name: "review_caption",
    group: "Revisão",
    title: "Revisar/ajustar legenda",
    description: "Aplica ajustes em linguagem natural a uma legenda existente.",
    costCredits: 1,
    params: [
      { name: "caption", type: "string", required: true, description: "Legenda original." },
      { name: "prompt", type: "string", required: true, description: "Instruções de ajuste." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca (contexto)." },
    ],
    exampleRequest: rpc("review_caption", {
      caption: "Chegou o novo sérum!",
      prompt: "Deixe mais próxima e adicione um CTA claro para o link da bio",
    }),
    exampleResponse: okResp({ caption: "Chega uma novidade que a gente amou…" }),
  },
  {
    name: "review_text_for_image",
    group: "Revisão",
    title: "Revisar texto sobre imagem",
    description: "Ajusta headline/CTA/disclaimer que aparece sobre uma imagem.",
    costCredits: 1,
    params: [
      { name: "text", type: "string", required: true, description: "Texto atual sobre a imagem." },
      { name: "prompt", type: "string", required: true, description: "Instruções de ajuste." },
      { name: "brand_id", type: "uuid", required: false, description: "Marca (contexto)." },
    ],
    exampleRequest: rpc("review_text_for_image", {
      text: "Cuidado diário. Resultado real.",
      prompt: "Encurte para até 4 palavras e mantenha o tom",
    }),
    exampleResponse: okResp({ text: "Cuidado diário, real." }),
  },

  // ============ CONTEXTO ============
  {
    name: "list_actions",
    group: "Contexto",
    title: "Listar peças criadas (histórico)",
    description: "Lista as peças (actions) criadas pelo usuário, com filtros por marca e tipo.",
    params: [
      { name: "brand_id", type: "uuid", required: false, description: "Filtra por marca." },
      { name: "type", type: "string", required: false, description: "Ex.: 'image', 'video', 'quick'." },
      { name: "limit", type: "number", required: false, description: "Máx. de linhas (padrão 25)." },
    ],
    exampleRequest: rpc("list_actions", { brand_id: "b1e0…", type: "image", limit: 10 }),
    exampleResponse: okResp({
      actions: [
        { id: "a1c…", type: "image", created_at: "2026-07-16T10:00:00Z", brand_id: "b1e0…" },
      ],
    }),
  },
  {
    name: "get_action",
    group: "Contexto",
    title: "Obter peça (action)",
    description: "Retorna dados completos de uma action (imagem/vídeo/quick) pelo id.",
    params: [{ name: "id", type: "uuid", required: true, description: "ID da action." }],
    exampleRequest: rpc("get_action", { id: "a1c…" }),
    exampleResponse: okResp({
      id: "a1c…",
      type: "image",
      result: { imageUrl: "https://…/a1c….jpg", title: "Cuidado diário. Resultado real." },
      details: { platform: "instagram_feed", objective: "engajar" },
    }),
  },
  {
    name: "list_calendars",
    group: "Contexto",
    title: "Listar calendários de conteúdo",
    description: "Lista os calendários de conteúdo acessíveis pelo usuário.",
    params: [
      { name: "brand_id", type: "uuid", required: false, description: "Filtra por marca." },
      { name: "limit", type: "number", required: false, description: "Máx. de linhas." },
    ],
    exampleRequest: rpc("list_calendars", { brand_id: "b1e0…" }),
    exampleResponse: okResp({
      calendars: [{ id: "cal_9k1…", brand_id: "b1e0…", quantity: 12, created_at: "2026-07-10T14:00:00Z" }],
    }),
  },
  {
    name: "list_calendar_items",
    group: "Contexto",
    title: "Listar itens de um calendário",
    description: "Lista os itens de um calendário (título, tema, data agendada, estágio).",
    params: [
      { name: "calendar_id", type: "uuid", required: true, description: "ID do calendário." },
      { name: "limit", type: "number", required: false, description: "Máx. de itens." },
    ],
    exampleRequest: rpc("list_calendar_items", { calendar_id: "cal_9k1…" }),
    exampleResponse: okResp({
      items: [
        { id: "ci_1…", title: "Bastidores da produção", scheduled_at: "2026-07-18", stage: "briefing" },
      ],
    }),
  },
];

export const MCP_GROUPS: McpToolGroup[] = [
  "Perfil",
  "Marcas",
  "Personas",
  "Temas",
  "Conteúdo",
  "Revisão",
  "Contexto",
];
