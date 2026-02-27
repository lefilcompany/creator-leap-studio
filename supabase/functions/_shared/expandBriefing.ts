/**
 * Módulo de Expansão de Briefing Visual
 * 
 * Etapa 1 do fluxo de geração de imagem:
 * Usa um LLM de texto (Gemini Flash) para transformar o prompt bruto do usuário
 * em um briefing visual cinematográfico detalhado para o gerador de imagens.
 */

interface BriefingContext {
  /** Prompt/descrição bruta do usuário */
  prompt: string;
  /** Contexto da marca (nome, segmento, valores, etc.) */
  brandContext?: string;
  /** Contexto do tema estratégico */
  themeContext?: string;
  /** Contexto da persona/público-alvo */
  personaContext?: string;
  /** Plataforma alvo */
  platform?: string;
  /** Estilo visual selecionado */
  visualStyle?: string;
  /** Tom de voz */
  tones?: string[];
  /** Tipo de conteúdo (orgânico/ads) */
  contentType?: string;
  /** Objetivo do post */
  objective?: string;
  /** Texto a ser incluído na imagem */
  textContent?: string;
  /** Paleta de cores */
  colorPalette?: string;
  /** Iluminação */
  lighting?: string;
  /** Composição */
  composition?: string;
  /** Ângulo da câmera */
  cameraAngle?: string;
  /** Nível de detalhamento (1-10) */
  detailLevel?: number;
  /** Clima/mood */
  mood?: string;
  /** Prompt negativo */
  negativePrompt?: string;
  /** Informações adicionais */
  additionalInfo?: string;
}

interface ExpandedBriefing {
  /** O briefing visual expandido e detalhado */
  expandedPrompt: string;
  /** O prompt original para referência */
  originalPrompt: string;
}

/**
 * Expande um prompt bruto em um briefing visual cinematográfico detalhado.
 * 
 * Usa Gemini Flash (texto) para:
 * 1. Analisar o contexto (marca, tema, persona, plataforma)
 * 2. Expandir a descrição visual para uma cena cinematográfica
 * 3. Definir iluminação, composição, paleta de cores, tipografia
 * 4. Ajustar o clima de acordo com o tom e estilo solicitado
 */
export async function expandBriefing(
  context: BriefingContext,
  geminiApiKey: string
): Promise<ExpandedBriefing> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildExpansionPrompt(context);

  console.log('[BriefingExpansion] Expanding prompt with LLM...');
  console.log('[BriefingExpansion] Original prompt:', context.prompt.substring(0, 200));

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BriefingExpansion] Gemini text API error:', response.status, errorText);
      // Fallback: retorna o prompt original sem expansão
      return {
        expandedPrompt: context.prompt,
        originalPrompt: context.prompt,
      };
    }

    const data = await response.json();
    const expandedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!expandedText) {
      console.warn('[BriefingExpansion] No text in response, using original prompt');
      return {
        expandedPrompt: context.prompt,
        originalPrompt: context.prompt,
      };
    }

    console.log('[BriefingExpansion] Expanded briefing length:', expandedText.length, 'chars');
    console.log('[BriefingExpansion] Preview:', expandedText.substring(0, 300));

    return {
      expandedPrompt: expandedText.trim(),
      originalPrompt: context.prompt,
    };
  } catch (error) {
    console.error('[BriefingExpansion] Error expanding briefing:', error);
    // Fallback gracioso: retorna o prompt original
    return {
      expandedPrompt: context.prompt,
      originalPrompt: context.prompt,
    };
  }
}

function buildSystemPrompt(): string {
  return `Você é um Diretor de Arte e Estrategista Visual Sênior. Sua tarefa é transformar descrições brutas de formulários em BRIEFINGS VISUAIS cinematográficos detalhados para um gerador de imagens de IA.

REGRAS ABSOLUTAS:
1. Responda APENAS com o briefing visual expandido. Sem explicações, sem títulos, sem formatação markdown.
2. O briefing deve ser um parágrafo contínuo e rico em detalhes visuais.
3. Descreva a cena como se estivesse dirigindo um fotógrafo profissional ou diretor de cinema.
4. Inclua SEMPRE: iluminação, lente/perspectiva, cores dominantes, atmosfera, texturas, expressões.
5. Se houver texto para incluir na imagem, descreva exatamente como ele deve ser renderizado (fonte, posição, cor, tamanho).
6. Mantenha o briefing em INGLÊS para melhor resultado do gerador de imagens.
7. NUNCA adicione elementos que não foram solicitados ou implícitos no contexto.
8. O briefing deve ter entre 150-400 palavras.
9. COMPLIANCE: Respeite as diretrizes éticas brasileiras (CONAR/CDC). Nunca inclua discriminação, consumo de álcool, ou conteúdo inadequado para menores se o público incluir jovens.`;
}

