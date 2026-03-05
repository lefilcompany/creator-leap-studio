/**
 * Módulo LLM Refiner (v4 - Estrategista de Marketing Senior)
 * 
 * Recebe um documento de briefing completo e retorna um JSON estruturado
 * com briefing visual cinematográfico, headline e subtexto.
 * 
 * Usa o Lovable AI Gateway (google/gemini-3-flash-preview).
 */

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

// Mapeamento de tom visual -> parâmetros visuais
const TONE_VISUAL_MAP: Record<string, { contrast: string; lighting: string; style: string; composition: string; focus: string; description: string }> = {
  combativo: {
    contrast: 'Alto — contrastes fortes, sombras intensas',
    lighting: 'Dramática, low-key, sombras fortes, contra-luz',
    style: 'Bold, impactante, alto contraste, cores intensas',
    composition: 'Dinâmica, assimétrica, composição de tensão e urgência',
    focus: 'Poder, urgência, força, determinação',
    description: 'Gera urgência e força. Cores intensas, tipografia impactante, contrastes fortes.',
  },
  didatico: {
    contrast: 'Médio — contraste equilibrado e legível',
    lighting: 'Uniforme, limpa, studio brilhante e neutro',
    style: 'Clean/Grid, elementos infográficos, dados visuais',
    composition: 'Organizada, grid-based, hierarquia clara, espaço para dados',
    focus: 'Compreensão de dados, clareza, confiança, transparência',
    description: 'Facilita a compreensão de dados. Layout limpo, elementos infográficos, tons neutros.',
  },
  emocional: {
    contrast: 'Baixo-Médio — tons suaves e acolhedores',
    lighting: 'Quente/Golden Hour, luz natural suave, amanhecer/pôr-do-sol',
    style: 'Quente, centrado no humano, empático, acolhedor',
    composition: 'Close-ups, foco humano, enquadramento íntimo, olhar direto',
    focus: 'Pessoas/Expressões, conexão humana, empatia, pertencimento',
    description: 'Gera conexão humana e empatia. Iluminação quente, foco em pessoas e expressões.',
  },
  institucional: {
    contrast: 'Baixo — composição estável e formal',
    lighting: 'Limpa, balanceada, studio profissional',
    style: 'Minimalista, formal, autoritário',
    composition: 'Simétrica, centrada, estável',
    focus: 'Ordem, estabilidade, competência',
    description: 'Transmite estabilidade e ordem. Estilo minimalista, composição simétrica.',
  },
};

/**
 * Expande um documento de briefing usando o LLM Refiner via Lovable AI Gateway.
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLMRefiner] Gemini error:', response.status, errorText);
      return { expandedPrompt: '', headline: '', subtexto: '' };
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!rawContent) {
      console.warn('[LLMRefiner] No content in response');
      return { expandedPrompt: '', headline: '', subtexto: '' };
    }

    console.log('[LLMRefiner] Raw response length:', rawContent.length, 'chars');

    // Try to parse JSON from the response
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed: RefinerOutput = JSON.parse(jsonMatch[0]);
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
    } catch (parseError) {
      console.warn('[LLMRefiner] Failed to parse JSON, using raw text as visual briefing');
    }

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
- ${params.description}`;
        break;
      }
    }
  }

  const textInstruction = input.hasTextOverlay && input.textContent
    ? `\nTEXTO NA IMAGEM: O briefing solicita texto sobreposto. NÃO adicione instruções de tipografia — isso será feito downstream. Foque em compor uma cena visual que naturalmente deixe espaço negativo apropriado onde o texto pode ser colocado sem obscurecer elementos visuais chave.`
    : `\nSEM TEXTO: NÃO mencione texto, tipografia, palavras ou letras na sua saída. A imagem deve ser puramente visual sem elementos textuais.`;

  return `Você é um Diretor de Arte Sênior e Estrategista de Marketing. Leia todo o contexto lógico, estratégico e de marketing fornecido e retorne um briefing cinematográfico puramente visual.

Descreva: CENA, ILUMINAÇÃO, CORES, COMPOSIÇÃO e DIRETRIZES ESTÉTICAS. Não inclua jargões de marketing, blocos lógicos estruturados ou a palavra "Compliance" na sua resposta.
${toneBlock}

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
${textInstruction}

FORMATO DE RESPOSTA (JSON estrito):
{
  "briefing_visual": "Uma fotografia cinematográfica de [CENA DETALHADA]...",
  "headline": "texto principal sugerido",
  "subtexto": "CTA ou texto secundário"
}`;
}
