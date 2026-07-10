/**
 * Inpainting: gera `clean_background.png` removendo apenas o texto detectado
 * pelo Vision. Usa Gemini Image Edit (gemini-3-pro-image).
 */
import {
  callGeminiWithRetry,
  extractInlineImage,
  GEMINI_BASE,
  INPAINT_MODEL,
} from "./templateAi.ts";
import type { TextZone, LogoSlot } from "./templates.ts";

export function buildInpaintingPrompt(
  zones: Pick<TextZone, "bbox" | "label" | "original_text">[],
  logoSlot: LogoSlot | null,
): string {
  const z = zones.map((z) =>
    `- ${z.label} em bbox normalizado x=${z.bbox.x.toFixed(3)}, y=${z.bbox.y.toFixed(3)}, ` +
    `w=${z.bbox.w.toFixed(3)}, h=${z.bbox.h.toFixed(3)} (texto: "${z.original_text ?? ""}")`
  ).join("\n");
  const logoLine = logoSlot
    ? `\n- Logo em x=${logoSlot.bbox.x.toFixed(3)}, y=${logoSlot.bbox.y.toFixed(3)}, w=${logoSlot.bbox.w.toFixed(3)}, h=${logoSlot.bbox.h.toFixed(3)}`
    : "";
  return [
    "Remova APENAS o texto, números e elementos tipográficos identificados nas regiões abaixo, preservando exatamente o fundo, gradientes, fotos, formas decorativas e qualquer área não-textual.",
    "Não adicione novo texto. Não altere cores, iluminação, composição ou objetos não-textuais.",
    "Reconstrua o fundo da forma mais natural possível sob as áreas onde havia texto.",
    "",
    "Regiões a limpar:",
    z + logoLine,
  ].join("\n");
}

export async function inpaintBackground(
  apiKey: string,
  imageBase64: string,
  zones: Pick<TextZone, "bbox" | "label" | "original_text">[],
  logoSlot: LogoSlot | null,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<{ mimeType: string; base64: string }> {
  const url = `${GEMINI_BASE}/models/${INPAINT_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      role: "user",
      parts: [
        { text: buildInpaintingPrompt(zones, logoSlot) },
        { inlineData: { mimeType: "image/png", data: imageBase64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.2,
      // Gemini exige IMAGE+TEXT para edição de imagem (apenas IMAGE retorna 400).
      responseModalities: ["IMAGE", "TEXT"],
    },
  };
  const raw = await callGeminiWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { fetchImpl: opts.fetchImpl });
  const img = extractInlineImage(raw);
  if (!img) throw new Error("Inpainting: resposta sem imagem inline");
  return img;
}