function buildExpansionPrompt(ctx: BriefingContext): string {
  const sections: string[] = [];

  sections.push(`DESCRIÇÃO BRUTA DO USUÁRIO: "${ctx.prompt}"`);

  if (ctx.brandContext) {
    sections.push(`CONTEXTO DA MARCA: ${ctx.brandContext}`);
  }

  if (ctx.themeContext) {
    sections.push(`TEMA ESTRATÉGICO: ${ctx.themeContext}`);
  }

  if (ctx.personaContext) {
    sections.push(`PÚBLICO-ALVO: ${ctx.personaContext}`);
  }

  if (ctx.platform) {
    const platformMap: Record<string, string> = {
      'instagram_feed': 'Instagram Feed (formato quadrado, alta impacto visual)',
      'instagram_stories': 'Instagram Stories (vertical 9:16, dinâmico)',
      'instagram_reels': 'Instagram Reels (vertical 9:16, tendência)',
      'facebook_feed': 'Facebook Feed (versatile)',
      'facebook_post': 'Facebook (compartilhável)',
      'linkedin_post': 'LinkedIn (profissional, corporativo)',
      'tiktok': 'TikTok (vertical, jovem, dinâmico)',
      'youtube_thumbnail': 'YouTube Thumbnail (16:9, chamar atenção)',
      'twitter': 'Twitter/X (horizontal, conciso)',
      'pinterest': 'Pinterest (vertical, estético)',
      'whatsapp_status': 'WhatsApp Status (vertical, pessoal)',
    };
    sections.push(`PLATAFORMA: ${platformMap[ctx.platform] || ctx.platform}`);
  }

  if (ctx.visualStyle) {
    const styleMap: Record<string, string> = {
      'realistic': 'Fotografia hiper-realista, cinematográfica',
      'animated': 'Animação 3D estilo Pixar/Disney',
      'cartoon': 'Ilustração cartoon com cores vibrantes',
      'anime': 'Arte anime/manga com estética japonesa',
      'watercolor': 'Pintura aquarela com texturas suaves',
      'oil_painting': 'Pintura a óleo clássica',
      'digital_art': 'Arte digital profissional, concept art',
      'sketch': 'Desenho a lápis, sketch artístico',
      'minimalist': 'Design minimalista, clean e elegante',
      'vintage': 'Estética vintage/retrô nostálgica',
    };
    sections.push(`ESTILO VISUAL: ${styleMap[ctx.visualStyle] || ctx.visualStyle}`);
  }

  if (ctx.tones && ctx.tones.length > 0) {
    sections.push(`TOM DE VOZ: ${ctx.tones.join(', ')}`);
  }

  if (ctx.contentType) {
    sections.push(`TIPO DE CONTEÚDO: ${ctx.contentType === 'ads' ? 'Publicidade paga (foco em conversão)' : 'Conteúdo orgânico (foco em engajamento)'}`);
  }

  if (ctx.objective) {
    sections.push(`OBJETIVO DO POST: ${ctx.objective}`);
  }

  // Advanced visual settings
  const advancedParts: string[] = [];
  if (ctx.colorPalette && ctx.colorPalette !== 'auto') advancedParts.push(`Paleta: ${ctx.colorPalette}`);
  if (ctx.lighting && ctx.lighting !== 'natural') advancedParts.push(`Iluminação: ${ctx.lighting}`);
  if (ctx.composition && ctx.composition !== 'auto') advancedParts.push(`Composição: ${ctx.composition}`);
  if (ctx.cameraAngle && ctx.cameraAngle !== 'eye_level') advancedParts.push(`Câmera: ${ctx.cameraAngle}`);
  if (ctx.mood && ctx.mood !== 'auto') advancedParts.push(`Clima: ${ctx.mood}`);
  if (ctx.detailLevel && ctx.detailLevel !== 7) advancedParts.push(`Nível de detalhe: ${ctx.detailLevel}/10`);

  if (advancedParts.length > 0) {
    sections.push(`CONFIGURAÇÕES VISUAIS: ${advancedParts.join(' | ')}`);
  }

  if (ctx.textContent?.trim()) {
    sections.push(`TEXTO PARA INCLUIR NA IMAGEM: "${ctx.textContent}" — Descreva a tipografia ideal, posição, cor e estilo da fonte para máxima legibilidade e impacto.`);
  }

  if (ctx.negativePrompt) {
    sections.push(`EVITAR: ${ctx.negativePrompt}`);
  }

  if (ctx.additionalInfo) {
    sections.push(`INFORMAÇÕES ADICIONAIS: ${ctx.additionalInfo}`);
  }

  sections.push(`\nSUA MISSÃO:
1. Expanda a descrição bruta acima para uma cena visual cinematográfica detalhada em INGLÊS.
2. Descreva iluminação, lente (ex: 35mm, 85mm, macro), cores dominantes, texturas, expressões faciais se houver pessoas.
3. Ajuste a atmosfera ao tom/estilo solicitado.
4. Se houver texto para a imagem, descreva a tipografia e posicionamento ideal.
5. Responda APENAS com o briefing expandido, sem explicações ou títulos.`);

  return sections.join('\n\n');
}
