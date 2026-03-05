/**
 * Módulo LLM Refiner (v6 - Diretor de Arte Cinematográfico + Legenda)
 * 
 * Transforma prompts curtos e leigos em briefings visuais técnicos
 * e gera legendas otimizadas para a plataforma.
 * 
 * Usa Google Gemini API direta (gemini-2.5-flash).
 */

import { callGemini, extractJSON } from './geminiClient.ts';

export interface BriefingExpansionInput {
  /** Documento de briefing completo */
  briefingDocument: string;
  /** Estilo visual selecionado */
  visualStyle: string;
  /** Se há texto para incluir na imagem */
  hasTextOverlay?: boolean;
  /** O texto a incluir (se houver) */
  textContent?: string;
  /** Tom de voz selecionados */
  tones?: string[];
  /** Dados da marca (opcional, para contexto enriquecido) */
  brandData?: any;
  /** Dados do tema (opcional) */
  themeData?: any;
  /** Dados da persona (opcional) */
  personaData?: any;
  /** Plataforma alvo */
  platform?: string;
}

export interface RefinerOutput {
  /** Descrição cinematográfica enriquecida */
  briefing_visual: string;
  /** Texto principal sugerido (max 10 palavras) */
  headline: string;
  /** CTA ou texto secundário (max 15 palavras) */
  subtexto: string;
  /** Legenda completa para a plataforma (título + corpo + hashtags) */
  legenda: string;
}

export interface ExpandedBriefing {
  /** A descrição visual pura para o modelo de imagem */
  expandedPrompt: string;
  /** Headline sugerida pelo refiner */
  headline: string;
  /** Subtexto/CTA sugerido pelo refiner */
  subtexto: string;
  /** Legenda gerada pelo refiner */
  legenda: string;
}

// Mapeamento de tom visual -> parâmetros visuais
const TONE_VISUAL_MAP: Record<string, {
  contrast: string; lighting: string; style: string; composition: string;
  focus: string; description: string; fontHint: string; colorHint: string;
}> = {
  combativo: {
    contrast: 'Alto — contrastes fortes, sombras intensas',
    lighting: 'Dramática, low-key, sombras fortes, contra-luz',
    style: 'Bold, impactante, alto contraste, cores intensas',
    composition: 'Dinâmica, assimétrica, composição de tensão e urgência',
    focus: 'Poder, urgência, força, determinação',
    description: 'Gera urgência e força. Cores intensas, tipografia impactante, contrastes fortes.',
    fontHint: 'Sans-serif robusta, condensada e impactante',
    colorHint: 'Vermelho intenso, preto, branco alto contraste',
  },
  didatico: {
    contrast: 'Médio — contraste equilibrado e legível',
    lighting: 'Uniforme, limpa, studio brilhante e neutro',
    style: 'Clean/Grid, elementos infográficos, dados visuais',
    composition: 'Organizada, grid-based, hierarquia clara, espaço para dados',
    focus: 'Compreensão de dados, clareza, confiança, transparência',
    description: 'Facilita a compreensão de dados. Layout limpo, elementos infográficos, tons neutros.',
    fontHint: 'Sans-serif moderna, geométrica, alta legibilidade',
    colorHint: 'Azul institucional, verde confiança, tons neutros',
  },
  emocional: {
    contrast: 'Baixo-Médio — tons suaves e acolhedores',
    lighting: 'Quente/Golden Hour, luz natural suave, amanhecer/pôr-do-sol',
    style: 'Quente, centrado no humano, empático, acolhedor',
    composition: 'Close-ups, foco humano, enquadramento íntimo, olhar direto',
    focus: 'Pessoas/Expressões, conexão humana, empatia, pertencimento',
    description: 'Gera conexão humana e empatia. Iluminação quente, foco em pessoas e expressões.',
    fontHint: 'Serifada elegante ou script acolhedora, transmitindo humanidade',
    colorHint: 'Tons quentes, âmbar, dourado, cores da terra',
  },
  institucional: {
    contrast: 'Baixo — composição estável e formal',
    lighting: 'Limpa, balanceada, studio profissional',
    style: 'Minimalista, formal, corporativo',
    composition: 'Simétrica, centrada, estável',
    focus: 'Ordem, estabilidade, competência, confiança',
    description: 'Transmite estabilidade e ordem. Estilo minimalista, composição simétrica.',
    fontHint: 'Serifada clássica ou sans-serif elegante, transmitindo seriedade',
    colorHint: 'Azul escuro, dourado, branco, tons neutros sofisticados',
  },
};

