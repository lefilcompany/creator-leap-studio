import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { renderTextLayers, type TextLayer } from '../_shared/textLayerOverlay.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  imageUrl: string;       // current displayed image URL (http(s) or data:)
  sourceImageUrl?: string;// original (text-free) base used to render overlays
  imageWidth: number;     // editor canvas width used for layer coordinates
  imageHeight: number;    // editor canvas height used for layer coordinates
  layers: TextLayer[];
  actionId?: string;      // when provided, save as new version on the action
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1];
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch source image: ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult, error: userError } = await userClient.auth.getUser();
    if (userError || !userResult.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userResult.user.id;

    const body = (await req.json()) as RequestBody;
    if (!body?.imageUrl || !Array.isArray(body.layers) || !body.imageWidth || !body.imageHeight) {
      return new Response(JSON.stringify({ error: 'imageUrl, imageWidth, imageHeight, layers required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[render-text-overlay] user=${userId} layers=${body.layers.length} canvas=${body.imageWidth}x${body.imageHeight} hasSource=${!!body.sourceImageUrl}`);

    // Prefer the original (text-free) source if provided, so re-edits don't
    // stack overlays on top of a previously rendered version.
    const baseUrl = body.sourceImageUrl || body.imageUrl;
    const sourceBytes = await fetchImageBytes(baseUrl);
    const { processedData, layersApplied, reports } = await renderTextLayers(sourceBytes, {
      imageWidth: body.imageWidth,
      imageHeight: body.imageHeight,
      layers: body.layers,
    });

    // Upload to storage as new version
    const admin = createClient(supabaseUrl, serviceKey);
    const ts = Date.now();
    const path = `${userId}/edited/${ts}.png`;
    const { error: uploadErr } = await admin.storage
      .from('content-images')
      .upload(path, processedData, { contentType: 'image/png', upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: pub } = admin.storage.from('content-images').getPublicUrl(path);
    const editedUrl = pub.publicUrl;

    // Track the text-free base so the editor can reload and rerender cleanly.
    const textOverlaySourceUrl = body.sourceImageUrl || body.imageUrl;

    // Build full debug report
    const renderReport = {
      timestamp: new Date().toISOString(),
      userId,
      actionId: body.actionId ?? null,
      canvas: { width: body.imageWidth, height: body.imageHeight },
      sourceImageUrl: textOverlaySourceUrl,
      editedImageUrl: editedUrl,
      layersApplied,
      layers: reports,
      hasParityWarnings: reports.some((r) => r.parity.warning),
    };
    console.log(`[render-text-overlay][REPORT] ${JSON.stringify(renderReport)}`);

    // Optionally update action result and append to versions
    if (body.actionId) {
      const { data: action } = await admin
        .from('actions')
        .select('result, details, revisions')
        .eq('id', body.actionId)
        .maybeSingle();

      const existingResult = (action?.result as any) || {};
      const existingDetails = (action?.details as any) || {};
      const versions = Array.isArray(existingDetails.versions) ? existingDetails.versions : [];
      const newRevision = (action?.revisions || 0) + 1;

      const newVersion = {
        version: newRevision,
        timestamp: new Date().toISOString(),
        type: 'text_overlay',
        mediaUrl: editedUrl,
        sourceImageUrl: textOverlaySourceUrl,
        layers: body.layers,
        renderReport,
      };

      // Keep only the last 10 render reports to avoid unbounded growth.
      const existingReports = Array.isArray(existingDetails.textOverlayRenderReports)
        ? existingDetails.textOverlayRenderReports
        : [];
      const trimmedReports = [...existingReports, renderReport].slice(-10);

      await admin
        .from('actions')
        .update({
          revisions: newRevision,
          result: {
            ...existingResult,
            imageUrl: editedUrl,
            textOverlayLayers: body.layers,
            textOverlaySourceUrl,
            lastTextOverlayRenderReport: renderReport,
          },
          details: {
            ...existingDetails,
            versions: [...versions, newVersion],
            textOverlayRenderReports: trimmedReports,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.actionId);
    }

    return new Response(
      JSON.stringify({
        editedImageUrl: editedUrl,
        layersApplied,
        sourceImageUrl: textOverlaySourceUrl,
        layers: body.layers,
        renderReport,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[render-text-overlay] error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
