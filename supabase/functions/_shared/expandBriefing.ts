/**
 * Módulo de Expansão de Briefing Visual (v3 - Diretor de Arte)
 * 
 * Recebe um documento de briefing completo (gerado por buildBriefingDocument)
 * e retorna uma descrição visual pura em inglês para o gerador de imagens.
 * 
 * O LLM de texto (Gemini Flash) atua como um Diretor de Arte Sênior,
 * digerindo todos os metadados (marca, persona, plataforma, compliance)
 * e traduzindo-os para uma string cinematográfica puramente visual.
 */

export interface BriefingExpansionInput {
  /** Documento de briefing completo gerado por buildBriefingDocument */
  briefingDocument: string;
  /** Estilo visual selecionado (para referência) */
  visualStyle: string;
  /** Se há texto para incluir na imagem */
  hasTextOverlay?: boolean;
  /** O texto a incluir (se houver) */
  textContent?: string;
}

export interface ExpandedBriefing {
  /** A descrição visual pura em inglês para o modelo de imagem */
  expandedPrompt: string;
}

/**
 * Expande um documento de briefing em uma descrição visual pura em inglês.
 */
export async function expandBriefing(
  input: BriefingExpansionInput,
  geminiApiKey: string
): Promise<ExpandedBriefing> {
  const systemPrompt = buildSystemPrompt(input.hasTextOverlay, input.textContent);

  console.log('[BriefingExpansion] Expanding briefing document with Art Director LLM...');
  console.log('[BriefingExpansion] Document length:', input.briefingDocument.length, 'chars');
  console.log('[BriefingExpansion] Visual style:', input.visualStyle);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: input.briefingDocument }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[BriefingExpansion] Gemini API error:', response.status, errorText);
      return { expandedPrompt: '' };
    }

    const data = await response.json();
    const expandedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!expandedText) {
      console.warn('[BriefingExpansion] No text in response');
      return { expandedPrompt: '' };
    }

    console.log('[BriefingExpansion] Expanded prompt length:', expandedText.length, 'chars');
    console.log('[BriefingExpansion] Preview:', expandedText.substring(0, 300));

    return { expandedPrompt: expandedText.trim() };
  } catch (error) {
    console.error('[BriefingExpansion] Error:', error);
    return { expandedPrompt: '' };
  }
}

function buildSystemPrompt(hasTextOverlay?: boolean, textContent?: string): string {
  const textInstruction = hasTextOverlay && textContent
    ? `\nTEXT IN IMAGE: The briefing requests text overlay on the image. Do NOT add any typography or text rendering instructions — that will be handled separately downstream. Instead, focus purely on composing a visual scene that naturally leaves appropriate negative space where text can be placed without obscuring key visual elements.`
    : `\nNO TEXT: Do NOT mention any text, typography, words, letters, or lettering in your output. The image must be purely visual with zero textual elements.`;

  return `You are a Senior Art Director. Read all the logical, strategic, and marketing context provided and return ONLY a pure cinematic visual briefing. Describe: SCENE, LIGHTING, COLORS, COMPOSITION, and AESTHETIC GUIDELINES. Do not include marketing jargon, structured logic blocks, or the word "Compliance" in your response.

ABSOLUTE RULES:
1. Output ONLY the visual description. No titles, no labels, no markdown, no explanations.
2. Write a single continuous paragraph (200-400 words) describing the scene cinematically.
3. Include: lighting setup, camera lens/perspective, dominant colors, textures, atmosphere, mood, expressions (if people are present).
4. The user's main request (what they want to create) is the PRIMARY directive — everything else enriches it but NEVER overrides it.
5. Do NOT include negative prompts or "avoid" instructions — those are handled separately.
6. Silently incorporate ethical guidelines into visual choices without mentioning them.
7. Adapt visual tone to match the target audience and platform naturally, without naming them.
8. If brand reference images are mentioned, include: "Maintain the visual identity, color palette, and design elements from the provided brand reference images."
9. If style reference images are mentioned, include: "Draw inspiration from the atmosphere and aesthetic of the provided style reference images."
10. Preserve any SPECIFIC user instructions (element positioning, specific objects) LITERALLY.
11. Output must be in ENGLISH regardless of the input language.
12. End your description by restating the core subject/scene from the user's original request to anchor the model.
${textInstruction}

Your output will be sent directly to an image generation model. Make every word count visually. No fluff, no abstraction — concrete visual direction only.`;
}
