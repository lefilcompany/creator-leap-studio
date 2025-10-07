import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVBrand {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  responsible: string;
  segment: string;
  values?: string;
  keywords?: string;
  goals?: string;
  inspirations?: string;
  successMetrics?: string;
  references?: string;
  specialDates?: string;
  promise?: string;
  crisisInfo?: string;
  milestones?: string;
  collaborations?: string;
  restrictions?: string;
  moodboard?: string;
  createdAt?: string;
  updatedAt?: string;
  colorPalette?: string;
  logo?: string;
  referenceImage?: string;
}

interface MigrationResult {
  success: boolean;
  brandsProcessed: number;
  brandsCreated: number;
  brandsUpdated: number;
  brandsSkipped: number;
  errors: Array<{ brand: string; error: string }>;
  warnings: Array<{ brand: string; warning: string }>;
}

// Parse CSV with support for multi-line fields (quoted strings)
function parseCSV(csvText: string): any[] {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  // Split handling quoted fields with newlines
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if (char === '\n' && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });
      records.push(record);
    }
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csvData } = await req.json();

    if (!csvData) {
      throw new Error('CSV data is required');
    }

    console.log('Starting brand migration...');

    const result: MigrationResult = {
      success: true,
      brandsProcessed: 0,
      brandsCreated: 0,
      brandsUpdated: 0,
      brandsSkipped: 0,
      errors: [],
      warnings: []
    };

    // Parse CSV
    const brands: CSVBrand[] = parseCSV(csvData);
    console.log(`Parsed ${brands.length} brands from CSV`);

    // Process each brand
    for (const brand of brands) {
      result.brandsProcessed++;
      
      try {
        // Validate required fields
        if (!brand.name || !brand.responsible || !brand.segment) {
          result.errors.push({
            brand: brand.name || 'Unknown',
            error: 'Missing required fields: name, responsible, or segment'
          });
          result.brandsSkipped++;
          continue;
        }

        // Find user by email (responsible field)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, team_id')
          .eq('email', brand.responsible.trim())
          .maybeSingle();

        if (profileError || !profileData) {
          result.errors.push({
            brand: brand.name,
            error: `User not found for email: ${brand.responsible}`
          });
          result.brandsSkipped++;
          continue;
        }

        if (!profileData.team_id) {
          result.errors.push({
            brand: brand.name,
            error: `User ${brand.responsible} does not belong to any team`
          });
          result.brandsSkipped++;
          continue;
        }

        // Parse colorPalette JSON if exists
        let colorPalette = null;
        if (brand.colorPalette) {
          try {
            colorPalette = JSON.parse(brand.colorPalette);
          } catch (e) {
            result.warnings.push({
              brand: brand.name,
              warning: 'Invalid colorPalette JSON - set to null'
            });
          }
        }

        // Check if brand already exists (by name and team_id)
        const { data: existingBrand } = await supabase
          .from('brands')
          .select('id')
          .eq('name', brand.name)
          .eq('team_id', profileData.team_id)
          .maybeSingle();

        const brandData = {
          name: brand.name,
          responsible: brand.responsible,
          segment: brand.segment,
          values: brand.values || '',
          keywords: brand.keywords || '',
          goals: brand.goals || '',
          inspirations: brand.inspirations || '',
          success_metrics: brand.successMetrics || '',
          brand_references: brand.references || '',
          special_dates: brand.specialDates || '',
          promise: brand.promise || '',
          crisis_info: brand.crisisInfo || '',
          milestones: brand.milestones || '',
          collaborations: brand.collaborations || '',
          restrictions: brand.restrictions || '',
          color_palette: colorPalette,
          user_id: profileData.id,
          team_id: profileData.team_id
        };

        if (existingBrand) {
          // Update existing brand
          const { error: updateError } = await supabase
            .from('brands')
            .update(brandData)
            .eq('id', existingBrand.id);

          if (updateError) {
            result.errors.push({
              brand: brand.name,
              error: `Failed to update: ${updateError.message}`
            });
            result.brandsSkipped++;
          } else {
            result.brandsUpdated++;
            console.log(`Updated brand: ${brand.name}`);
          }
        } else {
          // Insert new brand
          const { error: insertError } = await supabase
            .from('brands')
            .insert(brandData);

          if (insertError) {
            result.errors.push({
              brand: brand.name,
              error: `Failed to insert: ${insertError.message}`
            });
            result.brandsSkipped++;
          } else {
            result.brandsCreated++;
            console.log(`Created brand: ${brand.name}`);
          }
        }

      } catch (error: any) {
        result.errors.push({
          brand: brand.name || 'Unknown',
          error: error?.message || 'Unknown error'
        });
        result.brandsSkipped++;
      }
    }

    console.log('Migration completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        brandsProcessed: 0,
        brandsCreated: 0,
        brandsUpdated: 0,
        brandsSkipped: 0,
        errors: [{ brand: 'System', error: error?.message || 'Unknown error' }],
        warnings: []
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