/**
 * Expande um documento de briefing usando o LLM Refiner via Gemini API.
 * Retorna JSON com briefing_visual, headline, subtexto e legenda.
 */
export async function expandBriefing(
  input: BriefingExpansionInput,
  _geminiApiKey?: string
): Promise<ExpandedBriefing> {
  const systemPrompt = buildSystemPrompt(input);
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (!GEMINI_API_KEY) {
    console.error('[LLMRefiner] GEMINI_API_KEY not configured, falling back to empty');
    return { expandedPrompt: '', headline: '', subtexto: '', legenda: '' };
  }

  console.log('[LLMRefiner] Expanding briefing via Gemini API...');
  console.log('[LLMRefiner] Document length:', input.briefingDocument.length, 'chars');
  console.log('[LLMRefiner] Visual style:', input.visualStyle);

  try {
    const userMessage = `Transforme este Briefing Completo num Briefing Visual cinematográfico e gere a legenda:\n\n${input.briefingDocument}`;

    const result = await callGemini(GEMINI_API_KEY, {
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
    });

    const rawContent = result.content;

    if (!rawContent) {
      console.warn('[LLMRefiner] No content in response');
      return { expandedPrompt: '', headline: '', subtexto: '', legenda: '' };
    }

    console.log('[LLMRefiner] Raw response length:', rawContent.length, 'chars');

    const parsed = extractJSON<RefinerOutput>(rawContent);
    if (parsed && parsed.briefing_visual) {
      console.log('[LLMRefiner] Parsed JSON successfully');
      console.log('[LLMRefiner] briefing_visual length:', parsed.briefing_visual?.length || 0);
      console.log('[LLMRefiner] headline:', parsed.headline);
      console.log('[LLMRefiner] legenda length:', parsed.legenda?.length || 0);
      
      return {
        expandedPrompt: parsed.briefing_visual || '',
        headline: parsed.headline || '',
        subtexto: parsed.subtexto || '',
        legenda: parsed.legenda || '',
      };
    }

    console.warn('[LLMRefiner] Failed to parse JSON, using raw text as visual briefing');
    return { expandedPrompt: rawContent, headline: '', subtexto: '', legenda: '' };

  } catch (error) {
    console.error('[LLMRefiner] Error:', error);
    return { expandedPrompt: '', headline: '', subtexto: '', legenda: '' };
  }
}

