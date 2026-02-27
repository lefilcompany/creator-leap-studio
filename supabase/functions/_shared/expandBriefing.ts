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
  /** Quantidade de imagens de referência da marca */
  preserveImagesCount?: number;
  /** Quantidade de imagens de referência de estilo */
  styleReferenceImagesCount?: number;
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

REGRA MAIS IMPORTANTE — PRIORIDADE ABSOLUTA DO PEDIDO DO USUÁRIO:
A descrição bruta do usuário (campo "Descreva o que você quer criar") é a DIRETRIZ PRINCIPAL e INVIOLÁVEL. 
Todo o briefing expandido DEVE servir ao que o usuário pediu. NUNCA substitua, ignore ou desvie do pedido original.
O contexto (marca, tema, persona, plataforma) serve apenas para ENRIQUECER e CONTEXTUALIZAR o pedido, NUNCA para sobrescrevê-lo.
Se o usuário pediu "um gato num sofá", o briefing DEVE ser sobre um gato num sofá — com iluminação, lente e atmosfera adequadas, mas SEMPRE um gato num sofá.
INSTRUÇÕES ESPECÍFICAS DO USUÁRIO (posicionamento de logo, texto, legendas, elementos específicos) DEVEM ser preservadas LITERALMENTE no briefing expandido. NUNCA abstraia ou omita instruções concretas como "coloque a logo no canto superior esquerdo" ou "adicione texto na parte inferior".

REGRAS SOBRE IMAGENS DE REFERÊNCIA:
Quando o usuário fornece imagens de referência (da marca ou de estilo), o gerador de imagens receberá essas imagens junto com o briefing.
1. Se houver imagens da marca/identidade: O briefing DEVE instruir a manter a paleta de cores, estilo visual, tipografia e elementos visuais dessas imagens. A nova imagem deve parecer PARTE DO MESMO CONJUNTO VISUAL.
2. Se houver imagens de referência de estilo: O briefing DEVE instruir a absorver a atmosfera, paleta e estética dessas referências.
3. Mencione explicitamente no briefing: "Maintain the visual identity, color palette, and design elements from the provided reference images."

REGRAS ABSOLUTAS:
1. Responda APENAS com o briefing visual expandido. Sem explicações, sem títulos, sem formatação markdown.
2. O briefing deve ser um parágrafo contínuo e rico em detalhes visuais.
3. Descreva a cena como se estivesse dirigindo um fotógrafo profissional ou diretor de cinema.
4. Inclua SEMPRE: iluminação, lente/perspectiva, cores dominantes, atmosfera, texturas, expressões.
5. Mantenha o briefing em INGLÊS para melhor resultado do gerador de imagens.
6. NUNCA adicione elementos que não foram solicitados ou implícitos no contexto.
7. O briefing deve ter entre 150-400 palavras.
8. COMPLIANCE: Respeite as diretrizes éticas brasileiras (CONAR/CDC). Nunca inclua discriminação, consumo de álcool, ou conteúdo inadequado para menores se o público incluir jovens.

