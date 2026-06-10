/**
 * Vision: detecção de zonas de texto e logo_slot em uma imagem base.
 *
 * Estratégia:
 *  1. Envia PNG base64 + system prompt pedindo JSON estrito.
 *  2. Configura `responseMimeType: application/json` para Gemini retornar JSON puro.
 *  3. Parseia + valida campos mínimos. Rejeita se inválido.
 *
 * A função `parseVisionResponse` é pura (testável sem fetch).
 */
import {
  callGeminiWithRetry,
  GEMINI_BASE,
  VISION_MODEL,
} from "./templateAi.ts";
import type { LogoSlot, TextZone } from "./templates.ts";

const VISION_SYSTEM = `Você é um analista visual de templates de marketing.
Recebe uma imagem (template/post) e DEVE retornar JSON estrito descrevendo:
- text_zones: array com cada bloco de texto detectado.
- logo_slot: objeto OU null, descrevendo a área provável do logo (canto, pequena, isolada).

Schema obrigatório:
{
  "text_zones": [{
    "label": "Título" | "Subtítulo" | "CTA" | "Data" | "Preço" | "Endereço" | "Outro",
    "bbox": { "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 },
    "original_text": string,
    "font_family": string,
    "font_weight": 100..900,
    "font_size_px": number,
    "color": "#RRGGBB",
    "align": "left" | "center" | "right",
    "line_height": number
  }],
  "logo_slot": null | {
    "bbox": { "x": 0..1, "y": 0..1, "w": 0..1, "h": 0..1 },
    "fit": "contain" | "cover",
    "padding": number
  }
}

Não inclua comentários nem texto fora do JSON. Coordenadas são normalizadas (0..1).`;

export interface VisionResult {
  text_zones: TextZone[];
  logo_slot: LogoSlot | null;
}

export function parseVisionResponse(text: string): VisionResult {
  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    // Tenta extrair primeiro { ... } se Gemini envolveu em markdown.
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Vision retornou JSON inválido");
    obj = JSON.parse(m[0]);
  }

  if (!obj || typeof obj !== "object" || !Array.isArray(obj.text_zones)) {
    throw new Error("Vision: text_zones ausente");
  }

  const zones: TextZone[] = obj.text_zones.map((z: any, i: number) => {
    if (!z?.bbox || typeof z.bbox.x !== "number") {
      throw new Error(`Vision: bbox inválido na zona ${i}`);
    }
    return {
      id: crypto.randomUUID(),
      label: String(z.label ?? "Outro"),
      bbox: {
        x: clamp01(z.bbox.x),
        y: clamp01(z.bbox.y),
        w: clamp01(z.bbox.w),
        h: clamp01(z.bbox.h),
      },
      font_family: String(z.font_family ?? "Inter"),
      font_weight: Number(z.font_weight ?? 500),
      font_size_px: Number(z.font_size_px ?? 32),
      color: typeof z.color === "string" ? z.color : "#0F172A",
      align: (z.align === "center" || z.align === "right") ? z.align : "left",
      line_height: Number(z.line_height ?? 1.2),
      original_text: typeof z.original_text === "string" ? z.original_text : "",
    };
  });

  let slot: LogoSlot | null = null;
  if (obj.logo_slot && typeof obj.logo_slot === "object" && obj.logo_slot.bbox) {
    slot = {
      bbox: {
        x: clamp01(obj.logo_slot.bbox.x),
        y: clamp01(obj.logo_slot.bbox.y),
        w: clamp01(obj.logo_slot.bbox.w),
        h: clamp01(obj.logo_slot.bbox.h),
      },
      fit: obj.logo_slot.fit === "cover" ? "cover" : "contain",
      padding: typeof obj.logo_slot.padding === "number" ? obj.logo_slot.padding : 0,
    };
  }

  return { text_zones: zones, logo_slot: slot };
}

function clamp01(v: any): number {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Chama o Vision real. `imageBase64` = PNG cru em base64.
 */
export async function detectZones(
  apiKey: string,
  imageBase64: string,
  opts: { fetchImpl?: typeof fetch } = {},
): Promise<VisionResult> {
  const url = `${GEMINI_BASE}/models/${VISION_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    systemInstruction: { parts: [{ text: VISION_SYSTEM }] },
    contents: [{
      role: "user",
      parts: [
        { text: "Analise este template e retorne o JSON estrito." },
        { inlineData: { mimeType: "image/png", data: imageBase64 } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const raw = await callGeminiWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { fetchImpl: opts.fetchImpl });

  const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return parseVisionResponse(text);
}
