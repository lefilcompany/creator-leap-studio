/**
 * Branch B (Estágio 2): gera um fundo novo para o template via Gemini image.
 * Garante que NENHUM texto seja desenhado pelo modelo.
 */
import {
  callGeminiWithRetry,
  extractInlineImage,
  GEMINI_BASE,
  IMAGE_GEN_MODEL,
} from "./templateAi.ts";

export function buildBackgroundPrompt(
  userPrompt: string,
  refs: { aspectRatio: string; brandStyleNotes?: string[] },
): string {
  const refsLine = refs.brandStyleNotes?.length
    ? `\nReferências de estilo aprovadas: ${refs.brandStyleNotes.slice(0, 3).join(" | ")}`
    : "";
  return [
    `Gere uma imagem de fundo no aspect ratio ${refs.aspectRatio}.`,
    `Descrição: ${userPrompt.trim()}`,
    "REGRA INEGOCIÁVEL: NÃO desenhe nenhum texto, letra, número, palavra, logo, watermark, legenda, slogan ou tipografia. A imagem é puramente visual; todo o texto será composto separadamente pelo servidor.",
    refsLine,
  ].join("\n");
}

export async function generateBackground(
  apiKey: string,
  prompt: string,
  aspectRatio: string,
  brandStyleNotes: string[] = [],
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ mimeType: string; base64: string }> {
  const url = `${GEMINI_BASE}/models/${IMAGE_GEN_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      role: "user",
      parts: [{ text: buildBackgroundPrompt(prompt, { aspectRatio, brandStyleNotes }) }],
    }],
    generationConfig: {
      temperature: 0.7,
      // Gemini exige IMAGE+TEXT na resposta (apenas IMAGE retorna 400).
      responseModalities: ["IMAGE", "TEXT"],
    },
  };
  const raw = await callGeminiWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { fetchImpl: opts.fetchImpl });
  const img = extractInlineImage(raw);
  if (!img) throw new Error("Branch B: resposta sem imagem inline");
  return img;
}