function buildSystemPrompt(input: BriefingExpansionInput): string {
  // Get tone params if any tone matches
  let toneBlock = '';
  if (input.tones && input.tones.length > 0) {
    for (const tone of input.tones) {
      const toneKey = tone.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const params = TONE_VISUAL_MAP[toneKey];
      if (params) {
        toneBlock = `
PARÂMETROS VISUAIS DO TOM "${tone.toUpperCase()}":
- Iluminação: ${params.lighting}
- Composição: ${params.composition}
- Contraste: ${params.contrast}
- Foco visual: ${params.focus}
- Estilo: ${params.style}
- Tipografia sugerida: ${params.fontHint}
- Paleta sugerida: ${params.colorHint}
- ${params.description}`;
        break;
      }
    }
  }

  // Build enriched context from brand/theme/persona data
  let contextBlock = '';
  const contextParts: string[] = [];

  if (input.brandData) {
    const b = input.brandData;
    const brandParts = [`MARCA: "${b.name}" | Segmento: ${b.segment || 'N/A'}`];
    if (b.values) brandParts.push(`Valores: ${b.values}`);
    if (b.promise) brandParts.push(`Promessa: ${b.promise}`);
    if (b.keywords) brandParts.push(`Keywords: ${b.keywords}`);
    if (b.goals) brandParts.push(`Objetivos: ${b.goals}`);
    contextParts.push(brandParts.join(' | '));

    const colors: string[] = [];
    if (b.brand_color) colors.push(b.brand_color);
    if (b.color_palette && Array.isArray(b.color_palette)) {
      b.color_palette.forEach((c: any) => { if (c.hex) colors.push(c.hex); });
    }
    if (colors.length > 0) contextParts.push(`Paleta de cores da marca: ${colors.join(', ')}`);
  }

  if (input.themeData) {
    const t = input.themeData;
    const themeParts = [`PAUTA: "${t.title}"`];
    if (t.objectives) themeParts.push(`Objetivos: ${t.objectives}`);
    if (t.macro_themes) themeParts.push(`Macro-temas: ${t.macro_themes}`);
    if (t.tone_of_voice) themeParts.push(`Tom: ${t.tone_of_voice}`);
    if (t.target_audience) themeParts.push(`Audiência: ${t.target_audience}`);
    if (t.expected_action) themeParts.push(`Ação esperada: ${t.expected_action}`);
    contextParts.push(themeParts.join(' | '));
  }

  if (input.personaData) {
    const p = input.personaData;
    const personaParts = [`PERSONA: "${p.name}" | ${p.age || '?'} anos, ${p.gender || '?'}`];
    if (p.location) personaParts.push(`Local: ${p.location}`);
    if (p.professional_context) personaParts.push(`Contexto: ${p.professional_context}`);
    if (p.challenges) personaParts.push(`Desafios: ${p.challenges}`);
    if (p.main_goal) personaParts.push(`Objetivo: ${p.main_goal}`);
    if (p.interest_triggers) personaParts.push(`Gatilhos: ${p.interest_triggers}`);
    contextParts.push(personaParts.join(' | '));
  }

  if (contextParts.length > 0) {
    contextBlock = `\n\nDADOS CONTEXTUAIS COMPLETOS:\n${contextParts.join('\n')}`;
  }

  const textInstruction = input.hasTextOverlay && input.textContent
    ? `\nTEXTO NA IMAGEM: O briefing solicita texto sobreposto. NÃO adicione instruções de tipografia — isso será feito downstream. Foque em compor uma cena visual que naturalmente deixe espaço negativo apropriado onde o texto pode ser colocado sem obscurecer elementos visuais chave.`
    : `\nSEM TEXTO: NÃO mencione texto, tipografia, palavras ou letras na sua saída. A imagem deve ser puramente visual sem elementos textuais.`;

  // Platform-specific guidelines for caption
  const platformCaptionGuide = getPlatformCaptionGuide(input.platform);

  // Hashtags from theme
  let hashtagHint = '';
  if (input.themeData?.hashtags) {
    hashtagHint = `\nHASHTAGS DO TEMA (incluir na legenda): ${input.themeData.hashtags}`;
  }

  return `Você é um Diretor de Arte Cinematográfico e Estrategista de Marketing Digital de elite. Sua missão é dupla:

**PARTE 1 — TRANSFORMAR LINGUAGEM LEIGA EM DIREÇÃO DE ARTE TÉCNICA**
Receba descrições curtas e simples do usuário e transforme em briefings visuais cinematográficos com linguagem técnica profissional.

**PARTE 2 — GERAR LEGENDA PROFISSIONAL PARA A PLATAFORMA**
Crie uma legenda completa e envolvente para a publicação, adequada à plataforma e ao público.
${toneBlock}${contextBlock}

EXEMPLOS DE TRANSFORMAÇÃO (few-shot):

EXEMPLO 1:
- Input: "foto de uma mulher tomando café"
- briefing_visual: "Uma fotografia cinematográfica em close-up médio, capturada com lente 85mm f/1.4, de uma mulher jovem segurando delicadamente uma xícara de café artesanal de cerâmica. Iluminação golden hour lateral suave entrando por uma janela à esquerda, criando rim light dourado nos cabelos e catchlights nos olhos. Profundidade de campo rasa com bokeh cremoso ao fundo mostrando texturas desfocadas de madeira e plantas. Paleta warm tones dominante: âmbar, marrom café, bege creme e tons de pele naturais. Expressão serena de contemplação com leve sorriso, olhar direcionado para a xícara. Vapor subindo do café criando atmosfera acolhedora. Composição seguindo regra dos terços com o rosto no terço superior direito. Textura visível na cerâmica da xícara e nos fios de cabelo. Ambiente de cafeteria artesanal com acabamentos em madeira natural."

EXEMPLO 2:
- Input: "post sobre promoção de verão"
- briefing_visual: "Uma composição vibrante e energética em estilo flat lay cinematográfico, capturada com lente 35mm em ângulo overhead (90°). Elementos de verão organizados geometricamente: óculos de sol espelhados, chinelo colorido, protetor solar, frutas tropicais cortadas (melancia, abacaxi), sobre fundo de azulejos brancos com textura. Iluminação studio difusa e uniforme simulando luz solar direta do meio-dia, sem sombras duras. Paleta vibrante: coral, turquesa, amarelo solar, branco clean. Composição centrada com simetria proposital e espaço negativo no centro para posicionamento de texto. Aspersões de água cristalina sobre os objetos criando frescor e reflexos especulares. Micro-texturas visíveis: gotas de água, grãos de areia dourada, superfícies brilhantes."

SUA MISSÃO (4 etapas obrigatórias):

1. **EXPANDIR A CENA**: Transforme a descrição bruta numa cena cinematográfica com termos técnicos:
   - Lente da câmera específica (ex: 35mm, 50mm, 85mm, 135mm) e abertura (f/1.4, f/2.8, f/8)
   - Iluminação técnica: key light, fill light, rim light, backlight, bounce light, Rembrandt lighting, butterfly lighting, split lighting
   - Cores com nomenclatura técnica: warm tones, cool tones, complementary palette, analogous colors
   - Composição: regra dos terços, golden ratio, leading lines, framing, negative space, rule of odds
   - Profundidade de campo: shallow DOF, deep focus, bokeh, tilt-shift
   - Texturas e materiais: especular, difuso, matte, glossy, translúcido
   - Expressões e linguagem corporal detalhadas (se houver pessoas)
   - Atmosfera e mood: cinematográfico, editorial, lifestyle, high-fashion, documentary

2. **DEFINIR O LAYOUT**: Se houver texto a incluir:
   - Áreas de espaço negativo para posicionamento de texto
   - Composição que garante legibilidade
   - Hierarquia visual adequada ao público-alvo

3. **AJUSTAR O CLIMA**: Adapte a atmosfera ao tom visual solicitado.

4. **CRIAR LEGENDA PROFISSIONAL**: Escreva uma legenda completa para a plataforma:
   - Gancho inicial forte que capture atenção nos primeiros 125 caracteres
   - Corpo com storytelling ou informação de valor
   - CTA (call-to-action) claro
   - Hashtags relevantes (mistura de alto volume e nicho)
   - Tom alinhado com a marca e persona
${platformCaptionGuide}${hashtagHint}

REGRAS ABSOLUTAS:
1. Responda EXCLUSIVAMENTE em formato JSON com as chaves: briefing_visual, headline, subtexto, legenda
2. briefing_visual: Parágrafo único contínuo (200-400 palavras) descrevendo a cena cinematograficamente EM PORTUGUÊS, usando TERMOS TÉCNICOS de fotografia e direção de arte
3. Inclua obrigatoriamente: setup de iluminação técnico, lente/perspectiva com abertura, cores com nomenclatura técnica, texturas específicas, atmosfera e mood cinematográfico
4. O pedido principal do usuário é a diretriz PRIMÁRIA — tudo mais enriquece mas NUNCA sobrepõe
5. NÃO inclua negative prompts ou instruções "evitar"
6. Incorpore diretrizes éticas silenciosamente nas escolhas visuais
7. Adapte o tom visual ao público-alvo e plataforma naturalmente
8. Se imagens de referência da marca forem mencionadas, inclua: "Manter a identidade visual, paleta de cores e elementos de design das imagens de referência da marca fornecidas."
9. Se imagens de referência de estilo forem mencionadas, inclua: "Inspirar-se na atmosfera e estética das imagens de referência de estilo fornecidas."
10. Preserve LITERALMENTE instruções ESPECÍFICAS do usuário (posicionamento de elementos, objetos específicos)
11. headline: Texto principal sugerido (máximo 10 palavras), relevante ao objetivo
12. subtexto: CTA ou texto secundário (máximo 15 palavras)
13. legenda: Legenda COMPLETA para a plataforma (título + corpo + hashtags), pronta para copiar e colar. Use emojis com moderação. Inclua quebras de linha naturais. Termine com 5-15 hashtags relevantes precedidas de #.
14. Encerre o briefing_visual reafirmando o assunto/cena central do pedido original do usuário
15. Seja EXTREMAMENTE específico e visual, nunca genérico — cada briefing deve ser único
${textInstruction}

FORMATO DE RESPOSTA (JSON estrito):
{
  "briefing_visual": "Uma fotografia cinematográfica de [CENA DETALHADA com termos técnicos]...",
  "headline": "texto principal sugerido",
  "subtexto": "CTA ou texto secundário",
  "legenda": "🔥 Gancho inicial forte\\n\\nCorpo da legenda com storytelling...\\n\\n👉 CTA claro\\n\\n#hashtag1 #hashtag2 #hashtag3"
}`;
}

