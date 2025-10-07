import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSVPersona {
  id: string;
  teamId: string;
  userId: string;
  brandId: string;
  name: string;
  gender: string;
  age: string;
  location: string;
  role: string; // maps to professionalContext
  hobbies: string; // maps to beliefsAndInterests
  consumptionHabits: string; // maps to contentConsumptionRoutine
  goals: string; // maps to mainGoal
  challenges: string;
  interestTriggers?: string;
  preferredToneOfVoice?: string;
  purchaseJourneyStage?: string;
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
  personasProcessed: number;
  personasCreated: number;
  personasUpdated: number;
  personasSkipped: number;
  errors: Array<{ persona: string; error: string }>;
  warnings: Array<{ persona: string; warning: string }>;
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

    console.log('Starting persona migration...');

    const personas: CSVPersona[] = parseCSV(csvData);
    const brands: CSVBrand[] = parseCSV(brandsData);

    console.log(`Parsed ${personas.length} personas from CSV`);
    console.log(`Parsed ${brands.length} brands for mapping`);

    const result: MigrationResult = {
      success: true,
      personasProcessed: 0,
      personasCreated: 0,
      personasUpdated: 0,
      personasSkipped: 0,
      errors: [],
      warnings: [],
    };

    // Create mapping oldBrandId -> brand info (name, responsible)
    const brandMap = new Map<string, CSVBrand>();
    brands.forEach(brand => {
      brandMap.set(brand.id, brand);
    });

    // Process each persona
    for (const csvPersona of personas) {
      try {
        result.personasProcessed++;

        // Validate required fields
        if (!csvPersona.name || !csvPersona.gender || !csvPersona.age) {
          result.personasSkipped++;
          result.errors.push({
            persona: csvPersona.name || 'Unknown',
            error: 'Missing required fields: name, gender, or age',
          });
          continue;
        }

        // Get brand info from mapping
        const brandInfo = brandMap.get(csvPersona.brandId);
        if (!brandInfo) {
          result.personasSkipped++;
          result.errors.push({
            persona: csvPersona.name,
            error: `Brand ID ${csvPersona.brandId} not found in brands mapping`,
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
          result.personasSkipped++;
          result.errors.push({
            persona: csvPersona.name,
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
          result.personasSkipped++;
          result.errors.push({
            persona: csvPersona.name,
            error: `Brand "${brandInfo.name}" not found in database for team`,
          });
          continue;
        }

        // Check if persona already exists
        const { data: existingPersona } = await supabase
          .from('personas')
          .select('id')
          .eq('name', csvPersona.name)
          .eq('brand_id', brandData.id)
          .maybeSingle();

        const personaData = {
          team_id: profileData.team_id,
          user_id: profileData.id,
          brand_id: brandData.id,
          name: csvPersona.name,
          gender: csvPersona.gender,
          age: csvPersona.age,
          location: csvPersona.location || '',
          professional_context: csvPersona.role || '',
          beliefs_and_interests: csvPersona.hobbies || '',
          content_consumption_routine: csvPersona.consumptionHabits || '',
          main_goal: csvPersona.goals || '',
          challenges: csvPersona.challenges || '',
          interest_triggers: csvPersona.interestTriggers || '',
          preferred_tone_of_voice: csvPersona.preferredToneOfVoice || '',
          purchase_journey_stage: csvPersona.purchaseJourneyStage || '',
        };

        if (existingPersona) {
          // Update existing persona
          const { error: updateError } = await supabase
            .from('personas')
            .update(personaData)
            .eq('id', existingPersona.id);

          if (updateError) {
            result.errors.push({
              persona: csvPersona.name,
              error: `Update failed: ${updateError.message}`,
            });
          } else {
            result.personasUpdated++;
            console.log(`Updated persona: ${csvPersona.name}`);
          }
        } else {
          // Insert new persona
          const { error: insertError } = await supabase
            .from('personas')
            .insert(personaData);

          if (insertError) {
            result.errors.push({
              persona: csvPersona.name,
              error: `Insert failed: ${insertError.message}`,
            });
          } else {
            result.personasCreated++;
            console.log(`Created persona: ${csvPersona.name}`);
          }
        }
      } catch (error) {
        result.errors.push({
          persona: csvPersona.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.errors.length === 0 || result.personasCreated > 0 || result.personasUpdated > 0;

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
