import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MigrationResult {
  success: boolean;
  usersProcessed: number;
  usersCreated: number;
  teamsCreated: number;
  errors: Array<{ email: string; error: string }>;
  warnings: Array<{ email: string; warning: string }>;
}

const MigrateUsers = () => {
  const [usersFile, setUsersFile] = useState<File | null>(null);
  const [teamsFile, setTeamsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = values[index]?.trim() || '';
        });
        return obj;
      });
  };

  const handleUsersFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUsersFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleTeamsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTeamsFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleMigration = async () => {
    if (!usersFile || !teamsFile) {
      toast.error("Por favor, selecione ambos os arquivos CSV (usuários e times)");
      return;
    }

    setLoading(true);
    try {
      // Ler ambos os arquivos CSV
      const usersText = await usersFile.text();
      const teamsText = await teamsFile.text();
      
      const csvData = parseCSV(usersText);
      const teamsData = parseCSV(teamsText);

      console.log(`Parsed ${csvData.length} users and ${teamsData.length} teams from CSVs`);

      // Chamar a Edge Function com ambos os dados
      const { data, error } = await supabase.functions.invoke('migrate-users', {
        body: { csvData, teamsData }
      });

      if (error) {
        throw error;
      }

      setResult(data);

      if (data.success) {
        toast.success(
          `Migração concluída! ${data.usersCreated} de ${data.usersProcessed} usuários migrados.`
        );
      } else {
        toast.error("Migração completada com erros. Verifique os detalhes abaixo.");
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error("Erro ao executar migração: " + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Migração de Usuários</h1>
        <p className="text-muted-foreground">
          Importe usuários do sistema antigo via arquivo CSV
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload dos Arquivos CSV</CardTitle>
          <CardDescription>
            Selecione os arquivos CSV de usuários e times para migração.
            Os usuários receberão automaticamente um email para redefinir suas senhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="users-csv">Arquivo CSV de Usuários (User_rows.csv)</Label>
            <Input
              id="users-csv"
              type="file"
              accept=".csv"
              onChange={handleUsersFileChange}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teams-csv">Arquivo CSV de Times (Team_rows.csv)</Label>
            <Input
              id="teams-csv"
              type="file"
              accept=".csv"
              onChange={handleTeamsFileChange}
              disabled={loading}
            />
          </div>

          {usersFile && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertTitle>Usuários: {usersFile.name}</AlertTitle>
              <AlertDescription>
                {(usersFile.size / 1024).toFixed(2)} KB
              </AlertDescription>
            </Alert>
          )}

          {teamsFile && (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertTitle>Times: {teamsFile.name}</AlertTitle>
              <AlertDescription>
                {(teamsFile.size / 1024).toFixed(2)} KB
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleMigration}
            disabled={!usersFile || !teamsFile || loading}
            className="w-full"
          >
            {loading ? "Processando migração..." : "Iniciar Migração"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Migração Concluída
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Migração com Erros
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.usersProcessed}</div>
                <div className="text-sm text-muted-foreground">Processados</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.usersCreated}</div>
                <div className="text-sm text-muted-foreground">Criados</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{result.teamsCreated}</div>
                <div className="text-sm text-muted-foreground">Times</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-sm text-muted-foreground">Erros</div>
              </div>
            </div>

            {/* Avisos */}
            {result.warnings.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Avisos ({result.warnings.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.warnings.map((warning, index) => (
                    <Alert key={index} variant="default">
                      <AlertDescription>
                        <span className="font-medium">{warning.email}</span>: {warning.warning}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {/* Erros */}
            {result.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Erros ({result.errors.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertDescription>
                        <span className="font-medium">{error.email}</span>: {error.error}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {result.success && result.errors.length === 0 && result.warnings.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Migração perfeita!</AlertTitle>
                <AlertDescription>
                  Todos os usuários foram migrados com sucesso. Eles receberão emails para redefinir suas senhas.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MigrateUsers;
