/**
 * Módulo LLM Refiner (v5 - Estrategista de Marketing e Diretor de Arte)
 * 
 * Recebe um documento de briefing completo e retorna um JSON estruturado
 * com briefing visual cinematográfico, headline e subtexto.
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
}

export interface RefinerOutput {
  /** Descrição cinematográfica enriquecida */
  briefing_visual: string;
  /** Texto principal sugerido (max 10 palavras) */
  headline: string;
  /** CTA ou texto secundário (max 15 palavras) */
  subtexto: string;
}

export interface ExpandedBriefing {
  /** A descrição visual pura para o modelo de imagem */
  expandedPrompt: string;
  /** Headline sugerida pelo refiner */
  headline: string;
  /** Subtexto/CTA sugerido pelo refiner */
  subtexto: string;
}

// Mapeamento de tom visual -> parâmetros visuais (com dicas de tipografia e cor)
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
 * Retorna JSON com briefing_visual, headline e subtexto.
 */
export async function expandBriefing(
  input: BriefingExpansionInput,
  _geminiApiKey?: string // kept for backward compat, not used anymore
): Promise<ExpandedBriefing> {
  const systemPrompt = buildSystemPrompt(input);
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (!GEMINI_API_KEY) {
    console.error('[LLMRefiner] GEMINI_API_KEY not configured, falling back to empty');
    return { expandedPrompt: '', headline: '', subtexto: '' };
  }

  console.log('[LLMRefiner] Expanding briefing via Gemini API...');
  console.log('[LLMRefiner] Document length:', input.briefingDocument.length, 'chars');
  console.log('[LLMRefiner] Visual style:', input.visualStyle);

  try {
    const userMessage = `Transforme este Briefing Completo num Briefing Visual cinematográfico:\n\n${input.briefingDocument}`;

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
      return { expandedPrompt: '', headline: '', subtexto: '' };
    }

    console.log('[LLMRefiner] Raw response length:', rawContent.length, 'chars');

    // Try to parse JSON from the response
    const parsed = extractJSON<RefinerOutput>(rawContent);
    if (parsed && parsed.briefing_visual) {
      console.log('[LLMRefiner] Parsed JSON successfully');
      console.log('[LLMRefiner] briefing_visual length:', parsed.briefing_visual?.length || 0);
      console.log('[LLMRefiner] headline:', parsed.headline);
      console.log('[LLMRefiner] subtexto:', parsed.subtexto);
      
      return {
        expandedPrompt: parsed.briefing_visual || '',
        headline: parsed.headline || '',
        subtexto: parsed.subtexto || '',
      };
    }

    console.warn('[LLMRefiner] Failed to parse JSON, using raw text as visual briefing');
    // Fallback: use raw content as visual description
    return { expandedPrompt: rawContent, headline: '', subtexto: '' };

  } catch (error) {
    console.error('[LLMRefiner] Error:', error);
    return { expandedPrompt: '', headline: '', subtexto: '' };
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

  return `Você é um Estrategista de Marketing Sênior e Diretor de Arte. Leia todo o contexto lógico, estratégico e de marketing fornecido e retorne um briefing cinematográfico puramente visual.

Descreva: CENA, ILUMINAÇÃO, CORES, COMPOSIÇÃO e DIRETRIZES ESTÉTICAS. Não inclua jargões de marketing ou blocos lógicos estruturados na sua resposta.
${toneBlock}${contextBlock}

SUA MISSÃO (3 etapas obrigatórias):

1. **EXPANDIR A CENA**: Transforme a descrição bruta numa cena cinematográfica. Descreva:
   - Lente da câmera (ex: 35mm para contexto ambiental, 85mm para retrato)
   - Iluminação específica alinhada ao tom visual
   - Cores dominantes alinhadas à paleta da marca (se fornecida)
   - Expressões faciais e linguagem corporal (se houver pessoas)
   - Profundidade de campo, texturas e materiais
   - Elementos contextuais que reforcem a mensagem

2. **DEFINIR O LAYOUT**: Se houver texto a incluir, defina:
   - Áreas de espaço negativo para posicionamento de texto
   - Composição que garanta legibilidade
   - Hierarquia visual adequada ao público-alvo

3. **AJUSTAR O CLIMA**: Adapte a atmosfera ao tom visual solicitado.

REGRAS ABSOLUTAS:
1. Responda EXCLUSIVAMENTE em formato JSON com as chaves: briefing_visual, headline, subtexto
2. briefing_visual: Parágrafo único contínuo (200-400 palavras) descrevendo a cena cinematograficamente EM PORTUGUÊS
3. Inclua: setup de iluminação, lente/perspectiva da câmera, cores dominantes, texturas, atmosfera, mood, expressões (se houver pessoas)
4. O pedido principal do usuário (o que ele quer criar) é a diretriz PRIMÁRIA — tudo mais enriquece mas NUNCA sobrepõe
5. NÃO inclua negative prompts ou instruções "evitar" — são tratados separadamente
6. Incorpore diretrizes éticas silenciosamente nas escolhas visuais sem mencioná-las
7. Adapte o tom visual ao público-alvo e plataforma naturalmente, sem nomeá-los
8. Se imagens de referência da marca forem mencionadas, inclua: "Manter a identidade visual, paleta de cores e elementos de design das imagens de referência da marca fornecidas."
9. Se imagens de referência de estilo forem mencionadas, inclua: "Inspirar-se na atmosfera e estética das imagens de referência de estilo fornecidas."
10. Preserve LITERALMENTE instruções ESPECÍFICAS do usuário (posicionamento de elementos, objetos específicos)
11. headline: Texto principal sugerido (máximo 10 palavras), relevante ao objetivo
12. subtexto: CTA ou texto secundário (máximo 15 palavras)
13. Encerre o briefing_visual reafirmando o assunto/cena central do pedido original do usuário
14. Seja EXTREMAMENTE específico e visual, nunca genérico
${textInstruction}

FORMATO DE RESPOSTA (JSON estrito):
{
  "briefing_visual": "Uma fotografia cinematográfica de [CENA DETALHADA]...",
  "headline": "texto principal sugerido",
  "subtexto": "CTA ou texto secundário"
}`;
}
