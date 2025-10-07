import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface MigrationResult {
  success: boolean;
  personasProcessed: number;
  personasCreated: number;
  personasUpdated: number;
  personasSkipped: number;
  errors: Array<{ persona: string; error: string }>;
  warnings: Array<{ persona: string; warning: string }>;
}

const MigratePersonas = () => {
  const [personasFile, setPersonasFile] = useState<File | null>(null);
  const [brandsFile, setBrandsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handlePersonasFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPersonasFile(e.target.files[0]);
    }
  };

  const handleBrandsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBrandsFile(e.target.files[0]);
    }
  };

  const handleMigration = async () => {
    if (!personasFile || !brandsFile) {
      toast({
        title: "Arquivos necessários",
        description: "Por favor, selecione ambos os arquivos CSV",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Read both CSV files
      const personasText = await personasFile.text();
      const brandsText = await brandsFile.text();

      // Call the migration edge function
      const { data, error } = await supabase.functions.invoke("migrate-personas", {
        body: { 
          csvData: personasText,
          brandsData: brandsText
        },
      });

      if (error) throw error;

      setResult(data as MigrationResult);
      
      if (data.success) {
        toast({
          title: "Migração concluída",
          description: `${data.personasCreated} personas criadas, ${data.personasUpdated} atualizadas`,
        });
      } else {
        toast({
          title: "Migração com erros",
          description: "Verifique os resultados abaixo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Migration error:", error);
      toast({
        title: "Erro na migração",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Migração de Personas</h1>
        <p className="text-muted-foreground mt-2">
          Importe personas do sistema antigo para o novo formato
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos CSV</CardTitle>
          <CardDescription>
            Selecione o arquivo de personas e o arquivo de brands para fazer o mapeamento correto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personas-file">Arquivo de Personas (CSV)</Label>
            <Input
              id="personas-file"
              type="file"
              accept=".csv"
              onChange={handlePersonasFileChange}
              disabled={loading}
            />
            {personasFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {personasFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brands-file">Arquivo de Brands (CSV)</Label>
            <Input
              id="brands-file"
              type="file"
              accept=".csv"
              onChange={handleBrandsFileChange}
              disabled={loading}
            />
            {brandsFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {brandsFile.name}
              </p>
            )}
          </div>

          <Button
            onClick={handleMigration}
            disabled={loading || !personasFile || !brandsFile}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              "Iniciar Migração"
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Migração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Processadas</p>
                <p className="text-2xl font-bold">{result.personasProcessed}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Criadas</p>
                <p className="text-2xl font-bold">{result.personasCreated}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Atualizadas</p>
                <p className="text-2xl font-bold">{result.personasUpdated}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Puladas</p>
                <p className="text-2xl font-bold">{result.personasSkipped}</p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Avisos ({result.warnings.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                      <p className="font-medium">{warning.persona}</p>
                      <p className="text-sm text-muted-foreground">{warning.warning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Erros ({result.errors.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded border-l-4 border-red-500">
                      <p className="font-medium">{error.persona}</p>
                      <p className="text-sm text-muted-foreground">{error.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigratePersonas;
