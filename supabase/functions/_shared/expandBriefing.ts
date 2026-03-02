/**
 * Módulo de Expansão de Briefing Visual (v2)
 * 
 * Recebe um documento de briefing completo (gerado por buildBriefingDocument)
 * e retorna uma descrição visual pura em inglês para o gerador de imagens.
 * 
 * O LLM de texto (Gemini Flash) é o único responsável por digerir todos os
 * metadados (marca, persona, plataforma, compliance) e traduzi-los para
 * uma string descritiva visual otimizada para modelos de imagem.
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

  console.log('[BriefingExpansion] Expanding briefing document with LLM...');
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
      // Fallback: retorna descrição genérica
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
    ? `\nTEXT OVERLAY RULE: The briefing requests text on the image. You MUST include this exact instruction in your output: 'Include text overlay exactly reading "${textContent}" in modern, legible typography with high contrast against the background.' Do NOT omit or paraphrase the text content.`
    : `\nNO TEXT RULE: Do NOT mention any text, typography, words, or lettering in your output. The image must be purely visual. Text restrictions will be handled separately via negative prompting.`;

  return `You are a Senior Visual Art Director. Your task is to read a complete briefing document and output ONLY a pure visual description in English optimized for an AI image generation model.

ABSOLUTE RULES:
1. Output ONLY the visual description. No titles, no labels, no markdown, no explanations, no tags like [COMPLIANCE] or [INSTRUCTION].
2. Write a single continuous paragraph (200-400 words) describing the scene as if directing a cinematographer.
3. Include: lighting setup, camera lens/perspective, dominant colors, textures, atmosphere, mood, expressions (if people are present).
4. The user's main request (what they want to create) is the PRIMARY directive. Everything else (brand, persona, platform) enriches it but NEVER overrides it.
5. Incorporate compliance rules (Brazilian CONAR/CDC) silently into the visual choices — do not mention compliance explicitly.
6. Adapt the visual tone to match the target audience and platform naturally, without stating them.
7. If brand reference images are mentioned, include: "Maintain the visual identity, color palette, and design elements from the provided reference images."
8. If style reference images are mentioned, include: "Draw inspiration from the atmosphere and aesthetic of the provided style reference images."
9. Preserve any SPECIFIC user instructions (logo placement, element positioning) LITERALLY.
10. Output must be in ENGLISH regardless of the input language.
${textInstruction}

Your output will be sent directly to an image generation model. Make every word count visually.`;
}