REGRAS DE TIPOGRAFIA E LEGIBILIDADE (quando houver texto na imagem):
1. CONTRASTE: O texto DEVE ter alto contraste com o fundo. Texto claro sobre fundo escuro ou vice-versa. NUNCA cores que se misturem.
2. HIERARQUIA TIPOGRÁFICA: Use tamanhos diferentes — título/mensagem principal em fonte grande e bold, subtítulos menores, corpo de texto menor ainda. Guie o olhar do espectador.
3. ESPAÇAMENTO: Line-height entre 1.2x e 1.5x o tamanho da fonte. Margens generosas. Texto NUNCA deve ocupar toda a área disponível.
4. LIMITE DE TEXTO: Texto curto e objetivo. Mensagem principal logo no início. CTAs diretas e concisas.
5. FONTE LEGÍVEL: Fontes claras e fáceis de ler em dispositivos móveis. Sans-serif robusta para popular, serifada elegante para formal. NUNCA fontes extravagantes ilegíveis.
6. RESPONSIVIDADE: O texto deve ser legível tanto em tela cheia quanto em thumbnails pequenos.
7. FUNDO LIMPO SOB O TEXTO: Se o fundo for complexo/detalhado, SEMPRE adicione uma caixa ou faixa semitransparente (overlay) atrás do texto para garantir legibilidade. Desfoque ou escureça a área atrás do texto.
8. ALINHAMENTO ESTRATÉGICO: Centralize para impacto ou alinhe à esquerda/direita para organização visual. Posicione o texto em áreas de respiro da composição, NUNCA sobre elementos visuais importantes.
9. SOBREPOSIÇÕES: Use blocos de cor semitransparente, faixas ou gradientes para destacar texto sobre imagens sem ocultar o conteúdo visual principal.
10. ELEMENTOS GRÁFICOS: Inclua linhas, formas ou molduras sutis que emoldurem e destaquem o texto, reforçando a hierarquia visual sem poluir.`;
}

function buildExpansionPrompt(ctx: BriefingContext): string {
  const sections: string[] = [];

  sections.push(`⭐ PEDIDO PRINCIPAL DO USUÁRIO (PRIORIDADE MÁXIMA): "${ctx.prompt}"
O briefing expandido DEVE ser fiel a este pedido. Tudo abaixo é contexto complementar.`);

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
    sections.push(`TEXTO PARA INCLUIR NA IMAGEM: "${ctx.textContent}" — Aplique TODAS as regras de tipografia e legibilidade: alto contraste com o fundo, hierarquia tipográfica clara (título grande e bold), espaçamento generoso, fonte legível em mobile, faixa/overlay semitransparente atrás do texto se o fundo for complexo, alinhamento estratégico em área de respiro, e elementos gráficos sutis para emoldurar.`);
  }

  if (ctx.negativePrompt) {
    sections.push(`EVITAR: ${ctx.negativePrompt}`);
  }

  if (ctx.additionalInfo) {
    sections.push(`INFORMAÇÕES ADICIONAIS: ${ctx.additionalInfo}`);
  }

  // Reference images context
  if (ctx.preserveImagesCount && ctx.preserveImagesCount > 0) {
    sections.push(`IMAGENS DE REFERÊNCIA DA MARCA: ${ctx.preserveImagesCount} imagem(ns) da identidade visual da marca foram fornecidas junto com este briefing. O resultado DEVE manter a mesma paleta de cores, estilo visual, tipografia e elementos de design dessas imagens. A nova imagem deve parecer parte do mesmo conjunto visual.`);
  }
  if (ctx.styleReferenceImagesCount && ctx.styleReferenceImagesCount > 0) {
    sections.push(`IMAGENS DE REFERÊNCIA DE ESTILO: ${ctx.styleReferenceImagesCount} imagem(ns) de referência de estilo foram fornecidas. Absorva a atmosfera, paleta e estética dessas referências na composição final.`);
  }

  sections.push(`\nSUA MISSÃO:
1. Expanda o PEDIDO PRINCIPAL DO USUÁRIO acima para uma cena visual cinematográfica detalhada em INGLÊS. O pedido do usuário é a diretriz central — NÃO desvie dele.
2. Descreva iluminação, lente (ex: 35mm, 85mm, macro), cores dominantes, texturas, expressões faciais se houver pessoas.
3. Ajuste a atmosfera ao tom/estilo solicitado.
4. Se houver texto para a imagem, aplique TODAS as 10 regras de tipografia: contraste forte, hierarquia tipográfica, espaçamento, texto curto, fonte legível, responsividade, overlay/faixa atrás do texto em fundos complexos, alinhamento estratégico, sobreposições semitransparentes, e elementos gráficos de destaque.
5. Se houver imagens de referência, inclua a instrução: "Maintain the visual identity, color palette, and design elements from the provided reference images."
6. Responda APENAS com o briefing expandido, sem explicações ou títulos.`);

  return sections.join('\n\n');
}
