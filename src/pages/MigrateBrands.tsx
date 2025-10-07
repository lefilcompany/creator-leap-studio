import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface MigrationResult {
  success: boolean;
  brandsProcessed: number;
  brandsCreated: number;
  brandsUpdated: number;
  brandsSkipped: number;
  errors: Array<{ brand: string; error: string }>;
  warnings: Array<{ brand: string; warning: string }>;
}

const MigrateBrands = () => {
  const [brandsFile, setBrandsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const handleBrandsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBrandsFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleMigration = async () => {
    if (!brandsFile) {
      toast.error("Por favor, selecione o arquivo CSV de marcas");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Read CSV file
      const brandsText = await brandsFile.text();

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke('migrate-brands', {
        body: { csvData: brandsText }
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast.success(`Migração concluída! ${data.brandsCreated} marcas criadas, ${data.brandsUpdated} atualizadas.`);
      } else {
        toast.error("Migração concluída com erros. Veja os detalhes abaixo.");
      }

    } catch (error) {
      console.error('Migration error:', error);
      toast.error("Erro ao processar migração: " + error.message);
      setResult({
        success: false,
        brandsProcessed: 0,
        brandsCreated: 0,
        brandsUpdated: 0,
        brandsSkipped: 0,
        errors: [{ brand: 'System', error: error.message }],
        warnings: []
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Migração de Marcas</h1>
        <p className="text-muted-foreground">
          Importe marcas de um arquivo CSV. O sistema irá mapear automaticamente os usuários pelos emails.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload do Arquivo CSV</CardTitle>
          <CardDescription>
            Selecione o arquivo CSV contendo os dados das marcas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="brands-csv">Arquivo de Marcas (CSV)</Label>
            <Input
              id="brands-csv"
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
            disabled={!brandsFile || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando migração...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Iniciar Migração
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Resultado da Migração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Processadas</p>
                <p className="text-2xl font-bold">{result.brandsProcessed}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Criadas</p>
                <p className="text-2xl font-bold text-green-600">{result.brandsCreated}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Atualizadas</p>
                <p className="text-2xl font-bold text-blue-600">{result.brandsUpdated}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Ignoradas</p>
                <p className="text-2xl font-bold text-orange-600">{result.brandsSkipped}</p>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  Avisos ({result.warnings.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded border-l-4 border-yellow-500">
                      <p className="font-medium text-sm">{warning.brand}</p>
                      <p className="text-sm text-muted-foreground">{warning.warning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Erros ({result.errors.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="bg-red-50 dark:bg-red-950 p-3 rounded border-l-4 border-red-500">
                      <p className="font-medium text-sm">{error.brand}</p>
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

export default MigrateBrands;
