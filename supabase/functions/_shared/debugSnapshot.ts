/**
 * Debug snapshot uploader.
 * Salva imagens intermediárias de cada etapa do pipeline em um bucket privado
 * (debug-snapshots) para que possamos identificar exatamente em qual etapa
 * um problema visual (ex.: texto extra) é introduzido.
 *
 * Habilitado quando:
 *  - secret DEBUG_PIPELINE_SNAPSHOTS = "true", OU
 *  - formData.debugSnapshots === true (flag passada pelo client)
 *
 * Convenção de path:
 *  {userId}/{runId}/{step:02d}_{stage}.{ext}
 *
 * Retorna a URL pública assinada (signed URL 7d) ou null se desabilitado/erro.
 */

export interface SnapshotContext {
  enabled: boolean;
  runId: string;
  userId: string;
  supabase: any;
  step: { n: number };
  urls: Array<{ step: number; stage: string; url: string; bytes: number }>;
}

export function createSnapshotContext(opts: {
  supabase: any;
  userId: string;
  enabledByClient?: boolean;
}): SnapshotContext {
  const envFlag = (Deno.env.get('DEBUG_PIPELINE_SNAPSHOTS') || '').toLowerCase() === 'true';
  const enabled = envFlag || !!opts.enabledByClient;
  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    enabled,
    runId,
    userId: opts.userId,
    supabase: opts.supabase,
    step: { n: 0 },
    urls: [],
  };
}

/** Decide a extensão a partir dos primeiros bytes (PNG/JPEG/WEBP fallback PNG). */
function detectExt(bytes: Uint8Array): 'png' | 'jpg' | 'webp' {
  if (bytes.length > 12) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return 'webp';
  }
  return 'png';
}

/**
 * Faz upload de um snapshot e devolve uma URL assinada (7 dias) para visualização.
 * Em caso de qualquer erro, falha de forma silenciosa (debug nunca quebra o pipeline).
 */
export async function snapshot(
  ctx: SnapshotContext,
  stage: string,
  data: Uint8Array | string, // bytes ou base64 (sem prefixo data:)
  meta?: Record<string, any>
): Promise<string | null> {
  if (!ctx.enabled) return null;
  try {
    let bytes: Uint8Array;
    if (typeof data === 'string') {
      // base64 → bytes
      const clean = data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
      const bin = atob(clean);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = data;
    }

    ctx.step.n += 1;
    const ext = detectExt(bytes);
    const safeStage = stage.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `${ctx.userId}/${ctx.runId}/${String(ctx.step.n).padStart(2, '0')}_${safeStage}.${ext}`;

    const contentType = ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    const { error: upErr } = await ctx.supabase.storage
      .from('debug-snapshots')
      .upload(path, bytes, { contentType, upsert: true });
    if (upErr) {
      console.warn(`[Snapshot] upload failed (${stage}):`, upErr.message);
      return null;
    }

    const { data: signed, error: signErr } = await ctx.supabase.storage
      .from('debug-snapshots')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr || !signed?.signedUrl) {
      console.warn(`[Snapshot] sign failed (${stage}):`, signErr?.message);
      return null;
    }

    ctx.urls.push({ step: ctx.step.n, stage, url: signed.signedUrl, bytes: bytes.length });
    console.log(
      `[Snapshot] ▶ step ${String(ctx.step.n).padStart(2, '0')} "${stage}" — ${bytes.length}B ${meta ? JSON.stringify(meta) : ''}\n          ${signed.signedUrl}`
    );
    return signed.signedUrl;
  } catch (e) {
    console.warn(`[Snapshot] error at "${stage}":`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Resumo final, útil para anexar na resposta da edge function. */
export function snapshotSummary(ctx: SnapshotContext) {
  return {
    enabled: ctx.enabled,
    runId: ctx.runId,
    steps: ctx.urls,
  };
}