function getPlatformCaptionGuide(platform?: string): string {
  if (!platform) return '';
  
  const guides: Record<string, string> = {
    'instagram_feed': `
GUIA DE LEGENDA (Instagram Feed):
- Máximo 2200 caracteres (ideal: 300-500)
- Gancho nos primeiros 125 caracteres (antes do "ver mais")
- 5-15 hashtags (mistura de alto volume e nicho)
- Emojis estratégicos para quebrar texto
- CTA no final (comente, salve, compartilhe)`,
    'instagram_stories': `
GUIA DE LEGENDA (Instagram Stories):
- Texto curto e direto (máximo 100 palavras)
- CTA interativo (enquete, pergunta, link)
- 3-5 hashtags relevantes`,
    'instagram_reels': `
GUIA DE LEGENDA (Instagram Reels):
- Gancho forte (primeiras palavras)
- Máximo 300 caracteres ideal
- 5-10 hashtags trending
- CTA para seguir ou compartilhar`,
    'facebook_post': `
GUIA DE LEGENDA (Facebook):
- Ideal: 100-250 caracteres
- Tom conversacional
- 1-3 hashtags (menos é mais)
- Pergunta para gerar comentários`,
    'linkedin_post': `
GUIA DE LEGENDA (LinkedIn):
- Tom profissional e informativo
- Gancho nos primeiros 210 caracteres
- 3-5 hashtags profissionais
- Storytelling ou insight de mercado`,
    'tiktok': `
GUIA DE LEGENDA (TikTok):
- Máximo 150 caracteres
- Direto e criativo
- 3-5 hashtags trending
- Tom jovem e descontraído`,
    'twitter': `
GUIA DE LEGENDA (Twitter/X):
- Máximo 280 caracteres
- Conciso e impactante
- 1-2 hashtags
- Opinião ou dado forte`,
    'youtube_thumbnail': `
GUIA DE LEGENDA (YouTube):
- Título SEO-otimizado
- Descrição com keywords
- 3-5 hashtags relevantes`,
    'pinterest': `
GUIA DE LEGENDA (Pinterest):
- Título descritivo com keywords
- 2-5 hashtags
- CTA para salvar o pin`,
  };
  
  return guides[platform] || '';
}
