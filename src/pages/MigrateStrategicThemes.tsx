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
  themesProcessed: number;
  themesCreated: number;
  themesUpdated: number;
  themesSkipped: number;
  errors: Array<{ theme: string; error: string }>;
  warnings: Array<{ theme: string; warning: string }>;
}

const MigrateStrategicThemes = () => {
  const [themesFile, setThemesFile] = useState<File | null>(null);
  const [brandsFile, setBrandsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const handleThemesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThemesFile(e.target.files[0]);
    }
  };

  const handleBrandsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBrandsFile(e.target.files[0]);
    }
  };

  const handleMigration = async () => {
    if (!themesFile || !brandsFile) {
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
      const themesText = await themesFile.text();
      const brandsText = await brandsFile.text();

      // Call the migration edge function
      const { data, error } = await supabase.functions.invoke("migrate-strategic-themes", {
        body: { 
          csvData: themesText,
          brandsData: brandsText
        },
      });

      if (error) throw error;

      setResult(data as MigrationResult);
      
      if (data.success) {
        toast({
          title: "Migração concluída",
          description: `${data.themesCreated} temas criados, ${data.themesUpdated} atualizados`,
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
        <h1 className="text-3xl font-bold">Migração de Temas Estratégicos</h1>
        <p className="text-muted-foreground mt-2">
          Importe temas estratégicos do sistema antigo para o novo formato
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivos CSV</CardTitle>
          <CardDescription>
            Selecione o arquivo de temas e o arquivo de brands para fazer o mapeamento correto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="themes-file">Arquivo de Temas Estratégicos (CSV)</Label>
            <Input
              id="themes-file"
              type="file"
              accept=".csv"
              onChange={handleThemesFileChange}
              disabled={loading}
            />
            {themesFile && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {themesFile.name}
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
            disabled={loading || !themesFile || !brandsFile}
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
                <p className="text-sm text-muted-foreground">Processados</p>
                <p className="text-2xl font-bold">{result.themesProcessed}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Criados</p>
                <p className="text-2xl font-bold">{result.themesCreated}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Atualizados</p>
                <p className="text-2xl font-bold">{result.themesUpdated}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Pulados</p>
                <p className="text-2xl font-bold">{result.themesSkipped}</p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Avisos ({result.warnings.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                      <p className="font-medium">{warning.theme}</p>
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
                      <p className="font-medium">{error.theme}</p>
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

export default MigrateStrategicThemes;
