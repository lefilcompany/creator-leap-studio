/**
 * Downscale + re-encode reference images (data URLs) before sending to Gemini.
 *
 * Motivação: a edge function `generate-image` (e derivadas) recebe múltiplas
 * imagens de referência como data URLs base64. Fotos vindas de celular podem
 * ter 3-8 MB cada; carregar 3-5 delas + resposta do Gemini estoura o limite
 * de memória por invocação da edge function (~256 MB), causando
 * `WORKER_RESOURCE_LIMIT / Memory limit exceeded`.
 *
 * Este módulo reduz cada referência para no máximo `maxSide` px no lado maior
 * e re-codifica em JPEG. A qualidade visual continua excelente como
 * referência de estilo/conteúdo para o modelo, mas o payload em memória cai
 * tipicamente de MB para <200 KB por imagem.
 *
 * As operações são feitas sequencialmente para não manter várias imagens
 * decodificadas ao mesmo tempo.
 */

const DATA_URL_RE = /^data:([^;]+);base64,(.+)$/;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/**
 * Redimensiona um data URL para no máximo `maxSide` px no lado maior e
 * re-codifica como JPEG. Em qualquer erro, retorna o data URL original.
 *
 * Faz early-return sem processar quando a imagem já é pequena (bytes abaixo
 * de `skipBelowBytes`), evitando trabalho desnecessário.
 */
export async function downscaleDataUrl(
  dataUrl: string,
  maxSide = 1024,
  jpegQuality = 80,
  skipBelowBytes = 200_000,
): Promise<string> {
  try {
    const match = dataUrl.match(DATA_URL_RE);
    if (!match) return dataUrl;
    const rawB64 = match[2];

    // Estimativa rápida: base64 é ~4/3 do binário.
    const approxBytes = Math.floor((rawB64.length * 3) / 4);

    const bytes = base64ToBytes(rawB64);

    const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');
    const img = await Image.decode(bytes);
    const w = img.width;
    const h = img.height;
    const largest = Math.max(w, h);

    // Se já é pequena o bastante em pixels E em bytes, mantém como está.
    if (largest <= maxSide && approxBytes <= skipBelowBytes) {
      return dataUrl;
    }

    if (largest > maxSide) {
      const scale = maxSide / largest;
      img.resize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
    }

    const encoded = await img.encodeJPEG(jpegQuality);
    const b64 = bytesToBase64(encoded);
    return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    console.warn('[downscaleDataUrl] failed, using original:', (e as Error).message);
    return dataUrl;
  }
}

/**
 * Aplica `downscaleDataUrl` em série (não em paralelo) a um array de imagens
 * para evitar picos de memória ao decodificar várias fotos grandes de uma vez.
 */
export async function downscaleAll(
  images: string[],
  maxSide = 1024,
  jpegQuality = 80,
): Promise<string[]> {
  const out: string[] = [];
  for (const img of images) {
    if (!img) continue;
    out.push(await downscaleDataUrl(img, maxSide, jpegQuality));
  }
  return out;
}
