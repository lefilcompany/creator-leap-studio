import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { batchSize = 10, dryRun = false } = await req.json().catch(() => ({}));

    console.log(`🔄 Starting migration (batchSize: ${batchSize}, dryRun: ${dryRun})`);

    // Find actions with base64 images in result->imageUrl
    const { data: actions, error: fetchError } = await supabase
      .from('actions')
      .select('id, team_id, created_at, result')
      .is('thumb_path', null)
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(batchSize);

    if (fetchError) {
      throw new Error(`Failed to fetch actions: ${fetchError.message}`);
    }

    // Filter to only actions with base64 imageUrl
    const actionsWithBase64 = (actions || []).filter(a => {
      const result = a.result as Record<string, any> | null;
      const imageUrl = result?.imageUrl || result?.originalImage;
      return imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('data:');
    });

    console.log(`📊 Found ${actionsWithBase64.length} actions with base64 images out of ${actions?.length || 0} without thumb_path`);

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          message: 'Dry run complete',
          totalWithoutThumb: actions?.length || 0,
          withBase64: actionsWithBase64.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const action of actionsWithBase64) {
      try {
        const result = action.result as Record<string, any>;
        const imageUrl = result.imageUrl || result.originalImage;
        const imageField = result.imageUrl ? 'imageUrl' : 'originalImage';
        
        if (!imageUrl || !imageUrl.startsWith('data:')) {
          skipped++;
          continue;
        }

        // Parse base64
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          console.error(`Invalid base64 for action ${action.id}`);
          skipped++;
          continue;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Build storage path
        const createdAt = new Date(action.created_at!);
        const yyyy = createdAt.getFullYear();
        const mm = String(createdAt.getMonth() + 1).padStart(2, '0');
        const teamId = action.team_id || 'no-team';
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';

        const assetPath = `${teamId}/${yyyy}/${mm}/${action.id}/asset.${ext}`;

        // Upload asset
        const { error: uploadError } = await supabase.storage
          .from('creations')
          .upload(assetPath, binaryData, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${action.id}:`, uploadError.message);
          errors++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('creations')
          .getPublicUrl(assetPath);

        // Update action: set asset_path, thumb_path (same as asset for now), and replace base64 with URL
        const updatedResult = { ...result, [imageField]: publicUrl };

        const { error: updateError } = await supabase
          .from('actions')
          .update({
            asset_path: assetPath,
            thumb_path: assetPath, // Use same path as thumb for now
            result: updatedResult,
          })
          .eq('id', action.id);

        if (updateError) {
          console.error(`Update error for ${action.id}:`, updateError.message);
          errors++;
          continue;
        }

        migrated++;
        console.log(`✅ Migrated action ${action.id} (${(binaryData.length / 1024 / 1024).toFixed(2)}MB)`);
      } catch (err) {
        console.error(`Error processing action ${action.id}:`, err);
        errors++;
      }
    }

    // Also update actions that already have https URLs but no thumb_path
    const { data: urlActions, error: urlFetchError } = await supabase
      .from('actions')
      .select('id, result')
      .is('thumb_path', null)
      .not('result', 'is', null)
      .limit(batchSize);

    let urlUpdated = 0;
    if (!urlFetchError && urlActions) {
      for (const action of urlActions) {
        const result = action.result as Record<string, any> | null;
        const imageUrl = result?.imageUrl || result?.originalImage;
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('https')) {
          // Mark as having no base64 by setting thumb_path to empty string
          await supabase
            .from('actions')
            .update({ thumb_path: '' })
            .eq('id', action.id);
          urlUpdated++;
        }
      }
    }

    const summary = {
      migrated,
      skipped,
      errors,
      urlUpdated,
      remainingWithBase64: actionsWithBase64.length - migrated - skipped - errors,
    };

    console.log('📊 Migration summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
