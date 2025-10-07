import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVTheme {
  id: string;
  teamId: string;
  userId: string;
  brandId: string;
  title: string;
  description: string;
  colorPalette: string;
  toneOfVoice: string;
  targetAudience: string;
  hashtags: string;
  objectives: string;
  contentFormat: string;
  macroThemes: string;
  bestFormats: string;
  platforms: string;
  expectedAction: string;
  additionalInfo?: string;
  createdAt: string;
  updatedAt: string;
}

interface CSVBrand {
  id: string;
  name: string;
  responsible: string;
}

interface MigrationResult {
  success: boolean;
  themesProcessed: number;
  themesCreated: number;
  themesUpdated: number;
  themesSkipped: number;
  errors: Array<{ theme: string; error: string }>;
  warnings: Array<{ theme: string; warning: string }>;
}

// Parse CSV handling multi-line fields
function parseCSV(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const results: any[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    currentLine += (currentLine ? '\n' : '') + line;

    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (currentLine.match(/"/g) || []).length;
    inQuotes = quoteCount % 2 !== 0;

    if (!inQuotes) {
      const values = parseCSVLine(currentLine);
      if (values.length === headers.length) {
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        results.push(obj);
      }
      currentLine = '';
    }
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData, brandsData } = await req.json();

    console.log('Starting strategic themes migration...');

    const themes: CSVTheme[] = parseCSV(csvData);
    const brands: CSVBrand[] = parseCSV(brandsData);

    console.log(`Parsed ${themes.length} themes from CSV`);
    console.log(`Parsed ${brands.length} brands for mapping`);

    const result: MigrationResult = {
      success: true,
      themesProcessed: 0,
      themesCreated: 0,
      themesUpdated: 0,
      themesSkipped: 0,
      errors: [],
      warnings: [],
    };

    // Create mapping oldBrandId -> brand info (name, responsible)
    const brandMap = new Map<string, CSVBrand>();
    brands.forEach(brand => {
      brandMap.set(brand.id, brand);
    });

    // Process each theme
    for (const csvTheme of themes) {
      try {
        result.themesProcessed++;

        // Validate required fields
        if (!csvTheme.title || !csvTheme.description || !csvTheme.toneOfVoice) {
          result.themesSkipped++;
          result.errors.push({
            theme: csvTheme.title || 'Unknown',
            error: 'Missing required fields: title, description, or toneOfVoice',
          });
          continue;
        }

        // Get brand info from mapping
        const brandInfo = brandMap.get(csvTheme.brandId);
        if (!brandInfo) {
          result.themesSkipped++;
          result.errors.push({
            theme: csvTheme.title,
            error: `Brand ID ${csvTheme.brandId} not found in brands mapping`,
          });
          continue;
        }

        // Find user by brand responsible email
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, team_id')
          .eq('email', brandInfo.responsible)
          .single();

        if (profileError || !profileData) {
          result.themesSkipped++;
          result.errors.push({
            theme: csvTheme.title,
            error: `User not found for email: ${brandInfo.responsible}`,
          });
          continue;
        }

        // Find brand in database by name and team_id
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id')
          .eq('name', brandInfo.name)
          .eq('team_id', profileData.team_id)
          .single();

        if (brandError || !brandData) {
          result.themesSkipped++;
          result.errors.push({
            theme: csvTheme.title,
            error: `Brand "${brandInfo.name}" not found in database for team`,
          });
          continue;
        }

        // Check if theme already exists
        const { data: existingTheme } = await supabase
          .from('strategic_themes')
          .select('id')
          .eq('title', csvTheme.title)
          .eq('brand_id', brandData.id)
          .maybeSingle();

        const themeData = {
          team_id: profileData.team_id,
          user_id: profileData.id,
          brand_id: brandData.id,
          title: csvTheme.title,
          description: csvTheme.description,
          color_palette: csvTheme.colorPalette || '',
          tone_of_voice: csvTheme.toneOfVoice,
          target_audience: csvTheme.targetAudience || '',
          hashtags: csvTheme.hashtags || '',
          objectives: csvTheme.objectives || '',
          content_format: csvTheme.contentFormat || '',
          macro_themes: csvTheme.macroThemes || '',
          best_formats: csvTheme.bestFormats || '',
          platforms: csvTheme.platforms || '',
          expected_action: csvTheme.expectedAction || '',
          additional_info: csvTheme.additionalInfo || '',
        };

        if (existingTheme) {
          // Update existing theme
          const { error: updateError } = await supabase
            .from('strategic_themes')
            .update(themeData)
            .eq('id', existingTheme.id);

          if (updateError) {
            result.errors.push({
              theme: csvTheme.title,
              error: `Update failed: ${updateError.message}`,
            });
          } else {
            result.themesUpdated++;
            console.log(`Updated theme: ${csvTheme.title}`);
          }
        } else {
          // Insert new theme
          const { error: insertError } = await supabase
            .from('strategic_themes')
            .insert(themeData);

          if (insertError) {
            result.errors.push({
              theme: csvTheme.title,
              error: `Insert failed: ${insertError.message}`,
            });
          } else {
            result.themesCreated++;
            console.log(`Created theme: ${csvTheme.title}`);
          }
        }
      } catch (error) {
        result.errors.push({
          theme: csvTheme.title || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.errors.length === 0 || result.themesCreated > 0 || result.themesUpdated > 0;

    console.log('Migration completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
